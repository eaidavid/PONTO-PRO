"use client";

import {
  agoraEmSaoPaulo,
  type Area,
  formatarHorasCurto,
  formatarPercentual,
  formatarReais,
  horasSemanais,
  lerReais,
  MODELOS,
  PACOTES_CONSTRUCAO,
  PACOTES_SERVICOS,
  PACOTES_TRANSPORTE,
  PerfilTrabalho,
  type PresetId,
  resumoDoPerfil,
} from "@ponto-pro/core";
import {
  Banner,
  BarraProgresso,
  BotaoPrincipal,
  CampoNumero,
  CampoTexto,
  Caixa,
  CartaoOpcao,
  Chip,
  Contador,
  EditorSemana,
  Interruptor,
  LinhaAjuste,
  SeloSugestao,
} from "@ponto-pro/ui";
import {
  ArrowRight,
  Brush,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  CircleCheckBig,
  Clock,
  Hammer,
  HardHat,
  HeartPulse,
  Layers,
  type LucideIcon,
  Percent,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { salvarConsentimento, salvarPerfil, salvarPessoal } from "../../lib/acoes";
import { useEstado } from "../../lib/estado";
import {
  almocoAtual,
  aplicarPreset,
  centavosParaTexto,
  comEscala,
  definirAlmoco,
  definirDia,
  editar,
  type Forma,
  minutosDaSemana,
  NOME_FORMA,
  pagamentoPara,
  valorPrincipal,
} from "../../lib/perfil";
import { LEGAL, MARCA } from "../../lib/marca";
import { TextoAceite } from "../aceite-termos";
import { Carregando } from "../carregando";

const AREAS: { id: Area; icone: LucideIcon; descricao: string }[] = [
  { id: "construcao", icone: HardHat, descricao: "Pedreiro, servente, eletricista, pintor, empreiteiro" },
  { id: "comercio", icone: Store, descricao: "Loja, mercado, atendimento — escala 6x1" },
  { id: "saude", icone: HeartPulse, descricao: "Plantão 12x36, enfermagem, cuidador" },
  { id: "transporte", icone: Truck, descricao: "Motorista, entregador, motoboy" },
  { id: "servicos", icone: Brush, descricao: "Diarista, limpeza, manutenção" },
  { id: "outro", icone: Briefcase, descricao: "Autônomo, por hora ou por projeto" },
];

const FORMAS: { id: Forma; icone: LucideIcon; descricao: string }[] = [
  { id: "hora", icone: Clock, descricao: "Recebo pelas horas que trabalho" },
  { id: "diaria", icone: CalendarDays, descricao: "Recebo um valor por dia" },
  { id: "mensal", icone: Wallet, descricao: "Recebo um salário todo mês" },
  { id: "producao", icone: Hammer, descricao: "Recebo pelo serviço feito (m², ponto, peça)" },
  { id: "misto", icone: Layers, descricao: "Hora mais produção" },
];

const PRESETS: { id: PresetId; rotulo: string }[] = [
  { id: "seg-sex-44", rotulo: "Seg a sex 44h" },
  { id: "seg-sab-44", rotulo: "Seg a sáb 44h" },
  { id: "6x1", rotulo: "6x1" },
  { id: "12x36", rotulo: "12x36" },
  { id: "seg-sex-40", rotulo: "Seg a sex 40h" },
];

const EXEMPLO = { valorHora: 2500, valorDiaria: 15000, salario: 200000 };
const PASSOS = ["Sua área", "Como você recebe", "Sua semana", "Hora extra e fechamento", "Seu valor"];

export default function Comecar() {
  const estado = useEstado();
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [perfil, setPerfil] = useState<PerfilTrabalho | null>(null);
  const [valorTxt, setValorTxt] = useState("");
  const [salarioTxt, setSalarioTxt] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string>();
  const [pronto, setPronto] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [estatisticas, setEstatisticas] = useState(false);
  const hoje = agoraEmSaoPaulo().data;

  useEffect(() => {
    if (!estado || pronto) return;
    const refazer = new URLSearchParams(window.location.search).has("refazer");
    if (estado.perfil && !refazer) router.replace("/hoje");
    else if (estado.perfil && refazer && !perfil) {
      setPerfil(estado.perfil);
      setNome(estado.pessoal.nome ?? "");
      setPronto(true);
    } else setPronto(true);
  }, [estado, router, perfil, pronto]);

  if (!estado || !pronto) return <Carregando />;

  const p = perfil;
  const vp = p ? valorPrincipal(p.pagamento) : null;
  const pacotesArea = p?.area === "transporte" ? PACOTES_TRANSPORTE : p?.area === "servicos" ? PACOTES_SERVICOS : PACOTES_CONSTRUCAO;
  const usaProducao = !!p && (p.pagamento.forma === "producao" || p.pagamento.forma === "misto" || p.producao.ativo);
  const desconto = p?.descontos.find((d): d is Extract<typeof d, { tipo: "percentual" }> => d.tipo === "percentual");
  const valorOk = !vp || (lerReais(valorTxt) ?? 0) > 0;
  const podeSeguir = passo === 0 ? !!p : passo === 4 ? valorOk && (!usaProducao || (p?.producao.pacotes.length ?? 0) > 0 || p?.pagamento.forma === "hora") : true;

  function escolherArea(area: Area) {
    const base = MODELOS[area].perfil(new Date().toISOString());
    setPerfil(base);
    const v = valorPrincipal(base.pagamento);
    setValorTxt(v ? centavosParaTexto(v.valor) : "");
  }

  function escolherForma(f: Forma) {
    if (!p) return;
    const pg = pagamentoPara(f, p.pagamento, Math.max(...(minutosDaSemana(p.escala) ?? [480])));
    const pgObj = pg as Record<string, unknown>;
    for (const [k, v] of Object.entries(EXEMPLO)) if (k in pgObj && !pgObj[k]) pgObj[k] = v;
    const novo = editar(p, [], (x) => {
      x.pagamento = pg;
      x.producao.ativo = f === "producao" || f === "misto" || (x.producao.ativo && f !== "mensal");
      if (x.producao.ativo && x.producao.pacotes.length === 0) x.producao.pacotes = pacotesArea.map((y) => y.id);
    });
    setPerfil(novo);
    const v = valorPrincipal(pg);
    setValorTxt(v ? centavosParaTexto(v.valor) : "");
  }

  function aplicarValor(x: PerfilTrabalho): PerfilTrabalho {
    const v = valorPrincipal(x.pagamento);
    if (!v) return x;
    const pg = { ...x.pagamento } as Record<string, unknown>;
    pg[v.campo] = lerReais(valorTxt) ?? v.valor;
    return { ...x, pagamento: pg as PerfilTrabalho["pagamento"] };
  }

  async function concluir() {
    if (!p) return;
    const final = aplicarValor(p);
    const r = PerfilTrabalho.safeParse(final);
    if (!r.success) {
      setErro(r.error.issues[0]?.message ?? "Confira os valores.");
      return;
    }
    await salvarConsentimento({ versao: LEGAL.versao, em: new Date().toISOString(), estatisticas });
    await salvarPerfil(r.data);
    await salvarPessoal({ ...estado!.pessoal, nome: nome.trim() || undefined });
    router.replace("/hoje");
  }

  const final = passo === 5;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col px-4">
      {!final && (
        <header className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 bg-fundo/95 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 backdrop-blur">
          <div className="flex items-center justify-between">
            {passo > 0 ? (
              <button type="button" onClick={() => setPasso(passo - 1)} className="-ml-2 inline-flex min-h-12 items-center gap-1 rounded-full px-2 text-17 font-bold active:bg-superficie-2">
                <ChevronLeft aria-hidden className="size-6" /> Voltar
              </button>
            ) : (
              <span className="leading-tight"><span className="display block text-20 text-primaria-forte">{MARCA.nome}</span><span className="text-13 text-texto-2">{MARCA.slogan}</span></span>
            )}
            {p && (
              <button type="button" onClick={() => setPasso(5)} className="min-h-12 rounded-full px-3 text-17 font-bold text-texto-2 active:bg-superficie-2">
                Pular
              </button>
            )}
          </div>
          <BarraProgresso valor={(passo + 1) / PASSOS.length} rotulo={`Passo ${passo + 1} de ${PASSOS.length}`} />
          <p className="text-15 text-texto-2">Passo {passo + 1} de {PASSOS.length} · {PASSOS[passo]}</p>
        </header>
      )}

      <div key={passo} className="entrada-escalonada flex flex-1 flex-col gap-4 pt-2 pb-36">
        {passo === 0 && (
          <>
            <h1 className="display text-32">Em que você trabalha?</h1>
            <p className="text-17 text-texto-2">Assim o app já vem com a semana e as regras mais comuns da sua área. Dá para mudar tudo depois.</p>
            <div role="radiogroup" aria-label="Sua área" className="flex flex-col gap-3">
              {AREAS.map((a) => (
                <CartaoOpcao key={a.id} icone={a.icone} titulo={MODELOS[a.id].nome} descricao={a.descricao} selecionado={p?.area === a.id} onClick={() => escolherArea(a.id)} />
              ))}
            </div>
          </>
        )}

        {passo === 1 && p && (
          <>
            <h1 className="display text-32">Como você recebe?</h1>
            <div role="radiogroup" aria-label="Como você recebe" className="flex flex-col gap-3">
              {FORMAS.map((f) => (
                <CartaoOpcao key={f.id} icone={f.icone} titulo={NOME_FORMA[f.id]} descricao={f.descricao} selecionado={p.pagamento.forma === f.id} onClick={() => escolherForma(f.id)} />
              ))}
            </div>
          </>
        )}

        {passo === 2 && p && (
          <>
            <h1 className="display text-32">Como é a sua semana?</h1>
            <div role="group" aria-label="Escalas prontas" className="flex flex-wrap gap-2">
              {PRESETS.map((x) => (
                <Chip key={x.id} selecionado={p.escala.preset === x.id || (x.id === "seg-sex-40" && p.escala.preset === "personalizada" && horasSemanais(p.escala) === 2400)} onClick={() => setPerfil(aplicarPreset(p, x.id, hoje))}>
                  {x.rotulo}
                </Chip>
              ))}
            </div>
            <div className="cartao p-4">
              {minutosDaSemana(p.escala) ? (
                <EditorSemana minutos={minutosDaSemana(p.escala)!} onChange={(d, m) => setPerfil(comEscala(p, definirDia(p.escala, d, m)))} />
              ) : (
                <p className="text-17">
                  <span className="display block text-32">12x36</span>
                  12 horas de plantão e 36 horas de descanso. Os dias de trabalho se alternam a partir de hoje.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-17 font-bold">Almoço</span>
              <div role="group" aria-label="Tempo de almoço" className="flex flex-wrap gap-2">
                {[0, 30, 60, 90, 120].map((m) => (
                  <Chip key={m} selecionado={almocoAtual(p.escala) === m} onClick={() => setPerfil({ ...p, escala: definirAlmoco(p.escala, m) })}>
                    {m === 0 ? "Sem almoço" : formatarHorasCurto(m)}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {passo === 3 && p && (
          <>
            <h1 className="display text-32">Hora extra e fechamento</h1>
            <SeloSugestao />
            <div className="cartao grid grid-cols-1 gap-6 p-4 min-[420px]:grid-cols-2">
              {(
                [
                  ["extraDiaUtil", "Dia útil"],
                  ["extraSabado", "Sábado"],
                  ["extraDomingo", "Domingo"],
                  ["extraFeriado", "Feriado"],
                ] as const
              ).map(([campo, rot]) => (
                <Contador
                  key={campo}
                  rotulo={rot}
                  valor={`+${formatarPercentual(p.adicionais[campo])}`}
                  passo="10%"
                  podeMenos={p.adicionais[campo] >= 10}
                  podeMais={p.adicionais[campo] <= 290}
                  onMenos={() => setPerfil(editar(p, [`adicionais.${campo}`], (x) => void (x.adicionais[campo] -= 10)))}
                  onMais={() => setPerfil(editar(p, [`adicionais.${campo}`], (x) => void (x.adicionais[campo] += 10)))}
                />
              ))}
            </div>
            <div className="cartao divide-y divide-borda px-4">
              <Interruptor
                rotulo="Compensação na semana"
                descricao="Horas a mais num dia cobrem a folga de outro e não viram extra."
                valor={p.jornada.compensacaoSemanal}
                onChange={(v) => setPerfil(editar(p, [], (x) => void (x.jornada.compensacaoSemanal = v)))}
              />
              <Interruptor
                rotulo="Saldo de horas"
                descricao="Hora extra vira saldo para folgar depois."
                valor={p.bancoHoras.ativo}
                onChange={(v) => setPerfil(editar(p, ["bancoHoras"], (x) => void (x.bancoHoras.ativo = v)))}
              />
            </div>
            <div className="cartao p-4">
              <Contador
                rotulo="O período fecha no dia"
                valor={String(p.ciclo.diaFechamento)}
                passo="1 dia"
                podeMenos={p.ciclo.diaFechamento > 1}
                podeMais={p.ciclo.diaFechamento < 31}
                onMenos={() => setPerfil(editar(p, [], (x) => void (x.ciclo.diaFechamento -= 1)))}
                onMais={() => setPerfil(editar(p, [], (x) => void (x.ciclo.diaFechamento += 1)))}
              />
            </div>
          </>
        )}

        {passo === 4 && p && (
          <>
            <h1 className="display text-32">Quanto você ganha?</h1>
            {vp && (
              <div className="cartao flex flex-col gap-3 p-4">
                <CampoNumero rotulo={vp.rotulo} prefixo="R$" valor={valorTxt} onChange={setValorTxt} placeholder="0,00" erro={!valorOk ? "Digite um valor maior que zero" : undefined} ajuda="Valor de exemplo. Troque pelo seu." />
                {p.pagamento.forma === "hora" && (
                  <div className="flex flex-col gap-2 rounded-2xl bg-superficie-2 p-3">
                    <CampoNumero rotulo="Sabe só o salário? Calcule a hora" prefixo="R$" valor={salarioTxt} onChange={setSalarioTxt} placeholder="Salário do mês" />
                    {(lerReais(salarioTxt) ?? 0) > 0 && (
                      <BotaoPrincipal variante="secundaria" onClick={() => setValorTxt(centavosParaTexto(Math.round((lerReais(salarioTxt) ?? 0) / 220)))}>
                        Usar {formatarReais(Math.round((lerReais(salarioTxt) ?? 0) / 220))} por hora (salário ÷ 220)
                      </BotaoPrincipal>
                    )}
                  </div>
                )}
              </div>
            )}
            {usaProducao && (
              <div className="flex flex-col gap-2">
                <span className="text-17 font-bold">Serviços que você faz</span>
                <p className="text-15 text-texto-2">Vêm com preços de exemplo. Você ajusta em Produção.</p>
                <div role="group" aria-label="Pacotes de serviços" className="flex flex-wrap gap-2">
                  {pacotesArea.map((pk) => {
                    const sel = p.producao.pacotes.includes(pk.id);
                    return (
                      <Chip
                        key={pk.id}
                        selecionado={sel}
                        onClick={() =>
                          setPerfil(
                            editar(p, [], (x) => {
                              x.producao.ativo = true;
                              x.producao.pacotes = sel ? x.producao.pacotes.filter((y) => y !== pk.id) : [...x.producao.pacotes, pk.id];
                            }),
                          )
                        }
                      >
                        {pk.nome}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-17 font-bold">Descontos no pagamento</span>
              <div role="radiogroup" aria-label="Descontos" className="flex flex-col gap-2">
                {(
                  [
                    { id: "clt", titulo: "Tenho carteira assinada (CLT)", descricao: "INSS e imposto de renda pela tabela oficial do ano" },
                    { id: "aprox", titulo: "Desconto aproximado", descricao: "Uma porcentagem que eu escolho" },
                    { id: "nenhum", titulo: "Não tenho desconto", descricao: "Autônomo, diarista, por conta própria" },
                  ] as const
                ).map((o) => {
                  const atual = p.descontos.some((d) => d.tipo === "inss") ? "clt" : desconto ? "aprox" : "nenhum";
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={atual === o.id}
                      onClick={() =>
                        setPerfil(
                          editar(p, ["descontos"], (x) => {
                            if (o.id === "clt") {
                              x.descontos = [
                                { id: "inss", nome: "INSS", tipo: "inss" },
                                { id: "irrf", nome: "Imposto de renda", tipo: "irrf", dependentes: 0 },
                              ];
                              x.clt = { dsrSobreExtras: true };
                            } else if (o.id === "aprox") {
                              x.descontos = [{ id: "aprox", nome: "Desconto aproximado", tipo: "percentual", valor: 9 }];
                              delete x.clt;
                            } else {
                              x.descontos = [];
                              delete x.clt;
                            }
                          }),
                        )
                      }
                      className={
                        atual === o.id
                          ? "cartao flex min-h-16 flex-col justify-center border-primaria! px-4 py-3 text-left ring-2 ring-primaria"
                          : "cartao flex min-h-16 flex-col justify-center px-4 py-3 text-left active:scale-[0.98]"
                      }
                    >
                      <span className="text-17 font-bold">{o.titulo}</span>
                      <span className="text-15 text-texto-2">{o.descricao}</span>
                    </button>
                  );
                })}
              </div>
              {desconto && (
                <Contador
                  rotulo="Quanto é descontado"
                  valor={formatarPercentual(desconto.valor)}
                  passo="1%"
                  podeMenos={desconto.valor > 1}
                  podeMais={desconto.valor < 30}
                  onMenos={() => setPerfil(editar(p, ["descontos"], (x) => { const d = x.descontos.find((y) => y.tipo === "percentual"); if (d && d.tipo === "percentual") d.valor = Math.max(1, Math.round(d.valor) - 1); }))}
                  onMais={() => setPerfil(editar(p, ["descontos"], (x) => { const d = x.descontos.find((y) => y.tipo === "percentual"); if (d && d.tipo === "percentual") d.valor = Math.min(30, Math.round(d.valor) + 1); }))}
                />
              )}
            </div>
          </>
        )}

        {final && p && (
          <>
            <div className="fundo-marca -mx-4 flex flex-col items-start gap-3 px-5 pt-[max(40px,env(safe-area-inset-top))] pb-8">
              <span className="flex size-16 items-center justify-center rounded-full bg-white/14 text-marca-destaque animate-check">
                <CircleCheckBig aria-hidden className="size-9" strokeWidth={2.25} />
              </span>
              <h1 className="display text-44">Pronto!</h1>
              <p className="text-20">{resumoDoPerfil(aplicarValor(p))}</p>
            </div>
            <CampoTexto rotulo="Como quer ser chamado?" valor={nome} onChange={setNome} placeholder="Seu nome (opcional)" autoComplete="given-name" maxLength={60} />
            <div className="cartao divide-y divide-borda overflow-hidden">
              <LinhaAjuste icone={HardHat} rotulo="Área" valor={MODELOS[p.area].nome} onClick={() => setPasso(0)} />
              <LinhaAjuste icone={Wallet} rotulo="Como recebe" valor={`${NOME_FORMA[p.pagamento.forma]}${vp ? ` · ${formatarReais(lerReais(valorTxt) ?? vp.valor)}` : ""}`} onClick={() => setPasso(1)} />
              <LinhaAjuste icone={CalendarDays} rotulo="Sua semana" valor={`${formatarHorasCurto(horasSemanais(p.escala))} por semana`} onClick={() => setPasso(2)} />
              <LinhaAjuste
                icone={Percent}
                rotulo="Hora extra e fechamento"
                valor={`Sábado +${formatarPercentual(p.adicionais.extraSabado)} · fecha dia ${p.ciclo.diaFechamento}`}
                sugestao={p.sugestoes.includes("adicionais.extraSabado")}
                onClick={() => setPasso(3)}
              />
            </div>
            <p className="text-13 text-texto-2">O {MARCA.nome} é controle pessoal, não é ponto eletrônico oficial. Seus dados ficam guardados neste celular.</p>
            <div className="flex flex-col gap-4 pt-2">
              <Caixa marcado={aceito} onChange={setAceito}>
                <TextoAceite />
              </Caixa>
              <Caixa marcado={estatisticas} onChange={setEstatisticas}>
                Quero ajudar a melhorar o app com estatísticas de uso, sem me identificar. (Opcional)
              </Caixa>
            </div>
            {erro && <Banner tom="erro" texto={erro} />}
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[color:var(--borda-cartao)] bg-[color-mix(in_srgb,var(--fundo)_92%,transparent)] px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mx-auto max-w-[560px]">
          {final ? (
            <BotaoPrincipal tamanho="g" icone={ArrowRight} disabled={!aceito} onClick={concluir}>Começar a usar</BotaoPrincipal>
          ) : (
            <BotaoPrincipal tamanho="g" icone={ArrowRight} disabled={!podeSeguir} onClick={() => setPasso(passo + 1)}>
              Continuar
            </BotaoPrincipal>
          )}
        </div>
      </div>
    </main>
  );
}
