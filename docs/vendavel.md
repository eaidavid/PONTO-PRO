# Pingou — o que falta para ser vendável

Data: 11/11/2026. Fontes:
- **Impeccable** (pbakaus/impeccable, lido no GitHub; o site impeccable.style não abriu daqui);
- **frontend-design** (plugin oficial da Anthropic, SKILL.md lido);
- **Claude Cookbooks**, "Prompting for frontend aesthetics" (aplicado antes, revisado aqui);
- auditoria do próprio app (telas, código e testes).

Severidade: **P0** impede vender · **P1** derruba conversão ou retenção · **P2** acabamento.

---

## 1. Produto e negócio (o que falta para cobrar)

| # | Falta | Sev. | Por quê |
|---|---|---|---|
| 1 | **Conta e sincronização** (login por telefone e Supabase) | P0 | Hoje os dados ficam só no celular. Trocar de aparelho ou limpar o navegador apaga tudo. Ninguém paga por algo que pode sumir |
| 2 | **Cobrança**: planos, 14 dias grátis e Pix Automático/cartão (Asaas) | P0 | Sem isso, não há receita |
| 3 | **Termos de uso e Política de privacidade (LGPD)**, com aceite no início | P0 | Obrigatório para cobrar e para publicar na Play Store. Já existe "baixar" e "apagar" dados; faltam os textos e o aceite |
| 4 | **Marca registrada e domínio** (INPI classe 9, domínio .com.br ou .app) | P0 | "Pingou" ainda não está protegido |
| 5 | **Regras de salário CLT completas**: tabela progressiva do INSS (hoje 9% fixo), IRRF, folga remunerada (DSR) sobre hora extra, vale-transporte de 6% | P0 para quem é CLT | O app se posiciona em salário e CLT. Sem isso, o "Conferir pagamento" aponta diferenças falsas e a confiança cai. Exige atualização anual das tabelas |
| 6 | ~~**Página de vendas**~~ **Feito**: fica em `/`, com demonstração do ponto, preços e "Começar grátis". Quem já usa o app vê o botão "Abrir o app" | P1 | O endereço caía direto no app. Quem chegava por indicação ou anúncio não entendia o que era |
| 7 | **Play Store** (PWA empacotado como app Android, TWA) | P1 | O público procura app na loja, não no navegador. Estar na loja passa confiança |
| 8 | **Notificações**: "Bateu a saída?" e "Pingou! Seu salário cai hoje" | P1 | É o maior motivo para voltar ao app todo dia. No Android, o PWA já aceita notificação |
| 9 | **Medição**: funil do onboarding, 1º ponto batido, uso no 7º e no 30º dia, mais monitor de erros | P1 | Sem números, não dá para saber o que vende nem o que trava |
| 10 | **PDF de verdade** (contracheque e histórico gerados no app) | P1 | A impressão do navegador no celular é confusa para o público |
| 11 | **Suporte por WhatsApp e perguntas frequentes** | P1 | O público resolve tudo no WhatsApp |
| 12 | **Plano Equipe** (empreiteiro: convite, aprovação, folha) | P1 | É a venda de ticket mais alto. Depende do item 1 |

## 2. Design: o que os guias apontam no Pingou

### 2.1 Impeccable (modo "Operate": app de uso diário pede precisão e contenção)

