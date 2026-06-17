// App Central — Loja & Agenda Simples
// Este é o app usado pelo cliente final.
// Ele lê a CLIENTES_MASTER, valida login/assinatura e abre a planilha correta do cliente.

const MASTER_SHEET_ID = 'COLE_AQUI_ID_CLIENTES_MASTER';
const SESSION_SECONDS = 21600; // 6 horas

function doGet(e) {
  const clienteId = e && e.parameter && e.parameter.cliente
    ? String(e.parameter.cliente).trim()
    : '';

  if (!clienteId) {
    return HtmlService
      .createHtmlOutput('<h2>Cliente não informado.</h2><p>Use o link completo do sistema.</p>');
  }

  const template = HtmlService.createTemplateFromFile('index');
  template.clienteId = clienteId;

  return template
    .evaluate()
    .setTitle('Loja & Agenda Simples')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(file) {
  return HtmlService
    .createHtmlOutputFromFile(file)
    .getContent();
}

function getMaster_() {
  return SpreadsheetApp.openById(MASTER_SHEET_ID);
}

function hashSenha(senha) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(senha || ''),
    Utilities.Charset.UTF_8
  );

  return bytes
    .map(b => ('0' + (b & 0xff).toString(16)).slice(-2))
    .join('');
}

function loginCliente(clienteId, usuario, senha) {
  const cliente = getClienteById_(clienteId);

  validarAcessoCliente_(cliente);

  if (String(cliente.usuario).trim() !== String(usuario).trim()) {
    throw new Error('Usuário ou senha inválidos.');
  }

  if (String(cliente.senhaHash) !== hashSenha(senha)) {
    throw new Error('Usuário ou senha inválidos.');
  }

  const token = Utilities.getUuid();

  const sessao = {
    clienteId: cliente.id,
    tipo: cliente.tipo,
    nomeEmpresa: cliente.nomeEmpresa,
    usuario: cliente.usuario,
    sheetId: cliente.sheetId
  };

  CacheService
    .getScriptCache()
    .put('AUTH_' + token, JSON.stringify(sessao), SESSION_SECONDS);

  return {
    sucesso: true,
    token,
    trocarSenha: String(cliente.trocarSenha).toUpperCase() === 'SIM',
    cliente: {
      id: cliente.id,
      tipo: cliente.tipo,
      nomeEmpresa: cliente.nomeEmpresa,
      responsavel: cliente.responsavel,
      status: cliente.status,
      vencimento: formatarData_(cliente.vencimento)
    }
  };
}

function trocarSenhaPrimeiroAcesso(token, novaSenha) {
  const sessao = validarToken_(token);

  if (!novaSenha || String(novaSenha).length < 4) {
    throw new Error('A nova senha precisa ter pelo menos 4 caracteres.');
  }

  const pos = encontrarLinhaCliente_(sessao.clienteId);
  const sheet = getMaster_().getSheetByName('Clientes');

  sheet.getRange(pos.rowIndex, 8).setValue(hashSenha(novaSenha)); // SENHA_HASH
  sheet.getRange(pos.rowIndex, 9).setValue('NAO'); // TROCAR_SENHA

  return { sucesso: true };
}

function logoutCliente(token) {
  if (token) {
    CacheService.getScriptCache().remove('AUTH_' + token);
  }
  return { sucesso: true };
}

function getHomeData(token) {
  const sessao = validarToken_(token);
  const cliente = getClienteById_(sessao.clienteId);

  validarAcessoCliente_(cliente);

  const ss = SpreadsheetApp.openById(cliente.sheetId);
  const config = lerConfig_(ss);

  if (cliente.tipo === 'LOJA') {
    return getHomeLoja_(ss, cliente, config);
  }

  return getHomeServico_(ss, cliente, config);
}

