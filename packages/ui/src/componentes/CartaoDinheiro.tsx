import { CircleHelp } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { ValorDinheiro } from "./ValorDinheiro";

export interface CartaoDinheiroProps {
  /** Líquido previsto, em centavos. */
  valor: number;
  jaGanhou: number;
  falta: number;
  /** 0 a 1 */
  progresso: number;
  titulo?: string;
  /** Linha pequena no topo (ex.: "Período 21/10 a 20/11"). */
  periodo?: string;
  carregando?: boolean;
  onPorQue?: () => void;
}

/** "Você deve receber": o número mais importante do app, num cartão de marca. */
export function CartaoDinheiro({ valor, jaGanhou, falta, progresso, titulo = "Você deve receber", periodo, carregando, onPorQue }: CartaoDinheiroProps) {
  const pct = Math.round(Math.min(1, Math.max(0, progresso)) * 100);
  return (
    <section aria-label={titulo} className="fundo-marca relative flex flex-col gap-5 overflow-hidden rounded-[24px] p-5 shadow-min">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-17 font-bold text-sobre-marca-2">{titulo}</h2>
        {periodo && <span className="numeros shrink-0 whitespace-nowrap rounded-full bg-white/12 px-3 py-1 text-13 font-bold text-sobre-marca">{periodo}</span>}
      </div>
      {carregando ? (
        <Skeleton className="h-14 w-60 bg-white/15" />
      ) : (
        <ValorDinheiro centavos={valor} tamanho="gg" className="text-sobre-marca" />
      )}
      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label={`Você já ganhou ${pct}% do previsto`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--marca-trilho)]"
        >
          <div className="h-full rounded-full bg-marca-destaque transition-[width] duration-250" style={{ width: `${pct}%` }} />
        </div>
        <span className="numeros text-13 text-sobre-marca-2">{pct}% do previsto</span>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/8 p-3">
          <dt className="text-15 text-sobre-marca-2">Já ganhou</dt>
          <dd><ValorDinheiro centavos={jaGanhou} className="text-marca-destaque" /></dd>
        </div>
        <div className="rounded-2xl bg-white/8 p-3">
          <dt className="text-15 text-sobre-marca-2">Falta</dt>
          <dd><ValorDinheiro centavos={falta} className="text-sobre-marca" /></dd>
        </div>
      </dl>
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
