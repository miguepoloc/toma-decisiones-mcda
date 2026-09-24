'use client';

import { useMemo } from 'react';
import type { Alternative, Criterion, DecisionMatrix } from '@/lib/types';
import { vikorFirstPlaceChanges, vikorInputs, vikorSensitivity, type VikorSynth } from '@/lib/vikor';

/**
 * Todo lo específico de VIKOR que no es "una lista ordenada": el selector de v, las 2 condiciones de
 * Opricovic & Tzeng (2004) para declarar un ganador único, y la sensibilidad del ranking a v (tabla +
 * gráfica). Espeja las diapositivas 22-29 y 47 de la Sesión 3 del curso (sesiones/sesion-03).
 *
 * v NO sale de los datos: lo elige quien decide (Alidrisi 2021: v > 0.5 privilegia el promedio S,
 * v < 0.5 evitar fallas graves R, y "usualmente" v = 0.5 como consenso). Ninguna fuente lo justifica
 * más que como convención, y este panel lo dice explícitamente.
 */

const PRESETS: { v: number; label: string; hint: string }[] = [
  { v: 0.25, label: '0.25', hint: 'prima no fallar (R)' },
  { v: 0.5, label: '0.5', hint: 'consenso (convención)' },
  { v: 0.75, label: '0.75', hint: 'prima el promedio (S)' },
];

const same = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const colorOf = (i: number) => `var(--s${(i % 5) + 1})`;

type Props = {
  criteria: Criterion[];
  alternatives: Alternative[];
  dm: DecisionMatrix;
  weights: number[];
  synth: VikorSynth;
  v: number;
  onChangeV: (v: number) => void;
  /** true = el dueño del proyecto (v se guarda); false = vista pública/de solo lectura (v solo en pantalla). */
  persisted: boolean;
};

