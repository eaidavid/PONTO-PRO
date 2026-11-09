import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { fazerOnboarding, preparar, semearHistorico } from "./ajuda";

const TEMAS = ["claro", "escuro", "sol"] as const;
const TELAS = ["hoje", "historico", "producao", "ganhos", "metas", "conta", "obras"] as const;

for (const tema of TEMAS) {
  test(`acessibilidade das telas (${tema})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await preparar(page, tema);
    await fazerOnboarding(page);
    await semearHistorico(page);
    for (const tela of TELAS) {
      await page.goto(`/${tela}`);
      await page.waitForLoadState("networkidle");
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(graves.map((v) => `${tela} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
    }
  });
}

test.describe("prints", () => {
  test.skip(!process.env.PRINTS, "rode com PRINTS=1 para gerar as imagens");
  for (const tema of TEMAS) {
    for (const largura of [360, 390, 768]) {
      test(`${tema} ${largura}px`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width: largura, height: 844 });
        await preparar(page, tema);
        const pasta = "../../docs/prints/produto";
        await page.goto("/");
        await page.getByRole("heading", { name: "Em que você trabalha?" }).waitFor();
        if (largura === 390) await page.screenshot({ path: `${pasta}/comecar-${tema}-${largura}.png` });
        await fazerOnboarding(page);
        await semearHistorico(page);
        for (const tela of TELAS) {
          await page.goto(`/${tela}`);
          await page.waitForLoadState("networkidle");
          await page.evaluate(() => document.fonts.ready);
          // na captura de página inteira, a barra fixa iria parar no meio da imagem
          await page.addStyleTag({ content: 'nav[aria-label="Principal"]{position:static!important}' });
          await page.screenshot({ path: `${pasta}/${tela}-${tema}-${largura}.png`, fullPage: largura === 390 });
        }
        if (largura === 390) {
          await page.goto("/ganhos");
          await page.getByRole("tab", { name: "Contracheque" }).click();
          await page.addStyleTag({ content: 'nav[aria-label="Principal"]{position:static!important}' });
          await page.screenshot({ path: `${pasta}/contracheque-${tema}-390.png`, fullPage: true });
          await page.goto("/historico");
          await page.getByRole("button", { name: /^qua 04/ }).click();
          await page.waitForTimeout(300);
          await page.screenshot({ path: `${pasta}/editar-dia-${tema}-390.png` });
        }
      });
    }
  }
});

test.describe("prints compacto", () => {
  test.skip(!process.env.PRINTS, "rode com PRINTS=1 para gerar as imagens");
  test("claro 390px compacto", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("pp-tamanho", "compacto"));
    await preparar(page, "claro");
    const pasta = "../../docs/prints/produto";
    await fazerOnboarding(page);
    await semearHistorico(page);
    for (const tela of ["hoje", "historico", "producao"]) {
      await page.goto(`/${tela}`);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `${pasta}/compacto-${tela}-390.png` });
    }
    await page.getByRole("button", { name: "Mais" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${pasta}/compacto-menu-mais-390.png` });
  });
});
