import { cx } from "../cx";

/** Bloco de carregamento. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block animate-pulse rounded-lg bg-superficie-2", className)} />;
}
