# Auditoria de UX, frontend e dados — Ponto Pro

Data: 09/11/2026. Objetivo: melhorar o dia a dia, preparar para crescer e fazer cada tela
resolver a decisão da pessoa em até 4 segundos.

## Regra dos 4 segundos

Cada tela responde uma pergunta no primeiro olhar, no topo, em uma frase:

| Tela | Pergunta | Resposta no topo |
|---|---|---|
| Hoje | "O que faço agora?" | Status em frase ("Trabalhando há 2h39 · Saída prevista às 17:02") e o botão de ponto logo abaixo das etapas |
| Hoje | "Esqueci algo?" | Lembrete com correção em um toque ("Esqueceu de bater a entrada? → Bater entrada às 07:00") |
| Registros | "Tem algo errado?" | "Tudo certo neste período" ou "2 dias precisam de atenção", com atalho para cada dia |
| Ganhos | "Quanto e quando?" | "Você deve receber" + "fecha em 11 dias" |
| Produção | "Repetir o de ontem" | Chips "Lançar de novo" com os últimos serviços (2 toques) |

## Achados e o que foi feito

| # | Área | Achado | Status |
|---|---|---|---|
| 1 | UX | A tela Hoje abria com um relógio gigante; o estado do dia exigia ler as etapas | Feito: status em frase no topo, relógio menor ao lado da saudação |
| 2 | UX | Ponto esquecido (entrada, almoço, saída, ontem sem saída) não tinha ajuda | Feito: lembretes com correção pronta e "Desfazer" |
| 3 | UX | Toque duplo acidental (luva, mão suja) registrava duas etapas seguidas | Feito: segundo toque em menos de 60s pede confirmação |
| 4 | UX | O check animado aparecia a cada toque, mesmo sem salvar | Feito: aparece só quando a etapa avança de verdade |
| 5 | UX | Registros não apontava dias com problema | Feito: cartão de atenção (sem saída, dia de trabalho sem registro) |
| 6 | UX | Horários incoerentes (sem volta do almoço, dia de mais de 16h) passavam calados | Feito: avisos no editor do dia (sem bloquear) |
| 7 | UX | "Faltando 3h30" misturava hora extra (paga) com falta | Feito: "Hora extra +5h30" e "Faltas −9h00" separados |
| 8 | UX | Repetir o mesmo serviço todo dia exigia buscar de novo | Feito: "Lançar de novo" |
| 9 | UX | Ganhos não dizia quando fecha | Feito: "fecha em N dias" |
| 10 | Dados | Todas as telas carregavam todo o histórico | Feito: memória com ~2 períodos; histórico antigo lido sob demanda por período |
| 11 | Dados | Gráfico refazia o cálculo com todo o histórico para cada dia | Feito: `ganhosPorDia` no motor, uma passada só (testado contra o cálculo dia a dia) |
| 12 | Dados | Fila de sincronização e histórico cresciam sem limite | Feito: fila guarda só a última operação de cada item; histórico guarda 20 versões |
| 13 | Dados | O navegador pode apagar o banco local para liberar espaço | Feito: pede armazenamento persistente ao abrir |
| 14 | Dados | Havia "Baixar meus dados", mas não restaurar | Feito: "Restaurar um backup", com validação de cada item |
| 15 | Offline | O app não abria sem internet | Feito: service worker salva telas e arquivos no primeiro acesso |
| 16 | PWA | Não dava para instalar | Feito: manifesto, ícones, atalhos ("Bater ponto", "Lançar produção", "Quanto vou receber") e botão "Instalar o app" no Mais |
| 17 | Desempenho | JS da tela Hoje com 230 KB gzip (meta < 200 KB) | Feito: 198 KB, tirando o Zod da tela Hoje (validação de backup carregada só quando usada) |
| 18 | Robustez | Erro inesperado mostrava a tela padrão em inglês | Feito: telas de erro e de "página não existe" em PT-BR |
| 19 | Escala do time | Nada impedia uma mudança de quebrar os cálculos | Feito: CI no GitHub (tipos, testes do motor, build e E2E) |

## Motor (packages/core) — novo módulo `assistente`

- `statusDoDia`: a frase do topo da Hoje.
- `lembretesDoDia`: pontos esquecidos com a correção pronta.
- `pendenciasDoPeriodo`: dias que precisam de atenção.
- `validarMarcacoes`: avisos de horários incoerentes.
- `saidaPrevista`: saída considerando o almoço real.
- `ganhosPorDia`: ganho de cada dia, numa passada.

81 testes, cobertura de 99,7%.

## Próximos passos (não feitos nesta rodada)

1. **Servidor (Milestone 5):** Supabase com RLS, envio da fila de sincronização ("último a editar vence" com o histórico já guardado) e recálculo no servidor com o mesmo `core` para a folha da equipe.
2. **Login por telefone e e-mail**, para não perder dados ao trocar de celular (hoje o backup é manual).
3. **Lembrete por notificação** ("Bateu a saída?") quando o app estiver instalado.
4. **Branch `main`** como produção na Vercel, com a branch de trabalho só para prévias.
5. **Margem do bundle:** 198 KB está perto do limite. Novas bibliotecas na tela Hoje precisam ser carregadas sob demanda.
