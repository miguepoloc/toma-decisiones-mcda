/** Colorea grillas a RGBA (Uint32 little-endian 0xAABBGGRR, listo para `ImageData`). Puro. */
import { suitability, type FnSpec } from './membership.ts';
import { CLASS_ALTA, CLASS_EXCLUDED, CLASS_MODERADA, CLASS_NO_APTA, CLASS_VETO, MASK_EXCLUDED, MASK_NODATA } from './suitability.ts';

export const rgba = (r: number, g: number, b: number, a = 255) => (((a << 24) | (b << 16) | (g << 8) | r) >>> 0);

export const CLASS_RGB: Record<number, [number, number, number]> = {
  [CLASS_EXCLUDED]: [127, 140, 141], [CLASS_NO_APTA]: [217, 83, 79], [CLASS_MODERADA]: [240, 173, 78],
  [CLASS_ALTA]: [46, 125, 50], [CLASS_VETO]: [217, 83, 79],
};
export const CLASS_HEX: Record<number, string> = {
  [CLASS_EXCLUDED]: '#7F8C8D', [CLASS_NO_APTA]: '#D9534F', [CLASS_MODERADA]: '#F0AD4E', [CLASS_ALTA]: '#2E7D32', [CLASS_VETO]: '#D9534F',
};
export const CLASS_LABEL: Record<number, string> = {
  [CLASS_EXCLUDED]: 'Exclusión', [CLASS_NO_APTA]: 'No apta', [CLASS_MODERADA]: 'Moderada', [CLASS_ALTA]: 'Alta aptitud', [CLASS_VETO]: 'Vetada',
};

type Stops = [number, [number, number, number]][];
const RED_YEL_GREEN: Stops = [[0, [217, 83, 79]], [0.5, [240, 173, 78]], [1, [46, 125, 50]]];
const SEQ: Stops = [[0, [33, 102, 172]], [0.5, [146, 197, 222]], [1, [253, 219, 128]]];

function ramp(stops: Stops, t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    if (x >= t0 && x <= t1) {
      const f = (x - t0) / (t1 - t0);
      return [Math.round(c0[0] + (c1[0] - c0[0]) * f), Math.round(c0[1] + (c1[1] - c0[1]) * f), Math.round(c0[2] + (c1[2] - c0[2]) * f)];
    }
  }
  return stops[stops.length - 1][1];
}

/** Rampa continua roja→amarilla→verde (RdYlGn simplificado), como el notebook 07. t en [0,1]. */
export const rampColor = (t: number) => ramp(RED_YEL_GREEN, t);
/** Rampa secuencial azul→amarillo para valores crudos (temperatura, distancia, profundidad…). */
export const seqColor = (t: number) => ramp(SEQ, t);

const CLEAR = 0;
const GREY = rgba(127, 140, 141);

/** Resultado: continuo (0–100 en rampa) o por clases (alta / moderada / no apta). */
export function paintResult(pct: Uint8Array, cls: Uint8Array, mask: Uint8Array, style: 'continuous' | 'classes'): Uint32Array {
  const out = new Uint32Array(pct.length);
  const lut = Array.from({ length: 101 }, (_, i) => { const [r, g, b] = rampColor(i / 100); return rgba(r, g, b); });
  const cl: Record<number, number> = {};
  for (const k of [CLASS_NO_APTA, CLASS_MODERADA, CLASS_ALTA, CLASS_VETO]) { const [r, g, b] = CLASS_RGB[k]; cl[k] = rgba(r, g, b); }
  for (let i = 0; i < out.length; i++) {
    const m = mask[i];
    if (m === MASK_NODATA) out[i] = CLEAR;
    else if (m === MASK_EXCLUDED) out[i] = GREY;
    else if (pct[i] === 255) out[i] = CLEAR;
    else out[i] = style === 'classes' ? (cl[cls[i]] ?? CLEAR) : lut[Math.min(100, pct[i])];
  }
  return out;
}

/** Idoneidad parcial (0–1) de un criterio con su función, sobre la capa cruda. */
export function paintCriterion(layer: Float32Array, mask: Uint8Array, fn: FnSpec): Uint32Array {
  const out = new Uint32Array(layer.length);
  for (let i = 0; i < out.length; i++) {
    if (mask[i] === MASK_NODATA) continue;
    if (mask[i] === MASK_EXCLUDED) { out[i] = GREY; continue; }
    const v = layer[i];
    if (Number.isNaN(v)) continue;
    const [r, g, b] = rampColor(suitability(v, fn));
    out[i] = rgba(r, g, b);
  }
  return out;
}

/** Capa cruda en rampa secuencial entre `min` y `max`. */
export function paintRaw(layer: Float32Array, min: number, max: number): Uint32Array {
  const out = new Uint32Array(layer.length);
  const span = max > min ? max - min : 1;
  for (let i = 0; i < out.length; i++) {
    const v = layer[i];
    if (Number.isNaN(v)) continue;
    const [r, g, b] = seqColor((v - min) / span);
    out[i] = rgba(r, g, b);
  }
  return out;
}

/** Zonas con `mask[i] === code` en un color plano. */
export function paintMask(mask: Uint8Array, code: number, color: [number, number, number]): Uint32Array {
  const out = new Uint32Array(mask.length);
  const c = rgba(color[0], color[1], color[2]);
  for (let i = 0; i < out.length; i++) if (mask[i] === code) out[i] = c;
  return out;
}

/** Celdas con valor > 0 en un color plano (capas de exclusión / área de estudio). */
export function paintFlag(layer: Float32Array, color: [number, number, number]): Uint32Array {
  const out = new Uint32Array(layer.length);
  const c = rgba(color[0], color[1], color[2]);
  for (let i = 0; i < out.length; i++) if (layer[i] > 0) out[i] = c;
  return out;
}

const DIFF_NEG: [number, number, number] = [217, 83, 79];
const DIFF_POS: [number, number, number] = [46, 125, 50];
/** Diferencia de idoneidad (actual − escenario guardado): rojo = empeora, verde = mejora, transparente si
 * el cambio es menor a `eps` puntos. Solo celdas evaluables en AMBOS mapas. Intensidad hasta ±`full` puntos. */
export function paintDiff(pct: Uint8Array, base: Uint8Array, mask: Uint8Array, eps = 1, full = 30): Uint32Array {
  const out = new Uint32Array(pct.length);
  for (let i = 0; i < out.length; i++) {
    if (mask[i] !== 1 || pct[i] === 255 || base[i] === 255) continue;
    const d = pct[i] - base[i];
    if (Math.abs(d) < eps) continue;
    const t = Math.min(1, Math.abs(d) / full);
    const [r, g, b] = d < 0 ? DIFF_NEG : DIFF_POS;
    out[i] = rgba(r, g, b, Math.round(90 + 165 * t));
  }
  return out;
}

/** Parcelas (etiquetas > 0) en un color plano. */
export function paintParcels(labels: Uint32Array, color: [number, number, number] = [109, 40, 217]): Uint32Array {
  const out = new Uint32Array(labels.length);
  const c = rgba(color[0], color[1], color[2], 235);
  for (let i = 0; i < out.length; i++) if (labels[i] > 0) out[i] = c;
  return out;
}
