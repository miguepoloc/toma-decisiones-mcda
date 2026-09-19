'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createFromImport, parseLegacyFile } from '@/lib/importer';
import { blankPrio } from '@/lib/prio';
import { uid } from '@/lib/types';

export default function NewProject({ userId }: { userId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true); setMsg('');
    const { data, error } = await createClient().from('projects').insert({
      owner_id: userId, title: title.trim(), objective: objective.trim(),
      criteria: [1, 2, 3].map((i) => ({ id: uid('k'), name: 'Criterio ' + i, hint: '', src: null })),
      alternatives: [1, 2, 3].map((i) => ({ id: uid('a'), name: 'Alternativa ' + i })),
      prioritization: blankPrio(),
    }).select('id').single();
    setBusy(false);
    if (error || !data) setMsg(error?.message ?? 'No se pudo crear el proyecto');
    else router.push(`/projects/${data.id}`);
  }

  async function importFile(f: File) {
    setBusy(true); setMsg('');
    const imp = await parseLegacyFile(f);
    if (!imp) { setBusy(false); setMsg('Ese archivo no es un respaldo de la herramienta HTML (.json o el .xlsx que ella descarga).'); return; }
    const r = await createFromImport(createClient(), userId, imp, f.name.replace(/\.[^.]+$/, '') || 'Proyecto importado');
    setBusy(false);
    if (r.id) router.push(`/projects/${r.id}`);
    else setMsg(r.error ?? 'No se pudo importar');
  }

  return (
    <div className="two-col">
      <form className="card form" onSubmit={create}>
        <h3>Nuevo proyecto</h3>
        <div><label className="lbl" htmlFor="pt">Título</label><input id="pt" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: Estrategia de adaptación ASR" /></div>
        <div><label className="lbl" htmlFor="po">Objetivo de decisión</label><textarea id="po" value={objective} onChange={(e) => setObjective(e.target.value)} /></div>
        <div className="acts"><button className="btn primary" type="submit" disabled={busy}>Crear proyecto</button></div>
      </form>
      <div className="card form">
        <h3>Importar de la herramienta HTML</h3>
        <p className="muted" style={{ fontSize: 14 }}>Trae tu trabajo previo: sube el respaldo <b>.json</b> o el <b>.xlsx</b> que descargaste de MCDA_ASR_Harold.html. Se crean el proyecto, los expertos y todos los juicios.</p>
        <input ref={file} type="file" accept=".xlsx,.json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }} />
        <div className="acts"><button className="btn" type="button" disabled={busy} onClick={() => file.current?.click()}>Elegir archivo…</button></div>
      </div>
      {msg && <p className="err" role="alert">{msg}</p>}
    </div>
  );
}
