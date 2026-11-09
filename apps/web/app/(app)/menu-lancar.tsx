"use client";

import { type Etapa, proximaEtapa, seloDia, somarDias, type TipoDia } from "@ponto-pro/core";
import { BottomSheet, Chip, TIPOS_DIA, TituloSecao, useToast } from "@ponto-pro/ui";
import { CalendarPlus, ChevronRight, Hammer, LogIn, LogOut, type LucideIcon, NotebookPen, PackagePlus, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import { baterPonto, restaurarRegistro, salvarRegistro } from "../../lib/acoes";
import type { Estado } from "../../lib/estado";
import { useAgora } from "../../lib/estado";

const ROTULO: Record<Etapa, { texto: string; icone: LucideIcon }> = {
  entrada: { texto: "Bater entrada agora", icone: LogIn },
  almoco: { texto: "Sair para o almoço agora", icone: Utensils },
  volta: { texto: "Voltar do almoço agora", icone: Hammer },
  saida: { texto: "Bater saída agora", icone: LogOut },
};
const NOME: Record<Etapa, string> = { entrada: "Entrada", almoco: "Almoço", volta: "Volta do almoço", saida: "Saída" };

/** "+ Lançar": tudo o que cria um registro, num lugar só. */
export function MenuLancar({ aberto, onFechar, estado }: { aberto: boolean; onFechar: () => void; estado: Estado }) {
  const router = useRouter();
  const agora = useAgora();
  const { mostrar } = useToast();
  if (!agora || !estado.perfil) return null;
  const hoje = estado.registros.find((r) => r.data === agora.data);
  const etapa = hoje && (hoje.tipo === "falta" || hoje.tipo === "atestado") ? null : proximaEtapa(hoje?.marcacoes ?? {});
  const usaProducao = estado.perfil.producao.ativo || estado.perfil.pagamento.forma !== "hora";

  // fecha o painel (que volta uma entrada no histórico) e só então navega
  const ir = (href: string) => {
    onFechar();
    setTimeout(() => router.push(href), 120);
  };

  async function bater() {
    if (!etapa || !agora) return;
    const antes = await baterPonto(agora.data, etapa, agora.hora, estado.preferencias.obraAtual);
    onFechar();
    mostrar({ texto: `${NOME[etapa]} às ${agora.hora}`, desfazer: () => restaurarRegistro(agora.data, antes) });
  }

  async function marcar(tipo: TipoDia) {
    if (!agora) return;
    const antes = hoje ?? null;
    await salvarRegistro({ data: agora.data, tipo, marcacoes: tipo === "folga" ? (hoje?.marcacoes ?? {}) : {}, observacao: hoje?.observacao });
    onFechar();
    mostrar({ texto: `Hoje marcado como ${TIPOS_DIA[tipo].rotulo.toLowerCase()}`, desfazer: () => restaurarRegistro(agora.data, antes) });
  }

  const Acao = etapa ? ROTULO[etapa].icone : LogOut;
  const linha = "flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-superficie-2";
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(agora.data, -(i + 1)));

  return (
    <BottomSheet aberto={aberto} onFechar={onFechar} titulo="Lançar">
      <div className="flex flex-col gap-5 pb-2">
        <button
          type="button"
          onClick={bater}
          disabled={!etapa}
          className="sombra-botao flex min-h-16 items-center gap-3 rounded-full bg-primaria px-5 text-left text-sobre-primaria active:scale-[0.98] disabled:bg-superficie-2 disabled:text-texto-2 disabled:shadow-none"
        >
          <Acao aria-hidden className="size-6 shrink-0" strokeWidth={2.25} />
          <span className="flex-1 text-20 font-bold">{etapa ? ROTULO[etapa].texto : "Dia encerrado"}</span>
          {etapa && <span className="numeros text-17 font-bold">{agora.hora}</span>}
        </button>

        <ul className="cartao divide-y divide-borda overflow-hidden">
          {usaProducao && (
            <li>
              <button type="button" onClick={() => ir("/producao")} className={linha}>
                <PackagePlus aria-hidden className="size-6 shrink-0 text-primaria-forte" />
                <span className="flex-1 text-17 font-bold">Lançar produção</span>
                <ChevronRight aria-hidden className="size-5 text-texto-2" />
              </button>
            </li>
          )}
          <li>
            <button type="button" onClick={() => ir(`/historico?editar=${agora.data}`)} className={linha}>
              <NotebookPen aria-hidden className="size-6 shrink-0 text-primaria-forte" />
              <span className="flex-1 text-17 font-bold">Anotar no dia de hoje</span>
              <ChevronRight aria-hidden className="size-5 text-texto-2" />
            </button>
          </li>
        </ul>

        <div className="flex flex-col gap-2">
          <TituloSecao>Marcar hoje como</TituloSecao>
          <div className="flex flex-wrap gap-2">
            {(["falta", "atestado", "folga"] as TipoDia[]).map((t) => (
              <Chip key={t} icone={TIPOS_DIA[t].icone} tom={TIPOS_DIA[t].tom} selecionado={hoje?.tipo === t} onClick={() => marcar(t)}>
                {TIPOS_DIA[t].rotulo}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <TituloSecao>
            <span className="inline-flex items-center gap-1.5">
              <CalendarPlus aria-hidden className="size-4" /> Arrumar um dia esquecido
            </span>
          </TituloSecao>
          <div className="flex flex-wrap gap-2">
            {dias.map((d) => (
              <Chip key={d} onClick={() => ir(`/historico?editar=${d}`)}>{seloDia(d)}</Chip>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
