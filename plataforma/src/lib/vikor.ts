// Cálculo VIKOR (misma matemática que pyDecision.vikor_method, ver 03_vikor_iot_palmor.ipynb del
// curso): S (utilidad de grupo), R (arrepentimiento individual), Q (compromiso, v=0.5 por defecto,
// "estrategia de mayoría de criterios" de Opricovic 1998) -> menor Q es mejor. Mismos pesos y matriz
// de decisión que topsis.ts (types.ts DecisionMatrix), solo cambia la fórmula de síntesis.
import type { Alternative, Criterion, DecisionMatrix, MatrixType } from './types.ts';
import { getCell, getType } from './topsis.ts';

export type VikorResult = {
  n: number;
  s: number[]; // utilidad de grupo por alternativa
  r: number[]; // arrepentimiento individual por alternativa
  q: number[]; // compromiso; MENOR es mejor (a diferencia de TOPSIS, donde mayor es mejor)
  order: number[]; // índices ordenados de mejor (Q menor) a peor
  /** Detalle intermedio, expuesto para que excel.ts pueda cachear los mismos números que muestran
   * las fórmulas vivas del .xlsx (ver topsis.ts, mismo patrón). */
  weights: number[];
  best: number[]; // f* por columna
  worst: number[]; // f- por columna
  contrib: number[][]; // aporte ponderado de cada alternativa/criterio a S (y de donde sale R = max de la fila)
};

export function vikor(matrix: number[][], weights: number[], types: MatrixType[], v = 0.5): VikorResult {
  const n = matrix.length;
  const m = weights.length;
  if (n === 0 || m === 0) return { n, s: [], r: [], q: [], order: [], weights: [], best: [], worst: [], contrib: [] };
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  const w = weights.map((x) => x / wsum);

  const colOf = (j: number) => matrix.map((row) => row[j]);
  const best = Array.from({ length: m }, (_, j) => {
    const col = colOf(j);
    return types[j] === 'min' ? Math.min(...col) : Math.max(...col);
  });
  const worst = Array.from({ length: m }, (_, j) => {
    const col = colOf(j);
    return types[j] === 'min' ? Math.max(...col) : Math.min(...col);
  });

  const contrib = matrix.map((row) => row.map((x, j) => {
    const denom = best[j] - worst[j];
    return denom === 0 ? 0 : (w[j] * (best[j] - x)) / denom;
  }));
  const s = contrib.map((row) => row.reduce((a, b) => a + b, 0));
  const r = contrib.map((row) => Math.max(...row));

  const sMin = Math.min(...s), sMax = Math.max(...s);
  const rMin = Math.min(...r), rMax = Math.max(...r);
  const q = s.map((si, i) => {
    const sPart = sMax - sMin === 0 ? 0 : (si - sMin) / (sMax - sMin);
    const rPart = rMax - rMin === 0 ? 0 : (r[i] - rMin) / (rMax - rMin);
    return v * sPart + (1 - v) * rPart;
  });
  const order = q.map((_, i) => i).sort((a, b) => q[a] - q[b]);
  return { n, s, r, q, order, weights: w, best, worst, contrib };
}

export type VikorSynth = {
  rows: { name: string; s: number; r: number; q: number; rank: number }[];
  order: number[];
  tie: boolean;
};

export function vikorSynthesis(criteria: Criterion[], alternatives: Alternative[], dm: DecisionMatrix, weights: number[]): VikorSynth {
  const matrix = alternatives.map((a) => criteria.map((c) => getCell(dm, a.id, c.id) ?? 0));
  const types = criteria.map((c) => getType(dm, c.id));
  const res = vikor(matrix, weights, types);
  const rows = alternatives.map((a, i) => ({ name: a.name, s: res.s[i] ?? 0, r: res.r[i] ?? 0, q: res.q[i] ?? 0, rank: 0 }));
  rows.forEach((row) => (row.rank = 1 + rows.filter((o) => o.q < row.q - 1e-9).length));
  const qs = rows.map((x) => x.q);
  return { rows, order: res.order, tie: qs.length < 2 || Math.max(...qs) - Math.min(...qs) < 1e-9 };
}
