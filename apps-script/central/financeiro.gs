// Financeiro — Resultado, lucro e DRE simples
// Adicione este arquivo como financeiro.gs no Apps Script do App Central.

function getResultadoFinanceiro(token, dataInicioIso, dataFimIso) {
  const ctx = getContexto_(token);
  const inicio = dataInicioIso ? zerarHora_(new Date(dataInicioIso)) : primeiroDiaMes_(new Date());
  const fim = dataFimIso ? fimDoDia_(new Date(dataFimIso)) : fimDoDia_(new Date());

  if (ctx.cliente.tipo === 'LOJA') {
    return getResultadoLoja_(ctx, inicio, fim);
  }

  return getResultadoServico_(ctx, inicio, fim);
}

function getResultadoLoja_(ctx, inicio, fim) {
  const vendas = getRows_(ctx.ss, 'Vendas');
  const produtos = getRows_(ctx.ss, 'Produtos');
  const despesas = getRows_(ctx.ss, 'Despesas');

  const produtosMap = {};
  produtos.forEach(p => {
    produtosMap[String(p[0])] = {
      nome: montarNomeProduto_(p),
      custo: Number(p[7] || 0)
    };
  });

  let receitaBruta = 0;
  let cmv = 0;
  let taxas = 0;
  let lucroBruto = 0;
  let qtdVendas = 0;
  let itensVendidos = 0;
  const porPagamento = { Pix: 0, Dinheiro: 0, Debito: 0, Credito: 0, Outros: 0 };
  const produtosResumo = {};

  vendas.forEach(v => {
    const data = new Date(v[1]);
    if (!entreDatas_(data, inicio, fim)) return;

    const produtoId = String(v[4]);
    const qtd = Number(v[5] || 0);
    const valor = Number(v[6] || 0);
    const taxa = Number(v[10] || 0);
    const produto = produtosMap[produtoId] || { nome: 'Produto removido', custo: 0 };
    const custoTotal = produto.custo * qtd;
    const lucro = valor - custoTotal - taxa;

    receitaBruta += valor;
    cmv += custoTotal;
    taxas += taxa;
    lucroBruto += lucro;
    qtdVendas++;
    itensVendidos += qtd;
    somarForma_(porPagamento, v[7], valor);

    if (!produtosResumo[produtoId]) {
      produtosResumo[produtoId] = {
        nome: produto.nome,
        quantidade: 0,
        receita: 0,
        lucro: 0
      };
    }

    produtosResumo[produtoId].quantidade += qtd;
    produtosResumo[produtoId].receita += valor;
    produtosResumo[produtoId].lucro += lucro;
  });

  const despesasTotal = somarDespesasPeriodo_(despesas, inicio, fim);
  const lucroLiquido = lucroBruto - despesasTotal;
  const margemBruta = receitaBruta ? (lucroBruto / receitaBruta) * 100 : 0;
  const margemLiquida = receitaBruta ? (lucroLiquido / receitaBruta) * 100 : 0;
  const ticketMedio = qtdVendas ? receitaBruta / qtdVendas : 0;

  return {
    tipo: 'LOJA',
    periodo: {
      inicio: formatarData_(inicio),
      fim: formatarData_(fim),
      inicioIso: formatarDataIso_(inicio),
      fimIso: formatarDataIso_(fim)
    },
    resumo: {
      receitaBruta,
      cmv,
      taxas,
      lucroBruto,
      despesas: despesasTotal,
      lucroLiquido,
      margemBruta,
      margemLiquida,
      ticketMedio,
      qtdVendas,
      itensVendidos
    },
    pagamentos: porPagamento,
    ranking: Object.values(produtosResumo)
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 10),
    dre: [
      { label: 'Receita bruta', valor: receitaBruta, tipo: 'entrada' },
      { label: '(-) Custo dos produtos vendidos', valor: -cmv, tipo: 'saida' },
      { label: '(-) Taxas de pagamento', valor: -taxas, tipo: 'saida' },
      { label: '= Lucro bruto', valor: lucroBruto, tipo: 'resultado' },
      { label: '(-) Despesas operacionais', valor: -despesasTotal, tipo: 'saida' },
      { label: '= Lucro líquido estimado', valor: lucroLiquido, tipo: 'resultado_final' }
    ]
  };
}

