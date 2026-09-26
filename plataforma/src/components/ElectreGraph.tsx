'use client';

import { useId, useState } from 'react';

type Props = {
  names: string[];
  /** outranks[i][k] = true si la alternativa i supera a la k (ver electre.ts). */
  outranks: boolean[][];
  concordance: number[][];
  discordance: number[][];
  cStar: number;
  dStar: number;
  /** Modo informe/impresión: sin interacción ni leyenda de "toca una flecha"; el detalle numérico va en el texto del informe. */
  staticView?: boolean;
};

const W = 720;
const H = 380;
const CX = W / 2;
const CY = H / 2;
const R = 122;   // radio del círculo donde se ubican los nodos
const NODE = 22; // radio de cada nodo
const clip = (s: string, n = 22) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Grafo de superación de ELECTRE: un nodo por alternativa y una flecha i → k cuando i supera a k.
 * Flecha con punta en ambos extremos = se superan mutuamente (equivalentes con estos umbrales). Sin línea = incomparables.
 * Se dibuja en SVG propio (sin librería): con las pocas alternativas de un proyecto MCDA basta un círculo, y así las
 * cuerdas nunca atraviesan otro nodo. Nace de `electre()`, así que se redibuja solo cuando cambian c* o d*. */
export default function ElectreGraph({ names, outranks, concordance, discordance, cStar, dStar, staticView = false }: Props) {
  const uid = useId().replace(/:/g, '');
  const [active, setActive] = useState<[number, number] | null>(null);
  const n = names.length;
  if (n === 0) return null;

  const a0 = n === 2 ? Math.PI : -Math.PI / 2;
  const pos = names.map((_, i) => {
    const t = a0 + (2 * Math.PI * i) / n;
    return { x: CX + R * Math.cos(t), y: CY + R * Math.sin(t), c: Math.cos(t), s: Math.sin(t) };
  });
  const beats = (i: number, k: number) => !!outranks[i]?.[k];
  const inDeg = names.map((_, k) => names.filter((__, i) => i !== k && beats(i, k)).length);
  const outDeg = names.map((_, i) => names.filter((__, k) => i !== k && beats(i, k)).length);
  const kernel = names.map((_, i) => inDeg[i] === 0);
  const hasRelations = outDeg.some((d) => d > 0);
  const kernelCount = kernel.filter(Boolean).length;

  const edges: { i: number; k: number; both: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k < n; k++) {
      const ik = beats(i, k), ki = beats(k, i);
      if (ik && ki) edges.push({ i, k, both: true });
      else if (ik) edges.push({ i, k, both: false });
      else if (ki) edges.push({ i: k, k: i, both: false });
    }
  }

  const summary = hasRelations
    ? `Grafo de superación con ${n} alternativas. ${edges.filter((e) => !e.both).map((e) => `${names[e.i]} supera a ${names[e.k]}`).concat(edges.filter((e) => e.both).map((e) => `${names[e.i]} y ${names[e.k]} se superan mutuamente`)).join('. ')}.`
    : `Grafo de superación con ${n} alternativas: ninguna supera a otra con c* = ${cStar.toFixed(2)} y d* = ${dStar.toFixed(2)}.`;

  const activeKey = active ? `${active[0]}-${active[1]}` : null;
  const detail = (i: number, k: number) => (
    <>
      <b>{names[i]}</b> → <b>{names[k]}</b>: concordancia <b className="mono">{concordance[i]?.[k]?.toFixed(2)}</b> (≥ c* {cStar.toFixed(2)}) y discordancia <b className="mono">{discordance[i]?.[k]?.toFixed(2)}</b> (≤ d* {dStar.toFixed(2)})
    </>
  );
  const arrow = `url(#${uid}-a)`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} style={{ width: '100%', maxWidth: 720, display: 'block', margin: '0 auto' }}>
        <defs>
          <marker id={`${uid}-a`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--m-electre)" />
          </marker>
        </defs>

        {edges.map(({ i, k, both }) => {
          const dx = pos[k].x - pos[i].x, dy = pos[k].y - pos[i].y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len, uy = dy / len;
          const gap = NODE + 4;
          const x1 = pos[i].x + ux * gap, y1 = pos[i].y + uy * gap, x2 = pos[k].x - ux * gap, y2 = pos[k].y - uy * gap;
          const key = `${i}-${k}`;
          const on = activeKey === key;
          return (
            <g key={key}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--m-electre)" strokeWidth={on ? 3.5 : 2.2} strokeOpacity={activeKey && !on ? 0.35 : 1}
                markerEnd={arrow} markerStart={both ? arrow : undefined} />
              {!staticView && (
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={22} style={{ cursor: 'pointer' }}
                  tabIndex={0} role="button" aria-label={`${names[i]} ${both ? 'y ' + names[k] + ' se superan mutuamente' : 'supera a ' + names[k]}: ver concordancia y discordancia`}
                  onMouseEnter={() => setActive([i, k])} onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive([i, k])} onBlur={() => setActive(null)}
                  onClick={() => setActive(on ? null : [i, k])}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(on ? null : [i, k]); } }} />
              )}
            </g>
          );
        })}

        {names.map((nm, i) => {
          const p = pos[i];
          const anchor = p.c > 0.3 ? 'start' : p.c < -0.3 ? 'end' : 'middle';
          const lx = p.x + p.c * (NODE + 10) + (anchor === 'middle' ? 0 : p.c > 0 ? 2 : -2);
          const ly = anchor === 'middle' ? p.y + p.s * (NODE + 18) + (p.s > 0 ? 4 : 0) : p.y + 4;
          const k = hasRelations && kernel[i] && kernelCount === 1;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={NODE} fill="var(--surface2)" stroke={k ? 'var(--pass)' : 'var(--m-electre)'} strokeWidth={k ? 3.5 : 2} />
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)" className="mono">{i + 1}</text>
              <text x={lx} y={ly} textAnchor={anchor} fontSize="13.5" fontWeight={k ? 700 : 500} fill="var(--ink)">
                <title>{nm}</title>
                {clip(nm)}{k ? ' ✓' : ''}
              </text>
            </g>
          );
        })}

        {!hasRelations && (
          <text x={CX} y={CY + 4} textAnchor="middle" fontSize="12.5" fill="var(--muted)">Sin flechas: ninguna supera a otra con estos umbrales</text>
        )}
      </svg>

      {!staticView && (
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 0', minHeight: 20, textAlign: 'center' }} aria-live="polite">
          {active
            ? (() => {
                const [i, k] = active;
                return beats(i, k) && beats(k, i) ? <>{detail(i, k)}<br />{detail(k, i)}</> : detail(i, k);
              })()
            : hasRelations ? 'Toca o pasa el cursor sobre una flecha para ver su concordancia y discordancia.' : ''}
        </p>
      )}
      <p className="muted" style={{ fontSize: 12.5, margin: '6px 0 0', textAlign: 'center' }}>
        <b style={{ color: 'var(--m-electre)' }}>A → B</b> = A supera a B · <b style={{ color: 'var(--m-electre)' }}>A ↔ B</b> = se superan mutuamente · sin línea = incomparables{hasRelations && kernelCount === 1 ? ' · ✓ = nadie la supera' : ''}
      </p>
    </div>
  );
}
