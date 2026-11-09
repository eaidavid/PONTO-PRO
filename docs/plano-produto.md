# Ponto Pro — de MVP a produto pronto

Diagnóstico de frontend, UI/UX e design, nova estrutura de cada página e funções novas.
Nada aqui foi implementado ainda: é o plano para aprovação.

---

## 1. Diagnóstico

### 1.1 UX: informação repetida e misturada

Na tela Hoje, às 09:41, com entrada às 07:02, a mesma informação aparece várias vezes:

| Informação | Onde aparece hoje | Vezes |
|---|---|---|
| Horas trabalhadas (2h39) | frase do topo, barra "Jornada", cartão "Trabalhado" | 3 |
| Saída prevista (17:02) | frase do topo, cartão "Saída prevista" | 2 |
| Hora atual (09:41) | relógio, botão ("Registra às 09:41") | 2 |
| Próxima etapa | etapas do dia, texto do botão | 2 |

Outros problemas de UX:
- **Telas viraram pilhas de cartões do mesmo peso.** Sem hierarquia, o olho não sabe por onde começar.
- **"Recentes" na Hoje** repete o que está nas etapas e na Produção.
- **Ganhos/Resumo mistura dois tempos:** o cartão mostra a previsão até o fechamento e a lista embaixo mostra "até hoje".
- **Falta histórico de verdade:** não dá para buscar um dia, filtrar faltas ou hora extra, ver totais por semana ou abrir períodos antigos rapidamente.
- **Não existe categoria transversal.** Quem trabalha em duas obras não consegue separar horas e produção por obra.
- **Lacunas do brief:** feriados locais não podem ser cadastrados, e não há observação por dia (ex.: "choveu, obra parada").
- **Botão Voltar do Android:** com um painel aberto, ele sai da tela em vez de fechar o painel.

### 1.2 Design: muitos pesos iguais

- **Fonte de exibição em excesso:** a Bricolage aparece em títulos de tela, de seção, números, frases e estados vazios, e tudo grita ao mesmo tempo.
- **Verde para tudo:** botão, link, valor, ícone e aba ativa usam a mesma cor, e ela perde o sentido de "ação".
- **Cinco estilos de bloco:** cartão, área verde, banner com borda lateral, aviso com faixa e lista. Falta uma regra de quando usar cada um.
- **Ícones em círculos em todo lugar:** cartões, listas e lembretes. Viram ruído.
- **Espaçamento uniforme:** `gap-4` em tudo, sem respiro entre seções nem aperto dentro delas.

### 1.3 Frontend

- **Páginas monolíticas:** Conta tem mais de 400 linhas, e as regras de tela se misturam com as de dados.
- **Estado fora da URL:** período, aba e filtros não ficam no endereço. Voltar perde o filtro, e não dá para abrir um link direto para "Registros de outubro".
- **Painéis fora do histórico do navegador:** por isso o Voltar do Android não fecha o painel.
- **Bundle no limite:** 198 KB de 200 KB. Contracheque, Metas e os editores precisam carregar só quando abertos.
- **Banco sem as tabelas do produto:** faltam obras, notas do dia, feriados locais e fechamentos.

---

## 2. Regras de design (valem para todas as páginas)

1. **Uma área de destaque por tela,** no topo e em verde profundo. Ela responde a pergunta da tela.
2. **Cada informação aparece uma vez só.** Se está no destaque, não se repete em cartão.
3. **A fonte de exibição fica só para três usos:** relógio, valores em R$ do destaque e título da tela. O resto usa Atkinson.
4. **Verde só para ação** (botões, links e aba ativa). Valores ficam em preto, com laranja para extra e vermelho para desconto e falta.
5. **Listas agrupadas em vez de cartões soltos:** um bloco branco com linhas divididas, no estilo dos ajustes do celular.
6. **Títulos de seção pequenos** (15px, cinza escuro, sem caixa alta), com 24px de espaço entre seções e 8px dentro delas.
7. **Ícone em círculo só em listas de navegação e ajustes.** Nos números, ícone pequeno sem fundo.
8. **Alertas sempre no topo, logo abaixo do destaque,** em um único formato: faixa laranja com ação.

---

## 3. Nova navegação

```
┌──────────────────────────────────┐
│  ⌂        ☰        (+)     $    ⋯ │
│ Hoje  Histórico   Lançar Ganhos Mais│
└──────────────────────────────────┘
```

- **Botão central "+ Lançar"** agrupa toda a criação num lugar só. Abre um painel com:
  - Bater ponto agora;
  - Lançar produção;
  - Marcar falta, atestado ou folga;
  - Adicionar um dia esquecido;
  - Anotar no dia.
