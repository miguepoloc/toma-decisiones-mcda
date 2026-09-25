'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { analyze, fmt } from '@/lib/ahp';

/** «La matriz que no cierra»: el 404 como un juicio AHP intransitivo. Tres destinos (Inicio, Proyectos,
 * Método) comparados por pares forman un ciclo —A>B, B>C, C>A— y la matriz sale inconsistente (CR ≫ 0.10),
 * calculada con el mismo `analyze` que usa la plataforma. El botón cambia el último juicio a lo transitivo
 * (A>C) y la matriz cierra con CR = 0. */

const DEST = [
  { short: 'Inicio', name: 'Inicio', href: '/' },
  { short: 'Proyectos', name: 'Mis proyectos', href: '/dashboard' },
  { short: 'Método', name: '¿Qué método uso?', href: '/metodo' },
];
const LETTER = ['A', 'B', 'C'];

// a13 y a31 son lo único que cambia al corregir el juicio C→A.
const CYCLE = [[1, 3, 1 / 3], [1 / 3, 1, 3], [3, 1 / 3, 1]];
const FIXED = [[1, 3, 9], [1 / 3, 1, 3], [1 / 9, 1 / 3, 1]];
const CR_SCALE = 1.2;

// Geometría del anillo (viewBox 100): nodos a -90°, 30° y 150° sobre R=36.
const R = 36;
const NODE_ANGLES = [-90, 30, 150];
const pt = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [50 + R * Math.cos(a), 50 + R * Math.sin(a)] as const;
};
const arc = (from: number, to: number, sweep: 0 | 1) => {
  const [x1, y1] = pt(from);
  const [x2, y2] = pt(to);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${R} ${R} 0 0 ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};
const GAP = 21;
const [a0, a1, a2] = NODE_ANGLES;
const ARC_AB = arc(a0 + GAP, a1 - GAP, 1);
const ARC_BC = arc(a1 + GAP, a2 - GAP, 1);
const ARC_CA = arc(a2 + GAP, a0 + 360 - GAP, 1);
const ARC_AC = arc(a0 + 360 - GAP, a2 + GAP, 0);

