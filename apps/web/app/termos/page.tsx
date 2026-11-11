import type { Metadata } from "next";
import { LEGAL, MARCA } from "../../lib/marca";
import { DocumentoLegal } from "../documento-legal";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Termos() {
  return (
    <DocumentoLegal titulo="Termos de uso">
      <p>
        Estes termos explicam como funciona o {MARCA.nome}, oferecido por {LEGAL.empresa}, CNPJ {LEGAL.cnpj}. Ao usar o app, você concorda com eles.
      </p>

      <h2>1. O que o {MARCA.nome} é</h2>
      <p>
        Um aplicativo de <b>controle pessoal</b> de horas, produção e ganhos. Ele ajuda você a anotar o seu trabalho e a estimar quanto vai receber.
      </p>
      <ul>
        <li>
          <b>Não é ponto eletrônico oficial</b> (não é um Registrador Eletrônico de Ponto nem substitui o controle de jornada do seu empregador).
        </li>
        <li>
          Os valores mostrados — inclusive o contracheque — são <b>estimativas sem validade legal</b>. O que vale é o que consta na sua folha de pagamento oficial.
        </li>
        <li>
          Percentuais, tabelas e regras vêm como <b>sugestão</b>. Confira com o seu sindicato, com o RH ou com um contador. Você pode mudar tudo em Conta.
        </li>
      </ul>

      <h2>2. Seus registros</h2>
      <p>
        Você é responsável pelos horários e valores que lança. O app guarda os dados primeiro no seu celular. Se você criar uma conta, eles também são enviados para os nossos servidores, para não se perderem e para aparecerem em outro aparelho.
      </p>

      <h2>3. Planos e pagamento</h2>
      <ul>
        <li>O plano Grátis mostra o período atual. Os planos pagos liberam histórico, PDF, metas e recursos de equipe, conforme a página de planos.</li>
        <li>Todo plano pago começa com 14 dias de teste grátis. Você só é cobrado se continuar depois do teste.</li>
        <li>A cobrança é mensal e recorrente (Pix Automático ou cartão), processada pela Asaas. Você pode cancelar quando quiser; o acesso pago vale até o fim do período já pago.</li>
        <li>Mudanças de preço são avisadas com pelo menos 30 dias de antecedência.</li>
      </ul>

      <h2>4. Uso correto</h2>
      <p>Não use o app para fraudar registros, prejudicar outras pessoas ou violar a lei. Podemos suspender contas que façam isso.</p>

      <h2>5. Limites de responsabilidade</h2>
      <p>
        Trabalhamos para que as contas estejam certas, mas o app não substitui orientação profissional. Não respondemos por decisões tomadas apenas com base nas estimativas, nem por dados perdidos de aparelhos sem conta criada.
      </p>

      <h2>6. Mudanças nestes termos</h2>
      <p>Se mudarmos estes termos, avisaremos no app e pediremos seu aceite de novo.</p>

      <h2>7. Contato e foro</h2>
      <p>
        Dúvidas: {LEGAL.email}. Fica eleito o foro de {LEGAL.foro}, sem prejuízo do direito do consumidor de usar o foro do seu domicílio.
      </p>
    </DocumentoLegal>
  );
}
