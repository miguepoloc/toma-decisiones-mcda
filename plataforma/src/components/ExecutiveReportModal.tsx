'use client';

import { useEffect } from 'react';
import type { Criterion, Alternative, DecisionMatrix } from '@/lib/types';
import { METHOD_SPECS, type MethodKey } from './ScientificMethodModal';
import { getCell, getType } from '@/lib/topsis';

interface ExecutiveReportModalProps {
  projectTitle: string;
  projectObjective: string;
  method: MethodKey;
  criteria: Criterion[];
  alternatives: Alternative[];
  decisionMatrix: DecisionMatrix;
  weights: number[];
  rankingRows: { name: string; score: number; rank: number }[];
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
  onClose,
}: ExecutiveReportModalProps) {
  const methodDoc = METHOD_SPECS[method] || METHOD_SPECS.topsis;
  const winner = rankingRows.find((r) => r.rank === 1) || rankingRows[0];
  const currentDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 2px', color: '#0F172A' }}>
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
        {winner && (
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
                      {getType(decisionMatrix, c.id) === 'min' ? 'Minimizar (Costo)' : 'Maximizar (Beneficio)'}
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

        {/* Sección 3: Orden de Mérito (Ranking Final) */}
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
        </div>

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
        }
      `}</style>
    </div>
  );
}