- **Histórico** substitui "Registros": ponto, produção e notas, com busca e filtros.
- **Mais:** Metas, Obras, Catálogo de serviços, Conta e ajustes rápidos.

---

## 4. Estrutura de cada página

### 4.1 Hoje — "O que faço agora?"

A área de cima volta a ter o relógio grande. A informação do dia aparece **uma vez**, na linha do dia.

```
┌──────────────────────────────────┐
│ Bom dia, José        ☁ Salvo     │  13–15px
│                                  │
│ 09:41                            │  relógio grande
│ segunda, 09 de novembro          │
│ ╭──────────────────────────────╮ │
│ │ ● No almoço desde 12:00      │ │  pílula de status (só o estado)
│ ╰──────────────────────────────╯ │
├──────────────────────────────────┤
│ [!] Esqueceu a entrada? 07:00 ›  │  só aparece se houver
│                                  │
│ (✓)──────(◉)──────( )──────( )   │  linha do dia
│ 07:02    12:00                   │
│ ████████░░░░░░░░  2h39 de 9h     │  horas: aqui e só aqui
│ Sai às 17:02                     │  saída: aqui e só aqui
│                                  │
│ [ 🍽  Voltar do almoço          ] │  botão (sem repetir a hora)
│                                  │
│ Ganho hoje        R$ 66,25   ?  │  uma linha, toque explica
│ Lançar produção               ›  │  só para quem tem produção
└──────────────────────────────────┘
```

Sai da Hoje: "Recentes" (vai para o Histórico) e o cartão de 3 números (era repetição).

### 4.2 Histórico — "O que aconteceu e tem algo errado?"

```
┌──────────────────────────────────┐
│ Histórico                        │
│ [🔍 Buscar dia, serviço, nota  ] │
│ [Ponto][Produção][Tudo]          │  abas
│ ‹  21/10 a 20/11  ›  ▾ períodos  │  seletor com lista de períodos
│ (Todos)(Extra)(Faltas)(Sem saída)│  filtros em chips
│ (Atestado)(Feriado)(Obra ▾)      │
├──────────────────────────────────┤
│ [!] 2 dias precisam de atenção › │
│                                  │
│ SEMANA 03 A 09/11   44h · +0h30  │  agrupado por semana
│ ┌──────────────────────────────┐ │
│ │ ter 04 07:00–17:30 9h30 +0h30│ │
│ │ seg 03 07:00–17:00 9h00   0h │ │
│ └──────────────────────────────┘ │
│ SEMANA 27/10 A 02/11 35h · −9h  │
│ ┌──────────────────────────────┐ │
│ │ qua 28  ⊘ Falta        −9h00 │ │
│ │ 📝 "Chuva, obra parada"       │ │  nota do dia
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

Funções novas:
- **Busca** por data ("05/11"), tipo ("falta"), serviço, nota ou obra.
- **Filtros:** com hora extra, faltas, atestados, feriados, sem saída, fim de semana e obra. Ficam na URL, então Voltar mantém o filtro.
- **Agrupamento por semana,** com subtotal de horas e saldo.
- **Seletor de períodos:** lista dos períodos passados, cada um com total de horas e valor. Um toque abre o período.
- **Completar com a escala:** preenche os dias sem registro como previstos, com "Desfazer".
- **Exportar o período** em PDF ou CSV.

### 4.3 Produção — "Quanto já fiz e o que lanço agora?"

Fica dentro do Histórico (aba) e no botão "+ Lançar".

```
┌──────────────────────────────────┐
│ Lançar produção          hoje ▾  │
│ ★ Assentar meio-fio  ★ Reboco    │  favoritos e recentes
│ [🔍 Digite o serviço           ] │
│ (Todas)(Alvenaria)(Pintura)(...) │  categorias
│ ...resultados...                 │
│ 50 m × R$ 12,00 = R$ 600,00      │
│ [ Lançar ]                       │
└──────────────────────────────────┘
```

Funções novas:
- **Favoritos** (estrela): aparecem primeiro.
- **Categorias em chips** (Alvenaria, Pintura, Elétrica...) no lançamento e no catálogo.
- **Catálogo próprio** no Mais: criar, editar preço, arquivar e reordenar serviços.
- **Obra no lançamento,** quando houver mais de uma.

### 4.4 Ganhos — "Quanto vou receber e quando?"

```
┌──────────────────────────────────┐
│ Você deve receber      fecha em 11d│
│ R$ 5.124,44                      │
│ ███████████░░░░  já R$ 3.364,72  │
├──────────────────────────────────┤
│ [Resumo][Contracheque][Períodos] │
│                                  │
│ De onde vem                      │  composição em barra única
│ ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇░░░        │
│ Horas normais     R$ 4.400,00    │
│ Hora extra        R$   206,25    │
│ Produção          R$   600,00    │
│ Descontos        −R$   506,81    │
│                                  │
│ Ganho por dia  [gráfico]         │
└──────────────────────────────────┘
```

- **O topo mostra só a previsão,** e a composição usa o mesmo número. Acaba a mistura de "até hoje" com "previsto". O "Já ganhou" vira a barra.
- **Aba Previsão** se funde no Resumo ("Ainda falta" vira uma linha), e o passo a passo fica no "Por que deu isso?".
- **Aba Períodos (nova):** períodos fechados, com o valor estimado.
  - **Fechar período:** congela o cálculo.
  - **Conferir pagamento:** a pessoa digita quanto recebeu, e o app mostra a diferença e de onde ela pode vir ("faltou pagar 5h30 de extra?"). Isso ataca de frente a desconfiança com o cálculo.
- **Metas** vira um botão no Resumo ("Quero receber mais") e continua no Mais.

### 4.5 Mais e Conta

```
Mais
  Instalar o app (quando disponível)
  Metas · Obras · Catálogo de serviços
  Tamanho e aparência (atalho)
  Conta ›

