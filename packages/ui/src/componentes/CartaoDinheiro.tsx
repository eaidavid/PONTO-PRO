import { formatarReais } from "@ponto-pro/core";
import { CircleHelp } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { ValorDinheiro } from "./ValorDinheiro";

export interface CartaoDinheiroProps {
  /** Líquido previsto, em centavos. */
  valor: number;
  jaGanhou: number;
  /** 0 a 1 */
  progresso: number;
  titulo?: string;
  /** Quando o dinheiro cai, ex.: "Cai em 05/12 · em 26 dias". */
  quando?: string;
  /** Complemento da linha de progresso, ex.: "faltam 9 dias de trabalho". */
  complemento?: string;
  carregando?: boolean;
  onPorQue?: () => void;
}

/**
 * O número mais importante do app: quanto vai pingar e quando.
 * Uma informação principal (o valor), uma de apoio (quando cai) e uma linha de progresso.
 */
export function CartaoDinheiro({ valor, jaGanhou, progresso, titulo = "Vai pingar", quando, complemento, carregando, onPorQue }: CartaoDinheiroProps) {
  const pct = Math.round(Math.min(1, Math.max(0, progresso)) * 100);
  return (
    <section aria-label={titulo} className="fundo-marca relative flex flex-col gap-4 overflow-hidden rounded-[24px] p-5 shadow-min">
      <div className="flex flex-col gap-1">
        <h2 className="text-17 font-bold text-sobre-marca-2">{titulo}</h2>
        {carregando ? <Skeleton className="h-14 w-60 bg-white/15" /> : <ValorDinheiro centavos={valor} tamanho="gg" className="text-sobre-marca" />}
        {quando && <p className="pt-1 text-17 font-bold text-marca-destaque">{quando}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label={`Você já ganhou ${pct}% do previsto`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--marca-trilho)]"
        >
          <div className="h-full rounded-full bg-marca-destaque transition-[width] duration-250" style={{ width: `${pct}%` }} />
        </div>
        <p className="numeros text-15 text-sobre-marca-2">
          Já ganhou <b className="text-sobre-marca">{formatarReais(jaGanhou)}</b>
          {complemento ? ` · ${complemento}` : ""}
        </p>
      </div>
      {onPorQue && (
        <button
          type="button"
          onClick={onPorQue}
          className="-mx-1 inline-flex min-h-12 items-center gap-2 self-start rounded-full px-1 text-17 font-bold text-sobre-marca underline decoration-white/50 underline-offset-4 active:bg-white/10"
        >
          <CircleHelp aria-hidden className="size-5" strokeWidth={2.25} />
          Por que deu isso?
        </button>
      )}
    </section>
  );
}
