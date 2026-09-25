'use client';

/** Controles flotantes del mapa que comparten el geovisor del dueño y la vista pública. */
import { rampColor, CLASS_HEX } from '@/lib/geo/paint';
import { CLASS_ALTA, CLASS_EXCLUDED, CLASS_MODERADA, CLASS_NO_APTA } from '@/lib/geo/suitability';
import { BASEMAPS, type BasemapKey } from './GeoMap';

export function BasemapChips({ value, onChange }: { value: BasemapKey; onChange: (k: BasemapKey) => void }) {
  return (
    <div className="gv-chips" role="group" aria-label="Mapa base">
      {(Object.keys(BASEMAPS) as BasemapKey[]).map((k) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}>{BASEMAPS[k].label}</button>
      ))}
    </div>
  );
}

export function StyleChips({ value, onChange }: { value: 'continuous' | 'classes'; onChange: (v: 'continuous' | 'classes') => void }) {
  return (
    <div className="gv-chips" role="group" aria-label="Estilo del resultado">
      <button type="button" aria-pressed={value === 'continuous'} onClick={() => onChange('continuous')}>Continuo</button>
      <button type="button" aria-pressed={value === 'classes'} onClick={() => onChange('classes')}>3 clases</button>
    </div>
  );
}

export function ResultLegend({ style, thresholds, title = 'Idoneidad AHP + SIG' }: { style: 'continuous' | 'classes'; thresholds: { alta: number; media: number }; title?: string }) {
  return (
    <div className="gv-legend">
      <b>{title}</b>
      {style === 'continuous' ? (
        <>
          <div className="ramp" style={{ background: `linear-gradient(90deg, ${[0, 0.5, 1].map((t) => { const [r, g, b] = rampColor(t); return `rgb(${r},${g},${b})`; }).join(',')})` }} />
          <div className="ends mono"><span>0</span><span>50</span><span>100</span></div>
        </>
      ) : (
        <>
          <div className="row"><i style={{ background: CLASS_HEX[CLASS_ALTA] }} />Alta · ≥ {Math.round(thresholds.alta * 100)}</div>
          <div className="row"><i style={{ background: CLASS_HEX[CLASS_MODERADA] }} />Moderada · {Math.round(thresholds.media * 100)}–{Math.round(thresholds.alta * 100)}</div>
          <div className="row"><i style={{ background: CLASS_HEX[CLASS_NO_APTA] }} />No apta · &lt; {Math.round(thresholds.media * 100)}</div>
        </>
      )}
      <div className="row"><i style={{ background: CLASS_HEX[CLASS_EXCLUDED] }} />Exclusión</div>
    </div>
  );
}
