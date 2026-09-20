'use client';

import type { Alternative, Criterion, DecisionMatrix, MatrixType } from '@/lib/types';
import { getCell, getType } from '@/lib/topsis';

type Props = {
  criteria: Criterion[];
  alternatives: Alternative[];
  matrix: DecisionMatrix;
  onSetCell: (altId: string, critId: string, value: number | null) => void;
  onSetType: (critId: string, type: MatrixType) => void;
};

export default function DecisionMatrixEditor({ criteria, alternatives, matrix, onSetCell, onSetType }: Props) {
  return (
    <div className="panel">
      <p className="muted" style={{ maxWidth: '70ch' }}>
        Para cada alternativa, escribe el valor real que tiene en cada criterio — un dato (precio, kilómetros, años,
        una métrica técnica), no un juicio de 1 a 9 como en AHP. Marca si en ese criterio MÁS es mejor (beneficio) o
        MENOS es mejor (costo, por ejemplo precio o riesgo).
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
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        aria-label={`${a.name}, ${c.name}`}
                        value={getCell(matrix, a.id, c.id) ?? ''}
                        onChange={(e) => onSetCell(a.id, c.id, e.target.value === '' ? null : Number(e.target.value))}
                      />
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
