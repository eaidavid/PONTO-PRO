import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "../cx";

export interface ItemResumo {
  rotulo: string;
  icone: LucideIcon;
  valor: ReactNode;
  tom?: "normal" | "primaria" | "extra" | "erro";
}

const COR = { normal: "text-texto", primaria: "text-primaria", extra: "text-extra-texto", erro: "text-erro-texto" } as const;

/**
 * Até 3 números lado a lado num cartão só. Quando o texto está grande e não cabe,
 * vira um item por linha (consulta de contêiner), sem cortar nada.
 */
export function ResumoNumeros({ itens, rotulo, children }: { itens: ItemResumo[]; rotulo: string; children?: ReactNode }) {
  return (
    <section aria-label={rotulo} className="cartao @container flex flex-col gap-1 px-4 pt-3 pb-1">
      <dl className="grid grid-cols-1 divide-y divide-borda @[19rem]:grid-cols-3 @[19rem]:divide-x @[19rem]:divide-y-0">
        {itens.map((x, i) => (
          <div
            key={x.rotulo}
            className={cx(
              "flex items-center justify-between gap-2 py-2.5 @[19rem]:flex-col @[19rem]:items-start @[19rem]:justify-start @[19rem]:gap-1.5 @[19rem]:py-1",
              i === 0 ? "@[19rem]:pr-3" : "@[19rem]:px-3",
              !children && "@[19rem]:pb-3",
            )}
          >
            <dt className="flex items-center gap-1.5 text-13 font-bold leading-tight text-texto-2">
              <x.icone aria-hidden className="size-4 shrink-0" />
              {x.rotulo}
            </dt>
            <dd className={cx("leading-none", COR[x.tom ?? "normal"])}>{x.valor}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}
