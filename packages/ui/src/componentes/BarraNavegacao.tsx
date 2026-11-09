import type { LucideIcon } from "lucide-react";
import { Hammer, House, ListChecks, Target, User, Wallet } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cx } from "../cx";

export interface Aba {
  id: string;
  rotulo: string;
  icone: LucideIcon;
  href: string;
}

/** As 5 abas. A quarta muda conforme o perfil: Produção ou Metas. */
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
  /** Posição fixa no rodapé. Desligue para mostrar na vitrine. */
  fixa?: boolean;
}

/** Barra inferior: ícone com rótulo, aba ativa dentro de uma pílula verde. */
export function BarraNavegacao({ abas, ativa, link: Link = "a" as unknown as ComponentType<LinkProps>, fixa = true }: BarraNavegacaoProps) {
  return (
    <nav
      aria-label="Principal"
      className={cx(
        "z-40 border-t-[length:var(--borda-largura)] border-[color:var(--borda-cartao)] bg-[color-mix(in_srgb,var(--superficie)_88%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl shadow-painel",
        fixa && "fixed inset-x-0 bottom-0",
      )}
    >
      <ul className="mx-auto grid max-w-[560px] grid-cols-5">
        {abas.map((a) => {
          const ativo = a.id === ativa;
          const Icone = a.icone;
          return (
            <li key={a.id}>
              <Link
                href={a.href}
                aria-current={ativo ? "page" : undefined}
                className="flex min-h-[72px] flex-col items-center justify-center gap-1 px-1 py-2"
              >
                <span className={cx("flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200", ativo ? "sombra-botao bg-primaria text-sobre-primaria" : "text-texto-2")}>
                  <Icone aria-hidden className="size-6" strokeWidth={ativo ? 2.5 : 2} />
                </span>
                <span className={cx("text-13", ativo ? "font-bold text-primaria" : "text-texto-2")}>{a.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
