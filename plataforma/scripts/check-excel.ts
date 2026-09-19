// Genera un .xlsx de prueba con datos de ejemplo y verifica el viaje de ida y vuelta con el formato de la herramienta HTML.
import { writeFileSync, readFileSync } from 'node:fs';
import XLSX from 'xlsx-js-style';
import { buildWorkbook } from '../src/lib/excel';
import { fromLegacy, isLegacy } from '../src/lib/legacy';
import { indexJudgments, pairsOf } from '../src/lib/ahp';
import { normalizePrio } from '../src/lib/prio';

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
const study = { title: 'Proyecto de prueba', objective: seed.objective.replace(/\s+/g, ' '), criteria, alternatives, experts, idx: indexJudgments(rows), prio };
const wb = buildWorkbook(XLSX, study);
writeFileSync('/tmp/plataforma_test.xlsx', XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
console.log('Hojas:', wb.SheetNames.join(' | '));

// ida y vuelta por la hoja oculta _datos
const wb2 = XLSX.read(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), { type: 'array' });
let t = ''; for (let r = 1; wb2.Sheets['_datos']['A' + r]; r++) t += wb2.Sheets['_datos']['A' + r].v;
const st = JSON.parse(t);
const imp = isLegacy(st) ? fromLegacy(st) : null;
console.log('Importable:', !!imp, '| expertos', imp?.experts.length, '| juicios', imp?.judgments.length, 'de', rows.length, '| candidatos', imp?.prio.cands.length);
process.exit(imp && imp.judgments.length === rows.length ? 0 : 1);
