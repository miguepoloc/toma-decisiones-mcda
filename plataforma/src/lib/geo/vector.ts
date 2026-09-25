/** Vector -> grilla: rasteriza puntos, líneas y polígonos de un GeoJSON (lon/lat) sobre la grilla del
 * proyecto y calcula la distancia euclidiana (en metros) al elemento más cercano. Es lo que permite
 * criterios del tipo "distancia a ecosistemas marinos / zonas de pesca / tráfico" del artículo de la
 * boya (Polo-Castañeda et al., 2021). Puro (sin DOM). */
import { mapToPixel, projector } from './crs.ts';
import type { Bounds } from './grid.ts';
import type { GeoGrid } from '../types.ts';

export type Geom = { type: string; coordinates?: unknown; geometries?: Geom[] };
export type Feature = { type: 'Feature'; geometry: Geom | null; properties?: Record<string, unknown> | null };
export type FC = { type: 'FeatureCollection'; features: Feature[] };

type Pos = number[];

function eachGeom(g: Geom | null, fn: (g: Geom) => void) {
  if (!g) return;
  if (g.type === 'GeometryCollection') g.geometries?.forEach((x) => eachGeom(x, fn));
  else fn(g);
}

function eachPos(coords: unknown, fn: (p: Pos) => void) {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number') fn(coords as Pos);
  else for (const c of coords) eachPos(c, fn);
}

/** Extensión lon/lat de un GeoJSON, o `null` si no tiene geometrías. */
export function fcBounds(fc: FC): Bounds | null {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const f of fc.features) {
    eachGeom(f.geometry, (g) => eachPos(g.coordinates, (p) => {
      if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) return;
      west = Math.min(west, p[0]); east = Math.max(east, p[0]); south = Math.min(south, p[1]); north = Math.max(north, p[1]);
    }));
  }
  return west === Infinity ? null : { west, south, east, north };
}

/** Tipos de geometría presentes ('point' | 'line' | 'polygon'), para sugerir qué calcular. */
export function geomKinds(fc: FC): Set<'point' | 'line' | 'polygon'> {
  const s = new Set<'point' | 'line' | 'polygon'>();
  for (const f of fc.features) eachGeom(f.geometry, (g) => {
    if (g.type === 'Point' || g.type === 'MultiPoint') s.add('point');
    else if (g.type === 'LineString' || g.type === 'MultiLineString') s.add('line');
    else if (g.type === 'Polygon' || g.type === 'MultiPolygon') s.add('polygon');
  });
  return s;
}

/** Campos numéricos de las propiedades (para "valor de un atributo"). */
export function numericFields(fc: FC): string[] {
  const seen = new Map<string, boolean>();
  for (const f of fc.features.slice(0, 500)) {
    for (const [k, v] of Object.entries(f.properties ?? {})) {
      const ok = typeof v === 'number' && Number.isFinite(v);
      seen.set(k, (seen.get(k) ?? true) && ok);
    }
  }
  return [...seen.entries()].filter(([, ok]) => ok).map(([k]) => k);
}

export type BurnMode = { kind: 'presence' } | { kind: 'attr'; field: string };

/** Rasteriza `fc` en `grid`. Devuelve un Float32 con NaN donde no hay elemento y el valor
 * (1 en presencia, o el atributo) donde sí. Polígonos por paridad par-impar (respeta huecos). */
