# Como ligar conta, sincronização e cobrança

Sem nenhuma configuração, o Pingou funciona **só no celular** (como hoje). Cada parte abaixo liga sozinha quando as variáveis existem.

## 1. Supabase (conta e sincronização)

1. Crie um projeto em supabase.com (região São Paulo).
2. Em **SQL Editor**, rode `supabase/migrations/0001_inicial.sql` e depois `0002_planos.sql` (ou `supabase db push` com a CLI). A 0002 cria o ciclo mensal/anual da assinatura e a lista de espera da Turma.
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
- "Assinar" cria cliente e assinatura (Pro mensal de R$ 14,90 ou anual de R$ 119) no Asaas e abre a página de pagamento, onde a pessoa escolhe **Pix ou cartão**. O app nunca vê dados de cartão.
- O webhook grava a situação em `subscriptions`; o app recebe na próxima sincronização.
- Pagamento confirmado: plano vale até a véspera do mesmo dia no mês seguinte (no anual, no ano seguinte). Atrasado: 5 dias de tolerância. Cancelado: vale até o último dia pago.
- Pix Automático (débito recorrente autorizado) pode entrar depois, trocando só `lib/cobranca/asaas.ts` (a interface `ProvedorCobranca` não muda).

## 3. Antes de vender

- Preencha empresa, CNPJ, e-mail e encarregado de dados em `apps/web/lib/marca.ts` (`LEGAL`).
- Peça para um advogado revisar Termos e Privacidade.
- Confira os preços sugeridos em `packages/core/src/planos/index.ts`.
- As tabelas de INSS e IRRF estão em `packages/core/src/clt/index.ts`, por ano. Atualize em janeiro.
- A lista de espera da Turma fica na tabela `waitlist` (nome, WhatsApp, tamanho da equipe). Só o servidor grava; consulte pelo painel do Supabase.

## 4. Notificações sem o cron pago da Vercel

- O agendador fica no próprio Supabase (`pg_cron` + `pg_net`, migração `0004_agendador.sql`): a cada 5 minutos ele chama `POST /api/notificacoes/enviar` com o token do Vault.
- Variáveis na Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (secreta) e `CRON_TOKEN` (secreta, o mesmo valor guardado no Vault como `pingou_cron_token`).
- Para gerar chaves novas: `npx web-push generate-vapid-keys`.
- Ver se o agendador está rodando: `select * from cron.job_run_details order by start_time desc limit 5;`
- Ver erros do app: `select * from client_errors order by em desc limit 20;`

## 5. Projeto atual (16/11/2026)

- Supabase: projeto `pingou` (São Paulo), ligado à conta da Vercel.
- Vercel: projeto `pingou`, com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave publicável), `NEXT_PUBLIC_SITE_URL`, as chaves VAPID e `CRON_TOKEN` já configuradas.
- Falta: `SUPABASE_SERVICE_ROLE_KEY` (Supabase, Project Settings, API Keys, chave secreta) na Vercel; o modelo de e-mail com `{{ .Token }}`; a Site URL em Authentication, URL Configuration; e um SMTP próprio (o envio padrão do Supabase manda poucos e-mails por hora).

