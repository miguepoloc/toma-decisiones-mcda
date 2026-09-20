'use client';

import type { Alternative, Criterion, DecisionMatrix, MatrixType } from '@/lib/types';
import { getCell, getType } from '@/lib/topsis';
import { LINGUISTIC_LABELS, type LinguisticLabel } from '@/lib/fuzzy_topsis';

const LINGUISTIC_ES: Record<LinguisticLabel, string> = {
  VP: 'Muy mala (VP)',
  P:  'Mala (P)',
  F:  'Regular (F)',
  G:  'Buena (G)',
  VG: 'Muy buena (VG)',
};

function getFuzzyCell(dm: DecisionMatrix, altId: string, critId: string): LinguisticLabel {
  const v = dm.values[altId]?.[critId];
  return (typeof v === 'string' && LINGUISTIC_LABELS.includes(v as LinguisticLabel))
    ? (v as LinguisticLabel)
    : 'F';
}

type Props = {
  criteria: Criterion[];
  alternatives: Alternative[];
  matrix: DecisionMatrix;
  method?: string;
  onSetCell: (altId: string, critId: string, value: number | null) => void;
  onSetFuzzyCell?: (altId: string, critId: string, value: LinguisticLabel) => void;
  onSetType: (critId: string, type: MatrixType) => void;
};

export default function DecisionMatrixEditor({ criteria, alternatives, matrix, method, onSetCell, onSetFuzzyCell, onSetType }: Props) {
  const isFuzzy = method === 'fuzzy_topsis';

  return (
    <div className="panel">
      <p className="muted" style={{ maxWidth: '70ch' }}>
        {isFuzzy
          ? 'Para cada alternativa, selecciona la variable lingüística que mejor describe su desempeño en cada criterio: desde Muy mala (VP) hasta Muy buena (VG). Marca si el criterio es de beneficio (MÁS es mejor) o costo (MENOS es mejor).'
          : 'Para cada alternativa, escribe el valor real que tiene en cada criterio — un dato (precio, kilómetros, años, una métrica técnica), no un juicio de 1 a 9 como en AHP. Marca si en ese criterio MÁS es mejor (beneficio) o MENOS es mejor (costo, por ejemplo precio o riesgo).'}
      </p>
      <div className="card">
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th></th>
                {criteria.map((c) => (
                  <th key={c.id} className="n">
                    <div>{c.name}</div>
                    <div className="seg" style={{ marginTop: 6 }} role="group" aria-label={`Tipo de ${c.name}`}>
                      <button type="button" aria-pressed={getType(matrix, c.id) === 'max'} onClick={() => onSetType(c.id, 'max')}>Beneficio</button>
                      <button type="button" className="d" aria-pressed={getType(matrix, c.id) === 'min'} onClick={() => onSetType(c.id, 'min')}>Costo</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alternatives.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  {criteria.map((c) => (
                    <td key={c.id} className="n">
                      {isFuzzy ? (
                        <select
                          aria-label={`${a.name}, ${c.name}`}
                          value={getFuzzyCell(matrix, a.id, c.id)}
                          onChange={(e) => onSetFuzzyCell?.(a.id, c.id, e.target.value as LinguisticLabel)}
                        >
                          {LINGUISTIC_LABELS.map((lbl) => (
                            <option key={lbl} value={lbl}>{LINGUISTIC_ES[lbl]}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          aria-label={`${a.name}, ${c.name}`}
                          value={getCell(matrix, a.id, c.id) ?? ''}
                          onChange={(e) => onSetCell(a.id, c.id, e.target.value === '' ? null : Number(e.target.value))}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {!alternatives.length && <tr><td className="muted">Agrega alternativas en la pestaña «Proyecto» primero.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
