'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hexToken, uid, type Alternative, type Criterion, type ExpertRow, type JudgmentRow, type Method, type WeightingMethod, type ProjectRow } from '@/lib/types';
import { indexJudgments, type JMap } from '@/lib/ahp';
import { finalists, normalizePrio, type PrioState } from '@/lib/prio';
import { downloadExcel, downloadPrioExcel } from '@/lib/excel';
import { normalizeMatrix, setCell as setMatrixCell, setType as setMatrixType, type MatrixType } from '@/lib/topsis';
import JudgmentEditor from './JudgmentEditor';
import PrioritizationEditor from './PrioritizationEditor';
import DecisionMatrixEditor from './DecisionMatrixEditor';
import Results from './Results';

type Props = { initialProject: ProjectRow; initialExperts: ExpertRow[]; initialJudgments: JudgmentRow[] };
type Patch = Partial<Pick<ProjectRow, 'title' | 'objective' | 'method' | 'weighting_method' | 'criteria' | 'alternatives' | 'decision_matrix' | 'prioritization' | 'is_public' | 'public_token'>>;
const TABS_AHP = ['Proyecto', 'Priorización (A)', 'Expertos', 'Resultados', 'Compartir'];
const TABS_MATRIX = ['Proyecto', 'Priorización (A)', 'Expertos', 'Matriz de decisión', 'Resultados', 'Compartir'];
const METHOD_OPTIONS: { key: Method; label: string; family: string; desc: string; citation: string }[] = [
  { key: 'ahp', label: 'AHP', family: 'Pares Saaty', desc: 'Tus expertos comparan las alternativas de a pares con la escala fundamental 1–9. Calcula autovalores y consistencia λmáx.', citation: 'Saaty, T. L. (1980). The Analytic Hierarchy Process. McGraw-Hill.' },
  { key: 'topsis', label: 'TOPSIS', family: 'Distancia Ideal', desc: 'Escribes el valor cuantitativo real de cada alternativa; ranquea por cercanía euclidiana a la solución ideal (PIS) y lejanía de la anti-ideal (NIS).', citation: 'Hwang, C. L., & Yoon, K. (1981). Multiple Attribute Decision Making. Springer-Verlag.' },
  { key: 'vikor', label: 'VIKOR', family: 'Compromiso', desc: 'Misma matriz que TOPSIS; ranquea buscando la solución de compromiso mutuo: maximiza utilidad de la mayoría (S) y minimiza pesar (R).', citation: 'Opricovic, S., & Tzeng, G. H. (2004). Compromise solution by MCDM methods. European Journal of Operational Research, 156(2), 445–455.' },
  { key: 'promethee', label: 'PROMETHEE', family: 'Superación', desc: 'Relaciones de outranking: compara cada par de alternativas por criterio con funciones de preferencia y calcula flujos netos Φ.', citation: 'Brans, J. P., & Vincke, P. (1985). A preference ranking organisation method. Management Science, 31(6), 647–656.' },
  { key: 'electre', label: 'ELECTRE', family: 'Concordancia', desc: 'Filtrado no compensatorio: particiona alternativas mediante índices de concordancia, discordancia y umbrales de veto.', citation: 'Roy, B. (1991). The outranking approach and the foundations of ELECTRE methods. Theory and Decision, 31(1), 49–73.' },
  { key: 'saw', label: 'SAW', family: 'Suma Directa', desc: 'Suma ponderada simple (Simple Additive Weighting): normalización Min-Max lineal sumada con el vector de pesos.', citation: 'MacCrimmon, K. R. (1968). Decisionmaking among multiple-attribute alternatives. RAND Memorandum.' },
  { key: 'fuzzy_topsis', label: 'Fuzzy TOPSIS', family: 'Lógica Difusa', desc: 'Trata la incertidumbre lingüística mediante números difusos triangulares (TFN) para modelar la ambigüedad del juicio humano.', citation: 'Chen, C. T. (2000). Extensions of the TOPSIS for group decision-making under fuzzy environment. Fuzzy Sets and Systems, 114(1), 1–9.' },
];
const WEIGHTING_OPTIONS: { key: WeightingMethod; label: string; desc: string; citation: string }[] = [
  { key: 'ahp', label: 'AHP (expertos)', desc: 'Pesos derivados de juicios por pares de expertos con autovalores y consistencia.', citation: 'Saaty, T. L. (1980)' },
  { key: 'critic', label: 'CRITIC (objetivo)', desc: 'Pesos calculados a partir de la desviación estándar (contraste) y correlación lineal entre criterios en la matriz.', citation: 'Diakoulaki, D., Mavrotas, G., & Papayannakis, L. (1995)' },
  { key: 'entropy', label: 'Entropía de Shannon (objetivo)', desc: 'Pesos automáticos por dispersión de datos: menor entropía implica mayor variabilidad y mayor poder de decisión.', citation: 'Shannon, C. E. (1948)' },
];

