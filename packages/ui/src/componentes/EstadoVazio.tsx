import type { LucideIcon } from "lucide-react";
import { BotaoPrincipal } from "./BotaoPrincipal";

export interface EstadoVazioProps {
  icone: LucideIcon;
  frase: string;
  acao?: { rotulo: string; icone?: LucideIcon; onClick: () => void };
}

/** Estado vazio: ilustração simples, uma frase e uma ação. */
export function EstadoVazio({ icone: Icone, frase, acao }: EstadoVazioProps) {
  return (
    <div className="flex flex-col items-center gap-4 cartao px-6 py-8 text-center">
      <svg aria-hidden viewBox="0 0 120 96" className="h-24 w-30">
        <ellipse cx="60" cy="86" rx="40" ry="6" className="fill-[color:var(--superficie-2)]" />
        <rect x="24" y="12" width="72" height="64" rx="16" className="fill-[color:var(--primaria-suave)]" />
        <circle cx="96" cy="16" r="6" className="fill-[color:var(--extra)]" opacity=".9" />
        <circle cx="20" cy="70" r="4" className="fill-[color:var(--primaria)]" opacity=".5" />
      </svg>
      <span className="-mt-[92px] mb-6 flex size-12 items-center justify-center text-primaria">
        <Icone aria-hidden className="size-10" strokeWidth={2} />
      </span>
      <p className="display text-24 text-texto">{frase}</p>
      {acao && (
        <BotaoPrincipal icone={acao.icone} onClick={acao.onClick}>
          {acao.rotulo}
        </BotaoPrincipal>
      )}
    </div>
  );
}
