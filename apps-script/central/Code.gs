// App Central — Loja & Agenda Simples
// Login, assinatura, loja, serviço, agendamento público, caixa e comprovantes.

const MASTER_SHEET_ID = 'COLE_AQUI_ID_CLIENTES_MASTER';
const SESSION_SECONDS = 21600; // 6 horas

function doGet(e) {
  const clientePainel = e && e.parameter && e.parameter.cliente
    ? String(e.parameter.cliente).trim()
    : '';

  const clienteAgendamento = e && e.parameter && e.parameter.agendar
    ? String(e.parameter.agendar).trim()
    : '';

  if (clienteAgendamento) {
    const template = HtmlService.createTemplateFromFile('public_agendamento');
    template.clienteId = clienteAgendamento;
    return template.evaluate().setTitle('Agendamento Online').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (!clientePainel) {
    return HtmlService.createHtmlOutput('<h2>Cliente não informado.</h2><p>Use o link completo do sistema.</p>');
  }

  const template = HtmlService.createTemplateFromFile('index');
  template.clienteId = clientePainel;
  return template.evaluate().setTitle('Loja & Agenda Simples').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(file) {
  return HtmlService.createHtmlOutputFromFile(file).getContent();
}

function getMaster_() {
  return SpreadsheetApp.openById(MASTER_SHEET_ID);
}

function hashSenha(senha) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(senha || ''), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function loginCliente(clienteId, usuario, senha) {
  const cliente = getClienteById_(clienteId);
  validarAcessoCliente_(cliente);

  if (String(cliente.usuario).trim() !== String(usuario).trim()) throw new Error('Usuário ou senha inválidos.');
  if (String(cliente.senhaHash) !== hashSenha(senha)) throw new Error('Usuário ou senha inválidos.');

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('AUTH_' + token, JSON.stringify({ clienteId: cliente.id }), SESSION_SECONDS);

  return {
    sucesso: true,
    token,
    trocarSenha: String(cliente.trocarSenha).toUpperCase() === 'SIM',
    cliente: dadosBasicosCliente_(cliente)
  };
}

function trocarSenhaPrimeiroAcesso(token, novaSenha) {
  const sessao = validarToken_(token);
  if (!novaSenha || String(novaSenha).length < 4) throw new Error('A nova senha precisa ter pelo menos 4 caracteres.');

  const pos = encontrarLinhaCliente_(sessao.clienteId);
  const sheet = getMaster_().getSheetByName('Clientes');
  sheet.getRange(pos.rowIndex, 8).setValue(hashSenha(novaSenha));
  sheet.getRange(pos.rowIndex, 9).setValue('NAO');

  return { sucesso: true };
}

function logoutCliente(token) {
  if (token) CacheService.getScriptCache().remove('AUTH_' + token);
  return { sucesso: true };
}

function getHomeData(token) {
  const ctx = getContexto_(token);
  const config = lerConfig_(ctx.ss);
  return ctx.cliente.tipo === 'LOJA'
    ? getHomeLoja_(ctx.ss, ctx.cliente, config)
    : getHomeServico_(ctx.ss, ctx.cliente, config);
}

// =========================
// AGENDAMENTO PÚBLICO
// =========================

function getDadosAgendamentoPublico(clienteId) {
  const cliente = getClienteById_(clienteId);
  validarAcessoCliente_(cliente);
  if (cliente.tipo !== 'SERVICO') throw new Error('Este link é exclusivo para prestadores de serviço.');

  const ss = SpreadsheetApp.openById(cliente.sheetId);
  const config = lerConfig_(ss);
  if (String(config.ACEITA_AGENDAMENTO_PUBLICO || 'SIM').toUpperCase() !== 'SIM') throw new Error('Agendamento online indisponível no momento.');

  const servicos = getRows_(ss, 'Servicos')
    .filter(r => isAtivo_(r[6]))
    .map(r => ({ id: r[0], nome: r[1], categoria: r[2], duracao: Number(r[3] || 0), preco: Number(r[4] || 0) }));

  return {
    sucesso: true,
    cliente: { id: cliente.id, nomeEmpresa: cliente.nomeEmpresa, responsavel: cliente.responsavel, telefone: cliente.telefone },
    config: {
      chavePix: config.CHAVE_PIX || '',
      nomeRecebedorPix: config.NOME_RECEBEDOR_PIX || cliente.nomeEmpresa,
      whatsappPrestador: config.WHATSAPP_PRESTADOR || cliente.telefone || '',
      mensagemPosAgendamento: config.MENSAGEM_POS_AGENDAMENTO || 'Obrigado pelo agendamento!'
    },
    servicos
  };
}

function salvarAgendamentoPublico(clienteId, payload) {
  const cliente = getClienteById_(clienteId);
  validarAcessoCliente_(cliente);
  if (cliente.tipo !== 'SERVICO') throw new Error('Este link é exclusivo para prestadores de serviço.');

  if (!payload || !payload.cliente) throw new Error('Informe seu nome.');
  if (!payload.telefone) throw new Error('Informe seu WhatsApp.');
  if (!payload.servicoId) throw new Error('Escolha um serviço.');
  if (!payload.data) throw new Error('Escolha uma data.');
  if (!payload.hora) throw new Error('Escolha um horário.');

  const ss = SpreadsheetApp.openById(cliente.sheetId);
  const config = lerConfig_(ss);
  if (String(config.ACEITA_AGENDAMENTO_PUBLICO || 'SIM').toUpperCase() !== 'SIM') throw new Error('Agendamento online indisponível no momento.');

  const servico = getRows_(ss, 'Servicos').find(r => String(r[0]) === String(payload.servicoId) && isAtivo_(r[6]));
  if (!servico) throw new Error('Serviço não encontrado ou indisponível.');

  const dataAgendada = new Date(payload.data);
  const conflito = getRows_(ss, 'Agenda').some(r => {
    const status = String(r[7] || '').toUpperCase();
    const livre = status === 'CANCELADO' || status === 'FALTOU';
    return mesmaData_(r[1], dataAgendada) && String(r[2]) === String(payload.hora) && !livre;
  });
  if (conflito) throw new Error('Este horário não está disponível. Escolha outro horário.');

  const valor = Number(payload.valor || servico[4] || 0);
  const formaPagamento = payload.formaPagamento || 'Pix';
  const id = Utilities.getUuid();

  ss.getSheetByName('Agenda').appendRow([id, dataAgendada, payload.hora, payload.cliente, payload.telefone, payload.servicoId, valor, 'Agendado', 'Pendente', formaPagamento, 'Agendamento feito pelo link público. ' + (payload.observacao || ''), 'NAO']);
  registrarClienteSimples_(ss, payload.cliente, payload.telefone);

  const mensagem = montarMensagemAgendamentoPublico_({
    cliente: payload.cliente,
    telefone: payload.telefone,
    servico: servico[1],
    data: formatarData_(dataAgendada),
    hora: payload.hora,
    valor,
    formaPagamento
  });

  return {
    sucesso: true,
    agendamentoId: id,
    servico: servico[1],
    data: formatarData_(dataAgendada),
    hora: payload.hora,
    valor,
    formaPagamento,
    pix: { chave: config.CHAVE_PIX || '', nomeRecebedor: config.NOME_RECEBEDOR_PIX || cliente.nomeEmpresa },
    whatsappPrestador: gerarWhatsappMensagem_(config.WHATSAPP_PRESTADOR || cliente.telefone, mensagem)
  };
}

function montarMensagemAgendamentoPublico_(dados) {
  return ['Olá! Fiz um agendamento pelo link.', '', 'Nome: ' + dados.cliente, 'WhatsApp: ' + dados.telefone, 'Serviço: ' + dados.servico, 'Data: ' + dados.data, 'Hora: ' + dados.hora, 'Valor: ' + moeda_(dados.valor), 'Pagamento: ' + dados.formaPagamento, '', String(dados.formaPagamento).toUpperCase() === 'PIX' ? 'Se for Pix, vou enviar o comprovante por aqui.' : 'Aguardo confirmação.'].join('\n');
}

// =========================
// MÓDULOS COMUNS
// =========================

function getDespesas(token) {
  const ctx = getContexto_(token);
  return getRows_(ctx.ss, 'Despesas').slice().reverse().map(r => ({ id: r[0], data: formatarData_(r[1]), descricao: r[2], categoria: r[3], valor: Number(r[4] || 0), recorrente: r[5], ativa: r[6] }));
}

function salvarDespesa(token, payload) {
  const ctx = getContexto_(token);
  if (!payload || !payload.descricao) throw new Error('Descrição é obrigatória.');
  if (!payload.valor) throw new Error('Valor é obrigatório.');

  ctx.ss.getSheetByName('Despesas').appendRow([Utilities.getUuid(), payload.data ? new Date(payload.data) : new Date(), payload.descricao, payload.categoria || 'Outros', Number(payload.valor || 0), payload.recorrente || 'NAO', true]);
  return { sucesso: true };
}

function getCaixaDia(token, dataIso) {
  const ctx = getContexto_(token);
  const dataBase = dataIso ? new Date(dataIso) : new Date();
  const despesas = somaDespesasDia_(ctx.ss, dataBase);
  const entradas = { Pix: 0, Dinheiro: 0, Debito: 0, Credito: 0, Outros: 0 };
  let pendente = 0;
  let qtd = 0;

  if (ctx.cliente.tipo === 'LOJA') {
    getRows_(ctx.ss, 'Vendas').forEach(v => {
      if (!mesmaData_(v[1], dataBase)) return;
      qtd++;
      somarForma_(entradas, v[7], Number(v[6] || 0));
    });
  } else {
    getRows_(ctx.ss, 'Agenda').forEach(a => {
      if (!mesmaData_(a[1], dataBase)) return;
      const valor = Number(a[6] || 0);
      const statusPg = String(a[8] || '').toUpperCase();
      qtd++;
      if (statusPg === 'PAGO') somarForma_(entradas, a[9], valor);
      else pendente += valor;
    });
  }

  const totalEntradas = entradas.Pix + entradas.Dinheiro + entradas.Debito + entradas.Credito + entradas.Outros;
  const dinheiroEsperado = entradas.Dinheiro - despesas.total;
  const totalEsperado = totalEntradas - despesas.total;

  return {
    data: formatarData_(dataBase),
    dataIso: formatarDataIso_(dataBase),
    tipo: ctx.cliente.tipo,
    quantidade: qtd,
    entradas,
    pendente,
    despesas: despesas.total,
    dinheiroEsperado,
    totalEsperado,
    fechamentos: getFechamentosDia_(ctx.ss, dataBase)
  };
}

function salvarFechamentoCaixa(token, payload) {
  const ctx = getContexto_(token);
  const dataBase = payload && payload.data ? new Date(payload.data) : new Date();
  const caixa = getCaixaDia(token, formatarDataIso_(dataBase));
  const dinheiroContado = Number(payload.dinheiroContado || 0);
  const diferenca = dinheiroContado - Number(caixa.dinheiroEsperado || 0);

  ctx.ss.getSheetByName('Fechamentos').appendRow([
    Utilities.getUuid(),
    dataBase,
    caixa.entradas.Pix,
    caixa.dinheiroEsperado,
    dinheiroContado,
    caixa.entradas.Debito,
    caixa.entradas.Credito,
    caixa.despesas,
    caixa.totalEsperado,
    diferenca,
    payload.observacao || ''
  ]);

  return { sucesso: true, diferenca, dinheiroEsperado: caixa.dinheiroEsperado, totalEsperado: caixa.totalEsperado };
}

function getComprovanteVenda(token, vendaId) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'LOJA');

  const produtosMap = {};
  getRows_(ctx.ss, 'Produtos').forEach(p => produtosMap[String(p[0])] = montarNomeProduto_(p));

  const venda = getRows_(ctx.ss, 'Vendas').find(r => String(r[0]) === String(vendaId));
  if (!venda) throw new Error('Venda não encontrada.');

  const texto = ['Comprovante de venda', '', ctx.cliente.nomeEmpresa, 'Data: ' + formatarDataHora_(venda[1]), 'Cliente: ' + (venda[2] || '-'), 'Produto: ' + (produtosMap[String(venda[4])] || 'Produto'), 'Quantidade: ' + venda[5], 'Valor: ' + moeda_(venda[6]), 'Pagamento: ' + venda[7], '', 'Obrigado pela preferência!'].join('\n');
  return { texto, whatsapp: gerarWhatsappMensagem_(venda[3], texto) };
}

