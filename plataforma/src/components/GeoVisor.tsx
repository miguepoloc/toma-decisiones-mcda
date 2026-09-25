'use client';

/** Geovisor AHP + SIG (`kind:'spatial'`, ver plataforma/docs/PLAN_geovisor_ahp_sig.md). Carga un
 * paquete estático del catálogo (`public/geo-packs/`, generado por scripts/geo/export_pack.py),
 * calcula la idoneidad en el navegador con los pesos REALES del panel de expertos (mismo mecanismo
 * que ya usan TOPSIS/VIKOR/…, `sheetResult(CRIT_SHEET,…)` de ahp.ts) y pinta el resultado en un
 * canvas. Primera entrega: solo el paquete `snsm-cacao-v1`, sin carga de capas propias ni
 * publicación pública — ver el plan para lo que sigue.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CRIT_SHEET, sheetResult, type JIndex } from '@/lib/ahp';
import { lonLatToPixel, pixelToLonLat, type Transform } from '@/lib/geo/crs';
import { loadPack, type LoadedPack } from '@/lib/geo/pack';
import { suitability, vetoed } from '@/lib/geo/membership';
import {
  CLASS_ALTA, CLASS_EXCLUDED, CLASS_MODERADA, CLASS_NO_APTA, CLASS_VETO,
  evaluateGrid, hectaresByClass, MASK_EXCLUDED, MASK_NODATA, MASK_VALID, type CriterionRule,
} from '@/lib/geo/suitability';
import type { Criterion, ExpertRow, GeoConfig } from '@/lib/types';

type Props = {
  criteria: Criterion[];
  experts: ExpertRow[];
  idx: JIndex;
  geo: GeoConfig;
  onPatchClasses: (classes: GeoConfig['classes']) => void;
};

const CLASS_COLOR: Record<number, string> = {
  [CLASS_EXCLUDED]: '#7F8C8D', [CLASS_NO_APTA]: '#D9534F', [CLASS_MODERADA]: '#F0AD4E',
  [CLASS_ALTA]: '#2E7D32', [CLASS_VETO]: '#D9534F',
};
const CLASS_LABEL: Record<number, string> = {
  [CLASS_EXCLUDED]: 'Exclusión legal', [CLASS_NO_APTA]: 'No apta', [CLASS_MODERADA]: 'Moderada',
  [CLASS_ALTA]: 'Alta aptitud', [CLASS_VETO]: 'Vetada',
};

/** Rampa continua roja→amarilla→verde (RdYlGn simplificado), como el notebook 07. t en [0,1]. */
function rampColor(t: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0, [217, 83, 79]], [0.5, [240, 173, 78]], [1, [46, 125, 50]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i]; const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
      return [Math.round(c0[0] + (c1[0] - c0[0]) * f), Math.round(c0[1] + (c1[1] - c0[1]) * f), Math.round(c0[2] + (c1[2] - c0[2]) * f)];
    }
  }
  return stops[stops.length - 1][1];
}

const ZOOMS = [1, 1.5, 2, 2.5, 3];