export function burn(fc: FC, grid: GeoGrid, mode: BurnMode): Float32Array {
  const { width: W, height: H } = grid;
  const out = new Float32Array(W * H).fill(NaN);
  const toGrid = projector('EPSG:4326', grid.crs);
  // Decimación: vértices más juntos que ~0.3 píxel no aportan (los shapefiles de costa traen millones).
  const minStepDeg = (0.3 * grid.resM) / 111_320;

  const project = (ring: Pos[]): [number, number][] => {
    const res: [number, number][] = [];
    let lx = Infinity, ly = Infinity;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i];
      const last = i === ring.length - 1;
      if (!last && Math.abs(p[0] - lx) < minStepDeg && Math.abs(p[1] - ly) < minStepDeg) continue;
      lx = p[0]; ly = p[1];
      const [x, y] = toGrid(p[0], p[1]);
      res.push(mapToPixel(x, y, grid.transform));
    }
    return res;
  };

  const setCell = (c: number, r: number, v: number) => {
    const ci = Math.round(c), ri = Math.round(r);
    if (ci >= 0 && ci < W && ri >= 0 && ri < H) out[ri * W + ci] = v;
  };
  const line = (pts: [number, number][], v: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (![x0, y0, x1, y1].every(Number.isFinite)) continue;
      if ((x0 < -1 && x1 < -1) || (y0 < -1 && y1 < -1) || (x0 > W && x1 > W) || (y0 > H && y1 > H)) continue;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2));
      for (let k = 0; k <= n; k++) setCell(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, v);
    }
  };
  const fill = (rings: [number, number][][], v: number) => {
    let ymin = Infinity, ymax = -Infinity;
    for (const ring of rings) for (const [, y] of ring) if (Number.isFinite(y)) { ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    if (ymin === Infinity) return;
    const r0 = Math.max(0, Math.ceil(ymin)), r1 = Math.min(H - 1, Math.floor(ymax));
    if (r1 < r0) return;
    const xs: number[][] = Array.from({ length: r1 - r0 + 1 }, () => []);
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const [xa, ya] = ring[i], [xb, yb] = ring[(i + 1) % ring.length];
        if (![xa, ya, xb, yb].every(Number.isFinite) || ya === yb) continue;
        const lo = Math.min(ya, yb), hi = Math.max(ya, yb);
        const from = Math.max(r0, Math.ceil(lo)), to = Math.min(r1, Math.ceil(hi) - 1);
        for (let r = from; r <= to; r++) xs[r - r0].push(xa + ((r - ya) * (xb - xa)) / (yb - ya));
      }
    }
    let filled = 0;
    for (let k = 0; k < xs.length; k++) {
      const row = xs[k].sort((a, b) => a - b);
      for (let i = 0; i + 1 < row.length; i += 2) {
        const c0 = Math.max(0, Math.ceil(row[i])), c1 = Math.min(W - 1, Math.ceil(row[i + 1]) - 1);
        for (let c = c0; c <= c1; c++) { out[(r0 + k) * W + c] = v; filled++; }
      }
    }
    // Un polígono más pequeño que un píxel no toca ningún centro de celda: se marca su contorno para
    // que no desaparezca. Si sí rellenó celdas no se dibuja el borde (engordaría el área ~½ píxel).
    if (filled === 0) for (const ring of rings) line(ring, v);
  };

  for (const f of fc.features) {
    let v = 1;
    if (mode.kind === 'attr') {
      const raw = f.properties?.[mode.field];
      if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
      v = raw;
    }
    eachGeom(f.geometry, (g) => {
      const c = g.coordinates as never;
      switch (g.type) {
        case 'Point': { const [x, y] = toGrid((c as Pos)[0], (c as Pos)[1]); const [pc, pr] = mapToPixel(x, y, grid.transform); setCell(pc, pr, v); break; }
        case 'MultiPoint': for (const p of c as Pos[]) { const [x, y] = toGrid(p[0], p[1]); const [pc, pr] = mapToPixel(x, y, grid.transform); setCell(pc, pr, v); } break;
        case 'LineString': line(project(c as Pos[]), v); break;
        case 'MultiLineString': for (const l of c as Pos[][]) line(project(l), v); break;
        case 'Polygon': fill((c as Pos[][]).map(project), v); break;
        case 'MultiPolygon': for (const poly of c as Pos[][][]) fill(poly.map(project), v); break;
      }
    });
  }
  return out;
}

const INF = 1e20;

function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Distancia euclidiana exacta (Felzenszwalb & Huttenlocher, 2012) en metros al píxel marcado más
 * cercano (`feature[i] > 0`). Devuelve todo NaN si no hay ningún píxel marcado. */
export function distanceTransform(feature: Uint8Array, w: number, h: number, resM: number): Float32Array {
  const out = new Float32Array(w * h);
  let any = false;
  const grid = new Float64Array(w * h);
  for (let i = 0; i < grid.length; i++) { grid[i] = feature[i] ? 0 : INF; if (feature[i]) any = true; }
  if (!any) return out.fill(NaN);
  const m = Math.max(w, h);
  const f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x]) * resM;
  }
  return out;
}

/** Atajo: rasteriza en presencia y devuelve la distancia en metros (0 dentro del elemento). */
export function distanceLayer(fc: FC, grid: GeoGrid): Float32Array {
  const b = burn(fc, grid, { kind: 'presence' });
  const mask = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) mask[i] = Number.isNaN(b[i]) ? 0 : 1;
  return distanceTransform(mask, grid.width, grid.height, grid.resM);
}
