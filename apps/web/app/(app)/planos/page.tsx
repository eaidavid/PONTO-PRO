"use client";

import { formatarReais, PLANOS, type Plano } from "@ponto-pro/core";
import { Banner, CabecalhoTela, cx, TituloSecao } from "@ponto-pro/ui";
import { Check } from "lucide-react";
import Link from "next/link";
import { useEstado } from "../../../lib/estado";
import { situacaoAtual } from "../../../lib/plano";
import { Carregando } from "../../carregando";

const ORDEM: Plano[] = ["gratis", "individual", "equipe"];

export default function Planos() {
  const estado = useEstado();
  if (!estado?.perfil) return <Carregando />;
  const s = situacaoAtual(estado);
  const a = estado.assinatura;
  const status = s.emTeste
    ? `Teste grátis do Individual: ${s.diasDeTeste === 1 ? "último dia" : `${s.diasDeTeste} dias restantes`}`
    : a && s.plano !== "gratis"
      ? `${PLANOS[s.plano].nome} · pago até ${a.pagoAte.slice(8, 10)}/${a.pagoAte.slice(5, 7)}`
      : "Grátis";

  return (
    <main className="flex flex-col gap-5 px-4 pb-6">
      <CabecalhoTela titulo="Planos" subtitulo={status} />
      {s.aviso && <Banner tom="aviso" texto={s.aviso} />}

      {ORDEM.map((id) => {
        const p = PLANOS[id];
        const atual = s.plano === id && !s.emTeste;
        return (
          <section key={id} aria-labelledby={`plano-${id}`} className={cx("flex flex-col gap-3 rounded-[20px] p-5", id === "individual" ? "fundo-marca" : "bg-superficie-2")}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`plano-${id}`} className="display text-24">{p.nome}</h2>
              <p className="numeros text-17 font-bold">
                {p.preco ? formatarReais(p.preco) : "R$ 0"}
                <span className={cx("text-13 font-normal", id === "individual" ? "text-sobre-marca-2" : "text-texto-2")}>
                  {p.preco ? (p.porTrabalhador ? " por pessoa/mês" : "/mês") : ""}
                </span>
              </p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {p.resumo.map((r) => (
                <li key={r} className="flex items-start gap-2 text-15">
                  <Check aria-hidden className={cx("mt-0.5 size-4 shrink-0", id === "individual" ? "text-marca-destaque" : "text-primaria")} strokeWidth={3} />
                  {r}
                </li>
              ))}
            </ul>
            {id !== "gratis" &&
              (atual ? (
                <p className="text-15 font-bold">Seu plano atual</p>
              ) : (
                <Link
                  href={`/planos/assinar?plano=${id}`}
                  className={cx(
                    "inline-flex min-h-14 items-center justify-center rounded-full px-6 text-17 font-bold",
                    id === "individual" ? "bg-white text-[color:var(--marca)]" : "bg-primaria text-sobre-primaria",
                  )}
                >
                  Assinar o {p.nome}
                </Link>
              ))}
          </section>
        );
      })}

      <section className="flex flex-col gap-2">
        <TituloSecao>Dúvidas</TituloSecao>
        <dl className="flex flex-col gap-3 px-1 text-15">
          <div>
            <dt className="font-bold">Posso cancelar quando quiser?</dt>
            <dd className="text-texto-2">Sim. O plano vale até o fim do mês já pago, e depois volta ao Grátis sem perder seus registros.</dd>
          </div>
          <div>
            <dt className="font-bold">Como pago?</dt>
            <dd className="text-texto-2">Pix Automático ou cartão, todo mês. Quem processa é a Asaas; não guardamos dados de cartão.</dd>
          </div>
          <div>
            <dt className="font-bold">O teste grátis cobra alguma coisa?</dt>
            <dd className="text-texto-2">Não. Você usa tudo do Individual por 14 dias e só paga se assinar.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
