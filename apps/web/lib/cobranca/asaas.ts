import { type CicloCobranca, PLANOS, pagoAteDoPagamento, somarDias, valorDoCiclo } from "@ponto-pro/core";
import type { AtualizacaoAssinatura, PedidoAssinatura, ProvedorCobranca } from "./provedor";

/**
 * Asaas (https://docs.asaas.com). Só roda no servidor: a chave nunca vai para o navegador.
 * A cobrança é mensal ou anual, com forma "UNDEFINED": a pessoa escolhe Pix ou cartão na página de pagamento.
 */

type Buscar = typeof fetch;

/** Referência guardada na assinatura do Asaas: conta, plano, trabalhadores e ciclo. */
export const referencia = (p: Pick<PedidoAssinatura, "conta" | "plano" | "trabalhadores" | "ciclo">) => `${p.conta}|${p.plano}|${p.trabalhadores}|${p.ciclo}`;

/** Lê a referência. As antigas, sem ciclo, são mensais. */
export function lerReferencia(r: unknown): { conta: string; plano: "individual" | "equipe"; trabalhadores: number; ciclo: CicloCobranca } | null {
  if (typeof r !== "string") return null;
  const [conta, plano, t, c = "mensal"] = r.split("|");
  const trabalhadores = Number(t);
  if (!conta || (plano !== "individual" && plano !== "equipe") || !Number.isInteger(trabalhadores) || trabalhadores < 1) return null;
  if (c !== "mensal" && c !== "anual") return null;
  return { conta, plano, trabalhadores, ciclo: c };
}

interface PagamentoAsaas {
  id: string;
  customer?: string;
  subscription?: string;
  dueDate?: string;
  status?: string;
  externalReference?: string;
}
interface AssinaturaAsaas {
  id: string;
  customer?: string;
  externalReference?: string;
  nextDueDate?: string;
  status?: string;
}

const PAGOS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const FIM = new Set(["SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED"]);

export class Asaas implements ProvedorCobranca {
  constructor(
    private chave: string,
    private url = "https://api-sandbox.asaas.com/v3",
    private buscar: Buscar = fetch,
  ) {}

  private async chamar<T>(caminho: string, init?: { method?: string; body?: unknown }): Promise<T> {
    const r = await this.buscar(`${this.url}${caminho}`, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": "application/json", access_token: this.chave, "User-Agent": "pingou" },
      ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
    });
    const corpo = (await r.json().catch(() => ({}))) as T & { errors?: { description?: string }[] };
    if (!r.ok) throw new Error(corpo.errors?.[0]?.description ?? `Asaas respondeu ${r.status}`);
    return corpo;
  }

  async assinar(p: PedidoAssinatura) {
    const cliente = await this.chamar<{ id: string }>("/customers", {
      method: "POST",
      body: { name: p.nome, cpfCnpj: p.cpfCnpj, email: p.email, mobilePhone: p.telefone?.replace(/^\+55/, ""), externalReference: p.conta, notificationDisabled: false },
    });
    const assinatura = await this.chamar<{ id: string }>("/subscriptions", {
      method: "POST",
      body: {
        customer: cliente.id,
        billingType: "UNDEFINED",
        cycle: p.ciclo === "anual" ? "YEARLY" : "MONTHLY",
        value: valorDoCiclo(p.plano, p.ciclo, p.trabalhadores) / 100,
        nextDueDate: p.vencimento,
        description: `Pingou ${PLANOS[p.plano].nome}${p.plano === "equipe" ? ` (${p.trabalhadores} pessoas)` : ""}${p.ciclo === "anual" ? ", anual" : ""}`,
        externalReference: referencia(p),
      },
    });
    const pagamentos = await this.chamar<{ data: { invoiceUrl?: string }[] }>(`/subscriptions/${assinatura.id}/payments`);
    const link = pagamentos.data[0]?.invoiceUrl;
    if (!link) throw new Error("O Asaas não devolveu o link de pagamento");
    return { link, provedorCliente: cliente.id, provedorAssinatura: assinatura.id };
  }

  async interpretarAviso(corpo: unknown): Promise<AtualizacaoAssinatura | null> {
    const aviso = (corpo ?? {}) as { event?: string; payment?: PagamentoAsaas; subscription?: AssinaturaAsaas };
    const evento = aviso?.event ?? "";

    if (aviso.payment && (PAGOS.has(evento) || evento === "PAYMENT_OVERDUE")) {
      const pg = aviso.payment;
      if (!pg.subscription || !pg.dueDate) return null;
      // a referência fica na assinatura; buscamos para não confiar só no corpo do aviso
      const ass = await this.chamar<AssinaturaAsaas>(`/subscriptions/${pg.subscription}`);
      const ref = lerReferencia(ass.externalReference);
      if (!ref) return null;
      const pago = PAGOS.has(evento);
      return {
        conta: ref.conta,
        provedorCliente: ass.customer ?? pg.customer,
        provedorAssinatura: ass.id,
        assinatura: {
          plano: ref.plano,
          status: pago ? "ativa" : "atrasada",
          ciclo: ref.ciclo,
          // atrasado: vale até a véspera do vencimento não pago (a tolerância conta a partir daí)
          pagoAte: pago ? pagoAteDoPagamento(pg.dueDate, ref.ciclo) : somarDias(pg.dueDate, -1),
          trabalhadores: ref.trabalhadores,
        },
      };
    }

    if (aviso.subscription && FIM.has(evento)) {
      const ref = lerReferencia(aviso.subscription.externalReference);
      if (!ref) return null;
      return {
        conta: ref.conta,
        provedorCliente: aviso.subscription.customer,
        provedorAssinatura: aviso.subscription.id,
        // pagoAte vazio = manter o que já estava pago (o webhook só troca o status)
        assinatura: { plano: ref.plano, status: "cancelada", ciclo: ref.ciclo, pagoAte: "", trabalhadores: ref.trabalhadores },
      };
    }
    return null;
  }
}

/** Provedor configurado no servidor, ou null se faltam as chaves. */
export function provedorDoServidor(): ProvedorCobranca | null {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) return null;
  return new Asaas(chave, process.env.ASAAS_API_URL || "https://api-sandbox.asaas.com/v3");
}
