"use client";

import { agoraEmSaoPaulo, decimoTerceiro, formatarReais } from "@ponto-pro/core";
import { Contador } from "@ponto-pro/ui";
import { useState } from "react";
import { CampoReais, Caixa, Opcoes, Resultado, useReais } from "../campos";

export function CalculadoraDecimo({ inicial }: { inicial?: { salario?: number; media?: number; meses?: number; admissao?: string } } = {}) {
  const salario = useReais(inicial?.salario ?? 300_000);
  const media = useReais(inicial?.media ?? 0);
  const [meses, setMeses] = useState(inicial?.meses ?? 12);
  const [dependentes, setDependentes] = useState(0);
  const ano = Number(agoraEmSaoPaulo().data.slice(0, 4));
  const r = decimoTerceiro({ salario: salario.centavos, mediaVariaveis: media.centavos, meses, dependentes, ano });
  return (
    <Caixa>
      <CampoReais rotulo="Salário" campo={salario} />
      <CampoReais rotulo="Média de hora extra e adicionais (opcional)" campo={media} ajuda="A média por mês no ano." />
      <div className="rounded-2xl bg-superficie p-4">
        <Contador
          rotulo="Meses trabalhados no ano"
          valor={`${meses} ${meses === 1 ? "mês" : "meses"}`}
          passo="1 mês"
          onMenos={() => setMeses((m) => Math.max(1, m - 1))}
          onMais={() => setMeses((m) => Math.min(12, m + 1))}
          podeMenos={meses > 1}
          podeMais={meses < 12}
        />
      </div>
      <Opcoes rotulo="Dependentes no imposto de renda" valor={dependentes} onChange={setDependentes} opcoes={[0, 1, 2, 3].map((n) => ({ valor: n, texto: String(n) }))} />
      <Resultado
        r={r}
        rotulo="13º líquido"
        extra={
          <dl className="grid grid-cols-2 gap-2 text-apoio">
            <div className="rounded-2xl bg-superficie p-3">
              <dt className="text-texto-2">1ª parcela, até 30/11</dt>
              <dd className="numeros text-destaque font-bold">{formatarReais(r.primeiraParcela)}</dd>
            </div>
            <div className="rounded-2xl bg-superficie p-3">
              <dt className="text-texto-2">2ª parcela, até 20/12</dt>
              <dd className="numeros text-destaque font-bold">{formatarReais(r.segundaParcela)}</dd>
            </div>
          </dl>
        }
      />
    </Caixa>
  );
}
