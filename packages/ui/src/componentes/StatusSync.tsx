import { CloudCheck, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { cx } from "../cx";

export type EstadoSync = "local" | "sincronizando" | "sincronizado" | "erro";

const INFO = {
  local: { icone: CloudOff, texto: "Salvo no celular" },
  sincronizando: { icone: RefreshCw, texto: "Enviando…" },
  sincronizado: { icone: CloudCheck, texto: "Sincronizado" },
  erro: { icone: TriangleAlert, texto: "Vamos tentar enviar de novo" },
} as const;

/** Status discreto de sincronização. */
export function StatusSync({ estado, className }: { estado: EstadoSync; className?: string }) {
  const i = INFO[estado];
  const Icone = i.icone;
  return (
    <span role="status" className={cx("inline-flex items-center gap-1.5 text-13", estado === "erro" ? "font-bold text-erro-texto" : "text-texto-2", className)}>
      <Icone aria-hidden className={cx("size-4", estado === "sincronizando" && "animate-spin")} />
      {i.texto}
    </span>
  );
}
