# E-mails do login (Supabase)

Supabase → Authentication → Emails → Templates. Em cada modelo, cole o assunto e troque o corpo (aba "Source") pelo arquivo.

| Modelo no Supabase | Assunto | Arquivo |
|---|---|---|
| Magic Link | Seu código para entrar no Pingou | `entrar-magic-link.html` |
| Confirm signup | Confirme seu e-mail no Pingou | `confirmar-cadastro.html` |
| Change Email Address | Confirme seu novo e-mail no Pingou | `trocar-email.html` |

O código (`{{ .Token }}`) é o principal: o app pede o código. O botão (`{{ .ConfirmationURL }}`) é o atalho para quem abre o e-mail no mesmo celular.
O logo é feito só com HTML (quadrado verde com a letra P), sem imagem: nenhum app de e-mail bloqueia.
