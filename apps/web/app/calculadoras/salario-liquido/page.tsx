import type { Metadata } from "next";
import { PaginaCalculadora } from "../pagina";
import { CalculadoraSalarioLiquido } from "./calculadora";

export const metadata: Metadata = {
  title: { absolute: "Calculadora de salário líquido com INSS e IR | Pingou" },
  description: "Descubra quanto cai do seu salário depois do INSS e do imposto de renda, com as tabelas do ano. Grátis e com a conta aberta.",
  alternates: { canonical: "/calculadoras/salario-liquido" },
};

export default function Pagina() {
  return (
    <PaginaCalculadora
      slug="salario-liquido"
      titulo="Quanto cai do seu salário?"
      intro="Do salário bruto saem o INSS e, dependendo do valor, o imposto de renda. Veja quanto sobra, com a conta linha por linha."
      calculadora={<CalculadoraSalarioLiquido />}
      convite="Saiba quanto vai cair antes do dia do pagamento."
      comoFunciona={
        <>
          <p>O <b>INSS</b> é progressivo: cada faixa do salário paga uma alíquota diferente, de 7,5% a 14%, até o teto do ano.</p>
          <p>O <b>imposto de renda</b> sai do salário menos o INSS e os dependentes, ou do desconto simplificado, o que der menos imposto. Desde 2026, quem ganha até R$ 5.000,00 tem redução que zera o imposto.</p>
          <p>Outros descontos, como vale-transporte (até 6% do salário) e plano de saúde, dependem da empresa.</p>
        </>
      }
      duvidas={[
        { pergunta: "Por que meu líquido é diferente do contracheque?", resposta: "Hora extra, adicional noturno, faltas, vale-transporte e benefícios mudam o valor do mês. O Pingou soma tudo isso a partir do seu ponto." },
        { pergunta: "Quem tem dependente paga menos imposto?", resposta: "Sim. Cada dependente reduz a base do imposto de renda em um valor fixo por mês." },
        { pergunta: "O INSS tem limite?", resposta: "Tem. Acima do teto do ano, o desconto não aumenta mais." },
      ]}
    />
  );
}
