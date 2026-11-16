import type { Metadata } from "next";
import { PaginaCalculadora } from "../pagina";
import { CalculadoraDecimo } from "./calculadora";

export const metadata: Metadata = {
  title: { absolute: "Calculadora de 13º salário: 1ª e 2ª parcela | Pingou" },
  description: "Calcule seu 13º salário proporcional, com as duas parcelas e os descontos de INSS e IR. Grátis e com a conta aberta.",
  alternates: { canonical: "/calculadoras/decimo-terceiro" },
};

export default function Pagina() {
  return (
    <PaginaCalculadora
      slug="decimo-terceiro"
      titulo="Quanto é o seu 13º?"
      intro="O 13º paga 1/12 do salário por mês trabalhado no ano, em duas parcelas. Veja quanto cai em cada uma."
      calculadora={<CalculadoraDecimo />}
      convite="Acompanhe o 13º crescendo mês a mês no Pingou."
      comoFunciona={
        <>
          <p>Cada mês em que você trabalhou <b>15 dias ou mais</b> vale 1/12 do salário. Quem trabalhou o ano todo recebe um salário inteiro.</p>
          <p>A <b>1ª parcela</b>, até 30 de novembro, é metade do valor, sem descontos. A <b>2ª</b>, até 20 de dezembro, é o resto, já com INSS e imposto de renda do 13º inteiro.</p>
          <p>Hora extra e adicionais habituais entram pela média do ano.</p>
        </>
      }
      duvidas={[
        { pergunta: "Quem tem direito ao 13º?", resposta: "Todo trabalhador com carteira assinada, inclusive doméstico e temporário. Quem é demitido sem justa causa recebe o proporcional na rescisão." },
        { pergunta: "Por que a 2ª parcela é menor?", resposta: "Porque o INSS e o imposto de renda do 13º inteiro são descontados só nela." },
        { pergunta: "Falta tira o 13º?", resposta: "Faltas sem justificativa podem fazer um mês não chegar a 15 dias trabalhados, e esse mês deixa de contar." },
      ]}
    />
  );
}
