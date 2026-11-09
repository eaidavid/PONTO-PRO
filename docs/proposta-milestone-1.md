# Ponto Pro — Proposta do Milestone 1 (para aprovação)

Nada foi codado ainda. Este documento traz:

1. Estrutura de pastas do monorepo
2. Schema do Perfil de Trabalho (TypeScript + Zod)
3. Três telas em wireframe de texto (390px)
4. Decisões que preciso que você confirme

---

## 1. Estrutura de pastas

```
PONTO-PRO/
├─ apps/
│  └─ web/                         Next.js (App Router), PWA
│     ├─ app/
│     │  ├─ (app)/                 telas com barra inferior
│     │  │  ├─ hoje/
│     │  │  ├─ registros/
│     │  │  ├─ ganhos/
│     │  │  ├─ producao/
│     │  │  ├─ metas/
│     │  │  └─ conta/
│     │  ├─ (onboarding)/comecar/  5 passos + "Pronto!"
│     │  ├─ ui/                    vitrine do design system (M1)
│     │  ├─ manifest.ts            PWA: ícones, atalho "Bater ponto"
│     │  ├─ sw.ts                  service worker (Serwist)
│     │  └─ layout.tsx             fonte, tema, provedores
│     ├─ lib/
│     │  ├─ db/                    Dexie: tabelas + fila de sync (M3)
│     │  ├─ sync/                  "último a editar vence" + histórico (M5)
│     │  └─ supabase/              cliente e tipos gerados (M5)
│     ├─ e2e/                      Playwright
│     └─ public/                   ícones, splash
├─ packages/
│  ├─ core/                        motor de cálculo puro (sem UI, sem I/O)
│  │  ├─ src/
│  │  │  ├─ schema/                Zod: perfil, marcações, produção
│  │  │  ├─ tempo/                 fuso America/Sao_Paulo, minutos, noturno
│  │  │  ├─ ciclo/                 período 21→20, dias do ciclo
│  │  │  ├─ escala/                presets 44h, 6x1, 12x36, personalizada
│  │  │  ├─ feriados/              nacionais (fixos + móveis via Páscoa)
│  │  │  ├─ dia/                   ganho do dia + extrato
│  │  │  ├─ semana/                compensação semanal, limite semanal
│  │  │  ├─ banco-horas/
│  │  │  ├─ producao/
│  │  │  ├─ descontos/
│  │  │  ├─ previsao/              previsão até o fechamento, "o que falta"
│  │  │  ├─ metas/                 simulador "quero receber R$ X"
│  │  │  ├─ contracheque/          itens com código, referência, valor
│  │  │  ├─ extrato/               linhas legíveis do "Por que deu isso?"
│  │  │  ├─ dinheiro/              centavos, arredondamento, formatação R$
│  │  │  ├─ modelos/               seeds por área (versionados)
│  │  │  └─ index.ts
│  │  └─ test/                     Vitest (inclui os 7 casos obrigatórios)
│  ├─ ui/                          componentes + tokens (Tailwind v4 + shadcn customizado)
│  │  ├─ src/tokens/               cores claro/escuro/sol-forte, tipografia
│  │  └─ src/componentes/          BotaoPonto, EtapasDoDia, CartaoValor, ...
│  └─ config/                      tsconfig, eslint compartilhados
├─ supabase/                       migrations + políticas RLS (M5)
├─ docs/                           decisões de design e produto
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

Regras de dependência: `core` não importa nada de `ui` nem de `web`.
`web` e o servidor (rotas de API / Edge Functions) usam o mesmo `core`, então o
cálculo da folha da equipe é refeito no servidor com o mesmo código.

---

## 2. Schema do Perfil de Trabalho

Convenções que tornam o cálculo determinístico e explicável:

- **Dinheiro em centavos inteiros** (`2500` = R$ 25,00). Sem erro de ponto flutuante.
- **Tempo em minutos inteiros** (`540` = 9h). Horários como `"07:00"`.
- **Percentual de 0 a 100**, com até 2 casas (`50` = 50%).
- Todo campo que veio de modelo pronto fica listado em `sugestoes`, para a UI
  mostrar o selo "Sugestão — confira com seu sindicato ou contador". Ao editar,
  o campo sai da lista.
- O perfil tem `versao` para migrar regras antigas sem quebrar fechamentos.

```ts
// packages/core/src/schema/perfil.ts
import { z } from "zod";

