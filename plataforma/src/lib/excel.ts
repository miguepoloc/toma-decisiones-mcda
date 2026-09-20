// Exporta el estudio a un .xlsx con la misma estructura que Ejercicio.xlsx (Notas, Criterios, una hoja por criterio,
// Síntesis) más las 5 hojas de priorización. Las celdas son fórmulas vivas (GEOMEAN, SUM, AVERAGE, SUMPRODUCT, RANK).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { aggMatrix, altSheet, analyze, expertMatrix, CRIT_SHEET, synthesis, type Item, type JMap } from './ahp.ts';
import { toLegacy, type Study } from './legacy.ts';
import { alive, cols, f2, finalists, inIndep, mean, passes, ranked, scoreOf } from './prio.ts';

const C_P = '8B6CFF', C_P2 = '5B3FCC', C_G = 'D8F5E3', C_GR = '666666';
const fillP = { patternType: 'solid', fgColor: { rgb: C_P } };
const stl: Record<string, any> = {
  title: { font: { bold: true, sz: 14, color: { rgb: C_P } } },
  note: { font: { italic: true, sz: 9, color: { rgb: C_GR } }, alignment: { wrapText: true, vertical: 'top' } },
  hdr: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fillP, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } },
  hdrL: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fillP, alignment: { vertical: 'center', wrapText: true } },
  b: { font: { bold: true } },
  b12: { font: { bold: true, sz: 12 } },
  sub: { font: { bold: true, color: { rgb: C_P2 } } },
  key: { font: { bold: true }, fill: { patternType: 'solid', fgColor: { rgb: C_G } } },
  c: { alignment: { horizontal: 'center' } },
  wrap: { alignment: { wrapText: true, vertical: 'top' } },
  gain: { font: { bold: true, sz: 12, color: { rgb: C_P } } },
  gkey: { font: { bold: true, sz: 12 }, fill: { patternType: 'solid', fgColor: { rgb: C_G } } },
};

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

