// Infraestructura compartida por excel.ts y los excel-*-sheet.ts de cada método: paleta/estilos por
// color de acento, helpers de escritura de celdas (W/colL/qs) y las 2 hojas que no son de un solo
// método (Criterios vía ahpSheet, Matriz de decisión vía matrixSheet). Separado de excel.ts (que antes
// tenía 975 líneas mezclando esto con las 7 hojas por método) el 20 sep 2026, auditoría de plataforma.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { aggMatrix, analyze, expertMatrix, type Item, type JMap } from './ahp.ts';
import { getCell, getType } from './topsis.ts';
import type { Alternative, Criterion, DecisionMatrix } from './types.ts';

const C_G = 'D8F5E3', C_GR = '666666';
function darken(hex: string, factor = 0.32): string {
  const n = parseInt(hex, 16);
  const r = Math.round(((n >> 16) & 255) * (1 - factor));
  const g = Math.round(((n >> 8) & 255) * (1 - factor));
  const b = Math.round((n & 255) * (1 - factor));
  return [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}
// `stl` se recalcula por color de acento con setPalette() al empezar cada build*Workbook(); las
// funciones de hoja lo leen por closure/import (binding vivo de ES modules). Seguro porque cada build
// es 100% síncrono (sin await entre setPalette() y los put() que lo consumen) — no hay forma de que
// se entrelacen dos builds.
export let stl: Record<string, any>;
export function setPalette(hex: string) {
  const fillP = { patternType: 'solid', fgColor: { rgb: hex } };
  stl = {
    title: { font: { bold: true, sz: 14, color: { rgb: hex } } },
    note: { font: { italic: true, sz: 9, color: { rgb: C_GR } }, alignment: { wrapText: true, vertical: 'top' } },
    hdr: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fillP, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } },
    hdrL: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fillP, alignment: { vertical: 'center', wrapText: true } },
    b: { font: { bold: true } },
    b12: { font: { bold: true, sz: 12 } },
    sub: { font: { bold: true, color: { rgb: darken(hex) } } },
    key: { font: { bold: true }, fill: { patternType: 'solid', fgColor: { rgb: C_G } } },
    c: { alignment: { horizontal: 'center' } },
    wrap: { alignment: { wrapText: true, vertical: 'top' } },
    gain: { font: { bold: true, sz: 12, color: { rgb: hex } } },
    gkey: { font: { bold: true, sz: 12 }, fill: { patternType: 'solid', fgColor: { rgb: C_G } } },
  };
}
setPalette('8B6CFF');

