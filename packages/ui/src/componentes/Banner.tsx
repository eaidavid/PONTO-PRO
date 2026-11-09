import type { LucideIcon } from "lucide-react";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cx } from "../cx";

export interface BannerProps {
  tom?: "aviso" | "erro" | "info" | "sucesso";
  texto: string;
  acao?: { rotulo: string; onClick: () => void };
  className?: string;
}

const TONS: Record<NonNullable<BannerProps["tom"]>, { icone: LucideIcon; cls: string; icn: string }> = {
  aviso: { icone: TriangleAlert, cls: "bg-extra-suave border-extra", icn: "text-extra-texto" },
  erro: { icone: TriangleAlert, cls: "bg-erro-suave border-erro", icn: "text-erro-texto" },
  info: { icone: Info, cls: "bg-primaria-suave border-primaria", icn: "text-primaria" },
  sucesso: { icone: CircleCheck, cls: "bg-sucesso-suave border-sucesso", icn: "text-sucesso-texto" },
};

/** Alerta acolhedor, sem culpar a pessoa. */
export function Banner({ tom = "aviso", texto, acao, className }: BannerProps) {
  const t = TONS[tom];
  const Icone = t.icone;
  return (
    <div role={tom === "erro" ? "alert" : "status"} className={cx("flex gap-3 rounded-cartao border-l-4 p-4", t.cls, className)}>
      <Icone aria-hidden className={cx("mt-0.5 size-6 shrink-0", t.icn)} strokeWidth={2.25} />
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-17 text-texto">{texto}</p>
        {acao && (
          <button type="button" onClick={acao.onClick} className="-mx-2 min-h-12 self-start rounded-full px-2 text-17 font-bold text-primaria underline underline-offset-4">
            {acao.rotulo}
          </button>
        )}
      </div>
    </div>
  );
}
