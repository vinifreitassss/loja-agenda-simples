# Template Loja — Abas

Planilha modelo para clientes do tipo `LOJA`.

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

## Produtos

```txt
ID | SKU | CODIGO_BARRAS | Produto | Categoria | Cor | Tamanho | Custo | PrecoVenda | Estoque | EstoqueMin | Ativo | CadastroCompleto
```

Observações:

- `EstoqueMin` padrão: `2`.
- `CadastroCompleto`: `SIM` ou `NAO`, para cadastro rápido feito durante venda.

## Vendas

```txt
ID | Data | Cliente | Telefone | ProdutoID | Quantidade | ValorPago | FormaPagamento | Canal | Entrega | TaxaPagamento | Lucro | ComprovanteEnviado
```

## Clientes

```txt
ID | Nome | Telefone | Cidade | Observacao | DataCriacao
```

## Despesas

```txt
ID | Data | Descricao | Categoria | Valor | Recorrente | Ativa
```

## MovimentacoesEstoque

```txt
ID | Data | ProdutoID | Tipo | Quantidade | OrigemID | Observacao
```

Tipos:

```txt
Venda
Entrada
Ajuste
Devolucao
```

## Caixa

```txt
ID | Data | Abertura | DinheiroContado | Observacao
```

## Fechamentos

```txt
ID | Data | Pix | DinheiroEsperado | DinheiroContado | Debito | Credito | Despesas | TotalEsperado | Diferenca | Observacao
```
