import { formatarReais } from "@ponto-pro/core";
import { cx } from "../cx";

export interface ValorDinheiroProps {
  centavos: number;
  /** Tamanho do número principal. */
  tamanho?: "m" | "g" | "gg";
  className?: string;
}

const TAM = {
  m: "text-24",
  g: "text-32",
  gg: "text-[min(var(--text-56),12vw)]",
} as const;

/** Valor em reais com "R$" e centavos menores, como nos bancos digitais. Lido por inteiro no leitor de tela. */
export function ValorDinheiro({ centavos, tamanho = "m", className }: ValorDinheiroProps) {
  const txt = formatarReais(centavos);
  const m = /^(−?)R\$ ([\d.]+),(\d{2})$/.exec(txt);
  if (!m) return <span className={cx("numeros font-bold", TAM[tamanho], className)}>{txt}</span>;
  const [, sinal, reais, cent] = m;
  return (
    <span className={cx("numeros inline-flex items-baseline whitespace-nowrap font-bold leading-none tracking-tight", TAM[tamanho], className)}>
      <span className="sr-only">{txt}</span>
      <span aria-hidden className="mr-[0.18em] self-start pt-[0.12em] text-[0.42em] font-bold">{sinal}R$</span>
      <span aria-hidden>{reais}</span>
      <span aria-hidden className="text-[0.55em]">,{cent}</span>
    </span>
  );
}
