"use client";

import {
  calcularPeriodo,
  dataPorExtenso,
  diaDaSemana,
  type DiaRegistro,
  escalaDoDia,
  type Etapa,
  formatarDuracao,
  horariosComuns,
  marcacoesPrevistas,
  periodoDaData,
  periodoVizinho,
  rotuloPeriodo,
  saldoDoDia,
} from "@ponto-pro/core";
import {
  BotaoPrincipal,
  BottomSheet,
  CabecalhoTela,
  CartaoValor,
  Chip,
  EscolhaTipoDia,
  LinhaRegistro,
  SeletorHora,
  useToast,
} from "@ponto-pro/ui";
import { ChevronLeft, ChevronRight, Clock, Eraser, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { apagarRegistro, restaurarRegistro, salvarRegistro } from "../../../lib/acoes";
import { useAgora, useEstado } from "../../../lib/estado";
import { Carregando } from "../../carregando";

const ETAPAS: { id: Etapa; rotulo: string }[] = [
  { id: "entrada", rotulo: "Entrada" },
  { id: "almoco", rotulo: "Almoço" },
  { id: "volta", rotulo: "Volta" },
  { id: "saida", rotulo: "Saída" },
];

export default function Registros() {
  const estado = useEstado();
  const agora = useAgora();
  const { mostrar } = useToast();
  const [referencia, setReferencia] = useState<string | null>(null);
  const [editando, setEditando] = useState<DiaRegistro | null>(null);
  const [original, setOriginal] = useState<DiaRegistro | null>(null);
  const [marco, setMarco] = useState<Etapa>("entrada");
  const [confirmarApagar, setConfirmarApagar] = useState(false);

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora) return null;
    const perfil = estado.perfil;
    const periodo = periodoDaData(referencia ?? agora.data, perfil.ciclo.diaFechamento);
    const r = calcularPeriodo({ perfil, periodo, registros: estado.registros, agora });
    const atual = agora.data >= periodo.inicio && agora.data <= periodo.fim;
    const dias = r.dias.filter((d) => d.data <= agora.data).reverse();
    return { periodo, r, atual, dias };
  }, [estado, agora, referencia]);

  if (!estado?.perfil || !agora || !calc) return <Carregando />;
  const { perfil, registros } = estado;
  const { periodo, r, atual, dias } = calc;
  const porData = new Map(registros.map((x) => [x.data, x]));
  const comuns = horariosComuns(perfil.escala);

  function abrir(data: string) {
    const reg = porData.get(data) ?? null;
    const base: DiaRegistro = reg ? structuredClone(reg) : { data, tipo: "normal", marcacoes: {} };
    setOriginal(reg);
    setEditando(base);
    setMarco(ETAPAS.find((e) => !base.marcacoes[e.id])?.id ?? "saida");
  }

  function valorDoMarco(d: DiaRegistro, m: Etapa) {
    return d.marcacoes[m] ?? marcacoesPrevistas(escalaDoDia(perfil.escala, d.data))[m] ?? (m === "entrada" ? "07:00" : m === "almoco" ? "12:00" : m === "volta" ? "13:00" : "17:00");
  }

  async function salvar() {
    if (!editando) return;
    const antes = original;
    await salvarRegistro(editando);
    setEditando(null);
    mostrar({ texto: `Dia ${editando.data.slice(8, 10)}/${editando.data.slice(5, 7)} salvo`, desfazer: () => restaurarRegistro(editando.data, antes) });
  }

  async function apagar() {
    if (!editando) return;
    const antes = original;
    await apagarRegistro(editando.data);
    setConfirmarApagar(false);
    setEditando(null);
    mostrar({ texto: "Registro apagado", desfazer: () => restaurarRegistro(editando.data, antes) });
  }

  const totalSaldo = r.horas.extraMin - r.horas.deficitMin;
  const horasEditando = editando
    ? calcularPeriodo({ perfil, periodo: { inicio: editando.data, fim: editando.data }, registros: [editando], modo: "dia" }).dias[0]!
    : null;

  return (
    <main className="flex flex-col gap-4 px-4">
      <CabecalhoTela titulo="Registros" subtitulo="Toque num dia para ajustar os horários." />

      <nav aria-label="Período" className="cartao flex items-center justify-between gap-2 p-2">
        <button
          type="button"
          onClick={() => setReferencia(periodoVizinho(periodo, -1, perfil.ciclo.diaFechamento).inicio)}
          className="inline-flex min-h-12 items-center gap-1 rounded-full px-3 text-15 font-bold active:bg-superficie-2"
        >
          <ChevronLeft aria-hidden className="size-5" /> Anterior
        </button>
        <div className="text-center">
          <p className="display text-24">{rotuloPeriodo(periodo)}</p>
          <p className="text-13 text-texto-2">{atual ? "Período atual" : "Período passado"}</p>
        </div>
        <button
          type="button"
          disabled={atual}
          onClick={() => setReferencia(periodoVizinho(periodo, 1, perfil.ciclo.diaFechamento).inicio)}
          className="inline-flex min-h-12 items-center gap-1 rounded-full px-3 text-15 font-bold active:bg-superficie-2 disabled:opacity-30"
        >
          Próximo <ChevronRight aria-hidden className="size-5" />
        </button>
      </nav>

      <div className="grid grid-cols-2 gap-3">
        <CartaoValor rotulo="Trabalhado" valor={formatarDuracao(r.horas.trabalhadoMin)} icone={Clock} />
        <CartaoValor
          rotulo={totalSaldo >= 0 ? "Hora extra" : "Faltando"}
          valor={formatarDuracao(Math.abs(totalSaldo))}
          tom={totalSaldo > 0 ? "extra" : totalSaldo < 0 ? "erro" : "normal"}
          detalhe={perfil.bancoHoras.ativo ? `Saldo de horas: ${formatarDuracao(r.saldoBancoMin, { sinal: true })}` : undefined}
        />
      </div>

      <ul className="cartao divide-y divide-borda overflow-hidden" aria-label={`Dias de ${rotuloPeriodo(periodo)}`}>
        {dias.map((d) => (
          <li key={d.data}>
            <LinhaRegistro
              data={d.data}
              marcacoes={porData.get(d.data)?.marcacoes}
              tipo={d.tipo}
              trabalhadoMin={d.trabalhadoMin}
              saldoMin={saldoDoDia(d)}
              feriado={d.feriado}
              hoje={d.data === agora.data}
              emAndamento={d.emAndamento}
              fimDeSemana={[0, 6].includes(diaDaSemana(d.data))}
              onClick={() => abrir(d.data)}
            />
          </li>
        ))}
      </ul>

      <BottomSheet
        aberto={!!editando && !confirmarApagar}
        onFechar={() => setEditando(null)}
        titulo={editando ? dataPorExtenso(editando.data).replace(/^./, (c) => c.toUpperCase()) : ""}
        subtitulo={horasEditando ? `${formatarDuracao(horasEditando.trabalhadoMin)} trabalhadas` : undefined}
        rodape={
          <BotaoPrincipal tamanho="g" icone={Save} onClick={salvar}>
            Salvar dia
          </BotaoPrincipal>
        }
      >
        {editando && (
          <div className="flex flex-col gap-6 pb-2">
            {(editando.tipo === "normal" || editando.tipo === "folga" || editando.tipo === "compensado" || editando.tipo === "feriado") && (
              <>
                <div role="group" aria-label="Qual horário" className="grid grid-cols-2 gap-2">
                  {ETAPAS.map((e) => (
                    <Chip key={e.id} selecionado={marco === e.id} onClick={() => setMarco(e.id)}>
                      {e.rotulo} {editando.marcacoes[e.id] ?? "--:--"}
                    </Chip>
                  ))}
                </div>
                <SeletorHora
                  rotulo={ETAPAS.find((e) => e.id === marco)!.rotulo}
                  valor={valorDoMarco(editando, marco)}
                  comuns={comuns}
                  onChange={(h) => setEditando({ ...editando, marcacoes: { ...editando.marcacoes, [marco]: h } })}
                />
                {!editando.marcacoes[marco] ? (
                  <BotaoPrincipal
                    variante="secundaria"
                    icone={Clock}
                    onClick={() => setEditando({ ...editando, marcacoes: { ...editando.marcacoes, [marco]: valorDoMarco(editando, marco) } })}
                  >
                    Usar este horário
                  </BotaoPrincipal>
                ) : (
                  <BotaoPrincipal
                    variante="fantasma"
                    icone={Eraser}
                    onClick={() => {
                      const m = { ...editando.marcacoes };
                      delete m[marco];
                      setEditando({ ...editando, marcacoes: m });
                    }}
                  >
                    Limpar este horário
                  </BotaoPrincipal>
                )}
              </>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-17 font-bold">Tipo do dia</span>
              <EscolhaTipoDia valor={editando.tipo} onChange={(tipo) => setEditando({ ...editando, tipo })} />
            </div>
            {original && (
              <BotaoPrincipal variante="perigo" icone={Trash2} onClick={() => setConfirmarApagar(true)}>
                Apagar registro do dia
              </BotaoPrincipal>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        aberto={confirmarApagar}
        onFechar={() => setConfirmarApagar(false)}
        titulo="Apagar este dia?"
        subtitulo="Os horários e o tipo do dia saem do cálculo. Dá para desfazer logo depois."
      >
        <div className="flex flex-col gap-3 pb-2">
          <BotaoPrincipal variante="perigo" icone={Trash2} onClick={apagar}>Sim, apagar</BotaoPrincipal>
          <BotaoPrincipal variante="fantasma" onClick={() => setConfirmarApagar(false)}>Cancelar</BotaoPrincipal>
        </div>
      </BottomSheet>
    </main>
  );
}
