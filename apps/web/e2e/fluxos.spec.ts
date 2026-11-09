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
  await expect(page.getByText("Serviço criado. 20 m² lançados")).toBeVisible();
  await expect(page.getByRole("list").getByText("Rejunte de pastilha")).toBeVisible();
});

test("editar um dia em Registros", async ({ page }) => {
  await fazerOnboarding(page);
  await semearHistorico(page);
  await page.getByRole("link", { name: "Registros" }).click();
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
  await page.getByRole("dialog", { name: "Mais" }).getByRole("link", { name: /Metas/ }).click();
  await expect(page.getByRole("heading", { name: "Metas" })).toBeVisible();
});

test("ponto esquecido: corrige em um toque e o status responde na hora", async ({ page }) => {
  await fazerOnboarding(page);
  await expect(page.getByRole("heading", { name: "Ainda não bateu a entrada" })).toBeVisible();
  await expect(page.getByText("Esqueceu de bater a entrada? Ela era às 07:00.")).toBeVisible();
  await page.getByRole("button", { name: "Bater entrada às 07:00" }).click();
  await expect(page.getByText("Ponto corrigido")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trabalhando há 2h41" })).toBeVisible();
  await expect(page.getByText("Saída prevista às 17:00.")).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Você deve receber" })).toBeVisible();
  await context.setOffline(false);
});

test("registros mostram se está tudo certo e restauração de backup", async ({ page }) => {
  await fazerOnboarding(page);
  await semearHistorico(page);
  await page.getByRole("link", { name: "Registros" }).click();
  await expect(page.getByText("Tudo certo neste período.")).toBeVisible();
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
