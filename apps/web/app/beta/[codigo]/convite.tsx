"use client";

import { Check, Clock, Cloud, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CHAVE_CONVITE } from "../../../lib/beta";
import { useEstado } from "../../../lib/estado";
import { gravarLocal, medir } from "../../../lib/medir";
import { Gota } from "../../_vendas/gota";

type Situacao = { tipo: "conferindo" } | { tipo: "valido"; dias: number } | { tipo: "invalido" };

export function ConviteBeta({ codigo }: { codigo: string }) {
  const router = useRouter();
  const estado = useEstado();
  const [s, setS] = useState<Situacao>({ tipo: "conferindo" });

  useEffect(() => {
    fetch(`/api/beta?codigo=${encodeURIComponent(codigo)}`)
      .then((r) => r.json() as Promise<{ valido: boolean; dias?: number }>)
      .then((r) => setS(r.valido && r.dias ? { tipo: "valido", dias: r.dias } : { tipo: "invalido" }))
      .catch(() => setS({ tipo: "invalido" }));
  }, [codigo]);

  function comecar() {
    if (s.tipo === "valido") {
      gravarLocal(CHAVE_CONVITE, codigo);
      gravarLocal("pp-origem", "beta");
      medir("convite_aceito", { dias: s.dias });
    }
    router.push(estado?.perfil ? "/hoje" : "/comecar");
  }

  return (
    <main className="fundo-marca flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 px-6 py-10">
        <span className="display inline-flex items-center gap-2 text-titulo-3">
          <Gota className="size-7 text-marca-destaque" /> Pingou
        </span>
        {s.tipo === "conferindo" && <p role="status" className="text-corpo text-sobre-marca-2">Conferindo o convite…</p>}
        {s.tipo === "valido" && (
          <>
            <div className="flex flex-col gap-3">
              <p className="text-apoio font-bold uppercase tracking-wide text-marca-destaque">Convite do beta</p>
              <h1 className="display text-titulo-1 leading-tight">Você ganhou {s.dias} dias de Pro grátis.</h1>
              <p className="text-corpo text-sobre-marca-2">
                Bata o ponto no celular e veja quanto vai receber, com hora extra, feriados e produção. Sem cartão e sem compromisso.
              </p>
            </div>
            <ul className="flex flex-col gap-3 text-corpo">
              <li className="flex gap-3"><Clock aria-hidden className="mt-0.5 size-5 shrink-0 text-marca-destaque" /> Leva 1 minuto para começar.</li>
              <li className="flex gap-3"><Cloud aria-hidden className="mt-0.5 size-5 shrink-0 text-marca-destaque" /> Crie a conta no app para liberar os {s.dias} dias e guardar seus registros.</li>
              <li className="flex gap-3"><MessageCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-marca-destaque" /> Em troca, só pedimos a sua opinião depois de uma semana.</li>
            </ul>
          </>
        )}
        {s.tipo === "invalido" && (
          <div className="flex flex-col gap-3">
            <h1 className="display text-titulo-2 leading-tight">Esse convite não vale mais.</h1>
            <p className="text-corpo text-sobre-marca-2">As vagas acabaram ou o link foi desligado. Você ainda pode usar o Pingou grátis, com 14 dias de teste do Pro.</p>
          </div>
        )}
        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={comecar}
            disabled={s.tipo === "conferindo"}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-6 text-corpo font-bold text-[color:var(--marca)] disabled:opacity-60"
          >
            <Check aria-hidden className="size-5" /> {estado?.perfil ? "Abrir o app" : "Começar agora"}
          </button>
        </div>
      </div>
    </main>
  );
}
