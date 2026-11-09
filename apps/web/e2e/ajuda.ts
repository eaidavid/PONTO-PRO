import { expect, type Page } from "@playwright/test";

/** 09/11/2026 09:41 em São Paulo. */
export const AGORA = new Date("2026-11-09T12:41:00Z");

export async function preparar(page: Page, tema: "claro" | "escuro" | "sol" = "claro") {
  await page.clock.setFixedTime(AGORA);
  await page.addInitScript((t) => localStorage.setItem("pp-tema", t), tema);
}

/** Faz o onboarding como o José: construção, por hora, R$ 25,00. */
export async function fazerOnboarding(page: Page, nome = "José") {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Em que você trabalha?" })).toBeVisible();
  await page.getByRole("radio", { name: /Construção civil/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: /Por hora/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("44h", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Valor da hora").fill("25,00");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Pronto!" })).toBeVisible();
  await expect(page.getByText("Sua semana: 44h. Sábado conta como hora extra a 50%.")).toBeVisible();
  await page.getByLabel("Como quer ser chamado?").fill(nome);
  await page.getByRole("button", { name: "Começar a usar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
}

/** Histórico do período 21/10 a 08/11 (como a escala, com uma falta, um dia longo e um sábado). */
export async function semearHistorico(page: Page) {
  await page.evaluate(async () => {
    const abrir = () =>
      new Promise<IDBDatabase>((ok, erro) => {
        const r = indexedDB.open("ponto-pro");
        r.onsuccess = () => ok(r.result);
        r.onerror = () => erro(r.error);
      });
    const db = await abrir();
    const tx = db.transaction(["registros", "lancamentos"], "readwrite");
    const reg = tx.objectStore("registros");
    const em = new Date().toISOString();
    const d0 = Date.UTC(2026, 9, 21);
    for (let i = 0; i < 19; i++) {
      const dt = new Date(d0 + i * 86400000);
      const data = dt.toISOString().slice(0, 10);
      const dow = dt.getUTCDay();
      if (data === "2026-10-28") reg.put({ data, tipo: "falta", marcacoes: {}, atualizadoEm: em });
      else if (data === "2026-10-31") reg.put({ data, tipo: "normal", marcacoes: { entrada: "07:00", saida: "12:00" }, atualizadoEm: em });
      else if (data === "2026-11-04") reg.put({ data, tipo: "normal", marcacoes: { entrada: "07:00", almoco: "12:00", volta: "13:00", saida: "17:30" }, atualizadoEm: em });
      else if (dow >= 1 && dow <= 5 && data !== "2026-11-02")
        reg.put({ data, tipo: "normal", marcacoes: { entrada: "07:00", almoco: "12:00", volta: "13:00", saida: dow === 5 ? "16:00" : "17:00" }, atualizadoEm: em });
    }
    reg.put({ data: "2026-11-09", tipo: "normal", marcacoes: { entrada: "07:02" }, atualizadoEm: em });
    tx.objectStore("lancamentos").put({ id: "l1", data: "2026-11-05", itemId: "construcao.externos.1", quantidade: 50, precoUnitario: 1200, atualizadoEm: em });
    await new Promise((ok) => (tx.oncomplete = ok));
    db.close();
  });
  // o app lê o banco ao abrir: recarrega para ver o histórico
  await page.reload();
}