// ---------- básicos ----------
const Centavos = z.number().int().min(0).max(100_000_000); // até R$ 1 milhão
const Minutos = z.number().int().min(0).max(24 * 60);
const Percentual = z.number().min(0).max(100).multipleOf(0.01);
const PercentualAdicional = z.number().min(0).max(300).multipleOf(0.01); // extra pode passar de 100%
const Hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato 07:00");
const DataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const Area = z.enum([
  "construcao", "comercio", "saude", "transporte", "servicos", "outro",
]);

// ---------- forma de pagamento ----------
export const Pagamento = z.discriminatedUnion("forma", [
  z.object({ forma: z.literal("hora"), valorHora: Centavos.min(1) }),
  z.object({ forma: z.literal("diaria"), valorDiaria: Centavos.min(1) }),
  z.object({
    forma: z.literal("mensal"),
    salario: Centavos.min(1),
    // divisor para achar o valor da hora (sugestão: 220 para 44h/semana)
    divisorHoras: z.number().int().min(1).max(400),
  }),
  z.object({ forma: z.literal("producao") }),
  z.object({
    forma: z.literal("misto"),
    base: z.enum(["hora", "diaria", "mensal"]),
    valorHora: Centavos.optional(),
    valorDiaria: Centavos.optional(),
    salario: Centavos.optional(),
    divisorHoras: z.number().int().min(1).max(400).optional(),
  }).refine(
    (p) => (p.base === "hora" && p.valorHora) ||
           (p.base === "diaria" && p.valorDiaria) ||
           (p.base === "mensal" && p.salario && p.divisorHoras),
    { message: "Informe o valor da base escolhida" },
  ),
]);

// ---------- escala ----------
export const DiaEscala = z.object({
  trabalha: z.boolean(),
  inicio: Hora.optional(),        // usado na "Saída prevista" e nos chips de horário
  fim: Hora.optional(),
  almocoMin: Minutos.max(240),
  horasLiquidasMin: Minutos,      // previsto já sem almoço (9h = 540)
});

export const Escala = z.discriminatedUnion("tipo", [
  // dom..sáb (índice 0 = domingo)
  z.object({
    tipo: z.literal("semanal"),
    preset: z.enum(["seg-sex-44", "seg-sab-44", "6x1", "personalizada"]),
    dias: z.array(DiaEscala).length(7),
  }),
  // 12x36 e escalas que giram: padrão repetido a partir de uma data
  z.object({
    tipo: z.literal("ciclica"),
    preset: z.enum(["12x36", "6x1-rotativa", "personalizada"]),
    padrao: z.array(DiaEscala).min(2).max(14),
    inicioEm: DataISO,            // dia que corresponde a padrao[0]
  }),
]);

// ---------- jornada e compensação ----------
export const Jornada = z.object({
  limiteDiarioMin: Minutos,             // acima disso é extra (se não compensar)
  limiteSemanalMin: z.number().int().min(0).max(7 * 24 * 60),
  compensacaoSemanal: z.boolean(),      // horas a mais num dia cobrem a folga de outro
});

// ---------- adicionais por tipo de dia ----------
export const Adicionais = z.object({
  extraDiaUtil: PercentualAdicional,    // sugestão 50
  extraSabado: PercentualAdicional,     // sugestão 50 (separado do domingo)
  extraDomingo: PercentualAdicional,    // sugestão 100
  extraFeriado: PercentualAdicional,    // sugestão 100
  feriadoTrabalhado: z.object({
    abonaDia: z.boolean(),              // caso 4: recebe o dia mesmo sem trabalhar
  }),
  noturno: z.object({
    ativo: z.boolean(),
    percentual: PercentualAdicional,    // sugestão 20
    inicio: Hora,                       // sugestão 22:00
    fim: Hora,                          // sugestão 05:00
    horaReduzida: z.boolean(),          // hora de 52min30s — desligado por padrão
  }),
});

