"use client";

import { agoraEmSaoPaulo, salarioLiquido } from "@ponto-pro/core";
import { useState } from "react";
import { CampoReais, Caixa, Opcoes, Resultado, useReais } from "../campos";

export function CalculadoraSalarioLiquido() {
  const salario = useReais(300_000);
  const outros = useReais(0);
  const [dependentes, setDependentes] = useState(0);
  const ano = Number(agoraEmSaoPaulo().data.slice(0, 4));
  const r = salarioLiquido({ salario: salario.centavos, dependentes, outrosDescontos: outros.centavos, ano });
  return (
    <Caixa>
      <CampoReais rotulo="Salário bruto" campo={salario} ajuda="O valor da carteira, antes dos descontos." />
      <Opcoes rotulo="Dependentes no imposto de renda" valor={dependentes} onChange={setDependentes} opcoes={[0, 1, 2, 3, 4].map((n) => ({ valor: n, texto: String(n) }))} />
      <CampoReais rotulo="Outros descontos (opcional)" campo={outros} ajuda="Vale-transporte, plano de saúde, pensão." />
      <Resultado r={r} rotulo="Salário líquido" />
    </Caixa>
  );
}
