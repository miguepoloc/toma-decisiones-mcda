/** Proyectos de ejemplo del geovisor. Se cargan con un botón (nunca automáticamente): el estudiante
 * decide si parte de cero o de un caso guiado. */
import { SNSM_CACAO_RULES, type FnSpec } from './membership.ts';
import { uid } from '../types.ts';
import type { Criterion, GeoConfig } from '../types.ts';

export type ExampleId = 'cacao-snsm' | 'boya-2021' | 'boya-wsn';
/** Experto sembrado con el ejemplo (opcional). Sus juicios son una RECONSTRUCCIÓN marcada como tal, nunca respuestas de un panel real. */
export type ExampleExpert = { name: string; roleDesc: string; judgments: { key: string; value: number }[] };
export type Example = { id: string; source?: 'builtin' | 'catalog'; label: string; blurb: string; hasData: boolean; title: string; objective: string; criteria: Criterion[]; geo: GeoConfig; expert?: ExampleExpert };

const CLASSES = { alta: 0.70, media: 0.45 };

function cacao(): Example {
  const criteria: Criterion[] = [];
  const rules: GeoConfig['rules'] = {};
  for (const [layerKey, r] of Object.entries(SNSM_CACAO_RULES)) {
    const id = uid('k');
    criteria.push({ id, name: r.label, hint: r.why, src: null });
    rules[id] = { layerKey, fn: r.fn, veto: r.veto };
  }
  return {
    id: 'cacao-snsm', label: 'Aptitud cacaotera · Sierra Nevada de Santa Marta', hasData: true,
    blurb: 'Caso guiado de la Sesión 5 (notebook 07). Trae los datos: clima, suelo y pendiente. Solo falta que tus expertos pesen los criterios.',
    title: 'Aptitud cacaotera — Sierra Nevada de Santa Marta (ejemplo del curso)',
    objective: 'Zonificar dónde es biofísicamente apto cultivar cacao en la Sierra Nevada de Santa Marta, combinando clima, suelo y relieve con los pesos de un panel de expertos.',
    criteria, geo: { packId: 'snsm-cacao-v1', rules, classes: { ...CLASSES } },
  };
}

/** Plantilla del artículo Polo-Castañeda, Gómez-Rojas & Linero-Cueto (2021), Int. J. Adv. Sci. Eng.
 * Inf. Technol. 11(5): ubicar una boya de monitoreo oceanográfico (WSN). Criterios y rangos de la
 * Tabla VI; NO trae datos (vienen del SIAM/INVEMAR/Shipmap): el estudiante sube sus capas. */
function boya(): Example {
  const mk = (name: string, hint: string, layerKey: string, breaks: number[], scores: number[]) => {
    const id = uid('k');
    return { c: { id, name, hint, src: null } as Criterion, r: { layerKey, fn: { type: 'steps' as const, breaks, scores } } };
  };
  const items = [
    mk('Distancia a ecosistemas marinos', 'Más lejos es mejor. Polo-Castañeda et al. (2021), Tabla VI: >150 m adecuado, 70–150 m moderado, <70 m no adecuado. Sube la capa de ecosistemas (arrecifes, manglares, pastos) y calcula la «distancia» en metros.', 'ecosistemas', [70, 150], [0, 0.5, 1]),
    mk('Distancia al tráfico marítimo', 'Más lejos es mejor. Tabla VI: >100 m adecuado, 50–100 m moderado, <50 m no adecuado. Sube las rutas de navegación (Shipmap/Wikiloc) y calcula la «distancia».', 'trafico', [50, 100], [0, 0.5, 1]),
    mk('Distancia a zonas de pesca', 'Más lejos es mejor. Tabla VI: >1 milla náutica (1 852 m) adecuado, <1 milla moderado, dentro de la zona de pesca no adecuado. Sube las zonas de pesca y calcula la «distancia».', 'pesca', [1, 1852], [0, 0.5, 1]),
    mk('Zona batimétrica (profundidad)', 'Tabla VI: 50–200 m adecuado, 20–50 m moderado, <20 m no adecuado. Sube un ráster de profundidad en metros POSITIVOS (si viene negativo, multiplícalo por −1 en QGIS). Recorta a la isóbata de 200 m como «Área de estudio».', 'bati', [20, 50], [0, 0.5, 1]),
  ];
  const rules: GeoConfig['rules'] = {};
  items.forEach((it) => { rules[it.c.id] = it.r; });
  return {
    id: 'boya-wsn', label: 'Boya · plantilla sin datos (sube tus propias capas)', hasData: false,
    blurb: 'Los 4 criterios y rangos de la Tabla VI del artículo de la boya, sin mapas: tú subes los tuyos (ecosistemas, tráfico, pesca, batimetría) y las concesiones como exclusión.',
    title: 'Zonas aptas para una boya de monitoreo oceanográfico',
    objective: 'Determinar dónde es viable instalar una red de sensores inalámbricos tipo boya, evitando ecosistemas, tráfico marítimo, zonas de pesca y profundidades inadecuadas, y excluyendo las áreas de concesión.',
    criteria: items.map((i) => i.c), geo: { rules, classes: { ...CLASSES } },
  };
}

