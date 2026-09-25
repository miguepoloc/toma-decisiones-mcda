/** Conversión píxel (col,row) de la grilla del paquete -> coordenadas del CRS del proyecto ->
 * lon/lat (EPSG:4326), para mostrar dónde se hizo clic en el geovisor. Puro (proj4 no toca el DOM),
 * ver `scripts/check-geo-crs.ts`. Cubre solo EPSG:9377 (MAGNA-SIRGAS / Origen-Nacional, el único CRS
 * del catálogo hoy) — agregar más definiciones aquí cuando haya paquetes en otro CRS. */
import proj4 from 'proj4';

// Definición de pyproj (`CRS.from_epsg(9377).to_proj4()`), la misma que usó
// scripts/geo/export_pack.py para leer el DEM del notebook.
const EPSG_9377 = '+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs';

const DEFS: Record<string, string> = { 'EPSG:9377': EPSG_9377 };

export type Transform = [number, number, number, number, number, number]; // a,b,c,d,e,f (afín GDAL)

/** x,y del CRS del proyecto en el centro del píxel (col,row). */
export function pixelToMap(col: number, row: number, t: Transform): [number, number] {
  const [a, b, c, d, e, f] = t;
  return [a * (col + 0.5) + b * (row + 0.5) + c, d * (col + 0.5) + e * (row + 0.5) + f];
}

/** (col,row) -> [lon, lat] en EPSG:4326. Lanza si el CRS no está en DEFS. */
export function pixelToLonLat(col: number, row: number, t: Transform, crs: string): [number, number] {
  const def = DEFS[crs];
  if (!def) throw new Error(`CRS sin definición proj4: ${crs}`);
  const [x, y] = pixelToMap(col, row, t);
  return proj4(def, 'WGS84').forward([x, y]) as [number, number];
}

/** x,y del CRS del proyecto -> (col,row) exacto (sin redondear), invirtiendo el afín 2×2. */
export function mapToPixel(x: number, y: number, t: Transform): [number, number] {
  const [a, b, c, d, e, f] = t;
  const det = a * e - b * d;
  const col = (e * (x - c) - b * (y - f)) / det - 0.5;
  const row = (a * (y - f) - d * (x - c)) / det - 0.5;
  return [col, row];
}

/** [lon,lat] -> (col,row) exacto. Inversa de `pixelToLonLat`, para ubicar marcadores o "ir a
 * coordenadas" sin depender de valores fila/columna precalculados. */
export function lonLatToPixel(lon: number, lat: number, t: Transform, crs: string): [number, number] {
  const def = DEFS[crs];
  if (!def) throw new Error(`CRS sin definición proj4: ${crs}`);
  const [x, y] = proj4('WGS84', def).forward([lon, lat]);
  return mapToPixel(x, y, t);
}