type PutOpts = { f?: string; s?: any; z?: string };
function W() {
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

const qs = (n: string) => "'" + n.replace(/'/g, "''") + "'!";

function ahpSheet(items: Item[], maps: JMap[], exNames: string[], title: string, note: string, isCrit: boolean) {
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
  if (isCrit && E > 0) {
    const p = m0(E - 1) + n + 2;
    put(p, 0, 'Verificación con el método EXACTO (Saaty, 1980): iteración de potencias', { s: stl.b });
    put(p + 1, 0, 'w(k+1) = A·w(k), normalizado en cada paso. Arranca de un vector parejo (1/n cada uno) y converge al mismo vector de prioridad que el atajo de la columna «Vector prioridad» (normalizar + promediar).', { s: stl.note });
    let r = p + 3, prev = r, pv: number[] = Array(n).fill(1 / n);
    put(r, 0, 'w(0), arranque parejo', { s: stl.b });
    for (let j = 0; j < n; j++) put(r, 1 + j, 1 / n, { f: `1/${n}`, z: '0.0000' });
    for (let k = 1; k <= 6; k++) {
      const rA = prev + 1, rW = prev + 2, q = A.map((row) => row.reduce((a, x, j) => a + x * pv[j], 0)), sm = q.reduce((a, b) => a + b, 0);
      put(rA, 0, `Iteración ${k}, A·w(${k - 1}) (sin normalizar)`);
      put(rW, 0, `w(${k})`, { s: stl.b });
      for (let j = 0; j < n; j++) {
        put(rA, 1 + j, q[j], { f: `SUMPRODUCT(B${3 + j}:${last}${3 + j},B${prev}:${last}${prev})`, z: '0.0000' });
        put(rW, 1 + j, q[j] / sm, { f: `${colL(1 + j)}${rA}/SUM(B${rA}:${last}${rA})`, z: '0.0000' });
      }
      pv = q.map((x) => x / sm);
      prev = rW;
    }
    put(prev + 2, 0, 'Comparando con el atajo (normalizar + promediar)', { s: stl.b });
    put(prev + 3, 0, 'Potencias, w(6)'); put(prev + 4, 0, 'Atajo (normalizar+promediar)'); put(prev + 5, 0, 'Diferencia máxima', { s: stl.b });
    for (let j = 0; j < n; j++) {
      put(prev + 3, 1 + j, pv[j], { f: `${colL(1 + j)}${prev}`, z: '0.0000' });
      put(prev + 4, 1 + j, an.w[j], { f: `${colL(vc)}${rN0 + j}`, z: '0.0000' });
    }
    put(prev + 5, 1, Math.max(...pv.map((x, j) => Math.abs(x - an.w[j]))), {
      f: 'MAX(' + Array.from({ length: n }, (_, j) => `ABS(${colL(1 + j)}${prev + 3}-${colL(1 + j)}${prev + 4})`).join(',') + ')', s: stl.b, z: '0.0000',
    });
  }
  const colsW = [34, ...Array.from({ length: Math.max(n, 4) + 1 }, () => 17)];
  return { ws: fin(colsW, [{ hpt: 30 }], [{ s: { r: 0, c: 1 }, e: { r: 0, c: Math.max(n, 4) } }]), rN0, vc };
}

export function buildWorkbook(XLSX: any, study: Study) {
  const wb = XLSX.utils.book_new(), used = new Set<string>();
  const ex = study.experts.map((e) => e.role_desc || e.name);
  const expertIds = study.experts.map((e) => e.id);
  const S = study, A = study.prio;
  const res = ['Notas', 'Criterios', 'Síntesis', '_datos', 'Prior 1. Lluvia de ideas', 'Prior 2. Tamizaje', 'Prior 3. Independencia', 'Prior 4. Panel', 'Prior 5. Resultado final'];
  res.forEach((x) => used.add(x.toLowerCase()));
  const sname = (n: string) => {
    const b = String(n).replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28) || 'Hoja';
    let s = b, i = 2;
    while (used.has(s.toLowerCase())) s = b.slice(0, 26) + ' ' + i++;
    used.add(s.toLowerCase());
    return s;
  };
  const add = (name: string, ws: any) => XLSX.utils.book_append_sheet(wb, ws, name);
  const candOf = (id: string | null) => A.cands.find((c) => c.id === id);
  const mapsFor = (sheet: string): JMap[] => expertIds.map((e) => S.idx[e]?.[sheet] ?? {});

  { // Notas
    const { put, fin } = W();
    const ord = ['Notas', 'Prior 1–5', 'Criterios', ...S.criteria.map((c) => c.name), 'Síntesis'].join(' → ');
    const lines: [string, any][] = [
      [S.title || 'Priorización de criterios y AHP', stl.title],
      ['', null],
      ['Objetivo de decisión: ' + S.objective, stl.wrap],
      [`Cada juicio del AHP es la media geométrica de un panel de ${S.experts.length} experto(s) (${ex.join('; ')}), no la opinión de una sola persona. Ver hoja Criterios (juicios individuales debajo de la verificación de consistencia) para el mecanismo de agregación (Forman & Peniwati, 1998).`, stl.wrap],
      ['Orden de hojas: ' + ord, stl.wrap],
      ['Cómo usarlo: las hojas «Prior 1» a «Prior 5» son la priorización de criterios (Sesión 1): lluvia de ideas, tamizaje, independencia, panel de importancia y resultado final. Las hojas siguientes son el AHP (Sesión 2): una matriz de criterios, una matriz de estrategias por cada criterio y la síntesis. Las celdas con GEOMEAN, SUM, AVERAGE, SUMPRODUCT y RANK son fórmulas vivas: si cambias un juicio individual, todo se recalcula.', stl.wrap],
      ['¿Qué es GEOMEAN()? Es la media geométrica (la raíz n-ésima del producto de n números), la función de Excel que se usa para combinar el mismo juicio de varios expertos en un solo número. No es el promedio normal (aritmético); es la forma correcta de agregar juicios de razón en AHP.', stl.wrap],
      ['Revise siempre la fila «¿Consistente? (CR < 0.10)» de cada hoja antes de dar los juicios por buenos.', stl.wrap],
      ['', null],
      ['Exportado desde la plataforma MCDA el ' + new Date().toLocaleString() + '. La hoja oculta «_datos» guarda el estado completo para volver a cargarlo en la plataforma o en la herramienta HTML.', stl.note],
    ];
    lines.forEach(([t, s], i) => put(i + 1, 0, t, { s }));
    add('Notas', fin([100], [{ hpt: 22 }, {}, { hpt: 32 }, { hpt: 48 }, { hpt: 32 }, { hpt: 78 }, { hpt: 48 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }]));
  }
  { // Prior 1
    const { put, fin } = W();
    put(1, 0, 'Priorización — 1. Lluvia de ideas', { s: stl.title });
    put(3, 0, 'Objetivo: ' + S.objective, { s: stl.wrap });
    ['#', 'Candidato', 'Descripción'].forEach((h, j) => put(5, j, h, { s: stl.hdrL }));
    A.cands.forEach((c, i) => { put(6 + i, 0, i + 1, { s: stl.c }); put(6 + i, 1, c.name, { s: stl.wrap }); put(6 + i, 2, c.desc, { s: stl.wrap }); });
    add('Prior 1. Lluvia de ideas', fin([5, 44, 70], [{ hpt: 24 }, {}, { hpt: 44 }], [{ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }]));
  }
  { // Prior 2
    const { put, fin } = W();
    put(1, 0, 'Priorización — 2. Tamizaje: elimina duplicados y candidatos irrelevantes para el caso', { s: stl.title });
    ['Candidato', 'Se elimina porque...', 'Evidencia'].forEach((h, j) => put(3, j, h, { s: stl.hdrL }));
    const out = A.cands.filter((c) => c.stage !== 'keep' && c.at !== 'ind');
    out.forEach((c, i) => {
      const t = candOf(c.target);
      put(4 + i, 0, c.name, { s: stl.wrap });
      put(4 + i, 1, (c.stage === 'merge' && t ? 'Se funde con ' + t.name + '. ' : '') + c.reason, { s: stl.wrap });
      put(4 + i, 2, c.evid, { s: stl.wrap });
    });
    put(5 + out.length, 0, `Pool restante tras tamizaje: ${inIndep(A).length} candidatos (de ${A.cands.length}).`, { s: stl.b });
    add('Prior 2. Tamizaje', fin([40, 80, 36], [{ hpt: 24 }]));
  }
  { // Prior 3
    const { put, fin } = W();
    put(1, 0, 'Priorización — 3. Verificación de independencia de los candidatos que llegan al panel', { s: stl.title });
    ['Eje', 'Qué mide', 'Evidencia de que son ejes distintos', 'Decisión'].forEach((h, j) => put(3, j, h, { s: stl.hdrL }));
    inIndep(A).forEach((c, i) => {
      const t = candOf(c.target);
      put(4 + i, 0, c.name, { s: stl.wrap }); put(4 + i, 1, c.qmide, { s: stl.wrap }); put(4 + i, 2, c.ind, { s: stl.wrap });
      put(4 + i, 3, c.stage === 'keep' ? 'Se mantiene como eje independiente.' : 'Se solapa: se funde con ' + (t ? t.name : '—') + '. ' + c.reason, { s: stl.wrap });
    });
    add('Prior 3. Independencia', fin([34, 44, 64, 40], [{ hpt: 24 }]));
  }
  const alive0 = alive(A), cs = cols(A), isQ = A.mode === 'q', pc = cs.length + 1, prow: Record<string, number> = {};
  { // Prior 4
    const { put, fin } = W();
    put(1, 0, 'Priorización — 4. Panel de importancia (' + (isQ ? '5 preguntas de evidencia' : 'evaluadores') + ', escala 1 a 5)', { s: stl.title });
    put(2, 0, isQ ? 'Cada columna es una pregunta verificable contra fuentes técnicas (no una opinión). Ponderación = promedio.' : 'Cada evaluador califica cada criterio de 1 (nada importante) a 5 (crítico). Ponderación = promedio.', { s: stl.note });
    put(4, 0, 'Criterio', { s: stl.hdrL });
    cs.forEach((x, j) => put(4, 1 + j, isQ ? `Q${j + 1}: ${A.questions[j]}` : x.label, { s: stl.hdr }));
    put(4, pc, 'Ponderación', { s: stl.hdr });
    alive0.forEach((c, i) => {
      const r = 5 + i;
      prow[c.id] = r;
      put(r, 0, c.name, { s: stl.wrap });
      cs.forEach((x, j) => { const v = scoreOf(A, c, x.key); if (typeof v === 'number') put(r, 1 + j, v, { s: stl.c, z: '0.0' }); });
      const m = mean(A, c);
      put(r, pc, m == null ? '' : m, { f: `IFERROR(AVERAGE(${colL(1)}${r}:${colL(cs.length)}${r}),"")`, s: stl.key, z: '0.00' });
    });
    add('Prior 4. Panel', fin([40, ...cs.map(() => (isQ ? 26 : 14)), 14], [{ hpt: 24 }, {}, {}, { hpt: isQ ? 96 : 24 }]));
  }
  { // Prior 5
    const { put, fin } = W(), ok = finalists(A), no = ranked(A).filter((c) => !passes(A, c)), PN = qs('Prior 4. Panel');
    put(1, 0, 'Priorización — 5. Resultado final: finalistas + tabla de descarte documentada', { s: stl.title });
    put(2, 0, 'Corte elegido (ponderación ≥)', { s: stl.b }); put(2, 1, A.cutoff, { s: stl.key, z: '0.0' });
    put(3, 0, 'Convención práctica del curso, no un estándar de la literatura: documenta por qué elegiste este corte.', { s: stl.note });
    put(5, 0, 'Finalistas (ponderación ≥ corte)', { s: stl.b12 });
    ['Criterio', 'Ponderación', 'Por qué queda'].forEach((h, j) => put(6, j, h, { s: stl.hdrL }));
    ok.forEach((c, i) => { put(7 + i, 0, c.name, { s: stl.wrap }); put(7 + i, 1, mean(A, c), { f: `${PN}${colL(pc)}${prow[c.id]}`, z: '0.00', s: stl.c }); put(7 + i, 2, c.just, { s: stl.wrap }); });
    let r = 8 + ok.length;
    const lim = no.find((c) => mean(A, c) != null);
    if (lim && ok.length && (mean(A, ok[ok.length - 1]) ?? 0) - (mean(A, lim) ?? 0) <= 0.5) {
      put(r, 0, 'Candidato en el límite (no incluido, pero documentado)', { s: stl.b12 }); r++;
      ['Criterio', 'Ponderación', 'Nota'].forEach((h, j) => put(r, j, h, { s: stl.hdrL })); r++;
      put(r, 0, lim.name, { s: stl.wrap }); put(r, 1, mean(A, lim), { f: `${PN}${colL(pc)}${prow[lim.id]}`, z: '0.00', s: stl.c }); put(r, 2, lim.cutReason, { s: stl.wrap }); r += 2;
    }
    put(r, 0, 'Tabla de descarte, con razón documentada de cada uno', { s: stl.b12 }); r++;
    ['Criterio', 'Etapa de descarte', 'Razón'].forEach((h, j) => put(r, j, h, { s: stl.hdrL })); r++;
    no.forEach((c) => { const m = mean(A, c); put(r, 0, c.name, { s: stl.wrap }); put(r, 1, 'Panel de importancia' + (m == null ? ' (sin calificar)' : ` (${f2(m)})`), { s: stl.wrap }); put(r, 2, c.cutReason, { s: stl.wrap }); r++; });
    A.cands.filter((c) => c.stage !== 'keep').forEach((c) => {
      const t = candOf(c.target);
      put(r, 0, c.name, { s: stl.wrap });
      put(r, 1, (c.at === 'ind' ? 'Independencia' : 'Tamizaje') + (c.stage === 'merge' && t ? ' (fusionado con ' + t.name + ')' : ''), { s: stl.wrap });
      put(r, 2, c.reason, { s: stl.wrap }); r++;
    });
    add('Prior 5. Resultado final', fin([46, 32, 80], [{ hpt: 24 }]));
  }
  // AHP
  const critInfo = ahpSheet(S.criteria, mapsFor(CRIT_SHEET), ex, 'AHP, Criterios', 'Media geométrica de los expertos (Forman & Peniwati, 1998); ver juicios individuales más abajo. Objetivo: ' + S.objective, true);
  add('Criterios', critInfo.ws);
  const alts = S.criteria.map((c) => {
    const nm = sname(c.name);
    const info = ahpSheet(S.alternatives, mapsFor(altSheet(c.id)), ex, 'AHP, ' + c.name, 'Media geométrica de los expertos. ' + (c.hint || ''), false);
    add(nm, info.ws);
    return { nm, info };
  });
  { // Síntesis
    const { put, fin } = W(), d = synthesis(S.criteria, S.alternatives, expertIds, S.idx);
    const nc = S.criteria.length, m = S.alternatives.length, lc = colL(nc), G = nc + 1, R = nc + 2;
    put(1, 0, 'Estrategia', { s: stl.b });
    S.criteria.forEach((c, j) => put(2, 1 + j, c.name, { s: stl.hdr }));
    put(2, G, 'Prioridad global', { s: stl.hdr }); put(2, R, 'Ranking', { s: stl.hdr });
    put(3, 0, 'Peso del criterio', { s: stl.b });
    S.criteria.forEach((_, j) => put(3, 1 + j, d.wr[j], { f: `Criterios!${colL(critInfo.vc)}${critInfo.rN0 + j}`, z: '0.0000' }));
    S.alternatives.forEach((a, i) => {
      const r = 4 + i;
      put(r, 0, a.name, { s: stl.b });
      S.criteria.forEach((_, j) => put(r, 1 + j, d.rows[i].loc[j], { f: `${qs(alts[j].nm)}${colL(alts[j].info.vc)}${alts[j].info.rN0 + i}`, z: '0.0000' }));
      put(r, G, d.rows[i].g, { f: `SUMPRODUCT(B${r}:${lc}${r},B$3:${lc}$3)`, s: stl.key, z: '0.0000' });
      put(r, R, d.rows[i].rank, { f: `RANK(${colL(G)}${r},${colL(G)}$4:${colL(G)}$${3 + m})`, s: stl.c });
    });
    const g = 4 + m + 1, top = d.rows[d.order[0]];
    put(g, 0, 'Ganador', { s: stl.gain });
    put(g, 1, d.tie ? 'Empate (sin juicios)' : top.name, { f: `INDEX(A4:A${3 + m},MATCH(MAX(${colL(G)}4:${colL(G)}${3 + m}),${colL(G)}4:${colL(G)}${3 + m},0))`, s: stl.gkey });
    put(g, 2, 'con prioridad global de');
    put(g, 3, top.g, { f: `MAX(${colL(G)}4:${colL(G)}${3 + m})`, z: '0.0%' });
    add('Síntesis', fin([26, ...Array.from({ length: nc + 2 }, () => 16)], [{ hpt: 20 }, { hpt: 34 }]));
  }
  { // datos ocultos (formato de respaldo de la herramienta HTML)
    const { put, fin } = W(), txt = JSON.stringify(toLegacy(S));
    for (let i = 0, r = 1; i < txt.length; i += 30000, r++) put(r, 0, txt.slice(i, i + 30000));
    add('_datos', fin([20]));
  }
  wb.Workbook = { Sheets: wb.SheetNames.map((n: string) => ({ Hidden: n === '_datos' ? 1 : 0 })) };
  return wb;
}

export async function downloadExcel(study: Study, filename: string) {
  const XLSX = (await import('xlsx-js-style')).default as any;
  const out = XLSX.write(buildWorkbook(XLSX, study), { bookType: 'xlsx', type: 'array', compression: true });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
