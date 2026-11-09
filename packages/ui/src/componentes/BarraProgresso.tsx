import { cx } from "../cx";

export interface BarraProgressoProps {
  /** 0 a 1 */
  valor: number;
  rotulo: string;
  tom?: "primaria" | "extra" | "sucesso";
  /** Parte extra além de 100% (ex.: hora extra), 0 a 1. */
  excedente?: number;
  /** Marcas de régua (ex.: uma por hora da jornada). */
  marcas?: number;
  className?: string;
}

const TONS = { primaria: "bg-primaria", extra: "bg-extra", sucesso: "bg-sucesso" } as const;

export function BarraProgresso({ valor, rotulo, tom = "primaria", excedente = 0, marcas = 0, className }: BarraProgressoProps) {
  const v = Math.min(1, Math.max(0, valor));
  const ex = Math.min(1 - v, Math.max(0, excedente));
  const barra = (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cx("flex h-3 w-full overflow-hidden rounded-full bg-superficie-2 borda border-transparent", marcas < 2 && className)}
    >
      <div className={cx("h-full rounded-full transition-[width] duration-250", TONS[tom])} style={{ width: `${v * 100}%` }} />
      {ex > 0 && <div className="faixa-seguranca ml-0.5 h-full rounded-full bg-extra-suave" style={{ width: `${ex * 100}%` }} />}
    </div>
  );
  if (marcas < 2) return barra;
  // régua de fita métrica: um traço por divisão, maior na metade
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      {barra}
      <div aria-hidden className="relative h-2">
        {Array.from({ length: marcas + 1 }, (_, i) => (
          <span
            key={i}
            className={cx("absolute top-0 w-px bg-borda-forte", i === 0 || i === marcas || i * 2 === marcas ? "h-2" : "h-1")}
            style={{ left: `calc(${(i / marcas) * 100}% - ${i === marcas ? 1 : 0}px)` }}
          />
        ))}
      </div>
    </div>
  );
}
