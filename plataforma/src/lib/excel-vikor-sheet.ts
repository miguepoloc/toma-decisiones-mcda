/* eslint-disable @typescript-eslint/no-explicit-any */
import { colL, qs, stl, W, type MatInfo } from './excel-core.ts';
import { getCell, getType } from './topsis.ts';
import { vikor } from './vikor.ts';
import type { Alternative, Criterion, DecisionMatrix } from './types.ts';

/** VIKOR con fórmulas vivas: mismo peso e ideal mejor/peor (f* / f-) por columna que TOPSIS (misma
 * definición type-aware, ver vikor.ts), aporte ponderado por criterio, S (suma de aportes), R (máximo
 * aporte), Q (compromiso, v=0.5 fijo — convención del curso, sin UI para cambiarlo). MENOR Q es mejor,
 * al revés que la cercanía Ci de TOPSIS. Verificado en check-excel-vikor.ts. */
export function vikorSheet(criteria: Criterion[], alternatives: Alternative[], dm: DecisionMatrix, weights: number[], matInfo: MatInfo, matName: string, critInfo: { rN0: number; vc: number }) {
  const m = criteria.length, n = alternatives.length, { put, fin } = W();
  const matrix = alternatives.map((a) => criteria.map((c) => getCell(dm, a.id, c.id) ?? 0));
  const types = criteria.map((c) => getType(dm, c.id));
  const r = vikor(matrix, weights, types);
  const rHead = 2, rW = 3, rBest = 4, rWorst = 5, rV0 = 6;
  const rSmin = rV0 + n, rSmax = rSmin + 1, rRmin = rSmax + 1, rRmax = rRmin + 1;
  const cS = m + 1, cR = m + 2, cQ = m + 3, cRk = m + 4;
  const MN = qs(matName), last = colL(m);
  put(1, 0, 'VIKOR — solución de compromiso', { s: stl.title });
  put(1, 1, 'S = utilidad de grupo (suma del aporte ponderado de cada criterio), R = arrepentimiento individual (el mayor aporte de un solo criterio), Q = compromiso (v=0.5). MENOR Q es mejor. Peso de cada criterio: hoja Criterios.', { s: stl.note });
  put(rHead, 0, 'Alternativa', { s: stl.hdrL });
  criteria.forEach((c, j) => put(rHead, 1 + j, c.name, { s: stl.hdr }));
  put(rHead, cS, 'S', { s: stl.hdr }); put(rHead, cR, 'R', { s: stl.hdr });
  put(rHead, cQ, 'Q', { s: stl.hdr }); put(rHead, cRk, 'Ranking', { s: stl.hdr });
  put(rW, 0, 'Peso (hoja Criterios)', { s: stl.b });
  criteria.forEach((_, j) => put(rW, 1 + j, r.weights[j], { f: `Criterios!${colL(critInfo.vc)}${critInfo.rN0 + j}`, z: '0.0000' }));
  put(rBest, 0, 'Mejor por columna (f*)', { s: stl.b });
  put(rWorst, 0, 'Peor por columna (f-)', { s: stl.b });
  criteria.forEach((_, j) => {
    const L = colL(1 + j), rng = `${L}${matInfo.rData0}:${L}${matInfo.rData0 + n - 1}`, typeCell = `${MN}${L}$${matInfo.rType}`;
    put(rBest, 1 + j, r.best[j], { f: `IF(${typeCell}="Costo",MIN(${MN}${rng}),MAX(${MN}${rng}))`, z: '0.0000' });
    put(rWorst, 1 + j, r.worst[j], { f: `IF(${typeCell}="Costo",MAX(${MN}${rng}),MIN(${MN}${rng}))`, z: '0.0000' });
  });
  alternatives.forEach((a, i) => {
    const rr = rV0 + i;
    put(rr, 0, a.name, { s: stl.hdrL });
    criteria.forEach((_, j) => {
      const L = colL(1 + j);
      put(rr, 1 + j, r.contrib[i][j], { f: `IFERROR(${L}$${rW}*(${L}$${rBest}-${MN}${L}${matInfo.rData0 + i})/(${L}$${rBest}-${L}$${rWorst}),0)`, z: '0.0000' });
    });
    put(rr, cS, r.s[i], { f: `SUM(B${rr}:${last}${rr})`, z: '0.0000' });
    put(rr, cR, r.r[i], { f: `MAX(B${rr}:${last}${rr})`, z: '0.0000' });
    put(rr, cQ, r.q[i], {
      f: `0.5*IFERROR((${colL(cS)}${rr}-$B$${rSmin})/($B$${rSmax}-$B$${rSmin}),0)+0.5*IFERROR((${colL(cR)}${rr}-$B$${rRmin})/($B$${rRmax}-$B$${rRmin}),0)`,
      s: stl.key, z: '0.0000',
    });
    put(rr, cRk, 1 + r.order.indexOf(i), { f: `RANK(${colL(cQ)}${rr},${colL(cQ)}$${rV0}:${colL(cQ)}$${rV0 + n - 1},1)`, s: stl.c });
  });
  put(rSmin, 0, 'S mínimo (para Q)'); put(rSmin, 1, Math.min(...r.s), { f: `MIN(${colL(cS)}${rV0}:${colL(cS)}${rV0 + n - 1})`, z: '0.0000' });
  put(rSmax, 0, 'S máximo (para Q)'); put(rSmax, 1, Math.max(...r.s), { f: `MAX(${colL(cS)}${rV0}:${colL(cS)}${rV0 + n - 1})`, z: '0.0000' });
  put(rRmin, 0, 'R mínimo (para Q)'); put(rRmin, 1, Math.min(...r.r), { f: `MIN(${colL(cR)}${rV0}:${colL(cR)}${rV0 + n - 1})`, z: '0.0000' });
  put(rRmax, 0, 'R máximo (para Q)'); put(rRmax, 1, Math.max(...r.r), { f: `MAX(${colL(cR)}${rV0}:${colL(cR)}${rV0 + n - 1})`, z: '0.0000' });
  const g = rRmax + 2, top = alternatives[r.order[0]], tie = n < 2 || Math.max(...r.q) - Math.min(...r.q) < 1e-9;
  put(g, 0, 'Ganador', { s: stl.gain });
  put(g, 1, tie ? 'Empate (sin datos)' : top?.name ?? '', { f: `INDEX(A${rV0}:A${rV0 + n - 1},MATCH(MIN(${colL(cQ)}${rV0}:${colL(cQ)}${rV0 + n - 1}),${colL(cQ)}${rV0}:${colL(cQ)}${rV0 + n - 1},0))`, s: stl.gkey });
  put(g, 2, 'con Q de');
  put(g, 3, r.q[r.order[0]] ?? 0, { f: `MIN(${colL(cQ)}${rV0}:${colL(cQ)}${rV0 + n - 1})`, z: '0.0000' });
  const colsW = [30, ...Array.from({ length: Math.max(m, 1) }, () => 16), 14, 14, 14, 12];
  return fin(colsW, [{ hpt: 30 }], [{ s: { r: 0, c: 1 }, e: { r: 0, c: cRk } }]);
}
