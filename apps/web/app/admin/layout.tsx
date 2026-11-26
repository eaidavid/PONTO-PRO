"use client";

import { cx } from "@ponto-pro/ui";
import { Activity, ClipboardList, Filter, Gauge, LifeBuoy, LogOut, MessageCircleHeart, Receipt, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { pedirAdmin } from "../../lib/admin-cliente";
import { NUVEM_CONFIGURADA } from "../../lib/nuvem/status";
import { Gota } from "../_vendas/gota";

const MENU = [
  { href: "/admin", rotulo: "Visão geral", icone: Gauge },
  { href: "/admin/funil", rotulo: "Funil", icone: Filter },
  { href: "/admin/pessoas", rotulo: "Pessoas", icone: Users },
  { href: "/admin/assinaturas", rotulo: "Assinaturas", icone: Receipt },
  { href: "/admin/convites", rotulo: "Convites do beta", icone: Ticket },
  { href: "/admin/opinioes", rotulo: "Opiniões", icone: MessageCircleHeart },
  { href: "/admin/suporte", rotulo: "Suporte", icone: LifeBuoy },
  { href: "/admin/lista-espera", rotulo: "Lista de espera", icone: ClipboardList },
  { href: "/admin/saude", rotulo: "Saúde", icone: Activity },
];

type Acesso = { tipo: "conferindo" } | { tipo: "ok"; email: string } | { tipo: "negado"; mensagem: string; entrar: boolean };

/** Moldura do painel: confere o acesso antes de mostrar qualquer coisa. O servidor confere de novo em cada pedido. */
export default function LayoutAdmin({ children }: { children: ReactNode }) {
  const caminho = usePathname();
  const [acesso, setAcesso] = useState<Acesso>({ tipo: "conferindo" });

  useEffect(() => {
    if (!NUVEM_CONFIGURADA) return setAcesso({ tipo: "negado", mensagem: "O painel precisa do banco configurado (Supabase).", entrar: false });
    pedirAdmin<{ email: string }>("/api/admin/eu")
      .then((r) => setAcesso({ tipo: "ok", email: r.email }))
      .catch((e: Error & { status?: number }) => setAcesso({ tipo: "negado", mensagem: e.message, entrar: e.status === 401 }));
  }, []);

  if (acesso.tipo !== "ok") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-6">
        <meta name="robots" content="noindex, nofollow" />
        <span className="display inline-flex items-center gap-2 text-titulo-3"><Gota className="size-7 text-primaria" /> Pingou admin</span>
        <p role="status" className="text-corpo text-texto-2">{acesso.tipo === "conferindo" ? "Conferindo o acesso…" : acesso.mensagem}</p>
        {acesso.tipo === "negado" && acesso.entrar && (
          <Link href="/entrar" className="inline-flex min-h-12 items-center justify-center self-start rounded-full bg-primaria px-5 text-corpo font-bold text-sobre-primaria">Entrar com a conta de administrador</Link>
        )}
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-fundo md:grid md:grid-cols-[224px_1fr]">
      <meta name="robots" content="noindex, nofollow" />
      <aside className="border-b border-borda bg-superficie md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3 md:py-5">
          <span className="display inline-flex items-center gap-2 text-destaque"><Gota className="size-6 text-primaria" /> Pingou admin</span>
        </div>
        <nav aria-label="Painel" className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] md:flex-col md:overflow-visible md:px-3">
          {MENU.map((m) => {
            const ativo = m.href === "/admin" ? caminho === "/admin" : caminho?.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                aria-current={ativo ? "page" : undefined}
                className={cx("inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-pequeno px-3 text-apoio font-bold whitespace-nowrap", ativo ? "bg-primaria-suave text-primaria-forte" : "text-texto-2 hover:bg-superficie-2")}
              >
                <m.icone aria-hidden className="size-4.5" /> {m.rotulo}
              </Link>
            );
          })}
        </nav>
        <div className="hidden px-4 pt-4 text-legenda text-texto-2 md:block">
          <p className="truncate">{acesso.email}</p>
          <Link href="/hoje" className="mt-2 inline-flex min-h-10 items-center gap-1.5 font-bold text-primaria-forte"><LogOut aria-hidden className="size-4" /> Voltar ao app</Link>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-5 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
