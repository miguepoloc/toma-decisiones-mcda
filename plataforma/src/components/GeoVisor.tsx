'use client';

/** Geovisor AHP + SIG (`kind:'spatial'`, ver plataforma/docs/PLAN_geovisor_ahp_sig.md). Mapa web real
 * (Leaflet) con mapa base mundial; el cálculo de idoneidad corre en el navegador con los pesos del
 * panel de expertos (mismo `sheetResult(CRIT_SHEET,…)` que usan los demás métodos). Los datos vienen
 * de un paquete del catálogo (`geo.packId`) o de las capas propias del estudiante (`geo.grid` +
 * `geo.layers`, en Storage). Este componente coordina; las pestañas viven en GeoLayersPanel,
 * GeoModelPanel y GeoExportPanel. */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CRIT_SHEET, sheetResult, type JIndex } from '@/lib/ahp';
import { gridBoundsLonLat, type Bounds } from '@/lib/geo/grid';
import { lonLatToPixel, pixelToLonLat } from '@/lib/geo/crs';
import { buildMask, fromPack, type GeoData, type LayerInfo } from '@/lib/geo/data';
import { buildOverlayMap, gather, type OverlayMap } from '@/lib/geo/overlay';
import { loadPack } from '@/lib/geo/pack';
import { CLASS_HEX, CLASS_LABEL, paintCriterion, paintFlag, paintRaw, paintResult, rampColor } from '@/lib/geo/paint';
import { describeFn, describeVeto, suitability, vetoed } from '@/lib/geo/membership';
import { downloadLayer } from '@/lib/geo/store';
import {
  areaStats, CLASS_ALTA, CLASS_EXCLUDED, CLASS_MODERADA, CLASS_NO_APTA, CLASS_VETO, evaluateGrid, MASK_VALID, type CriterionRule,
} from '@/lib/geo/suitability';
import { kmz, pixelsCsv, qmlClasses, qmlPct, resultRaster, slug, toGeoTiff, zipFiles } from '@/lib/geo/export';
import { downloadGeoExcelBytes, type GeoSummary } from '@/lib/geoExcel';
import type { Criterion, ExpertRow, GeoConfig } from '@/lib/types';
import type { ExampleId } from '@/lib/geo/examples';
import { EXAMPLE_IDS, buildExample } from '@/lib/geo/examples';
import GeoMap, { BASEMAPS, type BasemapKey, type GeoMapHandle, type MapMarker, type RasterOverlay } from './GeoMap';
import GeoLayersPanel, { type VecItem, type VisState } from './GeoLayersPanel';
import GeoModelPanel from './GeoModelPanel';
import { Icon, ICONS } from './GeoBits';

type Props = {
  projectId: string; ownerId: string; title: string; objective: string;
  criteria: Criterion[]; experts: ExpertRow[]; idx: JIndex; geo: GeoConfig;
  supabase: SupabaseClient | null;
  onChangeGeo: (g: GeoConfig, immediate?: boolean) => void;
  onApplyExample: (id: ExampleId) => void;
};

type Tab = 'capas' | 'modelo' | 'exportar';
type Deps = unknown[];
const sameDeps = (a: Deps, b: Deps) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Reproyecta `rgba` (grilla) a la imagen del mapa y la deja en un canvas. */
function toCanvas(map: OverlayMap, rgba: Uint32Array): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = map.width; cv.height = map.height;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(map.width, map.height);
  img.data.set(new Uint8ClampedArray(gather(map, rgba).buffer));
  ctx.putImageData(img, 0, 0);
  return cv;
}
const toUrl = (map: OverlayMap, rgba: Uint32Array) => toCanvas(map, rgba).toDataURL('image/png');

