/**
 * As assinaturas estão abertas? Liga com NEXT_PUBLIC_COBRANCA=1 na Vercel, depois que o provedor de pagamento
 * estiver configurado e testado. Desligado, "Assinar" vira "Quero ser avisado" (lista de espera do Pro).
 */
export const COBRANCA_ABERTA = process.env.NEXT_PUBLIC_COBRANCA === "1";