function getComprovanteAgendamento(token, agendaId) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'SERVICO');

  const servicosMap = {};
  getRows_(ctx.ss, 'Servicos').forEach(s => servicosMap[String(s[0])] = s[1]);

  const ag = getRows_(ctx.ss, 'Agenda').find(r => String(r[0]) === String(agendaId));
  if (!ag) throw new Error('Agendamento não encontrado.');

  const texto = ['Comprovante de atendimento/agendamento', '', ctx.cliente.nomeEmpresa, 'Data: ' + formatarData_(ag[1]), 'Hora: ' + ag[2], 'Cliente: ' + (ag[3] || '-'), 'Serviço: ' + (servicosMap[String(ag[5])] || 'Serviço'), 'Valor: ' + moeda_(ag[6]), 'Pagamento: ' + ag[8], '', 'Obrigado pela preferência!'].join('\n');
  return { texto, whatsapp: gerarWhatsappMensagem_(ag[4], texto) };
}

// =========================
// LOJA — PRODUTOS / VENDAS
// =========================

function getProdutos(token) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'LOJA');
  return getRows_(ctx.ss, 'Produtos').filter(r => isAtivo_(r[11])).map(r => ({ id: r[0], sku: r[1], codigoBarras: r[2], produto: r[3], categoria: r[4], cor: r[5], tamanho: r[6], custo: Number(r[7] || 0), preco: Number(r[8] || 0), estoque: Number(r[9] || 0), estoqueMin: Number(r[10] || 0), ativo: r[11], cadastroCompleto: r[12], nome: montarNomeProduto_(r) }));
}

