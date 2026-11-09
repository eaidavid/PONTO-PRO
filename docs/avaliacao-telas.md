# Pingou — avaliação de telas, funções e estrutura

Objetivo: cada tela com **uma coisa principal**, o resto em segundo plano.
A Home (Hoje) é o padrão a seguir e não muda.

## Critérios

Cada elemento foi avaliado em quatro perguntas:

| Critério | Pergunta |
|---|---|
| **Frequência** | A pessoa usa todo dia, toda semana, todo mês ou quase nunca? |
| **Valor de decisão** | Responde a uma das três perguntas: "bati o ponto?", "quanto vou receber?", "quanto falta?" |
| **Custo de atenção** | Quanto peso visual tira do que importa na tela? |
| **Custo para o app** | Código, testes e dúvidas de suporte que o item gera |

Com isso, cada item vai para um destes destinos:

| Destino | Quando |
|---|---|
| **Destaque** | Uso frequente e alto valor de decisão: fica no topo, grande |
| **Ao alcance** | Uso frequente e valor médio: fica visível, mas com peso pequeno |
| **Um toque a mais** | Uso raro, mas importante: vai para menu, painel ou seção recolhida |
| **Sair** | Uso raro e valor baixo, ou repete outra informação |

## Avaliação por tela

### Hoje: não muda
Já segue a regra: relógio, status, linha do dia, um botão e uma lista curta.

### Ganhos
| Item | Frequência | Valor | Antes | Depois |
|---|---|---|---|---|
| Quanto vou receber | semanal | alto | destaque | **Destaque** com "Vai pingar" |
| **Quando cai** (novo) | semanal | alto | não existia | **Destaque**: "cai em 05/12 · em 26 dias" |
| Já ganhou / Falta (2 caixas) | semanal | médio | 2 caixas grandes | **Ao alcance**: uma linha sob a barra |
| "Faltam 9 dias de trabalho" | semanal | médio | frase solta | Junta com a linha acima |
| De onde vem | mensal | alto (confiança) | lista | Fica, igual |
| Gráfico por dia | raro | baixo | cartão grande | **Um toque a mais**: "Ver ganho por dia" |
| Quero receber mais | raro | médio | botão grande | Link discreto |

### Histórico
| Item | Frequência | Valor | Antes | Depois |
|---|---|---|---|---|
| Lista de dias | semanal | alto | destaque | **Destaque** |
| Busca | rara | médio | barra grande no topo | **Um toque a mais**: ícone de lupa que abre a busca |
| Exportar | mensal | baixo | botão no topo | **Um toque a mais**: menu "Mais opções" |
| Completar com a escala | raro | médio | dentro do alerta | Fica no alerta e também no menu |
| Período + Filtrar | semanal | médio | duas linhas | **Uma linha só** |
| Resumo + "Tudo certo" | semanal | médio | duas linhas | **Uma linha só** |

O topo cai de 7 camadas para 3: título com ações, período com filtro e o resumo.

### Lançar produção
| Item | Frequência | Valor | Antes | Depois |
|---|---|---|---|---|
| Busca de serviço | diária | alto | no meio da tela | **Destaque**, logo no topo |
| Favoritos e recentes (chips) | diária | alto | seção separada | Aparecem **primeiro na lista** (sem seção a mais) |
| Dia (hoje, ontem, anteontem) | diária | médio | abas grandes | **Ao alcance**: um seletor pequeno no topo |
| Categorias | semanal | médio | antes da busca | Abaixo da busca, só quando não está digitando |

### Metas
| Item | Antes | Depois |
|---|---|---|
| Valor desejado | cartão | **Destaque** |
| Frase da resposta | bloco verde gigante (competia com o valor) | Texto forte, sem bloco |
| Entrada no menu Mais | atalho próprio | **Sai do Mais**: fica em Ganhos ("Quero receber mais"), onde faz sentido |

### Conta
Configuração é lida raramente e por isso pode ser longa. A única mudança é
"Quando cai o salário", que entra junto do fechamento.

## Funções

| Função | Decisão | Por quê |
|---|---|---|
| **Dia do pagamento** ("vai pingar em 05/12") | **Nova** | Responde "quando vou receber?". Liga a marca ao produto. Sugestão CLT: 5º dia útil, editável |
| Gráfico por dia | Recolhido | Bonito, mas não ajuda a decidir nada |
| Metas no menu | Sai do menu | Uso raro; o lugar natural é Ganhos |
| Exportar no topo | Vai para o menu | Uso mensal não merece o topo |
| Busca sempre aberta | Vira lupa | Quem busca toca uma vez; quem não busca ganha espaço |

## Nome: "Pingou Dindin"

Recomendo **não usar**. "Pingou" sozinho já diz "o dinheiro caiu". "Dindin"
repete a ideia e soa infantil para falar de salário, que é coisa séria para o
público. Uma boa alternativa é usar "dindin" no texto e não no nome, por exemplo
"Seu dindin pingou" numa notificação de dia de pagamento.

## Status (09/11/2026)

Tudo o que está acima foi implementado: dia do pagamento ("Vai pingar · cai em 05/12"),
Ganhos com uma informação principal e o gráfico recolhido, Histórico com 3 camadas no topo
(busca e exportar em toques), Lançar produção com a busca primeiro e Metas fora do menu.
Ícone novo: pingo com cifrão.
