# Passo a passo — App Central

O App Central é o sistema usado pelo cliente final.

Ele faz:

```txt
login do cliente
validação de assinatura
força troca de senha no primeiro acesso
lê a planilha correta do cliente
mostra tela Loja ou Serviço
```

## Etapa 1 — Criar novo projeto Apps Script

1. Acesse `script.google.com`.
2. Clique em `Novo projeto`.
3. Renomeie para:

```txt
App Central Loja Agenda Simples
```

## Etapa 2 — Colar o backend

No arquivo `Code.gs`, apague tudo e cole o conteúdo de:

```txt
apps-script/central/Code.gs
```

## Etapa 3 — Colar o frontend

1. Crie um arquivo HTML chamado:

```txt
index
```

2. Cole nele o conteúdo de:

```txt
apps-script/central/index.html
```

## Etapa 4 — Preencher MASTER_SHEET_ID

No topo do `Code.gs`, troque:

```javascript
const MASTER_SHEET_ID = 'COLE_AQUI_ID_CLIENTES_MASTER';
```

pelo ID real da sua planilha:

```txt
CLIENTES_MASTER
```

## Etapa 5 — Publicar como Web App

1. Clique em `Implantar`.
2. Clique em `Nova implantação`.
3. Tipo: `App da Web`.
4. Descrição: `App Central MVP`.
5. Executar como: `Eu`.
6. Quem tem acesso: `Qualquer pessoa com o link`.
7. Clique em `Implantar`.
8. Autorize as permissões.
9. Copie a URL gerada.

Essa URL será usada no Admin como:

```javascript
const APP_CENTRAL_URL = 'URL_DO_APP_CENTRAL';
```

## Etapa 6 — Atualizar o Admin

Volte no projeto Apps Script do Admin.

No `Code.gs`, troque:

```javascript
const APP_CENTRAL_URL = 'APP_CENTRAL_AINDA_NAO_PUBLICADO';
```

pela URL real do App Central.

Depois clique em:

```txt
Implantar > Gerenciar implantações > Editar > Nova versão > Implantar
```

## Etapa 7 — Criar cliente teste

No Admin, crie um cliente novo.

O link gerado deve ficar assim:

```txt
https://script.google.com/macros/s/APP_CENTRAL/exec?cliente=loja-teste
```

Abra o link.

Entre com:

```txt
usuário criado no Admin
senha temporária criada no Admin
```

No primeiro acesso, o sistema deve pedir troca de senha.

## Etapa 8 — O que já funciona

Nesta primeira versão, o App Central já faz:

```txt
login
sessão temporária de 6 horas
troca de senha no primeiro acesso
bloqueio por status/vencimento
leitura dos cards iniciais
identificação Loja/Serviço
agenda de hoje para Serviço
estoque crítico para Loja
atalho WhatsApp na agenda
```

## Etapa 9 — Próximos módulos

Depois de validar o login e o acesso, implementar:

### Loja

```txt
Produtos
Vendas
Despesas
Caixa
Comprovante WhatsApp
Planejamento de compras
```

### Serviço

```txt
Serviços
Agenda completa
Pagamentos
Despesas
Caixa
Cobrança WhatsApp
```
