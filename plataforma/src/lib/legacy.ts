// Puente con la herramienta HTML (prototipos/): mismo formato de respaldo "v2" (.json y hoja oculta _datos del .xlsx).
import type { Alternative, Criterion } from './types';
import type { JIndex, JMap } from './ahp';
import { blankPrio, normalizePrio, type PrioState } from './prio';

export type Study = {
  title: string;
  objective: string;
  criteria: Criterion[];
  alternatives: Alternative[];
  experts: { id: string; name: string; role_desc: string }[];
  idx: JIndex;
  prio: PrioState;
};

type LegacyState = {
  v: 2;
  obj: string;
  A: PrioState;
  crit: Criterion[];
  alt: Alternative[];
  experts: { id: string; name: string }[];
  J: { crit: Record<string, JMap>; alt: Record<string, Record<string, JMap>> };
  demo?: boolean;
  view?: string;
  nid?: number;
  exId?: string;
};

export function toLegacy(s: Study): LegacyState {
  const J: LegacyState['J'] = { crit: {}, alt: {} };
  for (const e of s.experts) {
    const sheets = s.idx[e.id] ?? {};
    J.crit[e.id] = sheets['crit'] ?? {};
    for (const c of s.criteria) {
      (J.alt[c.id] ??= {})[e.id] = sheets['alt:' + c.id] ?? {};
    }
  }
  return {
    v: 2, obj: s.objective, A: s.prio, crit: s.criteria, alt: s.alternatives,
    experts: s.experts.map((e) => ({ id: e.id, name: e.role_desc || e.name })),
    J, demo: false, view: 'A1', nid: 100, exId: s.experts[0]?.id ?? 'e0',
  };
}

export type Imported = {
  objective: string;
  criteria: Criterion[];
  alternatives: Alternative[];
  prio: PrioState;
  experts: { legacyId: string; name: string; role_desc: string }[];
  judgments: { legacyId: string; sheet: string; pair_key: string; value: number }[];
};

export function isLegacy(x: unknown): x is LegacyState {
  const s = x as LegacyState;
  return !!s && s.v === 2 && Array.isArray(s.crit) && Array.isArray(s.alt) && Array.isArray(s.experts) && !!s.J && !!s.A;
}

export function fromLegacy(s: LegacyState): Imported {
  const judgments: Imported['judgments'] = [];
  const push = (legacyId: string, sheet: string, m: JMap | undefined) => {
    for (const [k, v] of Object.entries(m ?? {})) {
      if (typeof v === 'number' && v >= -8 && v <= 8) judgments.push({ legacyId, sheet, pair_key: k, value: Math.round(v) });
    }
  };
  for (const e of s.experts) {
    push(e.id, 'crit', s.J.crit?.[e.id]);
    for (const c of s.crit) push(e.id, 'alt:' + c.id, s.J.alt?.[c.id]?.[e.id]);
  }
  return {
    objective: s.obj ?? '',
    criteria: s.crit.map((c) => ({ id: c.id, name: c.name, hint: c.hint ?? '', src: c.src ?? null })),
    alternatives: s.alt.map((a) => ({ id: a.id, name: a.name })),
    prio: normalizePrio(s.A) ?? blankPrio(),
    experts: s.experts.map((e, i) => ({ legacyId: e.id, name: 'Experto ' + (i + 1), role_desc: e.name })),
    judgments,
  };
}
