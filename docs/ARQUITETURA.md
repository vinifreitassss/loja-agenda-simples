# Arquitetura MVP

## Objetivo

Criar um produto simples, escalável o suficiente para validação comercial local e com baixa manutenção.

## Decisão principal

Não usar Supabase, Lovable ou Stripe no MVP.

Usar:

```txt
GitHub -> código
Google Drive -> templates de planilha
Google Sheets -> banco por cliente
Google Apps Script -> app/admin/instalador
Pix manual -> cobrança inicial
```

## Componentes

### 1. App Central

É o sistema usado pelo cliente.

O link recebe um cliente:

```txt
/app?cliente=loja-maria
/app?cliente=ana-manicure
```

O app consulta a planilha `CLIENTES_MASTER`, encontra o `SHEET_ID` do cliente e abre a planilha correta.

### 2. Admin

É o painel interno do operador.

Funções:

- Ver clientes.
- Gerar novo cliente.
- Confirmar pagamento.
- Bloquear/desbloquear acesso.
- Ver comissões de vendedores.

### 3. Planilha Master

Controla clientes, pagamentos, vendedores e comissões.

### 4. Template Loja

Planilha base para lojistas.

### 5. Template Serviço

Planilha base para prestadores.

## Modelo recomendado para 300 clientes

Não criar 300 apps diferentes.

Criar:

```txt
1 app central
1 app admin
1 planilha master
300 planilhas de clientes
```

Assim o código é único e os dados ficam isolados por cliente.

## Segurança básica

- Cliente acessa apenas o Web App.
- Cliente não recebe acesso direto à planilha.
- Login simples com usuário/senha.
- Senha deve ser armazenada como hash, não texto puro.
- Primeiro acesso força troca de senha.

## Cobrança manual

No MVP:

- Pix manual.
- Operador confirma pagamento no Admin.
- Admin atualiza vencimento +30 dias.
- App bloqueia cliente vencido/bloqueado.

## Sem customização

Regra comercial:

> O sistema é padrão. Melhorias entram apenas se fizerem sentido para todos.

Isso preserva margem e reduz suporte.