export default function VikorPanel({ criteria, alternatives, dm, weights, synth, v, onChangeV, persisted }: Props) {
  const names = alternatives.map((a) => a.name);
  const { matrix, types } = useMemo(() => vikorInputs(criteria, alternatives, dm), [criteria, alternatives, dm]);

  const breaks = useMemo(() => (synth.tie ? [] : vikorFirstPlaceChanges(matrix, weights, types)), [synth.tie, matrix, weights, types]);
  const vs = useMemo(() => {
    const all = [0, 0.25, 0.5, 0.75, 1, v, ...breaks.map((b) => b.v)];
    const sorted = [...all].sort((a, b) => a - b);
    return sorted.filter((x, i) => i === 0 || !same(x, sorted[i - 1]));
  }, [v, breaks]);
  const rows = useMemo(() => vikorSensitivity(matrix, weights, types, vs), [matrix, weights, types, vs]);

  // Curvas para la gráfica: Q es una recta en v, con 2 puntos alcanza (v = 0 y v = 1)
  const ends = useMemo(() => vikorSensitivity(matrix, weights, types, [0, 1]), [matrix, weights, types]);

  const verdict = synth.verdict;
  const setNames = verdict ? verdict.set.map((i) => names[i]) : [];
  const firstChanges = breaks.map((b) => ({ ...b, fromName: names[b.from], toName: names[b.to] }));
  const winnerRobust = breaks.length === 0;

  return (
    <>
      {/* ---------- Selector de v ---------- */}
      <div className="card">
        <div className="eyebrow">Parámetro v de VIKOR</div>
        <h3 style={{ margin: '4px 0 6px' }}>v = {v.toFixed(2)} <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>· peso de S (promedio) frente a R (peor criterio)</span></h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="range" min="0" max="1" step="0.05" value={v} aria-label="Valor de v"
            onChange={(e) => onChangeV(Math.round(parseFloat(e.target.value) * 100) / 100)}
            style={{ flex: '1 1 260px', accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <div className="chips" style={{ margin: 0 }}>
            {PRESETS.map((p) => (
              <button key={p.v} type="button" className="btn sm" aria-pressed={same(v, p.v)} title={p.hint}
                style={same(v, p.v) ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
                onClick={() => onChangeV(p.v)}>{p.label}</button>
            ))}
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: '10px 0 0', maxWidth: '78ch' }}>
          <b>v no se calcula a partir de los datos: lo elige quien decide.</b> v &gt; 0.5 favorece a quien rinde bien en promedio (S);
          v &lt; 0.5, a quien no falla gravemente en ningún criterio (R). 0.5 es la convención de «consenso» (Alidrisi, 2021) y el valor por defecto de
          pyDecision y de esta plataforma, no un resultado justificado. Por eso abajo se ve cuánto depende el ranking de haberlo elegido.
          {persisted
            ? ' Se guarda con el proyecto y lo ven quienes abran el enlace público.'
            : ' Aquí solo cambia en tu pantalla: no modifica el proyecto.'}
        </p>
      </div>

      {/* ---------- Veredicto: ¿ganador único o conjunto de compromiso? ---------- */}
      {verdict && (
        <div className="card">
          <div className="eyebrow">¿Hay un ganador único? Condiciones de Opricovic &amp; Tzeng (2004)</div>
          <p style={{ margin: '6px 0 10px', fontSize: 15 }}>
            {verdict.kind === 'unique' && <>Sí: <b>{setNames[0]}</b> cumple las dos condiciones, es ganador único con v = {v.toFixed(2)}.</>}
            {verdict.kind === 'two' && <>No hay ganador único: falla la condición 2 (estabilidad). VIKOR propone <b>{setNames.join(' y ')}</b>.</>}
            {verdict.kind === 'set' && <>No hay ganador único: falla la condición 1 (ventaja aceptable). Conjunto de compromiso: <b>{setNames.join(', ')}</b>.</>}
          </p>
          <div className="tbl">
            <table>
              <tbody>
                <tr>
                  <td><b>Condición 1, ventaja aceptable</b><br /><span className="muted" style={{ fontSize: 12.5 }}>Q(2º) − Q(1º) ≥ DQ = 1/(m − 1), con m = {verdict.m} alternativas</span></td>
                  <td className="n mono">{verdict.deltaQ.toFixed(3)} {verdict.c1 ? '≥' : '<'} {verdict.dq.toFixed(3)}</td>
                  <td className="n" style={{ color: verdict.c1 ? 'var(--pass)' : 'var(--warn)', fontWeight: 700 }}>{verdict.c1 ? '✓ se cumple' : '✗ no se cumple'}</td>
                </tr>
                <tr>
                  <td><b>Condición 2, estabilidad</b><br /><span className="muted" style={{ fontSize: 12.5 }}>El 1º por Q también es el mejor en S y/o en R</span></td>
                  <td className="n mono">mejor S: {verdict.bestS.map((i) => names[i]).join(', ')}<br />mejor R: {verdict.bestR.map((i) => names[i]).join(', ')}</td>
                  <td className="n" style={{ color: verdict.c2 ? 'var(--pass)' : 'var(--warn)', fontWeight: 700 }}>{verdict.c2 ? '✓ se cumple' : '✗ no se cumple'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
            Si falla solo la 2, se proponen el 1º y el 2º; si falla la 1, todas las alternativas cuyo Q quede a menos de DQ del 1º. Un conjunto grande no es un error: significa que los datos no separan a un ganador.
          </p>
        </div>
      )}

      {/* ---------- Sensibilidad a v: tabla + gráfica ---------- */}
      {!synth.tie && (
        <div className="card">
          <div className="eyebrow">Sensibilidad del ranking a v</div>
          <h3 style={{ margin: '4px 0 6px' }}>
            {winnerRobust ? `${names[synth.order[0]]} es 1º con cualquier v` : 'El 1er lugar depende de v'}
          </h3>
          <p className="muted" style={{ fontSize: 13, margin: '0 0 10px', maxWidth: '78ch' }}>
            {winnerRobust
              ? 'Mismos datos y pesos, solo cambia v de 0 a 1: el ganador no cambia, así que la elección de v no decide el resultado (aunque el 2º lugar sí puede cambiar).'
              : firstChanges.map((c) => `Con v = ${c.v.toFixed(2)} el 1er lugar pasa de ${c.fromName} a ${c.toName}.`).join(' ') + ' El ganador depende de haber elegido v: dilo en el informe y presenta las alternativas que se disputan el 1º.'}
          </p>

          <div className="tbl">
            <table>
              <thead>
                <tr><th className="n">v</th>{names.map((n) => <th key={n} className="n">Q {n}</th>)}<th>Ranking (1º primero)</th><th>Veredicto</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cur = same(row.v, v);
                  const isBreak = breaks.some((b) => same(b.v, row.v));
                  const top = Math.min(...row.q);
                  return (
                    <tr key={row.v} style={cur ? { background: 'color-mix(in srgb, var(--accent) 10%, transparent)' } : undefined}>
                      <td className="n mono" style={{ fontWeight: cur ? 700 : 500 }}>
                        {row.v.toFixed(2)}{cur ? ' ◀' : ''}{isBreak ? ' ⇄' : ''}
                      </td>
                      {row.q.map((q, i) => (
                        <td key={i} className="n mono" style={Math.abs(q - top) < 1e-9 ? { fontWeight: 700, color: 'var(--pass)' } : undefined}>{q.toFixed(3)}</td>
                      ))}
                      <td style={{ fontSize: 13 }}>{row.order.map((i) => names[i]).join(' › ')}</td>
                      <td style={{ fontSize: 12.5 }}>
                        {row.verdict
                          ? row.verdict.kind === 'unique' ? <span style={{ color: 'var(--pass)' }}>Ganador único</span> : <span style={{ color: 'var(--warn)' }}>Conjunto de {row.verdict.set.length}</span>
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>◀ v actual · ⇄ v donde cambia el 1er lugar · en verde, el Q más bajo (el 1º) de cada fila.</p>

          <QvsV names={names} ends={ends} v={v} breaks={firstChanges.map((c) => c.v)} />
        </div>
      )}
    </>
  );
}

/** Gráfica de Q según v: una recta por alternativa (Q es lineal en v), en SVG puro sin librerías. */
function QvsV({ names, ends, v, breaks }: { names: string[]; ends: { q: number[] }[]; v: number; breaks: number[] }) {
  const W = 640, H = 300, L = 46, R = 130, T = 18, B = 42;
  const x = (val: number) => L + val * (W - L - R);
  const y = (q: number) => T + (1 - q) * (H - T - B);
  const q0 = ends[0].q, q1 = ends[1].q;
  const at = (i: number, val: number) => q0[i] + (q1[i] - q0[i]) * val;
  // rótulos directos al final de cada línea, de arriba hacia abajo y separados para que no se pisen
  const top = [...names.keys()].sort((a, b) => y(q1[a]) - y(q1[b]));
  const ly: number[] = [];
  top.forEach((i, k) => { ly[i] = k === 0 ? y(q1[i]) : Math.max(y(q1[i]), ly[top[k - 1]] + 15); });
  const summary = `Q de cada alternativa según v de 0 a 1. ${names.map((n, i) => `${n}: ${q0[i].toFixed(2)} con v=0 y ${q1[i].toFixed(2)} con v=1`).join('; ')}.`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} style={{ width: '100%', maxWidth: 720, marginTop: 14, display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={'gy' + t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="3 4" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{t.toFixed(2)}</text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={'gx' + t}>
          <line x1={x(t)} x2={x(t)} y1={y(1)} y2={y(0)} stroke="var(--line)" strokeDasharray="3 4" />
          <text x={x(t)} y={H - B + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">{t.toFixed(2)}</text>
        </g>
      ))}
      <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="var(--muted)">v (peso de S; 1 − v = peso de R)</text>
      <text x={12} y={(T + H - B) / 2} textAnchor="middle" fontSize="12" fill="var(--muted)" transform={`rotate(-90 12 ${(T + H - B) / 2})`}>Q (menor es mejor)</text>
      {/* v actual */}
      <line x1={x(v)} x2={x(v)} y1={y(1)} y2={y(0)} stroke="var(--accent)" strokeWidth="1.6" strokeDasharray="5 4" />
      <text x={x(v)} y={T - 5} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--accent)">v = {v.toFixed(2)}</text>
      {names.map((n, i) => (
        <g key={n + i}>
          <line x1={x(0)} y1={y(q0[i])} x2={x(1)} y2={y(q1[i])} stroke={colorOf(i)} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx={x(v)} cy={y(at(i, v))} r="4.5" fill={colorOf(i)} stroke="var(--surface)" strokeWidth="1.5" />
          <text x={x(1) + 8} y={ly[i] + 4} fontSize="12.5" fontWeight="700" fill={colorOf(i)}>{n.length > 16 ? n.slice(0, 15) + '…' : n}</text>
        </g>
      ))}
      {breaks.map((b) => {
        const qv = Math.min(...names.map((_, i) => at(i, b)));
        return <circle key={b} cx={x(b)} cy={y(qv)} r="8" fill="none" stroke="var(--ink)" strokeWidth="2" />;
      })}
    </svg>
  );
}

