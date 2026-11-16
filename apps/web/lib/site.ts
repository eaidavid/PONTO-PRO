/** Endereço público do site, para links absolutos (Google, compartilhamento, notificações). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://pingou-app.vercel.app").replace(/\/$/, "");

/** Calculadoras públicas: caminho, nome curto e a pergunta que cada uma responde. */
export const CALCULADORAS = [
  { caminho: "/calculadoras/hora-extra", nome: "Hora extra", pergunta: "Quanto vale a minha hora extra?" },
  { caminho: "/calculadoras/salario-liquido", nome: "Salário líquido", pergunta: "Quanto cai do meu salário?" },
  { caminho: "/calculadoras/ferias", nome: "Férias", pergunta: "Quanto vou receber de férias?" },
  { caminho: "/calculadoras/decimo-terceiro", nome: "13º salário", pergunta: "Quanto é o meu 13º?" },
  { caminho: "/calculadoras/rescisao", nome: "Rescisão", pergunta: "Quanto recebo se sair do emprego?" },
] as const;
