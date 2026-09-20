'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Row = { id: string; title: string; objective: string; is_public: boolean };

export default function ProjectList({ initial }: { initial: Row[] }) {
  const [projects, setProjects] = useState(initial);
  const [pendDel, setPendDel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  async function remove(id: string) {
    const { error } = await createClient().from('projects').delete().eq('id', id);
    if (error) { setMsg(error.message); return; }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }
  function twoClick(id: string) {
    if (pendDel !== id) { setPendDel(id); setTimeout(() => setPendDel((p) => (p === id ? null : p)), 4000); return; }
    setPendDel(null);
    void remove(id);
  }

  if (!projects.length) {
    return <div className="card muted">Aún no tienes proyectos. Crea el primero o importa tu trabajo de la herramienta HTML.</div>;
  }

  return (
    <div className="plist">
      {msg && <p className="err" role="alert">{msg}</p>}
      {projects.map((p) => (
        <div className="prow" key={p.id}>
          <Link href={`/projects/${p.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
            <b>{p.title}</b><br />
            <span className="muted" style={{ fontSize: 13 }}>{p.objective ? p.objective.slice(0, 110) : 'Sin objetivo todavía'}</span>
          </Link>
          <span className={'pill ' + (p.is_public ? '' : 'neutral')}>{p.is_public ? 'Público con enlace' : 'Privado'}</span>
          <button
            type="button"
            className={'btn icon sm' + (pendDel === p.id ? ' danger' : '')}
            aria-label={`Eliminar «${p.title}»`}
            onClick={() => twoClick(p.id)}
          >
            {pendDel === p.id ? '¿Seguro? Se pierde todo' : '✕'}
          </button>
        </div>
      ))}
    </div>
  );
}
