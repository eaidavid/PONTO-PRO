"use client";

import { dataCurta } from "@ponto-pro/core";
import { BotaoPrincipal, BottomSheet, Caixa, useToast } from "@ponto-pro/ui";
import { ClipboardPaste, FileUp, Import } from "lucide-react";
import { useRef, useState } from "react";
import { lancarProducao, salvarItem, salvarPerfil, salvarPessoal, salvarVariosRegistros } from "../../../lib/acoes";
import type { Estado } from "../../../lib/estado";
import { aplicarRegrasAntigas, converterPontoAntigo, type ImportacaoAntiga } from "../../../lib/importar-antigo";

const pl = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Traz os dados do Ponto Pro antigo (o app de uma página só).
 * A pessoa copia os dados lá (botão "Levar meus dados para o Pingou") e cola aqui.
 * Nada é apagado: dias que já existem no Pingou ficam como estão.
 */
export function ImportarAntigo({ aberto, onFechar, estado }: { aberto: boolean; onFechar: () => void; estado: Estado }) {
  const { mostrar } = useToast();
  const [texto, setTexto] = useState("");
  const [exemplos, setExemplos] = useState(false);
  const [usarRegras, setUsarRegras] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  let previa: ImportacaoAntiga | null = null;
  let erroPrevia: string | null = null;
  if (texto.trim()) {
    try {
      previa = converterPontoAntigo(texto, { itens: estado.itens, datasComRegistro: estado.registros.map((r) => r.data) }, { incluirExemplos: exemplos });
    } catch (e) {
      erroPrevia = e instanceof Error ? e.message : "Não deu para ler esse texto.";
    }
  }
  let regras: ReturnType<typeof aplicarRegrasAntigas> | null = null;
  if (previa?.regras && estado.perfil) {
    try {
      regras = aplicarRegrasAntigas(estado.perfil, previa.regras);
    } catch (e) {
      erroPrevia = e instanceof Error ? e.message : "Não deu para ler as regras do app antigo.";
    }
  }
  const comRegras = !!regras && usarRegras && regras.mudancas.length > 0;
  const semDados = !!previa && previa.registros.length === 0 && previa.lancamentos.length === 0;
  const nada = semDados && !comRegras;
  const rotulo = !previa || nada
    ? "Trazer meus dados"
    : semDados
      ? "Usar as regras do app antigo"
      : `Trazer ${pl(previa.registros.length, "dia", "dias")} e ${pl(previa.lancamentos.length, "lançamento", "lançamentos")}`;

  async function colar() {
    try {
      setTexto(await navigator.clipboard.readText());
      setErro(null);
    } catch {
      setErro("O celular não deixou colar daqui. Toque e segure no campo e escolha Colar.");
    }
  }

  async function importar() {
    if (!previa) return;
    setGravando(true);
    try {
      if (comRegras && regras) await salvarPerfil(regras.perfil);
      for (const i of previa.itensNovos) await salvarItem(i);
      await salvarVariosRegistros(previa.registros);
      for (const l of previa.lancamentos) await lancarProducao(l);
      const p = estado.pessoal;
      const novo = { ...p, nome: p.nome || previa.pessoal.nome, empresa: p.empresa || previa.pessoal.empresa, cargo: p.cargo || previa.pessoal.cargo };
      if (novo.nome !== p.nome || novo.empresa !== p.empresa || novo.cargo !== p.cargo) await salvarPessoal(novo);
      mostrar({
        texto: semDados
          ? "Pronto: o Pingou agora calcula com as regras do app antigo."
          : `Pronto: ${pl(previa.registros.length, "dia", "dias")} e ${pl(previa.lancamentos.length, "lançamento", "lançamentos")} vieram do Ponto Pro antigo${comRegras ? ", com as regras dele" : ""}.`,
      });
      setTexto("");
      onFechar();
    } catch {
      setErro("Não deu para gravar agora. Tente de novo.");
    } finally {
      setGravando(false);
    }
  }

  return (
    <BottomSheet
      aberto={aberto}
      onFechar={onFechar}
      titulo="Trazer do Ponto Pro antigo"
      subtitulo="Seus dias, sua produção e seu nome vêm junto. Nada aqui é apagado."
      rodape={
        <BotaoPrincipal tamanho="g" icone={Import} onClick={importar} carregando={gravando} disabled={!previa || !!nada}>
          {rotulo}
        </BotaoPrincipal>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-17">
          <li>Abra o Ponto Pro antigo, vá em <b>Conta</b> e toque em <b>Levar meus dados para o Pingou</b>.</li>
          <li>Toque em <b>Copiar</b> (ou baixe o arquivo).</li>
          <li>Volte aqui e cole no campo abaixo.</li>
        </ol>
        <label className="flex flex-col gap-2">
          <span className="text-15 font-bold">Dados copiados</span>
          <textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setErro(null);
            }}
            rows={4}
            placeholder="Cole aqui"
            className="numeros w-full rounded-2xl border-2 border-borda-forte bg-superficie p-3 text-15 outline-none focus:border-primaria"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <BotaoPrincipal variante="secundaria" icone={ClipboardPaste} onClick={colar}>Colar</BotaoPrincipal>
          <BotaoPrincipal variante="secundaria" icone={FileUp} onClick={() => arquivo.current?.click()}>Arquivo</BotaoPrincipal>
        </div>
        <input
          ref={arquivo}
          type="file"
          accept="application/json,.json,.txt"
          className="hidden"
          aria-label="Arquivo do Ponto Pro antigo"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) setTexto(await f.text());
          }}
        />

        {(erro || erroPrevia) && <p role="alert" className="text-15 font-bold text-erro-texto">{erro ?? erroPrevia}</p>}

        {previa && (
          <section aria-label="O que vai entrar" className="flex flex-col gap-2 rounded-2xl bg-superficie-2 p-4 text-17">
            <p className="font-bold">
              {semDados ? "Não há dias novos para trazer." : `Vai entrar: ${pl(previa.registros.length, "dia de ponto", "dias de ponto")} e ${pl(previa.lancamentos.length, "lançamento de produção", "lançamentos de produção")}.`}
            </p>
            {previa.resumo.primeiro && previa.resumo.ultimo && (
              <p className="numeros text-15 text-texto-2">De {dataCurta(previa.resumo.primeiro)} a {dataCurta(previa.resumo.ultimo)}.</p>
            )}
            {previa.itensNovos.length > 0 && <p className="text-15 text-texto-2">{pl(previa.itensNovos.length, "serviço novo entra", "serviços novos entram")} na sua lista.</p>}
            {previa.resumo.jaExistem > 0 && (
              <p className="text-15 text-texto-2">{pl(previa.resumo.jaExistem, "dia já está", "dias já estão")} no Pingou e {previa.resumo.jaExistem === 1 ? "fica" : "ficam"} como {previa.resumo.jaExistem === 1 ? "está" : "estão"}.</p>
            )}
            {previa.resumo.ignorados > 0 && <p className="text-15 text-texto-2">{pl(previa.resumo.ignorados, "linha com erro fica", "linhas com erro ficam")} de fora.</p>}
            {(previa.resumo.exemplos > 0 || exemplos) && (
              <Caixa marcado={exemplos} onChange={setExemplos}>
                <b>Trazer também os dias de exemplo.</b> O app antigo criava sozinho {previa.resumo.exemplos > 0 ? pl(previa.resumo.exemplos, "dia de exemplo", "dias de exemplo") : "alguns dias de exemplo"} em outubro e novembro. Marque só se você trabalhou exatamente nesses horários.
              </Caixa>
            )}
          </section>
        )}

        {regras && regras.mudancas.length > 0 && (
          <section aria-label="Regras de cálculo" className="flex flex-col gap-3 rounded-2xl border-2 border-primaria p-4">
            <Caixa marcado={usarRegras} onChange={setUsarRegras}>
              <b>Calcular igual ao app antigo.</b> Os valores e os dias trabalhados batem com o que você via lá. Muda isto nas suas regras:
            </Caixa>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-15">
              {regras.mudancas.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="text-13 text-texto-2">Dá para mudar tudo depois em Conta e regras.</p>
          </section>
        )}
      </div>
    </BottomSheet>
  );
}
