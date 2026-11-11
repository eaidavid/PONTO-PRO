# Como ligar conta, sincronização e cobrança

Sem nenhuma configuração, o Pingou funciona **só no celular** (como hoje). Cada parte abaixo liga sozinha quando as variáveis existem.

## 1. Supabase (conta e sincronização)

1. Crie um projeto em supabase.com (região São Paulo).
2. Em **SQL Editor**, rode `supabase/migrations/0001_inicial.sql` (ou `supabase db push` com a CLI).
3. **Authentication → Providers**:
   - **Email**: ligado, com "Email OTP" (código de 6 números). Em *Email Templates → Magic Link*, use `{{ .Token }}` no texto para mandar o código.
   - **Phone**: ligue e configure um provedor de SMS (Twilio, MessageBird ou Vonage). Sem ele, só o login por e-mail funciona.
4. Na Vercel (Settings → Environment Variables), adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
   - `SUPABASE_SERVICE_ROLE_KEY` (**secreta**; só o servidor usa, para gravar a assinatura).

Como funciona:
- Tudo é salvo primeiro no celular. A fila envia ao abrir o app, ao voltar a internet, a cada minuto e 3 s depois de salvar.
- Conflito: vence a edição mais recente (gatilho `manter_mais_recente` no Postgres); a versão anterior vai para `audit_log`.
- RLS: cada pessoa só lê e grava as próprias linhas. A tabela `subscriptions` só é gravada pelo servidor.
- "Apagar todos os meus dados" chama `apagar_meus_dados()` (LGPD).

## 2. Asaas (cobrança)

1. Crie a conta no Asaas (comece pelo **sandbox**: sandbox.asaas.com).
2. Variáveis na Vercel:
   - `ASAAS_API_KEY` (**secreta**)
   - `ASAAS_API_URL` = `https://api-sandbox.asaas.com/v3` (teste) ou `https://api.asaas.com/v3` (produção)
   - `ASAAS_WEBHOOK_TOKEN` (**secreta**; invente um texto longo)
3. No Asaas, em **Integrações → Webhooks**, crie um webhook:
   - URL: `https://SEU-DOMINIO/api/webhooks/asaas`
   - Token de autenticação: o mesmo de `ASAAS_WEBHOOK_TOKEN`
   - Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`, `SUBSCRIPTION_INACTIVATED`

Como funciona:
- "Assinar" cria cliente e assinatura mensal no Asaas e abre a página de pagamento, onde a pessoa escolhe **Pix ou cartão**. O app nunca vê dados de cartão.
- O webhook grava a situação em `subscriptions`; o app recebe na próxima sincronização.
- Pagamento confirmado: plano vale até a véspera do mesmo dia no mês seguinte. Atrasado: 5 dias de tolerância. Cancelado: vale até o último dia pago.
- Pix Automático (débito recorrente autorizado) pode entrar depois, trocando só `lib/cobranca/asaas.ts` (a interface `ProvedorCobranca` não muda).

## 3. Antes de vender

- Preencha empresa, CNPJ, e-mail e encarregado de dados em `apps/web/lib/marca.ts` (`LEGAL`).
- Peça para um advogado revisar Termos e Privacidade.
- Confira os preços sugeridos em `packages/core/src/planos/index.ts`.
- As tabelas de INSS e IRRF estão em `packages/core/src/clt/index.ts`, por ano. Atualize em janeiro.
