/** A gota com o cifrão: o símbolo do Pingou. */
export function Gota({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={className}>
      <path d="M256 70C256 70 128 222 128 316a128 128 0 0 0 256 0C384 222 256 70 256 70z" fill="currentColor" />
      <g fill="none" stroke="var(--marca)" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round">
        <path d="M256 222v188" />
        <path d="M302 262c-8-15-26-24-46-24-27 0-46 15-46 35 0 47 94 25 94 74 0 22-20 38-48 38-23 0-42-10-50-27" />
      </g>
    </svg>
  );
}
