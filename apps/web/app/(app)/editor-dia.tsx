"use client";

import {
  calcularPeriodo,
  dataPorExtenso,
  type DiaRegistro,
  escalaDoDia,
  type Etapa,
  formatarDuracao,
  horariosComuns,
  marcacoesPrevistas,
  type Obra,
  type PerfilTrabalho,
  validarMarcacoes,
} from "@ponto-pro/core";
import { Banner, BotaoPrincipal, BottomSheet, Chip, EscolhaTipoDia, SeletorHora, useToast } from "@ponto-pro/ui";
import { Clock, Eraser, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apagarRegistro, restaurarRegistro, salvarRegistro } from "../../lib/acoes";

const ETAPAS: { id: Etapa; rotulo: string }[] = [
  { id: "entrada", rotulo: "Entrada" },
  { id: "almoco", rotulo: "Almoço" },
  { id: "volta", rotulo: "Volta" },
  { id: "saida", rotulo: "Saída" },
];

export interface EditorDiaProps {
  /** Data aberta (null = fechado). */
  data: string | null;
  registro: DiaRegistro | null;
  perfil: PerfilTrabalho;
  obras: Obra[];
  onFechar: () => void;
  /** Abre direto no campo de nota. */
  focoNota?: boolean;
}

/** Editor de um dia: horários, tipo do dia, obra e nota. Apagar pede confirmação. */
export function EditorDia({ data, registro, perfil, obras, onFechar, focoNota }: EditorDiaProps) {
  const { mostrar } = useToast();
  const [rascunho, setRascunho] = useState<DiaRegistro | null>(null);
  const [marco, setMarco] = useState<Etapa>("entrada");
  const [confirmarApagar, setConfirmarApagar] = useState(false);

  useEffect(() => {
    if (!data) {
      setRascunho(null);
      return;
    }
    const base: DiaRegistro = registro ? structuredClone(registro) : { data, tipo: "normal", marcacoes: {} };
    setRascunho(base);
    setMarco(ETAPAS.find((e) => !base.marcacoes[e.id])?.id ?? "saida");
    setConfirmarApagar(false);
  }, [data, registro]);

  const ed = rascunho;
  const comuns = horariosComuns(perfil.escala);
  const valorDoMarco = (d: DiaRegistro, m: Etapa) =>
    d.marcacoes[m] ?? marcacoesPrevistas(escalaDoDia(perfil.escala, d.data))[m] ?? { entrada: "07:00", almoco: "12:00", volta: "13:00", saida: "17:00" }[m];
  const horas = ed ? calcularPeriodo({ perfil, periodo: { inicio: ed.data, fim: ed.data }, registros: [ed], modo: "dia" }).dias[0]! : null;
  const comHorarios = ed && ["normal", "folga", "compensado", "feriado"].includes(ed.tipo);

  async function salvar() {
    if (!ed) return;
    const antes = registro;
    const limpo = { ...ed, observacao: ed.observacao?.trim() || undefined };
    await salvarRegistro(limpo);
    onFechar();
    mostrar({ texto: `Dia ${ed.data.slice(8, 10)}/${ed.data.slice(5, 7)} salvo`, desfazer: () => restaurarRegistro(ed.data, antes) });
  }

  async function apagar() {
    if (!ed) return;
    const antes = registro;
    await apagarRegistro(ed.data);
    setConfirmarApagar(false);
    onFechar();
    mostrar({ texto: "Registro apagado", desfazer: () => restaurarRegistro(ed.data, antes) });
  }

  return (
    <>
      <BottomSheet
        aberto={!!ed && !confirmarApagar}
        onFechar={onFechar}
        titulo={ed ? dataPorExtenso(ed.data).replace(/^./, (c) => c.toUpperCase()) : ""}
        subtitulo={horas ? `${formatarDuracao(horas.trabalhadoMin)} trabalhadas` : undefined}
        rodape={<BotaoPrincipal tamanho="g" icone={Save} onClick={salvar}>Salvar dia</BotaoPrincipal>}
      >
        {ed && (
          <div className="flex flex-col gap-6 pb-2">
            {validarMarcacoes(ed.marcacoes).map((a) => (
              <Banner key={a} tom="aviso" texto={a} />
            ))}
            {comHorarios && (
              <>
                <div role="group" aria-label="Qual horário" className="grid grid-cols-2 gap-2">
                  {ETAPAS.map((e) => (
                    <Chip key={e.id} selecionado={marco === e.id} onClick={() => setMarco(e.id)}>
                      {e.rotulo} {ed.marcacoes[e.id] ?? "--:--"}
                    </Chip>
                  ))}
                </div>
                <SeletorHora
                  rotulo={ETAPAS.find((e) => e.id === marco)!.rotulo}
                  valor={valorDoMarco(ed, marco)}
                  comuns={comuns}
                  onChange={(h) => setRascunho({ ...ed, marcacoes: { ...ed.marcacoes, [marco]: h } })}
                />
                {!ed.marcacoes[marco] ? (
                  <BotaoPrincipal variante="secundaria" icone={Clock} onClick={() => setRascunho({ ...ed, marcacoes: { ...ed.marcacoes, [marco]: valorDoMarco(ed, marco) } })}>
                    Usar este horário
                  </BotaoPrincipal>
                ) : (
                  <BotaoPrincipal
                    variante="fantasma"
                    icone={Eraser}
                    onClick={() => {
                      const m = { ...ed.marcacoes };
                      delete m[marco];
                      setRascunho({ ...ed, marcacoes: m });
                    }}
                  >
                    Limpar este horário
                  </BotaoPrincipal>
                )}
              </>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-17 font-bold">Tipo do dia</span>
              <EscolhaTipoDia valor={ed.tipo} onChange={(tipo) => setRascunho({ ...ed, tipo })} />
            </div>
            {obras.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-17 font-bold">Obra</span>
                <div role="group" aria-label="Obra do dia" className="flex flex-wrap gap-2">
                  <Chip selecionado={!ed.obraId} onClick={() => setRascunho({ ...ed, obraId: undefined })}>Nenhuma</Chip>
                  {obras.map((o) => (
                    <Chip key={o.id} selecionado={ed.obraId === o.id} onClick={() => setRascunho({ ...ed, obraId: o.id })}>{o.nome}</Chip>
                  ))}
                </div>
              </div>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-17 font-bold">Nota do dia</span>
              <textarea
                value={ed.observacao ?? ""}
                autoFocus={focoNota}
                onChange={(e) => setRascunho({ ...ed, observacao: e.target.value.slice(0, 200) })}
                placeholder="Ex.: choveu, obra parada"
                rows={2}
                className="min-h-20 rounded-cartao border-2 border-borda-forte bg-superficie p-3 text-17 outline-none focus:border-primaria"
              />
            </label>
            {registro && (
              <BotaoPrincipal variante="perigo" icone={Trash2} onClick={() => setConfirmarApagar(true)}>
                Apagar registro do dia
              </BotaoPrincipal>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet aberto={confirmarApagar} onFechar={() => setConfirmarApagar(false)} titulo="Apagar este dia?" subtitulo="Horários, tipo e nota saem do cálculo. Dá para desfazer logo depois.">
        <div className="flex flex-col gap-3 pb-2">
          <BotaoPrincipal variante="perigo" icone={Trash2} onClick={apagar}>Sim, apagar</BotaoPrincipal>
          <BotaoPrincipal variante="fantasma" onClick={() => setConfirmarApagar(false)}>Cancelar</BotaoPrincipal>
        </div>
      </BottomSheet>
    </>
  );
}
