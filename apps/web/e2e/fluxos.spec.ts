import { expect, test } from "@playwright/test";
import { fazerOnboarding, preparar, semearHistorico } from "./ajuda";

test.beforeEach(async ({ page }) => {
  await preparar(page);
});

test("onboarding leva para a tela Hoje com o nome", async ({ page }) => {
  await fazerOnboarding(page);
  await expect(page.getByText("Bom dia, José")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bater entrada às 09:41" })).toBeVisible();
});

test("bater o ponto, desfazer e funcionar sem internet", async ({ page, context }) => {
  await fazerOnboarding(page);
  await page.getByRole("button", { name: "Bater entrada às 09:41" }).click();
  await expect(page.getByText("Entrada às 09:41")).toBeVisible();
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByRole("button", { name: "Bater entrada às 09:41" })).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText("Salvo no celular").first()).toBeVisible();
  await page.getByRole("button", { name: "Bater entrada às 09:41" }).click();
  await expect(page.getByRole("button", { name: "Sair para o almoço às 09:41" })).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole("button", { name: "Sair para o almoço às 09:41" })).toBeVisible();
});

test("lançar produção criando um serviço novo", async ({ page }) => {
  await fazerOnboarding(page);
  await page.getByRole("link", { name: "Lançar produção" }).click();
  await page.getByRole("searchbox").fill("Rejunte de pastilha");
  await page.getByRole("button", { name: "Criar “Rejunte de pastilha”" }).click();
  await page.getByRole("button", { name: "m²" }).click();
  await page.getByLabel("Preço por m²").fill("8,50");
  await page.getByLabel("Quantidade").fill("20");
  await page.getByLabel(/Observação/).fill("banheiro social");
  await expect(page.getByText("20 m² × R$ 8,50 = R$ 170,00")).toBeVisible();
  await page.getByRole("button", { name: "Lançar produção" }).click();
  await expect(page.getByText("Serviço criado. 20 m² · R$ 170,00")).toBeVisible();
  await page.goto("/historico?aba=producao");
  await expect(page.getByText("Rejunte de pastilha")).toBeVisible();
  await expect(page.getByText("banheiro social")).toBeVisible();

  // corrigir quantidade e observação depois
  await page.getByRole("button", { name: /^Editar Rejunte de pastilha/ }).click();
  const ed = page.getByRole("dialog", { name: "Rejunte de pastilha" });
  await ed.getByLabel("Quantidade").fill("22");
  await ed.getByLabel("Observação").fill("banheiro da suíte");
  await expect(ed.getByText("22 m² × R$ 8,50 = R$ 187,00")).toBeVisible();
  await ed.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("banheiro da suíte")).toBeVisible();
  await expect(page.getByText("R$ 187,00").first()).toBeVisible();
});

test("editar um dia em Registros", async ({ page }) => {
  await fazerOnboarding(page);
  await semearHistorico(page);
  await page.getByRole("link", { name: "Histórico" }).click();
  await page.getByRole("button", { name: /^qui 05/ }).click();
  await page.getByRole("dialog", { name: /Quinta, 05 de novembro/ }).getByRole("button", { name: "Ajustar o dia" }).click();
  const sheet = page.getByRole("dialog", { name: /Quinta, 05 de novembro/ });
  await sheet.getByRole("button", { name: "Falta" }).click();
  await sheet.getByRole("button", { name: "Salvar dia" }).click();
  await expect(page.getByText("Dia 05/11 salvo")).toBeVisible();
  await expect(page.getByRole("button", { name: /^qui 05/ }).getByText("Falta", { exact: true })).toBeVisible();
});