function salvarProduto(token, payload) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'LOJA');
  if (!payload || !payload.produto) throw new Error('Nome do produto é obrigatório.');

  const id = Utilities.getUuid();
  const estoqueMin = payload.estoqueMin === '' || payload.estoqueMin == null ? 2 : Number(payload.estoqueMin);
  ctx.ss.getSheetByName('Produtos').appendRow([id, payload.sku || '', payload.codigoBarras || '', payload.produto, payload.categoria || '', payload.cor || '', payload.tamanho || '', Number(payload.custo || 0), Number(payload.preco || 0), Number(payload.estoque || 0), estoqueMin, true, payload.cadastroCompleto || 'SIM']);
  return { sucesso: true, id };
}

function salvarVenda(token, payload) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'LOJA');
  if (!payload || !payload.produtoId) throw new Error('Produto é obrigatório.');
  if (!payload.quantidade) throw new Error('Quantidade é obrigatória.');

  const produtosSheet = ctx.ss.getSheetByName('Produtos');
  const rows = produtosSheet.getDataRange().getValues();
  const idx = rows.findIndex(r => String(r[0]) === String(payload.produtoId));
  if (idx < 1) throw new Error('Produto não encontrado.');

  const produto = rows[idx];
  const quantidade = Number(payload.quantidade || 0);
  const estoqueAtual = Number(produto[9] || 0);
  if (estoqueAtual < quantidade) throw new Error('Estoque insuficiente. Estoque atual: ' + estoqueAtual);

  const valorPago = Number(payload.valorPago || 0);
  const custo = Number(produto[7] || 0);
  const taxa = calcularTaxa_(ctx.ss, payload.formaPagamento, valorPago);
  const lucro = valorPago - (custo * quantidade) - taxa;
  const vendaId = Utilities.getUuid();

  ctx.ss.getSheetByName('Vendas').appendRow([vendaId, new Date(), payload.cliente || '', payload.telefone || '', payload.produtoId, quantidade, valorPago, payload.formaPagamento || 'Pix', payload.canal || 'WhatsApp', payload.entrega || '', taxa, lucro, 'NAO']);
  ctx.ss.getSheetByName('MovimentacoesEstoque').appendRow([Utilities.getUuid(), new Date(), payload.produtoId, 'Venda', quantidade, vendaId, 'Venda registrada no app']);
  produtosSheet.getRange(idx + 1, 10).setValue(estoqueAtual - quantidade);
  registrarClienteSimples_(ctx.ss, payload.cliente, payload.telefone);

  return { sucesso: true, vendaId, produto: montarNomeProduto_(produto), valorPago, lucro };
}

