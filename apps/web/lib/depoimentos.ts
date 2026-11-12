/**
 * Depoimentos da página de vendas.
 *
 * SÓ entram depoimentos REAIS, de quem usa o Pingou e autorizou por escrito a publicação
 * (guarde a autorização). Depoimento inventado é publicidade enganosa (CDC, art. 37).
 * Enquanto a lista estiver vazia, a seção não aparece na página.
 *
 * Exemplo de item:
 *   { nome: "Primeiro nome", funcao: "Pedreiro", cidade: "Cidade/UF", texto: "O que a pessoa disse, com as palavras dela." }
 */
export interface Depoimento {
  nome: string;
  funcao: string;
  cidade?: string;
  texto: string;
}

export const DEPOIMENTOS: Depoimento[] = [];
