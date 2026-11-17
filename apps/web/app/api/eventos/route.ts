import { z } from "zod";
import { supabaseServidor } from "../../../lib/cobranca/servidor";
import { dentroDoLimite, ipDe } from "../../../lib/limite";

export const dynamic = "force-dynamic";

const Lote = z.object({
  aparelho: z.string().regex(/^[a-z0-9-]{8,40}$/),
  eventos: z
    .array(
      z.object({
        evento: z.string().regex(/^[a-z_]{2,40}$/),
        dados: z.record(z.string().max(40), z.union([z.string().max(80), z.number()])).default({}),
      }),
    )
    .min(1)
    .max(30),
});

/** Eventos do funil (sem dado pessoal). Sem banco configurado, só descarta. */
export async function POST(req: Request) {
  if (!dentroDoLimite(`eventos:${ipDe(req)}`, 60, 10 * 60_000)) return new Response(null, { status: 204 });
  const sb = supabaseServidor();
  if (!sb) return new Response(null, { status: 204 });
  const r = Lote.safeParse(await req.json().catch(() => null));
  if (!r.success) return new Response(null, { status: 400 });
  const linhas = r.data.eventos.map((e) => ({ evento: e.evento, aparelho: r.data.aparelho, dados: e.dados }));
  const { error } = await sb.from("app_events").insert(linhas);
  if (error) console.error("eventos", error);
  return new Response(null, { status: 204 });
}
