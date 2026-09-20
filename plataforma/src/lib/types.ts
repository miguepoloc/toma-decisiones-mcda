import type { PrioState } from './prio.ts';

export type Criterion = { id: string; name: string; hint: string; src?: string | null };
export type Alternative = { id: string; name: string };
export type ExpertStatus = 'pending' | 'in_progress' | 'submitted';
/** 'ahp' = alternativas comparadas de a pares (como hasta ahora); 'topsis' = matriz de decisión
 * cuantitativa + los mismos pesos de la hoja Criterios. Ver plataforma/README.md § "Visión". */
export type Method = 'ahp' | 'topsis';
export type MatrixType = 'max' | 'min';
/** { values: { <altId>: { <critId>: number } }, types: { <critId>: 'max'|'min' } }, referenciado
 * por id igual que los juicios de AHP (no por posición). */
export type DecisionMatrix = {
  values: Record<string, Record<string, number>>;
  types: Record<string, MatrixType>;
};

export type ProjectRow = {
  id: string;
  owner_id: string;
  title: string;
  objective: string;
  method: Method;
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
    title: string; objective: string; method: Method; criteria: Criterion[]; alternatives: Alternative[];
    decision_matrix: DecisionMatrix | Record<string, never>;
  };
  experts: { id: string; label: string }[];
  judgments: JudgmentRow[];
};

export const uid = (prefix = 'x') => prefix + Math.random().toString(36).slice(2, 8);
export const hexToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
