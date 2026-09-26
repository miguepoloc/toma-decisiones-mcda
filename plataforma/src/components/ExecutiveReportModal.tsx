'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type { Criterion, Alternative, DecisionMatrix } from '@/lib/types';
import ElectreGraph from './ElectreGraph';
import ClosenessBars from './ClosenessBars';
import VikorSensitivityChart from './VikorSensitivityChart';
import { METHOD_SPECS, type MethodKey } from './ScientificMethodModal';
import { getCell, getKind, getTarget } from '@/lib/topsis';

/** Colores del informe: el modal es siempre blanco (también en impresión), pero los gráficos leen las variables del tema de la app;
 * en modo oscuro `--ink` sería casi blanco sobre papel blanco. Se redefinen aquí en claro, con los tonos de método oscurecidos
 * (el cian de TOPSIS y el ámbar de ELECTRE de la app casi no se ven sobre blanco). */
const REPORT_VARS = {
  '--ink': '#0F172A', '--muted': '#475569', '--line': '#CBD5E1', '--surface': '#FFFFFF', '--surface2': '#F1F5F9',
  '--pass': '#059669', '--accent': '#0284C7',
  '--s1': '#2563EB', '--s2': '#EA580C', '--s3': '#059669', '--s4': '#A16207', '--s5': '#DB2777',
  '--m-topsis': '#0891B2', '--m-vikor': '#059669', '--m-electre': '#B45309',
} as CSSProperties;

interface ExecutiveReportModalProps {
  projectTitle: string;
  projectObjective: string;
  method: MethodKey;
  criteria: Criterion[];
  alternatives: Alternative[];
  decisionMatrix: DecisionMatrix;
  weights: number[];
  rankingRows: { name: string; score: number; rank: number }[];
  /** Solo VIKOR: v usado (se declara en el informe, no sale de los datos). */
  vikorV?: number;
  /** Solo VIKOR: conjunto de compromiso cuando NO hay ganador único (falla C1 o C2 de Opricovic & Tzeng 2004). */
  compromiseSet?: string[];
  /** Solo VIKOR: datos de la gráfica Q vs v (rectas en v = 0 y v = 1) y los v donde cambia el 1er lugar. Sin él no se dibuja. */
  vikorChart?: { names: string[]; ends: { q: number[] }[]; breaks: { v: number; from: string; to: string }[] };
  /** Solo ELECTRE: relación de superación. ELECTRE no da ranking total, así que en vez de `rankingRows` el informe usa esto. */
  electre?: { names: string[]; outranks: boolean[][]; concordance: number[][]; discordance: number[][]; cStar: number; dStar: number };
  onClose: () => void;
}

