import { analyze, expertMatrix, indexJudgments, sheetItems } from './ahp.ts';
import type { AdminAhpRawProject } from './types.ts';

export type AhpConsistencySummary = { total_matrices: number; inconsistentes: number; pct_inconsistentes: number };

/** Corre la MISMA matemática de ahp.ts (expertMatrix/analyze, la que ya usa ExpertFlow.tsx en
 * tiempo real) sobre TODOS los juicios de la plataforma — una matriz por (proyecto, experto, hoja)
 * que tenga al menos un juicio — en vez de reimplementar la iteración de eigenvector en SQL. */
export function computeAhpConsistency(raw: AdminAhpRawProject[]): AhpConsistencySummary {
  let total = 0;
  let inconsistentes = 0;
  for (const project of raw) {
    const idx = indexJudgments(project.judgments);
    for (const bySheet of Object.values(idx)) {
      for (const [sheet, map] of Object.entries(bySheet)) {
        const items = sheetItems(sheet, project.criteria, project.alternatives);
        if (items.length < 2) continue;
        const { ok } = analyze(expertMatrix(items, map));
        total += 1;
        if (!ok) inconsistentes += 1;
      }
    }
  }
  return { total_matrices: total, inconsistentes, pct_inconsistentes: total ? Math.round((inconsistentes / total) * 100) : 0 };
}

/** Puntos SVG para un sparkline simple, normalizados al alto/ancho dados. */
export function sparklinePoints(values: number[], width = 120, height = 32, pad = 3): string {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const fmtDate = (iso: string) => iso.slice(0, 10);

/** «2026-09-24 · hace 1 día» para un último acceso; null = nunca inició sesión. */
export function fmtLastLogin(iso: string | null, now = Date.now()): string {
  if (!iso) return 'Nunca';
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  const ago = days <= 0 ? 'hoy' : days === 1 ? 'hace 1 día' : `hace ${days} días`;
  return `${fmtDate(iso)} · ${ago}`;
}
