# Passo a passo — Caixa e comprovantes

Este bloco adiciona duas funções ao App Central:

```txt
Caixa diário
Comprovantes por WhatsApp
```

## 1. Arquivos atualizados

No projeto Apps Script do App Central, substitua:

```txt
Code.gs
index.html
```

pelas versões novas do GitHub.

Depois faça nova implantação:

```txt
Implantar > Gerenciar implantações > Editar > Nova versão > Implantar
```

## 2. Caixa diário

A nova aba `Caixa` aparece no menu do cliente.

Ela mostra:

```txt
Pix
Dinheiro
Débito
Crédito
Despesas do dia
Total esperado
Dinheiro esperado
Pendências
Quantidade de registros
```

### Loja

O caixa soma as vendas da aba `Vendas` na data escolhida.

### Serviço

O caixa soma os atendimentos da aba `Agenda` na data escolhida, mas considera como entrada apenas os que estão com:

```txt
StatusPagamento = Pago
```

Os demais entram como pendência.

## 3. Fechamento

O usuário informa:

```txt
Dinheiro contado
Observação
```

O sistema salva na aba `Fechamentos`:

```txt
ID
Data
Pix
DinheiroEsperado
DinheiroContado
Debito
Credito
Despesas
TotalEsperado
Diferenca
Observacao
```

## 4. Limitação do MVP

Como a aba `Despesas` ainda não tem `FormaPagamento`, o sistema desconta todas as despesas do dinheiro esperado.

Isso é simples e funcional para MVP.

Depois podemos evoluir a aba `Despesas` para ter:

```txt
FormaPagamento
```

## 5. Comprovantes por WhatsApp

### Loja

Na lista de vendas aparece um botão:

```txt
WhatsApp
```

Ele gera uma mensagem com:

```txt
Nome da loja
Data
Cliente
Produto
Quantidade
Valor
Forma de pagamento
```

### Serviço

Na agenda aparece um botão:

```txt
Comprovante
```

Ele gera uma mensagem com:

```txt
Nome do prestador
Data
Hora
Cliente
Serviço
Valor
Status do pagamento
```

## 6. Sem API paga

O sistema não envia WhatsApp automaticamente.

Ele abre o link `wa.me` com a mensagem pronta.

O usuário revisa e envia manualmente.
