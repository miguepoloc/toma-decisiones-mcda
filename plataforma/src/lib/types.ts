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
  /** Solo VIKOR: v = peso de la estrategia de mayoría (S) frente al arrepentimiento (R), en [0, 1].
   * No se deriva de los datos, lo elige quien decide (Alidrisi 2021: 0.5 = "consenso" por convención).
   * Vive aquí, dentro del JSON de `decision_matrix`, para que `public_get`/`expert_get`, los respaldos
   * `.json` y la hoja `_datos` del Excel lo lleven sin migración. Si falta, se asume 0.5. */
  vikorV?: number;
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

/** Lo que devuelve admin_stats() (20240101000009_admin_v2.sql, amplía 20240101000007/000008):
 * agregados across-owner MÁS un puñado de listas con detalle individual (usuarios_historial,
 * proyectos_historial, proyectos_abandonados), aprobadas explícitamente el 22 sep 2026 — ver
 * README § Historial de cambios sobre por qué esto ya no es "solo agregados". La función revisa
 * el rol del solicitante por sí misma, así que si esto llega aquí es porque el RPC ya lo autorizó. */
export type AdminStats = {
  proyectos_total: number;
  proyectos_publicos: number;
  proyectos_privados: number;
  usuarios_total: number;
  expertos_total: number;
  expertos_pending: number;
  expertos_in_progress: number;
  expertos_submitted: number;
  criterios_total: number;
  alternativas_total: number;
  juicios_total: number;
  metodos: { metodo: Method; total: number }[];
  ponderacion: { metodo: WeightingMethod; total: number }[];
  expertos_filled_by: { quien: 'expert' | 'owner'; total: number }[];
  embudo_expertos: {
    invitados: number;
    empezaron: number;
    enviaron: number;
    avg_dias_invitado_a_empezar: number | null;
    avg_dias_empezar_a_enviar: number | null;
  };
  crecimiento_semanal: { semana: string; usuarios: number; proyectos: number; juicios: number }[];
  proyectos_abandonados: {
    id: string; titulo: string; dueño_email: string;
    creado: string; actualizado: string; expertos_total: number;
  }[];
  usuarios_historial: { email: string; nombre: string | null; creado: string }[];
  proyectos_historial: {
    id: string; titulo: string; dueño_email: string; metodo: Method; publico: boolean; creado: string;
  }[];
  rate_limit_picos: { funcion: string; pico_por_minuto: number; limite: number; cerca_del_limite: boolean }[];
  accesos_recientes: { email: string; fecha: string }[];
};

/** Lo que devuelve admin_ahp_raw() (20240101000009_admin_v2.sql): judgments crudos + criteria/
 * alternatives por proyecto, para que el admin corra la MISMA lógica de ahp.ts (expertMatrix/
 * analyze) en vez de reimplementarla en SQL. Ver computeAhpConsistency() en src/lib/admin.ts. */
export type AdminAhpRawProject = {
  project_id: string;
  criteria: Criterion[];
  alternatives: Alternative[];
  judgments: JudgmentRow[];
};

export const uid = (prefix = 'x') => prefix + Math.random().toString(36).slice(2, 8);
export const hexToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
