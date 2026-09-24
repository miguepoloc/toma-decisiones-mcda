// Cálculo TOPSIS (misma matemática que pyDecision.topsis_method, ver 02_topsis_iot_palmor.ipynb
// del curso): normalización vectorial -> ponderar -> ideal mejor/peor por columna -> distancia
// euclidiana -> cercanía relativa. Recibe los pesos YA calculados (típicamente de la hoja Criterios
// de AHP, ver ahp.ts) en vez de derivarlos: es la diferencia de fondo con AHP que motiva que esto
// viva en un módulo aparte, no una variante de ahp.ts.
import type { Alternative, Criterion, DecisionMatrix, MatrixType } from './types.ts';

export type { DecisionMatrix, MatrixType };

export const blankMatrix = (): DecisionMatrix => ({ values: {}, types: {} });

export function normalizeMatrix(x: unknown): DecisionMatrix {
  const b = blankMatrix();
  if (!x || typeof x !== 'object') return b;
  const s = x as Partial<DecisionMatrix>;
  const out: DecisionMatrix = {
    values: s.values && typeof s.values === 'object' ? s.values : b.values,
    types: s.types && typeof s.types === 'object' ? s.types : b.types,
  };
  // v de VIKOR: se conserva solo si es un número válido en [0, 1] (si no, se ignora y rige el 0.5 por defecto)
  if (typeof s.vikorV === 'number' && Number.isFinite(s.vikorV) && s.vikorV >= 0 && s.vikorV <= 1) out.vikorV = s.vikorV;
  return out;
}

export function getCell(dm: DecisionMatrix, altId: string, critId: string): number | null {
  const v = dm.values[altId]?.[critId];
  return typeof v === 'number' ? v : null;
}

export function setCell(dm: DecisionMatrix, altId: string, critId: string, value: number | null): DecisionMatrix {
  const row = { ...dm.values[altId] };
  if (value == null || Number.isNaN(value)) delete row[critId];
  else row[critId] = value;
  return { ...dm, values: { ...dm.values, [altId]: row } };
}

export function getType(dm: DecisionMatrix, critId: string): MatrixType {
  return dm.types[critId] === 'min' ? 'min' : 'max';
}

export function setType(dm: DecisionMatrix, critId: string, type: MatrixType): DecisionMatrix {
  return { ...dm, types: { ...dm.types, [critId]: type } };
}

export function answeredCells(criteria: Criterion[], alternatives: Alternative[], dm: DecisionMatrix): number {
  let n = 0;
  for (const a of alternatives) for (const c of criteria) if (getCell(dm, a.id, c.id) != null) n++;
  return n;
}

export type TopsisResult = {
  n: number;
  closeness: number[]; // C_i, mismo orden que `alternatives`
  distPlus: number[];
  distMinus: number[];
  order: number[]; // índices de `alternatives` ordenados de mejor a peor
  /** Detalle intermedio (pesos renormalizados, normas, matriz ponderada-normalizada e ideales),
   * expuesto para que excel.ts pueda cachear los mismos números que muestran las fórmulas vivas
   * del .xlsx sin reimplementar la matemática. */
  weights: number[];
  norms: number[]; // uno por columna
  v: number[][]; // matriz ponderada-normalizada, mismas filas/columnas que `matrix`
  best: number[]; // A+ por columna
  worst: number[]; // A- por columna
};

/** matrix: filas = alternativas, columnas = criterios, valores reales (no juicios de Saaty).
 * weights: uno por columna, ya normalizado o no (se re-normaliza internamente por si acaso).
 * types: 'max' (beneficio, más es mejor) o 'min' (costo, menos es mejor) por columna. */
export function topsis(matrix: number[][], weights: number[], types: MatrixType[]): TopsisResult {
  const n = matrix.length;
  const m = weights.length;
  if (n === 0 || m === 0) {
    return { n, closeness: [], distPlus: [], distMinus: [], order: [], weights: [], norms: [], v: [], best: [], worst: [] };
  }
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  const w = weights.map((x) => x / wsum);

  const norms = Array.from({ length: m }, (_, j) => {
    const s = Math.sqrt(matrix.reduce((a, row) => a + row[j] * row[j], 0));
    return s || 1;
  });
  const v = matrix.map((row) => row.map((x, j) => (x / norms[j]) * w[j]));

  const colOf = (j: number) => v.map((row) => row[j]);
  const best = Array.from({ length: m }, (_, j) => {
    const col = colOf(j);
    return types[j] === 'min' ? Math.min(...col) : Math.max(...col);
  });
  const worst = Array.from({ length: m }, (_, j) => {
    const col = colOf(j);
    return types[j] === 'min' ? Math.max(...col) : Math.min(...col);
  });

  const distPlus = v.map((row) => Math.sqrt(row.reduce((a, x, j) => a + (x - best[j]) ** 2, 0)));
  const distMinus = v.map((row) => Math.sqrt(row.reduce((a, x, j) => a + (x - worst[j]) ** 2, 0)));
  const closeness = distPlus.map((dp, i) => {
    const tot = dp + distMinus[i];
    return tot === 0 ? 0 : distMinus[i] / tot;
  });
  const order = closeness.map((_, i) => i).sort((a, b) => closeness[b] - closeness[a]);
  return { n, closeness, distPlus, distMinus, order, weights: w, norms, v, best, worst };
}

export type TopsisSynth = {
  rows: { name: string; c: number; rank: number }[];
  order: number[];
  tie: boolean;
};

/** Arma la matriz/tipos desde criteria+alternatives+DecisionMatrix (celdas sin llenar cuentan como
 * 0, igual que un juicio de AHP sin llenar cuenta como "igual") y corre topsis(). */
export function topsisSynthesis(criteria: Criterion[], alternatives: Alternative[], dm: DecisionMatrix, weights: number[]): TopsisSynth {
  const matrix = alternatives.map((a) => criteria.map((c) => getCell(dm, a.id, c.id) ?? 0));
  const types = criteria.map((c) => getType(dm, c.id));
  const r = topsis(matrix, weights, types);
  const rows = alternatives.map((a, i) => ({ name: a.name, c: r.closeness[i] ?? 0, rank: 0 }));
  rows.forEach((row) => (row.rank = 1 + rows.filter((o) => o.c > row.c + 1e-9).length));
  const cs = rows.map((x) => x.c);
  return { rows, order: r.order, tie: cs.length < 2 || Math.max(...cs) - Math.min(...cs) < 1e-9 };
}
