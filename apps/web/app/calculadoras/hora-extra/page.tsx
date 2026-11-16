import type { Metadata } from "next";
import { PaginaCalculadora } from "../pagina";
import { CalculadoraHoraExtra } from "./calculadora";

export const metadata: Metadata = {
  title: { absolute: "Calculadora de hora extra: quanto vale a sua hora a mais | Pingou" },
  description: "Calcule grátis o valor da sua hora extra com 50% e 100% a partir do salário. Veja quanto as horas a mais dão no mês e no ano.",
  alternates: { canonical: "/calculadoras/hora-extra" },
};

export default function Pagina() {
  return (
    <PaginaCalculadora
      slug="hora-extra"
      titulo="Quanto vale a sua hora extra?"
      intro="Coloque o salário e as horas a mais do mês. A conta mostra o valor da sua hora e quanto as extras somam no mês e no ano."
      calculadora={<CalculadoraHoraExtra />}
      convite="Hora extra que ninguém anota é dinheiro que não pinga."
      comoFunciona={
        <>
          <p>Primeiro sai o valor da sua hora: <b>salário ÷ horas do mês</b>. Para quem trabalha 44 horas por semana, o divisor é 220. Para 40 horas, 200.</p>
          <p>A hora extra em dia comum vale <b>pelo menos 50% a mais</b> que a hora normal (Constituição, art. 7º). Em domingo e feriado trabalhado, o comum é <b>100% a mais</b>.</p>
          <p>Exemplo: salário de R$ 3.000,00 em 44 horas dá R$ 13,64 a hora. Com 50%, cada hora extra vale R$ 20,45. Dez horas no mês somam R$ 204,55.</p>
        </>
      }
      duvidas={[
        { pergunta: "Qual o divisor para calcular a hora?", resposta: "Horas da semana × 5. 44 horas dá 220, 40 horas dá 200, 36 horas dá 180. Confira no seu contrato ou convenção." },
        { pergunta: "O adicional pode ser maior que 50%?", resposta: "Pode. 50% é o mínimo da lei. Muitas convenções coletivas pagam 60%, 70% ou mais. Use o valor do seu acordo." },
        { pergunta: "Hora extra entra no descanso semanal?", resposta: "Sim. As extras habituais têm reflexo no descanso semanal remunerado (DSR), nas férias, no 13º e no FGTS." },
        { pergunta: "Como provo as horas que fiz?", resposta: "Anote todo dia a entrada e a saída. O Pingou faz isso com um toque e guarda o histórico para você conferir com o contracheque." },
      ]}
    />
  );
}
