import { formatarDuracao, formatarReais, type Linha, type ResultadoPeriodo } from "@ponto-pro/core";
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
  const cabeca = conta.slice(0, i + "por faixas".length).replace(/,\s*por faixas$/, ", por faixas");
  const faixas = conta.slice(i + "por faixas:".length).split(" + ").map((f) => f.trim()).filter(Boolean);
  return [`${cabeca}:`, ...faixas.map((f) => `• ${f}`)];
}

function LinhaConta({ l, desconto }: { l: Linha; desconto?: boolean }) {
  const conta = contaSemTotal(l);
  const extra = l.tipo === "extra" || l.tipo === "adicional";
  return (
    <li className="flex flex-col gap-1 py-3">
      <div className="flex items-start justify-between gap-3">
        <span className="text-17 font-bold">{l.descricao}</span>
        <span className={cx("numeros shrink-0 text-17 font-bold whitespace-nowrap", desconto ? "text-erro-texto" : extra ? "text-extra-texto" : "text-texto")}>
          {desconto ? "−" : ""}
          {formatarReais(l.valor)}
        </span>
      </div>
      {conta &&
        linhasDaConta(conta).map((t, i) => (
          <span key={i} className="numeros text-15 text-texto">{t}</span>
        ))}
      {l.explicacao && <span className="text-13 text-texto-2">{l.explicacao}</span>}
    </li>
  );
}

export interface ExplicacaoContaProps {
  r: ResultadoPeriodo;
  /** "periodo": ganhos, descontos e o que recebe. "dia": só o que o dia rendeu. */
  modo?: "periodo" | "dia";
  /** Frase de abertura (ex.: "Previsão até 20/11, contando os dias que faltam pela sua escala."). */
  contexto?: string;
}

/**
 * "Por que deu isso?": cada linha com o nome, a conta escrita como se fala, uma explicação curta
 * e o valor alinhado à direita. Ganhos, descontos e o resultado ficam separados.
 */
export function ExplicacaoConta({ r, modo = "periodo", contexto }: ExplicacaoContaProps) {
  const temDescontos = modo === "periodo" && r.descontos.length > 0;
  const horas = r.horas.trabalhadoMin;
  return (
    <div className="flex flex-col gap-5 pb-4">
      <p className="rounded-2xl bg-superficie-2 p-4 text-15">
        {contexto ? <>{contexto} </> : null}
        {horas > 0 && (
          <>
            <b className="numeros">{formatarDuracao(horas)}</b> trabalhadas
            {r.horas.extraMin > 0 && (
              <>
                , das quais <b className="numeros text-extra-texto">{formatarDuracao(r.horas.extraMin)}</b> de hora extra
              </>
            )}
            .{" "}
          </>
        )}
        {r.valorHora > 0 && (
          <>
            Sua hora vale <b className="numeros">{formatarReais(r.valorHora)}</b>.
          </>
        )}
      </p>

      <section aria-label="O que você ganhou" className="flex flex-col">
        <h3 className="text-15 font-bold text-texto-2">O que você ganhou</h3>
        {r.ganhos.length === 0 ? (
          <p className="py-3 text-17 text-texto-2">Nada ainda: sem horas nem produção.</p>
        ) : (
          <ul className="divide-y divide-borda">
            {r.ganhos.map((l) => (
              <LinhaConta key={l.codigo + l.descricao} l={l} />
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between gap-3 border-t-2 border-texto pt-3">
          <span className="text-17 font-bold">{modo === "dia" ? "O dia rendeu" : "Total ganho"}</span>
          <span className="numeros text-20 font-bold whitespace-nowrap">{formatarReais(r.bruto)}</span>
        </div>
      </section>

      {temDescontos && (
        <section aria-label="O que é descontado" className="flex flex-col">
          <h3 className="text-15 font-bold text-texto-2">O que é descontado</h3>
          <ul className="divide-y divide-borda">
            {r.descontos.map((l) => (
              <LinhaConta key={l.codigo + l.descricao} l={l} desconto />
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t-2 border-texto pt-3">
            <span className="text-17 font-bold">Total descontado</span>
            <span className="numeros text-20 font-bold whitespace-nowrap text-erro-texto">−{formatarReais(r.totalDescontos)}</span>
          </div>
        </section>
      )}

      {modo === "periodo" && (
        <section aria-label="O que você recebe" className="flex flex-col gap-1 rounded-2xl bg-primaria-suave p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-17 font-bold">Você deve receber</span>
            <span className="numeros text-24 font-bold whitespace-nowrap text-primaria-forte">{formatarReais(r.liquido)}</span>
          </div>
          {temDescontos && (
            <span className="numeros text-15 text-texto-2">
              {formatarReais(r.bruto)} ganhos − {formatarReais(r.totalDescontos)} descontos
            </span>
          )}
        </section>
      )}
    </div>
  );
}
