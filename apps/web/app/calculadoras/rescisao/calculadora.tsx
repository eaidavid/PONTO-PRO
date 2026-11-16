"use client";

import { agoraEmSaoPaulo, formatarReais, type MotivoSaida, NOME_MOTIVO, rescisao } from "@ponto-pro/core";
import { Interruptor } from "@ponto-pro/ui";
import { useId, useState } from "react";
import { CampoReais, Caixa, Opcoes, Resultado, useReais } from "../campos";

function CampoData({ rotulo, valor, onChange, max }: { rotulo: string; valor: string; onChange: (v: string) => void; max?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-17 font-bold">{rotulo}</label>
      <input
        id={id}
        type="date"
        value={valor}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="numeros min-h-14 rounded-cartao border-2 border-borda-forte bg-superficie px-4 text-20 font-bold outline-none focus:border-primaria"
      />
    </div>
  );
}

export function CalculadoraRescisao() {
  const hoje = agoraEmSaoPaulo().data;
  const salario = useReais(300_000);
  const media = useReais(0);
  const fgts = useReais(0);
  const [admissao, setAdmissao] = useState(`${Number(hoje.slice(0, 4)) - 2}-02-01`);
  const [saida, setSaida] = useState(hoje);
  const [motivo, setMotivo] = useState<MotivoSaida>("sem-justa-causa");
  const [avisoTrabalhado, setAvisoTrabalhado] = useState(false);
  const [vencidas, setVencidas] = useState(0);

  const datasOk = admissao && saida && admissao < saida;
  const r = datasOk
    ? rescisao({
        salario: salario.centavos,
        mediaVariaveis: media.centavos,
        admissao,
        saida,
        motivo,
        avisoTrabalhado: motivo === "pedido" ? !avisoTrabalhado : avisoTrabalhado,
        feriasVencidas: vencidas,
        ...(fgts.centavos > 0 ? { saldoFgts: fgts.centavos } : {}),
      })
    : null;

  return (
    <Caixa>
      <Opcoes rotulo="Como foi a saída" valor={motivo} onChange={setMotivo} opcoes={(Object.keys(NOME_MOTIVO) as MotivoSaida[]).map((m) => ({ valor: m, texto: NOME_MOTIVO[m] }))} />
      <CampoReais rotulo="Último salário" campo={salario} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoData rotulo="Data de admissão" valor={admissao} onChange={setAdmissao} max={saida} />
        <CampoData rotulo="Último dia de trabalho" valor={saida} onChange={setSaida} />
      </div>
      {(motivo === "sem-justa-causa" || motivo === "acordo") && (
        <Interruptor rotulo="Vou trabalhar o aviso prévio" descricao="Se não, a empresa paga o aviso sem você trabalhar (indenizado)." valor={avisoTrabalhado} onChange={setAvisoTrabalhado} />
      )}
      {motivo === "pedido" && (
        <Interruptor rotulo="Não vou cumprir o aviso" descricao="A empresa pode descontar 30 dias de salário." valor={avisoTrabalhado} onChange={setAvisoTrabalhado} />
      )}
      <Opcoes
        rotulo="Férias vencidas que você não tirou"
        valor={vencidas}
        onChange={setVencidas}
        opcoes={[
          { valor: 0, texto: "Nenhuma" },
          { valor: 1, texto: "1 período" },
          { valor: 2, texto: "2 períodos" },
        ]}
      />
      <CampoReais rotulo="Média de hora extra e adicionais (opcional)" campo={media} />
      <CampoReais rotulo="Saldo do FGTS (opcional)" campo={fgts} ajuda="Está no app FGTS. Sem ele, estimamos 8% do salário por mês." />
      {r ? (
        <Resultado
          r={r}
          rotulo="Você recebe na rescisão"
          extra={
            r.fgts.saque > 0 ? (
              <p className="rounded-2xl bg-superficie p-3 text-15">
                No FGTS, você pode sacar cerca de <b className="numeros">{formatarReais(r.fgts.saque)}</b>
                {r.fgts.multa > 0 ? `, já com a multa de ${formatarReais(r.fgts.multa)}` : ""}.
              </p>
            ) : null
          }
        />
      ) : (
        <p role="alert" className="text-15 font-bold text-erro-texto">A data de admissão precisa ser antes do último dia de trabalho.</p>
      )}
    </Caixa>
  );
}
