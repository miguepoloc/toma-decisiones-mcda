// Métodos de ponderación objetiva de criterios.
// CRITIC: Diakoulaki et al. (1995), basado en desviación estándar y correlación entre criterios.
// Entropía: Shannon (1948) — la menor entropía (mayor dispersión) da más peso al criterio.
// Ambos reciben la matriz de decisión y devuelven pesos normalizados (suma = 1).
import type { Alternative, Criterion, DecisionMatrix } from './types.ts';
import { getType } from './topsis.ts';

/** Valor numérico de una celda. Fuzzy TOPSIS usa strings; para ponderación objetiva siempre numérico. */
function getNum(dm: DecisionMatrix, altId: string, critId: string): number {
  const v = dm.values[altId]?.[critId];
  return typeof v === 'number' ? v : 0;
}

function normalizeMinMax(col: number[], type: 'max' | 'min'): number[] {
  const lo = Math.min(...col);
  const hi = Math.max(...col);
  const span = hi - lo || 1;
  return col.map((x) => (type === 'min' ? (hi - x) / span : (x - lo) / span));
}

/**
 * CRITIC (CRiteria Importance Through Intercriteria Correlation).
 * Pasos: normalización Min-Max → σ por columna → matriz de correlación → C_j = σ_j * Σ(1 - r_jk) → normalizar.
 */
export function criticWeights(criteria: Criterion[], alternatives: Alternative[], dm: DecisionMatrix): number[] {
  const m = criteria.length;
  const n = alternatives.length;
  if (m === 0 || n === 0) return [];

  // Matriz normalizada: filas = alternativas, columnas = criterios
  const X: number[][] = criteria.map((c) => {
    const col = alternatives.map((a) => getNum(dm, a.id, c.id));
    return normalizeMinMax(col, getType(dm, c.id));
  }); // X[j][i]: criterio j, alternativa i

  // Desviación estándar de cada criterio (población)
  const sigma: number[] = X.map((col) => {
    const mean = col.reduce((a, b) => a + b, 0) / n;
    return Math.sqrt(col.reduce((a, x) => a + (x - mean) ** 2, 0) / n);
  });

  // Matriz de correlación de Pearson (m × m)
  const corr: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
  for (let j = 0; j < m; j++) {
    for (let k = 0; k < m; k++) {
      if (j === k) { corr[j][k] = 1; continue; }
      const xj = X[j], xk = X[k];
      const mj = xj.reduce((a, b) => a + b, 0) / n;
      const mk = xk.reduce((a, b) => a + b, 0) / n;
      const num = xj.reduce((s, v, i) => s + (v - mj) * (xk[i] - mk), 0);
      const den = Math.sqrt(xj.reduce((s, v) => s + (v - mj) ** 2, 0) * xk.reduce((s, v) => s + (v - mk) ** 2, 0));
      corr[j][k] = den === 0 ? 0 : num / den;
    }
  }

  // C_j = σ_j * Σ_k (1 - r_jk)
  const C = sigma.map((s, j) => s * corr[j].reduce((sum, r) => sum + (1 - r), 0));
  const total = C.reduce((a, b) => a + b, 0) || 1;
  return C.map((c) => c / total);
}

/**
 * Entropía de Shannon.
 * Pasos: normalizar a proporciones por columna → E_j = -k Σ p_ij ln(p_ij) → d_j = 1 - E_j → normalizar.
 */
export function entropyWeights(criteria: Criterion[], alternatives: Alternative[], dm: DecisionMatrix): number[] {
  const m = criteria.length;
  const n = alternatives.length;
  if (m === 0 || n === 0) return [];

  const k = 1 / Math.log(n || 2); // factor de normalización

  const E: number[] = criteria.map((c) => {
    const col = alternatives.map((a) => {
      const raw = getNum(dm, a.id, c.id);
      // Para criterios de costo invertir para que dispersión alta = más información
      return getType(dm, c.id) === 'min' ? (raw === 0 ? 0 : 1 / raw) : raw;
    });
    const total = col.reduce((a, b) => a + b, 0) || 1;
    const p = col.map((x) => x / total);
    return -k * p.reduce((s, pi) => s + (pi > 0 ? pi * Math.log(pi) : 0), 0);
  });

  const d = E.map((e) => 1 - e);
  const dTotal = d.reduce((a, b) => a + b, 0) || 1;
  return d.map((di) => di / dTotal);
}