// ---------- banco de horas ----------
export const BancoHoras = z.object({
  ativo: z.boolean(),                   // desligado: extra é paga, saldo fica zero
  limiteMin: z.number().int().min(0).max(1000 * 60).optional(),
  validadeMeses: z.number().int().min(1).max(12).optional(),
});

// ---------- ciclo ----------
export const Ciclo = z.object({
  // 20 => período de 21 a 20. 31 => fecha no último dia do mês.
  diaFechamento: z.number().int().min(1).max(31),
});

// ---------- descontos ----------
export const Desconto = z.discriminatedUnion("tipo", [
  z.object({
    id: z.string(), nome: z.string().min(1).max(40),
    tipo: z.literal("percentual"), valor: Percentual,    // caso 7: 0 a 100
  }),
  z.object({
    id: z.string(), nome: z.string().min(1).max(40),
    tipo: z.literal("fixo"), valor: Centavos,            // nunca negativo
  }),
]);

// ---------- produção ----------
export const UnidadePadrao = z.enum([
  "m2", "m3", "m", "kg", "pt", "un", "h", "dia", "saco", "peca", "verba",
]);
export const Unidade = z.union([UnidadePadrao, z.string().min(1).max(12)]);

export const ProducaoConfig = z.object({
  ativo: z.boolean(),
  pacotes: z.array(z.string()),         // ids dos pacotes do catálogo escolhidos
});

// ---------- perfil completo ----------
export const PerfilTrabalho = z.object({
  versao: z.literal(1),
  id: z.string(),
  nome: z.string().min(1).max(60),      // "Obra Jardim", "Mercado"
  area: Area,
  modelo: z.object({ id: z.string(), versao: z.number().int() }).optional(),
  fuso: z.literal("America/Sao_Paulo"),
  pagamento: Pagamento,
  escala: Escala,
  jornada: Jornada,
  adicionais: Adicionais,
  bancoHoras: BancoHoras,
  ciclo: Ciclo,
  descontos: z.array(Desconto).max(20),
  producao: ProducaoConfig,
  sugestoes: z.array(z.string()),       // caminhos ainda no valor sugerido, ex. "adicionais.extraSabado"
  atualizadoEm: z.string().datetime(),
});

