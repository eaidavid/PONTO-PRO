"use client";

import {
  contaDoDia,
  divisorDaSemana,
  formatarHorasCurto,
  formatarReais,
  horaParaMin,
  lerReais,
  minParaHora,
  valorDaHoraDoSalario,
} from "@ponto-pro/core";
import { BotaoPrincipal, CabecalhoTela, CampoNumero, Chip, TituloSecao, useToast } from "@ponto-pro/ui";
import { Check, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { salvarPerfil } from "../../../lib/acoes";
import { useEstado } from "../../../lib/estado";
import { editar, salarioMensal } from "../../../lib/perfil";
import { Carregando } from "../../carregando";

const SEMANAS = [44, 40, 36, 30];
const ALMOCOS = [0, 30, 60, 90];
const JORNADAS = [480, 528, 540, 720];

function paraTexto(centavos: number) {
  return centavos > 0 ? (centavos / 100).toFixed(2).replace(".", ",") : "";
}

/** Horário com −15 e +15 minutos: rápido de acertar sem teclado. */
function Horario({ rotulo, valor, onChange }: { rotulo: string; valor: string; onChange: (h: string) => void }) {
  const mudar = (d: number) => onChange(minParaHora((horaParaMin(valor) + d + 1440) % 1440));
  const botao = "inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-superficie-2 borda active:scale-[0.96]";
  return (
    <div className="flex min-h-16 items-center gap-3">
      <span className="flex-1 text-17 font-bold">{rotulo}</span>
      <button type="button" onClick={() => mudar(-15)} className={botao} aria-label={`${rotulo}: 15 minutos antes`}>
        <Minus aria-hidden className="size-5" strokeWidth={2.5} />
      </button>
      <output aria-live="polite" aria-label={rotulo} className="numeros w-20 text-center text-24 font-bold">{valor}</output>
      <button type="button" onClick={() => mudar(15)} className={botao} aria-label={`${rotulo}: 15 minutos depois`}>
        <Plus aria-hidden className="size-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function Resultado({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={destaque ? "rounded-2xl bg-primaria-suave p-3" : "rounded-2xl bg-superficie-2 p-3"}>
      <dt className="text-13 text-texto-2">{rotulo}</dt>
      <dd className="numeros text-17 font-bold whitespace-nowrap">{valor}</dd>
    </div>
  );
}

/**
 * Calculadora: contas soltas, sem mexer nos registros.
 * 1. Salário → valor da hora e da hora extra (e usar no perfil, se quiser).
 * 2. Entrada, saída e almoço → horas e valor de um dia.
 */
export default function Calculadora() {
  const estado = useEstado();
  const { mostrar } = useToast();
  const pg = estado?.perfil?.pagamento;
  const salarioPerfil = (pg && salarioMensal(pg)?.salario) || 0;
  const horaPerfil = pg?.forma === "hora" ? pg.valorHora : 0;

  const [salarioTxt, setSalarioTxt] = useState<string | null>(null);
  const [semana, setSemana] = useState(44);
  const [entrada, setEntrada] = useState("07:00");
  const [saida, setSaida] = useState("17:00");
  const [almoco, setAlmoco] = useState(60);
  const [jornada, setJornada] = useState(528);
  const [horaTxt, setHoraTxt] = useState<string | null>(null);

  if (!estado?.perfil) return <Carregando />;
  const perfil = estado.perfil;

  const salario = lerReais(salarioTxt ?? paraTexto(salarioPerfil)) ?? 0;
  const pctExtra = perfil.adicionais.extraDiaUtil;
  const pctDomingo = perfil.adicionais.extraDomingo;
  const v = valorDaHoraDoSalario(salario, divisorDaSemana(semana), pctExtra, pctDomingo);
  const valorHora = lerReais(horaTxt ?? paraTexto(horaPerfil || v.hora)) ?? 0;
  const dia = contaDoDia({ entrada, saida, almocoMin: almoco, jornadaMin: jornada, valorHora, pctExtra });
  const podeUsar = perfil.pagamento.forma === "hora" && v.hora > 0 && v.hora !== horaPerfil;

  async function usarNoPerfil() {
    await salvarPerfil(editar(perfil, ["pagamento.valorHora"], (p) => {
      if (p.pagamento.forma === "hora") p.pagamento.valorHora = v.hora;
    }));
    setHoraTxt(null);
    mostrar({ texto: `Valor da hora agora é ${formatarReais(v.hora)}` });
  }

  return (
    <main className="flex flex-col gap-6 px-4 pb-6">
      <CabecalhoTela titulo="Calculadora" subtitulo="Contas rápidas. Nada aqui muda seus registros." />

      <section aria-labelledby="t-hora" className="flex flex-col gap-3">
        <TituloSecao id="t-hora">Quanto vale sua hora</TituloSecao>
        <div className="cartao flex flex-col gap-4 p-4">
          <CampoNumero rotulo="Salário mensal" prefixo="R$" valor={salarioTxt ?? paraTexto(salarioPerfil)} onChange={setSalarioTxt} placeholder="0,00" />
          <div className="flex flex-col gap-2">
            <span className="text-15 font-bold">Horas por semana</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Horas por semana">
              {SEMANAS.map((h) => (
                <Chip key={h} selecionado={semana === h} onClick={() => setSemana(h)}>{h}h</Chip>
              ))}
            </div>
            <p className="text-13 text-texto-2">O salário é dividido por {divisorDaSemana(semana)} horas no mês.</p>
          </div>
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
            <Resultado rotulo="Hora" valor={formatarReais(v.hora)} destaque />
            <Resultado rotulo={`Extra +${pctExtra}%`} valor={formatarReais(v.extra)} />
            <Resultado rotulo={`Domingo +${pctDomingo}%`} valor={formatarReais(v.extraDomingo)} />
          </dl>
          {podeUsar && (
            <BotaoPrincipal variante="secundaria" icone={Check} onClick={usarNoPerfil}>
              Usar {formatarReais(v.hora)} como meu valor da hora
            </BotaoPrincipal>
          )}
        </div>
      </section>

      <section aria-labelledby="t-dia" className="flex flex-col gap-3">
        <TituloSecao id="t-dia">Quanto deu um dia</TituloSecao>
        <div className="cartao flex flex-col gap-4 p-4">
          <div className="flex flex-col divide-y divide-borda">
            <Horario rotulo="Entrada" valor={entrada} onChange={setEntrada} />
            <Horario rotulo="Saída" valor={saida} onChange={setSaida} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-15 font-bold">Almoço</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Almoço">
              {ALMOCOS.map((m) => (
                <Chip key={m} selecionado={almoco === m} onClick={() => setAlmoco(m)}>{m ? formatarHorasCurto(m).replace(/^0h/, "") + (m < 60 ? " min" : "") : "Sem"}</Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-15 font-bold">Jornada do dia</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Jornada do dia">
              {JORNADAS.map((m) => (
                <Chip key={m} selecionado={jornada === m} onClick={() => setJornada(m)}>{formatarHorasCurto(m)}</Chip>
              ))}
            </div>
          </div>
          <CampoNumero rotulo="Valor da hora" prefixo="R$" valor={horaTxt ?? paraTexto(horaPerfil || v.hora)} onChange={setHoraTxt} placeholder="0,00" />
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
            <Resultado rotulo="Trabalhado" valor={formatarHorasCurto(dia.trabalhadoMin)} />
            <Resultado rotulo="Hora extra" valor={formatarHorasCurto(dia.extraMin)} />
            <Resultado rotulo="Valor do dia" valor={formatarReais(dia.valor)} destaque />
          </dl>
          <p className="text-13 text-texto-2">Hora extra com +{pctExtra}%, como nas suas regras. Saída antes da entrada conta como plantão que vira a noite.</p>
        </div>
      </section>
    </main>
  );
}
