# Revisão de UI e UX — plano aprovado

Data: 17/11/2026. Aprovado para execução direta (pedido do David: "revisão auto aprovada").
Fontes: auditoria do código (`packages/ui`, `apps/web`), prints de todas as telas em 390px,
skills design-review (Nielsen, qualidade visual, acessibilidade, design system) e design-system (auditoria de tokens),
os achados ainda abertos de `docs/vendavel.md` e referências de apps de ponto e de carteira (Dribbble, Contra, Uxcel).

## O que as referências ensinam

- Apps de ponto bem resolvidos mostram **um botão e um número** por tela; o resto fica uma camada abaixo (widget de start/stop com horas do dia e da semana).
- Carteiras e apps de ganhos usam **um cartão de saldo de alto contraste** e uma lista compacta de movimentos logo abaixo, sem caixas repetidas.
- Design systems atuais: **base de 16px**, 5 a 7 tamanhos, razão entre 1,125 e 1,25 para interface densa, e a compressão vem **de cima** (títulos diminuem mais que o corpo).

## Diagnóstico

| # | Achado | Onde | Severidade |
|---|---|---|---|
| A1 | Escala grande: base 17px, títulos até 56px, botão principal de 64px, relógio de 90px. Tudo grita junto | Todas | P1 |
| A2 | 6 raios diferentes (16, 20, 24, 28, 30, 40px) e 12 tamanhos de texto soltos fora da escala | 25 arquivos | P2 |
| A3 | Cartão com borda **e** sombra larga em tudo ("ghost card"): nada parece mais importante | `.cartao` | P2 |
| A4 | Cinzas neutros puros: o texto secundário não conversa com o verde da marca | tokens | P3 |
| A5 | Faixa colorida de 4px à esquerda em avisos e pendências | Hoje, Histórico | P2 |
| A6 | Grade de planta baixa no fundo verde: decoração sem função | `.fundo-marca` | P3 |
| A7 | Entrada animada em toda seção de toda tela | `.entrada-escalonada` | P2 |
| U1 | Quem acabou de começar vê "12 dias precisam de atenção": o app cobra dias de antes de a pessoa existir nele | Histórico | **P1** |
| U2 | O histórico lista semanas inteiras de "Sem registro" antes do primeiro dia de uso | Histórico | P1 |
| U3 | Frases com ponto no meio ("21/10 a 20/11 · fecha em 11 dias") viram código para quem lê pouco | Várias | P2 |
| U4 | A página de vendas repete o botão em quase toda seção e ainda tem barra fixa: parece só querer vender | Site | P2 |
| U5 | As calculadoras grátis (o que mais ajuda quem chega) não aparecem na página inicial | Site | P2 |

## O que muda (aprovado)

### Tokens
1. **Base de 16px** no tamanho Padrão (Compacto 15, Grande 18; o Sol forte soma um nível). Alvos de toque continuam com 48px.
2. **Escala de texto por função**, sem nomes em pixel: `legenda` 13 · `apoio` 14 · `corpo` 16 · `destaque` 18 · `titulo-3` 20 · `titulo-2` 24 · `titulo-1` 32 · `numero` 44. Comprime de cima: o corpo cai 1px, os títulos caem até 12px.
3. **Raios**: `pequeno` 10 · `cartao` 14 · `grande` 20 · `painel` 24. Os valores soltos passam a usar esses.
4. **Elevação**: cartão comum só com borda fina e sombra de 1px; sombra larga só no que flutua (botão do ponto, painéis, barra de navegação).
5. **Neutros tingidos de verde** no texto secundário e nas bordas; seleção de texto e cursor na cor da marca.

### Componentes
6. Botão principal 56px (antes 64), botão comum 48px, botão do ponto 64px (antes 72), relógio menor.
7. Avisos sem faixa lateral: fundo tingido e ícone.
8. Fundo verde sem a grade, só a luz no canto.
9. Fonte de exibição um pouco mais leve (750) para não pesar em tamanho menor.

### Experiência
10. Pendências, "completar como a escala" e as semanas do histórico **começam no primeiro dia de uso**. Antes disso, o app não cobra nada.
11. Histórico de quem acabou de começar mostra um estado vazio acolhedor ("Seu histórico começa hoje") em vez de dias vazios.
12. Entrada animada só na tela Hoje.
13. Frases com ponto no meio trocadas por palavras nos topos das telas principais.
14. Página de vendas: seção **"Faça a conta agora, sem cadastro"** com as calculadoras, logo depois da abertura; menos botões repetidos no meio da página.

### Fora desta rodada
- Trocar as fontes (a Atkinson foi escolhida para baixa visão e fica).
- Mudar a navegação inferior.

## Como saber se ficou bom
- A página de vendas e as telas principais cabem em menos rolagem no celular de 390px.
- Nenhum tamanho de texto, raio ou cor solto fora dos tokens nos arquivos tocados.
- Testes de acessibilidade (WCAG AA) passam nos três temas.
- Uma pessoa nova não vê nenhum aviso de "dia sem registro" de antes de começar.

## Vendas sem pressão (17/11/2026)

Feito no app:
- Ofertas do Pro com os números da pessoa: o período antigo bloqueado mostra as horas e a hora extra guardadas nele; "Seus direitos" no Grátis mostra a prévia das férias e do 13º com o salário dela.
- Planos: "menos de 50 centavos por dia" e a pergunta "E se eu assinar e não gostar?" com o direito de arrependimento de 7 dias (CDC, art. 49), também nos Termos e na tela de assinar.
- Resumo da semana passada na tela Hoje, às segundas e terças, grátis: horas, hora extra e quanto rendeu.
- "Indicar para um colega" no menu Mais, pelo compartilhar do celular ou WhatsApp (medido como `indicar`; links trazem `?origem=indicacao`).

Próximos, que dependem de você:
- Depoimentos reais autorizados na página de vendas (a seção aparece sozinha quando a lista em `apps/web/lib/depoimentos.ts` tiver itens).
- Recompensa por indicação (1 mês de Pro): precisa do banco ligado e de desconto no Asaas.
- Oferta de volta para quem não assinou no fim do teste (primeiro mês com desconto): precisa de cupom no Asaas.
- Devolução dos 7 dias: o reembolso é feito pelo painel do Asaas quando alguém pedir.
