"use client";

import { Banner, useToast } from "@ponto-pro/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CHAVE_CONVITE } from "../../lib/beta";
import { lerLocal, medir } from "../../lib/medir";
import { sincronizarAgora, useStatusNuvem } from "../../lib/nuvem/status";

/**
 * Convite do beta guardado no aparelho: assim que a pessoa tiver conta, libera o Pro de cortesia.
 * Sem conta, mostra o lembrete na tela Hoje.
 */
export function ConviteBetaPendente({ naHoje }: { naHoje: boolean }) {
  const nuvem = useStatusNuvem();
  const router = useRouter();
  const { mostrar } = useToast();
  const [codigo, setCodigo] = useState<string | null>(null);
  const tentou = useRef(false);

  useEffect(() => setCodigo(lerLocal(CHAVE_CONVITE)), []);

  useEffect(() => {
    if (!codigo || !nuvem.usuario || tentou.current) return;
    tentou.current = true;
    (async () => {
      try {
        const { supabase } = await import("../../lib/nuvem/supabase");
        const token = (await supabase().auth.getSession()).data.session?.access_token;
        if (!token) return;
        const r = await fetch("/api/beta/resgatar", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ codigo }) });
        const corpo = (await r.json().catch(() => ({}))) as { dias?: number; erro?: string; motivo?: string };
        // sem conta ou falha de rede: tenta de novo depois; os outros motivos encerram o convite
        if (r.status === 401 || r.status >= 500) {
          tentou.current = false;
          return;
        }
        try {
          localStorage.removeItem(CHAVE_CONVITE);
        } catch {
          /* sem armazenamento */
        }
        setCodigo(null);
        if (r.ok) {
          medir("convite_resgatado", { dias: corpo.dias ?? 0 });
          mostrar({ texto: `Pronto: ${corpo.dias} dias de Pro liberados. Obrigado por testar o Pingou!` });
          sincronizarAgora();
        } else if (corpo.erro) {
          mostrar({ texto: corpo.erro });
        }
      } catch {
        tentou.current = false;
      }
    })();
  }, [codigo, nuvem.usuario, mostrar]);

  if (!codigo || nuvem.usuario || !naHoje || !nuvem.configurado) return null;
  return (
    <div className="px-4 pt-3">
      <Banner
        tom="info"
        texto="Seu convite do beta está guardado. Crie sua conta para liberar o Pro de cortesia."
        acao={{ rotulo: "Criar conta", onClick: () => router.push("/entrar") }}
      />
    </div>
  );
}
