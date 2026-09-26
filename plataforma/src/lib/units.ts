import type { Criterion } from './types.ts';

/** Nombre del criterio con su unidad, «Alcance (km)»; sin unidad, solo el nombre. Un valor de la matriz (10, 0,5…) no significa nada
 * sin saber si son km o m, USD o COP, años o meses: por eso la unidad viaja con el criterio a resultados, informe y Excel. */
export const withUnit = (c: Pick<Criterion, 'name' | 'unit'>): string => {
  const u = c.unit?.trim();
  return u ? `${c.name} (${u})` : c.name;
};

/** Criterios de una matriz cuantitativa que aún no tienen unidad. */
export const missingUnits = (criteria: Criterion[]): Criterion[] => criteria.filter((c) => !c.unit?.trim());

/** Sugerencias para el campo de unidad (datalist): son solo ayuda, se puede escribir cualquier texto. */
export const UNIT_SUGGESTIONS = [
  'km', 'm', 'ha', 'años', 'meses', 'días', 'horas', 'minutos', 'USD', 'COP', 'millones COP', '%', 'kWh', 'kW', 'MB/s', 'dB', 'dBm',
  'mg/L', '°C', 'puntos', 'unidades', 'escala 1–5', 'escala 1–10', 'sin unidad (adimensional)',
];
