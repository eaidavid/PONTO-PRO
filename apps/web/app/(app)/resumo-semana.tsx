"use client";

import { calcularPeriodo, diaDaSemana, formatarDuracao, formatarReais, ganhosPorDia, inicioDaSemana, somarDias } from "@ponto-pro/core";
import { CalendarCheck, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Estado } from "../../lib/estado";
import { medir } from "../../lib/medir";

const fechado = (k: string) => {
  try {
    return localStorage.getItem(k) === "1";
  } catch {
    return false;
  }
};

/**
 * Resumo da semana que passou, na tela Hoje às segundas e terças (grátis).
 * Mostra o que a pessoa fez com o próprio esforço: horas, hora extra e quanto rendeu.
 */
export function ResumoSemana({ estado, hoje }: { estado: Estado; hoje: string }) {
  const inicio = somarDias(inicioDaSemana(hoje), -7);
  const chave = `pp-resumo-${inicio}`;
  const [visivel, setVisivel] = useState(() => !fechado(chave));
  const dia = diaDaSemana(hoje);

  const resumo = useMemo(() => {
    if (!estado.perfil || (dia !== 1 && dia !== 2)) return null;
    const periodo = { inicio, fim: somarDias(inicio, 6) };
    const registros = estado.registros.filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim);
    if (!registros.length) return null;
    const r = calcularPeriodo({ perfil: estado.perfil, periodo, registros, lancamentos: estado.lancamentos, itens: estado.itens, feriadosLocais: estado.feriadosLocais, modo: "dia" });
    if (!r.horas.trabalhadoMin) return null;
    const ganho = ganhosPorDia({ perfil: estado.perfil, periodo, registros, lancamentos: estado.lancamentos, itens: estado.itens, feriadosLocais: estado.feriadosLocais }).reduce((t, g) => t + g.total, 0);
    return { horas: r.horas.trabalhadoMin, extra: r.horas.extraMin, ganho };
  }, [estado, inicio, dia]);

  if (!resumo || !visivel) return null;
  return (
    <section aria-label="Sua semana passada" className="relative flex flex-col gap-2 rounded-grande bg-superficie-2 p-4 pr-12">
      <button
        type="button"
        aria-label="Fechar resumo"
        onClick={() => {
          try {
            localStorage.setItem(chave, "1");
          } catch {
            /* sem armazenamento */
          }
          setVisivel(false);
        }}
        className="absolute top-1 right-1 flex size-12 items-center justify-center rounded-full text-texto-2 active:bg-superficie"
      >
        <X aria-hidden className="size-5" />
      </button>
      <p className="flex items-center gap-2 text-apoio font-bold text-texto-2">
        <CalendarCheck aria-hidden className="size-4" /> Sua semana passada
      </p>
      <p className="text-corpo">
        <b className="numeros">{formatarDuracao(resumo.horas)}</b> trabalhadas
        {resumo.extra > 0 ? (
          <>
            , com <b className="numeros text-extra-texto">{formatarDuracao(resumo.extra)}</b> de hora extra
          </>
        ) : null}
        . Rendeu <b className="numeros">{formatarReais(resumo.ganho)}</b>.
      </p>
      <Link href="/historico" onClick={() => medir("resumo_semana", { acao: "historico" })} className="self-start text-apoio font-bold text-primaria-forte underline underline-offset-4">
        Ver dia por dia
      </Link>
    </section>
  );
}
