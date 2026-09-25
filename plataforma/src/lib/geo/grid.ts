/** Grilla de análisis de un proyecto espacial: se define a partir de un rectángulo lon/lat y una
 * resolución en metros, en el UTM de la zona (distancias y áreas en metros de verdad). Puro. */
import { projector, utmCrsFor, type Transform } from './crs.ts';
import type { GeoGrid } from '../types.ts';

export type Bounds = { west: number; south: number; east: number; north: number };

/** Tope de píxeles: cada capa Float32 pesa 4 B/píxel sin comprimir y el geovisor evalúa todo en el
 * navegador. 1.5 M ≈ 1220×1220. */
export const MAX_PIXELS = 1_500_000;

const NICE_RES = [1, 2, 5, 10, 20, 25, 30, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];

function utmExtent(b: Bounds, crs: string): { xmin: number; xmax: number; ymin: number; ymax: number } {
  const f = projector('EPSG:4326', crs);
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  const N = 8;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      if (i > 0 && i < N && j > 0 && j < N) continue;
      const [x, y] = f(b.west + ((b.east - b.west) * i) / N, b.south + ((b.north - b.south) * j) / N);
      xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
    }
  }
  return { xmin, xmax, ymin, ymax };
}

export function gridFromBounds(b: Bounds, resM: number): GeoGrid {
  const crs = utmCrsFor((b.west + b.east) / 2, (b.south + b.north) / 2);
  const { xmin, xmax, ymin, ymax } = utmExtent(b, crs);
  const width = Math.max(1, Math.ceil((xmax - xmin) / resM));
  const height = Math.max(1, Math.ceil((ymax - ymin) / resM));
  const transform: Transform = [resM, 0, xmin, 0, -resM, ymax];
  return { crs, width, height, resM, haPerPixel: (resM * resM) / 10000, transform };
}

/** Píxeles que tendría la grilla con esa resolución (sin construirla). */
export function estimatePixels(b: Bounds, resM: number): number {
  const crs = utmCrsFor((b.west + b.east) / 2, (b.south + b.north) / 2);
  const { xmin, xmax, ymin, ymax } = utmExtent(b, crs);
  return Math.ceil((xmax - xmin) / resM) * Math.ceil((ymax - ymin) / resM);
}

/** La resolución "redonda" más fina que deja la grilla por debajo de `targetPx` píxeles. */
export function suggestRes(b: Bounds, targetPx = 500_000): number {
  for (const r of NICE_RES) if (estimatePixels(b, r) <= targetPx) return r;
  return NICE_RES[NICE_RES.length - 1];
}

/** Extensión lon/lat de la grilla (muestreando los bordes: el UTM inclinado no es un rectángulo). */
export function gridBoundsLonLat(g: GeoGrid): Bounds {
  const f = projector(g.crs, 'EPSG:4326');
  const [a, b, c, d, e, ff] = g.transform;
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  const N = 12;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      if (i > 0 && i < N && j > 0 && j < N) continue;
      const col = (g.width * i) / N, row = (g.height * j) / N;
      const [lon, lat] = f(a * col + b * row + c, d * col + e * row + ff);
      west = Math.min(west, lon); east = Math.max(east, lon); south = Math.min(south, lat); north = Math.max(north, lat);
    }
  }
  return { west, south, east, north };
}

/** Une dos extensiones (para tomar el área de estudio de los archivos que se van cargando). */
export function unionBounds(a: Bounds | null, b: Bounds): Bounds {
  if (!a) return { ...b };
  return { west: Math.min(a.west, b.west), south: Math.min(a.south, b.south), east: Math.max(a.east, b.east), north: Math.max(a.north, b.north) };
}

export function padBounds(b: Bounds, frac: number): Bounds {
  const dx = (b.east - b.west) * frac, dy = (b.north - b.south) * frac;
  return { west: b.west - dx, east: b.east + dx, south: Math.max(-89.9, b.south - dy), north: Math.min(89.9, b.north + dy) };
}
