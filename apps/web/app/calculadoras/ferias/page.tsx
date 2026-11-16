import type { Metadata } from "next";
import { PaginaCalculadora } from "../pagina";
import { CalculadoraFerias } from "./calculadora";

export const metadata: Metadata = {
  title: { absolute: "Calculadora de férias com 1/3 e venda de 10 dias | Pingou" },
  description: "Calcule quanto você recebe de férias: salário, 1/3 constitucional, venda de 10 dias e descontos de INSS e IR. Grátis.",
  alternates: { canonical: "/calculadoras/ferias" },
};

export default function Pagina() {
  return (
    <PaginaCalculadora
      slug="ferias"
      titulo="Quanto você vai receber de férias?"
      intro="As férias pagam o salário dos dias de descanso mais 1/3. Se vender 10 dias, entra o abono. Veja o valor com os descontos."
      calculadora={<CalculadoraFerias />}
      convite="O Pingou guarda a média das suas horas extras para as férias."
      comoFunciona={
        <>
          <p>Cada dia de férias vale <b>salário ÷ 30</b>. Sobre esse valor entra <b>1/3 a mais</b> (Constituição, art. 7º, XVII).</p>
          <p>Hora extra, adicional noturno e comissões habituais entram pela <b>média dos últimos 12 meses</b>.</p>
          <p>Quem vende 10 dias recebe esses dias como <b>abono</b>, com 1/3, sem INSS e sem imposto de renda. As faltas sem justificativa reduzem os dias de direito (CLT, art. 130).</p>
        </>
      }
      duvidas={[
        { pergunta: "Quando as férias são pagas?", resposta: "Até 2 dias antes de você sair de férias. Se atrasar, a empresa pode ter que pagar em dobro." },
        { pergunta: "Posso dividir as férias?", resposta: "Pode, em até 3 períodos, se você concordar: um de pelo menos 14 dias e os outros de pelo menos 5." },
        { pergunta: "Hora extra entra nas férias?", resposta: "Entra, pela média dos últimos 12 meses. Por isso vale anotar todas: elas aumentam férias, 13º e FGTS." },
      ]}
    />
  );
}
