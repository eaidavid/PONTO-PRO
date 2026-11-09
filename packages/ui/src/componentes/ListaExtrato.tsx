import type { LinhaExtrato } from "@ponto-pro/core";
import { cx } from "../cx";

const COR: Record<LinhaExtrato["tipo"], string> = {
  titulo: "text-texto font-bold text-17",
  info: "text-texto-2",
  ganho: "text-texto",
  extra: "text-extra-texto",
  desconto: "text-erro-texto",
  total: "text-texto font-bold",
};

/** Passo a passo do cálculo, linha por linha. */
export function ListaExtrato({ linhas }: { linhas: LinhaExtrato[] }) {
  return (
    <ol className="flex flex-col divide-y divide-borda" aria-label="Passo a passo do cálculo">
      {linhas.map((l, i) => {
        const [conta, resultado] = l.texto.split(" = ");
        return (
          <li key={i} className={cx("numeros flex flex-col gap-0.5 py-3 text-17", COR[l.tipo])}>
            <span>{resultado !== undefined ? `${conta} =` : l.texto}</span>
            {resultado !== undefined && <span className="self-end text-20 font-bold">{resultado}</span>}
          </li>
        );
      })}
    </ol>
  );
}

