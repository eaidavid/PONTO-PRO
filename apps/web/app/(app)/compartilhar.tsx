"use client";

import { BotaoPrincipal, useToast } from "@ponto-pro/ui";
import { Copy, MessageCircle } from "lucide-react";

/** Copia o texto: área de transferência quando dá; senão, o jeito antigo (campo escondido). */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const campo = document.createElement("textarea");
      campo.value = texto;
      campo.setAttribute("readonly", "");
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      const ok = document.execCommand("copy");
      campo.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Baixa um arquivo gerado no aparelho (PDF), sem internet. */
export function baixarArquivo(bytes: Uint8Array, nome: string, tipo = "application/pdf") {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** "Enviar no WhatsApp" e "Copiar": o mesmo texto nos dois. */
export function Compartilhar({ texto, oque }: { texto: string; oque: string }) {
  const { mostrar } = useToast();
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3">
      <BotaoPrincipal
        variante="secundaria"
        icone={MessageCircle}
        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener")}
      >
        Enviar no WhatsApp
      </BotaoPrincipal>
      <BotaoPrincipal
        variante="secundaria"
        larguraTotal={false}
        icone={Copy}
        aria-label={`Copiar ${oque}`}
        onClick={async () => mostrar({ texto: (await copiarTexto(texto)) ? `${oque[0]!.toUpperCase()}${oque.slice(1)} copiado. É só colar.` : "Não deu para copiar. Use Enviar no WhatsApp." })}
      >
        Copiar
      </BotaoPrincipal>
    </div>
  );
}