function getAgendaHoje(token) {
  const sessao = validarToken_(token);
  const cliente = getClienteById_(sessao.clienteId);

  if (cliente.tipo !== 'SERVICO') {
    return [];
  }

  validarAcessoCliente_(cliente);

  const ss = SpreadsheetApp.openById(cliente.sheetId);
  const agenda = getRows_(ss, 'Agenda');
  const servicos = getRows_(ss, 'Servicos');
  const servicosMap = {};

  servicos.forEach(s => {
    servicosMap[String(s[0])] = s[1];
  });

  const hoje = new Date();

  return agenda
    .filter(r => mesmaData_(r[1], hoje))
    .sort((a, b) => String(a[2]).localeCompare(String(b[2])))
    .map(r => ({
      id: r[0],
      data: formatarData_(r[1]),
      hora: r[2],
      cliente: r[3],
      telefone: r[4],
      servico: servicosMap[String(r[5])] || 'Serviço',
      valor: Number(r[6] || 0),
      statusAtendimento: r[7],
      statusPagamento: r[8],
      formaPagamento: r[9],
      observacao: r[10],
      whatsapp: gerarWhatsapp_(r[4])
    }));
}

function getProdutosCriticos(token) {
  const sessao = validarToken_(token);
  const cliente = getClienteById_(sessao.clienteId);

  if (cliente.tipo !== 'LOJA') {
    return [];
  }

  validarAcessoCliente_(cliente);

  const ss = SpreadsheetApp.openById(cliente.sheetId);
  const produtos = getRows_(ss, 'Produtos');

  return produtos
    .filter(r => String(r[11]).toUpperCase() === 'TRUE' || String(r[11]).toUpperCase() === 'SIM' || r[11] === true)
    .filter(r => Number(r[9] || 0) <= Number(r[10] || 0))
    .map(r => ({
      id: r[0],
      nome: r[3],
      cor: r[5],
      tamanho: r[6],
      estoque: Number(r[9] || 0),
      estoqueMin: Number(r[10] || 0)
    }))
    .slice(0, 20);
}

function getClienteById_(clienteId) {
  const pos = encontrarLinhaCliente_(clienteId);
  const r = pos.row;

  return {
    id: r[0],
    tipo: String(r[1]).toUpperCase(),
    nomeEmpresa: r[2],
    responsavel: r[3],
    telefone: r[4],
    email: r[5],
    usuario: r[6],
    senhaHash: r[7],
    trocarSenha: r[8],
    sheetId: r[9],
    status: String(r[10]).toUpperCase(),
    vencimento: r[11],
    plano: r[12],
    vendedor: r[13],
    linkApp: r[15]
  };
}

function encontrarLinhaCliente_(clienteId) {
  const sheet = getMaster_().getSheetByName('Clientes');
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(clienteId)) {
      return {
        rowIndex: i + 1,
        row: rows[i]
      };
    }
  }

  throw new Error('Cliente não encontrado.');
}

function validarAcessoCliente_(cliente) {
  if (!['ATIVO', 'TESTE'].includes(String(cliente.status).toUpperCase())) {
    throw new Error('Assinatura inativa. Entre em contato para regularizar.');
  }

  if (cliente.status !== 'TESTE' && cliente.vencimento) {
    const hoje = zerarHora_(new Date());
    const venc = zerarHora_(new Date(cliente.vencimento));

    if (venc < hoje) {
      throw new Error('Assinatura vencida. Entre em contato para regularizar.');
    }
  }
}

function validarToken_(token) {
  if (!token) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  const raw = CacheService
    .getScriptCache()
    .get('AUTH_' + token);

  if (!raw) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  return JSON.parse(raw);
}

