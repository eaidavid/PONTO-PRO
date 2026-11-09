import type { Feriado } from "../schema/registro";
import { montarIso, somarDias } from "../tempo";

/** Domingo de Páscoa (algoritmo gregoriano anônimo). */
export function pascoa(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return montarIso(ano, mes, dia);
}

/** Feriados nacionais pré-carregados. Feriados locais são adicionados pela pessoa. */
export function feriadosNacionais(ano: number): Feriado[] {
  const fixo = (mes: number, dia: number, nome: string): Feriado => ({
    data: montarIso(ano, mes, dia),
    nome,
    tipo: "nacional",
  });
  const lista: Feriado[] = [
    fixo(1, 1, "Confraternização Universal"),
    { data: somarDias(pascoa(ano), -2), nome: "Sexta-feira Santa", tipo: "nacional" },
    fixo(4, 21, "Tiradentes"),
    fixo(5, 1, "Dia do Trabalho"),
    fixo(9, 7, "Independência do Brasil"),
    fixo(10, 12, "Nossa Senhora Aparecida"),
    fixo(11, 2, "Finados"),
    fixo(11, 15, "Proclamação da República"),
    fixo(12, 25, "Natal"),
  ];
  if (ano >= 2024) lista.push(fixo(11, 20, "Dia da Consciência Negra"));
  return lista.sort((x, y) => x.data.localeCompare(y.data));
}

/** Pontos facultativos comuns (não entram por padrão; a pessoa pode adicionar). */
export function pontosFacultativos(ano: number): Feriado[] {
  const p = pascoa(ano);
  return [
    { data: somarDias(p, -48), nome: "Carnaval (segunda)", tipo: "local" },
    { data: somarDias(p, -47), nome: "Carnaval (terça)", tipo: "local" },
    { data: somarDias(p, 60), nome: "Corpus Christi", tipo: "local" },
  ];
}

/** Junta nacionais dos anos do intervalo com os locais, sem duplicar datas. */
export function feriadosDoIntervalo(inicio: string, fim: string, locais: Feriado[] = []): Map<string, Feriado> {
  const mapa = new Map<string, Feriado>();
  const a0 = Number(inicio.slice(0, 4));
  const a1 = Number(fim.slice(0, 4));
  for (let a = a0; a <= a1; a++) {
    for (const f of feriadosNacionais(a)) if (f.data >= inicio && f.data <= fim) mapa.set(f.data, f);
  }
  for (const f of locais) if (f.data >= inicio && f.data <= fim && !mapa.has(f.data)) mapa.set(f.data, f);
  return mapa;
}
