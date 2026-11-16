"use client";

import { calcularPeriodo, formatarReais, mesesDeDecimo, periodoDaData, periodoVizinho, somarDias } from "@ponto-pro/core";
import { Abas, Bloqueio, CabecalhoTela } from "@ponto-pro/ui";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAgora, useEstado, useHistoricoLongo } from "../../../lib/estado";
import { salarioMensal } from "../../../lib/perfil";
import { situacaoAtual } from "../../../lib/plano";
import { CalculadoraDecimo } from "../../calculadoras/decimo-terceiro/calculadora";
import { CalculadoraFerias } from "../../calculadoras/ferias/calculadora";
import { CalculadoraRescisao } from "../../calculadoras/rescisao/calculadora";
import { Carregando } from "../../carregando";

type Aba = "ferias" | "decimo" | "rescisao";

/**
 * Férias, 13º e rescisão com os números da pessoa (Pro): o salário do perfil
 * e a média de hora extra dos períodos que já fecharam, calculada dos registros.
 */
export default function Direitos() {
  const estado = useEstado();
  const agora = useAgora();
  const [aba, setAba] = useState<Aba>("ferias");
  const pode = estado?.perfil ? situacaoAtual(estado).pode("direitos") : false;
  const longo = useHistoricoLongo(pode, agora ? somarDias(agora.data, -380) : "2000-01-01");

  const base = useMemo(() => {
    if (!estado?.perfil || !agora || !longo) return null;
    const perfil = estado.perfil;
    const fech = perfil.ciclo.diaFechamento;
    const pg = perfil.pagamento;
    const mensal = salarioMensal(pg);
    const valorHora = pg.forma === "hora" ? pg.valorHora : pg.forma === "misto" && pg.base === "hora" ? (pg.valorHora ?? 0) : 0;
    const salario = mensal?.salario ?? (valorHora ? valorHora * 220 : 0);
    // média de hora extra: períodos fechados com algum registro, até 12
    let p = periodoVizinho(periodoDaData(agora.data, fech), -1, fech);
    const extras: number[] = [];
    for (let i = 0; i < 12; i++) {
      const r = calcularPeriodo({ perfil, periodo: p, registros: longo.registros, lancamentos: longo.lancamentos, itens: estado.itens, feriadosLocais: estado.feriadosLocais });
      if (r.horas.trabalhadoMin > 0) extras.push(r.ganhos.filter((l) => l.tipo === "extra").reduce((t, l) => t + l.valor, 0));
      p = periodoVizinho(p, -1, fech);
    }
    const media = extras.length ? Math.round(extras.reduce((a, b) => a + b, 0) / extras.length) : 0;
    const primeiro = longo.registros.map((r) => r.data).sort()[0];
    const meses = mesesDeDecimo(primeiro && primeiro.slice(0, 4) === agora.data.slice(0, 4) ? primeiro : `${agora.data.slice(0, 4)}-01-01`, agora.data);
    return { salario, media, meses, periodos: extras.length, porHora: !mensal && !!valorHora };
  }, [estado, agora, longo]);

  if (!estado?.perfil || !agora) return <Carregando />;
  if (!pode) {
    return (
      <main className="flex flex-col gap-5 px-4 pb-6">
        <CabecalhoTela titulo="Seus direitos" subtitulo="Férias, 13º e rescisão" />
        <Bloqueio
          titulo="Com os seus números"
          texto="No Pro, o Pingou calcula férias, 13º e rescisão com o seu salário e a média das suas horas extras, tirada dos seus registros."
          acao={<Link href="/planos" className="inline-flex min-h-12 items-center rounded-full bg-primaria px-5 text-17 font-bold text-sobre-primaria">Ver planos</Link>}
        />
        <p className="px-1 text-15 text-texto-2">
          Quer fazer a conta à mão? Use as <Link href="/calculadoras" className="font-bold text-primaria-forte underline underline-offset-4">calculadoras abertas</Link>.
        </p>
      </main>
    );
  }
  if (!base) return <Carregando />;
  const inicial = { salario: base.salario, media: base.media, meses: base.meses };

  return (
    <main className="flex flex-col gap-4 px-4 pb-6">
      <CabecalhoTela titulo="Seus direitos" subtitulo="Férias, 13º e rescisão com os seus números" />
      <p className="rounded-2xl bg-primaria-suave px-4 py-3 text-15">
        {base.porHora ? "Salário estimado pelas suas horas (valor da hora × 220)" : "Salário do seu perfil"}: <b className="numeros">{formatarReais(base.salario)}</b>.{" "}
        {base.periodos
          ? <>Média de hora extra em {base.periodos} {base.periodos === 1 ? "período" : "períodos"}: <b className="numeros">{formatarReais(base.media)}</b> por mês.</>
          : "Ainda não há período fechado para tirar a média de hora extra."}{" "}
        Dá para mudar os valores abaixo.
      </p>
      <Abas
        rotulo="Escolha a conta"
        valor={aba}
        onChange={setAba}
        opcoes={[
          { id: "ferias", rotulo: "Férias" },
          { id: "decimo", rotulo: "13º" },
          { id: "rescisao", rotulo: "Rescisão" },
        ]}
      />
      {aba === "ferias" && <CalculadoraFerias inicial={inicial} />}
      {aba === "decimo" && <CalculadoraDecimo inicial={inicial} />}
      {aba === "rescisao" && <CalculadoraRescisao inicial={inicial} />}
    </main>
  );
}