export function colL(i: number): string {
  let s = '';
  i++;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

export type PutOpts = { f?: string; s?: any; z?: string };
export function W() {
  const ws: Record<string, any> = {};
  const m = { r: 1, c: 0 };
  const put = (r: number, c: number, v: unknown, o: PutOpts = {}) => {
    const cell: any = {};
    if (v == null || v === '') { cell.t = 's'; cell.v = ''; }
    else if (typeof v === 'number') { cell.t = 'n'; cell.v = v; }
    else { cell.t = 's'; cell.v = String(v); }
    if (o.f) cell.f = o.f;
    if (o.s) cell.s = o.s;
    if (o.z) cell.z = o.z;
    ws[colL(c) + r] = cell;
    if (r > m.r) m.r = r;
    if (c > m.c) m.c = c;
  };
  const fin = (colsW: number[], rows?: any[], merges?: any[]) => {
    ws['!ref'] = 'A1:' + colL(m.c) + m.r;
    ws['!cols'] = colsW.map((w) => ({ wch: w }));
    if (rows) ws['!rows'] = rows;
    if (merges) ws['!merges'] = merges;
    return ws;
  };
  return { ws, put, fin };
}

export const qs = (n: string) => "'" + n.replace(/'/g, "''") + "'!";

/** Hoja de juicios por pares AHP: usada siempre para «Criterios» (deriva los pesos, sea cual sea el
 * método elegido para comparar alternativas) y, cuando el método es AHP, una vez por cada criterio
 * (comparación de alternativas). No es "el método AHP" en el sentido de excel-*-sheet.ts, es
 * infraestructura compartida — por eso vive en excel-core.ts y no en un excel-ahp-sheet.ts aparte. */
export function ahpSheet(items: Item[], maps: JMap[], exNames: string[], title: string, note: string) {
  const n = items.length, names = items.map((x) => x.name), { put, fin } = W(), E = maps.length;
  const A = aggMatrix(items, maps), an = analyze(A), EM = maps.map((m) => expertMatrix(items, m));
  const rSum = 3 + n, rNH = 5 + n, rN0 = 6 + n, rVH = 7 + 2 * n, rA0 = 8 + 2 * n, rLam = 8 + 3 * n, rCI = 9 + 3 * n,
    rRI = 10 + 3 * n, rCR = 11 + 3 * n, rOK = 12 + 3 * n, rInd = 14 + 3 * n, vc = n + 1;
  const t0 = (b: number) => rInd + 2 + b * (n + 3), m0 = (b: number) => t0(b) + 2, last = colL(n);
  put(1, 0, title, { s: stl.title });
  put(1, 1, note, { s: stl.note });
  for (let j = 0; j < n; j++) put(2, 1 + j, names[j], { s: stl.hdr });
  for (let i = 0; i < n; i++) {
    put(3 + i, 0, names[i], { s: stl.hdrL });
    for (let j = 0; j < n; j++) {
      const o: PutOpts = { s: stl.c, z: '0.000' };
      if (i === j) put(3 + i, 1 + j, 1, o);
      else if (i < j) { if (E > 0) o.f = 'GEOMEAN(' + maps.map((_, b) => colL(1 + j) + (m0(b) + i)).join(',') + ')'; put(3 + i, 1 + j, A[i][j], o); }
      else { o.f = '1/' + colL(1 + i) + (3 + j); put(3 + i, 1 + j, A[i][j], o); }
    }
  }
  put(rSum, 0, 'Suma', { s: stl.b });
  for (let j = 0; j < n; j++) put(rSum, 1 + j, A.reduce((a, r) => a + r[j], 0), { f: `SUM(${colL(1 + j)}3:${colL(1 + j)}${2 + n})`, s: stl.b, z: '0.000' });
  put(rNH, 0, 'Normalizada', { s: stl.b });
  put(rNH, vc, 'Vector prioridad', { s: stl.b });
  for (let i = 0; i < n; i++) {
    put(rN0 + i, 0, names[i]);
    for (let j = 0; j < n; j++) put(rN0 + i, 1 + j, an.N[i]?.[j] ?? 0, { f: `${colL(1 + j)}${3 + i}/${colL(1 + j)}$${rSum}`, z: '0.0000' });
    put(rN0 + i, vc, an.w[i], { f: `AVERAGE(B${rN0 + i}:${last}${rN0 + i})`, s: stl.key, z: '0.0000' });
  }
  put(rVH, 0, 'Verificación de consistencia', { s: stl.b12 });
  const Aw = A.map((r) => r.reduce((a, x, j) => a + x * an.w[j], 0));
  for (let i = 0; i < n; i++) {
    const r = rA0 + i;
    put(r, 0, 'A·w (' + names[i] + ')');
    put(r, 1, Aw[i], { f: Array.from({ length: n }, (_, j) => `${colL(1 + j)}${3 + i}*$${colL(vc)}$${rN0 + j}`).join(' + '), z: '0.0000' });
    put(r, 2, Aw[i] / an.w[i], { f: `B${r}/${colL(vc)}${rN0 + i}`, z: '0.0000' });
    put(r, 3, 'lambda parcial');
  }
  put(rLam, 0, 'lambda_max'); put(rLam, 1, an.lam, { f: `AVERAGE(C${rA0}:C${rA0 + n - 1})`, z: '0.0000' });
  put(rCI, 0, 'CI = (lambda_max - n) / (n - 1)'); put(rCI, 1, an.ci, { f: `(B${rLam}-${n})/(${n}-1)`, z: '0.0000' });
  put(rRI, 0, `RI (tabla Saaty, n=${n})`); put(rRI, 1, an.ri, { z: '0.00' });
  put(rCR, 0, 'CR = CI / RI', { s: stl.b }); put(rCR, 1, an.cr, { f: `IFERROR(B${rCI}/B${rRI},0)`, s: stl.key, z: '0.0000' });
  put(rOK, 0, '¿Consistente? (CR < 0.10)', { s: stl.b });
  put(rOK, 1, an.ok ? 'Sí, consistente' : 'No, revisar juicios', { f: `IF(B${rCR}<0.1,"Sí, consistente","No, revisar juicios")`, s: stl.b });
  put(rInd, 0, 'Juicios individuales de los ' + E + ' expertos (entrada de GEOMEAN() de arriba)', { s: stl.b12 });
  for (let b = 0; b < E; b++) {
    put(t0(b), 0, `Experto ${b + 1}: ${exNames[b]}`, { s: stl.sub });
    for (let j = 0; j < n; j++) put(t0(b) + 1, 1 + j, names[j], { s: stl.hdr });
    for (let i = 0; i < n; i++) {
      put(m0(b) + i, 0, names[i], { s: stl.hdrL });
      for (let j = 0; j < n; j++) {
        const o: PutOpts = { s: stl.c, z: '# ?/?' };
        if (i === j) put(m0(b) + i, 1 + j, 1, o);
        else if (i < j) put(m0(b) + i, 1 + j, EM[b][i][j], o);
        else { o.f = '1/' + colL(1 + i) + (m0(b) + j); put(m0(b) + i, 1 + j, EM[b][i][j], o); }
      }
    }
  }
  const colsW = [34, ...Array.from({ length: Math.max(n, 4) + 1 }, () => 17)];
  return { ws: fin(colsW, [{ hpt: 30 }], [{ s: { r: 0, c: 1 }, e: { r: 0, c: Math.max(n, 4) } }]), rN0, vc, w: an.w };
}

/** Matriz de decisión cruda (alternativas x criterios) + tipo (beneficio/costo) por columna.
 * Compartida por los 6 métodos que ranquean sobre datos reales en vez de juicios por pares
 * (TOPSIS/VIKOR/PROMETHEE/ELECTRE/SAW/Fuzzy TOPSIS; AHP no la usa, compara por pares). */
export function matrixSheet(criteria: Criterion[], alternatives: Alternative[], dm: DecisionMatrix, title: string, note: string) {
  const m = criteria.length, n = alternatives.length, { put, fin } = W();
  const rHead = 3, rType = 4, rData0 = 5;
  put(1, 0, title, { s: stl.title });
  put(1, 1, note, { s: stl.note });
  put(rHead, 0, 'Alternativa', { s: stl.hdrL });
  criteria.forEach((c, j) => put(rHead, 1 + j, c.name, { s: stl.hdr }));
  put(rType, 0, 'Tipo (beneficio/costo)', { s: stl.b });
  criteria.forEach((c, j) => put(rType, 1 + j, getType(dm, c.id) === 'min' ? 'Costo' : 'Beneficio', { s: stl.c }));
  alternatives.forEach((a, i) => {
    const r = rData0 + i;
    put(r, 0, a.name, { s: stl.hdrL });
    criteria.forEach((c, j) => put(r, 1 + j, getCell(dm, a.id, c.id) ?? 0, { s: stl.c, z: '0.0000' }));
  });
  const colsW = [30, ...Array.from({ length: Math.max(m, 1) }, () => 16)];
  return { ws: fin(colsW, [{ hpt: 26 }], [{ s: { r: 0, c: 1 }, e: { r: 0, c: Math.max(m, 1) } }]), rHead, rType, rData0, m, n };
}

export type MatInfo = ReturnType<typeof matrixSheet>;
