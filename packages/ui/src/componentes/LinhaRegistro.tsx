import { formatarDuracao, type Marcacoes, seloDia, type TipoDia } from "@ponto-pro/core";
import { cx } from "../cx";
import { SeloTipoDia } from "./TipoDia";

export interface LinhaRegistroProps {
  data: string;
  marcacoes?: Marcacoes;
  tipo?: TipoDia;
  trabalhadoMin: number;
  saldoMin: number;
  feriado?: string;
  hoje?: boolean;
  emAndamento?: boolean;
  fimDeSemana?: boolean;
  onClick?: () => void;
}

/** Linha da lista de registros: selo do dia, horários, total e saldo colorido. */
export function LinhaRegistro({ data, marcacoes = {}, tipo = "normal", trabalhadoMin, saldoMin, feriado, hoje, emAndamento, fimDeSemana, onClick }: LinhaRegistroProps) {
  const [dia, num] = seloDia(data).split(" ");
  const horarios = marcacoes.entrada ? `${marcacoes.entrada} – ${marcacoes.saida ?? "…"}` : null;
  const mostrarTipo = tipo !== "normal" || (!!feriado && !horarios);
  const cor = saldoMin > 0 ? "text-extra-texto" : saldoMin < 0 ? "text-erro-texto" : "text-texto-2";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={hoje ? "date" : undefined}
      className={cx(
        "flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-superficie-2",
        fimDeSemana && !hoje && "bg-superficie-2",
        hoje && "bg-primaria-suave shadow-[inset_4px_0_0_var(--primaria)]",
      )}
    >
      <span className={cx("flex w-12 shrink-0 flex-col items-center rounded-xl py-1", hoje ? "bg-primaria text-sobre-primaria" : "text-texto")}>
        <span className="text-13 font-bold">{hoje ? "hoje" : dia}</span>
        <span className="numeros text-20 font-bold leading-none">{num}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {mostrarTipo ? (
          <span><SeloTipoDia tipo={feriado && tipo === "normal" ? "feriado" : tipo} /></span>
        ) : horarios ? (
          <span className="numeros text-17 font-bold">{horarios}</span>
        ) : (
          <span className="text-15 text-texto-2">Sem registro</span>
        )}
        {feriado && <span className="truncate text-13 text-texto-2">{feriado}</span>}
        {mostrarTipo && horarios && <span className="numeros text-15">{horarios}</span>}
      </span>
      <span className="numeros flex shrink-0 flex-col items-end">
        {emAndamento ? (
          <span className="text-15 font-bold text-primaria-forte">trabalhando</span>
        ) : (
          <>
            <span className="text-17 font-bold">{trabalhadoMin > 0 ? formatarDuracao(trabalhadoMin) : "–"}</span>
            <span className={cx("inline-flex items-center gap-1.5 text-15 font-bold", cor)}>
              {saldoMin > 0 && <span aria-hidden className="faixa-seguranca size-3 rounded-[3px] ring-1 ring-extra" />}
              {saldoMin === 0 ? "0h" : formatarDuracao(saldoMin, { sinal: true })}
              <span className="sr-only">{saldoMin > 0 ? " de hora extra" : saldoMin < 0 ? " faltando" : " de saldo"}</span>
            </span>
          </>
        )}
      </span>
    </button>
  );
}
