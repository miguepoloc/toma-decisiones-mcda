// Cálculo ELECTRE I (implementación manual, misma fórmula y umbrales que
// 04_electre_iot_palmor.ipynb del curso — NO pyDecision.algorithm.electre_i, su discordancia usa una
// normalización distinta a la enseñada en clase). A diferencia de AHP/TOPSIS/VIKOR/PROMETHEE, ELECTRE
// NO produce un ranking total: produce una relación de superación ("a supera a b") donde algunos pares
// pueden quedar incomparables — es el punto pedagógico del método, no una limitación de esta
// implementación. c* (concordancia mínima) y d* (discordancia máxima) por defecto 0.65/0.30, "convención
// del curso" (Sesión 4).
import type { Alternative, Criterion, DecisionMatrix, MatrixType } from './types.ts';
import { getCell, getType } from './topsis.ts';

export type ElectreResult = {
  n: number;
  concordance: number[][]; // concordance[i][k]: qué tan de acuerdo están los criterios en que i >= k
  discordance: number[][]; // discordance[i][k]: la mayor objeción (normalizada) a que i supere a k
  outranks: boolean[][]; // outranks[i][k] = true si i supera a k (concordance>=cStar y discordance<=dStar)
  cStar: number;
  dStar: number;
  /** Detalle intermedio, expuesto para que excel.ts pueda cachear los mismos números que muestran
   * las fórmulas vivas del .xlsx (ver topsis.ts, mismo patrón). g es la misma matriz "dirección
   * beneficio" que usa promethee.ts: en espacio g, "mayor siempre es mejor" sin importar
   * beneficio/costo, lo que deja concordance/discordance como comparaciones simples (>=, diferencia). */
  weights: number[];
  ranges: number[]; // rango por columna (max-min, o 1 si es 0), usado para normalizar la discordancia
  g: number[][];
};

export function electre(matrix: number[][], weights: number[], types: MatrixType[], cStar = 0.65, dStar = 0.30): ElectreResult {
  const n = matrix.length;
  const m = weights.length;
  if (n === 0 || m === 0) return { n, concordance: [], discordance: [], outranks: [], cStar, dStar, weights: [], ranges: [], g: [] };
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  const w = weights.map((x) => x / wsum);

  const colOf = (j: number) => matrix.map((row) => row[j]);
  const ranges = Array.from({ length: m }, (_, j) => {
    const col = colOf(j);
    return Math.max(...col) - Math.min(...col) || 1;
  });
  const g = matrix.map((row) => row.map((x, j) => (types[j] === 'min' ? -x : x)));
  const betterOrEqual = (a: number, b: number, j: number) => (types[j] === 'min' ? a <= b : a >= b);
  const strictlyBetter = (a: number, b: number, j: number) => (types[j] === 'min' ? a < b : a > b);

  const concordance = matrix.map((rowA, i) => matrix.map((rowB, k) => {
    if (i === k) return 1;
    let c = 0;
    for (let j = 0; j < m; j++) if (betterOrEqual(rowA[j], rowB[j], j)) c += w[j];
    return c;
  }));

  const discordance = matrix.map((rowA, i) => matrix.map((rowB, k) => {
    if (i === k) return 0;
    let d = 0;
    for (let j = 0; j < m; j++) {
      if (strictlyBetter(rowB[j], rowA[j], j)) {
        const diff = Math.abs(rowB[j] - rowA[j]) / ranges[j];
        if (diff > d) d = diff;
      }
    }
    return d;
  }));

  const outranks = concordance.map((row, i) => row.map((c, k) => i !== k && c >= cStar && discordance[i][k] <= dStar));
  return { n, concordance, discordance, outranks, cStar, dStar, weights: w, ranges, g };
}

export type ElectreSynth = {
  names: string[];
  result: ElectreResult;
  relations: { winner: string; loser: string }[];
  incomparable: [string, string][]; // pares sin relación en ningún sentido (i,j con i<j)
  /** cuántas alternativas supera cada una netamente (para una intuición de "quién va mejor", no un ranking real) */
  netOutdegree: number[];
};

export function electreSynthesis(criteria: Criterion[], alternatives: Alternative[], dm: DecisionMatrix, weights: number[], cStar = 0.65, dStar = 0.30): ElectreSynth {
  const matrix = alternatives.map((a) => criteria.map((c) => getCell(dm, a.id, c.id) ?? 0));
  const types = criteria.map((c) => getType(dm, c.id));
  const result = electre(matrix, weights, types, cStar, dStar);
  const names = alternatives.map((a) => a.name);
  const relations: { winner: string; loser: string }[] = [];
  const incomparable: [string, string][] = [];
  for (let i = 0; i < names.length; i++) {
    for (let k = 0; k < names.length; k++) {
      if (i === k) continue;
      if (result.outranks[i]?.[k]) relations.push({ winner: names[i], loser: names[k] });
    }
  }
  for (let i = 0; i < names.length; i++) {
    for (let k = i + 1; k < names.length; k++) {
      const aOverB = result.outranks[i]?.[k];
      const bOverA = result.outranks[k]?.[i];
      if (!aOverB && !bOverA) incomparable.push([names[i], names[k]]);
    }
  }
  const netOutdegree = names.map((_, i) => {
    const out = result.outranks[i]?.filter(Boolean).length ?? 0;
    const inn = result.outranks.filter((row) => row[i]).length;
    return out - inn;
  });
  return { names, result, relations, incomparable, netOutdegree };
}
