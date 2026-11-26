/** Convites do beta: chave onde o app guarda o código até a pessoa ter conta. */
export const CHAVE_CONVITE = "pp-convite";

/** "Obra da Vila" → "OBRA-DA-VILA" */
export function codigoDoNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
}
