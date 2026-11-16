import { type Agora, dataDePagamento, type DiaRegistro, lembretesDoDia, type PerfilTrabalho, periodoDaData, periodoVizinho } from "@ponto-pro/core";

export type TipoNotificacao = "saida" | "pagamento";

export interface Notificacao {
  tipo: TipoNotificacao;
  titulo: string;
  corpo: string;
  /** Tela que abre ao tocar. */
  url: string;
}

/** Fora deste horário (São Paulo) nada é enviado, para não acordar ninguém. */
const ACORDADO = { de: 6 * 60, ate: 22 * 60 };
/** O aviso do pagamento sai a partir das 8h. */
const HORA_PAGAMENTO = 8 * 60;

/**
 * O que mandar agora para uma pessoa, a partir do perfil e do registro de hoje.
 * Cada tipo sai no máximo uma vez por dia (`jaEnviadas` traz os tipos já enviados hoje).
 * Função pura: o servidor chama a cada 5 minutos.
 */
export function notificacoesDevidas(p: {
  perfil: PerfilTrabalho;
  hoje: DiaRegistro | undefined;
  agora: Agora;
  jaEnviadas: ReadonlySet<TipoNotificacao>;
}): Notificacao[] {
  const { perfil, hoje, agora, jaEnviadas } = p;
  if (agora.minutos < ACORDADO.de || agora.minutos >= ACORDADO.ate) return [];
  const res: Notificacao[] = [];

  if (!jaEnviadas.has("saida")) {
    const semSaida = lembretesDoDia({ perfil, hoje, ontem: undefined, agora }).find((l) => l.id === "sem-saida");
    if (semSaida) res.push({ tipo: "saida", titulo: "Bateu a saída?", corpo: semSaida.texto, url: "/hoje" });
  }

  if (!jaEnviadas.has("pagamento") && agora.minutos >= HORA_PAGAMENTO) {
    const fech = perfil.ciclo.diaFechamento;
    const atual = periodoDaData(agora.data, fech);
    const anterior = periodoVizinho(atual, -1, fech);
    const cai = [anterior, atual].some((per) => dataDePagamento(perfil, per) === agora.data);
    if (cai) {
      res.push({
        tipo: "pagamento",
        titulo: "Pingou! Hoje é dia de pagamento",
        corpo: "Quando cair, confira no app se o valor bateu com a conta.",
        url: "/ganhos?aba=periodos",
      });
    }
  }
  return res;
}