function getHomeLoja_(ss, cliente, config) {
  const produtos = getRows_(ss, 'Produtos');
  const vendas = getRows_(ss, 'Vendas');
  const despesas = getRows_(ss, 'Despesas');

  const hoje = new Date();
  let vendasHoje = 0;
  let vendasMes = 0;
  let lucroMes = 0;
  let despesasMes = 0;

  vendas.forEach(v => {
    const data = new Date(v[1]);
    const valor = Number(v[6] || 0);
    const lucro = Number(v[11] || 0);

    if (mesmaData_(data, hoje)) vendasHoje += valor;

    if (mesmoMes_(data, hoje)) {
      vendasMes += valor;
      lucroMes += lucro;
    }
  });

  despesas.forEach(d => {
    const data = new Date(d[1]);
    if (mesmoMes_(data, hoje)) {
      despesasMes += Number(d[4] || 0);
    }
  });

  const produtosAtivos = produtos.filter(p => {
    const ativo = String(p[11]).toUpperCase();
    return ativo === 'TRUE' || ativo === 'SIM' || p[11] === true;
  });

  const estoqueCritico = produtosAtivos.filter(p => Number(p[9] || 0) <= Number(p[10] || 0)).length;

  return {
    tipo: 'LOJA',
    cliente: dadosBasicosCliente_(cliente),
    config,
    cards: [
      { label: 'Vendas hoje', value: moeda_(vendasHoje) },
      { label: 'Vendas no mês', value: moeda_(vendasMes) },
      { label: 'Lucro bruto mês', value: moeda_(lucroMes) },
      { label: 'Despesas mês', value: moeda_(despesasMes) },
      { label: 'Produtos ativos', value: String(produtosAtivos.length) },
      { label: 'Estoque crítico', value: String(estoqueCritico) }
    ],
    mensagem: 'Controle suas vendas, estoque, despesas e lucro.'
  };
}

function getHomeServico_(ss, cliente, config) {
  const agenda = getRows_(ss, 'Agenda');
  const servicos = getRows_(ss, 'Servicos');
  const despesas = getRows_(ss, 'Despesas');

  const hoje = new Date();
  let agendaHoje = 0;
  let receitaMes = 0;
  let pendenteMes = 0;
  let despesasMes = 0;

  agenda.forEach(a => {
    const data = new Date(a[1]);
    const valor = Number(a[6] || 0);
    const pagamento = String(a[8]).toUpperCase();

    if (mesmaData_(data, hoje)) agendaHoje++;

    if (mesmoMes_(data, hoje)) {
      if (pagamento === 'PAGO') receitaMes += valor;
      if (pagamento !== 'PAGO') pendenteMes += valor;
    }
  });

  despesas.forEach(d => {
    const data = new Date(d[1]);
    if (mesmoMes_(data, hoje)) {
      despesasMes += Number(d[4] || 0);
    }
  });

  return {
    tipo: 'SERVICO',
    cliente: dadosBasicosCliente_(cliente),
    config,
    cards: [
      { label: 'Agenda hoje', value: String(agendaHoje) },
      { label: 'Receita paga mês', value: moeda_(receitaMes) },
      { label: 'Pendente mês', value: moeda_(pendenteMes) },
      { label: 'Despesas mês', value: moeda_(despesasMes) },
      { label: 'Serviços cadastrados', value: String(servicos.length) }
    ],
    mensagem: 'Controle sua agenda, pagamentos e clientes.'
  };
}

function dadosBasicosCliente_(cliente) {
  return {
    id: cliente.id,
    tipo: cliente.tipo,
    nomeEmpresa: cliente.nomeEmpresa,
    responsavel: cliente.responsavel,
    status: cliente.status,
    vencimento: formatarData_(cliente.vencimento)
  };
}

function lerConfig_(ss) {
  const sheet = ss.getSheetByName('Config');
  if (!sheet) return {};

  const rows = sheet.getDataRange().getValues();
  const cfg = {};

  rows.slice(1).forEach(r => {
    cfg[String(r[0])] = r[1];
  });

  return cfg;
}

function getRows_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  return values.length > 1 ? values.slice(1) : [];
}

function mesmaData_(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);

  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

function mesmoMes_(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);

  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth();
}

function zerarHora_(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatarData_(data) {
  if (!data) return '';
  return Utilities.formatDate(new Date(data), Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function moeda_(valor) {
  return 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',');
}

function gerarWhatsapp_(telefone) {
  const n = String(telefone || '').replace(/\D/g, '');
  if (!n) return '';

  const final = n.length <= 11 ? '55' + n : n;
  return 'https://wa.me/' + final;
}
