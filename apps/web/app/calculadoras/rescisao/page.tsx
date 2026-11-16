import type { Metadata } from "next";
import { PaginaCalculadora } from "../pagina";
import { CalculadoraRescisao } from "./calculadora";

export const metadata: Metadata = {
  title: { absolute: "Calculadora de rescisão: demissão, acordo e pedido | Pingou" },
  description: "Calcule sua rescisão: saldo de salário, aviso prévio, 13º, férias com 1/3 e multa do FGTS, para demissão sem justa causa, acordo ou pedido de demissão.",
  alternates: { canonical: "/calculadoras/rescisao" },
};

export default function Pagina() {
  return (
    <PaginaCalculadora
      slug="rescisao"
      titulo="Quanto você recebe se sair do emprego?"
      intro="Escolha como foi a saída, as datas e o salário. A conta mostra cada verba da rescisão e quanto dá para sacar do FGTS."
      calculadora={<CalculadoraRescisao />}
      convite="Com o ponto anotado, ninguém discute as suas horas na rescisão."
      comoFunciona={
        <>
          <p><b>Saldo de salário</b>: os dias trabalhados no último mês. <b>Aviso prévio</b>: 30 dias mais 3 por ano completo, até 90 (Lei 12.506/2011). Quando é indenizado, ele conta como tempo de serviço para 13º e férias.</p>
          <p><b>13º e férias proporcionais</b>: 1/12 por mês com 15 dias ou mais. As férias levam 1/3 a mais. <b>Férias vencidas</b> entram inteiras, com 1/3.</p>
          <p>No <b>acordo</b> (CLT, art. 484-A), o aviso indenizado e a multa do FGTS caem pela metade, e o saque do FGTS é de 80%. Em <b>pedido de demissão</b> e <b>justa causa</b> não há multa nem saque.</p>
        </>
      }
      duvidas={[
        { pergunta: "Qual o prazo para a empresa pagar?", resposta: "Até 10 dias depois do último dia de trabalho (CLT, art. 477). Depois disso, cabe multa de um salário." },
        { pergunta: "Tenho direito a seguro-desemprego?", resposta: "Na demissão sem justa causa, se cumprir o tempo mínimo de trabalho exigido. No acordo, no pedido de demissão e na justa causa, não." },
        { pergunta: "Hora extra entra na rescisão?", resposta: "Entra: as extras habituais aumentam a média usada no aviso, nas férias e no 13º. Por isso vale ter as horas anotadas." },
        { pergunta: "O valor é exato?", resposta: "É uma estimativa com as regras gerais. Convenção coletiva, comissões e descontos específicos mudam o valor. Confira o termo de rescisão." },
      ]}
    />
  );
}
