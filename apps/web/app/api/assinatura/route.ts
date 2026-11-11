import { agoraEmSaoPaulo, lerCpfCnpj, TRABALHADORES_MAX, TRABALHADORES_MIN } from "@ponto-pro/core";
import { z } from "zod";
import { provedorDoServidor } from "../../../lib/cobranca/asaas";
import { contaDoToken, supabaseServidor } from "../../../lib/cobranca/servidor";

export const dynamic = "force-dynamic";

const Pedido = z.object({
  plano: z.enum(["individual", "equipe"]),
  trabalhadores: z.number().int().min(1).max(TRABALHADORES_MAX).default(1),
  nome: z.string().trim().min(3).max(120),
  cpfCnpj: z.string(),
});

const erro = (status: number, mensagem: string) => Response.json({ erro: mensagem }, { status });

/** Cria a assinatura no Asaas e devolve o link de pagamento (Pix ou cartão). */
export async function POST(req: Request) {
  const provedor = provedorDoServidor();
  const sb = supabaseServidor();
  if (!provedor || !sb) return erro(503, "A cobrança ainda não está disponível.");

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return erro(401, "Entre na sua conta para assinar.");
  const dono = await contaDoToken(sb, token);
  if (!dono) return erro(401, "Entre na sua conta para assinar.");

  const r = Pedido.safeParse(await req.json().catch(() => null));
  if (!r.success) return erro(400, "Confira o nome e o plano.");
  const cpfCnpj = lerCpfCnpj(r.data.cpfCnpj);
  if (!cpfCnpj) return erro(400, "CPF ou CNPJ inválido.");
  const trabalhadores = r.data.plano === "equipe" ? Math.max(TRABALHADORES_MIN, r.data.trabalhadores) : 1;

  try {
    const { link } = await provedor.assinar({
      conta: dono.conta,
      plano: r.data.plano,
      trabalhadores,
      nome: r.data.nome,
      cpfCnpj,
      email: dono.usuario.email,
      telefone: dono.usuario.phone ? `+${dono.usuario.phone.replace(/^\+/, "")}` : undefined,
      vencimento: agoraEmSaoPaulo().data,
    });
    return Response.json({ link });
  } catch (e) {
    console.error("assinatura", e);
    return erro(502, "Não deu para criar a cobrança agora. Tente de novo em instantes.");
  }
}