export type PerfilTrabalho = z.infer<typeof PerfilTrabalho>;
```

### Exemplo: José, pedreiro (os dados do brief)

```ts
const jose: PerfilTrabalho = {
  versao: 1, id: "p1", nome: "Obra", area: "construcao",
  fuso: "America/Sao_Paulo",
  pagamento: { forma: "hora", valorHora: 2500 },
  escala: {
    tipo: "semanal", preset: "seg-sex-44",
    dias: [
      { trabalha: false, almocoMin: 0, horasLiquidasMin: 0 },                               // dom
      { trabalha: true, inicio: "07:00", fim: "17:00", almocoMin: 60, horasLiquidasMin: 540 }, // seg
      { trabalha: true, inicio: "07:00", fim: "17:00", almocoMin: 60, horasLiquidasMin: 540 }, // ter
      { trabalha: true, inicio: "07:00", fim: "17:00", almocoMin: 60, horasLiquidasMin: 540 }, // qua
      { trabalha: true, inicio: "07:00", fim: "17:00", almocoMin: 60, horasLiquidasMin: 540 }, // qui
      { trabalha: true, inicio: "07:00", fim: "16:00", almocoMin: 60, horasLiquidasMin: 480 }, // sex
      { trabalha: false, almocoMin: 0, horasLiquidasMin: 0 },                               // sáb
    ],
  },
  jornada: { limiteDiarioMin: 600, limiteSemanalMin: 2640, compensacaoSemanal: true },
  adicionais: {
    extraDiaUtil: 50, extraSabado: 50, extraDomingo: 100, extraFeriado: 100,
    feriadoTrabalhado: { abonaDia: true },
    noturno: { ativo: false, percentual: 20, inicio: "22:00", fim: "05:00", horaReduzida: false },
  },
  bancoHoras: { ativo: false },
  ciclo: { diaFechamento: 20 },
  descontos: [{ id: "d1", nome: "INSS aproximado", tipo: "percentual", valor: 9 }],
  producao: { ativo: true, pacotes: ["construcao.externos"] },
  sugestoes: ["adicionais.extraSabado", "adicionais.extraDomingo", "adicionais.extraFeriado"],
  atualizadoEm: "2026-11-09T10:00:00-03:00",
};
// Sua semana: 9+9+9+9+8 = 44h. Sábado conta como hora extra a 50%.
```

### Como os 7 casos obrigatórios viram testes

| # | Caso | Resultado esperado |
|---|------|-------------------|
| 1 | Semana do José, compensação ligada | 44h normais, 0h extra de seg a sex |
| 2 | Sábado 07:00–12:00 | 5h extra; R$ 187,50 (50%) e R$ 250,00 (100%) |
| 3 | Fechamento dia 20 | 21/10 a 20/11; 20/10 cai no período anterior |
| 4 | Feriado 02/11 (seg), 07:00–12:00 | abono de 9h (R$ 225,00) + 5h a 100% (R$ 250,00) |
| 5 | Banco desligado, sábado pago | saldo do banco = 0 |
| 6 | 50 m de meio-fio a R$ 12,00 | provento R$ 600,00; desconto de 9% sobre o bruto total |
| 7 | Desconto de -5% ou 150% | `PerfilTrabalho.safeParse` falha com mensagem em PT-BR |

Cada função devolve `{ valor, extrato }`, onde `extrato` são linhas como
`"Sábado 5h × R$ 25,00 + 50% = R$ 187,50"`.

---

## 3. Wireframes (390px)

### A. Hoje — trabalhando, antes do almoço

```
┌──────────────────────────────────┐
│ Bom dia, José     ☁ Salvo no cel.│
│                                  │
│          09:41                   │  relógio 56px
│     segunda, 09 de novembro      │
│ ╭──────────────────────────────╮ │  painel sobe por baixo
│ │ (✓)────────(◯)───────( )─────( )│
│ │ Entrada   Almoço   Volta  Saída │
│ │  07:02     --:--   --:--  --:-- │
│ │                                │
│ │ Jornada  ██████░░░░░░  2h39/9h │
│ │                                │
│ │ ┌────────────┐ ┌─────────────┐ │
│ │ │Trabalhado  │ │Saída prevista│ │
│ │ │  2h39      │ │  17:02       │ │
│ │ └────────────┘ └─────────────┘ │
│ │ ┌───────────────────────────┐ │
│ │ │Ganho hoje        R$ 66,25 │ │
│ │ │Por que deu isso? ›        │ │
│ │ └───────────────────────────┘ │
│ │                                │
│ │ [ 🍽  Sair para o almoço  09:41]│  64px, largura total
│ │ [ ▦  Lançar produção         ] │  secundário
│ ╰──────────────────────────────╯ │
├──────────────────────────────────┤
│ ⌂Hoje  ☰Registros ▦Produção $Ganhos ●Conta │
└──────────────────────────────────┘
Ao tocar: vibra, check animado, toast:
  "Almoço às 09:41 — Desfazer" (5s)
```

### B. Registros — período e edição de um dia

```
┌──────────────────────────────────┐
│  ‹    21/10 a 20/11    ›         │
│       Período atual · 13 dias    │
├──────────────────────────────────┤
│ seg 03  07:00–17:00   9h00   0h  │
│ ter 04  07:00–17:30   9h30 +0h30 │  laranja
│ qua 05  [⊘ Falta]       0h  -9h  │  vermelho
│ qui 06  07:00–17:00   9h00   0h  │
│ sex 07  07:00–16:00   8h00   0h  │
│░sáb 08  07:00–12:00   5h00 +5h00░│  fundo leve, laranja
│░dom 09  [☾ Folga]                ░│
│▌seg 10  07:02–  …     trabalhando │  hoje, borda primária
└──────────────────────────────────┘

