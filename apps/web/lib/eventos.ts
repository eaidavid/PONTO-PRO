/** A tela Conta tem topo verde: ela mesma desenha o "‹ Mais" e pede para o layout abrir o menu com este evento. */
export const EVENTO_ABRIR_MAIS = "pingou:abrir-mais";

export function abrirMenuMais() {
  window.dispatchEvent(new Event(EVENTO_ABRIR_MAIS));
}