export default function ExecutiveReportModal({
  projectTitle,
  projectObjective,
  method,
  criteria,
  alternatives,
  decisionMatrix,
  weights,
  rankingRows,
  vikorV,
  compromiseSet,
  vikorChart,
  electre,
  onClose,
}: ExecutiveReportModalProps) {
  const methodDoc = METHOD_SPECS[method] || METHOD_SPECS.topsis;
  const winner = rankingRows.find((r) => r.rank === 1) || rankingRows[0];
  const currentDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // ELECTRE: pares con relación, incomparables y núcleo (las que nadie supera). Se derivan de la misma matriz `outranks` del grafo.
  const el = electre && (() => {
    const n = electre.names.length;
    const rels: { i: number; k: number }[] = [];
    const incomparable: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < n; k++) if (i !== k && electre.outranks[i]?.[k]) rels.push({ i, k });
      for (let k = i + 1; k < n; k++) if (!electre.outranks[i]?.[k] && !electre.outranks[k]?.[i]) incomparable.push([i, k]);
    }
    const kernel = electre.names.filter((_, k) => !rels.some((r) => r.k === k));
    return { rels, incomparable, kernel };
  })();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 14, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="executive-report-container"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exec-report-title"
        tabIndex={-1}
        style={{
          background: '#FFFFFF',
          color: '#0F172A',
          borderRadius: 12,
          maxWidth: 860,
          width: '100%',
          maxHeight: '94vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
          padding: '36px 44px',
          display: 'grid',
          gap: 24,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: 1.5,
          ...REPORT_VARS,
        }}
      >
        {/* Acciones Superiores (Solo en pantalla, oculto en impresión) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, background: '#0284C7', color: '#FFF', padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
              REPORTE OFICIAL
            </span>
            <span style={{ fontSize: 13, color: '#64748B' }}>Vista previa de impresión académica</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Imprimir / Guardar como PDF 🖨️
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                color: '#475569',
                padding: '8px 14px',
                borderRadius: 6,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cerrar ✕
            </button>
          </div>
        </div>

        {/* Membrete Institucional */}
        <div style={{ borderBottom: '2px solid #0F172A', paddingBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0284C7' }}>
                Universidad del Magdalena · Facultad de Ingeniería
              </div>
              <h1 id="exec-report-title" style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 2px', color: '#0F172A' }}>
                Dictamen Ejecutivo de Decisión Multicriterio (MCDA)
              </h1>
              <div style={{ fontSize: 13, color: '#64748B' }}>
                Maestría en Ingeniería · Toma de Decisiones y Optimización
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
              <div>Fecha: <b>{currentDate}</b></div>
              <div>Algoritmo: <b>{method.toUpperCase()}</b></div>
            </div>
          </div>
        </div>

        {/* Resumen del Problema y Caso de Estudio */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, background: '#F8FAFC', padding: '14px 18px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Proyecto</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{projectTitle}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Objetivo Estratégico</div>
            <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{projectObjective || 'Selección óptima bajo criterios múltiples'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Dimensión</div>
            <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>
              {alternatives.length} Alternativas × {criteria.length} Criterios
            </div>
          </div>
        </div>

        {/* Dictamen y Alternativa Ganadora */}
        {el && electre ? (
          el.rels.length > 0 && el.kernel.length === 1 ? (
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderLeft: '5px solid #16A34A', borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#15803D', letterSpacing: '0.06em' }}>
                Alternativa no superada (núcleo de la relación)
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#14532D' }}>{el.kernel[0]}</span>
              </div>
              <p style={{ fontSize: 13, color: '#166534', margin: '6px 0 0' }}>
                Con c* = {electre.cStar.toFixed(2)} y d* = {electre.dStar.toFixed(2)}, ninguna otra alternativa supera a esta según <b>{methodDoc.name}</b>. No es un puntaje: ELECTRE no produce un orden total, solo una relación de superación.
              </p>
            </div>
          ) : (
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderLeft: '5px solid #D97706', borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#B45309', letterSpacing: '0.06em' }}>
                Sin ganador único
              </div>
              <p style={{ fontSize: 13, color: '#92400E', margin: '6px 0 0' }}>
                {el.rels.length === 0
                  ? <>Con c* = {electre.cStar.toFixed(2)} y d* = {electre.dStar.toFixed(2)} ninguna alternativa supera a otra: los datos no alcanzan para preferir una sobre otra con estos umbrales.</>
                  : el.kernel.length > 1
                    ? <>Con c* = {electre.cStar.toFixed(2)} y d* = {electre.dStar.toFixed(2)}, ninguna de estas alternativas es superada por otra: <b>{el.kernel.join(', ')}</b>. Son incomparables entre sí o se disputan el primer lugar.</>
                    : <>Con c* = {electre.cStar.toFixed(2)} y d* = {electre.dStar.toFixed(2)} todas las alternativas son superadas por alguna otra (ciclo de superación), así que no hay una no superada.</>}
              </p>
            </div>
          )
        ) : winner && compromiseSet && compromiseSet.length > 1 ? (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderLeft: '5px solid #D97706', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#B45309', letterSpacing: '0.06em' }}>
              Conjunto de compromiso (sin ganador único)
            </div>
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#78350F' }}>{compromiseSet.join(', ')}</span>
            </div>
            <p style={{ fontSize: 13, color: '#92400E', margin: '6px 0 0' }}>
              Según <b>{methodDoc.name}</b>, ninguna alternativa cumple a la vez las condiciones de ventaja aceptable y estabilidad (Opricovic &amp; Tzeng, 2004), así que se recomienda considerar estas alternativas en conjunto. La de menor Q es <b>{winner.name}</b> ({winner.score.toFixed(4)}), pero no es un ganador único.
            </p>
          </div>
        ) : winner && (
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderLeft: '5px solid #16A34A', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#16A34A', letterSpacing: '0.06em' }}>
              Alternativa Seleccionada (Recomendación Óptima)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#14532D' }}>{winner.name}</span>
              <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#15803D' }}>
                (Puntaje de desempeño: {winner.score.toFixed(4)})
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#166534', margin: '6px 0 0' }}>
              De acuerdo con la síntesis matemática del método <b>{methodDoc.name}</b>, esta alternativa representa el compromiso más favorable frente al vector de preferencias establecido.
            </p>
          </div>
        )}
        {vikorV != null && (
          <p style={{ fontSize: 12.5, color: '#475569', margin: 0 }}>
            <b>Parámetro v de VIKOR = {vikorV.toFixed(2)}.</b> No se deriva de los datos: lo fija quien decide (0.5 = «consenso», convención). El ranking puede cambiar con otros valores de v; ver la sensibilidad en la plataforma.
          </p>
        )}

        {electre && (
          <p style={{ fontSize: 12.5, color: '#475569', margin: 0 }}>
            <b>Umbrales de ELECTRE: c* = {electre.cStar.toFixed(2)} (concordancia mínima), d* = {electre.dStar.toFixed(2)} (discordancia máxima).</b> No se derivan de los datos: los fija quien decide, y con otros valores cambian las relaciones y los pares incomparables (convención del curso: c* = 0.65, d* = 0.30).
          </p>
        )}

        {/* Sección 1: Ponderación de Criterios */}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 4 }}>
            1. Ponderación de Criterios ({criteria.length})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '2px solid #CBD5E1' }}>
                <th style={{ padding: '8px 10px' }}>Criterio</th>
                <th style={{ padding: '8px 10px' }}>Regla de Decisión</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Peso Obtenido (w_j)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Porcentaje Relativo</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c, i) => {
                const w = weights[i] ?? 0;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '8px 10px', color: '#64748B' }}>
                      {(() => {
                        const k = getKind(decisionMatrix, c.id), t = getTarget(decisionMatrix, c.id);
                        return k === 'min' ? 'Minimizar (Costo)' : k === 'target' ? (t ? `Objetivo ${t.value}${t.tol ? ` ± ${t.tol}` : ''} (minimizar la distancia)` : 'Objetivo (sin valor definido)') : 'Maximizar (Beneficio)';
                      })()}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{w.toFixed(4)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0284C7', fontFamily: 'monospace' }}>
                      {(w * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Sección 2: Matriz de Desempeño */}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 4 }}>
            2. Matriz de Decisión Cuantitativa
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '2px solid #CBD5E1' }}>
                  <th style={{ padding: '6px 8px' }}>Alternativa</th>
                  {criteria.map((c) => (
                    <th key={c.id} style={{ padding: '6px 8px', textAlign: 'right' }}>
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alternatives.map((alt) => (
                  <tr key={alt.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{alt.name}</td>
                    {criteria.map((c) => {
                      const val = getCell(decisionMatrix, alt.id, c.id);
                      return (
                        <td key={c.id} style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {val != null ? val : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección 3 (ELECTRE): relación de superación en vez de orden de mérito */}
        {el && electre && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 4 }}>
              3. Relación de Superación (ELECTRE)
            </h3>
            <div style={{ breakInside: 'avoid' }}>
              <ElectreGraph names={electre.names} outranks={electre.outranks} concordance={electre.concordance} discordance={electre.discordance} cStar={electre.cStar} dStar={electre.dStar} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 12 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '2px solid #CBD5E1' }}>
                  <th style={{ padding: '8px 10px' }}>Relación</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Concordancia (≥ c* {electre.cStar.toFixed(2)})</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Discordancia (≤ d* {electre.dStar.toFixed(2)})</th>
                </tr>
              </thead>
              <tbody>
                {el.rels.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '8px 10px', color: '#64748B' }}>Ninguna alternativa supera a otra con estos umbrales.</td></tr>
                ) : el.rels.map(({ i, k }) => (
                  <tr key={`${i}-${k}`} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '8px 10px' }}><b>{electre.names[i]}</b> supera a <b>{electre.names[k]}</b></td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{electre.concordance[i][k].toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{electre.discordance[i][k].toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {el.incomparable.length > 0 && (
              <p style={{ fontSize: 12.5, color: '#475569', margin: '10px 0 0' }}>
                <b>Incomparables (ninguna supera a la otra):</b> {el.incomparable.map(([a, b]) => `${electre.names[a]} y ${electre.names[b]}`).join('; ')}. No es una falla del método: con estos umbrales los datos no alcanzan para preferir una sobre la otra.
              </p>
            )}
          </div>
        )}

        {/* Sección 3: Orden de Mérito (Ranking Final) */}
        {!electre && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 4 }}>
            3. Orden de Mérito y Síntesis Final
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '2px solid #CBD5E1' }}>
                <th style={{ padding: '8px 10px', width: 80 }}>Posición</th>
                <th style={{ padding: '8px 10px' }}>Alternativa</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Puntaje ({methodDoc.family})</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Dictamen</th>
              </tr>
            </thead>
            <tbody>
              {rankingRows.map((row) => (
                <tr
                  key={row.name}
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    background: row.rank === 1 ? '#F0FDF4' : undefined,
                  }}
                >
                  <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: 'monospace' }}>#{row.rank}</td>
                  <td style={{ padding: '8px 10px', fontWeight: row.rank === 1 ? 700 : 500 }}>
                    {row.name} {row.rank === 1 && '✓'}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                    {row.score.toFixed(4)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12 }}>
                    {row.rank === 1 ? (
                      <span style={{ color: '#16A34A', fontWeight: 700 }}>Recomendada</span>
                    ) : (
                      <span style={{ color: '#64748B' }}>Viable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Gráfico propio del método, el mismo que ve quien usa la plataforma (sin interacción: el informe se imprime) */}
          {method === 'topsis' && rankingRows.length > 0 && (
            <figure style={{ margin: '14px 0 0', breakInside: 'avoid' }}>
              <figcaption style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Cercanía relativa C de TOPSIS por alternativa (0 a 1, mayor es mejor)
              </figcaption>
              <ClosenessBars rows={rankingRows.map((r) => ({ name: r.name, value: r.score, rank: r.rank }))} />
            </figure>
          )}
          {method === 'vikor' && vikorChart && (
            <figure style={{ margin: '14px 0 0', breakInside: 'avoid' }}>
              <figcaption style={{ fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
                Sensibilidad del ranking a v (Q de cada alternativa según v; menor Q es mejor)
              </figcaption>
              <VikorSensitivityChart names={vikorChart.names} ends={vikorChart.ends} v={vikorV ?? 0.5} breaks={vikorChart.breaks.map((b) => b.v)} solidLabels />
              <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0' }}>
                Línea discontinua vertical = v usado en este informe.{' '}
                {vikorChart.breaks.length === 0
                  ? 'El 1er lugar no cambia con ningún v entre 0 y 1.'
                  : `Círculo negro = v donde cambia el 1er lugar: ${vikorChart.breaks.map((b) => `con v = ${b.v.toFixed(2)} pasa de ${b.from} a ${b.to}`).join('; ')}.`}
              </p>
            </figure>
          )}
        </div>
        )}

        {/* Sección 4: Sustento Metodológico y Citas APA */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', margin: '0 0 6px' }}>
            4. Justificación Metodológica y Citas Científicas
          </h4>
          <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: '0 0 6px' }}>
            {methodDoc.summary}
          </p>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#0F172A', background: '#F8FAFC', padding: '8px 12px', borderRadius: 4, border: '1px solid #E2E8F0' }}>
            <strong>Cita formal:</strong> {methodDoc.citationApa}
          </div>
        </div>

        {/* Pie de Página */}
        <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8' }}>
          <span>Generado automáticamente con Plataforma MCDA</span>
          <span>Universidad del Magdalena · Santa Marta, Colombia</span>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #executive-report-container,
          #executive-report-container * {
            visibility: visible;
          }
          #executive-report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            padding: 20px !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          /* Sin esto Chrome/Safari omiten rellenos de barras y trazos de color al imprimir (ahorro de tinta) */
          #executive-report-container svg {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
