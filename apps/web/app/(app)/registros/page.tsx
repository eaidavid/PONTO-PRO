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
  pendenciasDoPeriodo,
  periodoDaData,
  periodoVizinho,
  rotuloPeriodo,
  saldoDoDia,
  validarMarcacoes,
} from "@ponto-pro/core";
import {
  Banner,
  BotaoPrincipal,
  BottomSheet,
  CabecalhoTela,
  ResumoNumeros,
  Chip,
  EscolhaTipoDia,
  LinhaRegistro,
  SeletorHora,
  useToast,
} from "@ponto-pro/ui";
import { CircleCheck, ChevronLeft, ChevronRight, Clock, Eraser, Save, Scale, TrendingDown, TrendingUp, TriangleAlert, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { apagarRegistro, restaurarRegistro, salvarRegistro } from "../../../lib/acoes";
import { abaExtraDoPerfil, useAgora, useEstado, useRegistrosDoPeriodo } from "../../../lib/estado";
import { AbasRegistro } from "../abas-registro";
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

  // período mostrado; o histórico antigo é lido do banco só quando a pessoa navega até ele
  const periodoAtual = estado?.perfil && agora ? periodoDaData(referencia ?? agora.data, estado.perfil.ciclo.diaFechamento) : null;
  const doPeriodo = useRegistrosDoPeriodo(periodoAtual?.inicio ?? "", periodoAtual?.fim ?? "");

  const calc = useMemo(() => {
    if (!estado?.perfil || !agora || !periodoAtual || !doPeriodo) return null;
    const perfil = estado.perfil;
    const periodo = periodoAtual;
    const r = calcularPeriodo({ perfil, periodo, registros: doPeriodo, agora });
    const atual = agora.data >= periodo.inicio && agora.data <= periodo.fim;
    const dias = r.dias.filter((d) => d.data <= agora.data).reverse();
    return { periodo, r, atual, dias, pendencias: pendenciasDoPeriodo(r.dias, agora.data) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, agora, periodoAtual?.inicio, doPeriodo]);

  if (!estado?.perfil || !agora || !calc || !doPeriodo) return <Carregando />;
  const { perfil } = estado;
  const registros = doPeriodo;
  const { periodo, r, atual, dias, pendencias } = calc;
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

  const horasEditando = editando
    ? calcularPeriodo({ perfil, periodo: { inicio: editando.data, fim: editando.data }, registros: [editando], modo: "dia" }).dias[0]!
    : null;

  return (
    <main className="flex flex-col gap-4 px-4">
      <CabecalhoTela titulo="Registros" subtitulo="Toque num dia para ajustar os horários." />
      {abaExtraDoPerfil(perfil) === "producao" && <AbasRegistro ativa="ponto" />}

      <nav aria-label="Período" className="cartao flex items-center justify-between gap-2 p-2">
        <button
          type="button"
          onClick={() => setReferencia(periodoVizinho(periodo, -1, perfil.ciclo.diaFechamento).inicio)}
          className="inline-flex min-h-12 items-center gap-1 rounded-full px-3 text-15 font-bold active:bg-superficie-2"
        >
          <ChevronLeft aria-hidden className="size-5" /> Anterior
        </button>
        <div className="text-center">
          <p className="display whitespace-nowrap text-20">{rotuloPeriodo(periodo)}</p>
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

      {pendencias.length === 0 ? (
        <p role="status" className="cartao flex items-center gap-3 p-4 text-17 font-bold">
          <CircleCheck aria-hidden className="size-6 shrink-0 text-sucesso-texto" /> Tudo certo neste período.
        </p>
      ) : (
        <section aria-label="Dias que precisam de atenção" className="cartao flex flex-col gap-3 border-l-4 border-l-[color:var(--extra)]! p-4">
          <p className="flex items-center gap-2 text-17 font-bold">
            <TriangleAlert aria-hidden className="size-5 shrink-0 text-extra-texto" />
            {pendencias.length === 1 ? "1 dia precisa de atenção" : `${pendencias.length} dias precisam de atenção`}
          </p>
          <div className="flex flex-wrap gap-2">
            {pendencias.slice(0, 6).map((p) => (
              <Chip key={p.data} onClick={() => abrir(p.data)}>{p.texto}</Chip>
            ))}
          </div>
        </section>
      )}

      <ResumoNumeros
        rotulo="Resumo do período"
        itens={[
          { rotulo: "Trabalhado", icone: Clock, valor: <span className="display text-24">{formatarDuracao(r.horas.trabalhadoMin)}</span> },
          perfil.bancoHoras.ativo
            ? { rotulo: "Saldo de horas", icone: Scale, valor: <span className="display text-24">{formatarDuracao(r.saldoBancoMin, { sinal: true })}</span>, tom: r.saldoBancoMin >= 0 ? "extra" : "erro" }
            : { rotulo: "Hora extra", icone: TrendingUp, valor: <span className="display text-24">{r.horas.extraMin ? `+${formatarDuracao(r.horas.extraMin)}` : "0h"}</span>, tom: r.horas.extraMin ? "extra" : "normal" },
          { rotulo: "Faltas e atrasos", icone: TrendingDown, valor: <span className="display text-24">{r.horas.deficitMin ? `−${formatarDuracao(r.horas.deficitMin)}` : "0h"}</span>, tom: r.horas.deficitMin ? "erro" : "normal" },
        ]}
      />

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
            {validarMarcacoes(editando.marcacoes).map((a) => (
              <Banner key={a} tom="aviso" texto={a} />
            ))}
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