function getVendas(token) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'LOJA');
  const produtosMap = {};
  getRows_(ctx.ss, 'Produtos').forEach(p => produtosMap[String(p[0])] = montarNomeProduto_(p));
  return getRows_(ctx.ss, 'Vendas').slice().reverse().slice(0, 100).map(r => ({ id: r[0], data: formatarDataHora_(r[1]), cliente: r[2], telefone: r[3], produto: produtosMap[String(r[4])] || 'Produto removido', quantidade: Number(r[5] || 0), valor: Number(r[6] || 0), pagamento: r[7], canal: r[8], lucro: Number(r[11] || 0) }));
}

function getProdutosCriticos(token) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'LOJA');
  return getRows_(ctx.ss, 'Produtos').filter(r => isAtivo_(r[11])).filter(r => Number(r[9] || 0) <= Number(r[10] || 0)).map(r => ({ id: r[0], nome: r[3], cor: r[5], tamanho: r[6], estoque: Number(r[9] || 0), estoqueMin: Number(r[10] || 0) })).slice(0, 20);
}

// =========================
// SERVIÇO — SERVIÇOS / AGENDA
// =========================

function getServicos(token) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'SERVICO');
  return getRows_(ctx.ss, 'Servicos').filter(r => isAtivo_(r[6])).map(r => ({ id: r[0], nome: r[1], categoria: r[2], duracao: Number(r[3] || 0), preco: Number(r[4] || 0), custo: Number(r[5] || 0), ativo: r[6] }));
}

