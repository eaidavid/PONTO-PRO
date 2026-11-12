import { formatarDuracao, formatarReais, type Linha, type ResultadoPeriodo, type TipoLinha } from "@ponto-pro/core";
import { ChevronDown, Equal, Minus } from "lucide-react";
import { cx } from "../cx";

/** Tira da conta o nome repetido do item e o "= R$ ..." do fim (o valor fica à direita). */
export function contaSemTotal(l: Linha): string {
  let c = l.conta.replace(/\s*=\s*[−-]?R\$\s?[\d.,]+\s*$/, "").trim();
  if (c.toLowerCase().startsWith(l.descricao.toLowerCase())) c = c.slice(l.descricao.length).trim();
  c = c.replace(/^\((?:valor fixo|dia pago)\)\s*/i, "").replace(/^[:,]\s*/, "").trim();
  return c;
}

/** Conta por faixas (INSS, imposto) vira uma linha por faixa; o resto fica numa linha só. */
export function linhasDaConta(conta: string): string[] {
  const i = conta.indexOf("por faixas:");
  if (i < 0) return [conta];
  const cabeca = conta.slice(0, i + "por faixas".length);
  const faixas = conta.slice(i + "por faixas:".length).split(" + ").map((f) => f.trim()).filter(Boolean);
  return [`${cabeca}:`, ...faixas];
}

/** Cor de cada tipo de linha: a mesma na barra e no marcador da linha. */
const COR: Record<TipoLinha, string> = {
  salario: "bg-primaria",
  normal: "bg-primaria",
  diaria: "bg-primaria",
  abono: "bg-primaria/45",
  extra: "faixa-seguranca bg-extra-suave",
  adicional: "faixa-seguranca bg-extra-suave",
  producao: "bg-marca-destaque",
  desconto: "bg-erro",
};

