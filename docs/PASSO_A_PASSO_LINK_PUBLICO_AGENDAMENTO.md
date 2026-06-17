# Passo a passo — Link Público de Agendamento

Este recurso é para contas do tipo `SERVICO`.

## 1. Arquivos adicionados

No projeto Apps Script do App Central, além de `Code.gs` e `index.html`, agora existe:

```txt
public_agendamento.html
```

## 2. Como funciona

O painel do prestador continua sendo:

```txt
URL_DO_APP_CENTRAL?cliente=ana-manicure
```

O link público de agendamento será:

```txt
URL_DO_APP_CENTRAL?agendar=ana-manicure
```

O cliente final não faz login.

## 3. Configuração na planilha do prestador

Na planilha do cliente tipo `SERVICO`, aba `Config`, adicione estas linhas:

```txt
CHAVE_PIX | sua-chave-pix
NOME_RECEBEDOR_PIX | nome que aparece no Pix
WHATSAPP_PRESTADOR | 21999999999
ACEITA_AGENDAMENTO_PUBLICO | SIM
MENSAGEM_POS_AGENDAMENTO | Obrigado pelo agendamento!
```

Se `ACEITA_AGENDAMENTO_PUBLICO` for diferente de `SIM`, o link público mostra que o agendamento está indisponível.

## 4. Fluxo do cliente final

O cliente abre o link, escolhe:

```txt
Serviço
Data
Hora
Nome
WhatsApp
Forma de pagamento
```

Ao confirmar, o sistema grava uma linha na aba `Agenda`:

```txt
StatusAtendimento = Agendado
StatusPagamento = Pendente
FormaPagamento = Pix/Dinheiro/Cartão
Observacao = Agendamento feito pelo link público
```

## 5. Pix manual

Se a pessoa escolher Pix, a tela mostra:

```txt
Chave Pix
Nome do recebedor
Botão para WhatsApp
```

O cliente deve enviar o comprovante manualmente pelo WhatsApp.

## 6. Prestador confirma pagamento

No painel do prestador:

```txt
URL_DO_APP_CENTRAL?cliente=ana-manicure
```

O agendamento entra como pendente/vermelho.

Depois de conferir o comprovante, o prestador clica:

```txt
Marcar pago
```

## 7. Bloqueio por horário ocupado

Antes de salvar, o sistema verifica se já existe agendamento na mesma data e horário.

Se existir, mostra:

```txt
Este horário não está disponível. Escolha outro horário.
```

## 8. Bloqueio por assinatura

Se a assinatura do prestador estiver vencida, bloqueada ou inativa, o link público também não funciona.

## 9. Deploy

Depois de colar os arquivos no Apps Script:

```txt
Implantar > Gerenciar implantações > Editar > Nova versão > Implantar
```

Não basta salvar; precisa publicar nova versão.
