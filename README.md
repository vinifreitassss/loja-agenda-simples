# Loja & Agenda Simples

Sistema simples para microlojistas e prestadores de serviço que vendem/atendem por Instagram, WhatsApp e bairro.

## Proposta

Dois produtos com a mesma base operacional:

- **Loja Simples**: vendas, produtos, estoque, despesas, caixa, DRE simples, comprovante WhatsApp e planejamento de compras.
- **Agenda Simples**: agenda, serviços, clientes, pagamentos, despesas, caixa, comprovante/cobrança WhatsApp e relatórios simples.

## Arquitetura MVP

- **GitHub**: código-fonte e documentação.
- **Google Drive**: planilhas template (`TEMPLATE_LOJA` e `TEMPLATE_SERVICO`).
- **Google Sheets**: banco de dados individual de cada cliente.
- **Google Apps Script**: app central, app admin e instalador.
- **Planilha Master**: controle de clientes, pagamentos, vendedores e comissões.

## Estratégia

MVP sem Supabase, sem Lovable e sem Stripe.

- Pagamento manual via Pix.
- Bloqueio/ativação por status na planilha Master.
- Uma planilha por cliente.
- Um app central por tipo ou um app central que alterna por `tipo`.
- Sem customização por cliente.

## Estrutura do repositório

```txt
apps-script/
  admin/
    Code.gs
    index.html
  central/
    Code.gs
    index.html
    app.html
    styles.html
docs/
  ARQUITETURA.md
  MASTER_SCHEMA.md
  TEMPLATE_LOJA.md
  TEMPLATE_SERVICO.md
```

## Próximo passo

1. Criar a planilha `CLIENTES_MASTER` no Google Sheets.
2. Criar as planilhas `TEMPLATE_LOJA` e `TEMPLATE_SERVICO` no Drive.
3. Preencher os IDs no `apps-script/admin/Code.gs`.
4. Publicar o Admin como Web App.
5. Usar o Admin para gerar novos clientes.
