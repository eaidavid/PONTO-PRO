import { Skeleton } from "@ponto-pro/ui";

/** Esqueleto enquanto o banco local abre (leva milissegundos). */
export function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-8">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 w-full rounded-[24px]" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-16 w-full rounded-full" />
    </div>
  );
}
