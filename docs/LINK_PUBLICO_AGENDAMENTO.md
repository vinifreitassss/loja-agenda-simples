# Link Público de Agendamento — Agenda Simples

## Ideia

Cada prestador pode divulgar um link para o cliente final marcar horário sozinho.

Exemplo:

```txt
https://script.google.com/macros/s/APP_CENTRAL/exec?agendar=ana-manicure
```

Esse link não exige login do cliente final.

O cliente vê uma tela simples com:

```txt
Nome do prestador/empresa
Serviços disponíveis
Data
Horário
Nome do cliente
WhatsApp
Forma de pagamento
Observação
```

Ao confirmar, o sistema cria um registro na aba `Agenda` da planilha do prestador.

## Fluxo do cliente final

```txt
1. Cliente abre link público
2. Escolhe serviço
3. Escolhe data e horário
4. Digita nome e WhatsApp
5. Escolhe forma de pagamento
6. Se escolher Pix, o sistema mostra a chave Pix do prestador
7. Sistema pede para enviar comprovante no WhatsApp
8. Agendamento entra como Pendente ou Sinal pago
```

## Fluxo do prestador

```txt
1. Prestador recebe aviso pelo WhatsApp ou vê no painel
2. Agendamento aparece na agenda
3. Se pagamento ainda não confirmado, fica vermelho
4. Prestador confere comprovante
5. Prestador clica em Marcar pago
6. Agendamento fica verde
```

## Status visual

```txt
Pendente = vermelho
Pago = verde
Parcial / sinal pago = amarelo
```

## Campos necessários na aba Config do cliente Serviço

Adicionar:

```txt
CHAVE_PIX
NOME_RECEBEDOR_PIX
WHATSAPP_PRESTADOR
ACEITA_AGENDAMENTO_PUBLICO
MENSAGEM_POS_AGENDAMENTO
```

Exemplo:

```txt
CHAVE_PIX | 21999999999
NOME_RECEBEDOR_PIX | Ana Unhas
WHATSAPP_PRESTADOR | 21999999999
ACEITA_AGENDAMENTO_PUBLICO | SIM
```

## Campos usados na aba Agenda

A aba `Agenda` atual já atende ao MVP:

```txt
ID | Data | Hora | Cliente | Telefone | ServicoID | Valor | StatusAtendimento | StatusPagamento | FormaPagamento | Observacao | ComprovanteEnviado
```

Quando o agendamento vem do link público:

```txt
StatusAtendimento = Agendado
StatusPagamento = Pendente
FormaPagamento = Pix/Dinheiro/Cartao/etc.
Observacao = Agendamento feito pelo link público
ComprovanteEnviado = NAO
```

## Aviso ao prestador

No MVP simples, não usar API oficial do WhatsApp.

Usar link `wa.me` com mensagem pronta para o cliente clicar após agendar:

```txt
Olá! Acabei de fazer um agendamento.
Nome: Maria
Serviço: Manicure
Data: 20/06/2026
Hora: 14:00
Pagamento: Pix
```

Isso evita custo e integração complexa.

## Importante

Sem integração de pagamento no MVP.

O sistema apenas mostra a chave Pix e orienta o cliente a enviar o comprovante no WhatsApp.

A confirmação do pagamento continua manual, pelo prestador, clicando em:

```txt
Marcar pago
```

## Benefício comercial

Essa função aumenta muito o valor do produto para prestadores porque transforma o sistema em uma mini página de agendamento.

Promessa comercial:

```txt
Divulgue seu link, receba agendamentos pelo celular e controle quem pagou ou não pagou.
```

## Cuidados

### 1. Evitar conflito de horário

No MVP, antes de salvar o agendamento, verificar se já existe agenda na mesma data e horário.

### 2. Não expor dados internos

O link público deve mostrar apenas:

```txt
Nome do negócio
Serviços ativos
Chave Pix
WhatsApp do prestador
```

Não deve mostrar agenda completa, clientes antigos ou dados financeiros.

### 3. Bloqueio por assinatura

Se o prestador estiver bloqueado ou vencido, o link público também deve ser bloqueado.

### 4. Controle por Config

Se `ACEITA_AGENDAMENTO_PUBLICO` for diferente de `SIM`, mostrar:

```txt
Agendamento online indisponível no momento.
```
