// Cálculo PROMETHEE II (misma matemática que pyDecision.promethee_ii, ver
// 05_promethee_iot_palmor.ipynb del curso): función de preferencia Tipo III (lineal/V, la única que
// enseña el curso), con Q=0 (sin umbral de indiferencia) y P=rango de cada criterio (max-min), igual
// convención que el notebook (`P = list(rangos)`) — se calculan solos desde la matriz de decisión, el
// estudiante no tiene que fijar umbrales a mano. Flujo neto phi = phi+ - phi-; mayor es mejor.
import type { Alternative, Criterion, DecisionMatrix, MatrixType } from './types.ts';
import { getCell, getType } from './topsis.ts';

export type PrometheeResult = {
  n: number;
  phi: number[]; // flujo neto, mayor es mejor
  phiPlus: number[];
  phiMinus: number[];
  order: number[];
  /** Detalle intermedio, expuesto para que excel.ts pueda cachear los mismos números que muestran
   * las fórmulas vivas del .xlsx (ver topsis.ts, mismo patrón). Con Q=0, pref3(d,0,p) = clamp(d/p,0,1)
   * — es la identidad que usa la hoja de Excel para escribirlo con MEDIAN(0,1,...) en vez de un IF
   * anidado (que necesitaría entrarse como fórmula matricial). */
  weights: number[];
  p: number[]; // umbral P por columna (rango = max-min, o 1 si el rango es 0)
  g: number[][]; // matriz "dirección beneficio" (=matrix, con las columnas de costo en signo invertido)
  pi: number[][]; // preferencia de i sobre k, pi[i][i] = 0
};

/** Función de preferencia Tipo III (V-shape/lineal): 0 si d<=q, 1 si d>=p, lineal entre medio. */
function pref3(d: number, q: number, p: number): number {
  if (d <= q) return 0;
  if (d >= p) return 1;
  const span = p - q;
  return span === 0 ? 1 : (d - q) / span;
}

export function promethee(matrix: number[][], weights: number[], types: MatrixType[]): PrometheeResult {
  const n = matrix.length;
  const m = weights.length;
  if (n === 0 || m === 0) return { n, phi: [], phiPlus: [], phiMinus: [], order: [], weights: [], p: [], g: [], pi: [] };
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  const w = weights.map((x) => x / wsum);

  const colOf = (j: number) => matrix.map((row) => row[j]);
  const p = Array.from({ length: m }, (_, j) => {
    const col = colOf(j);
    return Math.max(...col) - Math.min(...col) || 1;
  });
  // g(x) en la dirección "mayor es mejor" siempre, para tratar beneficio/costo con la misma resta.
  const g = matrix.map((row) => row.map((x, j) => (types[j] === 'min' ? -x : x)));

  const pi = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, k) => {
    if (i === k) return 0;
    let acc = 0;
    for (let j = 0; j < m; j++) acc += w[j] * pref3(g[i][j] - g[k][j], 0, p[j]);
    return acc;
  }));

  const phiPlus = pi.map((row) => row.reduce((a, b) => a + b, 0) / Math.max(1, n - 1));
  const phiMinus = Array.from({ length: n }, (_, k) => pi.reduce((a, row) => a + row[k], 0) / Math.max(1, n - 1));
  const phi = phiPlus.map((p1, i) => p1 - phiMinus[i]);
  const order = phi.map((_, i) => i).sort((a, b) => phi[b] - phi[a]);
  return { n, phi, phiPlus, phiMinus, order, weights: w, p, g, pi };
}

export type PrometheeSynth = {
  rows: { name: string; phi: number; rank: number }[];
  order: number[];
  tie: boolean;
};

export function prometheeSynthesis(criteria: Criterion[], alternatives: Alternative[], dm: DecisionMatrix, weights: number[]): PrometheeSynth {
  const matrix = alternatives.map((a) => criteria.map((c) => getCell(dm, a.id, c.id) ?? 0));
  const types = criteria.map((c) => getType(dm, c.id));
  const res = promethee(matrix, weights, types);
  const rows = alternatives.map((a, i) => ({ name: a.name, phi: res.phi[i] ?? 0, rank: 0 }));
  rows.forEach((row) => (row.rank = 1 + rows.filter((o) => o.phi > row.phi + 1e-9).length));
  const phis = rows.map((x) => x.phi);
  return { rows, order: res.order, tie: phis.length < 2 || Math.max(...phis) - Math.min(...phis) < 1e-9 };
}