function saveBytes(name: string, bytes: Uint8Array | string, mime: string) {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const canvasBytes = (cv: HTMLCanvasElement) => new Promise<Uint8Array>((res, rej) => cv.toBlob(async (b) => (b ? res(new Uint8Array(await b.arrayBuffer())) : rej(new Error('No se pudo generar el PNG'))), 'image/png'));

export default function GeoVisor(props: Props) {
  const { criteria, experts, idx, geo, supabase } = props;
  const [tab, setTab] = useState<Tab>('capas');
  const [data, setData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [lost, setLost] = useState(0);
  const [basemap, setBasemap] = useState<BasemapKey>('sat');
  const [style, setStyle] = useState<'continuous' | 'classes'>('continuous');
  const [vis, setVis] = useState<VisState>({});
  const [vecs, setVecs] = useState<VecItem[]>([]);
  const [selected, setSelected] = useState<{ col: number; row: number } | null>(null);
  const [thresholds, setThresholds] = useState(geo.classes);
  const [exploring, setExploring] = useState(false);
  const [exploreWeights, setExploreWeights] = useState<number[] | null>(null);
  const [draft, setDraft] = useState<Bounds | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [imgs, setImgs] = useState<Record<string, string>>({});
  const [expMsg, setExpMsg] = useState('');
  const [expBusy, setExpBusy] = useState('');

  const mapRef = useRef<GeoMapHandle>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const geoRef = useRef(geo);
  const cache = useRef<Record<string, Float32Array>>({});
  const paintCache = useRef(new Map<string, { deps: Deps; url: string }>());

  useEffect(() => { geoRef.current = geo; }, [geo]);
  const commit = useCallback((mutate: (g: GeoConfig) => GeoConfig) => {
    const next = mutate(geoRef.current);
    geoRef.current = next;
    props.onChangeGeo(next, true);
  }, [props]);

  // ------------------------------------------------------------------ carga de datos
  const gridSig = geo.grid ? JSON.stringify(geo.grid) : '';
  const layersSig = JSON.stringify(Object.entries(geo.layers ?? {}).map(([k, l]) => [k, l.path, l.role, l.bytes, l.min, l.max]));
  useEffect(() => {
    let alive = true;
    setError('');
    (async () => {
      if (geo.packId) {
        setLoading(true); setProgress(0);
        const p = await loadPack(geo.packId, (l, t) => alive && setProgress(l / t));
        if (alive) { setData(fromPack(p)); setLost(0); }
      } else if (geo.grid) {
        const metas = geo.layers ?? {};
        // La caché la llenan también las cargas en curso (GeoLayersPanel), así que aquí nunca se
        // purga por comparación con `geo.layers` — un render intermedio la vaciaría a mitad de un
        // lote. Solo se descarta al quedar el proyecto sin capas; borrar una capa o cambiar el área
        // limpia la caché de forma explícita en GeoLayersPanel.
        if (!Object.keys(metas).length) cache.current = {};
        const need = Object.keys(metas).filter((k) => !cache.current[k] && metas[k].path);
        if (need.length) setLoading(true);
        let done = 0;
        for (const k of need) {
          if (!supabase) continue;
          cache.current[k] = await downloadLayer(supabase, metas[k].path);
          if (alive) setProgress(++done / need.length);
        }
        if (!alive) return;
        const info: Record<string, LayerInfo> = {}; const layers: Record<string, Float32Array> = {};
        let missing = 0;
        for (const [k, m] of Object.entries(metas)) {
          if (!cache.current[k]) { missing++; continue; }
          layers[k] = cache.current[k];
          info[k] = { label: m.label, unit: m.unit, role: m.role, min: m.min, max: m.max, origin: m.origin, source: m.source, bytes: m.bytes };
        }
        setLost(missing);
        setData({ grid: geo.grid, layers, info, mask: buildMask(geo.grid, layers, info), points: {} });
      } else setData(null);
    })().catch((e) => alive && setError(e instanceof Error ? e.message : String(e))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [geo.packId, gridSig, layersSig, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------ pesos y reglas
  const expertIds = useMemo(() => experts.filter((e) => Object.keys(idx[e.id] ?? {}).length > 0).map((e) => e.id), [experts, idx]);
  const weightResult = useMemo(() => sheetResult(CRIT_SHEET, criteria, expertIds, idx), [criteria, expertIds, idx]);
  const weights = exploring && exploreWeights ? exploreWeights : weightResult.agg.w;

  const rules = useMemo<CriterionRule[]>(() => {
    const out: CriterionRule[] = [];
    criteria.forEach((c, i) => {
      const r = geo.rules[c.id];
      if (!r || !data?.layers[r.layerKey]) return;
      const cr: CriterionRule = { key: r.layerKey, weight: weights[i] ?? 0, fn: r.fn };
      if (r.veto) cr.veto = r.veto;
      out.push(cr);
    });
    return out;
  }, [criteria, geo.rules, weights, data]);
  const dRules = useDeferredValue(rules);
  const dThr = useDeferredValue(thresholds);

  const ev = useMemo(() => (data ? evaluateGrid(data.layers, data.mask, dRules, dThr) : null), [data, dRules, dThr]);
  const stats = useMemo(() => (data && ev ? areaStats(ev.cls, ev.pct, data.mask, data.grid.haPerPixel) : null), [data, ev]);
  const om = useMemo(() => (data ? buildOverlayMap(data.grid, 'mercator') : null), [data]);
  const gridBounds = useMemo(() => (data ? gridBoundsLonLat(data.grid) : null), [data]);

  // Encuadra el área cada vez que cambia la grilla (ejemplo cargado, área nueva…).
  const boundsKey = gridBounds ? [gridBounds.west, gridBounds.south, gridBounds.east, gridBounds.north].map((n) => n.toFixed(4)).join(',') : '';
  useEffect(() => { if (gridBounds) setTimeout(() => mapRef.current?.fit(gridBounds), 60); }, [boundsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------ imágenes sobre el mapa
  const layerIds = data ? Object.keys(data.info).map((k) => `l:${k}`) : [];
  const onIds = ['result', ...layerIds].filter((id) => (vis[id]?.on ?? id === 'result'));
  const onKey = onIds.join('|');
  useEffect(() => {
    if (!data || !om || !ev) { setImgs({}); return; }
    const t = setTimeout(() => {
      const next: Record<string, string> = {};
      for (const id of onKey.split('|').filter(Boolean)) {
        let deps: Deps, paint: () => Uint32Array;
        if (id === 'result') { deps = [data, ev, om, style]; paint = () => paintResult(ev.pct, ev.cls, data.mask, style); }
        else {
          const k = id.slice(2), info = data.info[k];
          const rule = Object.values(geo.rules).find((r) => r.layerKey === k);
          deps = [data, om, rule?.fn];
          paint = () => (info.role === 'exclusion' ? paintFlag(data.layers[k], [127, 140, 141])
            : info.role === 'area' ? paintFlag(data.layers[k], [132, 204, 22])
              : rule ? paintCriterion(data.layers[k], data.mask, rule.fn) : paintRaw(data.layers[k], info.min, info.max));
        }
        const hit = paintCache.current.get(id);
        if (hit && sameDeps(hit.deps, deps)) { next[id] = hit.url; continue; }
        const url = toUrl(om, paint());
        paintCache.current.set(id, { deps, url });
        next[id] = url;
      }
      setImgs(next);
    }, 80);
    return () => clearTimeout(t);
  }, [data, om, ev, style, onKey, geo.rules]);

  const rasters = useMemo<RasterOverlay[]>(() => {
    if (!om) return [];
    return Object.entries(imgs).map(([id, url]) => ({
      id, url, bounds: om.bounds, opacity: vis[id]?.op ?? (id === 'result' ? 0.9 : 0.85), visible: vis[id]?.on ?? id === 'result', z: id === 'result' ? 20 : 10,
    }));
  }, [imgs, om, vis]);

  const vectors = useMemo(() => vecs.map((v) => ({ id: v.id, fc: v.fc, color: v.color, visible: vis[`v:${v.id}`]?.on ?? false })), [vecs, vis]);

  // ------------------------------------------------------------------ punto consultado
  const point = useMemo(() => (selected && data && ev ? evaluateOnePoint(data, geo, rules, thresholds, selected) : null), [selected, data, ev, geo, rules, thresholds]);

  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    if (data) Object.entries(data.points).forEach(([name, p]) => out.push({ id: `ref:${name}`, lat: p.lat, lon: p.lon, label: name }));
    if (selected && data) { const [lon, lat] = pixelToLonLat(selected.col, selected.row, data.grid.transform, data.grid.crs); out.push({ id: 'sel', lat, lon, selected: true }); }
    return out;
  }, [data, selected]);

  const onMapClick = useCallback((lat: number, lon: number) => {
    if (!data) return;
    const [c, r] = lonLatToPixel(lon, lat, data.grid.transform, data.grid.crs);
    const col = Math.round(c), row = Math.round(r);
    if (col < 0 || row < 0 || col >= data.grid.width || row >= data.grid.height) { setSelected(null); return; }
    setSelected({ col, row });
  }, [data]);

  const onMarkerClick = useCallback((id: string) => {
    if (!data || !id.startsWith('ref:')) return;
    const p = data.points[id.slice(4)];
    if (p) onMapClick(p.lat, p.lon);
  }, [data, onMapClick]);

  const onMove = useCallback((lat: number, lon: number) => {
    if (coordRef.current) coordRef.current.textContent = `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`;
  }, []);

  // ------------------------------------------------------------------ exportación
  const base = slug(props.title);
  const summary = useCallback((): GeoSummary => ({
    title: props.title, objective: props.objective, date: new Date().toISOString().slice(0, 10),
    crs: data?.grid.crs ?? '', resM: data?.grid.resM ?? 0, width: data?.grid.width ?? 0, height: data?.grid.height ?? 0,
    cr: weightResult.agg.cr, nExperts: expertIds.length,
    weightsOrigin: exploring ? 'Pesos explorados manualmente (NO son los del panel)' : expertIds.length ? 'Panel de expertos (AHP, media geométrica)' : 'Pesos iguales (sin juicios de expertos)',
    criteria: criteria.map((c, i) => { const r = geo.rules[c.id]; return { name: c.name, weight: weights[i] ?? 0, layer: r ? (data?.info[r.layerKey]?.label ?? r.layerKey) : '—', rule: r ? describeFn(r.fn) : '—', veto: describeVeto(r?.veto) }; }),
    thresholds,
    classes: stats ? [
      { label: 'Alta aptitud', ha: stats.alta.ha, pct: stats.alta.pct }, { label: 'Moderada', ha: stats.media.ha, pct: stats.media.pct },
      { label: 'No apta / vetada', ha: stats.noapta.ha, pct: stats.noapta.pct }, { label: 'Exclusión (fuera del cálculo)', ha: stats.excl.ha, pct: 0 },
    ] : [],
    layers: data ? Object.entries(data.info).map(([k, l]) => ({ key: k, label: l.label, role: l.role, origin: l.origin ?? 'Paquete del catálogo', source: l.source ?? '', unit: l.unit, min: l.min, max: l.max })) : [],
  }), [props.title, props.objective, data, weightResult, expertIds.length, exploring, criteria, geo.rules, weights, thresholds, stats]);

  async function framePng(withBase: boolean): Promise<HTMLCanvasElement> {
    if (!data || !ev || !om || !stats) throw new Error('No hay mapa que exportar.');
    let cv: HTMLCanvasElement;
    let attribution = 'Mapa: solo resultado';
    if (withBase && mapRef.current) {
      cv = await mapRef.current.capture();
      attribution = `Base: ${BASEMAPS[basemap].attr}`;
    } else {
      return toCanvas(om, paintResult(ev.pct, ev.cls, data.mask, style));
    }
    const ctx = cv.getContext('2d')!;
    const W = cv.width, H = cv.height, f = Math.max(1, Math.round(W / 900));
    ctx.font = `700 ${16 * f}px system-ui, sans-serif`;
    const tw = Math.min(W - 24 * f, ctx.measureText(props.title).width + 28 * f);
    ctx.fillStyle = 'rgba(11,15,23,.82)'; ctx.fillRect(12 * f, 12 * f, tw, 50 * f);
    ctx.fillStyle = '#fff'; ctx.fillText(props.title, 24 * f, 34 * f, tw - 24 * f);
    ctx.font = `500 ${11 * f}px system-ui, sans-serif`; ctx.fillStyle = '#CBD5E1';
    ctx.fillText(`Índice de idoneidad AHP + SIG · ${new Date().toLocaleDateString('es-CO')}`, 24 * f, 52 * f, tw - 24 * f);
    const rows = [[CLASS_ALTA, `Alta aptitud (≥ ${Math.round(thresholds.alta * 100)}) · ${stats.alta.pct.toFixed(1)} %`], [CLASS_MODERADA, `Moderada · ${stats.media.pct.toFixed(1)} %`], [CLASS_NO_APTA, `No apta · ${stats.noapta.pct.toFixed(1)} %`], [CLASS_EXCLUDED, 'Exclusión']] as const;
    const lw = 230 * f, lh = (rows.length * 20 + 16) * f;
    ctx.fillStyle = 'rgba(11,15,23,.82)'; ctx.fillRect(W - lw - 12 * f, H - lh - 12 * f, lw, lh);
    rows.forEach(([c, txt], i) => {
      ctx.fillStyle = CLASS_HEX[c]; ctx.fillRect(W - lw - 2 * f, H - lh + (8 + i * 20) * f, 14 * f, 14 * f);
      ctx.fillStyle = '#fff'; ctx.font = `500 ${12 * f}px system-ui, sans-serif`; ctx.fillText(txt, W - lw + 18 * f, H - lh + (19 + i * 20) * f);
    });
    ctx.fillStyle = 'rgba(11,15,23,.7)'; ctx.fillRect(0, H - 16 * f, Math.min(W - lw - 20 * f, 520 * f), 16 * f);
    ctx.fillStyle = '#E2E8F0'; ctx.font = `${9 * f}px system-ui, sans-serif`; ctx.fillText(attribution, 6 * f, H - 5 * f);
    return cv;
  }

  async function run(name: string, fn: () => Promise<void>) {
    setExpBusy(name); setExpMsg('');
    try { await fn(); setExpMsg('Listo: revisa tu carpeta de descargas.'); }
    catch (e) { setExpMsg(e instanceof Error ? e.message : String(e)); }
    setExpBusy('');
  }

  const geotiffPct = async () => { const g = data!.grid; saveBytes(`${base}_idoneidad.tif`, await toGeoTiff(resultRaster(ev!.pct, ev!.cls, data!.mask, 'pct'), g, 255), 'image/tiff'); saveBytes(`${base}_idoneidad.qml`, qmlPct(), 'text/xml'); };
  const geotiffCls = async () => { const g = data!.grid; saveBytes(`${base}_clases.tif`, await toGeoTiff(resultRaster(ev!.pct, ev!.cls, data!.mask, 'classes'), g, 255), 'image/tiff'); saveBytes(`${base}_clases.qml`, qmlClasses(), 'text/xml'); };
  const pngMap = async () => {
    try { saveBytes(`${base}_mapa.png`, await canvasBytes(await framePng(true)), 'image/png'); }
    catch (e) {
      if (e instanceof DOMException && e.name === 'SecurityError') { saveBytes(`${base}_resultado.png`, await canvasBytes(await framePng(false)), 'image/png'); throw new Error('El navegador bloqueó copiar el mapa base; se descargó solo el resultado (con transparencia).'); }
      throw e;
    }
  };
  const pngOnly = async () => saveBytes(`${base}_resultado.png`, await canvasBytes(await framePng(false)), 'image/png');
  const kmzOne = async () => {
    const g = buildOverlayMap(data!.grid, 'geographic');
    saveBytes(`${base}.kmz`, kmz(props.title, g.bounds, await canvasBytes(toCanvas(g, paintResult(ev!.pct, ev!.cls, data!.mask, style)))), 'application/vnd.google-earth.kmz');
  };
  const csv = async () => saveBytes(`${base}_pixeles.csv`, pixelsCsv(ev!.pct, ev!.cls, data!.mask, data!.grid), 'text/csv');
  const xlsx = async () => saveBytes(`${base}_resumen.xlsx`, await downloadGeoExcelBytes(summary()), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const zip = async () => {
    const g = data!.grid; const files: Record<string, Uint8Array | string> = {};
    files['idoneidad.tif'] = await toGeoTiff(resultRaster(ev!.pct, ev!.cls, data!.mask, 'pct'), g, 255); files['idoneidad.qml'] = qmlPct();
    files['clases.tif'] = await toGeoTiff(resultRaster(ev!.pct, ev!.cls, data!.mask, 'classes'), g, 255); files['clases.qml'] = qmlClasses();
    for (const [k, l] of Object.entries(data!.layers)) { const c = new Float32Array(l); for (let i = 0; i < c.length; i++) if (Number.isNaN(c[i])) c[i] = -9999; files[`capas/${k}.tif`] = await toGeoTiff(c, g, -9999); }
    try { files['mapa.png'] = await canvasBytes(await framePng(true)); } catch { files['resultado.png'] = await canvasBytes(await framePng(false)); }
    const og = buildOverlayMap(g, 'geographic');
    files['google-earth.kmz'] = kmz(props.title, og.bounds, await canvasBytes(toCanvas(og, paintResult(ev!.pct, ev!.cls, data!.mask, style))));
    files['pixeles.csv'] = pixelsCsv(ev!.pct, ev!.cls, data!.mask, g);
    files['resumen.xlsx'] = await downloadGeoExcelBytes(summary());
    const s = summary();
    files['receta.json'] = JSON.stringify({ ...s, grid: g, rules: geo.rules, layerMeta: geo.layers ?? null, pack: geo.packId ?? null }, null, 2);
    files['LEEME.txt'] = `Mapa de aptitud «${props.title}»\n\n- idoneidad.tif: índice 0–100 (255 = sin dato) en ${g.crs}, ${g.resM} m/celda.\n- clases.tif: 3 = alta, 2 = moderada, 1 = no apta, 4 = vetada, 0 = exclusión (255 = fuera del área).\n- *.qml: estilo para QGIS (Capa → Propiedades → Simbología → Estilo → Cargar estilo).\n- capas/: cada capa de entrada ya alineada a la grilla.\n- google-earth.kmz, mapa.png, pixeles.csv, resumen.xlsx, receta.json.\n\nEl índice de idoneidad NO es una probabilidad.\n`;
    saveBytes(`${base}_paquete.zip`, zipFiles(files), 'application/zip');
  };

  // ------------------------------------------------------------------ estado / checklist
  const critLayers = data ? Object.values(data.info).filter((l) => l.role === 'criterion').length : 0;
  const rulesReady = criteria.filter((c) => geo.rules[c.id] && data?.layers[geo.rules[c.id].layerKey]).length;
  const hasArea = !!(geo.packId || geo.grid);
  const untouched = criteria.every((c) => /^Criterio \d+$/.test(c.name));
  const empty = !hasArea && untouched;
  const ready = !!(data && ev && stats && rules.length > 0);

  const legend = (() => {
    const top = onIds.length ? onIds[0] : null;
    if (top === 'result' || !top) return 'result';
    return top;
  })();

  return (
    <div className="gv-shell">
      <aside className="gv-side">
        <div className="gv-steps-bar" aria-label="Progreso">
          <span className={hasArea ? 'ok' : ''}><Icon d={hasArea ? ICONS.check : ICONS.minus} size={12} /> Área</span>
          <span className={critLayers ? 'ok' : ''}><Icon d={critLayers ? ICONS.check : ICONS.minus} size={12} /> Capas {critLayers}</span>
          <span className={criteria.length && rulesReady === criteria.length ? 'ok' : ''}><Icon d={criteria.length && rulesReady === criteria.length ? ICONS.check : ICONS.minus} size={12} /> Reglas {rulesReady}/{criteria.length}</span>
          <span className={expertIds.length ? 'ok' : ''}><Icon d={expertIds.length ? ICONS.check : ICONS.minus} size={12} /> Pesos {expertIds.length ? `(${expertIds.length} exp.)` : ''}</span>
        </div>
        <div className="gv-tabs" role="tablist">
          {(['capas', 'modelo', 'exportar'] as Tab[]).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{{ capas: 'Capas', modelo: 'Modelo', exportar: 'Exportar' }[t]}</button>
          ))}
        </div>
        <div className="gv-side-body">
          {lost > 0 && <div className="banner"><span>{lost} capa(s) no se pudieron recuperar (se añadieron en una sesión sin guardar). Vuelve a subirlas.</span></div>}
          {error && <div className="banner"><span><b>No se pudo cargar:</b> {error}</span></div>}
          {tab === 'capas' && (
            <GeoLayersPanel geo={geo} data={data} criteria={criteria} commit={commit} cache={cache} sb={supabase} ownerId={props.ownerId} projectId={props.projectId}
              vecs={vecs} setVecs={setVecs} vis={vis} setVis={setVis} fit={(b) => mapRef.current?.fit(b)} draft={draft} setDraft={setDraft} drawing={drawing} setDrawing={setDrawing} />
          )}
          {tab === 'modelo' && (
            <GeoModelPanel criteria={criteria} weights={weightResult.agg.w} cr={weightResult.agg.cr} nExperts={expertIds.length} layers={data?.info ?? {}} rules={geo.rules}
              onRule={(id, rule) => commit((c) => { const r = { ...c.rules }; if (rule) r[id] = rule; else delete r[id]; return { ...c, rules: r }; })}
              thresholds={thresholds} onThresholds={(c) => { setThresholds(c); commit((g) => ({ ...g, classes: c })); }}
              exploring={exploring} exploreWeights={exploreWeights} onExplore={(on, w) => { setExploring(on); setExploreWeights(w ?? null); }} />
          )}
          {tab === 'exportar' && (
            <div className="gv-sec-stack">
              {!ready && <p className="gv-hint">Para exportar hace falta un mapa calculado: define el área, sube capas y asígnalas a criterios con su regla.</p>}
              <ExportList disabled={!ready} busy={expBusy} msg={expMsg} items={[
                { k: 'zip', label: 'Paquete completo (.zip)', desc: 'Todo lo de abajo + cada capa de entrada como GeoTIFF + receta JSON. Lo que entregas al docente o abres en QGIS.', run: zip, primary: true },
                { k: 'tif', label: 'GeoTIFF de idoneidad (0–100) + estilo .qml', desc: `Ráster georreferenciado en ${data?.grid.crs ?? 'UTM'}. Ábrelo en QGIS/ArcGIS y carga el .qml para los colores.`, run: geotiffPct },
                { k: 'cls', label: 'GeoTIFF de clases + estilo .qml', desc: '3 alta · 2 moderada · 1 no apta · 4 vetada · 0 exclusión. Ideal para calcular áreas o vectorizar en QGIS.', run: geotiffCls },
                { k: 'png', label: 'PNG del mapa (con mapa base y leyenda)', desc: 'La vista actual tal como la ves, con título y leyenda, lista para tu informe.', run: pngMap },
                { k: 'pngr', label: 'PNG solo del resultado (transparente)', desc: 'Únicamente los píxeles, sin mapa base: para superponer en tu propio diseño.', run: pngOnly },
                { k: 'kmz', label: 'KMZ para Google Earth', desc: 'El resultado como imagen georreferenciada sobre el globo.', run: kmzOne },
                { k: 'csv', label: 'CSV de píxeles (lon, lat, %, clase)', desc: 'Importable como puntos en QGIS o Excel (máx. ~200 000 filas).', run: csv },
                { k: 'xls', label: 'Excel de resumen', desc: 'Pesos, reglas, superficie por clase y datos de las capas.', run: xlsx },
              ]} />
            </div>
          )}
        </div>
      </aside>

      <section className="gv-main">
        <div className="gv-stage">
          <GeoMap ref={mapRef} basemap={basemap} rasters={rasters} vectors={vectors} markers={markers} draft={draft} drawing={drawing}
            initialBounds={gridBounds} onClick={onMapClick} onMove={onMove} onMarkerClick={onMarkerClick}
            onDrawn={(b) => { setDraft(b); setDrawing(false); }} />

          <div className="gv-hud gv-hud-tr">
            <div className="gv-chips" role="group" aria-label="Mapa base">
              {(Object.keys(BASEMAPS) as BasemapKey[]).map((k) => (
                <button key={k} type="button" aria-pressed={basemap === k} onClick={() => setBasemap(k)}>{BASEMAPS[k].label}</button>
              ))}
            </div>
            <div className="gv-chips" role="group" aria-label="Estilo del resultado">
              <button type="button" aria-pressed={style === 'continuous'} onClick={() => setStyle('continuous')}>Continuo</button>
              <button type="button" aria-pressed={style === 'classes'} onClick={() => setStyle('classes')}>3 clases</button>
            </div>
            {gridBounds && <button type="button" className="gv-fit" onClick={() => mapRef.current?.fit(gridBounds)} title="Encajar el área de estudio"><Icon d={ICONS.fit} size={15} /> Área</button>}
          </div>

          <div className="gv-coords mono"><span ref={coordRef}>—</span></div>

          {loading && <div className="gv-toast">Cargando capas… {Math.round(progress * 100)}%</div>}
          {!ready && data && !loading && <div className="gv-toast">Asigna capas a tus criterios (pestaña Modelo) para ver el resultado.</div>}

          {ready && legend === 'result' && (
            <div className="gv-legend">
              <b>Idoneidad AHP + SIG</b>
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
          )}

          {point && (
            <div className="gv-point" role="status">
              <button type="button" className="x" aria-label="Cerrar" onClick={() => setSelected(null)}>×</button>
              <div className="big">{point.pct === null ? '—' : `${point.pct}%`}</div>
              <span className="cls-pill" style={{ background: `color-mix(in srgb, ${CLASS_HEX[point.cls]} 22%, transparent)`, color: CLASS_HEX[point.cls] }}>
                <span className="dot" style={{ background: CLASS_HEX[point.cls] }} />{point.label}
              </span>
              <div className="coords mono">{point.lat.toFixed(5)}, {point.lon.toFixed(5)}</div>
              <div className="tbl">
                {point.rows.map((r) => (
                  <div className={'r' + (r.veto ? ' veto' : '')} key={r.label}>
                    <span className="rl"><span className="k">{r.label}</span><span className="pv">{r.value}</span></span>
                    <span className="pc">{r.contrib}</span>
                  </div>
                ))}
              </div>
              <div className="disc">Índice de idoneidad 0–100, no una probabilidad.</div>
            </div>
          )}

          {empty && !loading && (
            <div className="gv-empty">
              <h3>Tu mapa de aptitud</h3>
              <p>Combina mapas (distancias, temperatura, profundidad, pendiente…) con los pesos de tus expertos para encontrar dónde es mejor ubicar algo: una boya, una finca solar, un cultivo.</p>
              <div className="gv-empty-acts">
                {EXAMPLE_IDS.map((id) => { const ex = buildExample(id); return (
                  <button key={id} type="button" className="gv-ex" onClick={() => props.onApplyExample(id)}>
                    <b>{ex.label}</b><span>{ex.blurb}</span>
                  </button>
                ); })}
              </div>
              <p className="small">O empieza en blanco: define tus criterios en «Proyecto» y sube tus mapas en la pestaña «Capas».</p>
            </div>
          )}
        </div>

        {stats && ready && (
          <div className="card gv-stats">
            <div className="bars">
              {([[CLASS_ALTA, stats.alta], [CLASS_MODERADA, stats.media], [CLASS_NO_APTA, stats.noapta], [CLASS_EXCLUDED, stats.excl]] as const).map(([c, s]) => (
                <div className="brow" key={c}>
                  <span>{CLASS_LABEL[c]}</span>
                  <span className="bar"><span className="bfill" style={{ width: `${c === CLASS_EXCLUDED ? (stats.totalHa ? (s.ha / stats.totalHa) * 100 : 0) : s.pct}%`, background: CLASS_HEX[c] }} /></span>
                  <span className="mono">{s.ha.toLocaleString('es-CO', { maximumFractionDigits: 0 })} ha{c === CLASS_EXCLUDED ? '' : ` · ${s.pct.toFixed(1)} %`}</span>
                </div>
              ))}
            </div>
            <div className="muted mono" style={{ fontSize: 12 }}>
              Área evaluada: {stats.evaluableHa.toLocaleString('es-CO', { maximumFractionDigits: 0 })} ha · {data!.grid.resM} × {data!.grid.resM} m por celda{exploring ? ' · con pesos explorados' : ''}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

type ExportItem = { k: string; label: string; desc: string; run: () => Promise<void>; primary?: boolean };
function ExportList({ items, disabled, busy, msg }: { items: ExportItem[]; disabled: boolean; busy: string; msg: string }) {
  const [running, setRunning] = useState('');
  return (
    <>
      {items.map((it) => (
        <div className={'gv-export' + (it.primary ? ' primary' : '')} key={it.k}>
          <div><b>{it.label}</b><p>{it.desc}</p></div>
          <button type="button" className={'btn sm' + (it.primary ? ' primary' : '')} disabled={disabled || !!busy || !!running} onClick={async () => { setRunning(it.k); try { await it.run(); } catch (e) { alert(e instanceof Error ? e.message : String(e)); } setRunning(''); }}>
            <Icon d={ICONS.download} size={13} /> {running === it.k || busy === it.k ? '…' : 'Descargar'}
          </button>
        </div>
      ))}
      {msg && <p className="gv-hint">{msg}</p>}
    </>
  );
}

function evaluateOnePoint(data: GeoData, geo: GeoConfig, rules: CriterionRule[], thr: GeoConfig['classes'], sel: { col: number; row: number }) {
  const i = sel.row * data.grid.width + sel.col;
  const [lon, lat] = pixelToLonLat(sel.col, sel.row, data.grid.transform, data.grid.crs);
  const m = data.mask[i];
  if (m !== MASK_VALID) {
    return { pct: null, cls: CLASS_EXCLUDED, label: m === 2 ? 'Exclusión' : 'Fuera del área de estudio', lat, lon, rows: [] as { label: string; value: string; contrib: string; veto: boolean }[] };
  }
  let sum = 0, wUsed = 0, anyVeto = false;
  const rows = rules.map((r) => {
    const info = data.info[r.key];
    const x = data.layers[r.key][i];
    const s = suitability(x, r.fn);
    const veto = vetoed(x, r.veto);
    if (veto) anyVeto = true;
    if (!Number.isNaN(x)) { sum += r.weight * s; wUsed += r.weight; }
    const value = Number.isNaN(x) ? 'sin dato' : `${Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(2)} ${info?.unit ?? ''}`.trim();
    return { label: info?.label ?? r.key, value, contrib: `${s.toFixed(2)} × ${r.weight.toFixed(2)}`, veto };
  });
  const s = wUsed === 0 ? NaN : anyVeto ? 0 : sum / wUsed;
  const cls = Number.isNaN(s) ? CLASS_EXCLUDED : anyVeto ? CLASS_VETO : s >= thr.alta ? CLASS_ALTA : s >= thr.media ? CLASS_MODERADA : CLASS_NO_APTA;
  void geo;
  return { pct: Number.isNaN(s) ? null : Math.round(s * 100), cls, label: Number.isNaN(s) ? 'Sin dato' : CLASS_LABEL[cls], lat, lon, rows };
}
