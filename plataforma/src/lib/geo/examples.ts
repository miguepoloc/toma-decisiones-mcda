/** Proyectos de ejemplo del geovisor. Se cargan con un botón (nunca automáticamente): el estudiante
 * decide si parte de cero o de un caso guiado. */
import { SNSM_CACAO_RULES } from './membership.ts';
import { uid } from '../types.ts';
import type { Criterion, GeoConfig } from '../types.ts';

export type ExampleId = 'cacao-snsm' | 'boya-wsn';
export type Example = { id: string; source?: 'builtin' | 'catalog'; label: string; blurb: string; hasData: boolean; title: string; objective: string; criteria: Criterion[]; geo: GeoConfig };

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
    id: 'boya-wsn', label: 'Boya de monitoreo oceanográfico (tesis · artículo 2021)', hasData: false,
    blurb: 'Plantilla del artículo AHP-SIG de la boya: 4 criterios con los rangos de la Tabla VI. No trae mapas: tú subes los tuyos (ecosistemas, tráfico, pesca, batimetría) y las concesiones como exclusión.',
    title: 'Zonas aptas para una boya de monitoreo oceanográfico',
    objective: 'Determinar dónde es viable instalar una red de sensores inalámbricos tipo boya, evitando ecosistemas, tráfico marítimo, zonas de pesca y profundidades inadecuadas, y excluyendo las áreas de concesión.',
    criteria: items.map((i) => i.c), geo: { rules, classes: { ...CLASSES } },
  };
}

export function buildExample(id: ExampleId): Example { return { ...(id === 'cacao-snsm' ? cacao() : boya()), source: 'builtin' }; }
export const EXAMPLE_IDS: ExampleId[] = ['cacao-snsm', 'boya-wsn'];