| # | Achado no app | Regra | Sev. | Correção |
|---|---|---|---|---|
| D1 | `.cartao` = borda de 1px **e** sombra larga em tudo | "Ghost card": escolher borda **ou** sombra; "cards são o contêiner preguiçoso" | P1 | Listas sem cartão; sombra só no que é tocável e flutua (botão de ponto e painéis) |
| D2 | Faixa colorida à esquerda (`border-l-4`) em Banner, lembretes, pendências e no dia de hoje | Bordas laterais coloridas acima de 1px são proibidas | P1 | Fundo tingido com ícone, ou um ponto colorido |
| D3 | Grade de planta baixa no fundo verde (`linear-gradient` nos dois eixos) | Grade de fundo é decoração listada | P2 | Tirar a grade e manter só a luz no canto |
| D4 | Faixa de segurança com `repeating-linear-gradient` | Listras repetidas são decoração listada | P2 | **Manter**: aqui ela carrega significado (hora extra), o que o próprio guia aceita. Mas só em um lugar: a etiqueta do saldo |
| D5 | Mesma entrada animada (sobe e aparece) em toda seção de toda tela | "Uma entrada idêntica em toda seção" é proibido | P2 | Animação só na Hoje e ao confirmar ações |
| D6 | "Reduzir movimento" zera **todas** as animações, inclusive o check do ponto e a barra do toast | Não matar o feedback útil | P1 | Manter o check e a barra (sem deslocamento); cortar só os movimentos |
| D7 | Frases com ponto no meio por toda parte ("2h39 de 9h · sai às 17:02") | Moldura de template | P2 | Separar em duas linhas ou trocar por palavras ("e", vírgula) |
| D8 | Rótulo pequeno acima do número ("Vai pingar", "Contracheque estimado") | O "eyebrow" é proibido sem exceção | P2 | O rótulo vira parte da frase: "R$ 5.124,44 vai pingar em 05/12" |
| D9 | Espaço igual entre tudo (`gap-4`) | Apertado dentro do grupo, folgado entre grupos | P1 | Escala 4/8/12/24/40 com uso definido |
| D10 | Seleção de texto, cursor e barras de rolagem no padrão do navegador | "O sinal mais barato de algo montado, não construído" | P3 | Pintar a seleção e o cursor com a cor da marca |
| D11 | Texto secundário em cinza neutro | Tingir o secundário com a cor da superfície | P3 | Puxar o cinza para o verde |

### 2.2 frontend-design (Anthropic)

| # | Achado | Regra | Sev. |
|---|---|---|---|
| F1 | Ganhos abre com número grande, rótulo pequeno, linha de apoio e barra | "Hero-metric" é o padrão a evitar, **salvo se for de fato o melhor**. Aqui é: a pergunta é "quanto vou receber?". **Manter**, aplicando D8 |
| F2 | Todos os cartões iguais, com o mesmo raio e a mesma sombra cinza | "Kit de cartão SaaS". Mesmo achado que D1 |
| F3 | Ousadia gasta em vários lugares (grade, listras, sombras, fonte de exibição, entradas animadas) | "Gaste ousadia em um lugar só" e "tire um acessório antes de sair". Sugestão: o lugar é **o relógio e o dinheiro**; o resto fica quieto |
| F4 | Textos | Já seguem o guia: verbos claros ("Salvar dia", "Bater entrada"), erros que dizem como resolver, linguagem da pessoa. Manter |

### 2.3 Cookbook (estética de frontend)

O que foi aplicado continua válido: identidade tirada do canteiro, par de fontes
contrastante e uma entrada orquestrada. Revisão: o guia pede uma entrada **por tela**;
espalhamos por várias seções. Corrigir com o item D5.

## 3. Ordem sugerida

1. **Sprint de design (2–3 dias):** D1, D2, D6, D9, depois D3, D5, D7, D8, D10, D11. Todos os testes e prints nos 3 temas.
2. **Confiança do salário (1 semana):** tabela de INSS e IRRF, folga remunerada sobre extra e vale-transporte. Testes com contracheques reais.
3. **Legal e marca (em paralelo):** Termos, Privacidade, aceite, INPI e domínio.
4. **Conta e sincronização (Milestone 5)**, depois **cobrança (Milestone 7)**.
5. **Página de vendas, Play Store e notificações** para o lançamento.
6. **Medição** desde o primeiro usuário pago.

## 4. Ferramentas

- **frontend-design** e **UI Design Review** estão no diretório de plugins, mas não estão ligados. Ligados, permitem revisar cada tela renderizada com o mesmo critério acima.
- **Impeccable** não está no diretório. Roda localmente com `npx impeccable` (`audit`, `critique`, `polish`, `detect`).