function LinhaConta({ l, desconto }: { l: Linha; desconto?: boolean }) {
  const linhas = linhasDaConta(contaSemTotal(l));
  const faixas = linhas.length > 1;
  const resumo = faixas ? `${linhas.length - 1} faixas · toque para ver` : linhas[0];
  const extra = l.tipo === "extra" || l.tipo === "adicional";
  const valor = (
    <span className={cx("numeros shrink-0 text-17 font-bold whitespace-nowrap", desconto ? "text-erro-texto" : extra ? "text-extra-texto" : "text-texto")}>
      {desconto ? "−" : ""}
      {formatarReais(l.valor)}
    </span>
  );
  return (
    <li>
      <details className="group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
          <span aria-hidden className={cx("size-3 shrink-0 rounded-sm", COR[l.tipo])} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-15 font-bold leading-snug">{l.descricao}</span>
            {resumo && <span className="numeros truncate text-13 text-texto-2">{resumo}</span>}
          </span>
          {valor}
          <ChevronDown aria-hidden className="size-4 shrink-0 text-texto-2 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mb-3 ml-6 flex flex-col gap-2 rounded-xl bg-superficie-2 p-3">
          {faixas ? (
            <>
              <span className="numeros text-13 text-texto-2">{linhas[0]}</span>
              <ul className="flex flex-col gap-1">
                {linhas.slice(1).map((f) => {
                  const [conta, total] = f.split(" = ");
                  return (
                    <li key={f} className="numeros flex justify-between gap-3 text-15">
                      <span>{conta}</span>
                      <b className="whitespace-nowrap">{total}</b>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <span className="numeros text-15 font-bold">{linhas[0]}</span>
          )}
          {l.explicacao && <span className="text-13 text-texto-2">{l.explicacao}</span>}
        </div>
      </details>
    </li>
  );
}

function Numero({ rotulo, valor, tom }: { rotulo: string; valor: string; tom?: "extra" }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-superficie-2 px-3 py-2">
      <span className="numeros text-20 font-bold leading-tight whitespace-nowrap" style={tom === "extra" ? { color: "var(--extra-texto)" } : undefined}>{valor}</span>
      <span className="text-13 text-texto-2">{rotulo}</span>
    </div>
  );
}

export interface ExplicacaoContaProps {
  r: ResultadoPeriodo;
  /** "periodo": ganhos, descontos e o que recebe. "dia": só o que o dia rendeu. */
  modo?: "periodo" | "dia";
  /** Frase curta de contexto (ex.: "Conta até 20/11, com os dias que faltam pela escala."). */
  contexto?: string;
}

/**
 * "Por que deu isso?": números-chave no topo, uma barra com de onde vem o dinheiro,
 * linhas curtas (nome, conta e valor; a explicação abre ao tocar) e a conta final em blocos.
 */
export function ExplicacaoConta({ r, modo = "periodo", contexto }: ExplicacaoContaProps) {
  const temDescontos = modo === "periodo" && r.descontos.length > 0;
  const total = r.bruto || 1;
  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="grid grid-cols-3 gap-2">
        <Numero rotulo="trabalhadas" valor={formatarDuracao(r.horas.trabalhadoMin)} />
        <Numero rotulo="hora extra" valor={formatarDuracao(r.horas.extraMin)} tom={r.horas.extraMin > 0 ? "extra" : undefined} />
        <Numero rotulo="por hora" valor={r.valorHora > 0 ? formatarReais(r.valorHora) : "—"} />
      </div>
      {contexto && <p className="-mt-2 text-13 text-texto-2">{contexto}</p>}

      <section aria-label="O que você ganhou" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-15 font-bold text-texto-2">O que você ganhou</h3>
          <span className="numeros text-15 font-bold">{formatarReais(r.bruto)}</span>
        </div>
        {r.ganhos.length > 0 && (
          <div aria-hidden className="flex h-3 gap-[2px] overflow-hidden rounded-full">
            {r.ganhos.map((l) => (
              <span key={l.codigo + l.descricao} className={cx("h-full first:rounded-l-full last:rounded-r-full", COR[l.tipo])} style={{ width: `${(l.valor / total) * 100}%` }} />
            ))}
          </div>
        )}
        {r.ganhos.length === 0 ? (
          <p className="py-3 text-17 text-texto-2">Nada ainda: sem horas nem produção.</p>
        ) : (
          <ul className="divide-y divide-borda">
            {r.ganhos.map((l) => (
              <LinhaConta key={l.codigo + l.descricao} l={l} />
            ))}
          </ul>
        )}
        {modo === "dia" && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-primaria-suave px-4 py-3">
            <span className="text-17 font-bold">O dia rendeu</span>
            <span className="numeros text-24 font-bold whitespace-nowrap text-primaria-forte">{formatarReais(r.bruto)}</span>
          </div>
        )}
      </section>

      {temDescontos && (
        <section aria-label="O que é descontado" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-15 font-bold text-texto-2">O que é descontado</h3>
            <span className="numeros text-15 font-bold text-erro-texto">−{formatarReais(r.totalDescontos)}</span>
          </div>
          <ul className="divide-y divide-borda">
            {r.descontos.map((l) => (
              <LinhaConta key={l.codigo + l.descricao} l={l} desconto />
            ))}
          </ul>
        </section>
      )}

      {modo === "periodo" && (
        <section aria-label="O que você recebe" className="flex flex-col gap-2">
          {temDescontos && (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex flex-col rounded-2xl bg-superficie-2 px-3 py-2">
                <span className="text-13 text-texto-2">Ganhos</span>
                <span className="numeros text-17 font-bold whitespace-nowrap">{formatarReais(r.bruto)}</span>
              </div>
              <Minus aria-label="menos" className="size-5 text-texto-2" strokeWidth={3} />
              <div className="flex flex-col rounded-2xl bg-erro-suave px-3 py-2">
                <span className="text-13 text-erro-texto">Descontos</span>
                <span className="numeros text-17 font-bold whitespace-nowrap text-erro-texto">{formatarReais(r.totalDescontos)}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-primaria-suave px-4 py-3">
            <span className="flex items-center gap-2 text-15 font-bold whitespace-nowrap">
              {temDescontos && <Equal aria-hidden className="size-5 shrink-0" strokeWidth={3} />}
              Você deve receber
            </span>
            <span className="numeros text-[clamp(1.15rem,5.6vw,1.45rem)] font-bold whitespace-nowrap text-primaria-forte">{formatarReais(r.liquido)}</span>
          </div>
        </section>
      )}
    </div>
  );
}
