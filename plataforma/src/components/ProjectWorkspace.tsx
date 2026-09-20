'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hexToken, uid, type Alternative, type Criterion, type ExpertRow, type JudgmentRow, type Method, type ProjectRow } from '@/lib/types';
import { indexJudgments, type JMap } from '@/lib/ahp';
import { finalists, normalizePrio, type PrioState } from '@/lib/prio';
import { downloadExcel } from '@/lib/excel';
import { normalizeMatrix, setCell as setMatrixCell, setType as setMatrixType, type MatrixType } from '@/lib/topsis';
import JudgmentEditor from './JudgmentEditor';
import PrioritizationEditor from './PrioritizationEditor';
import DecisionMatrixEditor from './DecisionMatrixEditor';
import Results from './Results';

type Props = { initialProject: ProjectRow; initialExperts: ExpertRow[]; initialJudgments: JudgmentRow[] };
type Patch = Partial<Pick<ProjectRow, 'title' | 'objective' | 'method' | 'criteria' | 'alternatives' | 'decision_matrix' | 'prioritization' | 'is_public' | 'public_token'>>;
const TABS_AHP = ['Proyecto', 'Priorización (A)', 'Expertos', 'Resultados', 'Compartir'];
const TABS_MATRIX = ['Proyecto', 'Priorización (A)', 'Expertos', 'Matriz de decisión', 'Resultados', 'Compartir'];
const METHOD_OPTIONS: { key: Method; label: string; desc: string }[] = [
  { key: 'ahp', label: 'AHP', desc: 'Tus expertos comparan las alternativas de a pares, un criterio a la vez.' },
  { key: 'topsis', label: 'TOPSIS', desc: 'Escribes el valor real de cada alternativa por criterio; ranquea por cercanía a la solución ideal.' },
  { key: 'vikor', label: 'VIKOR', desc: 'Misma matriz que TOPSIS; ranquea buscando la mejor solución de compromiso (menor Q es mejor).' },
  { key: 'promethee', label: 'PROMETHEE', desc: 'Misma matriz; compara cada par de alternativas criterio por criterio y suma flujos netos.' },
  { key: 'electre', label: 'ELECTRE', desc: 'Misma matriz; no siempre da un ganador único — puede dejar alternativas incomparables entre sí.' },
];
/** Métodos cuyo Excel todavía no tiene hojas propias (arma la estructura de AHP como referencia). */
const NO_EXCEL_YET: Method[] = ['vikor', 'promethee', 'electre'];

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

  /* ---- matriz de decisión (TOPSIS y, a futuro, VIKOR/ELECTRE/PROMETHEE sobre los mismos datos) ---- */
  function setDMCell(altId: string, critId: string, value: number | null) {
    patch({ decision_matrix: setMatrixCell(dm, altId, critId, value) });
  }
  function setDMType(critId: string, type: MatrixType) {
    patch({ decision_matrix: setMatrixType(dm, critId, type) }, true);
  }

  const studyExport = () => ({
    title: project.title, objective: project.objective, criteria: project.criteria, alternatives: project.alternatives,
    experts: experts.map((e) => ({ id: e.id, name: e.name, role_desc: e.role_desc })), idx, prio: prio as PrioState,
    method: project.method, decisionMatrix: dm,
  });
  async function exportExcel() {
    try {
      await downloadExcel(studyExport(), `MCDA_${project.title.replace(/[^\w-]+/g, '_').slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { setMsg('No se pudo generar el Excel: ' + (e instanceof Error ? e.message : '')); }
  }
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); setMsg('Enlace copiado'); } catch { setMsg('Copia el enlace manualmente'); } };

  const editingExpert = experts.find((e) => e.id === editing);
  const publicUrl = `${origin()}/p/${project.public_token}`;

  return (
    <div>
      <div className="acts" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <div className="eyebrow">Proyecto</div>
          <h1 style={{ fontSize: 28 }}>{project.title}</h1>
        </div>
        <span className="savest" aria-live="polite">{save === 'saving' && 'Guardando…'}{save === 'saved' && '✓ Guardado'}{save === 'error' && `Error al guardar: ${saveErr}`}</span>
      </div>

      <div className="tabsbar" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setEditing(null); setMsg(''); }}>{t}</button>)}
      </div>
      {msg && <p className="muted" role="status" style={{ marginBottom: 10 }}>{msg}</p>}

      {tab === 'Proyecto' && (
        <div className="panel">
          <div className="card form">
            <div><label className="lbl" htmlFor="t">Título del proyecto</label><input id="t" type="text" value={project.title} onChange={(e) => patch({ title: e.target.value })} /></div>
            <div><label className="lbl" htmlFor="o">Objetivo de decisión</label><textarea id="o" value={project.objective} onChange={(e) => patch({ objective: e.target.value })} placeholder="Ej.: seleccionar la alternativa X que mejor cumpla Y en el contexto Z" /></div>
          </div>
          <div className="card form">
            <label className="lbl">Cómo comparar las alternativas (el peso de los criterios siempre sale de la pestaña Expertos)</label>
            <div className="seg" role="group" aria-label="Método">
              {METHOD_OPTIONS.map((m) => (
                <button key={m.key} type="button" aria-pressed={project.method === m.key} onClick={() => patch({ method: m.key }, true)}>{m.label}</button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              {METHOD_OPTIONS.find((m) => m.key === project.method)?.desc}
              {' '}¿No sabes cuál te conviene? <a href="/metodo" target="_blank" rel="noreferrer">Compáralos</a>.
            </p>
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
        <DecisionMatrixEditor criteria={project.criteria} alternatives={project.alternatives} matrix={dm} onSetCell={setDMCell} onSetType={setDMType} />
      )}

      {tab === 'Resultados' && (
        <div className="panel">
          <div className="acts"><button className="btn primary" type="button" onClick={exportExcel}>Descargar Excel</button></div>
          {NO_EXCEL_YET.includes(project.method) && <p className="muted" style={{ fontSize: 13 }}>El Excel exportado todavía solo arma hojas de AHP y TOPSIS; para {METHOD_OPTIONS.find((m) => m.key === project.method)?.label} los resultados de aquí abajo son la referencia por ahora.</p>}
          <Results criteria={project.criteria} alternatives={project.alternatives} experts={experts.map((e) => ({ id: e.id, label: expertLabel(e) }))} judgments={judgments} method={project.method} decisionMatrix={project.decision_matrix} showPerExpert />
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
                ? 'Excel con la misma estructura del ejercicio del curso: Notas, Criterios, una hoja por criterio y Síntesis, más las 5 hojas de priorización.'
                : project.method === 'topsis'
                  ? 'Excel con Notas, Criterios, Matriz de decisión y TOPSIS (fórmulas vivas), más las 5 hojas de priorización.'
                  : `Con ${METHOD_OPTIONS.find((m) => m.key === project.method)?.label} el Excel todavía arma la estructura de AHP (no representa la matriz de decisión): usa la pestaña Resultados como referencia mientras se agrega.`}
            </p>
            <div className="acts"><button className="btn primary" type="button" onClick={exportExcel}>Descargar Excel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