export default function GeoVisor({ criteria, experts, idx, geo, onPatchClasses }: Props) {
  const [pack, setPack] = useState<LoadedPack | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [layerView, setLayerView] = useState('result');
  const [opacity, setOpacity] = useState(0.92);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [thresholds, setThresholds] = useState(geo.classes);
  const [exploring, setExploring] = useState(false);
  const [exploreWeights, setExploreWeights] = useState<number[] | null>(null);
  const [selected, setSelected] = useState<{ col: number; row: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    loadPack(geo.packId, (l, t) => alive && setProgress(l / t)).then((p) => alive && setPack(p))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => { alive = false; };
  }, [geo.packId]);

  const expertIds = useMemo(() => experts.filter((e) => Object.keys(idx[e.id] ?? {}).length > 0).map((e) => e.id), [experts, idx]);
  const weightResult = useMemo(() => sheetResult(CRIT_SHEET, criteria, expertIds, idx), [criteria, expertIds, idx]);

  // Reglas alineadas con `criteria` (mismo orden que weightResult.agg.w); un criterio sin regla en
  // `geo.rules` (todavía sin configurar) se excluye del cálculo, no rompe el geovisor.
  const rules = useMemo<CriterionRule[]>(() => {
    const weights = exploring && exploreWeights ? exploreWeights : weightResult.agg.w;
    const out: CriterionRule[] = [];
    criteria.forEach((c, i) => {
      const rule = geo.rules[c.id];
      if (!rule) return;
      const cr: CriterionRule = { key: rule.layerKey, weight: weights[i] ?? 0, fn: rule.fn };
      if (rule.veto) cr.veto = rule.veto;
      out.push(cr);
    });
    return out;
  }, [criteria, geo.rules, weightResult.agg.w, exploring, exploreWeights]);

  const grid = useMemo(() => {
    if (!pack) return null;
    return evaluateGrid(pack.layers, pack.mask, rules, thresholds);
  }, [pack, rules, thresholds]);

  const stats = useMemo(() => (grid && pack ? hectaresByClass(grid.cls, pack.manifest.grid.haPerPixel) : null), [grid, pack]);

  // Pinta el canvas cuando cambia la grilla calculada o la capa que se está mostrando.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pack || !grid) return;
    const { width: W, height: H } = pack.manifest.grid;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(W, H);
    const layerData = layerView !== 'result' && layerView !== 'mask' ? pack.layers[layerView] : null;
    const rule = layerView !== 'result' && layerView !== 'mask' ? Object.values(geo.rules).find((r) => r.layerKey === layerView) : null;
    for (let i = 0; i < W * H; i++) {
      const maskCode = pack.mask[i];
      let rgb: [number, number, number] | null = null;
      let a = 255;
      if (maskCode === MASK_NODATA) { a = 0; }
      else if (maskCode === MASK_EXCLUDED) { rgb = [127, 140, 141]; }
      else if (layerView === 'mask') { rgb = [132, 204, 22]; }
      else if (layerData && rule) {
        const v = layerData[i];
        rgb = Number.isNaN(v) ? null : rampColor(suitability(v, rule.fn));
        if (rgb === null) a = 0;
      } else {
        const pct = grid.pct[i];
        rgb = pct === 255 ? null : rampColor(pct / 100);
        if (rgb === null) a = 0;
      }
      if (rgb) { img.data[i * 4] = rgb[0]; img.data[i * 4 + 1] = rgb[1]; img.data[i * 4 + 2] = rgb[2]; img.data[i * 4 + 3] = a; }
      else { img.data[i * 4 + 3] = 0; }
    }
    ctx.putImageData(img, 0, 0);
  }, [pack, grid, layerView, geo.rules]);

  const pickPixel = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !pack) return;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor(((clientX - rect.left) / rect.width) * pack.manifest.grid.width);
    const row = Math.floor(((clientY - rect.top) / rect.height) * pack.manifest.grid.height);
    if (col < 0 || row < 0 || col >= pack.manifest.grid.width || row >= pack.manifest.grid.height) return;
    setSelected({ col, row });
  }, [pack]);

  const scale = ZOOMS[zoomIdx];
  const clampPan = (p: { x: number; y: number }) => {
    const max = 40 * (scale - 1) + 10;
    return { x: Math.max(-max, Math.min(max, p.x)), y: Math.max(-max, Math.min(max, p.y)) };
  };

  if (error) return <div className="banner"><span><b>No se pudo cargar el mapa:</b> {error}</span></div>;
  if (!pack) return <div className="card muted">Cargando capas del paquete «{geo.packId}»… {Math.round(progress * 100)}%</div>;

  const point = selected ? evaluateOnePoint(pack, geo, rules, thresholds, selected) : null;
  const crBad = weightResult.agg.cr >= 0.10;

  return (
    <div className="gv-grid">
      <div className="card gv-panel">
        <header><h3 className="eyebrow">Modelo</h3></header>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="lbl" style={{ margin: 0 }}>Pesos · AHP</span>
            <span className={'gv-cr' + (crBad ? ' bad' : '')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 6 9 17l-5-5" /></svg>
              CR {weightResult.agg.cr.toFixed(2)}
            </span>
          </div>
          {criteria.map((c, i) => {
            const w = (exploring && exploreWeights ? exploreWeights : weightResult.agg.w)[i] ?? 0;
            return (
              <div className="gv-wbar" key={c.id}>
                <span className="nm">{c.name}</span><span className="v">{w.toFixed(2)}</span>
                <span className="track"><span className="fill" style={{ width: `${w * 100}%` }} /></span>
              </div>
            );
          })}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={exploring} onChange={(e) => {
            setExploring(e.target.checked);
            if (e.target.checked && !exploreWeights) setExploreWeights(weightResult.agg.w.slice());
          }} /> Explorar pesos
        </label>
        {exploring && (
          <>
            {criteria.map((c, i) => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, fontSize: 12 }}>
                <input type="range" min={0} max={1} step={0.01} value={exploreWeights?.[i] ?? 0}
                  onChange={(e) => setExploreWeights((prev) => {
                    const next = (prev ?? weightResult.agg.w.slice()).slice();
                    next[i] = Number(e.target.value);
                    return next;
                  })} />
                <span className="mono muted">{((exploreWeights?.[i] ?? 0)).toFixed(2)}</span>
              </div>
            ))}
            <div className="gv-explore-banner">
              <span>No son los pesos del panel.</span>
              <button type="button" onClick={() => { setExploring(false); setExploreWeights(null); }}>Volver</button>
            </div>
          </>
        )}
        <div>
          <span className="lbl">Clases del mapa</span>
          <div className="gv-class-row">
            <i style={{ background: 'var(--geo-alta)' }} /><span>Alta aptitud ≥</span>
            <input type="number" min={0} max={100} value={Math.round(thresholds.alta * 100)}
              onChange={(e) => { const v = { ...thresholds, alta: Number(e.target.value) / 100 }; setThresholds(v); onPatchClasses(v); }} />
          </div>
          <div className="gv-class-row">
            <i style={{ background: 'var(--geo-media)' }} /><span>Moderada ≥</span>
            <input type="number" min={0} max={100} value={Math.round(thresholds.media * 100)}
              onChange={(e) => { const v = { ...thresholds, media: Number(e.target.value) / 100 }; setThresholds(v); onPatchClasses(v); }} />
          </div>
          <div className="gv-class-row"><i style={{ background: 'var(--geo-noapta)' }} /><span>No apta / vetada</span><span /></div>
          <div className="gv-class-row"><i style={{ background: 'var(--geo-excl)' }} /><span>Exclusión legal</span><span /></div>
        </div>
      </div>

      <div>
        <div className="gv-map">
          <div ref={mapRef} className="gv-map-inner" style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})` }}
            onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, moved: false }; (e.target as Element).setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
              if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true;
              if (scale > 1) setPan((p) => clampPan({ x: p.x + dx, y: p.y + dy }));
              drag.current.x = e.clientX; drag.current.y = e.clientY;
            }}
            onPointerUp={(e) => { if (drag.current && !drag.current.moved) pickPixel(e.clientX, e.clientY); drag.current = null; }}
          >
            <img src={`/geo-packs/${geo.packId}/${pack.manifest.base}`} alt="" />
            <canvas ref={canvasRef} style={{ opacity }} />
            {Object.entries(pack.manifest.points).map(([name, p]) => {
              const [col, row] = lonLatToPixel(p.lon, p.lat, pack.manifest.grid.transform as Transform, pack.manifest.grid.crs);
              const left = (col / pack.manifest.grid.width) * 100, top = (row / pack.manifest.grid.height) * 100;
              const isSel = selected && selected.col === Math.round(col) && selected.row === Math.round(row);
              return (
                <button key={name} type="button" className={'marker' + (isSel ? ' sel' : '')}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setSelected({ col: Math.round(col), row: Math.round(row) }); }}
                  title={name} aria-label={`Ver ${name}`} />
              );
            })}
          </div>
          <div className="gv-hud">
            <div className="grp">
              <label className="lbl" style={{ margin: 0, fontSize: 10 }}>Capa</label>
              <select value={layerView} onChange={(e) => setLayerView(e.target.value)}>
                <option value="result">Resultado</option>
                {Object.entries(pack.manifest.layers).map(([key, l]) => <option key={key} value={key}>{l.label} (s)</option>)}
                <option value="mask">Exclusiones</option>
              </select>
            </div>
            <div className="grp">
              <label className="lbl" style={{ margin: 0, fontSize: 10 }}>Opacidad</label>
              <input type="range" min={0} max={1} step={0.01} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
            </div>
            <div className="gv-zoom">
              <button type="button" disabled={zoomIdx >= ZOOMS.length - 1} onClick={() => setZoomIdx((z) => Math.min(ZOOMS.length - 1, z + 1))}>+</button>
              <button type="button" disabled={zoomIdx === 0} onClick={() => { setZoomIdx((z) => Math.max(0, z - 1)); setPan({ x: 0, y: 0 }); }}>−</button>
            </div>
          </div>
          <div className="gv-legend">
            <b style={{ font: '600 11px var(--f-body)' }}>{layerView === 'result' ? 'Idoneidad biofísica' : layerView === 'mask' ? 'Exclusiones' : pack.manifest.layers[layerView]?.label}</b>
            {layerView !== 'mask' && <>
              <div className="row"><i style={{ background: 'var(--geo-alta)' }} />Alta · ≥ {Math.round(thresholds.alta * 100)}</div>
              <div className="row"><i style={{ background: 'var(--geo-media)' }} />Moderada · {Math.round(thresholds.media * 100)}–{Math.round(thresholds.alta * 100)}</div>
              <div className="row"><i style={{ background: 'var(--geo-noapta)' }} />No apta · &lt; {Math.round(thresholds.media * 100)}</div>
            </>}
            <div className="row"><i style={{ background: 'var(--geo-excl)' }} />Exclusión legal</div>
          </div>
        </div>

        {stats && (
          <div className="card gv-stats" style={{ marginTop: 14 }}>
            <div className="bars">
              {[CLASS_ALTA, CLASS_MODERADA, CLASS_NO_APTA, CLASS_EXCLUDED].map((c) => {
                const ha = (stats[c] ?? 0) + (c === CLASS_NO_APTA ? (stats[CLASS_VETO] ?? 0) : 0);
                const total = pack.manifest.grid.width * pack.manifest.grid.height * pack.manifest.grid.haPerPixel;
                return (
                  <div className="brow" key={c}>
                    <span>{CLASS_LABEL[c]}</span>
                    <span className="track"><span className="fill" style={{ width: `${(ha / total) * 100}%`, background: CLASS_COLOR[c] }} /></span>
                    <span className="mono">{ha.toLocaleString('es-CO', { maximumFractionDigits: 0 })} ha</span>
                  </div>
                );
              })}
            </div>
            <div className="muted mono" style={{ fontSize: 12 }}>
              Total: {(pack.manifest.grid.width * pack.manifest.grid.height * pack.manifest.grid.haPerPixel).toLocaleString('es-CO', { maximumFractionDigits: 0 })} ha ({pack.manifest.grid.resM}×{pack.manifest.grid.resM} m/píxel)
            </div>
          </div>
        )}

        <div className="acts" style={{ marginTop: 14 }}>
          <button type="button" className="btn primary" onClick={() => downloadPng(canvasRef.current, pack.manifest.title)}>Descargar PNG</button>
          <span className="muted" style={{ fontSize: 12.5 }}>GeoTIFF y publicar: próxima entrega.</span>
        </div>
      </div>

      <div className="card gv-panel gv-point">
        <header><h3 className="eyebrow">Punto consultado</h3></header>
        {!point ? (
          <div className="gv-point-empty">Haz clic en el mapa, o en uno de los 4 puntos de referencia, para ver su idoneidad.</div>
        ) : (
          <>
            <div className="big">{point.pct === null ? '—' : `${point.pct}%`}</div>
            <span className="cls-pill" style={{ background: `color-mix(in srgb, ${CLASS_COLOR[point.cls]} 20%, transparent)`, color: CLASS_COLOR[point.cls] }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: CLASS_COLOR[point.cls], display: 'inline-block' }} />
              {CLASS_LABEL[point.cls]}
            </span>
            <div className="gv-point-coords">{point.lat.toFixed(4)}, {point.lon.toFixed(4)}{point.near ? <><br />cerca de {point.near}</> : null}</div>
            <div className="gv-point-tbl">
              {point.rows.map((r) => (
                <div className={'r' + (r.veto ? ' veto' : '')} key={r.label}>
                  <span className="rl"><span className="k">{r.label}</span><span className="pv">{r.value}</span></span>
                  <span className="pc">{r.contrib}</span>
                </div>
              ))}
            </div>
            <div className="gv-disclaimer">Índice de idoneidad 0–100, no una probabilidad.</div>
          </>
        )}
      </div>
    </div>
  );
}

function downloadPng(canvas: HTMLCanvasElement | null, title: string) {
  if (!canvas) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  a.click();
}

function evaluateOnePoint(
  pack: LoadedPack, geo: GeoConfig, rules: CriterionRule[], thresholds: GeoConfig['classes'],
  sel: { col: number; row: number },
) {
  const { width: W } = pack.manifest.grid;
  const i = sel.row * W + sel.col;
  const maskCode = pack.mask[i];
  const [lon, lat] = pixelToLonLat(sel.col, sel.row, pack.manifest.grid.transform as Transform, pack.manifest.grid.crs);
  let near: string | null = null;
  let nearD = Infinity;
  for (const [name, p] of Object.entries(pack.manifest.points)) {
    const d = Math.hypot(p.lon - lon, p.lat - lat);
    if (d < nearD) { nearD = d; near = d < 0.01 ? name : null; }
  }
  if (maskCode !== MASK_VALID) {
    return { pct: null, cls: CLASS_EXCLUDED, lat, lon, near, rows: [] as { label: string; value: string; contrib: string; veto: boolean }[] };
  }
  let sum = 0, wUsed = 0, anyVeto = false;
  const rows = rules.map((r) => {
    const layerMeta = pack.manifest.layers[r.key];
    const x = pack.layers[r.key][i];
    const s = suitability(x, r.fn);
    const veto = vetoed(x, r.veto);
    if (veto) anyVeto = true;
    if (!Number.isNaN(x)) { sum += r.weight * s; wUsed += r.weight; }
    const value = Number.isNaN(x) ? 'sin dato' : `${x.toFixed(1)}${layerMeta?.unit ?? ''}`;
    return { label: layerMeta?.label ?? r.key, value, contrib: `${s.toFixed(2)} × ${r.weight.toFixed(2)}`, veto };
  });
  const s = wUsed === 0 ? NaN : anyVeto ? 0 : sum / wUsed;
  const cls = anyVeto ? CLASS_VETO : s >= thresholds.alta ? CLASS_ALTA : s >= thresholds.media ? CLASS_MODERADA : CLASS_NO_APTA;
  return { pct: Number.isNaN(s) ? null : Math.round(s * 100), cls, lat, lon, near, rows };
}
