'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PublicGet } from '@/lib/types';
import Results from './Results';
import Logo from './Logo';

export default function PublicView({ token }: { token: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<PublicGet | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    supabase.rpc('public_get', { p_token: token }).then(({ data: d, error }) => {
      if (alive) setData(error || !d ? null : (d as PublicGet));
    });
    return () => { alive = false; };
  }, [supabase, token]);

  if (data === undefined) return <div className="wrap"><p className="muted">Cargando…</p></div>;
  if (data === null) {
    return (
      <div className="wrap"><div className="hero"><h1>Este contenido no está disponible</h1>
        <p className="muted">El enlace no existe o su autor lo volvió privado.</p></div></div>
    );
  }
  return (
    <div className="wrap">
      <div className="topbar"><Link className="brand" href="/"><Logo />Plataforma MCDA</Link><span className="muted" style={{ fontSize: 13 }}>Vista pública de solo lectura</span></div>
      <div className="panel">
        <header>
          <div className="eyebrow">Resultados AHP</div>
          <h1 style={{ fontSize: 30 }}>{data.project.title}</h1>
          {data.project.objective && <p className="muted" style={{ maxWidth: '70ch' }}><b>Objetivo:</b> {data.project.objective}</p>}
        </header>
        <Results criteria={data.project.criteria} alternatives={data.project.alternatives} experts={data.experts} judgments={data.judgments} method={data.project.method} decisionMatrix={data.project.decision_matrix} />
      </div>
    </div>
  );
}
