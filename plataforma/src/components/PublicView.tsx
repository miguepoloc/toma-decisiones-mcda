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
      <div className="topbar">
        <Link className="brand" href="/" title="Plataforma MCDA · Inicio">
          <Logo size={26} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.2 }}>
              <span>Plataforma MCDA</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--f-mono)', padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', color: 'var(--muted)' }}>PÚBLICO</span>
            </div>
            <span className="brand-sub">Vista de Resultados</span>
          </div>
        </Link>
        <span className="muted" style={{ fontSize: 13, background: 'var(--surface2)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
          Vista pública de solo lectura
        </span>
      </div>
      <div className="panel">
        <header>
          <div className="eyebrow">Resultados {(data.project.method ?? 'ahp').toUpperCase()}</div>
          <h1 style={{ fontSize: 30 }}>{data.project.title}</h1>
          {data.project.objective && <p className="muted" style={{ maxWidth: '70ch' }}><b>Objetivo:</b> {data.project.objective}</p>}
        </header>
        <Results
          criteria={data.project.criteria}
          alternatives={data.project.alternatives}
          experts={data.experts}
          judgments={data.judgments}
          method={data.project.method}
          weightingMethod={data.project.weighting_method ?? 'ahp'}
          decisionMatrix={data.project.decision_matrix}
          projectTitle={data.project.title}
          projectObjective={data.project.objective}
        />
      </div>
    </div>
  );
}
