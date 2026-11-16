"use client";

import { DIAS_TESTE, economiaAnual, formatarReais, PLANOS } from "@ponto-pro/core";
import { Banner, CabecalhoTela, cx, TituloSecao } from "@ponto-pro/ui";
import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEstado } from "../../../lib/estado";
import { medir } from "../../../lib/medir";
import { situacaoAtual } from "../../../lib/plano";
import { Carregando } from "../../carregando";
import { ListaEsperaTurma } from "../../lista-espera-turma";

const PRO = PLANOS.individual;
const ANUAL = PRO.precoAnual ?? 0;

function Itens({ itens, sobreMarca }: { itens: string[]; sobreMarca?: boolean }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {itens.map((r) => (
        <li key={r} className="flex items-start gap-2 text-15">
          <Check aria-hidden className={cx("mt-0.5 size-4 shrink-0", sobreMarca ? "text-marca-destaque" : "text-primaria")} strokeWidth={3} />
          {r}
        </li>
      ))}
    </ul>
  );
}

function Selo({ children, sobreMarca }: { children: ReactNode; sobreMarca?: boolean }) {
  return (
    <span className={cx("rounded-full px-2 py-0.5 font-sans text-13 font-bold tracking-normal", sobreMarca ? "bg-white/15 text-marca-destaque" : "bg-primaria-suave text-primaria-forte")}>
      {children}
    </span>
  );
}

export default function Planos() {
  const estado = useEstado();
  if (!estado?.perfil) return <Carregando />;
  const s = situacaoAtual(estado);
  const a = estado.assinatura;
  const temPro = s.plano === "individual" && !s.emTeste;
  const status = s.emTeste
    ? `Teste grátis do Pro: ${s.diasDeTeste === 1 ? "último dia" : `${s.diasDeTeste} dias restantes`}`
    : a && s.plano !== "gratis"
      ? `${PLANOS[s.plano].nome}${a.ciclo === "anual" ? " anual" : ""}, pago até ${a.pagoAte.slice(8, 10)}/${a.pagoAte.slice(5, 7)}`
      : "Você está no Grátis";

  return (
    <main className="flex flex-col gap-5 px-4 pb-6">
      <CabecalhoTela titulo="Planos" subtitulo={s.emTeste ? "Escolha quando quiser. Nada é cobrado no teste." : status} />
      {s.emTeste && (
        <section aria-label="Seu teste grátis" className="flex flex-col gap-2 rounded-[20px] bg-primaria-suave p-4">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-17 font-bold">Teste grátis do Pro</span>
            <span className="numeros text-15 font-bold text-primaria-forte">{DIAS_TESTE - s.diasDeTeste} de {DIAS_TESTE} dias</span>
          </p>
          <span aria-hidden className="h-2 overflow-hidden rounded-full bg-superficie">
            <span className="block h-full rounded-full bg-primaria" style={{ width: `${Math.round(((DIAS_TESTE - s.diasDeTeste) / DIAS_TESTE) * 100)}%` }} />
          </span>
          <p className="text-15 text-texto-2">
            {s.diasDeTeste === 1 ? "Hoje é o último dia." : `Faltam ${s.diasDeTeste} dias.`} Se não assinar, você continua no Grátis sem perder nada do que registrou.
          </p>
        </section>
      )}
      {s.aviso && <Banner tom="aviso" texto={s.aviso} />}

      <section aria-labelledby="plano-individual" className="fundo-marca flex flex-col gap-4 rounded-[20px] p-5">
        <div className="flex flex-col gap-1">
          <h2 id="plano-individual" className="display flex items-center gap-2 text-24">
            {PRO.nome}
            {temPro && <Selo sobreMarca>seu plano</Selo>}
            {s.emTeste && <Selo sobreMarca>em teste</Selo>}
          </h2>
          <p className="text-15 text-sobre-marca-2">{PRO.para}</p>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="display numeros text-32">{formatarReais(PRO.preco)}</span>
          <span className="text-15 text-sobre-marca-2">por mês, ou {formatarReais(ANUAL)} por ano</span>
        </p>
        <Itens itens={PRO.resumo} sobreMarca />
        {temPro ? (
          <p className="text-15 font-bold">Seu plano atual{a?.ciclo === "anual" ? ", cobrado por ano" : ""}.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              href="/planos/assinar?ciclo=anual"
              onClick={() => medir("clique_assinar", { ciclo: "anual" })}
              className="flex min-h-14 flex-col items-center justify-center rounded-full bg-white px-6 py-1.5 text-center text-[color:var(--marca)]"
            >
              <span className="text-17 font-bold">Assinar por ano: {formatarReais(ANUAL)}</span>
              <span className="numeros text-13 font-bold">sai por {formatarReais(Math.round(ANUAL / 12))} por mês, economia de {formatarReais(economiaAnual("individual"))}</span>
            </Link>
            <Link
              href="/planos/assinar?ciclo=mensal"
              onClick={() => medir("clique_assinar", { ciclo: "mensal" })}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-6 text-17 font-bold"
            >
              Assinar por mês: {formatarReais(PRO.preco)}
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="plano-gratis" className="flex flex-col gap-3 rounded-[20px] bg-superficie-2 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="plano-gratis" className="display flex items-center gap-2 text-24">
            {PLANOS.gratis.nome}
            {s.plano === "gratis" && <Selo>seu plano</Selo>}
          </h2>
          <p className="numeros text-17 font-bold">R$ 0</p>
        </div>
        <p className="text-15 text-texto-2">{PLANOS.gratis.para} Para sempre.</p>
        <Itens itens={PLANOS.gratis.resumo} />
      </section>

      <section aria-labelledby="plano-equipe" className="flex flex-col gap-3 rounded-[20px] border border-borda-forte p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="plano-equipe" className="display flex items-center gap-2 text-24">
            {PLANOS.equipe.nome}
            <Selo>em breve</Selo>
          </h2>
          <p className="numeros text-17 font-bold">
            {formatarReais(PLANOS.equipe.preco)}
            <span className="text-13 font-normal text-texto-2">/mês</span>
          </p>
        </div>
        <p className="text-15 text-texto-2">{PLANOS.equipe.para} Ainda não está à venda: entre na lista e avisamos quando abrir.</p>
        <Itens itens={PLANOS.equipe.resumo} />
        <ListaEsperaTurma origem="app" />
      </section>

      <section className="flex flex-col gap-2">
        <TituloSecao>Dúvidas</TituloSecao>
        <dl className="flex flex-col gap-3 px-1 text-15">
          <div>
            <dt className="font-bold">Posso cancelar quando quiser?</dt>
            <dd className="text-texto-2">Sim. O plano vale até o fim do período já pago, e depois volta ao Grátis sem perder seus registros.</dd>
          </div>
          <div>
            <dt className="font-bold">Como pago?</dt>
            <dd className="text-texto-2">Pix ou cartão, todo mês ou uma vez por ano. Quem processa é o Asaas; não guardamos dados de cartão.</dd>
          </div>
          <div>
            <dt className="font-bold">O teste grátis cobra alguma coisa?</dt>
            <dd className="text-texto-2">Não. Você usa tudo do Pro por {DIAS_TESTE} dias e só paga se assinar.</dd>
          </div>
          <div>
            <dt className="font-bold">No Grátis eu perco meus dados?</dt>
            <dd className="text-texto-2">Não. Seus registros ficam no celular e, com uma conta, guardados na nuvem, em qualquer plano.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
