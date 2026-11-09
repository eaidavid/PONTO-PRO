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
