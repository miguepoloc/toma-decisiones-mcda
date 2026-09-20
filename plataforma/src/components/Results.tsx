'use client';

import { useMemo, useState } from 'react';
import type { Alternative, Criterion, DecisionMatrix, JudgmentRow, Method } from '@/lib/types';
import {
  CRIT_SHEET, altSheet, aggMatrix, fmt, getV, indexJudgments, pairsOf, phrase, sheetItems, sheetResult, synthesis,
} from '@/lib/ahp';
import { getCell, getType, normalizeMatrix, topsisSynthesis } from '@/lib/topsis';
import { vikorSynthesis } from '@/lib/vikor';
import { prometheeSynthesis } from '@/lib/promethee';
import { electreSynthesis } from '@/lib/electre';

export type ExpertLite = { id: string; label: string };

type Props = {
  criteria: Criterion[];
  alternatives: Alternative[];
  experts: ExpertLite[];
  judgments: Pick<JudgmentRow, 'expert_id' | 'sheet' | 'pair_key' | 'value'>[];
  /** Cualquier método distinto de 'ahp' ranquea las alternativas con una matriz de decisión
   * cuantitativa y los pesos de la hoja Criterios, no con matrices AHP por alternativa. Default 'ahp'. */
  method?: Method;
  decisionMatrix?: DecisionMatrix | Record<string, never>;
  /** Si true, muestra el detalle de lo que respondió cada experto (vista del dueño). */
  showPerExpert?: boolean;
};

const METHOD_LABEL: Record<Method, string> = {
  ahp: 'AHP', topsis: 'TOPSIS', vikor: 'VIKOR', electre: 'ELECTRE', promethee: 'PROMETHEE',
};