function salvarServico(token, payload) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'SERVICO');
  if (!payload || !payload.nome) throw new Error('Nome do serviço é obrigatório.');

  const id = Utilities.getUuid();
  ctx.ss.getSheetByName('Servicos').appendRow([id, payload.nome, payload.categoria || '', Number(payload.duracao || 60), Number(payload.preco || 0), Number(payload.custo || 0), true]);
  return { sucesso: true, id };
}

function salvarAgendamento(token, payload) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'SERVICO');
  if (!payload || !payload.cliente) throw new Error('Cliente é obrigatório.');
  if (!payload.data) throw new Error('Data é obrigatória.');
  if (!payload.hora) throw new Error('Hora é obrigatória.');
  if (!payload.servicoId) throw new Error('Serviço é obrigatório.');

  const id = Utilities.getUuid();
  ctx.ss.getSheetByName('Agenda').appendRow([id, new Date(payload.data), payload.hora, payload.cliente, payload.telefone || '', payload.servicoId, Number(payload.valor || 0), payload.statusAtendimento || 'Agendado', payload.statusPagamento || 'Pendente', payload.formaPagamento || '', payload.observacao || '', 'NAO']);
  registrarClienteSimples_(ctx.ss, payload.cliente, payload.telefone);
  return { sucesso: true, id };
}

