'use client';

/** Pestaña «Modelo» del geovisor: pesos del panel de expertos (o exploración libre), la regla de
 * idoneidad de cada criterio con vista previa, y los umbrales de las clases. */
import { useMemo } from 'react';
import { describeFn, suitability, type FnSpec } from '@/lib/geo/membership';
import type { LayerInfo } from '@/lib/geo/data';
import type { Criterion, GeoConfig } from '@/lib/types';
import type { Parcel } from '@/lib/geo/patches';
import type { AreaStats } from '@/lib/geo/suitability';
import { Num } from './GeoBits';

type Rule = GeoConfig['rules'][string];
type Props = {
  criteria: Criterion[];
  weights: number[];
  cr: number;
  nExperts: number;
  layers: Record<string, LayerInfo>;
  rules: GeoConfig['rules'];
  onRule: (criterionId: string, rule: Rule | undefined) => void;
  thresholds: GeoConfig['classes'];
  onThresholds: (c: GeoConfig['classes']) => void;
  exploring: boolean;
  exploreWeights: number[] | null;
  onExplore: (on: boolean, w?: number[] | null) => void;
  readOnlyRules?: boolean;
  /** Proyecto con paquete del curso: solo lectura, no admite mapas propios. */
  isPack?: boolean;
  /** Lleva a la pestaña «Capas» para subir el mapa de este criterio. */
  onUploadFor?: (criterionId: string) => void;
  /** Criterio que se acaba de alimentar: su regla se abre para ajustarla. */
  focusId?: string | null;
  minPatchHa: number;
  onMinPatch: (ha: number) => void;
  parcels: Parcel[] | null;
  onFlyTo: (col: number, row: number) => void;
  stats: AreaStats | null;
  baseline: { label: string; stats: AreaStats } | null;
  onSaveBaseline: (label: string) => void;
  onClearBaseline: () => void;
};

const FN_LABEL: Record<FnSpec['type'], string> = { steps: 'Por rangos', trapezoid: 'Trapecio (óptimo en el medio)', target: 'Valor objetivo (± tolerancia)', up: 'Más es mejor', down: 'Menos es mejor', classes: 'Por clases' };

function defaultFn(type: FnSpec['type'], min: number, max: number): FnSpec {
  const span = max > min ? max - min : 1;
  const q = (f: number) => Math.round((min + span * f) * 1000) / 1000;
  switch (type) {
    case 'steps': return { type, breaks: [q(0.33), q(0.66)], scores: [0, 0.5, 1] };
    case 'trapezoid': return { type, a: q(0), b: q(0.3), c: q(0.7), d: q(1) };
    case 'target': return { type, value: q(0.5), tol: q(0.5 + 0.03) - q(0.5), falloff: q(0.5 + 0.25) - q(0.5) };
    case 'up': return { type, a: q(0), b: q(1) };
    case 'down': return { type, a: q(0), b: q(1) };
    case 'classes': return { type, map: {} };
  }
}

/** Rango del eje X de la vista previa: para reglas por rangos se acerca a la zona donde ocurren los cortes. */
function previewRange(fn: FnSpec, min: number, max: number): [number, number] {
  if (fn.type === 'target') {
    const reach = (Math.max(0, fn.tol) + Math.max(fn.falloff, 1e-9)) * 1.4;
    const lo = Math.max(min, fn.value - reach), hi = Math.min(max, fn.value + reach);
    return hi > lo ? [lo, hi] : [min, min + 1];
  }
  const top = fn.type === 'steps' && fn.breaks.length ? Math.max(...fn.breaks) : 0;
  const hi = top > 0 ? Math.min(max, top * 2.2) : max;
  return [min, hi > min ? hi : min + 1];
}

