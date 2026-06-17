// Admin / Instalador — Loja & Agenda Simples
// Preencha os IDs abaixo antes de publicar o Web App.

const MASTER_SHEET_ID = 'COLE_AQUI_ID_CLIENTES_MASTER';
const TEMPLATE_LOJA_ID = 'COLE_AQUI_ID_TEMPLATE_LOJA';
const TEMPLATE_SERVICO_ID = 'COLE_AQUI_ID_TEMPLATE_SERVICO';
const PASTA_CLIENTES_ID = 'COLE_AQUI_ID_PASTA_CLIENTES';
const APP_CENTRAL_URL = 'COLE_AQUI_URL_DO_APP_CENTRAL';

const VALOR_MENSALIDADE_PADRAO = 30;
const VALOR_COMISSAO_PADRAO = 15;

function doGet() {
  return HtmlService
    .createTemplateFromFile('index')
    .evaluate()
    .setTitle('Admin — Loja & Agenda Simples');
}

function include(file) {
  return HtmlService
    .createHtmlOutputFromFile(file)
    .getContent();
}

function getMaster_() {
  return SpreadsheetApp.openById(MASTER_SHEET_ID);
}

function gerarSlug(nome) {
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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

function criarCliente(payload) {
  validarPayloadCliente_(payload);

  const tipo = String(payload.tipo).toUpperCase();
  const templateId = tipo === 'LOJA'
    ? TEMPLATE_LOJA_ID
    : TEMPLATE_SERVICO_ID;

  const pastaDestino = DriveApp.getFolderById(PASTA_CLIENTES_ID);
  const arquivoTemplate = DriveApp.getFileById(templateId);

  let slug = gerarSlug(payload.nomeEmpresa);
  slug = garantirSlugUnico_(slug);

  const copia = arquivoTemplate.makeCopy(
    slug + ' - ' + payload.nomeEmpresa,
    pastaDestino
  );

  const novoSheetId = copia.getId();
  const linkApp = APP_CENTRAL_URL + '?cliente=' + encodeURIComponent(slug);

  preencherConfigCliente_(novoSheetId, {
    nomeEmpresa: payload.nomeEmpresa,
    responsavel: payload.responsavel,
    telefone: payload.telefone,
    tipo,
    status: 'ATIVO',
    versao: '1.0.0'
  });

  const vencimento = payload.vencimento
    ? new Date(payload.vencimento)
    : adicionarDias_(new Date(), 30);

  const master = getMaster_();
  const clientes = master.getSheetByName('Clientes');

  clientes.appendRow([
    slug,
    tipo,
    payload.nomeEmpresa,
    payload.responsavel,
    payload.telefone,
    payload.email || '',
    payload.usuario,
    hashSenha(payload.senhaTemporaria),
    'SIM',
    novoSheetId,
    'ATIVO',
    vencimento,
    'BASICO',
    payload.vendedor || '',
    new Date(),
    linkApp
  ]);

  registrarComissao_(slug, payload.vendedor || 'SEM_VENDEDOR');

  return {
    sucesso: true,
    clienteId: slug,
    sheetId: novoSheetId,
    linkApp,
    usuario: payload.usuario,
    senhaTemporaria: payload.senhaTemporaria
  };
}

function validarPayloadCliente_(payload) {
  if (!payload) throw new Error('Dados não informados.');
  if (!payload.nomeEmpresa) throw new Error('Nome da empresa é obrigatório.');
  if (!payload.tipo) throw new Error('Tipo é obrigatório.');
  if (!['LOJA', 'SERVICO'].includes(String(payload.tipo).toUpperCase())) {
    throw new Error('Tipo inválido. Use LOJA ou SERVICO.');
  }
  if (!payload.responsavel) throw new Error('Responsável é obrigatório.');
  if (!payload.telefone) throw new Error('Telefone é obrigatório.');
  if (!payload.usuario) throw new Error('Usuário é obrigatório.');
  if (!payload.senhaTemporaria) throw new Error('Senha temporária é obrigatória.');
}

function garantirSlugUnico_(baseSlug) {
  const master = getMaster_();
  const rows = master.getSheetByName('Clientes').getDataRange().getValues();
  const existentes = rows.slice(1).map(r => String(r[0]));

  let slug = baseSlug || 'cliente';
  let contador = 2;

  while (existentes.includes(slug)) {
    slug = baseSlug + '-' + contador;
    contador++;
  }

  return slug;
}

function preencherConfigCliente_(sheetId, dados) {
  const ss = SpreadsheetApp.openById(sheetId);
  const cfg = ss.getSheetByName('Config');

  if (!cfg) return;

  cfg.clearContents();
  cfg.appendRow(['PARAMETRO', 'VALOR']);
  cfg.appendRow(['NOME_EMPRESA', dados.nomeEmpresa]);
  cfg.appendRow(['RESPONSAVEL', dados.responsavel]);
  cfg.appendRow(['TELEFONE', dados.telefone]);
  cfg.appendRow(['TIPO', dados.tipo]);
  cfg.appendRow(['STATUS_ASSINATURA', dados.status]);
  cfg.appendRow(['VERSAO', dados.versao]);
}

function registrarComissao_(clienteId, vendedor) {
  const master = getMaster_();
  const sheet = master.getSheetByName('Comissoes');

  sheet.appendRow([
    Utilities.getUuid(),
    new Date(),
    clienteId,
    vendedor,
    VALOR_COMISSAO_PADRAO,
    'PENDENTE',
    ''
  ]);
}

function getClientes() {
  const rows = getMaster_()
    .getSheetByName('Clientes')
    .getDataRange()
    .getValues();

  return rows.slice(1).map(r => ({
    id: r[0],
    tipo: r[1],
    nomeEmpresa: r[2],
    responsavel: r[3],
    telefone: r[4],
    usuario: r[6],
    status: r[10],
    vencimento: formatarData_(r[11]),
    vendedor: r[13],
    linkApp: r[15]
  }));
}

function confirmarPagamento(clienteId) {
  const master = getMaster_();
  const clientes = master.getSheetByName('Clientes');
  const rows = clientes.getDataRange().getValues();

  const idx = rows.findIndex(r => String(r[0]) === String(clienteId));
  if (idx < 1) throw new Error('Cliente não encontrado.');

  const novaData = adicionarDias_(new Date(), 30);

  clientes.getRange(idx + 1, 11).setValue('ATIVO'); // STATUS
  clientes.getRange(idx + 1, 12).setValue(novaData); // VENCIMENTO

  const pagamentos = master.getSheetByName('Pagamentos');
  pagamentos.appendRow([
    Utilities.getUuid(),
    new Date(),
    clienteId,
    VALOR_MENSALIDADE_PADRAO,
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/yyyy'),
    'PIX',
    'Confirmado pelo Admin'
  ]);

  liberarComissao_(clienteId);

  return { sucesso: true };
}

function liberarComissao_(clienteId) {
  const sheet = getMaster_().getSheetByName('Comissoes');
  const rows = sheet.getDataRange().getValues();

  rows.forEach((r, i) => {
    if (i === 0) return;
    const mesmoCliente = String(r[2]) === String(clienteId);
    const pendente = String(r[5]) === 'PENDENTE';

    if (mesmoCliente && pendente) {
      sheet.getRange(i + 1, 6).setValue('LIBERADA');
    }
  });
}

function bloquearCliente(clienteId) {
  return atualizarStatusCliente_(clienteId, 'BLOQUEADO');
}

function ativarCliente(clienteId) {
  return atualizarStatusCliente_(clienteId, 'ATIVO');
}

function atualizarStatusCliente_(clienteId, status) {
  const sheet = getMaster_().getSheetByName('Clientes');
  const rows = sheet.getDataRange().getValues();
  const idx = rows.findIndex(r => String(r[0]) === String(clienteId));

  if (idx < 1) throw new Error('Cliente não encontrado.');

  sheet.getRange(idx + 1, 11).setValue(status);

  return { sucesso: true };
}

function processarPagamentosTxt(texto) {
  const linhas = String(texto || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const resultados = [];

  linhas.forEach(clienteId => {
    try {
      confirmarPagamento(clienteId);
      resultados.push({ clienteId, status: 'OK' });
    } catch (e) {
      resultados.push({ clienteId, status: 'ERRO', erro: e.message });
    }
  });

  return resultados;
}

function adicionarDias_(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

function formatarData_(data) {
  if (!data) return '';
  return Utilities.formatDate(new Date(data), Session.getScriptTimeZone(), 'dd/MM/yyyy');
}