export default function NotFoundScene() {
  const [fixed, setFixed] = useState(false);
  const rawPath = usePathname() ?? '';
  let path = rawPath;
  try { path = decodeURIComponent(rawPath); } catch { /* ruta con % mal formado: se muestra tal cual */ }

  const M = fixed ? FIXED : CYCLE;
  const an = analyze(M);
  const crText = an.cr.toFixed(3);
  const top = an.w.indexOf(Math.max(...an.w));

  return (
    <div className={'nf' + (fixed ? ' is-ok' : ' is-bad')}>
      <div className="nf-hero">
        <div className="nf-copy">
          <div className="eyebrow">Error 404 · Juicio inconsistente</div>

          <div className="nf-code" role="img" aria-label="Error 404">
            <span aria-hidden="true">4</span>
            <svg className="nf-ring" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <marker id="nf-arrow" viewBox="0 0 10 10" refX="6.5" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse">
                  <path d="M0 0.5L9 5L0 9.5Z" fill="currentColor" />
                </marker>
              </defs>
              <circle className="nf-orbit" cx="50" cy="50" r={R} />
              <g className="nf-arcs">
                <path d={ARC_AB} markerEnd="url(#nf-arrow)" />
                <path d={ARC_BC} markerEnd="url(#nf-arrow)" />
                <path className="nf-ca" d={ARC_CA} markerEnd="url(#nf-arrow)" />
                <path className="nf-ac" d={ARC_AC} markerEnd="url(#nf-arrow)" />
              </g>
              {NODE_ANGLES.map((deg, i) => {
                const [x, y] = pt(deg);
                return (
                  <g key={i} className="nf-node">
                    <circle cx={x} cy={y} r="9.5" />
                    <text x={x} y={y} textAnchor="middle" dominantBaseline="central">{LETTER[i]}</text>
                  </g>
                );
              })}
            </svg>
            <span aria-hidden="true">4</span>
          </div>

          <h1>Esta ruta no cierra la matriz.</h1>
          <p className="nf-lead">
            {fixed
              ? 'Corregido el último juicio, la matriz cierra: CR = 0. La página sigue sin existir, pero ahora al menos sabemos por dónde seguir: empieza por el inicio.'
              : 'Comparamos esta dirección con todo lo que conocemos y salió un círculo: Inicio le gana a Proyectos, Proyectos le gana a Método y Método le gana a Inicio. Con juicios así no hay prioridades, ni Saaty te sacaría de aquí.'}
          </p>

          <div className="nf-path">
            <span className="nf-path-k">Buscaste</span>
            <code title={path}>{path || '/'}</code>
          </div>

          <div className="acts nf-acts">
            <Link className="btn primary nf-btn" href="/">Volver al inicio</Link>
            <Link className="btn nf-btn" href="/dashboard">Mis proyectos</Link>
            <Link className="btn nf-btn" href="/metodo">¿Qué método uso?</Link>
          </div>
        </div>

        <section className="nf-card" aria-labelledby="nf-card-t">
          <div className="nf-card-h">
            <span className="tag">Comparación por pares</span>
            <h2 id="nf-card-t">¿A dónde ir desde aquí?</h2>
          </div>

          <table className="nf-mx">
            <caption className="nf-sr">Matriz de comparación por pares entre tres destinos</caption>
            <thead>
              <tr>
                <td />
                {DEST.map((d, j) => <th key={j} scope="col">{d.short}</th>)}
              </tr>
            </thead>
            <tbody>
              {M.map((row, i) => (
                <tr key={i}>
                  <th scope="row">{DEST[i].short}</th>
                  {row.map((v, j) => {
                    const changed = (i === 0 && j === 2) || (i === 2 && j === 0);
                    return (
                      <td key={j} className={(i === j ? 'diag ' : v > 1 ? 'win ' : '') + (changed ? 'chg' : '')}>
                        {fmt(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="nf-cr">
            <div className="nf-cr-row">
              <span>Razón de consistencia</span>
              <b className="mono">CR = {crText}</b>
            </div>
            <div className="nf-gauge" aria-hidden="true">
              <div className="nf-gauge-fill" style={{ transform: `scaleX(${Math.max(an.cr / CR_SCALE, 0.012)})` }} />
              <div className="nf-gauge-mark" style={{ left: `${(0.1 / CR_SCALE) * 100}%` }} />
            </div>
            <div className="nf-cr-scale mono" aria-hidden="true">
              <span style={{ left: `${(0.1 / CR_SCALE) * 100}%` }}>umbral 0.10</span>
            </div>
            <div className="nf-status" role="status" aria-live="polite">
              {fixed ? (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M4.8 8.2l2.2 2.2 4.2-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              )}
              <span>{fixed ? 'Consistente · CR < 0.10' : 'Inconsistente · CR ≥ 0.10, hay que revisar los juicios'}</span>
            </div>
          </div>

          <div className="nf-w">
            <div className="nf-w-h">Prioridad de cada destino</div>
            {DEST.map((d, i) => (
              <div key={d.href} className="nf-w-row">
                <span className="nf-w-n">{d.name}</span>
                <div className="nf-w-track" aria-hidden="true">
                  <div className={'nf-w-fill' + (fixed && i === top ? ' top' : '')} style={{ transform: `scaleX(${an.w[i]})` }} />
                </div>
                <span className="mono nf-w-v">{an.w[i].toFixed(3)}</span>
              </div>
            ))}
            <p className="nf-w-note">
              {fixed ? `«${DEST[top].name}» encabeza la prioridad: es el mejor punto de partida.` : 'Empate perfecto: nadie gana, así que no hay a dónde ir.'}
            </p>
          </div>

          <button type="button" className="btn nf-fix" aria-pressed={fixed} onClick={() => setFixed((f) => !f)}>
            {fixed ? 'Deshacer la corrección' : 'Corregir el juicio C → A'}
          </button>
        </section>
      </div>
    </div>
  );
}