Toque em "ter 04" → bottom sheet:
┌──────────────────────────────────┐
│            ───                   │
│ terça, 04/11                     │
│ [Entrada 07:00][Almoço 12:00]    │
│ [Volta 13:00]  [Saída 17:30]     │  marco ativo destacado
│                                  │
│          17:30                   │  44px
│   [ −5 min ]       [ +5 min ]    │
│ (16:00)(17:00)(17:30)(18:00)     │  chips da escala
│                                  │
│ Tipo do dia                      │
│ (✓Normal)(⊘Falta)(✚Atestado)     │
│ (★Feriado)(☾Folga)(⇄Compensado)  │
│                                  │
│ [        Salvar dia          ]   │
└──────────────────────────────────┘
```

### C. Ganhos — Resumo

```
┌──────────────────────────────────┐
│ Ganhos          21/10 a 20/11    │
│ [Resumo] Previsão  Contracheque  │
│ ╭──────────────────────────────╮ │
│ │ Você deve receber            │ │
│ │ R$ 5.412,30                  │ │  56px, tabular
│ │ ████████████░░░░░░  68%      │ │
│ │ Já ganhou        Falta       │ │
│ │ R$ 3.680,00      R$ 1.732,30 │ │
│ │ Por que deu isso? ›          │ │
│ ╰──────────────────────────────╯ │
│ ⚠ Os descontos estão maiores... │  só aparece quando vale
│                                  │
│ Por dia                          │
│ ▇ ▇ ▇ ▇ ▆ █ ▁ ▇ ▇ ▇ ▇ ▆ ▃       │  laranja = extra
│                                  │
│ Ganhos        R$ 5.947,58        │
│  Horas normais  R$ 4.950,00      │
│  Hora extra     R$   397,58      │  laranja
│  Produção       R$   600,00      │
│ Descontos      −R$   535,28      │  vermelho
└──────────────────────────────────┘

"Por que deu isso?" → bottom sheet com o passo a passo:
  Dias normais 22 × 9h × R$ 25,00 ...
  Sábado 5h × R$ 25,00 + 50% = R$ 187,50
  Meio-fio 50 m × R$ 12,00 = R$ 600,00
  INSS aproximado 9% de R$ 5.947,58 = −R$ 535,28
```

(Os valores do wireframe C são ilustrativos; os números reais virão do `core`.)

---

## 4. Decisões para você confirmar

1. **Dinheiro em centavos e tempo em minutos** no motor. Recomendo.
2. **Arredondamento**: centavos arredondados por linha do extrato (meio para cima),
   para o extrato sempre somar certo. Alternativa: arredondar só o total.
3. **Salário mensal → hora**: divisor sugerido 220 para 44h, editável e com selo de sugestão.
4. **Feriado trabalhado (caso 4)**: abono das horas previstas do dia + todas as horas
   trabalhadas pelo adicional de feriado. Confirma essa leitura?
5. **Compensação semanal**: o excedente do dia só vira extra se passar do limite semanal
   ou do limite diário (10h no exemplo). Confirma que o limite diário vale mesmo com compensação?
6. **6x1**: folga fixa (escala semanal) por padrão, com opção de folga rotativa (cíclica).
7. **Design**: o brief de design (tokens, componentes com todos os estados, telas nos
   3 temas) entra como código: a página `/ui` vira a vitrine do design system no M1, as
   telas em alta fidelidade saem nos M2–M4, e `docs/decisoes-de-design.md` explica as escolhas.
   Prints em 360/390/768px nos temas claro, escuro e Sol forte ao fim de cada etapa.
8. **Ambiente**: eu trabalho num container Linux na nuvem e envio tudo pelo git
   (branch `ccr-74d90d32-lv6rd6`). Os scripts vão funcionar no Windows/PowerShell com pnpm.