/** Reglas del caso de la boya con datos: cada capa del paquete `boya-wsn-v1` ya trae la clase 1/2/3 del autor (1 apto · 2 moderado · 3 no apto)
 * y aquí se pasa a idoneidad 1 / 0.5 / 0. Con S = Σ wᵢ·sᵢ, «S del geovisor» = (3 − S del artículo)/2: los cortes 1.5 y 2.5 del resultado
 * original (`Final/Resultado.shp`) son idoneidad 0.75 y 0.25. */
export const BOYA_CLASS_SCORES = { '1': 1, '2': 0.5, '3': 0 };
export const BOYA_RULES: { layerKey: string; fn: FnSpec }[] = ['eco', 'trafico', 'pesca', 'bati'].map((layerKey) => ({ layerKey, fn: { type: 'classes', map: { ...BOYA_CLASS_SCORES } } }));
export const BOYA_CLASSES = { alta: 0.75, media: 0.25 };

/** Matriz agregada publicada (Tabla IV del artículo), redondeada a la escala entera de Saaty: 4, 4, 3, 1/2, 2, 2. Da pesos
 * [0.541, 0.144, 0.203, 0.111] y CR 0.068 frente a los publicados [0.5482, 0.1423, 0.2020, 0.1075] y CR 0.0652. No son juicios de expertos. */
const BOYA_TABLA_IV: [number, number, number][] = [[0, 1, -3], [0, 2, -3], [0, 3, -2], [1, 2, 1], [1, 3, -1], [2, 3, -1]];

function boyaDatos(): Example {
  const specs = [
    { name: 'Distancia a ecosistemas marinos', hint: 'Más lejos es mejor. Tabla VI del artículo: >150 m apto, 70–150 m moderado, <70 m no apto. La capa trae la clase 1/2/3 ya calculada por el autor con datos del SIAM/INVEMAR.' },
    { name: 'Distancia al tráfico marítimo', hint: 'Tabla VI: >100 m apto, 50–100 m moderado, <50 m no apto. Rutas de lanchas (Wikiloc) y de barcos (Shipmap).' },
    { name: 'Distancia a zonas de pesca', hint: 'Tabla VI: >1 milla náutica apto, menos de 1 milla moderado, dentro de la zona de pesca no apto (DIMAR / SMPOMM).' },
    { name: 'Zona batimétrica', hint: 'Tabla VI: 50–200 m apto, 20–50 m moderado, <20 m no apto. El área de estudio llega hasta la isóbata de 200 m.' },
  ];
  const criteria: Criterion[] = specs.map((s) => ({ id: uid('k'), name: s.name, hint: s.hint, src: null }));
  const rules: GeoConfig['rules'] = {};
  criteria.forEach((c, i) => { rules[c.id] = { layerKey: BOYA_RULES[i].layerKey, fn: BOYA_RULES[i].fn }; });
  return {
    id: 'boya-2021', label: 'Boya de monitoreo oceanográfico · con datos (artículo 2021)', hasData: true,
    blurb: 'Caso real de la tesis del docente (Polo-Castañeda et al., 2021), con las clases 1/2/3 del autor a 250 m y las concesiones como exclusión. Trae un experto de ejemplo con la Tabla IV redondeada, marcado como tal.',
    title: 'Zonas aptas para una boya de monitoreo oceanográfico (ejemplo del artículo de 2021)',
    objective: 'Determinar dónde instalar una red de sensores inalámbricos tipo boya en la zona de surgencia del Caribe sur (isóbata de 200 m), lejos de ecosistemas, tráfico marítimo y zonas de pesca, y sin las áreas de concesión.',
    criteria,
    geo: { packId: 'boya-wsn-v1', rules, classes: { ...BOYA_CLASSES } },
    expert: {
      name: 'Ejemplo · Tabla IV del artículo (redondeada)',
      roleDesc: 'Reconstrucción entera de la matriz agregada publicada, para probar el mecanismo. NO son respuestas de expertos reales.',
      judgments: BOYA_TABLA_IV.map(([i, j, value]) => ({ key: `${criteria[i].id}-${criteria[j].id}`, value })),
    },
  };
}

export function buildExample(id: ExampleId): Example {
  return { ...(id === 'cacao-snsm' ? cacao() : id === 'boya-2021' ? boyaDatos() : boya()), source: 'builtin' };
}
export const EXAMPLE_IDS: ExampleId[] = ['cacao-snsm', 'boya-2021', 'boya-wsn'];
