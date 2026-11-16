"use client";

import { agoraEmSaoPaulo, ferias } from "@ponto-pro/core";
import { Interruptor } from "@ponto-pro/ui";
import { useState } from "react";
import { CampoReais, Caixa, Opcoes, Resultado, useReais } from "../campos";

export function CalculadoraFerias() {
  const salario = useReais(300_000);
  const media = useReais(0);
  const [dias, setDias] = useState(30);
  const [vender, setVender] = useState(false);
  const [dependentes, setDependentes] = useState(0);
  const ano = Number(agoraEmSaoPaulo().data.slice(0, 4));
  const r = ferias({ salario: salario.centavos, mediaVariaveis: media.centavos, dias, venderDias: vender, dependentes, ano });
  return (
    <Caixa>
      <CampoReais rotulo="Salário" campo={salario} />
      <CampoReais rotulo="Média de hora extra e adicionais (opcional)" campo={media} ajuda="A média por mês dos últimos 12 meses." />
      <Opcoes
        rotulo="Faltas sem justificativa no período"
        valor={dias}
        onChange={setDias}
        opcoes={[
          { valor: 30, texto: "Até 5 (30 dias)" },
          { valor: 24, texto: "6 a 14 (24 dias)" },
          { valor: 18, texto: "15 a 23 (18 dias)" },
          { valor: 12, texto: "24 a 32 (12 dias)" },
        ]}
      />
      <Interruptor rotulo="Vender 1/3 das férias" descricao="Trabalhar 10 dias e receber por eles (abono)." valor={vender} onChange={setVender} />
      <Opcoes rotulo="Dependentes no imposto de renda" valor={dependentes} onChange={setDependentes} opcoes={[0, 1, 2, 3].map((n) => ({ valor: n, texto: String(n) }))} />
      <Resultado r={r} rotulo="Você recebe de férias" />
    </Caixa>
  );
}