function Preview({ fn, min, max }: { fn: FnSpec; min: number; max: number }) {
  const d = useMemo(() => {
    const [lo, hi] = previewRange(fn, min, max), N = 120;
    const pts: string[] = [];
    for (let i = 0; i <= N; i++) {
      const x = lo + ((hi - lo) * i) / N;
      const s = suitability(x, fn);
      pts.push(`${(i / N) * 100},${Number.isNaN(s) ? 30 : 30 - s * 28}`);
    }
    return 'M' + pts.join(' L');
  }, [fn, min, max]);
  return (
    <svg className="gv-prev" viewBox="0 0 100 32" preserveAspectRatio="none" aria-label="Vista previa de la regla">
      <line x1="0" y1="30" x2="100" y2="30" className="ax" /><line x1="0" y1="2" x2="100" y2="2" className="ax dash" />
      <path d={d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function FnEditor({ fn, onChange, min, max }: { fn: FnSpec; onChange: (f: FnSpec) => void; min: number; max: number }) {
  if (fn.type === 'steps') {
    const { breaks, scores } = fn;
    const set = (b: number[], s: number[]) => onChange({ type: 'steps', breaks: b, scores: s });
    const sorted = breaks.every((b, i) => i === 0 || b >= breaks[i - 1]);
    return (
      <div className="gv-steps" onBlur={(e) => { if (!sorted && !e.currentTarget.contains(e.relatedTarget as Node | null)) set([...breaks].sort((a, b) => a - b), scores); }}>
        {!sorted && <p className="gv-hint warn">Los cortes deben ir de menor a mayor; se ordenan al salir del campo.</p>}
        {scores.map((s, i) => (
          <div className="gv-step" key={i}>
            <span className="rng">
              {i === 0 ? <>menos de <Num label={`Corte ${i + 1}`} width={64} value={breaks[0] ?? 0} onChange={(n) => set(breaks.map((v, k) => (k === 0 ? n : v)), scores)} /></>
                : i === scores.length - 1 ? <><Num label={`Corte ${i}`} width={64} value={breaks[i - 1]} onChange={(n) => set(breaks.map((v, k) => (k === i - 1 ? n : v)), scores)} /> o más</>
                  : <>de <Num label={`Corte ${i}`} width={64} value={breaks[i - 1]} onChange={(n) => set(breaks.map((v, k) => (k === i - 1 ? n : v)), scores)} /> a <Num label={`Corte ${i + 1}`} width={64} value={breaks[i]} onChange={(n) => set(breaks.map((v, k) => (k === i ? n : v)), scores)} /></>}
            </span>
            <span className="arr" title="idoneidad de este rango">→</span>
            <Num label={`Idoneidad del rango ${i + 1}`} width={56} min={0} max={1} step="0.05" value={s} onChange={(n) => set(breaks, scores.map((v, k) => (k === i ? Math.max(0, Math.min(1, n)) : v)))} />
          </div>
        ))}
        <div className="gv-step-acts">
          <button type="button" className="btn sm" onClick={() => { const last = breaks[breaks.length - 1] ?? min; set([...breaks, Math.round((last + (max - last) / 2) * 1000) / 1000], [...scores, 1]); }}>+ rango</button>
          {scores.length > 2 && <button type="button" className="btn sm" onClick={() => set(breaks.slice(0, -1), scores.slice(0, -1))}>− rango</button>}
          <button type="button" className="btn sm" onClick={() => set([...breaks].sort((a, b) => a - b), scores)}>Ordenar cortes</button>
        </div>
      </div>
    );
  }
  if (fn.type === 'target') {
    const f = fn;
    return (
      <div>
        <div className="gv-nums" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <label><span>objetivo</span><Num label="Valor objetivo" value={f.value} onChange={(n) => onChange({ ...f, value: n })} /></label>
          <label><span>± tolerancia</span><Num label="Tolerancia" min={0} value={f.tol} onChange={(n) => onChange({ ...f, tol: Math.max(0, n) })} /></label>
          <label><span>caída</span><Num label="Distancia hasta idoneidad 0" min={0} value={f.falloff} onChange={(n) => onChange({ ...f, falloff: Math.max(0, n) })} /></label>
        </div>
        <p className="gv-hint">Idoneidad 1 si el valor está a ±tolerancia del objetivo; baja linealmente a 0 a «caída» unidades más allá. Sirve para «110 V», «pH 6», «temperatura 25 °C»…</p>
      </div>
    );
  }
  const fields = fn.type === 'trapezoid' ? (['a', 'b', 'c', 'd'] as const) : fn.type === 'up' || fn.type === 'down' ? (['a', 'b'] as const) : [];
  const hint = fn.type === 'trapezoid' ? 'Idoneidad 0 hasta a; sube a 1 en b; 1 hasta c; baja a 0 en d.' : fn.type === 'up' ? 'Idoneidad 0 hasta a; sube linealmente a 1 en b.' : fn.type === 'down' ? 'Idoneidad 1 hasta a; baja linealmente a 0 en b.' : '';
  return (
    <div>
      <div className="gv-nums">
        {fields.map((k) => (
          <label key={k}><span>{k}</span>
            <Num label={`Parámetro ${k}`} value={(fn as never as Record<string, number>)[k]} onChange={(n) => onChange({ ...fn, [k]: n } as FnSpec)} />
          </label>
        ))}
      </div>
      <p className="gv-hint">{hint}</p>
    </div>
  );
}

export default function GeoModelPanel(p: Props) {
  const layerEntries = Object.entries(p.layers).filter(([, l]) => l.role === 'criterion');
  const w = p.exploring && p.exploreWeights ? p.exploreWeights : p.weights;
  const crBad = p.cr >= 0.1;
  return (
    <div className="gv-sec-stack">
      <section className="gv-sec">
        <header>
          <h4>Pesos</h4>
          {p.nExperts > 0
            ? <span className={'gv-cr' + (crBad ? ' bad' : '')}>CR {p.cr.toFixed(3)}{crBad ? ' · revisar' : ''}</span>
            : <span className="gv-cr bad">sin juicios</span>}
        </header>
        {p.nExperts === 0 && <p className="gv-hint">Aún ningún experto ha comparado los criterios (pestaña «Expertos»). Mientras tanto se usan <b>pesos iguales</b>.</p>}
        {p.criteria.map((c, i) => (
          <div className="gv-wbar" key={c.id}>
            <span className="nm" title={c.name}>{c.name}</span><span className="v">{(w[i] ?? 0).toFixed(3)}</span>
            <span className="track"><span className="fill" style={{ width: `${(w[i] ?? 0) * 100}%` }} /></span>
          </div>
        ))}
        <label className="gv-check">
          <input type="checkbox" checked={p.exploring} onChange={(e) => p.onExplore(e.target.checked, e.target.checked ? (p.exploreWeights ?? p.weights.slice()) : null)} /> Explorar otros pesos (no son los del panel)
        </label>
        {p.exploring && (
          <div className="gv-explore">
            {p.criteria.map((c, i) => (
              <label key={c.id}><span title={c.name}>{c.name}</span>
                <input type="range" min={0} max={1} step={0.01} value={p.exploreWeights?.[i] ?? 0} aria-label={`Peso de ${c.name}`}
                  onChange={(e) => { const next = (p.exploreWeights ?? p.weights).slice(); next[i] = Number(e.target.value); p.onExplore(true, next); }} />
                <span className="mono">{(p.exploreWeights?.[i] ?? 0).toFixed(2)}</span>
              </label>
            ))}
            <div className="gv-explore-banner"><span>Se renormalizan al calcular. El panel no cambia.</span><button type="button" onClick={() => p.onExplore(false, null)}>Volver a los del panel</button></div>
          </div>
        )}
      </section>

      <section className="gv-sec">
        <header><h4>Reglas de idoneidad</h4></header>
        <p className="gv-hint">Cómo se traduce el valor de cada capa (una distancia, una temperatura, una profundidad…) a una idoneidad de 0 (mala) a 1 (óptima).</p>
        {p.isPack && <p className="gv-hint warn">Este proyecto usa un <b>paquete de datos del curso</b> (solo lectura): sus criterios ya traen mapa y no se pueden subir mapas propios aquí. Para trabajar con tus datos crea un proyecto nuevo «Mapa de aptitud (SIG)» en blanco.</p>}
        {!p.isPack && layerEntries.length === 0 && p.criteria.length > 0 && <p className="gv-hint">Cada criterio necesita un mapa. Usa <b>«Subir el mapa de este criterio»</b> en cada uno, o carga primero tus archivos en la pestaña «Capas».</p>}
        {p.criteria.map((c) => {
          const rule = p.rules[c.id];
          const info = rule ? p.layers[rule.layerKey] : undefined;
          const missing = rule && !info;
          const min = info?.min ?? 0, max = info?.max ?? 1;
          return (
            <details className="gv-rule" key={c.id} open={!rule || !!missing || p.focusId === c.id}>
              <summary>
                <span className="nm">{c.name}</span>
                <span className={'gv-badge ' + (rule && !missing ? 'ok' : 'warn')}>{!rule ? 'sin capa' : missing ? 'falta la capa' : 'lista'}</span>
              </summary>
              <div className="gv-rule-body">
                <label className="gv-field"><span>Capa que alimenta este criterio</span>
                  <select value={rule && info ? rule.layerKey : ''} disabled={p.readOnlyRules}
                    onChange={(e) => {
                      const key = e.target.value;
                      if (!key) return p.onRule(c.id, undefined);
                      const l = p.layers[key];
                      p.onRule(c.id, { layerKey: key, fn: rule?.fn ?? defaultFn('up', l.min, l.max), veto: rule?.veto });
                    }}>
                    <option value="">— elige una capa —</option>
                    {layerEntries.map(([k, l]) => <option key={k} value={k}>{l.label}{l.unit ? ` (${l.unit})` : ''}</option>)}
                  </select>
                </label>
                {missing && <p className="gv-hint warn">Este criterio espera una capa «{rule.layerKey}» que todavía no has cargado (pestaña «Capas»). La regla de abajo se conserva.</p>}
                {(!rule || missing) && !p.isPack && p.onUploadFor && (
                  <div className="gv-row-acts"><button type="button" className="btn primary sm" onClick={() => p.onUploadFor?.(c.id)}>Subir el mapa de este criterio</button></div>
                )}
                {rule && (
                  <>
                    <label className="gv-field"><span>Tipo de regla</span>
                      <select value={rule.fn.type} disabled={p.readOnlyRules} onChange={(e) => p.onRule(c.id, { ...rule, fn: defaultFn(e.target.value as FnSpec['type'], min, max) })}>
                        {(Object.keys(FN_LABEL) as FnSpec['type'][]).filter((t) => t !== 'classes' || rule.fn.type === 'classes').map((t) => <option key={t} value={t}>{FN_LABEL[t]}</option>)}
                      </select>
                    </label>
                    <FnEditor fn={rule.fn} min={min} max={max} onChange={(fn) => p.onRule(c.id, { ...rule, fn })} />
                    <Preview fn={rule.fn} min={min} max={max} />
                    <div className="gv-prev-x mono"><span>{previewRange(rule.fn, min, max)[0].toFixed(0)}</span><span>{info?.unit || 'valor de la capa'}</span><span>{previewRange(rule.fn, min, max)[1].toFixed(0)}</span></div>
                    <label className="gv-check">
                      <input type="checkbox" checked={!!rule.veto} onChange={(e) => p.onRule(c.id, { ...rule, veto: e.target.checked ? { op: '<', value: min } : undefined })} /> Veto (deja la idoneidad en 0, sin importar los demás criterios)
                    </label>
                    {rule.veto && (
                      <div className="gv-veto">
                        <span>si valor</span>
                        <select value={rule.veto.op} onChange={(e) => p.onRule(c.id, { ...rule, veto: { ...rule.veto!, op: e.target.value as '<' | '>' | '<=' | '>=' } })}>
                          {['<', '<=', '>', '>='].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <Num label="Valor del veto" value={rule.veto.value} onChange={(n) => p.onRule(c.id, { ...rule, veto: { ...rule.veto!, value: n } })} />
                      </div>
                    )}
                    <p className="gv-hint mono">{describeFn(rule.fn)}</p>
                  </>
                )}
              </div>
            </details>
          );
        })}
        {p.criteria.length === 0 && <p className="gv-hint">Define primero los criterios en la pestaña «Proyecto».</p>}
      </section>

      <section className="gv-sec">
        <header><h4>Clases del mapa</h4></header>
        <div className="gv-class-row"><i style={{ background: 'var(--geo-alta)' }} /><span>Alta aptitud desde (%)</span>
          <Num label="Umbral alta" width={62} min={0} max={100} value={Math.round(p.thresholds.alta * 100)} onChange={(n) => p.onThresholds({ ...p.thresholds, alta: Math.max(0, Math.min(100, n)) / 100 })} /></div>
        <div className="gv-class-row"><i style={{ background: 'var(--geo-media)' }} /><span>Moderada desde (%)</span>
          <Num label="Umbral moderada" width={62} min={0} max={100} value={Math.round(p.thresholds.media * 100)} onChange={(n) => p.onThresholds({ ...p.thresholds, media: Math.max(0, Math.min(100, n)) / 100 })} /></div>
        <div className="gv-class-row"><i style={{ background: 'var(--geo-noapta)' }} /><span>No apta / vetada</span><span /></div>
        <div className="gv-class-row"><i style={{ background: 'var(--geo-excl)' }} /><span>Exclusión</span><span /></div>
      </section>

      <section className="gv-sec">
        <header><h4>Parcelas contiguas</h4></header>
        <p className="gv-hint">Muchos proyectos (una finca solar, un cultivo) necesitan un área mínima de un solo cuerpo. Aquí se buscan los grupos de celdas de <b>alta aptitud</b> que se tocan y suman al menos ese tamaño.</p>
        <div className="gv-class-row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto auto' }}>
          <span>Área mínima de la parcela</span>
          <Num label="Área mínima en hectáreas" width={80} min={0} value={p.minPatchHa} onChange={(n) => p.onMinPatch(Math.max(0, n))} /><span className="mono muted">ha</span>
        </div>
        {p.minPatchHa > 0 && p.parcels && (
          <>
            <p className="gv-hint"><b>{p.parcels.length}</b> parcela(s) de ≥ {p.minPatchHa} ha{p.parcels.length ? ` · suman ${p.parcels.reduce((a, x) => a + x.ha, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })} ha · la mayor ${p.parcels[0].ha.toLocaleString('es-CO', { maximumFractionDigits: 0 })} ha` : '. Prueba con un mínimo menor o revisa los umbrales de clase.'}. Se ven en la capa «Parcelas» y salen en los exportables.</p>
            {p.parcels.slice(0, 8).map((x) => (
              <button type="button" className="gv-parcel" key={x.id} onClick={() => p.onFlyTo(x.col, x.row)} title="Ir a esta parcela">
                <b>#{x.id}</b><span>{x.ha.toLocaleString('es-CO', { maximumFractionDigits: 0 })} ha</span><span className="mono">media {x.meanPct.toFixed(0)}%</span>
              </button>
            ))}
            {p.parcels.length > 8 && <p className="gv-hint">…y {p.parcels.length - 8} más en el CSV de parcelas.</p>}
          </>
        )}
      </section>

      <section className="gv-sec">
        <header><h4>Comparar escenarios</h4></header>
        <p className="gv-hint">Guarda el resultado actual, cambia pesos, reglas o umbrales, y mira qué mejoró y qué empeoró (capa «Diferencia»). El escenario guardado vive solo en esta sesión.</p>
        {!p.baseline ? (
          <div className="gv-row-acts"><button type="button" className="btn sm" disabled={!p.stats} onClick={() => p.onSaveBaseline('A')}>Guardar el estado actual como escenario A</button></div>
        ) : (
          <>
            <div className="gv-cmp">
              <span /><b>A</b><b>Ahora</b><b>Δ ha</b>
              {([['Alta', 'alta'], ['Moderada', 'media'], ['No apta', 'noapta']] as const).map(([lbl, k]) => {
                const a = p.baseline!.stats[k].ha, b = p.stats?.[k].ha ?? 0, d = b - a;
                return (
                  <div className="row" key={k}>
                    <span>{lbl}</span><span className="mono">{a.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span><span className="mono">{b.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                    <span className="mono" style={{ color: d === 0 ? undefined : (k === 'noapta' ? d > 0 : d < 0) ? 'var(--geo-noapta)' : 'var(--geo-alta)' }}>{d > 0 ? '+' : ''}{d.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                  </div>
                );
              })}
            </div>
            <div className="gv-row-acts">
              <button type="button" className="btn sm" onClick={() => p.onSaveBaseline('A')}>Reemplazar A por el estado actual</button>
              <button type="button" className="btn sm" onClick={p.onClearBaseline}>Quitar la comparación</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
