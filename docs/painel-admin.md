# Painel de administrador — plano tela por tela

Data: 17/11/2026. Endereço: `/admin`. Feito para o computador, funciona no celular.

## Regras que valem para todas as telas

1. **Só você entra.** O acesso exige login no Pingou com um e-mail da lista `ADMIN_EMAILS` (variável na Vercel). Cada pedido ao servidor confere isso de novo; esconder o link não é a proteção.
2. **Números e dados da conta, nunca o ponto.** O painel mostra e-mail, datas, plano e contagens (por exemplo "42 dias registrados"). Horários, salário e produção de cada pessoa não aparecem. A única exceção é quando a própria pessoa manda junto num pedido de suporte (ver tela 5).
3. **Toda ação fica registrada.** Dar cortesia, apagar conta e responder suporte gravam quem fez, quando e o quê (tabela `admin_audit`).
4. **O funil é seu.** Os cliques que o app já mede passam a ser gravados no seu banco, sem e-mail nem nome, só o evento e um identificador aleatório do aparelho.

## Navegação

```
┌──────────────┬──────────────────────────────────────────────┐
│ Pingou admin │  título da tela                    [Sair]    │
│              │                                              │
│ Visão geral  │                                              │
│ Funil        │                                              │
│ Pessoas      │                 conteúdo                     │
│ Assinaturas  │                                              │
│ Suporte  (3) │                                              │
│ Lista espera │                                              │
│ Saúde        │                                              │
└──────────────┴──────────────────────────────────────────────┘
```
No celular, o menu vira uma linha de abas no topo.

---

## 1. Visão geral — "Como o Pingou está hoje?"

```
┌ Contas ────────┐┌ Ativas 7 dias ─┐┌ Assinantes ────┐┌ Receita/mês ───┐
│ 1.240          ││ 612            ││ 48             ││ R$ 610,20      │
│ +86 na semana  ││ 49% das contas ││ 6 anuais       ││ anual ÷ 12     │
└────────────────┘└────────────────┘└────────────────┘└────────────────┘
Contas novas por dia (30 dias)        Teste → pago
▁▂▂▃▅▃▂▄▆▅▃▂▃▅▇▅▄▃▅▆▇▆▅▄▆▇█▆▅▆        14 de 210 que terminaram o teste (6,7%)
Precisa de atenção:  3 pedidos de suporte abertos · 2 assinaturas atrasadas · 12 erros hoje
```
- **Contas:** total e novas nos últimos 7 dias.
- **Ativas:** contas que sincronizaram nos últimos 7 e 30 dias.
- **Assinantes:** Pro ativo (pago ou cortesia, separado), quantos anuais.
- **Receita do mês:** soma das mensalidades + anuidades ÷ 12. Cortesia não entra.
- **Teste → pago:** das contas que passaram dos 14 dias de teste, quantas assinaram.
- **Precisa de atenção:** atalhos para suporte aberto, assinaturas atrasadas e erros.

## 2. Funil — "Onde as pessoas desistem?"

```
Período: [7 dias ▾]   Origem: [todas ▾]  (site, calculadora, indicação)

Visitou a página de vendas   3.410  ████████████████████
Tocou em Começar               820  █████                24%
Terminou o começo              610  ████                 74%
Bateu o 1º ponto               540  ███                  89%
Criou conta                    190  █                    35%
Abriu Planos                   120  █                    63%
Assinou                         14                       12%

De onde vêm os cliques em Começar:  abertura 41% · calculadora 22% · barra fixa 18% · planos 9% …
Ofertas do Pro mais tocadas:        conferir 31 · teste acabando 22 · histórico 9
```
- Barras com o número e a passagem de uma etapa para a outra.
- Filtro por período e por origem (`?origem=indicacao`, calculadoras, página inicial).
- Onde cada botão foi tocado (os `secao` que o app já manda).

## 3. Pessoas — "Quem é essa pessoa e o que ela tem?"

