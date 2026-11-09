import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const TEMAS = ["claro", "escuro", "sol"] as const;

async function abrir(page: Page, tema: (typeof TEMAS)[number]) {
  await page.addInitScript((t) => localStorage.setItem("pp-tema", t), tema);
  await page.goto("/ui");
  await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();
}

test("protótipo: bater o ponto do dia inteiro, com desfazer", async ({ page }) => {
  await abrir(page, "claro");
  const hoje = page.locator("#hoje");
  await hoje.getByRole("button", { name: "Recomeçar o dia" }).click();
  const etapas = hoje.getByRole("list", { name: "Etapas do dia" });

  await hoje.getByRole("button", { name: "Bater entrada às 09:41" }).click();
  await expect(page.getByText("Entrada às 09:41")).toBeVisible();
  await expect(etapas.getByText("09:41")).toHaveCount(1);

  await hoje.getByRole("button", { name: "Sair para o almoço às 09:41" }).click();
  await page.getByRole("button", { name: "Desfazer" }).last().click();
  await expect(hoje.getByRole("button", { name: "Sair para o almoço às 09:41" })).toBeVisible();

  await hoje.getByRole("button", { name: "Sair para o almoço às 09:41" }).click();
  await hoje.getByRole("button", { name: "Voltar do almoço às 09:41" }).click();
  await hoje.getByRole("button", { name: "Bater saída às 09:41" }).click();
  await expect(hoje.getByRole("button", { name: "Dia encerrado" })).toBeDisabled();
});

test("cálculo explicado: 'Por que deu isso?' mostra o passo a passo", async ({ page }) => {
  await abrir(page, "claro");
  await page.locator("#dinheiro").getByRole("button", { name: "Por que deu isso?" }).click();
  const sheet = page.getByRole("dialog", { name: "Por que deu isso?" });
  await expect(sheet.getByText("Sábado 5h × R$ 25,00 + 50% =")).toBeVisible();
  await expect(sheet.getByText("Assentar meio-fio 50 m × R$ 12,00 =")).toBeVisible();
  await sheet.getByRole("button", { name: "Fechar" }).click();
  await expect(sheet).toBeHidden();
});

test("busca de serviço cria item novo com prévia", async ({ page }) => {
  await abrir(page, "claro");
  const busca = page.locator("#busca");
  await busca.getByRole("searchbox").first().fill("Rejunte de pastilha");
  await busca.getByRole("button", { name: "Criar “Rejunte de pastilha”" }).click();
  await busca.getByRole("button", { name: "m²" }).click();
  await busca.getByLabel("Preço por m²").fill("8,50");
  await busca.getByLabel("Quantidade").first().fill("20");
  await expect(busca.getByText("20 m² × R$ 8,50 = R$ 170,00")).toBeVisible();
  await busca.getByRole("button", { name: "Lançar produção" }).first().click();
  await expect(page.getByText("Serviço criado e lançado: Rejunte de pastilha")).toBeVisible();
});

for (const tema of TEMAS) {
  test(`acessibilidade sem violações graves (${tema})`, async ({ page }) => {
    await abrir(page, tema);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
  });
}

test.describe("prints", () => {
  test.skip(!process.env.PRINTS, "rode com PRINTS=1 para gerar as imagens");
  for (const tema of TEMAS) {
    for (const largura of [360, 390, 768]) {
      test(`${tema} ${largura}px`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 900 });
        await abrir(page, tema);
        await page.evaluate(() => document.fonts.ready);
        // a barra fixa do rodapé cobre os recortes das seções
        await page.addStyleTag({ content: 'body > * nav[aria-label="Principal"].fixed{display:none}' });
        const pasta = "../../docs/prints/m1";
        await page.locator("#hoje").screenshot({ path: `${pasta}/hoje-${tema}-${largura}.png` });
        if (largura === 390) {
          for (const id of ["botao-ponto", "etapas", "dinheiro", "registros", "busca", "banners", "navegacao", "cores"]) {
            await page.locator(`#${id}`).screenshot({ path: `${pasta}/${id}-${tema}-390.png` });
          }
          await page.locator("#seletor").getByRole("button", { name: "Editar terça, 04/11" }).click();
          await page.waitForTimeout(400);
          await page.screenshot({ path: `${pasta}/sheet-dia-${tema}-390.png` });
        }
      });
    }
  }
});
