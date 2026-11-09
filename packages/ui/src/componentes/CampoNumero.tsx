import { type InputHTMLAttributes, useId } from "react";
import { cx } from "../cx";

export interface CampoNumeroProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  /** Texto antes do número (ex.: "R$"). */
  prefixo?: string;
  /** Texto depois do número (ex.: "m"). Sempre visível. */
  sufixo?: string;
  erro?: string;
  ajuda?: string;
}

/** Campo grande com teclado numérico. */
export function CampoNumero({ rotulo, valor, onChange, prefixo, sufixo, erro, ajuda, className, ...resto }: CampoNumeroProps) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-17 font-bold">{rotulo}</label>
      <div
        className={cx(
          "flex min-h-14 items-center gap-2 rounded-cartao bg-superficie px-4 border-2 focus-within:border-primaria",
          erro ? "border-erro" : "border-borda-forte",
        )}
      >
        {prefixo && <span className="text-20 text-texto-2">{prefixo}</span>}
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
          aria-invalid={!!erro || undefined}
          aria-describedby={erro || ajuda ? `${id}-msg` : undefined}
          className="numeros min-w-0 flex-1 bg-transparent text-24 font-bold outline-none placeholder:text-texto-2/70"
          {...resto}
        />
        {sufixo && <span className="text-20 font-bold text-texto-2">{sufixo}</span>}
      </div>
      {(erro || ajuda) && (
        <p id={`${id}-msg`} className={cx("text-15", erro ? "font-bold text-erro-texto" : "text-texto-2")}>{erro ?? ajuda}</p>
      )}
    </div>
  );
}
