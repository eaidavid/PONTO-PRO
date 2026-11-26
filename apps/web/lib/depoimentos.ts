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

/**
 * Depoimentos fixos + os aprovados no painel (só de quem autorizou publicar no app).
 * Lido no servidor; a página de vendas se atualiza sozinha de hora em hora.
 */
export async function depoimentosPublicados(): Promise<Depoimento[]> {
  try {
    const { supabaseServidor } = await import("./cobranca/servidor");
    const sb = supabaseServidor();
    if (!sb) return DEPOIMENTOS;
    const { data } = await sb.from("feedback").select("nome, funcao, cidade, comentario").eq("status", "aprovado").eq("autoriza", true).order("criado_em", { ascending: false }).limit(6);
    const doBanco = (data ?? []).map((d) => ({ nome: d.nome as string, funcao: (d.funcao as string | null) ?? "Usa o Pingou", ...(d.cidade ? { cidade: d.cidade as string } : {}), texto: d.comentario as string }));
    return [...DEPOIMENTOS, ...doBanco];
  } catch {
    return DEPOIMENTOS;
  }
}
