/** Remuestreo de un ráster fuente (GeoTIFF ya leído) a la grilla del proyecto. Puro. La
 * reproyección se evalúa en una retícula gruesa (`interpolatedMap`), no celda por celda. */
import { mapToPixel, pixelToMap, projector, type Transform } from './crs.ts';
import { interpolatedMap } from './mapper.ts';
import type { GeoGrid } from '../types.ts';

export type SourceRaster = {
  data: ArrayLike<number>;
  width: number;
  height: number;
  transform: Transform; // norte arriba: [res, 0, x0, 0, -res, y0]
  crs: string;
  nodata: number | null;
};

function isNoData(v: number, nodata: number | null): boolean {
  return Number.isNaN(v) || !Number.isFinite(v) || (nodata !== null && v === nodata) || v < -3e38;
}

export function resampleToGrid(src: SourceRaster, grid: GeoGrid, method: 'nearest' | 'bilinear'): Float32Array {
  const { width: W, height: H } = grid;
  const same = src.crs === grid.crs;
  const f = same ? null : projector(grid.crs, src.crs);
  const { u, v } = interpolatedMap(W, H, (c, r) => {
    const [x, y] = pixelToMap(c, r, grid.transform);
    const [sx, sy] = f ? f(x, y) : [x, y];
    return mapToPixel(sx, sy, src.transform);
  }, 6);
  const out = new Float32Array(W * H);
  const sw = src.width, sh = src.height;
  for (let k = 0; k < out.length; k++) {
    const fc = u[k], fr = v[k];
    if (!(fc > -0.5 && fr > -0.5 && fc < sw - 0.5 && fr < sh - 0.5)) { out[k] = NaN; continue; }
    if (method === 'nearest') {
      const val = src.data[Math.round(fr) * sw + Math.round(fc)];
      out[k] = isNoData(val, src.nodata) ? NaN : val;
      continue;
    }
    const c0 = Math.floor(fc), r0 = Math.floor(fr), tx = fc - c0, ty = fr - r0;
    let sum = 0, wsum = 0;
    for (let dr = 0; dr <= 1; dr++) {
      for (let dc = 0; dc <= 1; dc++) {
        const cc = c0 + dc, rr = r0 + dr;
        if (cc < 0 || rr < 0 || cc >= sw || rr >= sh) continue;
        const val = src.data[rr * sw + cc];
        if (isNoData(val, src.nodata)) continue;
        const wt = (dc ? tx : 1 - tx) * (dr ? ty : 1 - ty);
        sum += val * wt; wsum += wt;
      }
    }
    out[k] = wsum > 1e-6 ? sum / wsum : NaN;
  }
  return out;
}

/** Mín/máx de una capa ignorando NaN. */
export function layerRange(a: Float32Array): { min: number; max: number } {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min === Infinity ? { min: 0, max: 0 } : { min, max };
}