function getAgenda(token) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'SERVICO');
  const servicosMap = {};
  getRows_(ctx.ss, 'Servicos').forEach(s => servicosMap[String(s[0])] = s[1]);
  return getRows_(ctx.ss, 'Agenda').slice().reverse().slice(0, 100).map(r => mapAgenda_(r, servicosMap));
}

function getAgendaHoje(token) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'SERVICO');
  const servicosMap = {};
  getRows_(ctx.ss, 'Servicos').forEach(s => servicosMap[String(s[0])] = s[1]);
  const hoje = new Date();
  return getRows_(ctx.ss, 'Agenda').filter(r => mesmaData_(r[1], hoje)).sort((a, b) => String(a[2]).localeCompare(String(b[2]))).map(r => mapAgenda_(r, servicosMap));
}

function atualizarPagamentoAgendamento(token, agendaId, statusPagamento) {
  const ctx = getContexto_(token);
  exigirTipo_(ctx.cliente, 'SERVICO');
  const sheet = ctx.ss.getSheetByName('Agenda');
  const rows = sheet.getDataRange().getValues();
  const idx = rows.findIndex(r => String(r[0]) === String(agendaId));
  if (idx < 1) throw new Error('Agendamento não encontrado.');
  sheet.getRange(idx + 1, 9).setValue(statusPagamento);
  return { sucesso: true };
}

// =========================
// CONTEXTO / CLIENTE / SEGURANÇA
// =========================

function getContexto_(token) {
  const sessao = validarToken_(token);
  const cliente = getClienteById_(sessao.clienteId);
  validarAcessoCliente_(cliente);
  return { sessao, cliente, ss: SpreadsheetApp.openById(cliente.sheetId) };
}

function getClienteById_(clienteId) {
  const pos = encontrarLinhaCliente_(clienteId);
  const r = pos.row;
  return { id: r[0], tipo: String(r[1]).toUpperCase(), nomeEmpresa: r[2], responsavel: r[3], telefone: r[4], email: r[5], usuario: r[6], senhaHash: r[7], trocarSenha: r[8], sheetId: r[9], status: String(r[10]).toUpperCase(), vencimento: r[11], plano: r[12], vendedor: r[13], linkApp: r[15] };
}

function encontrarLinhaCliente_(clienteId) {
  const sheet = getMaster_().getSheetByName('Clientes');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(clienteId)) return { rowIndex: i + 1, row: rows[i] };
  }
  throw new Error('Cliente não encontrado.');
}

function validarAcessoCliente_(cliente) {
  if (!['ATIVO', 'TESTE'].includes(String(cliente.status).toUpperCase())) throw new Error('Assinatura inativa. Entre em contato para regularizar.');
  if (cliente.status !== 'TESTE' && cliente.vencimento) {
    const hoje = zerarHora_(new Date());
    const venc = zerarHora_(new Date(cliente.vencimento));
    if (venc < hoje) throw new Error('Assinatura vencida. Entre em contato para regularizar.');
  }
}

function validarToken_(token) {
  if (!token) throw new Error('Sessão inválida. Faça login novamente.');
  const raw = CacheService.getScriptCache().get('AUTH_' + token);
  if (!raw) throw new Error('Sessão expirada. Faça login novamente.');
  return JSON.parse(raw);
}

function exigirTipo_(cliente, tipo) {
  if (String(cliente.tipo).toUpperCase() !== String(tipo).toUpperCase()) throw new Error('Este módulo não está disponível para este tipo de conta.');
}

// =========================
// HOME / DASHBOARD
// =========================

