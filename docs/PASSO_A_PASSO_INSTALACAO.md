# Passo a passo — deixar o Admin funcionando

Este guia liga as planilhas do Google Drive ao Apps Script Admin.

## Visão geral

Você precisa ter no Google Drive:

```txt
CLIENTES_MASTER
TEMPLATE_LOJA
TEMPLATE_SERVICO
CLIENTES_LOJA_AGENDA_SIMPLES
```

Onde:

- `CLIENTES_MASTER` controla clientes, pagamentos, vendedores e comissões.
- `TEMPLATE_LOJA` será copiada quando criar um cliente tipo loja.
- `TEMPLATE_SERVICO` será copiada quando criar um cliente tipo prestador.
- `CLIENTES_LOJA_AGENDA_SIMPLES` é a pasta onde as planilhas criadas dos clientes ficarão guardadas.

## Etapa 1 — Converter XLSX para Google Sheets

Se os arquivos foram enviados como `.xlsx`, abra cada um no Google Sheets e salve como planilha Google.

Faça isso para:

```txt
CLIENTES_MASTER.xlsx
TEMPLATE_LOJA.xlsx
TEMPLATE_SERVICO.xlsx
```

O Apps Script deve usar os arquivos como Google Sheets, não como Excel puro.

## Etapa 2 — Pegar os IDs

Abra cada planilha e copie o ID da URL.

Exemplo:

```txt
https://docs.google.com/spreadsheets/d/1ABCDEF123456789/edit#gid=0
```

O ID é:

```txt
1ABCDEF123456789
```

Você precisa de:

```txt
MASTER_SHEET_ID
TEMPLATE_LOJA_ID
TEMPLATE_SERVICO_ID
```

Depois abra a pasta `CLIENTES_LOJA_AGENDA_SIMPLES` e copie o ID da pasta.

Exemplo:

```txt
https://drive.google.com/drive/folders/1PASTA123456
```

O ID é:

```txt
1PASTA123456
```

Esse será:

```txt
PASTA_CLIENTES_ID
```

## Etapa 3 — Criar o projeto Apps Script Admin

1. Acesse `script.google.com`.
2. Clique em `Novo projeto`.
3. Renomeie para:

```txt
Admin Loja Agenda Simples
```

4. No arquivo `Code.gs`, cole o conteúdo de:

```txt
apps-script/admin/Code.gs
```

5. Crie um arquivo HTML chamado:

```txt
index
```

6. Cole nele o conteúdo de:

```txt
apps-script/admin/index.html
```

## Etapa 4 — Preencher os IDs no Code.gs

No topo do `Code.gs`, troque:

```javascript
const MASTER_SHEET_ID = 'COLE_AQUI_ID_CLIENTES_MASTER';
const TEMPLATE_LOJA_ID = 'COLE_AQUI_ID_TEMPLATE_LOJA';
const TEMPLATE_SERVICO_ID = 'COLE_AQUI_ID_TEMPLATE_SERVICO';
const PASTA_CLIENTES_ID = 'COLE_AQUI_ID_PASTA_CLIENTES';
const APP_CENTRAL_URL = 'COLE_AQUI_URL_DO_APP_CENTRAL';
```

Por seus IDs reais.

Como ainda não temos o App Central publicado, use temporariamente:

```javascript
const APP_CENTRAL_URL = 'APP_CENTRAL_AINDA_NAO_PUBLICADO';
```

Depois vamos trocar pela URL real do app do cliente.

## Etapa 5 — Publicar o Admin

No Apps Script:

1. Clique em `Implantar`.
2. Clique em `Nova implantação`.
3. Tipo: `App da Web`.
4. Descrição: `Admin MVP`.
5. Executar como: `Eu`.
6. Quem tem acesso: inicialmente `Somente eu`.
7. Clique em `Implantar`.
8. Autorize as permissões solicitadas.
9. Copie a URL do Web App.

Essa URL é o seu painel Admin.

## Etapa 6 — Testar o Admin

Abra a URL do Admin.

Preencha:

```txt
Nome da loja/negócio
Tipo: LOJA ou SERVICO
Responsável
Telefone
Usuário
Senha temporária
Vendedor
Vencimento
```

Clique em:

```txt
Gerar sistema do cliente
```

O sistema deve:

1. Copiar a planilha template correta.
2. Criar uma nova planilha dentro da pasta de clientes.
3. Preencher a aba `Config` da planilha nova.
4. Registrar o cliente na `CLIENTES_MASTER`.
5. Criar comissão pendente de R$15.
6. Mostrar um link do app.

## Etapa 7 — Conferir se funcionou

Confira:

1. A pasta `CLIENTES_LOJA_AGENDA_SIMPLES` recebeu uma nova planilha.
2. A `CLIENTES_MASTER`, aba `Clientes`, recebeu uma nova linha.
3. A aba `Comissoes` recebeu uma comissão de R$15 como `PENDENTE`.

## Etapa 8 — Confirmar pagamento

No Admin, clique em:

```txt
Pago
```

Isso deve:

1. Atualizar o status do cliente para `ATIVO`.
2. Atualizar o vencimento para +30 dias.
3. Registrar um pagamento na aba `Pagamentos`.
4. Liberar a comissão do vendedor.

## Observação importante

Nesse estágio, o Admin cria a planilha e registra o cliente, mas o link final do sistema do cliente só funcionará depois que criarmos/publicarmos o App Central.

Ordem correta:

```txt
1. Admin funcionando
2. Gerar clientes/planilhas
3. Criar App Central
4. Colocar URL do App Central no Code.gs
5. Redeploy do Admin
```
