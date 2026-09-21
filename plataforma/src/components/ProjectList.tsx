'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Row = { id: string; title: string; objective: string; is_public: boolean };

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
    const { error } = await createClient().from('projects').delete().eq('id', target.id);
    setBusy(false);
    if (error) { setMsg(error.message); setTarget(null); return; }
    setProjects((prev) => prev.filter((p) => p.id !== target.id));
    setTarget(null);
  }

  async function duplicateProject(p: Row) {
    setBusy(true);
    setMsg('');
    const supabase = createClient();
    const { data: orig, error: fetchErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', p.id)
      .single();

    if (fetchErr || !orig) {
      setMsg(fetchErr?.message ?? 'No se pudo leer el proyecto original');
      setBusy(false);
      return;
    }

    const { data: copyRow, error: insertErr } = await supabase
      .from('projects')
      .insert({
        title: `${orig.title} (Copia)`,
        objective: orig.objective,
        method: orig.method,
        weighting_method: orig.weighting_method,
        criteria: orig.criteria,
        alternatives: orig.alternatives,
        decision_matrix: orig.decision_matrix,
        prioritization: orig.prioritization,
        is_public: false,
        user_id: orig.user_id,
      })
      .select('id, title, objective, is_public')
      .single();

    setBusy(false);
    if (insertErr || !copyRow) {
      setMsg(insertErr?.message ?? 'Error al duplicar el proyecto');
      return;
    }

    setProjects((prev) => [copyRow, ...prev]);
  }

  const matches = target ? confirmText.trim() === target.title.trim() : false;

  return (
    <div className="plist">
      {msg && <p className="err" role="alert">{msg}</p>}
      {!projects.length && (
        <div className="card muted">Aún no tienes proyectos. Crea el primero o importa tu trabajo de la herramienta HTML.</div>
      )}
      {projects.map((p) => (
        <div className="prow" key={p.id}>
          <Link href={`/projects/${p.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
            <b>{p.title}</b><br />
            <span className="muted" style={{ fontSize: 13 }}>{p.objective ? p.objective.slice(0, 110) : 'Sin objetivo todavía'}</span>
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
      ))}

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