function Table({ names, M, f }: { names: string[]; M: number[][]; f: (x: number) => string }) {
  return (
    <div className="tbl" style={{ marginTop: 8 }}>
      <table>
        <thead><tr><th></th>{names.map((x) => <th key={x} className="n">{x}</th>)}</tr></thead>
        <tbody>{M.map((r, i) => <tr key={i}><td>{names[i]}</td>{r.map((x, j) => <td key={j} className="n">{f(x)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function Results({ criteria, alternatives, experts, judgments, method = 'ahp', decisionMatrix, showPerExpert }: Props) {
  const idx = useMemo(() => indexJudgments(judgments), [judgments]);
  const withData = useMemo(() => experts.filter((e) => Object.keys(idx[e.id] ?? {}).length > 0).map((e) => e.id), [experts, idx]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState(CRIT_SHEET);
  const [view, setView] = useState('agg');

  const used = withData.filter((id) => !excluded.has(id));
  const critWeights = useMemo(() => sheetResult(CRIT_SHEET, criteria, used, idx).agg.w, [criteria, used, idx]);
  const syn = useMemo(() => synthesis(criteria, alternatives, used, idx), [criteria, alternatives, used, idx]);
  const dm = useMemo(() => normalizeMatrix(decisionMatrix), [decisionMatrix]);

  const topSyn = useMemo(() => topsisSynthesis(criteria, alternatives, dm, critWeights), [criteria, alternatives, dm, critWeights]);
  const vikSyn = useMemo(() => vikorSynthesis(criteria, alternatives, dm, critWeights), [criteria, alternatives, dm, critWeights]);
  const promSyn = useMemo(() => prometheeSynthesis(criteria, alternatives, dm, critWeights), [criteria, alternatives, dm, critWeights]);
  const elecSyn = useMemo(() => electreSynthesis(criteria, alternatives, dm, critWeights), [criteria, alternatives, dm, critWeights]);
  const dmFilled = alternatives.some((a) => criteria.some((c) => getCell(dm, a.id, c.id) != null));

  // Filas normalizadas para los 3 métodos de "ranking numérico" (TOPSIS/VIKOR/PROMETHEE): cada uno
  // define su propio valor, si mayor-es-mejor, y cómo mostrarlo — el resto de la UI es compartida.
  const quant = useMemo(() => {
    if (method === 'topsis') {
      return {
        rows: topSyn.rows.map((r) => ({ name: r.name, value: r.c, rank: r.rank })), order: topSyn.order, tie: topSyn.tie,
        higherBetter: true, bar: (v: number) => v * 100, fmt: (v: number) => v.toFixed(4), unit: 'cercanía (0 a 1, mayor es mejor)',
      };
    }
    if (method === 'vikor') {
      return {
        rows: vikSyn.rows.map((r) => ({ name: r.name, value: r.q, rank: r.rank })), order: vikSyn.order, tie: vikSyn.tie,
        higherBetter: false, bar: (v: number) => (1 - v) * 100, fmt: (v: number) => 'Q ' + v.toFixed(4), unit: 'Q (0 a 1, MENOR es mejor)',
      };
    }
    // promethee
    const phis = promSyn.rows.map((r) => r.phi);
    const lo = Math.min(...phis, 0), hi = Math.max(...phis, 0);
    const span = hi - lo || 1;
    return {
      rows: promSyn.rows.map((r) => ({ name: r.name, value: r.phi, rank: r.rank })), order: promSyn.order, tie: promSyn.tie,
      higherBetter: true, bar: (v: number) => ((v - lo) / span) * 100, fmt: (v: number) => (v >= 0 ? '+' : '') + v.toFixed(3), unit: 'flujo neto φ (mayor es mejor)',
    };
  }, [method, topSyn, vikSyn, promSyn]);

  const sheets = method === 'ahp'
    ? [{ key: CRIT_SHEET, label: 'Criterios' }, ...criteria.map((c) => ({ key: altSheet(c.id), label: c.name }))]
    : [{ key: CRIT_SHEET, label: 'Criterios' }];
  const items = sheetItems(sheet, criteria, alternatives);
  const r = useMemo(() => sheetResult(sheet, items, used, idx), [sheet, items, used, idx]);
  const bad = sheets.filter((s) => !sheetResult(s.key, sheetItems(s.key, criteria, alternatives), used, idx).agg.ok).map((s) => s.label);
  const colv = (i: number) => (i < 5 ? `var(--s${i + 1})` : 'var(--other)');
  const wmax = Math.max(...r.agg.w, 0.0001) * 1.12;

  const viewExpert = view !== 'agg' ? experts.find((e) => e.id === view) : undefined;
  const vm = viewExpert ? (idx[viewExpert.id]?.[sheet] ?? {}) : {};
  const vr = viewExpert ? sheetResult(sheet, items, [viewExpert.id], idx) : null;

  if (method !== 'ahp' ? !dmFilled : !withData.length) {
    return (
      <div className="card muted">
        {method !== 'ahp'
          ? 'Todavía no hay datos en la matriz de decisión. Complétala en su pestaña para ver resultados.'
          : 'Todavía no hay juicios. Cuando tú o tus expertos respondan, aquí aparecerán los resultados.'}
      </div>
    );
  }

  const maxG = Math.max(...syn.rows.map((x) => x.g), 0.0001) * 1.08;

  return (
    <div className="panel">
      <div className="card">
        <div className="eyebrow">Expertos incluidos en el cálculo ({used.length} de {withData.length})</div>
        <div className="chips" style={{ marginTop: 8 }}>
          {withData.map((id) => {
            const e = experts.find((x) => x.id === id)!;
            const on = !excluded.has(id);
            return (
              <label key={id} className="pill neutral" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={on} onChange={() => setExcluded((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; })} /> {e.label}
              </label>
            );
          })}
          {!withData.length && <span className="muted" style={{ fontSize: 13 }}>Ningún experto ha pesado los criterios todavía — se usan pesos iguales.</span>}
        </div>
      </div>

      {method === 'electre' ? (
        <>
          <div className="card win">
            <span className="eyebrow">ELECTRE no da un solo ganador</span>
            <span className="big">Relación de superación ({elecSyn.relations.length} relación{elecSyn.relations.length === 1 ? '' : 'es'})</span>
            <span className="muted" style={{ fontSize: 13 }}>c* (concordancia mínima) {elecSyn.result.cStar.toFixed(2)} · d* (discordancia máxima) {elecSyn.result.dStar.toFixed(2)} — convención del curso.</span>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Quién supera a quién</h3>
            {elecSyn.relations.length ? (
              <ul style={{ paddingLeft: 18, fontSize: 14, display: 'grid', gap: 4 }}>
                {elecSyn.relations.map((rel) => <li key={rel.winner + rel.loser}><b>{rel.winner}</b> supera a <b>{rel.loser}</b></li>)}
              </ul>
            ) : <p className="muted">Ninguna alternativa supera a otra con estos umbrales — sube d* o baja c* si esperabas más relaciones.</p>}
            {elecSyn.incomparable.length > 0 && (
              <>
                <h3 style={{ marginTop: 16, marginBottom: 6 }}>Incomparables (ninguna supera a la otra)</h3>
                <ul style={{ paddingLeft: 18, fontSize: 14 }}>
                  {elecSyn.incomparable.map(([a, b]) => <li key={a + b}>{a} y {b}</li>)}
                </ul>
                <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>No es una falla del método: significa que los datos no alcanzan para preferir una sobre la otra con estos umbrales.</p>
              </>
            )}
          </div>
          <div className="card res">
            <h3>Matrices de concordancia y discordancia</h3>
            <details open>
              <summary>Ver detalle</summary>
              <h4>Concordancia (fila supera a columna si ≥ {elecSyn.result.cStar.toFixed(2)})</h4>
              <Table names={elecSyn.names} M={elecSyn.result.concordance} f={(x) => x.toFixed(2)} />
              <h4>Discordancia (fila supera a columna si ≤ {elecSyn.result.dStar.toFixed(2)})</h4>
              <Table names={elecSyn.names} M={elecSyn.result.discordance} f={(x) => x.toFixed(2)} />
            </details>
          </div>
        </>
      ) : (
        <>
          <div className="card win">
            <span className="eyebrow">Ganador ({METHOD_LABEL[method]})</span>
            {(method === 'ahp' ? syn.tie : quant.tie) ? <span className="big">Empate: aún no hay datos que distingan</span> : (
              method === 'ahp' ? (
                <>
                  <span className="big">{syn.rows[syn.order[0]].name}</span>
                  <span className="mono">prioridad global {syn.rows[syn.order[0]].g.toFixed(4)}</span>
                </>
              ) : (
                <>
                  <span className="big">{quant.rows[quant.order[0]].name}</span>
                  <span className="mono">{quant.fmt(quant.rows[quant.order[0]].value)}</span>
                </>
              )
            )}
          </div>
          {bad.length > 0 && <div className="banner"><span><b>Revisa la consistencia</b> (CR ≥ 0.10) en: {bad.join(', ')}.</span></div>}

          {method === 'ahp' ? (
            <>
              <div className="card">
                <h3 style={{ marginBottom: 10 }}>Cuánto aporta cada criterio a la prioridad global</h3>
                <div className="stack">
                  {syn.order.map((i) => {
                    const row = syn.rows[i];
                    return (
                      <div className="srow" key={row.name + i}>
                        <span className="nm">{row.rank}. {row.name}</span>
                        <div className="strack">
                          <div className="sbar" style={{ width: `${(row.g / maxG) * 100}%` }}>
                            {row.contrib.map((x, c) => (
                              <i key={c} style={{ background: colv(c), width: `${row.g ? (x / row.g) * 100 : 0}%` }}
                                 title={`${row.name} · ${criteria[c]?.name}: peso ${syn.wr[c]?.toFixed(3)} × local ${row.loc[c]?.toFixed(3)} = ${x.toFixed(4)}`} />
                            ))}
                          </div>
                          <span className="sval">{row.g.toFixed(4)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="lg" style={{ marginTop: 12 }}>
                  {criteria.slice(0, 5).map((c, i) => <span key={c.id}><i style={{ background: `var(--s${i + 1})` }} />{c.name}</span>)}
                  {criteria.length > 5 && <span><i style={{ background: 'var(--other)' }} />Otros criterios ({criteria.length - 5})</span>}
                </div>
              </div>

              <div className="card">
                <h3>Tabla de síntesis</h3>
                <div className="tbl" style={{ marginTop: 8 }}>
                  <table>
                    <thead><tr><th>Estrategia</th>{criteria.map((c) => <th key={c.id} className="n">{c.name}</th>)}<th className="n">Global</th><th className="n">Rank</th></tr></thead>
                    <tbody>
                      <tr><td className="muted">Peso del criterio</td>{syn.wr.map((w, i) => <td key={i} className="n">{w.toFixed(4)}</td>)}<td /><td /></tr>
                      {syn.rows.map((row, i) => (
                        <tr key={i} className={row.rank === 1 && !syn.tie ? 'win' : ''}>
                          <td>{row.name}</td>{row.loc.map((x, j) => <td key={j} className="n">{x.toFixed(4)}</td>)}
                          <td className="n">{row.g.toFixed(4)}</td><td className="n">{row.rank}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Ranking {METHOD_LABEL[method]} — {quant.unit}</h3>
              <div className="stack">
                {quant.order.map((i) => {
                  const row = quant.rows[i];
                  const w = Math.max(0, Math.min(100, quant.bar(row.value)));
                  return (
                    <div className="wbar" key={row.name + i}>
                      <span className="nm">{row.rank}. {row.name}</span>
                      <div className="track"><div className="fill" style={{ width: `${w}%` }} /><span className="val" style={{ left: `${w}%` }}>{quant.fmt(row.value)}</span></div>
                    </div>
                  );
                })}
              </div>
              <details style={{ marginTop: 12 }}>
                <summary>Ver matriz de decisión y pesos usados</summary>
                <h4>Peso de cada criterio (de la hoja Criterios)</h4>
                <div className="tbl" style={{ marginTop: 8 }}>
                  <table>
                    <thead><tr><th></th>{criteria.map((c) => <th key={c.id} className="n">{c.name}</th>)}</tr></thead>
                    <tbody><tr><td className="muted">Peso</td>{critWeights.map((w, i) => <td key={i} className="n">{w.toFixed(4)}</td>)}</tr></tbody>
                  </table>
                </div>
                <h4>Matriz de decisión (valores tal cual se ingresaron)</h4>
                <div className="tbl" style={{ marginTop: 8 }}>
                  <table>
                    <thead><tr><th></th>{criteria.map((c) => <th key={c.id} className="n">{c.name} · {getType(dm, c.id) === 'max' ? 'beneficio' : 'costo'}</th>)}</tr></thead>
                    <tbody>
                      {alternatives.map((a) => (
                        <tr key={a.id}><td>{a.name}</td>{criteria.map((c) => <td key={c.id} className="n">{getCell(dm, a.id, c.id) ?? '—'}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
        </>
      )}

      <div className="card res">
        <h3>Detalle por hoja</h3>
        <div className="sheetnav" role="group" aria-label="Hoja">
          {sheets.map((s) => <button key={s.key} type="button" aria-pressed={s.key === sheet} onClick={() => setSheet(s.key)}><b>{s.label}</b></button>)}
        </div>
        {showPerExpert && (
          <div>
            <label className="lbl" htmlFor="vista">Vista</label>
            <select id="vista" value={view} onChange={(e) => setView(e.target.value)}>
              <option value="agg">Agregado de los expertos incluidos</option>
              {experts.map((e) => <option key={e.id} value={e.id}>Solo lo que respondió: {e.label}</option>)}
            </select>
          </div>
        )}
        {viewExpert && vr ? (
          <>
            <div className="chips"><span className={'pill' + (vr.agg.ok ? '' : ' warn')}>{viewExpert.label}: CR {vr.agg.cr.toFixed(3)} {vr.agg.ok ? '✓' : '✗'}</span></div>
            {items.map((it, i) => <div className="wbar" key={it.id}><span className="nm">{it.name}</span><div className="track"><div className="fill" style={{ width: `${(vr.agg.w[i] / (Math.max(...vr.agg.w) * 1.12)) * 100}%` }} /><span className="val" style={{ left: `${(vr.agg.w[i] / (Math.max(...vr.agg.w) * 1.12)) * 100}%` }}>{vr.agg.w[i].toFixed(4)}</span></div></div>)}
            <details open><summary>Lo que respondió, en palabras</summary>
              <ul style={{ paddingLeft: 18, fontSize: 14 }}>
                {pairsOf(items.length).map(([i, j]) => <li key={i + '-' + j}>{items[i].name} vs {items[j].name}: {phrase(items, i, j, getV(vm, items[i].id, items[j].id))}</li>)}
              </ul>
            </details>
          </>
        ) : (
          <>
            <div className="chips">
              <span className={'pill' + (r.agg.ok ? '' : ' warn')}>{r.agg.ok ? 'Consistente' : 'Inconsistente'} · CR {r.agg.cr.toFixed(4)}</span>
              {r.per.map((p, i) => <span key={i} className={'pill ' + (p.ok ? 'neutral' : 'warn')}>{experts.find((e) => e.id === used[i])?.label}: CR {p.cr.toFixed(3)}{p.ok ? '' : ' ✗'}</span>)}
            </div>
            {items.map((it, i) => <div className="wbar" key={it.id}><span className="nm">{it.name}</span><div className="track"><div className="fill" style={{ width: `${(r.agg.w[i] / wmax) * 100}%` }} /><span className="val" style={{ left: `${(r.agg.w[i] / wmax) * 100}%` }}>{r.agg.w[i].toFixed(4)}</span></div></div>)}
            <div className="metrics">
              <div><b>{r.agg.lam.toFixed(4)}</b><small>λ max</small></div><div><b>{r.agg.ci.toFixed(4)}</b><small>CI</small></div>
              <div><b>{r.agg.ri}</b><small>RI (n={r.agg.n})</small></div><div><b>{r.agg.cr.toFixed(4)}</b><small>CR</small></div>
            </div>
            <details><summary>Ver procedimiento</summary>
              <h4>Matriz agregada (media geométrica)</h4><Table names={items.map((x) => x.name)} M={aggMatrix(items, r.maps)} f={fmt} />
              <h4>Matriz normalizada</h4><Table names={items.map((x) => x.name)} M={r.agg.N} f={(x) => x.toFixed(4)} />
            </details>
          </>
        )}
      </div>
    </div>
  );
}
