import { cx } from "../cx";

export interface BarraProgressoProps {
  /** 0 a 1 */
  valor: number;
  rotulo: string;
  tom?: "primaria" | "extra" | "sucesso";
  /** Parte extra além de 100% (ex.: hora extra), 0 a 1. */
  excedente?: number;
  className?: string;
}

const TONS = { primaria: "bg-primaria", extra: "bg-extra", sucesso: "bg-sucesso" } as const;

export function BarraProgresso({ valor, rotulo, tom = "primaria", excedente = 0, className }: BarraProgressoProps) {
  const v = Math.min(1, Math.max(0, valor));
  const ex = Math.min(1 - v, Math.max(0, excedente));
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cx("flex h-3 w-full overflow-hidden rounded-full bg-superficie-2 borda border-transparent", className)}
    >
      <div className={cx("h-full rounded-full transition-[width] duration-250", TONS[tom])} style={{ width: `${v * 100}%` }} />
      {ex > 0 && <div className="ml-0.5 h-full rounded-full bg-extra" style={{ width: `${ex * 100}%` }} />}
    </div>
  );
}
