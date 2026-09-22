'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Criterion, Alternative, DecisionMatrix } from '@/lib/types';
import { topsisSynthesis } from '@/lib/topsis';
import { sawSynthesis } from '@/lib/saw';
import { vikorSynthesis } from '@/lib/vikor';
import { prometheeSynthesis } from '@/lib/promethee';
import { electreSynthesis } from '@/lib/electre';
import { fuzzyTopsisSynthesis } from '@/lib/fuzzy_topsis';
import type { MethodKey } from './ScientificMethodModal';

export interface AhpSynthRow {
  name: string;
  score: number;
  rank: number;
  loc?: number[];
}

interface SensitivitySimulatorProps {
  criteria: Criterion[];
  alternatives: Alternative[];
  decisionMatrix: DecisionMatrix;
  baseWeights: number[];
  method: MethodKey;
  ahpSynthRows?: AhpSynthRow[];
}

export default function SensitivitySimulator({
  criteria,
  alternatives,
  decisionMatrix,
  baseWeights,
  method,
  ahpSynthRows,
}: SensitivitySimulatorProps) {
  // Inicializar pesos simulados con los pesos base
  const [simWeights, setSimWeights] = useState<number[]>(() => [...baseWeights]);

  // Sincronizar pesos simulados cuando cambian los pesos base externos
  useEffect(() => {
    setSimWeights([...baseWeights]);
  }, [baseWeights]);

  // Si no hay alternativas o criterios suficientes, no renderizar
  if (!criteria.length || !alternatives.length || !baseWeights.length) {
    return null;
  }

  // Función para re-ponderar proporcionalmente al mover un slider
  function handleWeightChange(index: number, newRawVal: number) {
    const newTarget = Math.max(0, Math.min(1, newRawVal));
    const m = criteria.length;
    if (m <= 1) {
      setSimWeights([1]);
      return;
    }

    const next = [...simWeights];
    const oldTarget = next[index] ?? (1 / m);
    next[index] = newTarget;

    const remainingNew = 1 - newTarget;
    const otherOldSum = next.reduce((sum, w, i) => (i === index ? sum : sum + w), 0);

    if (otherOldSum > 1e-6) {
      const factor = remainingNew / otherOldSum;
      for (let i = 0; i < m; i++) {
        if (i !== index) {
          next[i] = Math.max(0, next[i] * factor);
        }
      }
    } else {
      // Si todos los demás estaban en 0, repartir equitativamente el remanente
      const evenSplit = remainingNew / (m - 1);
      for (let i = 0; i < m; i++) {
        if (i !== index) {
          next[i] = evenSplit;
        }
      }
    }

    // Normalización final estricta
    const sum = next.reduce((a, b) => a + b, 0) || 1;
    setSimWeights(next.map((w) => w / sum));
  }

  function resetWeights() {
    setSimWeights([...baseWeights]);
  }

  // Resolver síntesis base
  const baseResult = useMemo(() => {
    return computeRanking(method, criteria, alternatives, decisionMatrix, baseWeights, ahpSynthRows);
  }, [method, criteria, alternatives, decisionMatrix, baseWeights, ahpSynthRows]);

  // Resolver síntesis simulada en tiempo real
  const simResult = useMemo(() => {
    return computeRanking(method, criteria, alternatives, decisionMatrix, simWeights, ahpSynthRows);
  }, [method, criteria, alternatives, decisionMatrix, simWeights, ahpSynthRows]);

  const baseWinner = baseResult.find((r) => r.rank === 1);
  const simWinner = simResult.find((r) => r.rank === 1);
  const winnerChanged = baseWinner && simWinner && baseWinner.name !== simWinner.name;

  return (
    <div
      className="card"
      style={{
        borderTop: '3px solid var(--accent)',
        display: 'grid',
        gap: 20,
        padding: '24px',
        background: 'var(--surface)',
      }}
    >
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'var(--f-mono)',
                fontWeight: 700,
                color: 'var(--accent)',
                background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              ANÁLISIS DE SENSIBILIDAD «WHAT-IF»
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
              Método: {method.toUpperCase()}
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>
            Simulador Dinámico de Ponderación de Criterios
          </h3>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 0', maxWidth: '65ch' }}>
            Desplaza los controles para evaluar qué tan robusto es el ranking si cambian las prioridades de los criterios.
            Los demás criterios se rebalancean proporcionalmente de forma automática.
          </p>
        </div>

        <button
          type="button"
          className="btn sm"
          onClick={resetWeights}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          ↺ Restablecer pesos base
        </button>
      </div>

      {/* Alerta de Cambio de Ganador */}
      {winnerChanged ? (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid #F59E0B',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div style={{ fontSize: 13.5, color: '#FCD34D' }}>
            <strong>¡Cambio de alternativa ganadora!</strong> Con esta nueva ponderación,{' '}
            <b style={{ color: '#FFF' }}>{simWinner?.name}</b> asciende al 1.er lugar (en el modelo base era{' '}
            <b style={{ color: '#FFF' }}>{baseWinner?.name}</b>).
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            color: '#A7F3D0',
          }}
        >
          <span>✓</span>
          <span>
            <strong>Ranking robusto:</strong> La alternativa ganadora actual ({simWinner?.name}) se mantiene en el 1.er puesto bajo esta combinación de pesos.
          </span>
        </div>
      )}

      {/* Sliders de Sensibilidad por Criterio */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
          background: 'var(--surface2)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '16px',
        }}
      >
        {criteria.map((c, i) => {
          const simW = simWeights[i] ?? 0;
          const baseW = baseWeights[i] ?? 0;
          const diff = simW - baseW;
          const pct = (simW * 100).toFixed(1);
          const diffText = diff > 0.001 ? `+${(diff * 100).toFixed(1)}%` : diff < -0.001 ? `${(diff * 100).toFixed(1)}%` : '=';

          return (
            <div key={c.id} style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.name}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontFamily: 'var(--f-mono)', fontSize: 12 }}>
                  <b style={{ color: 'var(--accent)' }}>{pct}%</b>
                  <span
                    style={{
                      fontSize: 11,
                      color: diff > 0.001 ? 'var(--pass)' : diff < -0.001 ? 'var(--warn)' : 'var(--muted)',
                    }}
                  >
                    ({diffText})
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={simW}
                onChange={(e) => handleWeightChange(i, parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--accent)',
                  cursor: 'pointer',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Comparativa: Ranking Base vs. Ranking Simulado */}
      <div>
        <div style={{ fontSize: 12, fontFamily: 'var(--f-mono)', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
          Comparativa de Posición en el Ranking
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>Alternativa</th>
                <th className="n">Puesto Base</th>
                <th className="n">Puntaje Base</th>
                <th className="n">Puesto Simulado</th>
                <th className="n">Puntaje Simulado</th>
                <th className="n">Variación</th>
              </tr>
            </thead>
            <tbody>
              {[...alternatives]
                .sort((a, b) => {
                  const rA = simResult.find((r) => r.name === a.name)?.rank ?? 999;
                  const rB = simResult.find((r) => r.name === b.name)?.rank ?? 999;
                  return rA - rB;
                })
                .map((alt) => {
                  const bRow = baseResult.find((r) => r.name === alt.name);
                  const sRow = simResult.find((r) => r.name === alt.name);
                  const bRank = bRow?.rank ?? 0;
                  const sRank = sRow?.rank ?? 0;
                const rankDiff = bRank - sRank; // Si bRank=2 y sRank=1, subió +1 puesto

                return (
                  <tr key={alt.id} style={{ background: sRank === 1 ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : undefined }}>
                    <td style={{ fontWeight: sRank === 1 ? 700 : 500, color: sRank === 1 ? 'var(--ink)' : undefined }}>
                      {alt.name} {sRank === 1 && '👑'}
                    </td>
                    <td className="n" style={{ fontFamily: 'var(--f-mono)' }}>#{bRank}</td>
                    <td className="n" style={{ fontFamily: 'var(--f-mono)', color: 'var(--muted)' }}>
                      {bRow ? bRow.score.toFixed(4) : '—'}
                    </td>
                    <td className="n" style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, color: sRank === 1 ? 'var(--accent)' : undefined }}>
                      #{sRank}
                    </td>
                    <td className="n" style={{ fontFamily: 'var(--f-mono)', color: 'var(--accent)' }}>
                      {sRow ? sRow.score.toFixed(4) : '—'}
                    </td>
                    <td className="n" style={{ fontFamily: 'var(--f-mono)' }}>
                      {rankDiff > 0 ? (
                        <span style={{ color: 'var(--pass)' }}>↑ Subió {rankDiff}</span>
                      ) : rankDiff < 0 ? (
                        <span style={{ color: 'var(--warn)' }}>↓ Bajó {Math.abs(rankDiff)}</span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>= Sin cambio</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Función auxiliar para calcular rankings en base al método
function computeRanking(
  method: MethodKey,
  criteria: Criterion[],
  alternatives: Alternative[],
  dm: DecisionMatrix,
  weights: number[],
  ahpSynthRows?: AhpSynthRow[],
): { name: string; score: number; rank: number }[] {
  if (method === 'topsis') {
    const synth = topsisSynthesis(criteria, alternatives, dm, weights);
    return synth.rows.map((r) => ({ name: r.name, score: r.c, rank: r.rank }));
  }

  if (method === 'saw') {
    const synth = sawSynthesis(criteria, alternatives, dm, weights);
    return synth.rows.map((r) => ({ name: r.name, score: r.value, rank: r.rank }));
  }

  if (method === 'vikor') {
    const synth = vikorSynthesis(criteria, alternatives, dm, weights);
    return synth.rows.map((r) => ({ name: r.name, score: r.q, rank: r.rank }));
  }

  if (method === 'promethee') {
    const synth = prometheeSynthesis(criteria, alternatives, dm, weights);
    return synth.rows.map((r) => ({ name: r.name, score: r.phi, rank: r.rank }));
  }

  if (method === 'electre') {
    const synth = electreSynthesis(criteria, alternatives, dm, weights);
    const minNet = Math.min(...synth.netOutdegree, 0);
    const maxNet = Math.max(...synth.netOutdegree, 0);
    const span = maxNet - minNet || 1;
    return synth.names.map((name, i) => ({
      name,
      score: (synth.netOutdegree[i] - minNet) / span,
      rank: 1 + synth.netOutdegree.filter((val) => val > synth.netOutdegree[i]).length,
    }));
  }

  if (method === 'fuzzy_topsis') {
    const synth = fuzzyTopsisSynthesis(criteria, alternatives, dm, weights);
    return synth.rows.map((r) => ({ name: r.name, score: r.value, rank: r.rank }));
  }

  // Síntesis dinámica de AHP usando prioridades locales de los criterios
  if (method === 'ahp' && ahpSynthRows && ahpSynthRows.length) {
    const hasLoc = ahpSynthRows.some((r) => r.loc && r.loc.length > 0);
    if (hasLoc) {
      // g_i(w) = sum_c (w_c * loc_c,i)
      const scored = ahpSynthRows.map((r) => {
        const score = (r.loc ?? []).reduce((acc: number, l: number, c: number) => acc + (weights[c] ?? 0) * (l ?? 0), 0);
        return { name: r.name, score };
      });
      return scored.map((s) => ({
        name: s.name,
        score: s.score,
        rank: 1 + scored.filter((o) => o.score > s.score + 1e-9).length,
      }));
    }
    return ahpSynthRows.map((r) => ({ name: r.name, score: r.score, rank: r.rank }));
  }

  return alternatives.map((a, i) => ({ name: a.name, score: 0, rank: i + 1 }));
}
