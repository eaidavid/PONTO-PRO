import type { Metadata } from "next";
import { LEGAL, MARCA } from "../../lib/marca";
import { DocumentoLegal } from "../documento-legal";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  return (
    <DocumentoLegal titulo="Política de privacidade">
      <p>
        Esta política explica quais dados o {MARCA.nome} usa, por quê e como você controla tudo, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        O controlador dos dados é {LEGAL.empresa}, CNPJ {LEGAL.cnpj}.
      </p>

      <h2>1. Que dados usamos</h2>
      <ul>
        <li><b>Seu trabalho:</b> escala, valor da hora ou salário, regras de hora extra, descontos, obras.</li>
        <li><b>Seus registros:</b> horários de ponto, tipo do dia, notas e produção lançada.</li>
        <li><b>Dados do contracheque</b> que você escolher preencher: nome, cargo e empresa.</li>
        <li><b>Conta</b> (se criar): telefone ou e-mail, para entrar com código.</li>
        <li><b>Pagamento</b> (se assinar): nome, CPF e forma de pagamento ficam com a Asaas. Nós não guardamos número de cartão.</li>
      </ul>
      <p>Não usamos sua localização e não vendemos seus dados.</p>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Calcular horas, ganhos e descontos e mostrar o passo a passo (execução do serviço que você pediu).</li>
        <li>Guardar e sincronizar seus dados entre aparelhos, se você criar conta.</li>
        <li>Cobrar a assinatura, se você assinar.</li>
        <li>Melhorar o app com estatísticas de uso sem identificar você, se você permitir.</li>
      </ul>

      <h2>3. Onde ficam</h2>
      <p>
        Primeiro no seu celular. Com conta criada, também em servidores dos nossos fornecedores: Supabase (banco de dados), Vercel (hospedagem do app) e Asaas (pagamentos). Eles só usam os dados para prestar esse serviço.
      </p>

      <h2>4. Por quanto tempo</h2>
      <p>Enquanto sua conta existir. Se você apagar a conta, os dados são apagados em até 30 dias, exceto o que a lei obriga a guardar (por exemplo, notas de cobrança).</p>

      <h2>5. Seus direitos</h2>
      <p>Você pode, a qualquer momento:</p>
      <ul>
        <li><b>Ver e levar seus dados:</b> em Conta → Baixar meus dados.</li>
        <li><b>Apagar tudo:</b> em Conta → Apagar todos os meus dados.</li>
        <li>Corrigir dados, saber com quem compartilhamos, revogar o consentimento e pedir informações pelo e-mail {LEGAL.email}.</li>
      </ul>

      <h2>6. Segurança</h2>
      <p>Usamos conexão criptografada, acesso por conta com código e regras no banco que fazem cada pessoa ver só os próprios dados.</p>

      <h2>7. Encarregado de dados</h2>
      <p>{LEGAL.encarregado} — {LEGAL.email}.</p>

      <h2>8. Mudanças</h2>
      <p>Se esta política mudar, avisaremos no app e pediremos seu aceite de novo.</p>
    </DocumentoLegal>
  );
}
