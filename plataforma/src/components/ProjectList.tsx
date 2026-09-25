'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/errors';
import { cloneLayers, removeProjectFolder } from '@/lib/geo/store';
import { PROJECT_LIST_SELECT, describeProject, type ProjectListRow } from '@/lib/projects';

type Row = ProjectListRow;

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  );
}

export default function ProjectList({ initial }: { initial: Row[] }) {
  const [projects, setProjects] = useState(initial);
  const [target, setTarget] = useState<Row | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (target) { setConfirmText(''); requestAnimationFrame(() => inputRef.current?.focus()); }
  }, [target]);

  useEffect(() => {
    if (!target) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setTarget(null); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target]);

  async function confirmDelete() {
    if (!target) return;
    setBusy(true);
    const sb = createClient();
    try {
      // Borra también los mapas subidos (Storage no se borra en cascada con la fila).
      const { data: u } = await sb.auth.getUser();
      if (u.user) await removeProjectFolder(sb, u.user.id, target.id);
    } catch { /* mejor esfuerzo: si falla, el admin los ve como huérfanos */ }
    const { error } = await sb.from('projects').delete().eq('id', target.id);
    setBusy(false);
    if (error) { setMsg(friendlyError(error, 'No se pudo eliminar el proyecto.')); setTarget(null); return; }
    setProjects((prev) => prev.filter((p) => p.id !== target.id));
    setTarget(null);
  }

  const [successMsg, setSuccessMsg] = useState('');

  async function duplicateProject(p: Row) {
    setBusy(true);
    setMsg('');
    setSuccessMsg('');
    const supabase = createClient();

    // Obtener sesión del usuario autenticado para satisfacer la política RLS (owner_id = auth.uid())
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;
    if (!currentUserId) {
      setMsg('Sesión no válida o expirada. Por favor vuelve a iniciar sesión.');
      setBusy(false);
      return;
    }

    const { data: orig, error: fetchErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', p.id)
      .single();

    if (fetchErr || !orig) {
      setMsg(fetchErr ? friendlyError(fetchErr, 'No se pudo leer el proyecto original.') : 'No se pudo leer el proyecto original.');
      setBusy(false);
      return;
    }

    const { data: copyRow, error: insertErr } = await supabase
      .from('projects')
      .insert({
        owner_id: currentUserId,
        title: `${orig.title} (Copia)`,
        objective: orig.objective,
        method: orig.method,
        weighting_method: orig.weighting_method,
        criteria: orig.criteria,
        alternatives: orig.alternatives,
        decision_matrix: orig.decision_matrix,
        prioritization: orig.prioritization,
        kind: orig.kind ?? 'decision',
        geo: orig.geo ?? {},
        is_public: false,
      })
      .select(PROJECT_LIST_SELECT)
      .single();

    if (insertErr || !copyRow) {
      setMsg(insertErr ? friendlyError(insertErr, 'Error al duplicar el proyecto.') : 'Error al duplicar el proyecto.');
      setBusy(false);
      return;
    }

    // Un mapa de aptitud arrastra sus capas propias: se copian a la carpeta del duplicado (con cuota),
    // para que borrar uno no rompa al otro.
    if (orig.kind === 'spatial' && orig.geo?.layers && Object.keys(orig.geo.layers).length) {
      try {
        const layers = await cloneLayers(supabase, currentUserId, orig.id, copyRow.id, orig.geo.layers);
        const { error: ge } = await supabase.from('projects').update({ geo: { ...orig.geo, layers } }).eq('id', copyRow.id);
        if (ge) throw new Error(ge.message);
      } catch (e) {
        await supabase.from('projects').delete().eq('id', copyRow.id);
        setMsg('No se pudo duplicar el mapa: ' + (e instanceof Error ? e.message : String(e)));
        setBusy(false);
        return;
      }
    }

    // Duplicar también expertos y sus juicios si existen
    try {
      const { data: origExperts } = await supabase
        .from('experts')
        .select('id, name, role_desc, position, filled_by, status')
        .eq('project_id', orig.id);

      if (origExperts && origExperts.length > 0) {
        for (const exp of origExperts) {
          const { data: newExp } = await supabase
            .from('experts')
            .insert({
              project_id: copyRow.id,
              name: exp.name,
              role_desc: exp.role_desc,
              position: exp.position,
              filled_by: exp.filled_by,
              status: exp.status,
            })
            .select('id')
            .single();

          if (newExp) {
            const { data: origJudgments } = await supabase
              .from('judgments')
              .select('sheet, pair_key, value')
              .eq('expert_id', exp.id);

            if (origJudgments && origJudgments.length > 0) {
              await supabase.from('judgments').insert(
                origJudgments.map((j) => ({
                  expert_id: newExp.id,
                  sheet: j.sheet,
                  pair_key: j.pair_key,
                  value: j.value,
                }))
              );
            }
          }
        }
      }
    } catch {
      // Si la copia de expertos falla, el proyecto base ya fue duplicado exitosamente
    }

    // Los expertos se copiaron después de crear la fila: se vuelve a leer para que el resumen los cuente.
    const { data: fresh } = await supabase.from('projects').select(PROJECT_LIST_SELECT).eq('id', copyRow.id).single();
    setBusy(false);
    setProjects((prev) => [(fresh ?? copyRow) as Row, ...prev]);
    setSuccessMsg(`Proyecto «${copyRow.title}» duplicado con éxito.`);
    setTimeout(() => setSuccessMsg(''), 4500);
  }

  const matches = target ? confirmText.trim() === target.title.trim() : false;

  return (
    <div className="plist">
      {msg && <p className="err" role="alert">{msg}</p>}
      {successMsg && (
        <div
          role="status"
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34D399',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13.5,
            fontWeight: 500,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 700 }}>✓</span> {successMsg}
        </div>
      )}
      {!projects.length && (
        <div className="card muted">Aún no tienes proyectos. Crea el primero o importa tu trabajo de la herramienta HTML.</div>
      )}
      {projects.map((p) => {
        const d = describeProject(p);
        return (
        <div className="prow" key={p.id}>
          <Link href={`/projects/${p.id}`} className="prow-main">
            <b>{p.title}</b>
            <span className="prow-obj muted" title={p.objective || undefined}>{p.objective || 'Sin objetivo todavía'}</span>
            <span className="prow-meta">
              <span className="prow-kind" data-method={d.spatial ? 'spatial' : d.method}><i aria-hidden="true" />{d.kind}</span>
              {d.weights && <span>{d.weights}</span>}
              {d.size.map((t) => <span key={t}>{t}</span>)}
              <span>{d.people}</span>
            </span>
          </Link>
          <span className={'pill ' + (p.is_public ? '' : 'neutral')}>{p.is_public ? 'Público con enlace' : 'Privado'}</span>
          <button
            type="button"
            className="btn icon sm"
            title={`Duplicar «${p.title}»`}
            aria-label={`Duplicar «${p.title}»`}
            onClick={() => void duplicateProject(p)}
            disabled={busy}
          >
            <CopyIcon />
          </button>
          <button
            type="button"
            className="btn icon sm del"
            aria-label={`Eliminar «${p.title}»`}
            onClick={() => setTarget(p)}
            disabled={busy}
          >
            <TrashIcon />
          </button>
        </div>
        );
      })}

      {target && (
        <div className="modal-overlay">
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="delp-ttl" aria-describedby="delp-desc">
            <div className="warn-icon"><WarnIcon /></div>
            <h3 id="delp-ttl">Eliminar «{target.title}»</h3>
            <p id="delp-desc">
              Esta acción no se puede deshacer. Se eliminarán el proyecto, sus criterios, alternativas, juicios de
              expertos y cualquier enlace público o de experto asociado.
            </p>
            <div className="confirm-field">
              <label className="lbl" htmlFor="delp-input">Para confirmar, escribe el nombre del proyecto</label>
              <input
                id="delp-input"
                ref={inputRef}
                type="text"
                autoComplete="off"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={target.title}
                onKeyDown={(e) => { if (e.key === 'Enter' && matches && !busy) void confirmDelete(); }}
              />
            </div>
            <div className="acts">
              <button type="button" className="btn sm" onClick={() => setTarget(null)} disabled={busy}>Cancelar</button>
              <button type="button" className="btn sm danger" onClick={() => void confirmDelete()} disabled={!matches || busy}>
                {busy ? 'Eliminando…' : 'Eliminar proyecto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