test("ganhos explicados e contracheque em PDF", async ({ page }) => {
  await fazerOnboarding(page);
  await semearHistorico(page);
  await page.getByRole("link", { name: "Ganhos" }).click();
  await page.getByRole("button", { name: "Por que deu isso?" }).click();
  const sheet = page.getByRole("dialog", { name: "Por que deu isso?" });
  await expect(sheet.getByText("Sábado 5h × R$ 25,00 + 50%", { exact: true }).first()).toBeVisible();
  await expect(sheet.getByText("Assentar meio-fio", { exact: true })).toBeVisible();
  await expect(sheet.getByText("50 m × R$ 12,00", { exact: true }).first()).toBeVisible();
  await expect(sheet.getByText("Você deve receber")).toBeVisible();
  await sheet.getByRole("button", { name: "Fechar" }).click();

  // resumo: copiar em texto
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copiar resumo" }).click();
  await expect(page.getByText("Resumo copiado. É só colar.")).toBeVisible();
  const resumo = await page.evaluate(() => navigator.clipboard.readText());
  expect(resumo).toContain("*Meus ganhos — período 21/10 a 20/11*");
  expect(resumo).toMatch(/Vai pingar: \*R\$ [\d.,]+\*/);

  await page.getByRole("tab", { name: "Contracheque" }).click();
  await expect(page.getByText("Estimativa — sem validade legal")).toBeVisible();
  await page.getByRole("button", { name: "Copiar contracheque" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("*Contracheque estimado — 21/10 a 20/11*");

  // PDF gerado no aparelho (sem a impressão do navegador)
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Baixar PDF" }).click()]);
  expect(download.suggestedFilename()).toBe("contracheque-21-10-a-20-11.pdf");
  const caminho = await download.path();
  const bytes = (await import("node:fs")).readFileSync(caminho);
  expect(bytes.subarray(0, 8).toString("latin1")).toBe("%PDF-1.4");
  expect(bytes.toString("latin1")).toContain("(Jos\\351)");
});

test("menu Mais: tamanho compacto e atalhos", async ({ page }) => {
  await fazerOnboarding(page);
  await page.getByRole("button", { name: "Mais" }).click();
  const menu = page.getByRole("dialog", { name: "Mais" });
  await menu.getByRole("radio", { name: /Compacto/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-tamanho", "compacto");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-tamanho", "compacto");
  await page.getByRole("button", { name: "Mais" }).click();
  await page.getByRole("dialog", { name: "Mais" }).getByRole("button", { name: /Obras/ }).click();
  await expect(page.getByRole("heading", { name: "Obras" })).toBeVisible();
  // "‹ Mais" volta para o menu, inclusive na Conta (que tem o topo verde)
  await page.getByRole("button", { name: "Voltar ao menu Mais" }).click();
  await page.getByRole("dialog", { name: "Mais" }).getByRole("button", { name: /Conta e regras/ }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await page.getByRole("button", { name: "Voltar ao menu Mais" }).click();
  await expect(page.getByRole("dialog", { name: "Mais" })).toBeVisible();
});

test("ponto esquecido: corrige em um toque e o status responde na hora", async ({ page }) => {
  await fazerOnboarding(page);
  await expect(page.getByRole("heading", { name: "Ainda não bateu a entrada" })).toBeVisible();
  await expect(page.getByText("Esqueceu de bater a entrada? Ela era às 07:00.")).toBeVisible();
  await page.getByRole("button", { name: "Bater entrada às 07:00" }).click();
  await expect(page.getByText("Ponto corrigido")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trabalhando" })).toBeVisible();
  const linha = page.getByRole("region", { name: "Linha do dia" });
  await expect(linha.getByText("Trabalhado")).toBeVisible();
  await expect(linha.getByText("2h41")).toBeVisible();
  await expect(linha.getByText("Falta", { exact: true })).toBeVisible();
  await expect(linha.getByText("6h19")).toBeVisible();
  await expect(linha.getByText("Saída prevista")).toBeVisible();
  await expect(linha.getByText("17:00")).toBeVisible();
});

test("toque duplo pede confirmação", async ({ page }) => {
  await fazerOnboarding(page);
  await page.getByRole("button", { name: "Bater entrada às 09:41" }).click();
  await page.getByRole("button", { name: "Sair para o almoço às 09:41" }).click();
  await expect(page.getByText("Você acabou de registrar. Toque de novo para confirmar.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Trabalhando/ })).toBeVisible();
  await page.getByRole("button", { name: "Sair para o almoço às 09:41" }).click();
  await expect(page.getByRole("heading", { name: "No almoço desde 09:41" })).toBeVisible();
});

test("abre sem internet depois do primeiro acesso", async ({ page, context }) => {
  await fazerOnboarding(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByText("Bom dia, José")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Bom dia, José")).toBeVisible();
  await page.goto("/ganhos");
  await expect(page.getByRole("heading", { name: "Vai pingar" })).toBeVisible();
  await expect(page.getByText("Cai em 05/12 · em 26 dias")).toBeVisible();
  await context.setOffline(false);
});

test("registros mostram se está tudo certo e restauração de backup", async ({ page }) => {
  await fazerOnboarding(page);
  await semearHistorico(page);
  await page.getByRole("link", { name: "Histórico" }).click();
  await expect(page.getByRole("status").filter({ hasText: "tudo certo" })).toBeVisible();
  await page.getByRole("button", { name: /^qui 05/ }).click();
  await page.getByRole("dialog", { name: /Quinta, 05 de novembro/ }).getByRole("button", { name: "Ajustar o dia" }).click();
  const sheet = page.getByRole("dialog", { name: /Quinta, 05 de novembro/ });
  await sheet.getByRole("button", { name: /^Saída/ }).click();
  await sheet.getByRole("button", { name: "Limpar este horário" }).click();
  await sheet.getByRole("button", { name: "Salvar dia" }).click();
  await expect(page.getByText("1 dia precisa de atenção")).toBeVisible();
  await expect(page.getByRole("button", { name: "qui 05: falta a saída" })).toBeVisible();

  const backup = JSON.stringify({
    app: "Ponto Pro",
    config: [{ chave: "perfil", valor: await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((ok) => { const r = indexedDB.open("ponto-pro"); r.onsuccess = () => ok(r.result); });
      const v = await new Promise((ok) => { const g = db.transaction("config").objectStore("config").get("perfil"); g.onsuccess = () => ok(g.result.valor); });
      db.close();
      return v;
    }) }],
    registros: [{ data: "2026-11-03", tipo: "falta", marcacoes: {} }, { data: "errado" }],
    itens: [],
    lancamentos: [],
  });
  await page.goto("/conta");
  await page.getByLabel("Arquivo de backup").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.getByText("Backup restaurado: 1 dia e 0 lançamentos (1 item com erro ficou de fora)")).toBeVisible();
});

test("histórico: filtros e busca ficam no endereço; lista de períodos", async ({ page }) => {
  await fazerOnboarding(page);
  await semearHistorico(page);
  await page.goto("/historico");
  await page.getByRole("button", { name: "Filtrar" }).click();
  const filtrar = page.getByRole("dialog", { name: "Filtrar" });
  await filtrar.getByRole("button", { name: "Faltas", exact: true }).click();
  await filtrar.getByRole("button", { name: "Ver resultados" }).click();
  await expect(page).toHaveURL(/f=faltas/);
  await expect(page.getByRole("button", { name: /^qua 28/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^qui 29/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Tirar o filtro Faltas" }).click();
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("searchbox").fill("04/11");
  await expect(page).toHaveURL(/q=04%2F11/);
  await expect(page.getByRole("button", { name: /^qua 04/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^ter 03/ })).toHaveCount(0);
  await page.getByRole("searchbox").fill("");
  await page.getByRole("button", { name: /21\/10 a 20\/11/ }).click();
  const sheet = page.getByRole("dialog", { name: "Períodos" });
  await expect(sheet.getByText("21/09 a 20/10")).toBeVisible();
  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/historico/);
});

test("+ Lançar: bater ponto e arrumar dia esquecido; Voltar fecha o painel", async ({ page }) => {
  await fazerOnboarding(page);
  await page.getByRole("button", { name: "Lançar" }).click();
  const menu = page.getByRole("dialog", { name: "Lançar" });
  await expect(menu).toBeVisible(); // o menu carrega no primeiro toque
  await page.goBack();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/\/hoje$/);
  await page.getByRole("button", { name: "Lançar" }).click();
  await menu.getByRole("button", { name: /Bater entrada agora/ }).click();
  await expect(page.getByText("Entrada às 09:41")).toBeVisible();
  await page.getByRole("button", { name: "Lançar" }).click();
  await menu.getByRole("button", { name: "dom 08" }).click();
  await expect(page).toHaveURL(/editar=2026-11-08/);
  await expect(page.getByRole("dialog", { name: /Domingo, 08 de novembro/ })).toBeVisible();
});

test("obras: criar, escolher na Hoje e filtrar o histórico", async ({ page }) => {
  await fazerOnboarding(page);
  await page.goto("/obras");
  await page.getByLabel("Nova obra").fill("Casa da Ana");
  await page.getByRole("button", { name: "Adicionar obra" }).click();
  await expect(page.getByText('Obra "Casa da Ana" criada')).toBeVisible();
  await page.goto("/hoje");
  await page.getByRole("button", { name: /^Obra/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Casa da Ana" }).click();
  await page.getByRole("button", { name: "Bater entrada às 09:41" }).click();
  await expect(page.getByText("Entrada às 09:41")).toBeVisible(); // espera gravar antes de sair da tela
  await page.goto("/historico");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await page.getByRole("dialog", { name: "Filtrar" }).getByRole("button", { name: "Casa da Ana", exact: true }).click();
  await page.getByRole("button", { name: "Ver resultados" }).click();
  await expect(page.getByRole("button", { name: /hoje 09/ })).toBeVisible();
});

test("feriado local muda o dia; conferir pagamento", async ({ page }) => {
  await fazerOnboarding(page);
  await page.goto("/conta");
  await page.getByRole("button", { name: /Feriados da sua cidade/ }).click();
  const painel = page.getByRole("dialog", { name: "Feriados da sua cidade" });
  await painel.getByLabel("Nome").fill("Aniversário da cidade");
  await painel.getByLabel("Dia e mês").fill("09/11");
  await painel.getByRole("button", { name: "Adicionar feriado" }).click();
  await expect(page.getByText("Feriado adicionado")).toBeVisible();
  await page.goto("/hoje");
  await expect(page.getByRole("heading", { name: "Hoje é feriado: Aniversário da cidade" })).toBeVisible();

  await page.goto("/ganhos?aba=periodos");
  await page.getByRole("button", { name: /21\/09 a 20\/10/ }).click();
  await page.getByLabel("Quanto você recebeu?").fill("100,00");
  // o período tem o feriado de 12/10 pago: a estimativa não é zero
  await expect(page.getByText(/Você recebeu R\$ [\d.,]+ a (menos|mais) que a estimativa\./)).toBeVisible();
  await expect(page.getByText("Pode ser que não tenham pago:")).toBeVisible();
  await page.getByRole("button", { name: "Salvar conferência" }).click();
  await expect(page.getByText(/Recebido R\$ 100,00/)).toBeVisible();
});

test("termos e privacidade: aceite obrigatório e nova versão pede aceite de novo", async ({ page }) => {
  await page.goto("/comecar");
  await page.getByRole("radio", { name: /Construção civil/ }).click();
  await page.getByRole("button", { name: "Pular" }).click();
  await expect(page.getByRole("button", { name: "Começar a usar" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /Li e aceito/ }).click();
  await page.getByRole("button", { name: "Começar a usar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);

  await page.goto("/termos");
  await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible();
  await expect(page.getByText("Não é ponto eletrônico oficial")).toBeVisible();
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Política de privacidade" })).toBeVisible();

  // simula quem aceitou uma versão antiga
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok) => { const r = indexedDB.open("ponto-pro"); r.onsuccess = () => ok(r.result); });
    await new Promise((ok) => {
      const tx = db.transaction("config", "readwrite");
      tx.objectStore("config").put({ chave: "consentimento", valor: { versao: "2020-01-01", em: "x", estatisticas: false }, atualizadoEm: "x" });
      tx.oncomplete = ok;
    });
    db.close();
  });
  await page.goto("/hoje");
  await expect(page.getByRole("heading", { name: "Atualizamos os termos" })).toBeVisible();
  await page.getByRole("dialog").getByRole("checkbox", { name: /Li e aceito/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Atualizamos os termos" })).toBeHidden();
});

test("planos: teste grátis libera tudo; depois do teste, recursos pagos mostram o bloqueio", async ({ page }) => {
  await fazerOnboarding(page);
  await page.goto("/planos");
  await expect(page.getByRole("region", { name: "Seu teste grátis" })).toContainText("0 de 14 dias");
  await expect(page.getByText("Faltam 14 dias.", { exact: false })).toBeVisible();
  await page.goto("/metas");
  await expect(page.getByText("Quanto quero receber neste período?")).toBeVisible();

  // simula o fim do teste
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok) => { const r = indexedDB.open("ponto-pro"); r.onsuccess = () => ok(r.result); });
    await new Promise((ok) => {
      const tx = db.transaction("config", "readwrite");
      tx.objectStore("config").put({ chave: "inicioUso", valor: "2026-10-01", atualizadoEm: "x" });
      tx.oncomplete = ok;
    });
    db.close();
  });
  await page.goto("/metas");
  await expect(page.getByRole("heading", { name: "Quanto quero receber?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver planos" })).toBeVisible();
  await page.goto("/historico?p=2026-09-21");
  await expect(page.getByRole("heading", { name: "Períodos passados" })).toBeVisible();
  await page.goto("/ganhos?aba=contracheque");
  await expect(page.getByRole("link", { name: /PDF no plano Individual/ })).toBeVisible();
  await page.goto("/planos");
  await expect(page.getByText("Grátis", { exact: true }).first()).toBeVisible();
});

test("sem servidor configurado, conta e assinatura avisam e o app segue no celular", async ({ page }) => {
  await fazerOnboarding(page);
  await page.goto("/planos/assinar?plano=individual");
  await expect(page.getByRole("heading", { name: "Assinar o Individual" })).toBeVisible();
  await expect(page.getByText("As assinaturas ainda não estão disponíveis")).toBeVisible();
  await page.goto("/entrar");
  await expect(page.getByText("As contas ainda não estão disponíveis")).toBeVisible();
  await page.goto("/hoje");
  await expect(page.getByRole("status").filter({ hasText: "Salvo no celular" })).toBeVisible();
});

test("página de vendas: demonstração do ponto, planos e botão que leva ao começo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Bateu o ponto, pingou." })).toBeVisible();

  // a demonstração bate as 4 etapas e o ganho do dia sobe
  const demo = page.getByRole("group", { name: "Demonstração do Pingou" });
  await expect(demo.getByText("R$ 0,00")).toBeAttached();
  await demo.getByRole("button", { name: "Bater entrada às 07:00" }).click();
  await expect(demo.getByText("R$ 125,00")).toBeAttached();
  await demo.getByRole("button", { name: /Sair para o almoço/ }).click();
  await demo.getByRole("button", { name: /Voltar do almoço/ }).click();
  await demo.getByRole("button", { name: "Bater saída às 17:00" }).click();
  await expect(demo.getByText("R$ 225,00")).toBeAttached();
  await page.getByRole("button", { name: /Ver de novo/ }).click();
  await expect(demo.getByRole("button", { name: "Bater entrada às 07:00" })).toBeVisible();

  // calculadora: 2h extras por semana a R$ 25,00 = R$ 37,50 × 2 × 4; o mínimo é meia hora
  await expect(page.getByText("R$ 300,00").first()).toBeAttached();
  await expect(page.getByText("R$ 3.600,00").first()).toBeAttached();
  await page.getByLabel("Horas extras por semana").fill("1");
  await expect(page.getByText("30 min", { exact: true })).toBeVisible();
  await expect(page.getByText("R$ 75,00").first()).toBeAttached();

  await expect(page.getByRole("heading", { name: "Individual" })).toBeVisible();
  await page.getByText("O teste grátis cobra alguma coisa?").click();
  await expect(page.getByText(/Só paga se decidir assinar/)).toBeVisible();

  await page.getByRole("link", { name: "Começar grátis" }).first().click();
  await expect(page).toHaveURL(/\/comecar$/);
  await expect(page.getByRole("heading", { name: "Em que você trabalha?" })).toBeVisible();
});

test("página de vendas: quem já usa o app continua vendo a página e tem o botão Abrir o app", async ({ page }) => {
  await preparar(page);
  await fazerOnboarding(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Bateu o ponto, pingou." })).toBeVisible();
  await page.getByRole("link", { name: "Abrir o app" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
});

test("Hoje mostra os últimos dias com horário e valor", async ({ page }) => {
  await fazerOnboarding(page);
  await semearHistorico(page);
  await page.goto("/hoje");
  const ultimos = page.getByRole("region", { name: "Últimos dias" });
  await expect(ultimos.getByRole("listitem")).toHaveCount(3);
  await expect(ultimos.getByRole("listitem").first()).toContainText("07:00 às 16:00");
  await expect(ultimos.getByRole("listitem").nth(1)).toContainText("R$ 825,00"); // 9h × R$ 25,00 + 50 m de meio-fio
  await ultimos.getByRole("link", { name: "Ver tudo" }).click();
  await expect(page).toHaveURL(/\/historico$/);
});

test("calculadora: salário vira valor da hora e dá para usar no perfil", async ({ page }) => {
  await fazerOnboarding(page);
  await page.goto("/calculadora");
  await page.getByLabel("Salário mensal").fill("2.200,00");
  await expect(page.getByText("R$ 10,00", { exact: true })).toBeVisible();
  await expect(page.getByText("R$ 15,00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "40h" }).click();
  await expect(page.getByText("R$ 11,00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Usar R$ 11,00 como meu valor da hora" }).click();
  await expect(page.getByText("Valor da hora agora é R$ 11,00")).toBeVisible();

  // conta de um dia: 07:00 às 18:00 com 1h de almoço e jornada de 8h48 = 10h, 1h12 de extra
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Saída: 15 minutos depois" }).click();
  await expect(page.getByLabel("Saída", { exact: true })).toHaveText("18:00");
  await expect(page.getByText("10h", { exact: true })).toBeVisible();
  await expect(page.getByText("1h12", { exact: true })).toBeVisible();
});

test("tabela de preços: muda vários preços de uma vez e mostra o total por área", async ({ page }) => {
  await fazerOnboarding(page);
  await semearHistorico(page);
  await page.goto("/producao");
  await expect(page.getByRole("region", { name: "No período, por área" })).toContainText("R$ 600,00");
  await page.getByRole("button", { name: "Preços" }).click();
  const tabela = page.getByRole("dialog", { name: "Tabela de preços" });
  await expect(tabela.getByRole("button", { name: "Nenhum preço mudou" })).toBeDisabled();
  const campos = tabela.getByRole("textbox", { name: /^Preço de / });
  await campos.nth(0).fill("10,00");
  await campos.nth(1).fill("20,00");
  await tabela.getByRole("button", { name: "Salvar 2 preços" }).click();
  await expect(page.getByText("2 preços salvos")).toBeVisible();
});

test("trazer os dados do Ponto Pro antigo, sem os dias de exemplo", async ({ page }) => {
  await fazerOnboarding(page);
  const antigo = {
    app: "Ponto Pro antigo",
    versao: 2,
    estado: {
      cfg: { nome: "José", empresa: "Construtora Sol", cargo: "Pedreiro" },
      days: {
        "2026-10-20": { t: ["07:00", "12:00", "13:00", "17:00"], type: "normal" }, // exemplo do app antigo
        "2026-11-06": { t: ["06:50", "12:00", "13:00", "17:10"], type: "normal" },
        "2026-11-07": { t: ["07:00", "", "", "12:00"], type: "normal" },
      },
      prod: [{ d: "2026-11-06", id: "mur", q: 10, t: "fundos" }],
      precos: { mur: 40 },
      custom: [],
      uni: {},
    },
  };
  await page.goto("/conta");
  await page.getByRole("button", { name: /Trazer do Ponto Pro antigo/ }).click();
  const painel = page.getByRole("dialog", { name: "Trazer do Ponto Pro antigo" });
  await painel.getByLabel("Dados copiados").fill(JSON.stringify(antigo));
  await expect(painel.getByText("Vai entrar: 2 dias de ponto e 1 lançamento de produção.")).toBeVisible();
  await expect(painel.getByText(/1 dia de exemplo/)).toBeVisible();
  await painel.getByRole("button", { name: "Trazer 2 dias e 1 lançamento" }).click();
  await expect(page.getByText("Pronto: 2 dias e 1 lançamento vieram do Ponto Pro antigo.")).toBeVisible();

  await page.goto("/historico?p=2026-10-21");
  await expect(page.getByRole("button", { name: /^sex 06/ })).toContainText("06:50");
  await page.goto("/historico?aba=producao");
  await expect(page.getByText("Muro de fechamento")).toBeVisible();
  await expect(page.getByText("fundos")).toBeVisible(); // a observação do app antigo vem junto
});

test("trazer só as regras do app antigo depois de já ter importado, e ver quanto deu cada dia", async ({ page }) => {
  await fazerOnboarding(page);
  const antigo = {
    app: "Ponto Pro antigo",
    versao: 2,
    estado: {
      cfg: { nome: "José", rate: 30, jornada: 8, almoco: 60, fecha: 20, x50: 50, x100: 100, inss: 8, outros: 0 },
      days: { "2026-11-06": { t: ["07:00", "12:00", "13:00", "17:00"], type: "normal" } }, // sex: 9h → 8h + 1h extra
      prod: [],
    },
  };
  const colar = async () => {
    await page.goto("/conta");
    await page.getByRole("button", { name: /Trazer do Ponto Pro antigo/ }).click();
    const painel = page.getByRole("dialog", { name: "Trazer do Ponto Pro antigo" });
    await painel.getByLabel("Dados copiados").fill(JSON.stringify(antigo));
    return painel;
  };
  // 1ª vez: só os dias (sem as regras)
  let painel = await colar();
  await expect(painel.getByText("Valor da hora: R$ 25,00 → R$ 30,00")).toBeVisible();
  await painel.getByRole("checkbox", { name: /Calcular igual ao app antigo/ }).click();
  await painel.getByRole("button", { name: "Trazer 1 dia e 0 lançamentos" }).click();
  await expect(page.getByText("Pronto: 1 dia e 0 lançamentos vieram do Ponto Pro antigo.")).toBeVisible();

  // 2ª vez: o dia já existe, mas dá para trazer as regras
  painel = await colar();
  await expect(painel.getByText("Não há dias nem lançamentos novos para trazer.")).toBeVisible();
  await painel.getByRole("button", { name: "Usar as regras do app antigo" }).click();
  await expect(page.getByText("Pronto: o Pingou agora calcula com as regras do app antigo.")).toBeVisible();

  // histórico mostra quanto deu o dia: 8h × 30 + 1h × 30 × 1,5 = 285,00
  await page.goto("/historico");
  await expect(page.getByRole("button", { name: /^sex 06/ })).toContainText("R$ 285,00");
});

test("resumo do dia: o que fez, quanto deu, alterações e atalhos para ajustar", async ({ page }) => {
  await fazerOnboarding(page);
  await semearHistorico(page);
  await page.goto("/historico");
  await expect(page.getByRole("button", { name: /^qui 05/ })).toContainText("produção R$ 600");
  await page.getByRole("button", { name: /^qui 05/ }).click();
  const dia = page.getByRole("dialog", { name: /Quinta, 05 de novembro/ });
  await expect(dia.getByRole("region", { name: "Quanto o dia rendeu" })).toContainText("R$ 825,00");
  await expect(dia.getByText("Começou a trabalhar")).toBeVisible();
  await expect(dia.getByText("Trabalhou 5h00")).toBeVisible();
  await expect(dia.getByText("Almoço de 1h00")).toBeVisible();
  await expect(dia.getByText("Foi embora")).toBeVisible();
  await expect(dia.getByText("50 m × R$ 12,00").first()).toBeVisible(); // na linha do tempo e na conta
  await expect(dia.getByText("O dia rendeu").last()).toBeVisible();

  // ajustar a saída e voltar para o resumo, com a alteração registrada
  await dia.getByRole("button", { name: "Ajustar o dia" }).click();
  const editor = page.getByRole("dialog", { name: /Quinta, 05 de novembro/ });
  await editor.getByRole("button", { name: /^Saída/ }).click();
  await editor.getByRole("button", { name: "5 min" }).first().click();
  await editor.getByRole("button", { name: "Salvar dia" }).click();
  await expect(page).toHaveURL(/dia=2026-11-05/);
  await dia.getByText(/Alterações \(\d+\)/).click();
  await expect(dia.getByText("Saída: 17:00 → 16:55")).toBeVisible();

  // apagar a produção pelo resumo, com desfazer
  await dia.getByRole("button", { name: "Apagar Assentar meio-fio" }).click();
  await expect(dia.getByText("Lançamento apagado")).toBeVisible();
  await dia.getByRole("button", { name: "Desfazer" }).click();
  await expect(dia.getByRole("button", { name: "Apagar Assentar meio-fio" })).toBeVisible();

  // lançar produção nesse dia
  await dia.getByRole("link", { name: "Produção" }).click();
  await expect(page).toHaveURL(/producao\?dia=2026-11-05/);
  await expect(page.getByRole("button", { name: /05\/11/ })).toBeVisible();
});

test("histórico com resumo do período, produção editável e conta organizada", async ({ page }) => {
  await fazerOnboarding(page);
  await semearHistorico(page);
  await page.goto("/historico");
  const resumo = page.getByRole("region", { name: "Resumo do período" });
  await expect(resumo).toContainText("Ganho até hoje");
  await expect(resumo).toContainText("trabalhadas");

  await page.goto("/historico?aba=producao");
  await expect(page.getByRole("region", { name: "Resumo da produção" })).toContainText("R$ 600,00");
  await page.getByRole("button", { name: /^Editar Assentar meio-fio/ }).click();
  await page.getByRole("dialog", { name: "Assentar meio-fio" }).getByRole("button", { name: "Apagar lançamento" }).click();
  await expect(page.getByText("Lançamento apagado")).toBeVisible();
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByRole("button", { name: /^Editar Assentar meio-fio/ })).toBeVisible();

  await page.goto("/conta");
  await page.getByRole("button", { name: /Tamanho, aparência e som/ }).click();
  await page.getByRole("dialog", { name: "Tamanho, aparência e som" }).getByRole("radio", { name: /Grande/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-tamanho", "grande");
  await expect(page.getByRole("link", { name: "Termos de uso" })).toBeAttached();
});