const expertLabel = (e: ExpertRow) => (e.role_desc ? `${e.name} · ${e.role_desc}` : e.name);
const origin = () => (typeof window === 'undefined' ? '' : window.location.origin);

export default function ProjectWorkspace({ initialProject, initialExperts, initialJudgments }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [project, setProject] = useState(initialProject);
  const [experts, setExperts] = useState(initialExperts);
  const [judgments, setJudgments] = useState(initialJudgments);
  const [tab, setTab] = useState('Proyecto');
  const [editing, setEditing] = useState<string | null>(null);
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErr, setSaveErr] = useState('');
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendDel, setPendDel] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ name: '', role: '' });
  const [msg, setMsg] = useState('');

  const prio = useMemo(() => normalizePrio(project.prioritization), [project.prioritization]);
  const idx = useMemo(() => indexJudgments(judgments), [judgments]);
  const dm = useMemo(() => normalizeMatrix(project.decision_matrix), [project.decision_matrix]);
  const TABS = project.method === 'ahp' ? TABS_AHP : TABS_MATRIX;

  const flush = useCallback(async () => {
    const p = pending.current;
    pending.current = {};
    if (!Object.keys(p).length) return;
    setSave('saving');
    const { error } = await supabase.from('projects').update(p).eq('id', initialProject.id);
    if (error) { setSave('error'); setSaveErr(error.message); pending.current = { ...p, ...pending.current }; }
    else setSave('saved');
  }, [supabase, initialProject.id]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); void flush(); }, [flush]);

  function patch(p: Patch, immediate = false) {
    setProject((prev) => ({ ...prev, ...p }) as ProjectRow);
    pending.current = { ...pending.current, ...p };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), immediate ? 0 : 700);
  }

  /* ---- borrado en cascada de juicios cuando se quita un criterio o una estrategia ---- */
  async function dropJudgments(match: (j: JudgmentRow) => boolean) {
    const hit = judgments.filter(match);
    if (!hit.length) return;
    const groups = new Map<string, JudgmentRow[]>();
    hit.forEach((j) => { const k = j.expert_id + '|' + j.sheet; groups.set(k, [...(groups.get(k) ?? []), j]); });
    for (const rows of groups.values()) {
      await supabase.from('judgments').delete().eq('expert_id', rows[0].expert_id).eq('sheet', rows[0].sheet).in('pair_key', rows.map((r) => r.pair_key));
    }
    setJudgments((prev) => prev.filter((j) => !match(j)));
  }
  const hasId = (j: JudgmentRow, id: string) => j.pair_key.split('-').includes(id);

  async function removeCriterion(id: string) {
    await dropJudgments((j) => j.sheet === 'alt:' + id || (j.sheet === 'crit' && hasId(j, id)));
    patch({ criteria: project.criteria.filter((c) => c.id !== id) }, true);
  }
  async function removeAlternative(id: string) {
    await dropJudgments((j) => j.sheet.startsWith('alt:') && hasId(j, id));
    patch({ alternatives: project.alternatives.filter((a) => a.id !== id) }, true);
  }
  const twoClick = (key: string, fn: () => void | Promise<void>) => {
    if (pendDel !== key) { setPendDel(key); setTimeout(() => setPendDel((p) => (p === key ? null : p)), 4000); return; }
    setPendDel(null);
    void fn();
  };

  function syncFinals(): string {
    const fin = finalists(prio);
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const crit = [...project.criteria];
    const added: string[] = [], present: string[] = [];
    fin.forEach((c) => {
      const k = crit.find((x) => x.src === c.id) ?? crit.find((x) => norm(x.name) === norm(c.name));
      if (k) { k.src = c.id; present.push(k.name); }
      else { crit.push({ id: uid('k'), src: c.id, name: c.name, hint: '' }); added.push(c.name); }
    });
    const extra = crit.filter((k) => !fin.some((c) => c.id === k.src)).map((k) => k.name);
    patch({ criteria: crit }, true);
    return `Ya estaban: ${present.join(', ') || 'ninguno'}. Agregados: ${added.join(', ') || 'ninguno'}.` +
      (extra.length ? ` En el AHP pero no son finalistas ahora: ${extra.join(', ')} (no se borraron).` : '');
  }

  /* ---- expertos ---- */
  async function addExpert() {
    const name = nuevo.name.trim();
    if (!name) return;
    const { data, error } = await supabase.from('experts')
      .insert({ project_id: project.id, name, role_desc: nuevo.role.trim(), position: experts.length }).select().single();
    if (error || !data) { setMsg(error?.message ?? 'No se pudo agregar'); return; }
    setExperts((p) => [...p, data as ExpertRow]);
    setNuevo({ name: '', role: '' });
  }
  async function updateExpert(id: string, p: Partial<ExpertRow>) {
    setExperts((prev) => prev.map((e) => (e.id === id ? { ...e, ...p } : e)));
    const { error } = await supabase.from('experts').update(p).eq('id', id);
    if (error) setMsg(error.message);
  }
  async function removeExpert(id: string) {
    await supabase.from('experts').delete().eq('id', id);
    setExperts((p) => p.filter((e) => e.id !== id));
    setJudgments((p) => p.filter((j) => j.expert_id !== id));
    if (editing === id) setEditing(null);
  }
  async function ownerSet(expertId: string, sheet: string, pair_key: string, value: number | null) {
    const q = value == null
      ? supabase.from('judgments').delete().eq('expert_id', expertId).eq('sheet', sheet).eq('pair_key', pair_key)
      : supabase.from('judgments').upsert({ expert_id: expertId, sheet, pair_key, value }, { onConflict: 'expert_id,sheet,pair_key' });
    const { error } = await q;
    if (error) throw new Error(error.message);
    const e = experts.find((x) => x.id === expertId);
    if (e && e.status === 'pending') void updateExpert(expertId, { status: 'in_progress', filled_by: 'owner' });
  }
  function ownerLocal(expertId: string, sheet: string, pair_key: string, value: number | null) {
    setJudgments((prev) => {
      const rest = prev.filter((j) => !(j.expert_id === expertId && j.sheet === sheet && j.pair_key === pair_key));
      return value == null ? rest : [...rest, { expert_id: expertId, sheet, pair_key, value }];
    });
  }

  /* ---- matriz de decisión ---- */
  function setDMCell(altId: string, critId: string, value: number | null) {
    patch({ decision_matrix: setMatrixCell(dm, altId, critId, value) });
  }
  function setDMFuzzyCell(altId: string, critId: string, label: string) {
    const row = { ...dm.values[altId], [critId]: label };
    patch({ decision_matrix: { ...dm, values: { ...dm.values, [altId]: row } } });
  }
  function setDMType(critId: string, type: MatrixType) {
    patch({ decision_matrix: setMatrixType(dm, critId, type) }, true);
  }

  const studyExport = () => ({
    title: project.title, objective: project.objective, criteria: project.criteria, alternatives: project.alternatives,
    experts: experts.map((e) => ({ id: e.id, name: e.name, role_desc: e.role_desc })), idx, prio: prio as PrioState,
    method: project.method, decisionMatrix: dm,
  });
  const fileBase = () => `MCDA_${project.title.replace(/[^\w-]+/g, '_').slice(0, 40)}_${new Date().toISOString().slice(0, 10)}`;
  async function exportExcel() {
    try {
      await downloadExcel(studyExport(), `${fileBase()}.xlsx`);
    } catch (e) { setMsg('No se pudo generar el Excel: ' + (e instanceof Error ? e.message : '')); }
  }
  async function exportPrioExcel() {
    try {
      await downloadPrioExcel(studyExport(), `${fileBase()}_priorizacion.xlsx`);
    } catch (e) { setMsg('No se pudo generar el Excel de priorización: ' + (e instanceof Error ? e.message : '')); }
  }
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); setMsg('Enlace copiado'); } catch { setMsg('Copia el enlace manualmente'); } };

  const editingExpert = experts.find((e) => e.id === editing);
  const publicUrl = `${origin()}/p/${project.public_token}`;

  return (
    <div>
      <div className="acts" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div className="eyebrow">Proyecto en edición</div>
          <h1 style={{ fontSize: 28, letterSpacing: '-0.01em' }}>{project.title}</h1>
        </div>
        <div className="acts">
          <span className="savest" aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {save === 'saving' && <span style={{ color: 'var(--warn)' }}>Guardando…</span>}
            {save === 'saved' && (
              <span style={{ color: 'var(--pass)', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,0.1)', padding: '3px 9px', borderRadius: 99, border: '1px solid rgba(16,185,129,0.25)', fontSize: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pass)', display: 'inline-block' }} />
                Guardado en tiempo real
              </span>
            )}
            {save === 'error' && <span style={{ color: 'var(--warn)' }}>Error al guardar: {saveErr}</span>}
          </span>
        </div>
      </div>

      <div className="tabsbar" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setEditing(null); setMsg(''); }}>
            {t}
          </button>
        ))}
      </div>
      {msg && <p className="muted" role="status" style={{ marginBottom: 10 }}>{msg}</p>}

      {tab === 'Proyecto' && (
        <div className="panel">
          <div className="card form">
            <div><label className="lbl" htmlFor="t">Título del proyecto</label><input id="t" type="text" value={project.title} onChange={(e) => patch({ title: e.target.value })} /></div>
            <div><label className="lbl" htmlFor="o">Objetivo de decisión</label><textarea id="o" value={project.objective} onChange={(e) => patch({ objective: e.target.value })} placeholder="Ej.: seleccionar la mejor arquitectura IoT que maximice cobertura y minimice costo de despliegue" /></div>
          </div>

          <div className="card form">
            <div className="acts" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <label className="lbl">Cómo comparar las alternativas (Algoritmo MCDA)</label>
                <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                  Selecciona el método con el que se calculará el ranking. Cada algoritmo cuenta con sustento matemático y justificación en la literatura científica.
                </p>
              </div>
              <a href="/metodo" target="_blank" rel="noreferrer" className="btn sm" style={{ textDecoration: 'none' }}>
                📖 Comparar métodos y teoría →
              </a>
            </div>

            <div className="methods-cards-grid" role="group" aria-label="Método de decisión multicriterio">
              {METHOD_OPTIONS.map((m) => {
                const isSelected = project.method === m.key;
                return (
                  <div
                    key={m.key}
                    className={`method-card ${isSelected ? 'selected' : ''}`}
                    data-method={m.key}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() => patch({ method: m.key }, true)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); patch({ method: m.key }, true); } }}
                  >
                    <div className="method-card-top">
                      <span className="method-badge">{m.family}</span>
                      <div className="method-radio">
                        {isSelected && (
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="method-name">
                      <span className="method-dot" />
                      <span>{m.label}</span>
                    </div>
                    <div className="method-desc">{m.desc}</div>
                  </div>
                );
              })}
            </div>

            {(() => {
              const cur = METHOD_OPTIONS.find((m) => m.key === project.method);
              return (
                <div className="method-callout">
                  <div>
                    <strong>{cur?.label} ({cur?.family}):</strong> {cur?.desc}
                    <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85, fontFamily: 'var(--f-mono)' }}>
                      📚 <em>Referencia científica: {cur?.citation}</em>
                    </div>
                  </div>
                  <a href="/metodo" target="_blank" rel="noreferrer">Ver fórmulas y literatura →</a>
                </div>
              );
            })()}

            {project.method !== 'ahp' && (
              <div style={{ marginTop: 14 }}>
                <label className="lbl">Método de ponderación de criterios</label>
                <div className="weights-grid" role="group" aria-label="Ponderación de criterios">
                  {WEIGHTING_OPTIONS.map((o) => {
                    const isSelected = (project.weighting_method ?? 'ahp') === o.key;
                    return (
                      <div
                        key={o.key}
                        className={`weight-card ${isSelected ? 'selected' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => patch({ weighting_method: o.key }, true)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); patch({ weighting_method: o.key }, true); } }}
                      >
                        <b>{o.label}</b>
                        <span>{o.desc}</span>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>{o.citation}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="card form">
            <div className="fgrp">
              <label className="lbl">Criterios ({project.criteria.length}) y su regla de lectura</label>
              {project.criteria.map((c, i) => (
                <div className="lrow h" key={c.id}>
                  <input type="text" value={c.name} aria-label={`Criterio ${i + 1}`} onChange={(e) => patch({ criteria: project.criteria.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) })} />
                  <input type="text" value={c.hint} placeholder="Regla: ¿qué es mejor?" aria-label={`Regla ${i + 1}`} onChange={(e) => patch({ criteria: project.criteria.map((x) => (x.id === c.id ? { ...x, hint: e.target.value } : x)) })} />
                  {project.criteria.length > 2 && <button type="button" className={'btn icon sm' + (pendDel === 'c' + c.id ? ' danger' : '')} onClick={() => twoClick('c' + c.id, () => removeCriterion(c.id))}>{pendDel === 'c' + c.id ? '¿Seguro?' : '✕'}</button>}
                </div>
              ))}
              <div className="acts"><button type="button" className="btn sm" onClick={() => patch({ criteria: [...project.criteria, { id: uid('k'), name: 'Nuevo criterio', hint: '', src: null } as Criterion] }, true)}>+ Agregar criterio</button></div>
              <p className="muted" style={{ fontSize: 13 }}>Ojo con los criterios donde menos es mejor (por ejemplo costo o riesgo): la regla te recuerda comparar en la dirección correcta. Al quitar un criterio se borran los juicios que lo usan.</p>
            </div>
            <div className="fgrp">
              <label className="lbl">Alternativas ({project.alternatives.length})</label>
              {project.alternatives.map((a, i) => (
                <div className="lrow" key={a.id}>
                  <input type="text" value={a.name} aria-label={`Alternativa ${i + 1}`} onChange={(e) => patch({ alternatives: project.alternatives.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)) })} />
                  {project.alternatives.length > 2 && <button type="button" className={'btn icon sm' + (pendDel === 'a' + a.id ? ' danger' : '')} onClick={() => twoClick('a' + a.id, () => removeAlternative(a.id))}>{pendDel === 'a' + a.id ? '¿Seguro?' : '✕'}</button>}
                </div>
              ))}
              <div className="acts"><button type="button" className="btn sm" onClick={() => patch({ alternatives: [...project.alternatives, { id: uid('a'), name: 'Nueva alternativa' } as Alternative] }, true)}>+ Agregar alternativa</button></div>
            </div>
            {(project.criteria.length > 9 || project.alternatives.length > 9) && <div className="banner"><span><b>Ojo:</b> Saaty recomienda comparar hasta 9 elementos por matriz; con más, la consistencia es difícil de lograr.</span></div>}
          </div>
        </div>
      )}

      {tab === 'Priorización (A)' && <PrioritizationEditor state={prio} criteriaCount={project.criteria.length} onChange={(s) => patch({ prioritization: s })} onSync={syncFinals} />}

      {tab === 'Expertos' && (
        <div className="panel">
          {editingExpert ? (
            <>
              <div className="acts" style={{ justifyContent: 'space-between' }}>
                <div><div className="eyebrow">Llenando por</div><h2>{expertLabel(editingExpert)}</h2></div>
                <div className="acts">
                  <button className="btn" type="button" onClick={() => setEditing(null)}>← Volver a expertos</button>
                  <button className="btn primary" type="button" onClick={async () => { await updateExpert(editingExpert.id, { status: 'submitted', filled_by: 'owner', submitted_at: new Date().toISOString() }); setEditing(null); }}>Marcar como completado</button>
                </div>
              </div>
              <JudgmentEditor key={editingExpert.id} criteria={project.criteria} alternatives={project.alternatives} method={project.method}
                initial={idx[editingExpert.id] ?? ({} as Record<string, JMap>)}
                onSet={(s, k, v) => ownerSet(editingExpert.id, s, k, v)} onLocalChange={(s, k, v) => ownerLocal(editingExpert.id, s, k, v)} />
            </>
          ) : (
            <>
              <p className="muted" style={{ maxWidth: '70ch' }}>Cada experto tiene su propio enlace: lo abre sin crear cuenta y solo ve sus preguntas. También puedes llenar los juicios tú mismo por él o ella (por ejemplo tras una entrevista).
                {project.method !== 'ahp' && ` Con ${METHOD_OPTIONS.find((m) => m.key === project.method)?.label}, tus expertos solo pesan los criterios (hoja «Criterios»); las alternativas se comparan con la matriz de datos de la pestaña «Matriz de decisión», no de a pares.`}
              </p>
              <div className="plist">
                {experts.map((e) => {
                  const n = judgments.filter((j) => j.expert_id === e.id).length;
                  const link = `${origin()}/e/${e.invite_token}`;
                  return (
                    <div className="card form" key={e.id}>
                      <div className="acts" style={{ justifyContent: 'space-between' }}>
                        <div>
                          <b>{e.name}</b> {e.role_desc && <span className="muted">· {e.role_desc}</span>}
                          <div className="savest">{n} juicios · {e.filled_by === 'owner' ? 'llenado por ti' : 'llenado por el experto'}</div>
                        </div>
                        <span className={'pill ' + (e.status === 'submitted' ? '' : e.status === 'in_progress' ? 'warn' : 'neutral')}>
                          {e.status === 'submitted' ? 'Enviado' : e.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="linkbox"><input type="text" readOnly value={link} aria-label={`Enlace de ${e.name}`} onFocus={(ev) => ev.target.select()} /><button type="button" className="btn sm" onClick={() => copy(link)}>Copiar enlace</button></div>
                      <div className="acts">
                        <button type="button" className="btn sm primary" onClick={() => setEditing(e.id)}>Llenar yo por él/ella</button>
                        {e.status === 'submitted' && <button type="button" className="btn sm" onClick={() => updateExpert(e.id, { status: 'in_progress', submitted_at: null })}>Reabrir para que edite</button>}
                        <button type="button" className={'btn sm' + (pendDel === 'e' + e.id ? ' danger' : '')} onClick={() => twoClick('e' + e.id, () => removeExpert(e.id))}>{pendDel === 'e' + e.id ? '¿Seguro? Borra sus respuestas' : 'Quitar'}</button>
                      </div>
                    </div>
                  );
                })}
                {!experts.length && <div className="card muted">Aún no hay expertos. Agrega el primero abajo.</div>}
              </div>
              <form className="card form" onSubmit={(e) => { e.preventDefault(); void addExpert(); }}>
                <h3>Agregar experto</h3>
                <div className="two eq">
                  <div><label className="lbl" htmlFor="en">Nombre</label><input id="en" type="text" value={nuevo.name} onChange={(e) => setNuevo({ ...nuevo, name: e.target.value })} placeholder="Ej.: Ana Pérez" /></div>
                  <div><label className="lbl" htmlFor="er">Rol o perfil (opcional)</label><input id="er" type="text" value={nuevo.role} onChange={(e) => setNuevo({ ...nuevo, role: e.target.value })} placeholder="Ej.: Ingeniero de ML / Hablante nativo" /></div>
                </div>
                <div className="acts"><button className="btn primary" type="submit">Agregar experto</button></div>
              </form>
            </>
          )}
        </div>
      )}

      {tab === 'Matriz de decisión' && (
        <DecisionMatrixEditor
          criteria={project.criteria}
          alternatives={project.alternatives}
          matrix={dm}
          method={project.method}
          onSetCell={setDMCell}
          onSetFuzzyCell={setDMFuzzyCell}
          onSetType={setDMType}
        />
      )}

      {tab === 'Resultados' && (
        <div className="panel">
          <div className="acts">
            <button className="btn primary" type="button" onClick={exportExcel}>Descargar Excel</button>
            <button className="btn" type="button" onClick={exportPrioExcel}>Descargar Excel de priorización</button>
          </div>
          <Results
            criteria={project.criteria}
            alternatives={project.alternatives}
            experts={experts.map((e) => ({ id: e.id, label: expertLabel(e) }))}
            judgments={judgments}
            method={project.method}
            weightingMethod={project.weighting_method ?? 'ahp'}
            decisionMatrix={project.decision_matrix}
            showPerExpert
          />
        </div>
      )}

      {tab === 'Compartir' && (
        <div className="panel">
          <div className="card form">
            <h3>Resultados públicos</h3>
            <p className="muted" style={{ maxWidth: '70ch' }}>Por defecto, nadie más que tú ve tu proyecto. Si activas el enlace público, cualquier persona con el enlace podrá ver los resultados (ranking, pesos y consistencia). No verá nombres de expertos, ni sus enlaces, ni la priorización de criterios.</p>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
              <input type="checkbox" checked={project.is_public} onChange={(e) => patch({ is_public: e.target.checked }, true)} /> Hacer público con enlace
            </label>
            {project.is_public ? (
              <>
                <div className="linkbox"><input type="text" readOnly value={publicUrl} aria-label="Enlace público" onFocus={(ev) => ev.target.select()} /><button type="button" className="btn sm" onClick={() => copy(publicUrl)}>Copiar</button></div>
                <div className="acts"><button type="button" className={'btn sm' + (pendDel === 'tok' ? ' danger' : '')} onClick={() => twoClick('tok', () => patch({ public_token: hexToken() }, true))}>{pendDel === 'tok' ? '¿Seguro? El enlace anterior deja de funcionar' : 'Generar enlace nuevo'}</button></div>
              </>
            ) : <p className="muted" style={{ fontSize: 13 }}>Ahora mismo es privado: solo tú lo ves.</p>}
          </div>
          <div className="card form">
            <h3>Exportar</h3>
            <p className="muted">
              {project.method === 'ahp'
                ? 'Excel con la misma estructura del ejercicio del curso: Notas, Criterios, una hoja por criterio y Síntesis.'
                : `Excel con Notas, Criterios, Matriz de decisión y ${METHOD_OPTIONS.find((m) => m.key === project.method)?.label} (fórmulas vivas, con su propio color de acento).`}
              {' '}La priorización de criterios (Sesión 1) es un Excel aparte, para no descargarla siempre que solo hace falta el método.
            </p>
            <div className="acts">
              <button className="btn primary" type="button" onClick={exportExcel}>Descargar Excel</button>
              <button className="btn" type="button" onClick={exportPrioExcel}>Descargar Excel de priorización</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
