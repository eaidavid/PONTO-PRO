# Decisões de design — Ponto Pro

Público: pedreiro, servente, comerciário 6x1, plantonista 12x36, diarista, entregador.
Android simples, 360–400px, sol forte, pressa, mão suja ou de luva, internet fraca, pouca leitura longa.
Três perguntas: **bati o ponto? quanto vou receber? quanto falta?**

## 1. Uma ação por tela, perto do polegar
- A tela Hoje segue o modelo de app de corrida: informação viva no alto (relógio de 56px), painel arredondado subindo por baixo e um botão gigante.
- O botão de ponto tem 64px e largura total. O texto diz o que vai acontecer ("Sair para o almoço") e o horário que será gravado ("Registra às 09:41"). Assim a pessoa não precisa adivinhar.
- Ao tocar: vibração curta, check animado em verde e toast "Entrada às 07:02 — Desfazer" por 5 segundos. Não há modal de confirmação: errar custa um toque para desfazer.

## 2. Cores com função fixa
| Cor | Sempre significa |
|---|---|
| Verde obra #0E7C66 | ação e ganho normal |
| Laranja segurança #EA580C | hora extra, ganho a mais |
| Vermelho #DC2626 | desconto, falta, erro |
| Verde #16A34A | concluído |

- Os tons originais de laranja, verde e vermelho não passam de 4,5:1 como texto sobre branco. Por isso cada cor tem um tom de texto mais escuro (`--extra-texto` #C2410C, `--sucesso-texto`, `--erro-texto`) e o tom original fica para barras, preenchimentos e ícones.
- Todos os pares foram medidos: AA nos temas claro e escuro, e pelo menos 7:1 no Sol forte. O teste automático de acessibilidade (axe) roda nos três temas.

## 3. Sol forte
- Tema próprio, não um "alto contraste" genérico: fundo branco puro, texto preto, sem cinza claro, bordas de 2px e fonte base de 20px (um nível acima).
- Pensado para leitura ao meio-dia na obra.

## 4. Números que dá para conferir
- Fonte Atkinson Hyperlegible, feita para baixa visão. O zero cortado não se confunde com a letra O.
- Algarismos tabulares, para os horários e valores não "dançarem".
- Dinheiro sempre como "R$ 1.234,56", um único formatador para o app inteiro.
- Toda conta tem "Por que deu isso?", que abre o passo a passo escrito como se fala: "Sábado 5h × R$ 25,00 + 50% = R$ 187,50". O motor gera esse texto com a mesma conta que produz o valor, então o texto e o número nunca divergem.

## 5. Toque grande, sem digitar
- Alvos de toque com no mínimo 48px. Botões principais de 56–64px.
- Horário: chips com os horários da escala da pessoa (07:00, 12:00, 13:00, 16:00, 17:00), mais −5 e +5 minutos. Nunca o seletor nativo pequeno.
- Quantidades e preços abrem o teclado numérico, com a unidade sempre visível ao lado ("50 m") e a prévia da conta embaixo.
- A busca de serviço ignora acentos e hífens ("meio fio" acha "Assentar meio-fio") e oferece "+ Criar" na hora.

## 6. Linguagem falada
"Ganhos" em vez de proventos, "Período 21 a 20" em vez de ciclo de apuração, "Saldo de horas" em vez de banco de horas, "Folga remunerada" em vez de DSR.
No contracheque, cada termo técnico tem uma explicação curta ao tocar.

## 7. Alertas que não culpam
- "Os descontos estão maiores que o que você ganhou neste período. Confira em Ajustes."
- Dia sem registro não vira falta automaticamente: só conta como falta quando a pessoa marca, ou quando fecha o dia com menos horas.
- Toda regra que veio de modelo leva o selo "Sugestão — confira com seu sindicato ou contador".

## 8. Sempre ícone com texto
Barra inferior, chips, botões e status: nenhum ícone aparece sozinho. A aba ativa fica numa pílula verde, com o rótulo em negrito.

## 9. Movimento curto e opcional
Animações de 150 a 250ms (check, painel subindo, toast). Com "reduzir movimento" ligado no aparelho, elas são desligadas.

## 10. Acabamento premium (sem perder a robustez)
- **Área de marca:** verde profundo (#07352D) no topo da tela Hoje e no cartão "Você deve receber", com uma luz suave no canto (não é gradiente chamativo). O texto branco sobre esse verde passa de 13:1.
- **Valores como nos bancos:** "R$" e centavos menores que os reais. O leitor de tela lê o valor inteiro ("R$ 5.124,44").
- **Profundidade:** cartões com borda fininha e sombra em camadas, ícones em círculos coloridos e botão de ponto com sombra verde e brilho leve no topo. A barra inferior é translúcida.
- **Sol forte:** sombras e brilhos desligam, e entram bordas pretas de 2px. A aparência premium nunca vale mais que a leitura no sol.
