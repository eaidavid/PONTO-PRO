import { type InputHTMLAttributes, useId } from "react";

export interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  ajuda?: string;
}

/** Campo de texto grande, com rótulo sempre visível. */
export function CampoTexto({ rotulo, valor, onChange, ajuda, ...resto }: CampoTextoProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-17 font-bold">{rotulo}</label>
      <input
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-14 rounded-cartao border-2 border-borda-forte bg-superficie px-4 text-20 outline-none focus:border-primaria"
        aria-describedby={ajuda ? `${id}-a` : undefined}
        {...resto}
      />
      {ajuda && <p id={`${id}-a`} className="text-15 text-texto-2">{ajuda}</p>}
    </div>
  );
}
