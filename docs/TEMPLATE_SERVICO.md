# Template Serviço — Abas

Planilha modelo para clientes do tipo `SERVICO`.

## Config

```txt
PARAMETRO | VALOR
```

Parâmetros:

```txt
NOME_EMPRESA
RESPONSAVEL
TELEFONE
INSTAGRAM
TIPO
STATUS_ASSINATURA
VERSAO
```

## Servicos

```txt
ID | Nome | Categoria | DuracaoMinutos | Preco | Custo | Ativo
```

Exemplos:

```txt
Design de Sobrancelha | Estética | 40 | 45 | 0 | TRUE
Manicure | Unhas | 60 | 35 | 5 | TRUE
Sessão Personal | Fitness | 60 | 80 | 0 | TRUE
```

## Agenda

```txt
ID | Data | Hora | Cliente | Telefone | ServicoID | Valor | StatusAtendimento | StatusPagamento | FormaPagamento | Observacao | ComprovanteEnviado
```

StatusAtendimento:

```txt
Agendado
Realizado
Cancelado
Faltou
```

StatusPagamento:

```txt
Pago
Pendente
Parcial
Sinal pago
```

## Clientes

```txt
ID | Nome | Telefone | Observacao | DataCriacao
```

## Pagamentos

```txt
ID | Data | AgendaID | Cliente | Telefone | Valor | FormaPagamento | Status | Observacao
```

## Despesas

```txt
ID | Data | Descricao | Categoria | Valor | Recorrente | Ativa
```

## Caixa

```txt
ID | Data | Abertura | DinheiroContado | Observacao
```

## Fechamentos

```txt
ID | Data | Pix | DinheiroEsperado | DinheiroContado | Debito | Credito | Despesas | TotalEsperado | Diferenca | Observacao
```

## Observação visual da agenda

- Verde: pago.
- Vermelho: pendente.
- Amarelo: parcial/sinal.

Cada agendamento deve ter atalhos WhatsApp:

- Confirmar horário.
- Cobrar pagamento.
- Enviar comprovante.
