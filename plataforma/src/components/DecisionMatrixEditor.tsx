'use client';

import type { Alternative, Criterion, DecisionMatrix, MatrixKind, TargetSpec } from '@/lib/types';
import { getCell, getKind, getTarget, targetDistance } from '@/lib/topsis';
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
  onSetType: (critId: string, type: MatrixKind) => void;
  /** Objetivo (valor y tolerancia) de un criterio de tipo «Objetivo». */
  onSetTarget: (critId: string, spec: TargetSpec) => void;
};

export default function DecisionMatrixEditor({ criteria, alternatives, matrix, method, onSetCell, onSetFuzzyCell, onSetType, onSetTarget }: Props) {
  const isFuzzy = method === 'fuzzy_topsis';
  const targetCrit = isFuzzy ? [] : criteria.filter((c) => getKind(matrix, c.id) === 'target');
  const sinObjetivo = targetCrit.filter((c) => !getTarget(matrix, c.id));
  // ancho mínimo por columna: los 3 botones (Beneficio · Costo · Objetivo) caben sin apretarse y la tabla
  // hace scroll horizontal (envoltorio .tbl) si hay muchos criterios, en vez de deformarse
  const minWidth = 200 + criteria.length * 232;

  return (
    <div className="panel">
      <p className="muted" style={{ maxWidth: '110ch' }}>
        {isFuzzy
          ? 'Para cada alternativa, selecciona la variable lingüística que mejor describe su desempeño en cada criterio: desde Muy mala (VP) hasta Muy buena (VG). Marca si el criterio es de beneficio (MÁS es mejor) o costo (MENOS es mejor).'
          : 'Para cada alternativa, escribe el valor real que tiene en cada criterio — un dato (precio, kilómetros, años, una métrica técnica), no un juicio de 1 a 9 como en AHP. Marca el tipo de cada criterio: Beneficio (MÁS es mejor), Costo (MENOS es mejor) u Objetivo (lo mejor es un valor específico, por ejemplo un voltaje de 110 V: ni más ni menos es mejor).'}
      </p>
      {sinObjetivo.length > 0 && (
        <div className="banner" role="alert" style={{ marginBottom: 12 }}>
          <span><b>Falta el valor objetivo</b> de: {sinObjetivo.map((c) => c.name).join(', ')}. Escríbelo en la fila «Valor objetivo»; mientras tanto ese criterio no distingue entre alternativas.</span>
        </div>
      )}
      <div className="card mx">
        <div className="tbl">
          <table style={{ minWidth }}>
            <caption className="sr-only">Matriz de decisión: valor de cada alternativa en cada criterio y tipo de criterio</caption>
            <thead>
              <tr>
                <th scope="col">Alternativa</th>
                {criteria.map((c) => (
                  <th key={c.id} scope="col">
                    <span className="crit-name">{c.name}</span>
                    <div className="seg" role="group" aria-label={`Tipo de ${c.name}`}>
                      <button type="button" aria-pressed={getKind(matrix, c.id) === 'max'} onClick={() => onSetType(c.id, 'max')}>Beneficio</button>
                      <button type="button" className="d" aria-pressed={getKind(matrix, c.id) === 'min'} onClick={() => onSetType(c.id, 'min')}>Costo</button>
                      {!isFuzzy && <button type="button" className="o" aria-pressed={getKind(matrix, c.id) === 'target'} onClick={() => onSetType(c.id, 'target')}>Objetivo</button>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {targetCrit.length > 0 && (
                <>
                  <tr className="obj">
                    <th scope="row">
                      Valor objetivo
                      <span className="mxh">Lo ideal para ese criterio</span>
                    </th>
                    {criteria.map((c) => {
                      const t = getTarget(matrix, c.id);
                      return (
                        <td key={c.id}>
                          {getKind(matrix, c.id) === 'target' ? (
                            <input type="number" inputMode="decimal" step="any" aria-label={`Valor objetivo de ${c.name}`}
                              aria-invalid={!t} placeholder="ej. 110" value={t?.value ?? ''}
                              onChange={(e) => e.target.value !== '' && onSetTarget(c.id, { value: Number(e.target.value), tol: t?.tol ?? 0 })} />
                          ) : <span className="muted" aria-hidden="true">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="obj end">
                    <th scope="row">
                      Tolerancia ±
                      <span className="mxh">Banda donde todo valor es igual de bueno. 0 = valor exacto</span>
                    </th>
                    {criteria.map((c) => {
                      const t = getTarget(matrix, c.id);
                      return (
                        <td key={c.id}>
                          {getKind(matrix, c.id) === 'target' ? (
                            <input type="number" inputMode="decimal" step="any" min="0" aria-label={`Tolerancia del objetivo de ${c.name}`}
                              disabled={!t} value={t?.tol ?? 0}
                              onChange={(e) => { if (t && e.target.value !== '') onSetTarget(c.id, { value: t.value, tol: Math.max(0, Number(e.target.value)) }); }} />
                          ) : <span className="muted" aria-hidden="true">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
              {alternatives.map((a) => (
                <tr key={a.id}>
                  <th scope="row" className="alt">{a.name}</th>
                  {criteria.map((c) => {
                    const t = getTarget(matrix, c.id), x = getCell(matrix, a.id, c.id);
                    return (
                      <td key={c.id}>
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
                          <>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="any"
                              aria-label={`${a.name}, ${c.name}`}
                              value={x ?? ''}
                              onChange={(e) => onSetCell(a.id, c.id, e.target.value === '' ? null : Number(e.target.value))}
                            />
                            {getKind(matrix, c.id) === 'target' && t && x != null && (
                              <span className="mxh">distancia {Number(targetDistance(x, t.value, t.tol).toPrecision(6))}</span>
                            )}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!alternatives.length && <tr><td className="muted" colSpan={criteria.length + 1}>Agrega alternativas en la pestaña «Proyecto» primero.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