Lista:
```
[ buscar por e-mail ...........]   Filtro: [todas ▾] (ativas, em teste, Pro, sem uso há 30 dias)

E-mail                 Criada     Último uso   Situação        Avisos
jose@gmail.com         02/11      hoje         Pro mensal      ligado
ana@hotmail.com        28/10      há 3 dias    Teste (5 dias)  —
```
Detalhe (abre ao lado):
```
jose@gmail.com
Criada em 02/11/2026 · último uso hoje 14:02 · 2 aparelhos com aviso
Plano: Pro mensal, pago até 02/12 (Asaas ↗)
Uso: 15 dias registrados · 2 períodos · área Construção · por hora
[Dar Pro de cortesia ▾ 30 dias]  [Apagar conta e dados]
Histórico de ações: 05/11 você deu 30 dias de cortesia
```
- **Dar Pro de cortesia** (7, 30, 90 dias ou até uma data): cria a assinatura com provedor "cortesia". O app já lê isso e libera o Pro. Bom para beta testers e para quem indicar.
- **Apagar conta** (pedido de LGPD): pede para digitar o e-mail para confirmar; apaga os dados e o login.
- Mostra **contagens**, nunca os horários.

## 4. Assinaturas — "Quem paga e quem está atrasado?"

```
[Ativas] [Atrasadas 2] [Canceladas] [Cortesia]          Receita/mês: R$ 610,20

E-mail             Plano   Ciclo   Situação    Pago até   Valor     Asaas
jose@gmail.com     Pro     mensal  ativa       02/12      14,90     ↗
maria@gmail.com    Pro     anual   ativa       15/10/27   119,00    ↗
```
- Abas por situação, receita no topo, link para a assinatura no Asaas.
- Atrasadas mostram os dias de tolerância que faltam.

## 5. Suporte — "Como ajudo sem ver o ponto da pessoa?"

**No app (Conta → Falar com o suporte):**
```
O que aconteceu?  [ texto ............................ ]
Como falamos com você?  (•) e-mail da conta  ( ) WhatsApp [ ....... ]
[x] Mandar informações técnicas (versão, aparelho, plano, sincronização, últimos erros)
[ ] Mandar meus registros deste período para o suporte conferir
    Só com a sua autorização. Ficam guardados 30 dias e depois são apagados.
[Enviar]
```
**No painel:**
```
Abertos (3)  Respondidos  Fechados

#14  ana@hotmail.com · há 2 h · "O valor da hora extra não bateu"
     Técnico: app de 17/11, Android/Chrome, Pro em teste, sincronizou há 5 min, 0 erros
     Registros anexados: sim, período 21/10 a 20/11 (apaga em 17/12) [ver]
     Contato: WhatsApp (11) 9xxxx  [copiar]
     [Marcar como respondido] [Fechar]
```
- A pessoa decide o que manda. Por padrão vai só o técnico; os registros são opcionais e somem em 30 dias.
- Para a maioria dos casos (não sincroniza, não chegou o código, cobrança), o técnico basta.
- Para "a conta não bateu", com os registros anexados você vê a mesma conta que a pessoa vê, linha por linha.

## 6. Lista de espera — "Quantos querem a Turma?"

```
57 pessoas · 312 trabalhadores somados              [Baixar planilha]
Nome      WhatsApp        Pessoas   Origem   Quando
Carlos    (11) 9xxxx      8         site     16/11
```

## 7. Saúde — "Está tudo funcionando?"

```
Erros do app (7 dias)            Notificações              Agendador
"Failed to fetch" ×18 · Android  enviadas hoje: 41         rodou há 3 min ✓
"Quota exceeded"   ×2 · iPhone   removidas (aparelho        limpeza: hoje 03:15 ✓
                                  desinstalado): 3
```
- Erros agrupados pela mensagem, com contagem, aparelho e a tela onde aconteceu.
- Envio de notificações por dia e as últimas rodadas do agendador e da limpeza.

---

## Ordem de construção

1. Banco (migração 0006): eventos do funil, pedidos de suporte, registro de ações e funções de resumo.
2. Acesso: `ADMIN_EMAILS` + conferência em cada rota `/api/admin/*`.
3. Telas na ordem: Visão geral → Pessoas → Assinaturas → Suporte (com o formulário no app) → Funil → Lista de espera → Saúde.
4. Testes de acesso (quem não é admin recebe 403) e de cada tela com dados de exemplo.