Conta (em seções curtas)
  Meu trabalho: valor, semana, fechamento
  Regras: hora extra, compensação, saldo, noturno
  Feriados locais (novo)
  Descontos
  Contracheque: nome, cargo, empresa
  App: tamanho, aparência, som, lembretes
  Meus dados: backup, restaurar, apagar
  Sobre e termos
```

---

## 5. Funções novas, por prioridade

| Fase | Função | Por quê |
|---|---|---|
| **1** | Hoje redesenhado (relógio de volta, sem repetição) | Pedido direto. É a tela mais usada |
| **1** | Histórico: busca, filtros, semanas, seletor de períodos | Achar e conferir em segundos |
| **1** | Botão "+ Lançar" | Toda criação num lugar só |
| **1** | Nota por dia e feriados locais | Lacunas do brief |
| **1** | Voltar do Android fecha painéis; filtros e período na URL | Comportamento esperado de app |
| **2** | Obras (categoria de ponto e produção) e filtro por obra | Quem tem mais de uma obra ou cliente |
| **2** | Catálogo com categorias e favoritos | Lançar produção mais rápido |
| **2** | Fechar período e "Conferir pagamento" | Confiança no cálculo |
| **2** | Exportar período (PDF e CSV) | Mostrar para o patrão ou contador |
| **2** | "Completar com a escala" | Corrigir semanas esquecidas de uma vez |
| **3** | Login, sincronização e servidor (Milestone 5) | Não perder dados ao trocar de celular |
| **3** | Lembrete por notificação ("Bateu a saída?") | Evitar ponto esquecido |
| **3** | Foto no lançamento de produção | Comprovar serviço feito |

## 6. Frontend: como vamos organizar

- **Pastas por função** (`features/hoje`, `features/historico`, `features/producao`, `features/ganhos`, `features/conta`), cada uma com tela, componentes e hooks próprios.
- **Hooks de dados por assunto** (`useDia`, `usePeriodo`, `useHistorico(filtros)`), com consultas indexadas no banco.
- **Período, aba e filtros na URL** (`/historico?periodo=2026-10&filtro=extra`).
- **Painéis ligados ao histórico do navegador,** para o Voltar fechar o painel.
- **Carregamento sob demanda** de Contracheque, Metas, editores e exportação. A meta é a Hoje abaixo de 180 KB.
- **Banco v3** com as tabelas novas: `obras`, `notas`, `feriadosLocais` e `fechamentos`, mais índices por obra e por tipo.
- **Testes:** um E2E por função nova e prints de comparação visual das 5 telas nos 3 temas.

## 7. Ordem de execução sugerida

1. **Fase 1a:** regras de design (seção 2), Hoje redesenhado e botão "+ Lançar".
2. **Fase 1b:** Histórico com busca, filtros, semanas e períodos, mais nota do dia e feriados locais.
3. **Fase 2a:** Ganhos reorganizado, Períodos, "Conferir pagamento" e exportar.
4. **Fase 2b:** Obras, catálogo com categorias e favoritos, e "completar com a escala".
5. **Fase 3:** login, sincronização e notificações (Milestone 5).

Cada fase termina com testes passando, prints em 360, 390 e 768px nos 3 temas, e publicação na Vercel.