function getHomeLoja_(ss, cliente, config) {
  const produtos = getRows_(ss, 'Produtos');
  const vendas = getRows_(ss, 'Vendas');
  const despesas = getRows_(ss, 'Despesas');
  const hoje = new Date();
  let vendasHoje = 0, vendasMes = 0, lucroMes = 0, despesasMes = 0;
  vendas.forEach(v => { const data = new Date(v[1]); const valor = Number(v[6] || 0); const lucro = Number(v[11] || 0); if (mesmaData_(data, hoje)) vendasHoje += valor; if (mesmoMes_(data, hoje)) { vendasMes += valor; lucroMes += lucro; } });
  despesas.forEach(d => { const data = new Date(d[1]); if (mesmoMes_(data, hoje)) despesasMes += Number(d[4] || 0); });
  const produtosAtivos = produtos.filter(p => isAtivo_(p[11]));
  const estoqueCritico = produtosAtivos.filter(p => Number(p[9] || 0) <= Number(p[10] || 0)).length;
  return { tipo: 'LOJA', cliente: dadosBasicosCliente_(cliente), config, cards: [{ label: 'Vendas hoje', value: moeda_(vendasHoje) }, { label: 'Vendas no mês', value: moeda_(vendasMes) }, { label: 'Lucro bruto mês', value: moeda_(lucroMes) }, { label: 'Despesas mês', value: moeda_(despesasMes) }, { label: 'Produtos ativos', value: String(produtosAtivos.length) }, { label: 'Estoque crítico', value: String(estoqueCritico) }], mensagem: 'Controle suas vendas, estoque, despesas e lucro.' };
}

function getHomeServico_(ss, cliente, config) {
  const agenda = getRows_(ss, 'Agenda');
  const servicos = getRows_(ss, 'Servicos');
  const despesas = getRows_(ss, 'Despesas');
  const hoje = new Date();
  let agendaHoje = 0, receitaMes = 0, pendenteMes = 0, despesasMes = 0;
  agenda.forEach(a => { const data = new Date(a[1]); const valor = Number(a[6] || 0); const pagamento = String(a[8]).toUpperCase(); if (mesmaData_(data, hoje)) agendaHoje++; if (mesmoMes_(data, hoje)) { if (pagamento === 'PAGO') receitaMes += valor; if (pagamento !== 'PAGO') pendenteMes += valor; } });
  despesas.forEach(d => { const data = new Date(d[1]); if (mesmoMes_(data, hoje)) despesasMes += Number(d[4] || 0); });
  return { tipo: 'SERVICO', cliente: dadosBasicosCliente_(cliente), config, cards: [{ label: 'Agenda hoje', value: String(agendaHoje) }, { label: 'Receita paga mês', value: moeda_(receitaMes) }, { label: 'Pendente mês', value: moeda_(pendenteMes) }, { label: 'Despesas mês', value: moeda_(despesasMes) }, { label: 'Serviços cadastrados', value: String(servicos.length) }], mensagem: 'Controle sua agenda, pagamentos e clientes.' };
}

// =========================
// HELPERS
// =========================

