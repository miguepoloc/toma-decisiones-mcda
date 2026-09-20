// Genera un .xlsx de prueba con datos de ejemplo y verifica: (1) el viaje de ida y vuelta con el
// formato de la herramienta HTML, (2) que el Excel principal ya NO trae las hojas de priorización
// (viven aparte en buildPrioWorkbook, ver check-excel-topsis.ts) pero el respaldo _datos sí conserva
// la priorización completa para reimportar.
import { writeFileSync, readFileSync } from 'node:fs';
import XLSX from 'xlsx-js-style';
import { buildWorkbook, buildPrioWorkbook } from '../src/lib/excel.ts';
import { fromLegacy, isLegacy } from '../src/lib/legacy.ts';
import { indexJudgments, pairsOf } from '../src/lib/ahp.ts';
import { normalizePrio } from '../src/lib/prio.ts';

let fallos = 0;
const ok = (cond: boolean, msg: string) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + msg); if (!cond) fallos++; };

const seed = JSON.parse(readFileSync('prototipos/semilla_priorizacion_ASR.json', 'utf8'));
const evs = [1, 2, 3, 4].map((i) => ({ id: 'v' + i, name: 'Evaluador ' + i }));
const prio = normalizePrio({
  cands: seed.cands.map((c: any) => ({ id: c.id, name: c.name, desc: c.desc ?? '', stage: c.stage, at: c.at ?? '', target: c.target ?? null, reason: c.reason ?? '', evid: c.evid ?? '', qmide: c.qmide ?? '', ind: c.ind ?? '', sq: c.sq ?? [null, null, null, null, null], se: Object.fromEntries((c.se ?? []).map((x: number, i: number) => [evs[i].id, x])), just: c.just ?? '', cutReason: c.cutReason ?? '' })),
  evaluators: evs, questions: seed.questions, mode: 'ev', cutoff: 4,
});
const criteria = ['Eficiencia de datos', 'Métricas WER/CER', 'Madurez y soporte de herramientas', 'Dependencia de anotación', 'Transferibilidad entre lenguas'].map((name, i) => ({ id: 'k' + i, name, hint: '' }));
const alternatives = ['Fine-tuning supervisado', 'Transfer learning cross-lingual', 'Aprendizaje autosupervisado', 'Data augmentation'].map((name, i) => ({ id: 'a' + i, name }));
const experts = [0, 1, 2].map((i) => ({ id: 'e' + i, name: 'Experto ' + (i + 1), role_desc: ['Ingeniero ML/voz', 'Ingeniero electrónico', 'Hablante nativo'][i] }));
const rows: { expert_id: string; sheet: string; pair_key: string; value: number }[] = [];
for (const e of experts) {
  pairsOf(5).forEach(([i, j], n) => rows.push({ expert_id: e.id, sheet: 'crit', pair_key: `k${i}-k${j}`, value: ((n + Number(e.id[1])) % 5) - 2 }));
  criteria.forEach((c) => pairsOf(4).forEach(([i, j], n) => rows.push({ expert_id: e.id, sheet: 'alt:' + c.id, pair_key: `a${i}-a${j}`, value: ((n * 2 + Number(c.id[1])) % 7) - 3 })));
}
const study = {
  title: 'Proyecto de prueba', objective: seed.objective.replace(/\s+/g, ' '), criteria, alternatives, experts,
  idx: indexJudgments(rows), prio, method: 'ahp' as const, decisionMatrix: { values: {}, types: {} },
};
const wb = buildWorkbook(XLSX, study);
writeFileSync('/tmp/plataforma_test.xlsx', XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
console.log('Hojas:', wb.SheetNames.join(' | '));
ok(!wb.SheetNames.some((n: string) => n.startsWith('Prior')), 'el Excel principal no trae hojas de priorización (van aparte)');

// ida y vuelta por la hoja oculta _datos
const wb2 = XLSX.read(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), { type: 'array' });
let t = ''; for (let r = 1; wb2.Sheets['_datos']['A' + r]; r++) t += wb2.Sheets['_datos']['A' + r].v;
const st = JSON.parse(t);
const imp = isLegacy(st) ? fromLegacy(st) : null;
ok(!!imp, 'la hoja _datos es un respaldo v2 válido');
ok(imp?.experts.length === experts.length, `expertos reimportados = ${imp?.experts.length} (esperado ${experts.length})`);
ok(imp?.judgments.length === rows.length, `juicios reimportados = ${imp?.judgments.length} (esperado ${rows.length})`);
ok(imp?.prio.cands.length === prio.cands.length, `candidatos de priorización reimportados = ${imp?.prio.cands.length} (esperado ${prio.cands.length}, aunque el Excel principal no muestre esas hojas)`);

// Excel de priorización aparte: trae Prior 1-5, no trae Criterios/_datos.
const wbPrio = buildPrioWorkbook(XLSX, study);
console.log('Hojas (priorización):', wbPrio.SheetNames.join(' | '));
ok(['Prior 1. Lluvia de ideas', 'Prior 2. Tamizaje', 'Prior 3. Independencia', 'Prior 4. Panel', 'Prior 5. Resultado final'].every((n) => wbPrio.SheetNames.includes(n)), 'trae las 5 hojas de priorización');
ok(!wbPrio.SheetNames.includes('Criterios') && !wbPrio.SheetNames.includes('_datos'), 'no trae Criterios ni _datos (eso vive en el Excel principal)');

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(fallos ? 1 : 0);