function getResultadoServico_(ctx, inicio, fim) {
  const agenda = getRows_(ctx.ss, 'Agenda');
  const servicos = getRows_(ctx.ss, 'Servicos');
  const despesas = getRows_(ctx.ss, 'Despesas');

  const servicosMap = {};
  servicos.forEach(s => {
    servicosMap[String(s[0])] = {
      nome: s[1],
      custo: Number(s[5] || 0)
    };
  });

  let receitaRecebida = 0;
  let receitaPendente = 0;
  let custoServicos = 0;
  let lucroBruto = 0;
  let atendimentos = 0;
  let pagos = 0;
  let pendentes = 0;
  const porPagamento = { Pix: 0, Dinheiro: 0, Debito: 0, Credito: 0, Outros: 0 };
  const servicosResumo = {};

  agenda.forEach(a => {
    const data = new Date(a[1]);
    if (!entreDatas_(data, inicio, fim)) return;

    const servicoId = String(a[5]);
    const servico = servicosMap[servicoId] || { nome: 'Serviço removido', custo: 0 };
    const valor = Number(a[6] || 0);
    const custo = Number(servico.custo || 0);
    const statusPagamento = String(a[8] || '').toUpperCase();

    atendimentos++;

    if (!servicosResumo[servicoId]) {
      servicosResumo[servicoId] = {
        nome: servico.nome,
        quantidade: 0,
        receita: 0,
        lucro: 0
      };
    }

    servicosResumo[servicoId].quantidade++;
    servicosResumo[servicoId].receita += valor;
    servicosResumo[servicoId].lucro += valor - custo;

    if (statusPagamento === 'PAGO') {
      receitaRecebida += valor;
      custoServicos += custo;
      lucroBruto += valor - custo;
      pagos++;
      somarForma_(porPagamento, a[9], valor);
    } else {
      receitaPendente += valor;
      pendentes++;
    }
  });

  const despesasTotal = somarDespesasPeriodo_(despesas, inicio, fim);
  const lucroLiquido = lucroBruto - despesasTotal;
  const margemBruta = receitaRecebida ? (lucroBruto / receitaRecebida) * 100 : 0;
  const margemLiquida = receitaRecebida ? (lucroLiquido / receitaRecebida) * 100 : 0;
  const ticketMedio = pagos ? receitaRecebida / pagos : 0;

  return {
    tipo: 'SERVICO',
    periodo: {
      inicio: formatarData_(inicio),
      fim: formatarData_(fim),
      inicioIso: formatarDataIso_(inicio),
      fimIso: formatarDataIso_(fim)
    },
    resumo: {
      receitaBruta: receitaRecebida,
      receitaPendente,
      cmv: custoServicos,
      taxas: 0,
      lucroBruto,
      despesas: despesasTotal,
      lucroLiquido,
      margemBruta,
      margemLiquida,
      ticketMedio,
      qtdVendas: atendimentos,
      pagos,
      pendentes
    },
    pagamentos: porPagamento,
    ranking: Object.values(servicosResumo)
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 10),
    dre: [
      { label: 'Receita recebida', valor: receitaRecebida, tipo: 'entrada' },
      { label: 'Receita pendente', valor: receitaPendente, tipo: 'info' },
      { label: '(-) Custo dos serviços', valor: -custoServicos, tipo: 'saida' },
      { label: '= Lucro bruto', valor: lucroBruto, tipo: 'resultado' },
      { label: '(-) Despesas operacionais', valor: -despesasTotal, tipo: 'saida' },
      { label: '= Lucro líquido estimado', valor: lucroLiquido, tipo: 'resultado_final' }
    ]
  };
}

function somarDespesasPeriodo_(despesas, inicio, fim) {
  return despesas.reduce((acc, d) => {
    const data = new Date(d[1]);
    if (!entreDatas_(data, inicio, fim)) return acc;
    return acc + Number(d[4] || 0);
  }, 0);
}

function entreDatas_(data, inicio, fim) {
  const d = new Date(data);
  return d >= inicio && d <= fim;
}

function primeiroDiaMes_(data) {
  const d = new Date(data);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimDoDia_(data) {
  const d = new Date(data);
  d.setHours(23, 59, 59, 999);
  return d;
}
