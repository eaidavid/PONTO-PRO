import { formatarDuracao, formatarReais, type Marcacoes, seloDia, type TipoDia } from "@ponto-pro/core";
import { cx } from "../cx";
import { TIPOS_DIA } from "./TipoDia";

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
  /** Dia de folga pela escala (sem registro): vira uma linha curta e discreta. */
  folgaDaEscala?: boolean;
  nota?: string;
  obra?: string;
  /** Quanto o dia rendeu (bruto, em centavos). Mostrado à direita quando maior que zero. */
  valor?: number;
  onClick?: () => void;
}

/**
 * Um dia na lista: a informação principal em destaque, uma linha de apoio discreta
 * e uma etiqueta colorida só quando há hora extra ou falta. Nada de "0h" e "–" repetidos.
 */
export function LinhaRegistro({
  data,
  marcacoes = {},
  tipo = "normal",
  trabalhadoMin,
  saldoMin,
  feriado,
  hoje,
  emAndamento,
  fimDeSemana,
  folgaDaEscala,
  nota,
  obra,
  valor,
  onClick,
}: LinhaRegistroProps) {
  const [dia, num] = seloDia(data).split(" ");
  const horarios = marcacoes.entrada ? `${marcacoes.entrada} – ${marcacoes.saida ?? "agora"}` : null;
  const especial = tipo !== "normal" ? TIPOS_DIA[tipo] : feriado && !horarios ? TIPOS_DIA.feriado : null;
  const discreto = !horarios && !especial && !hoje;

  const principal = especial ? (
    <span className={cx("inline-flex items-center gap-1.5 text-17 font-bold", tipo === "falta" ? "text-erro-texto" : "text-texto")}>
      <especial.icone aria-hidden className="size-4.5" strokeWidth={2.25} />
      {feriado && tipo === "normal" ? feriado : especial.rotulo}
    </span>
  ) : horarios ? (
    <span className="numeros text-17 font-bold">{horarios}</span>
  ) : (
    <span className="text-15 text-texto-2">{folgaDaEscala ? "Folga" : "Sem registro"}</span>
  );

  const apoio = [
    horarios && especial ? horarios : null,
    trabalhadoMin > 0 && !emAndamento ? formatarDuracao(trabalhadoMin) : null,
    feriado && tipo !== "normal" ? feriado : null,
    obra,
    nota,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={hoje ? "date" : undefined}
      className={cx(
        "flex w-full items-center gap-4 px-4 text-left active:bg-superficie-2",
        discreto ? "min-h-12 py-2" : "min-h-16 py-3",
        hoje && "bg-primaria-suave/60 shadow-[inset_4px_0_0_var(--primaria)]",
      )}
    >
      <span className={cx("flex w-10 shrink-0 flex-col items-center leading-none", (fimDeSemana || discreto) && !hoje && "text-texto-2")}>
        <span className="text-13 font-bold">{hoje ? "hoje" : dia}</span>{" "}
        <span className={cx("display mt-0.5", discreto ? "text-17" : "text-24")}>{num}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {principal}
        {apoio.length > 0 && <span className="numeros truncate text-15 text-texto-2">{apoio.join(" · ")}</span>}
      </span>
      {(() => {
        const etiqueta =
          !emAndamento && saldoMin !== 0 ? (
            <span
              className={cx(
                "numeros shrink-0 rounded-full px-2.5 py-1 font-bold",
                valor ? "text-13" : "text-15",
                saldoMin > 0 ? "bg-extra-suave text-extra-texto" : "bg-erro-suave text-erro-texto",
              )}
            >
              {formatarDuracao(saldoMin, { sinal: true })}
              <span className="sr-only">{saldoMin > 0 ? " de hora extra" : " faltando"}</span>
            </span>
          ) : null;
        if (!valor) return etiqueta;
        return (
          <span className="flex shrink-0 flex-col items-end gap-1">
            <span className="numeros text-17 font-bold">
              {formatarReais(valor)}
              <span className="sr-only"> no dia</span>
            </span>
            {etiqueta}
          </span>
        );
      })()}
    </button>
  );
}
