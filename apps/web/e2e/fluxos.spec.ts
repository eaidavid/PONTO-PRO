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
  await expect(page.getByText("20 m² × R$ 8,50 = R$ 170,00")).toBeVisible();
  await page.getByRole("button", { name: "Lançar produção" }).click();
  await expect(page.getByText("Serviço criado. 20 m² · R$ 170,00")).toBeVisible();
  await page.goto("/historico?aba=producao");
  await expect(page.getByText("Rejunte de pastilha")).toBeVisible();
});

test("editar um dia em Registros", async ({ page }) => {
  await fazerOnboarding(page);
  await semearHistorico(page);
  await page.getByRole("link", { name: "Histórico" }).click();
  await page.getByRole("button", { name: /^qui 05/ }).click();
  const sheet = page.getByRole("dialog");
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
  await expect(sheet.getByText("Sábado 5h × R$ 25,00 + 50% =")).toBeVisible();
  await expect(sheet.getByText("Assentar meio-fio 50 m × R$ 12,00 =")).toBeVisible();
  await sheet.getByRole("button", { name: "Fechar" }).click();

  await page.getByRole("tab", { name: "Contracheque" }).click();
  await expect(page.getByText("Estimativa — sem validade legal")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: "../../docs/prints/contracheque-estimado.pdf", format: "A4", printBackground: true });
  await page.emulateMedia({ media: "screen" });
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
});

test("ponto esquecido: corrige em um toque e o status responde na hora", async ({ page }) => {
  await fazerOnboarding(page);
  await expect(page.getByRole("heading", { name: "Ainda não bateu a entrada" })).toBeVisible();
  await expect(page.getByText("Esqueceu de bater a entrada? Ela era às 07:00.")).toBeVisible();
  await page.getByRole("button", { name: "Bater entrada às 07:00" }).click();
  await expect(page.getByText("Ponto corrigido")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trabalhando" })).toBeVisible();
  await expect(page.getByText("2h41 de 9h · sai às 17:00")).toBeVisible();
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
  const sheet = page.getByRole("dialog");
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
  await expect(page.getByText("Teste grátis do Individual: 14 dias restantes")).toBeVisible();
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

  // calculadora: 2h extras por semana a R$ 25,00 = R$ 37,50 × 2 × 4
  await expect(page.getByText("R$ 300,00").first()).toBeAttached();
  await expect(page.getByText("R$ 3.600,00").first()).toBeAttached();
  await page.getByLabel("Horas extras por semana").fill("4");
  await expect(page.getByText("R$ 600,00").first()).toBeAttached();

  await expect(page.getByRole("heading", { name: "Individual" })).toBeVisible();
  await page.getByText("O teste grátis cobra alguma coisa?").click();
  await expect(page.getByText(/Só paga se decidir assinar/)).toBeVisible();

  await page.getByRole("link", { name: "Começar grátis" }).first().click();
  await expect(page).toHaveURL(/\/comecar$/);
  await expect(page.getByRole("heading", { name: "Em que você trabalha?" })).toBeVisible();
});

test("página de vendas: quem já usa o app vai direto para Hoje", async ({ page }) => {
  await preparar(page);
  await fazerOnboarding(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/hoje$/);
});
