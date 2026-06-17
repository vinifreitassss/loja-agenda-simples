# CLIENTES_MASTER — Schema

A planilha `CLIENTES_MASTER` é interna. Ela controla clientes, pagamentos, vendedores e comissões.

## Aba: Clientes

Cabeçalho:

```txt
ID_CLIENTE | TIPO | NOME_EMPRESA | RESPONSAVEL | TELEFONE | EMAIL | USUARIO | SENHA_HASH | TROCAR_SENHA | SHEET_ID | STATUS | VENCIMENTO | PLANO | VENDEDOR | DATA_CRIACAO | LINK_APP
```

### Campos

- `ID_CLIENTE`: slug único. Ex: `ana-manicure`.
- `TIPO`: `LOJA` ou `SERVICO`.
- `NOME_EMPRESA`: nome comercial.
- `RESPONSAVEL`: pessoa responsável.
- `TELEFONE`: WhatsApp.
- `EMAIL`: opcional.
- `USUARIO`: login.
- `SENHA_HASH`: senha criptografada/hash.
- `TROCAR_SENHA`: `SIM` ou `NAO`.
- `SHEET_ID`: ID da planilha do cliente.
- `STATUS`: `ATIVO`, `TESTE`, `VENCIDO`, `BLOQUEADO`.
- `VENCIMENTO`: data de vencimento da assinatura.
- `PLANO`: ex. `BASICO`.
- `VENDEDOR`: vendedor responsável.
- `DATA_CRIACAO`: data de criação.
- `LINK_APP`: link final de acesso.

## Aba: Pagamentos

Cabeçalho:

```txt
ID | DATA | CLIENTE_ID | VALOR | MES_REFERENCIA | FORMA | OBSERVACAO
```

## Aba: Vendedores

Cabeçalho:

```txt
ID | NOME | TELEFONE | PIX | ATIVO
```

## Aba: Comissoes

Cabeçalho:

```txt
ID | DATA | CLIENTE_ID | VENDEDOR | VALOR | STATUS | DATA_PAGAMENTO
```

### Regras de comissão

- Valor padrão: R$15 por cliente ativado e pago.
- Comissão criada como `PENDENTE` ao gerar cliente.
- Comissão liberada quando pagamento é confirmado.

## Aba: Config

Cabeçalho:

```txt
PARAMETRO | VALOR
```

Parâmetros sugeridos:

```txt
APP_CENTRAL_URL
TEMPLATE_LOJA_ID
TEMPLATE_SERVICO_ID
PASTA_CLIENTES_ID
VALOR_MENSALIDADE
VALOR_COMISSAO
```
