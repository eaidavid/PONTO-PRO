import { formatarReais } from "@ponto-pro/core";
import { BarraProgresso } from "./BarraProgresso";
import { LinkPorQue } from "./LinkPorQue";
import { Skeleton } from "./Skeleton";

export interface CartaoDinheiroProps {
  /** Líquido previsto, em centavos. */
  valor: number;
  jaGanhou: number;
  falta: number;
  /** 0 a 1 */
  progresso: number;
  titulo?: string;
  carregando?: boolean;
  onPorQue?: () => void;
}

/** "Você deve receber": o número mais importante do app. */
export function CartaoDinheiro({ valor, jaGanhou, falta, progresso, titulo = "Você deve receber", carregando, onPorQue }: CartaoDinheiroProps) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-4 rounded-cartao bg-superficie p-5 borda shadow-min">
      <div className="flex flex-col gap-1">
        <h2 className="text-17 text-texto-2">{titulo}</h2>
        {carregando ? (
          <Skeleton className="h-14 w-60" />
        ) : (
          <p className="numeros whitespace-nowrap text-[min(var(--text-56),11vw)] leading-none font-bold tracking-tight text-texto">{formatarReais(valor)}</p>
        )}
      </div>
      <BarraProgresso valor={progresso} rotulo={`Você já ganhou ${Math.round(progresso * 100)}% do previsto`} />
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-15 text-texto-2">Já ganhou</dt>
          <dd className="numeros text-20 font-bold text-primaria">{formatarReais(jaGanhou)}</dd>
        </div>
        <div>
          <dt className="text-15 text-texto-2">Falta</dt>
          <dd className="numeros text-20 font-bold text-texto">{formatarReais(falta)}</dd>
        </div>
      </dl>
      {onPorQue && <LinkPorQue onClick={onPorQue} />}
    </section>
  );
}
