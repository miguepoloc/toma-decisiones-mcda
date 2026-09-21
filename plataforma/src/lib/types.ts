import type { PrioState } from './prio.ts';

export type Criterion = { id: string; name: string; hint: string; src?: string | null };
export type Alternative = { id: string; name: string };
export type ExpertStatus = 'pending' | 'in_progress' | 'submitted';
/** 'ahp' = alternativas comparadas de a pares (como hasta ahora); los demás usan una matriz de
 * decisión cuantitativa + los mismos pesos de la hoja Criterios ('electre' NO da un ranking total,
 * da relaciones de superación con incomparabilidad posible). Ver plataforma/README.md § "Visión". */
export type Method = 'ahp' | 'topsis' | 'vikor' | 'electre' | 'promethee' | 'saw' | 'fuzzy_topsis';
/** Método para calcular los pesos de los criterios:
 * - 'ahp': pesos derivados de los juicios por pares de los expertos (comportamiento histórico).
 * - 'critic': pesos objetivos basados en correlación entre criterios (Diakoulaki et al., 1995).
 * - 'entropy': pesos objetivos basados en la entropía de Shannon de cada criterio.
 * Solo aplica cuando method !== 'ahp'; AHP siempre deriva sus propios pesos. */
export type WeightingMethod = 'ahp' | 'critic' | 'entropy';
export type MatrixType = 'max' | 'min';
/** { values: { <altId>: { <critId>: number | string } }, types: { <critId>: 'max'|'min' } }.
 * Para fuzzy_topsis los valores son etiquetas lingüísticas ('VP'|'P'|'F'|'G'|'VG').
 * Para todos los demás métodos los valores son number. */
export type DecisionMatrix = {
  values: Record<string, Record<string, number | string>>;
  types: Record<string, MatrixType>;
};

export type ProjectRow = {
  id: string;
  owner_id: string;
  title: string;
  objective: string;
  method: Method;
  /** Cómo se calculan los pesos de criterios. Default 'ahp'. Solo relevante cuando method !== 'ahp'. */
  weighting_method: WeightingMethod;
  criteria: Criterion[];
  alternatives: Alternative[];
  decision_matrix: DecisionMatrix | Record<string, never>;
  prioritization: PrioState | Record<string, never>;
  is_public: boolean;
  public_token: string;
  created_at: string;
  updated_at: string;
};

export type ExpertRow = {
  id: string;
  project_id: string;
  name: string;
  role_desc: string;
  invite_token: string;
  status: ExpertStatus;
  filled_by: 'expert' | 'owner';
  submitted_at: string | null;
  position: number;
};

export type JudgmentRow = { expert_id: string; sheet: string; pair_key: string; value: number };

export type ExpertGet = {
  expert: { name: string; role_desc: string; status: ExpertStatus };
  project: { title: string; objective: string; method: Method; criteria: Criterion[]; alternatives: Alternative[] };
  judgments: { sheet: string; pair_key: string; value: number }[];
};

export type PublicGet = {
  project: {
    title: string; objective: string; method: Method; weighting_method?: WeightingMethod; criteria: Criterion[]; alternatives: Alternative[];
    decision_matrix: DecisionMatrix | Record<string, never>;
  };
  experts: { id: string; label: string }[];
  judgments: JudgmentRow[];
};

export const uid = (prefix = 'x') => prefix + Math.random().toString(36).slice(2, 8);
export const hexToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
