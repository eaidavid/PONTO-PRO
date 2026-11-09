"use client";

import { Chip } from "@ponto-pro/ui";
import { Contrast, Monitor, Moon, Sun } from "lucide-react";
import { salvarPreferencias } from "../../lib/acoes";
import type { Preferencias, Tamanho, Tema } from "../../lib/db";

const TEMAS: { id: Tema; rotulo: string; icone: typeof Sun }[] = [
  { id: "auto", rotulo: "Automático", icone: Monitor },
  { id: "claro", rotulo: "Claro", icone: Sun },
  { id: "escuro", rotulo: "Escuro", icone: Moon },
  { id: "sol", rotulo: "Sol forte", icone: Contrast },
];

const TAMANHOS: { id: Tamanho; rotulo: string; amostra: string }[] = [
  { id: "compacto", rotulo: "Compacto", amostra: "text-[15px]" },
  { id: "padrao", rotulo: "Padrão", amostra: "text-[18px]" },
  { id: "grande", rotulo: "Grande", amostra: "text-[22px]" },
];

/** Aparência e tamanho da interface. Muda na hora, para o app todo. */
export function PreferenciasVisuais({ preferencias }: { preferencias: Preferencias }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-15 font-bold text-texto-2">Tamanho</span>
        <div role="radiogroup" aria-label="Tamanho da interface" className="grid grid-cols-3 gap-2">
          {TAMANHOS.map((t) => {
            const sel = preferencias.tamanho === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => salvarPreferencias({ ...preferencias, tamanho: t.id })}
                className={
                  sel
                    ? "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl bg-primaria text-sobre-primaria"
                    : "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl bg-superficie-2 text-texto borda active:scale-[0.97]"
                }
              >
                <span aria-hidden className={`display leading-none ${t.amostra}`}>Aa</span>
                <span className="text-13 font-bold">{t.rotulo}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-15 font-bold text-texto-2">Aparência</span>
        <div role="group" aria-label="Aparência" className="grid grid-cols-2 gap-2">
          {TEMAS.map((t) => (
            <Chip key={t.id} icone={t.icone} selecionado={preferencias.tema === t.id} onClick={() => salvarPreferencias({ ...preferencias, tema: t.id })}>
              {t.rotulo}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
