# Pingou

Bateu o ponto, pingou. Ponto, produção e ganhos para quem trabalha na obra, no comércio, na saúde, nas entregas e por conta própria.

## Estrutura

```
apps/web         Next.js (App Router): página de vendas (/), onboarding (/comecar), Hoje, Histórico, Lançar produção, Ganhos, Metas, Obras e Conta
packages/core    motor de cálculo puro (sem UI), com testes
packages/ui      design system: tokens e componentes
packages/config  tsconfig compartilhado
docs/            proposta, decisões de design e prints
```

## Comandos (Windows/PowerShell ou Linux, com pnpm)

```bash
pnpm install
pnpm test                         # testes do motor (Vitest)
pnpm coverage                     # cobertura do core (mínimo 90%)
pnpm typecheck
pnpm --filter @ponto-pro/web dev  # abre http://localhost:3000
pnpm --filter @ponto-pro/web build
pnpm --filter @ponto-pro/web exec playwright install chromium   # uma vez
pnpm e2e                          # fluxos e acessibilidade (axe)
```

Prints de 360/390/768px nos 3 temas: `PRINTS=1 pnpm e2e` (no PowerShell: `$env:PRINTS=1; pnpm e2e`). Saem em `docs/prints/produto`.

## Regras do motor

Nenhuma regra trabalhista é fixa no código: tudo vem do Perfil de Trabalho (`packages/core/src/schema/perfil.ts`) e os valores dos modelos aparecem como "Sugestão". Dinheiro em centavos, tempo em minutos, arredondamento por linha do extrato.

## Dados

Tudo fica no aparelho (IndexedDB, via Dexie): perfil, registros, serviços e produção.
Cada gravação entra numa fila de sincronização e guarda o valor anterior num histórico,
prontos para a sincronização com o Supabase (Milestone 5).
