import type { LucideIcon } from "lucide-react";
import { Hammer, House, LayoutGrid, ListChecks, Target, User, Wallet } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cx } from "../cx";

export interface Aba {
  id: string;
  rotulo: string;
  icone: LucideIcon;
  /** Link da aba. Sem href, a aba é um botão (ex.: "Mais"). */
  href?: string;
  onClick?: () => void;
}

/** Navegação compacta: 3 telas principais e um botão "Mais" que agrupa o resto. */
export function abasCompactas(onMais: () => void): Aba[] {
  return [
    { id: "hoje", rotulo: "Hoje", icone: House, href: "/hoje" },
    { id: "registros", rotulo: "Registros", icone: ListChecks, href: "/registros" },
    { id: "ganhos", rotulo: "Ganhos", icone: Wallet, href: "/ganhos" },
    { id: "mais", rotulo: "Mais", icone: LayoutGrid, onClick: onMais },
  ];
}

/** As 5 abas completas (a quarta muda conforme o perfil). */
export function abasPadrao(abaExtra: "producao" | "metas"): Aba[] {
  return [
    { id: "hoje", rotulo: "Hoje", icone: House, href: "/hoje" },
    { id: "registros", rotulo: "Registros", icone: ListChecks, href: "/registros" },
    abaExtra === "producao"
      ? { id: "producao", rotulo: "Produção", icone: Hammer, href: "/producao" }
      : { id: "metas", rotulo: "Metas", icone: Target, href: "/metas" },
    { id: "ganhos", rotulo: "Ganhos", icone: Wallet, href: "/ganhos" },
    { id: "conta", rotulo: "Conta", icone: User, href: "/conta" },
  ];
}

type LinkProps = { href: string; className?: string; children: ReactNode; "aria-current"?: "page" };

export interface BarraNavegacaoProps {
  abas: Aba[];
  ativa: string;
  /** Componente de link (ex.: next/link). Padrão: <a>. */
  link?: ComponentType<LinkProps>;
  fixa?: boolean;
}

/** Barra inferior compacta: ícone com rótulo, aba ativa dentro de uma pílula verde. */
export function BarraNavegacao({ abas, ativa, link: Link = "a" as unknown as ComponentType<LinkProps>, fixa = true }: BarraNavegacaoProps) {
  return (
    <nav
      aria-label="Principal"
      className={cx(
        "z-40 border-t-[length:var(--borda-largura)] border-[color:var(--borda-cartao)] bg-[color-mix(in_srgb,var(--superficie)_88%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl shadow-painel print:hidden",
        fixa && "fixed inset-x-0 bottom-0",
      )}
    >
      <ul className="mx-auto grid max-w-[560px]" style={{ gridTemplateColumns: `repeat(${abas.length}, minmax(0, 1fr))` }}>
        {abas.map((a) => {
          const ativo = a.id === ativa;
          const Icone = a.icone;
          const conteudo = (
            <>
              <span className={cx("flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200", ativo ? "sombra-botao bg-primaria text-sobre-primaria" : "text-texto-2")}>
                <Icone aria-hidden className="size-5" strokeWidth={ativo ? 2.5 : 2} />
              </span>
              <span className={cx("text-13 leading-none", ativo ? "font-bold text-primaria" : "text-texto-2")}>{a.rotulo}</span>
            </>
          );
          const cls = "flex min-h-[60px] w-full flex-col items-center justify-center gap-1 px-1 py-1.5";
          return (
            <li key={a.id}>
              {a.href ? (
                <Link href={a.href} aria-current={ativo ? "page" : undefined} className={cls}>
                  {conteudo}
                </Link>
              ) : (
                <button type="button" onClick={a.onClick} aria-haspopup="dialog" className={cls}>
                  {conteudo}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
