import type { ItemProducao } from "../schema/producao";

/**
 * Catálogos de serviços por área (seeds versionados).
 * Preços são EXEMPLOS (exemplo: true): a pessoa confere e edita.
 */
export const VERSAO_CATALOGO = 1;

export interface Pacote {
  id: string;
  nome: string;
  itens: ItemProducao[];
}

type Linha = [nome: string, unidade: string, precoCentavos: number];

function pacote(id: string, nome: string, linhas: Linha[]): Pacote {
  return {
    id,
    nome,
    itens: linhas.map(([n, unidade, preco], i) => ({
      id: `${id}.${i + 1}`,
      nome: n,
      area: nome,
      unidade,
      preco,
      exemplo: true,
    })),
  };
}

export const PACOTES_CONSTRUCAO: Pacote[] = [
  pacote("construcao.preliminares", "Serviços preliminares", [
    ["Limpeza do terreno", "m2", 300],
    ["Locação da obra (gabarito)", "m2", 600],
    ["Tapume de madeirite", "m2", 2500],
    ["Demolição de alvenaria", "m3", 9000],
  ]),
  pacote("construcao.fundacao", "Fundação e estrutura", [
    ["Escavação manual de vala", "m3", 6000],
    ["Forma de madeira", "m2", 4500],
    ["Armação de ferro", "kg", 250],
    ["Concretagem manual", "m3", 15000],
    ["Sapata", "un", 18000],
    ["Viga baldrame", "m", 4000],
  ]),
  pacote("construcao.alvenaria", "Alvenaria", [
    ["Assentar bloco cerâmico", "m2", 3500],
    ["Assentar bloco de concreto", "m2", 4000],
    ["Encunhamento", "m", 800],
    ["Verga e contraverga", "m", 2500],
  ]),
  pacote("construcao.cobertura", "Cobertura", [
    ["Estrutura de madeira do telhado", "m2", 4500],
    ["Telha cerâmica", "m2", 3000],
    ["Telha de fibrocimento", "m2", 2000],
    ["Calha e rufo", "m", 2500],
  ]),
  pacote("construcao.revestimentos", "Revestimentos", [
    ["Chapisco", "m2", 500],
    ["Reboco (emboço)", "m2", 2500],
    ["Gesso liso", "m2", 2000],
    ["Forro de gesso", "m2", 3500],
    ["Assentar azulejo", "m2", 4500],
  ]),
  pacote("construcao.pisos", "Pisos e cerâmicas", [
    ["Contrapiso", "m2", 2500],
    ["Assentar piso cerâmico", "m2", 4000],
    ["Assentar porcelanato", "m2", 5500],
    ["Rodapé", "m", 1200],
  ]),
  pacote("construcao.pintura", "Pintura", [
    ["Massa corrida", "m2", 1500],
    ["Pintura látex (2 demãos)", "m2", 1500],
    ["Textura", "m2", 2000],
    ["Pintura de esquadria", "un", 6000],
  ]),
  pacote("construcao.eletrica", "Elétrica", [
    ["Ponto de tomada", "pt", 6000],
    ["Ponto de luz", "pt", 6000],
    ["Passar fiação", "m", 300],
    ["Montar quadro de distribuição", "un", 25000],
  ]),
  pacote("construcao.hidraulica", "Hidráulica e esgoto", [
    ["Ponto de água", "pt", 8000],
    ["Ponto de esgoto", "pt", 8000],
    ["Instalar louça sanitária", "un", 12000],
    ["Caixa de inspeção", "un", 15000],
  ]),
  pacote("construcao.impermeabilizacao", "Impermeabilização", [
    ["Manta asfáltica", "m2", 3500],
    ["Impermeabilização com argamassa", "m2", 2000],
  ]),
  pacote("construcao.esquadrias", "Esquadrias e serralheria", [
    ["Instalar porta", "un", 15000],
    ["Instalar janela", "un", 12000],
    ["Grade ou portão", "m2", 8000],
  ]),
  pacote("construcao.externos", "Externos e acabamento", [
    ["Assentar meio-fio", "m", 1200],
    ["Calçada de concreto", "m2", 4000],
    ["Muro de bloco", "m2", 4500],
    ["Limpeza final da obra", "m2", 500],
  ]),
];

export const PACOTES_SERVICOS: Pacote[] = [
  pacote("servicos.diarista", "Diarista", [
    ["Faxina completa", "dia", 18000],
    ["Faxina leve", "dia", 13000],
    ["Passar roupa", "h", 3000],
  ]),
];

export const PACOTES_TRANSPORTE: Pacote[] = [
  pacote("transporte.entregas", "Entregas", [
    ["Entrega", "un", 800],
    ["Corrida", "un", 1500],
    ["Quilômetro rodado", "km", 150],
  ]),
];

export const TODOS_PACOTES: Pacote[] = [...PACOTES_CONSTRUCAO, ...PACOTES_SERVICOS, ...PACOTES_TRANSPORTE];

/** Itens dos pacotes escolhidos. */
export function itensDosPacotes(ids: string[]): ItemProducao[] {
  return TODOS_PACOTES.filter((p) => ids.includes(p.id)).flatMap((p) => p.itens);
}