function dadosBasicosCliente_(cliente) { return { id: cliente.id, tipo: cliente.tipo, nomeEmpresa: cliente.nomeEmpresa, responsavel: cliente.responsavel, status: cliente.status, vencimento: formatarData_(cliente.vencimento) }; }
function lerConfig_(ss) { const sheet = ss.getSheetByName('Config'); if (!sheet) return {}; const rows = sheet.getDataRange().getValues(); const cfg = {}; rows.slice(1).forEach(r => cfg[String(r[0])] = r[1]); return cfg; }
function getRows_(ss, sheetName) { const sheet = ss.getSheetByName(sheetName); if (!sheet) return []; const values = sheet.getDataRange().getValues(); return values.length > 1 ? values.slice(1) : []; }
function isAtivo_(valor) { const s = String(valor).toUpperCase(); return valor === true || s === 'TRUE' || s === 'SIM' || s === 'ATIVO'; }
function montarNomeProduto_(r) { return [r[3], r[5], r[6]].filter(Boolean).join(' — '); }
function calcularTaxa_(ss, formaPagamento, valor) { const cfg = lerConfig_(ss); const f = String(formaPagamento || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); if (f.includes('CREDITO')) return Number(valor || 0) * Number(cfg.TAXA_CREDITO || 0); if (f.includes('DEBITO')) return Number(valor || 0) * Number(cfg.TAXA_DEBITO || 0); return 0; }
function registrarClienteSimples_(ss, nome, telefone) { if (!nome && !telefone) return; const sheet = ss.getSheetByName('Clientes'); if (!sheet) return; const rows = sheet.getDataRange().getValues(); const tel = String(telefone || '').replace(/\D/g, ''); const existe = rows.slice(1).some(r => String(r[2] || '').replace(/\D/g, '') === tel && tel); if (!existe) sheet.appendRow([Utilities.getUuid(), nome || '', telefone || '', '', '', new Date()]); }
function mapAgenda_(r, servicosMap) { return { id: r[0], data: formatarData_(r[1]), dataIso: formatarDataIso_(r[1]), hora: r[2], cliente: r[3], telefone: r[4], servicoId: r[5], servico: servicosMap[String(r[5])] || 'Serviço', valor: Number(r[6] || 0), statusAtendimento: r[7], statusPagamento: r[8], formaPagamento: r[9], observacao: r[10], whatsapp: gerarWhatsapp_(r[4]) }; }
function mesmaData_(a, b) { if (!a || !b) return false; const da = new Date(a); const db = new Date(b); return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate(); }
function mesmoMes_(a, b) { if (!a || !b) return false; const da = new Date(a); const db = new Date(b); return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth(); }
function zerarHora_(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function formatarData_(data) { if (!data) return ''; return Utilities.formatDate(new Date(data), Session.getScriptTimeZone(), 'dd/MM/yyyy'); }
function formatarDataHora_(data) { if (!data) return ''; return Utilities.formatDate(new Date(data), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'); }
function formatarDataIso_(data) { if (!data) return ''; return Utilities.formatDate(new Date(data), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function moeda_(valor) { return 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ','); }
function gerarWhatsapp_(telefone) { const n = String(telefone || '').replace(/\D/g, ''); if (!n) return ''; const final = n.length <= 11 ? '55' + n : n; return 'https://wa.me/' + final; }
function gerarWhatsappMensagem_(telefone, mensagem) { const base = gerarWhatsapp_(telefone); if (!base) return ''; return base + '?text=' + encodeURIComponent(mensagem || ''); }
function somarForma_(entradas, forma, valor) { const f = String(forma || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); if (f.includes('PIX')) entradas.Pix += valor; else if (f.includes('DINHEIRO')) entradas.Dinheiro += valor; else if (f.includes('DEBITO')) entradas.Debito += valor; else if (f.includes('CREDITO') || f.includes('CARTAO')) entradas.Credito += valor; else entradas.Outros += valor; }
function somaDespesasDia_(ss, dataBase) { const total = getRows_(ss, 'Despesas').filter(d => mesmaData_(d[1], dataBase)).reduce((acc, d) => acc + Number(d[4] || 0), 0); return { total }; }
function getFechamentosDia_(ss, dataBase) { return getRows_(ss, 'Fechamentos').filter(f => mesmaData_(f[1], dataBase)).map(f => ({ id: f[0], data: formatarData_(f[1]), pix: Number(f[2] || 0), dinheiroEsperado: Number(f[3] || 0), dinheiroContado: Number(f[4] || 0), debito: Number(f[5] || 0), credito: Number(f[6] || 0), despesas: Number(f[7] || 0), totalEsperado: Number(f[8] || 0), diferenca: Number(f[9] || 0), observacao: f[10] })); }
