"use client";

import {
  type Desconto,
  ehSugestao,
  formatarHorasCurto,
  formatarPercentual,
  formatarReais,
  horasSemanais,
  lerReais,
  MODELOS,
  type PerfilTrabalho,
  descreverDesconto,
  PLANOS,
  pontosFacultativos,
  tabelaDoAno,
  resumoDoPerfil,
} from "@ponto-pro/core";
import {
  BotaoPrincipal,
  BottomSheet,
  CampoNumero,
  CampoTexto,
  Chip,
  Contador,
  EditorSemana,
  Interruptor,
  LinhaAjuste,
  SeloSugestao,
  useToast,
} from "@ponto-pro/ui";
import {
  Briefcase,
  Cloud,
  LogIn,
  LogOut,
  CalendarClock,
  CalendarDays,
  Download,
  FileText,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  Gem,
  PartyPopper,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import { apagarTudo, exportarDados, novoId, salvarFeriadosLocais, salvarPerfil, salvarPessoal, salvarPreferencias } from "../../../lib/acoes";
import type { DadosPessoais } from "../../../lib/db";
import { useEstado } from "../../../lib/estado";
import {
  almocoAtual,
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
} from "../../../lib/perfil";
import { MARCA } from "../../../lib/marca";
import { sincronizarAgora, useStatusNuvem } from "../../../lib/nuvem/status";
import { situacaoAtual } from "../../../lib/plano";
import { Carregando } from "../../carregando";
import { PreferenciasVisuais } from "../preferencias-visuais";

const NOME_PAGAMENTO = (p: PerfilTrabalho) =>
  !p.diaPagamento || p.diaPagamento.tipo === "quinto-dia-util" ? "cai no 5º dia útil" : p.diaPagamento.tipo === "no-fechamento" ? "cai no fechamento" : `cai dia ${p.diaPagamento.dia}`;

type Painel = "pagamento" | "semana" | "extra" | "fechamento" | "regras" | "descontos" | "pessoal" | "apagar" | "feriados" | null;

/** +5511987654321 → (11) 98765-4321 */
function formatarTelefone(t: string) {
  const d = t.replace(/\D/g, "").replace(/^55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : t;
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-15 font-bold text-texto-2">{titulo}</h2>
      <div className="cartao divide-y divide-borda overflow-hidden">{children}</div>
    </section>
  );
}

export default function Conta() {
  const estado = useEstado();
  const nuvem = useStatusNuvem();
  const router = useRouter();
  const { mostrar } = useToast();
  const [painel, setPainel] = useState<Painel>(null);
  const [novoFeriado, setNovoFeriado] = useState({ nome: "", dia: "", todoAno: true });
  const arquivo = useRef<HTMLInputElement>(null);
  const [rascunho, setRascunho] = useState<PerfilTrabalho | null>(null);
  const [valorTxt, setValorTxt] = useState("");
  const [pessoal, setPessoal] = useState<DadosPessoais>({});
  const [novoDesc, setNovoDesc] = useState<{ nome: string; tipo: "percentual" | "fixo"; valor: string }>({ nome: "", tipo: "percentual", valor: "" });

  if (!estado?.perfil) return <Carregando />;
  const { perfil, preferencias } = estado;
  const p = rascunho ?? perfil;

  function abrir(qual: Exclude<Painel, null>) {
    setRascunho(structuredClone(perfil));
    const v = valorPrincipal(perfil.pagamento);
    setValorTxt(v ? centavosParaTexto(v.valor) : "");
    setPessoal({ ...estado!.pessoal });
    setNovoDesc({ nome: "", tipo: "percentual", valor: "" });
    setPainel(qual);
  }

  async function salvar(mensagem = "Ajuste salvo") {
    if (rascunho) await salvarPerfil(rascunho);
    setPainel(null);
    setRascunho(null);
    mostrar({ texto: mensagem });
  }

  const mudar = (caminhos: string[], f: (x: PerfilTrabalho) => void) => setRascunho(editar(p, caminhos, f));
  const vp = valorPrincipal(perfil.pagamento);
  const sem = minutosDaSemana(p.escala);
  const valorOk = !vp || (lerReais(valorTxt) ?? 0) > 0;

  return (
    <main className="flex flex-col gap-6 px-4 pb-4">
      <header className="fundo-marca -mx-4 flex flex-col gap-3 px-5 pt-[max(28px,env(safe-area-inset-top))] pb-6">
        <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-white/14 text-24 font-bold">
          {(estado.pessoal.nome?.trim()[0] ?? "V").toUpperCase()}
        </span>
        <div>
          <h1 className="display text-32">{estado.pessoal.nome?.trim() || "Sua conta"}</h1>
          <p className="text-15 text-sobre-marca-2">
            {MODELOS[perfil.area].nome} · {NOME_FORMA[perfil.pagamento.forma]}
          </p>
        </div>
        <p className="rounded-2xl bg-white/8 p-3 text-17">{resumoDoPerfil(perfil)}</p>
      </header>

      <Grupo titulo="Seu trabalho">
        {vp && <LinhaAjuste icone={Wallet} rotulo={vp.rotulo} valor={formatarReais(vp.valor)} onClick={() => abrir("pagamento")} />}
        {!vp && <LinhaAjuste icone={Wallet} rotulo="Como você recebe" valor={NOME_FORMA[perfil.pagamento.forma]} onClick={() => abrir("pagamento")} />}
        <LinhaAjuste icone={CalendarDays} rotulo="Sua semana" valor={`${formatarHorasCurto(horasSemanais(perfil.escala))} por semana`} onClick={() => abrir("semana")} />
        <LinhaAjuste
          icone={Percent}
          rotulo="Hora extra"
          valor={`Dia útil ${formatarPercentual(perfil.adicionais.extraDiaUtil)} · sábado ${formatarPercentual(perfil.adicionais.extraSabado)} · domingo ${formatarPercentual(perfil.adicionais.extraDomingo)}`}
          sugestao={ehSugestao(perfil, "adicionais.extraSabado") || ehSugestao(perfil, "adicionais.extraDiaUtil")}
          onClick={() => abrir("extra")}
        />
        <LinhaAjuste
          icone={CalendarClock}
          rotulo="Fechamento e pagamento"
          valor={`Fecha dia ${perfil.ciclo.diaFechamento} · ${NOME_PAGAMENTO(perfil)}`}
          sugestao={!perfil.diaPagamento}
          onClick={() => abrir("fechamento")}
        />
        <LinhaAjuste
          icone={PartyPopper}
          rotulo="Feriados da sua cidade"
          valor={estado.feriadosLocais.length ? `${estado.feriadosLocais.length} cadastrados` : "Os nacionais já estão no app"}
          onClick={() => abrir("feriados")}
        />
        <LinhaAjuste
          icone={Scale}
          rotulo="Compensação e saldo de horas"
          valor={`Compensação ${perfil.jornada.compensacaoSemanal ? "ligada" : "desligada"} · saldo ${perfil.bancoHoras.ativo ? "ligado" : "desligado"}`}
          onClick={() => abrir("regras")}
        />
        <LinhaAjuste
          icone={Trash2}
          rotulo="Descontos"
          valor={perfil.descontos.length ? perfil.descontos.map((d) => d.nome).join(", ") : "Nenhum"}
          sugestao={ehSugestao(perfil, "descontos")}
          onClick={() => abrir("descontos")}
        />
        <LinhaAjuste icone={RefreshCw} rotulo="Refazer as perguntas do início" onClick={() => router.push("/comecar?refazer=1")} />
      </Grupo>

      <Grupo titulo="Contracheque">
        <LinhaAjuste
          icone={Briefcase}
          rotulo="Nome, cargo e empresa"
          valor={[estado.pessoal.nome, estado.pessoal.cargo, estado.pessoal.empresa].filter(Boolean).join(" · ") || "Toque para preencher"}
          onClick={() => abrir("pessoal")}
        />
      </Grupo>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-15 font-bold text-texto-2">Tamanho e aparência</h2>
        <div className="cartao flex flex-col gap-2 p-4">
          <PreferenciasVisuais preferencias={preferencias} />
          <Interruptor rotulo="Som ao bater o ponto" descricao="Um bipe curto, além da vibração." valor={preferencias.som} onChange={(som) => salvarPreferencias({ ...preferencias, som })} />
        </div>
      </section>

      {nuvem.configurado && (
        <Grupo titulo="Sua conta">
          {nuvem.usuario ? (
            <>
              <LinhaAjuste
                icone={Cloud}
                rotulo={nuvem.usuario.telefone ? formatarTelefone(nuvem.usuario.telefone) : nuvem.usuario.email ?? "Conectado"}
                valor={
                  nuvem.fase === "sincronizando"
                    ? "Enviando…"
                    : nuvem.fase === "erro"
                      ? "Não deu para sincronizar. Toque para tentar de novo"
                      : nuvem.ultimaEm
                        ? `Sincronizado às ${new Date(nuvem.ultimaEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`
                        : "Toque para sincronizar agora"
                }
                onClick={() => sincronizarAgora()}
              />
              <LinhaAjuste
                icone={LogOut}
                rotulo="Sair da conta"
                valor="Os dados continuam neste celular"
                onClick={async () => {
                  const [{ sairDaConta }, { esquecerSincronizacao }] = await Promise.all([import("../../../lib/nuvem/supabase"), import("../../../lib/nuvem/sincronizar")]);
                  await sairDaConta();
                  await esquecerSincronizacao();
                  mostrar({ texto: "Você saiu da conta" });
                }}
              />
            </>
          ) : (
            <LinhaAjuste icone={LogIn} rotulo="Entrar ou criar conta" valor="Guarde seus dados e use em outro celular" onClick={() => router.push("/entrar")} />
          )}
        </Grupo>
      )}

      <Grupo titulo="Privacidade e dados">
        <LinhaAjuste
          icone={Download}
          rotulo="Baixar meus dados"
          valor="Arquivo com tudo o que está no celular"
          onClick={async () => {
            const blob = await exportarDados();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "ponto-pro-meus-dados.json";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        />
        <LinhaAjuste icone={Upload} rotulo="Restaurar um backup" valor="Volta os dados de um arquivo baixado antes" onClick={() => arquivo.current?.click()} />
        <LinhaAjuste icone={Trash2} rotulo="Apagar todos os meus dados" perigo onClick={() => setPainel("apagar")} />
        <input
          ref={arquivo}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Arquivo de backup"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              const { importarDados } = await import("../../../lib/importar");
              const r = await importarDados(await f.text());
              const pl = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
              mostrar({
                texto: `Backup restaurado: ${pl(r.registros, "dia", "dias")} e ${pl(r.lancamentos, "lançamento", "lançamentos")}${
                  r.ignorados ? ` (${r.ignorados === 1 ? "1 item com erro ficou" : `${r.ignorados} itens com erro ficaram`} de fora)` : ""
                }`,
              });
            } catch (err) {
              mostrar({ texto: err instanceof Error ? err.message : "Não deu para restaurar o backup." });
            }
          }}
        />
      </Grupo>

      <Grupo titulo="Sobre">
        <LinhaAjuste icone={FileText} rotulo="Termos de uso" onClick={() => router.push("/termos")} />
        <LinhaAjuste icone={ShieldCheck} rotulo="Política de privacidade" onClick={() => router.push("/privacidade")} />
      </Grupo>

      <Grupo titulo="Plano">
        {(() => {
          const sp = situacaoAtual(estado);
          return (
            <LinhaAjuste
              icone={Gem}
              rotulo={sp.emTeste ? "Teste grátis do Individual" : PLANOS[sp.plano].nome}
              valor={sp.emTeste ? `${sp.diasDeTeste} ${sp.diasDeTeste === 1 ? "dia restante" : "dias restantes"}` : sp.aviso ?? "Ver planos e preços"}
              onClick={() => router.push("/planos")}
            />
          );
        })()}
      </Grupo>

      <p className="flex gap-2 px-1 text-13 text-texto-2">
        <FileText aria-hidden className="size-4 shrink-0" />
        O {MARCA.nome} é controle pessoal. Não é ponto eletrônico oficial (REP) e os valores são estimativas. Percentuais e regras são sugestões: confira com seu sindicato ou contador.
      </p>

      {/* ---------- painéis ---------- */}

      <BottomSheet
        aberto={painel === "pagamento"}
        onFechar={() => setPainel(null)}
        titulo="Como você recebe"
        rodape={
          <BotaoPrincipal
            tamanho="g"
            icone={Save}
            disabled={!valorOk}
            onClick={() => {
              if (!rascunho) return;
              const v = valorPrincipal(rascunho.pagamento);
              const pg = { ...rascunho.pagamento } as Record<string, unknown>;
              if (v) pg[v.campo] = lerReais(valorTxt) ?? 0;
              setRascunho(null);
              salvarPerfil({ ...rascunho, pagamento: pg as PerfilTrabalho["pagamento"] }).then(() => {
                setPainel(null);
                mostrar({ texto: "Valor salvo" });
              });
            }}
          >
            Salvar
          </BotaoPrincipal>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <div role="radiogroup" aria-label="Forma de pagamento" className="flex flex-wrap gap-2">
            {(Object.keys(NOME_FORMA) as Forma[]).map((f) => (
              <Chip
                key={f}
                selecionado={p.pagamento.forma === f}
                onClick={() =>
                  mudar([], (x) => {
                    x.pagamento = pagamentoPara(f, x.pagamento);
                    if (f === "producao" || f === "misto") x.producao.ativo = true;
                  })
                }
              >
                {NOME_FORMA[f]}
              </Chip>
            ))}
          </div>
          {valorPrincipal(p.pagamento) && (
            <CampoNumero
              rotulo={valorPrincipal(p.pagamento)!.rotulo}
              prefixo="R$"
              valor={valorTxt}
              onChange={setValorTxt}
              placeholder="0,00"
              erro={!valorOk ? "Digite um valor maior que zero" : undefined}
            />
          )}
          {p.pagamento.forma === "mensal" && (
            <p className="text-15 text-texto-2">
              Valor da hora para extras: salário ÷ {p.pagamento.divisorHoras} horas
              {lerReais(valorTxt) ? ` = ${formatarReais(Math.round((lerReais(valorTxt) ?? 0) / p.pagamento.divisorHoras))}` : ""}.
            </p>
          )}
          {p.pagamento.forma === "producao" && <p className="text-17">Você recebe pelo que lança na aba Produção.</p>}
        </div>
      </BottomSheet>

      <BottomSheet
        aberto={painel === "semana"}
        onFechar={() => setPainel(null)}
        titulo="Sua semana"
        subtitulo="Horas de trabalho por dia, sem o almoço."
        rodape={<BotaoPrincipal tamanho="g" icone={Save} onClick={() => salvar("Semana salva")}>Salvar semana</BotaoPrincipal>}
      >
        <div className="flex flex-col gap-5 pb-2">
          {sem ? (
            <EditorSemana minutos={sem} onChange={(d, m) => setRascunho(comEscala(p, definirDia(p.escala, d, m)))} />
          ) : (
            <p className="text-17">Escala em plantões (12x36): 12h de trabalho e 36h de descanso.</p>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-17 font-bold">Almoço</span>
            <div role="group" aria-label="Tempo de almoço" className="flex flex-wrap gap-2">
              {[0, 30, 60, 90, 120].map((m) => (
                <Chip key={m} selecionado={almocoAtual(p.escala) === m} onClick={() => setRascunho({ ...p, escala: definirAlmoco(p.escala, m) })}>
                  {m === 0 ? "Sem almoço" : formatarHorasCurto(m)}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        aberto={painel === "extra"}
        onFechar={() => setPainel(null)}
        titulo="Hora extra"
        subtitulo="Quanto a mais vale cada hora além da sua semana."
        rodape={<BotaoPrincipal tamanho="g" icone={Save} onClick={() => salvar("Percentuais salvos")}>Salvar</BotaoPrincipal>}
      >
        <div className="flex flex-col gap-6 pb-2">
          <SeloSugestao />
          {(
            [
              ["extraDiaUtil", "Dia útil"],
              ["extraSabado", "Sábado"],
              ["extraDomingo", "Domingo"],
              ["extraFeriado", "Feriado"],
            ] as const
          ).map(([campo, nome]) => (
            <Contador
              key={campo}
              rotulo={nome}
              valor={`+${formatarPercentual(p.adicionais[campo])}`}
              passo="10%"
              podeMenos={p.adicionais[campo] >= 10}
              podeMais={p.adicionais[campo] <= 290}
              onMenos={() => mudar([`adicionais.${campo}`], (x) => void (x.adicionais[campo] = Math.max(0, x.adicionais[campo] - 10)))}
              onMais={() => mudar([`adicionais.${campo}`], (x) => void (x.adicionais[campo] = Math.min(300, x.adicionais[campo] + 10)))}
            />
          ))}
          <Interruptor
            rotulo="Adicional noturno"
            descricao={`Das ${p.adicionais.noturno.inicio} às ${p.adicionais.noturno.fim}, +${formatarPercentual(p.adicionais.noturno.percentual)}`}
            valor={p.adicionais.noturno.ativo}
            onChange={(v) => mudar(["adicionais.noturno"], (x) => void (x.adicionais.noturno.ativo = v))}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        aberto={painel === "fechamento"}
        onFechar={() => setPainel(null)}
        titulo="Fechamento e pagamento"
        subtitulo="Quando o período fecha e quando o dinheiro cai."
        rodape={<BotaoPrincipal tamanho="g" icone={Save} onClick={() => salvar("Fechamento salvo")}>Salvar</BotaoPrincipal>}
      >
        <div className="pb-2">
          <Contador
            rotulo="Fecha no dia"
            valor={String(p.ciclo.diaFechamento)}
            passo="1 dia"
            grande
            podeMenos={p.ciclo.diaFechamento > 1}
            podeMais={p.ciclo.diaFechamento < 31}
            onMenos={() => mudar([], (x) => void (x.ciclo.diaFechamento -= 1))}
            onMais={() => mudar([], (x) => void (x.ciclo.diaFechamento += 1))}
          />
          <p className="pt-3 text-center text-17 text-texto-2">
            {p.ciclo.diaFechamento >= 28 ? "Fecha no fim do mês." : `Período do dia ${p.ciclo.diaFechamento + 1} ao dia ${p.ciclo.diaFechamento}.`}
          </p>
          <div className="flex flex-col gap-2 pt-6">
            <span className="text-17 font-bold">Quando o dinheiro cai?</span>
            {!p.diaPagamento && <SeloSugestao texto="Sugestão — na CLT, até o 5º dia útil do mês seguinte" />}
            <div role="radiogroup" aria-label="Dia do pagamento" className="flex flex-wrap gap-2">
              <Chip selecionado={(p.diaPagamento?.tipo ?? "quinto-dia-util") === "quinto-dia-util"} onClick={() => mudar([], (x) => void (x.diaPagamento = { tipo: "quinto-dia-util" }))}>5º dia útil</Chip>
              <Chip selecionado={p.diaPagamento?.tipo === "dia-fixo"} onClick={() => mudar([], (x) => void (x.diaPagamento = { tipo: "dia-fixo", dia: x.diaPagamento?.tipo === "dia-fixo" ? x.diaPagamento.dia : 10 }))}>Dia fixo</Chip>
              <Chip selecionado={p.diaPagamento?.tipo === "no-fechamento"} onClick={() => mudar([], (x) => void (x.diaPagamento = { tipo: "no-fechamento" }))}>No fechamento</Chip>
            </div>
            {p.diaPagamento?.tipo === "dia-fixo" && (
              <Contador
                rotulo="Cai no dia"
                valor={String(p.diaPagamento.dia)}
                passo="1 dia"
                podeMenos={p.diaPagamento.dia > 1}
                podeMais={p.diaPagamento.dia < 31}
                onMenos={() => mudar([], (x) => void (x.diaPagamento = { tipo: "dia-fixo", dia: (x.diaPagamento as { dia: number }).dia - 1 }))}
                onMais={() => mudar([], (x) => void (x.diaPagamento = { tipo: "dia-fixo", dia: (x.diaPagamento as { dia: number }).dia + 1 }))}
              />
            )}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        aberto={painel === "regras"}
        onFechar={() => setPainel(null)}
        titulo="Compensação e saldo"
        rodape={<BotaoPrincipal tamanho="g" icone={Save} onClick={() => salvar("Regras salvas")}>Salvar</BotaoPrincipal>}
      >
        <div className="flex flex-col divide-y divide-borda pb-2">
          <Interruptor
            rotulo="Compensação na semana"
            descricao="Horas a mais num dia cobrem horas a menos em outro, sem virar extra."
            valor={p.jornada.compensacaoSemanal}
            onChange={(v) => mudar([], (x) => void (x.jornada.compensacaoSemanal = v))}
          />
          <Interruptor
            rotulo="Saldo de horas"
            descricao="Hora extra vira saldo para folgar depois, em vez de dinheiro."
            valor={p.bancoHoras.ativo}
            onChange={(v) => mudar(["bancoHoras"], (x) => void (x.bancoHoras.ativo = v))}
          />
          <Interruptor
            rotulo="Folga remunerada sobre hora extra (DSR)"
            descricao="Na CLT, quem faz hora extra recebe também pelos domingos e feriados."
            valor={!!p.clt?.dsrSobreExtras}
            onChange={(v) => mudar(["clt"], (x) => void (x.clt = { dsrSobreExtras: v }))}
          />
          <Interruptor
            rotulo="Feriado é pago"
            descricao="Em feriado de dia de trabalho, as horas do dia são pagas mesmo sem trabalhar."
            valor={p.adicionais.feriadoTrabalhado.abonaDia}
            onChange={(v) => mudar([], (x) => void (x.adicionais.feriadoTrabalhado.abonaDia = v))}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        aberto={painel === "descontos"}
        onFechar={() => setPainel(null)}
        titulo="Descontos"
        subtitulo="Ex.: INSS, adiantamento, vale."
        rodape={<BotaoPrincipal tamanho="g" icone={Save} onClick={() => salvar("Descontos salvos")}>Salvar descontos</BotaoPrincipal>}
      >
        <div className="flex flex-col gap-4 pb-2">
          {ehSugestao(p, "descontos") && <SeloSugestao texto="Desconto aproximado — confira no seu contracheque" />}
          {p.descontos.length > 0 && (
            <ul className="cartao divide-y divide-borda overflow-hidden">
              {p.descontos.map((d) => (
                <li key={d.id} className="flex min-h-16 items-center gap-3 py-2 pr-2 pl-4">
                  <span className="flex-1">
                    <span className="block text-17 font-bold">{d.nome}</span>
                    <span className="numeros block text-15 text-texto-2">{descreverDesconto(d)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => mudar(["descontos"], (x) => void (x.descontos = x.descontos.filter((y) => y.id !== d.id)))}
                    className="inline-flex min-h-12 items-center gap-1.5 rounded-full px-3 text-15 font-bold text-erro-texto active:bg-erro-suave"
                  >
                    <Trash2 aria-hidden className="size-5" /> Tirar
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(() => {
            const tem = (t: string) => p.descontos.some((d) => d.tipo === t);
            const irrf = p.descontos.find((d): d is Extract<typeof d, { tipo: "irrf" }> => d.tipo === "irrf");
            return (
              <div className="flex flex-col gap-3">
                <span className="text-17 font-bold">Descontos da carteira assinada</span>
                <div className="flex flex-wrap gap-2">
                  {!tem("inss") && (
                    <Chip icone={Plus} onClick={() => mudar(["descontos"], (x) => void x.descontos.unshift({ id: novoId("d"), nome: "INSS", tipo: "inss" }))}>INSS (tabela oficial)</Chip>
                  )}
                  {!tem("irrf") && (
                    <Chip icone={Plus} onClick={() => mudar(["descontos"], (x) => void x.descontos.push({ id: novoId("d"), nome: "Imposto de renda", tipo: "irrf", dependentes: 0 }))}>Imposto de renda</Chip>
                  )}
                  {!tem("vale-transporte") && (
                    <Chip icone={Plus} onClick={() => mudar(["descontos"], (x) => void x.descontos.push({ id: novoId("d"), nome: "Vale-transporte", tipo: "vale-transporte", percentual: 6 }))}>Vale-transporte (6%)</Chip>
                  )}
                </div>
                {irrf && (
                  <Contador
                    rotulo="Dependentes no imposto de renda"
                    valor={String(irrf.dependentes)}
                    passo="1"
                    podeMenos={irrf.dependentes > 0}
                    podeMais={irrf.dependentes < 20}
                    onMenos={() => mudar(["descontos"], (x) => { const d = x.descontos.find((y) => y.tipo === "irrf"); if (d && d.tipo === "irrf") d.dependentes -= 1; })}
                    onMais={() => mudar(["descontos"], (x) => { const d = x.descontos.find((y) => y.tipo === "irrf"); if (d && d.tipo === "irrf") d.dependentes += 1; })}
                  />
                )}
                <p className="text-13 text-texto-2">Tabelas de {tabelaDoAno(new Date().getFullYear()).ano}: {tabelaDoAno(new Date().getFullYear()).inss.fonte}.</p>
              </div>
            );
          })()}
          <div className="flex flex-col gap-3 rounded-2xl bg-superficie-2 p-4">
            <span className="text-17 font-bold">Outro desconto</span>
            <CampoTexto rotulo="Nome" valor={novoDesc.nome} onChange={(nome) => setNovoDesc({ ...novoDesc, nome })} placeholder="Ex.: Adiantamento" maxLength={40} />
            <div role="group" aria-label="Tipo de desconto" className="flex gap-2">
              <Chip selecionado={novoDesc.tipo === "percentual"} onClick={() => setNovoDesc({ ...novoDesc, tipo: "percentual" })}>Percentual</Chip>
              <Chip selecionado={novoDesc.tipo === "fixo"} onClick={() => setNovoDesc({ ...novoDesc, tipo: "fixo" })}>Valor fixo</Chip>
            </div>
            <CampoNumero
              rotulo={novoDesc.tipo === "percentual" ? "Percentual" : "Valor"}
              prefixo={novoDesc.tipo === "fixo" ? "R$" : undefined}
              sufixo={novoDesc.tipo === "percentual" ? "%" : undefined}
              valor={novoDesc.valor}
              onChange={(valor) => setNovoDesc({ ...novoDesc, valor })}
              erro={novoDesc.tipo === "percentual" && Number(novoDesc.valor.replace(",", ".")) > 100 ? "O desconto deve ficar entre 0% e 100%" : undefined}
            />
            <BotaoPrincipal
              variante="secundaria"
              icone={Plus}
              disabled={
                !novoDesc.nome.trim() ||
                !novoDesc.valor ||
                (novoDesc.tipo === "percentual" ? !(Number(novoDesc.valor.replace(",", ".")) >= 0 && Number(novoDesc.valor.replace(",", ".")) <= 100) : lerReais(novoDesc.valor) === null)
              }
              onClick={() => {
                const d: Desconto =
                  novoDesc.tipo === "percentual"
                    ? { id: novoId("d"), nome: novoDesc.nome.trim(), tipo: "percentual", valor: Math.round(Number(novoDesc.valor.replace(",", ".")) * 100) / 100 }
                    : { id: novoId("d"), nome: novoDesc.nome.trim(), tipo: "fixo", valor: lerReais(novoDesc.valor) ?? 0 };
                mudar(["descontos"], (x) => void x.descontos.push(d));
                setNovoDesc({ nome: "", tipo: novoDesc.tipo, valor: "" });
              }}
            >
              Adicionar desconto
            </BotaoPrincipal>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        aberto={painel === "pessoal"}
        onFechar={() => setPainel(null)}
        titulo="Dados do contracheque"
        rodape={
          <BotaoPrincipal
            tamanho="g"
            icone={Save}
            onClick={async () => {
              await salvarPessoal(pessoal);
              setPainel(null);
              mostrar({ texto: "Dados salvos" });
            }}
          >
            Salvar
          </BotaoPrincipal>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <CampoTexto rotulo="Seu nome" valor={pessoal.nome ?? ""} onChange={(nome) => setPessoal({ ...pessoal, nome })} autoComplete="name" maxLength={60} />
          <CampoTexto rotulo="Cargo" valor={pessoal.cargo ?? ""} onChange={(cargo) => setPessoal({ ...pessoal, cargo })} placeholder="Ex.: Pedreiro" maxLength={40} />
          <CampoTexto rotulo="Empresa ou obra" valor={pessoal.empresa ?? ""} onChange={(empresa) => setPessoal({ ...pessoal, empresa })} maxLength={60} />
        </div>
      </BottomSheet>

      <BottomSheet aberto={painel === "feriados"} onFechar={() => setPainel(null)} titulo="Feriados da sua cidade" subtitulo="Os nacionais já estão no app. Aqui entram os da sua cidade ou estado.">
        {(() => {
          const ano = Number(new Date().toISOString().slice(0, 4));
          const lista = estado.feriadosLocais;
          const jaTem = new Set(lista.map((f) => f.data));
          const sugestoes = pontosFacultativos(ano).filter((f) => !jaTem.has(f.data) && f.data >= `${ano}-01-01`);
          const m = /^(\d{1,2})\/(\d{1,2})$/.exec(novoFeriado.dia.trim());
          const valido = !!m && Number(m[1]) >= 1 && Number(m[1]) <= 31 && Number(m[2]) >= 1 && Number(m[2]) <= 12 && novoFeriado.nome.trim().length > 0;
          return (
            <div className="flex flex-col gap-5 pb-2">
              {lista.length > 0 && (
                <ul className="cartao divide-y divide-borda overflow-hidden">
                  {lista.map((f) => (
                    <li key={f.data} className="flex min-h-16 items-center gap-3 py-2 pr-2 pl-4">
                      <span className="flex-1">
                        <span className="block text-17 font-bold">{f.nome}</span>
                        <span className="numeros block text-15 text-texto-2">{f.data.slice(8, 10)}/{f.data.slice(5, 7)}/{f.data.slice(0, 4)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => salvarFeriadosLocais(lista.filter((x) => x.data !== f.data))}
                        className="inline-flex min-h-12 items-center gap-1.5 rounded-full px-3 text-15 font-bold text-erro-texto active:bg-erro-suave"
                      >
                        <Trash2 aria-hidden className="size-5" /> Tirar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {sugestoes.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-15 font-bold text-texto-2">Pontos facultativos comuns</span>
                  <div className="flex flex-wrap gap-2">
                    {sugestoes.map((f) => (
                      <Chip key={f.data} icone={Plus} onClick={() => salvarFeriadosLocais([...lista, f])}>
                        {f.nome} {f.data.slice(8, 10)}/{f.data.slice(5, 7)}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 rounded-2xl bg-superficie-2 p-4">
                <span className="text-17 font-bold">Novo feriado</span>
                <CampoTexto rotulo="Nome" valor={novoFeriado.nome} onChange={(nome) => setNovoFeriado({ ...novoFeriado, nome })} placeholder="Ex.: Aniversário da cidade" maxLength={60} />
                <CampoTexto rotulo="Dia e mês" valor={novoFeriado.dia} onChange={(dia) => setNovoFeriado({ ...novoFeriado, dia: dia.replace(/[^\d/]/g, "").slice(0, 5) })} placeholder="20/01" inputMode="numeric" />
                <Interruptor rotulo="Repete todo ano" valor={novoFeriado.todoAno} onChange={(todoAno) => setNovoFeriado({ ...novoFeriado, todoAno })} />
                <BotaoPrincipal
                  variante="secundaria"
                  icone={Plus}
                  disabled={!valido}
                  onClick={async () => {
                    const [d, mes] = [Number(m![1]), Number(m![2])];
                    const anos = novoFeriado.todoAno ? [ano, ano + 1, ano + 2] : [ano];
                    const novos = anos.map((a) => ({
                      data: `${a}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
                      nome: novoFeriado.nome.trim(),
                      tipo: "local" as const,
                    }));
                    await salvarFeriadosLocais([...lista.filter((x) => !novos.some((n) => n.data === x.data)), ...novos]);
                    setNovoFeriado({ nome: "", dia: "", todoAno: true });
                    mostrar({ texto: "Feriado adicionado" });
                  }}
                >
                  Adicionar feriado
                </BotaoPrincipal>
              </div>
            </div>
          );
        })()}
      </BottomSheet>

      <BottomSheet aberto={painel === "apagar"} onFechar={() => setPainel(null)} titulo="Apagar todos os dados?" subtitulo={`Registros, produção e ajustes saem deste celular${nuvem.usuario ? " e da sua conta" : ""}. Não dá para desfazer.`}>
        <div className="flex flex-col gap-3 pb-2">
          <BotaoPrincipal
            variante="perigo"
            icone={Trash2}
            onClick={async () => {
              if (nuvem.usuario) {
                try {
                  const { apagarDadosNaNuvem } = await import("../../../lib/nuvem/supabase");
                  await apagarDadosNaNuvem();
                } catch {
                  mostrar({ texto: "Sem internet: não deu para apagar os dados da sua conta. Tente de novo com internet." });
                  return;
                }
              }
              await apagarTudo();
              window.location.href = "/comecar";
            }}
          >
            Sim, apagar tudo
          </BotaoPrincipal>
          <BotaoPrincipal variante="fantasma" onClick={() => setPainel(null)}>Cancelar</BotaoPrincipal>
        </div>
      </BottomSheet>

      <Link href="/hoje" className="sr-only">Voltar para Hoje</Link>
    </main>
  );
}
