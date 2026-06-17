# Resultado e Lucro

Este modulo mostra o resultado operacional do cliente.

Promessa:

Saber quanto vendeu, quanto gastou e quanto sobrou.

## Arquivos

Crie no Apps Script um novo arquivo chamado:

financeiro.gs

Cole nele o conteudo de:

apps-script/central/financeiro.gs

Depois substitua tambem o arquivo:

index.html

pela nova versao do GitHub.

## Aba Resultado

A nova tela mostra:

- Receita
- Lucro liquido
- Margem liquida
- Ticket medio
- DRE simples
- Ranking de produtos ou servicos mais lucrativos
- Entradas por forma de pagamento

## Loja

Calculo usado:

Receita bruta = soma das vendas
CMV = custo do produto x quantidade vendida
Taxas = taxas de pagamento
Lucro bruto = receita bruta - CMV - taxas
Lucro liquido = lucro bruto - despesas

Para funcionar bem, cada produto precisa ter custo cadastrado.

## Servico

Calculo usado:

Receita recebida = atendimentos pagos
Receita pendente = atendimentos nao pagos
Custo dos servicos = custo cadastrado no servico
Lucro bruto = receita recebida - custo dos servicos
Lucro liquido = lucro bruto - despesas

Para funcionar bem, cada servico pode ter um custo cadastrado.

## Venda comercial

Nao vender como contabilidade fiscal.

Vender como controle financeiro simples, resultado operacional e lucro estimado.

Frase comercial:

Nao e so agenda ou estoque. E para saber se o negocio realmente esta dando lucro.
