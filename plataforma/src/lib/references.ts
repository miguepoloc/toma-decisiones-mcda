// Referencias APA de los métodos de PONDERACIÓN de criterios, un solo lugar para que la pestaña de resultados, el informe
// ejecutivo y el modal científico citen lo mismo. Las referencias de los métodos de ranking (TOPSIS, VIKOR…) viven en
// METHOD_SPECS (ScientificMethodModal.tsx). Todas son referencias reales; los DOI solo donde constan en la bibliografía del curso.
import type { WeightingMethod } from './types.ts';

export type WeightingRef = {
  label: string;
  /** Una frase que dice qué hace y de dónde salen los pesos. */
  how: string;
  /** Referencias APA 7.ª: la fundacional primero. */
  apa: string[];
  /** Cuándo conviene y cuándo no (para no presentarlo como «mejor» sin matices). */
  caveat: string;
};

export const WEIGHTING_REFS: Record<WeightingMethod, WeightingRef> = {
  ahp: {
    label: 'AHP (expertos)',
    how: 'Los pesos salen de la comparación por pares de criterios que hacen los expertos (eigenvector principal de Saaty; media geométrica entre expertos).',
    apa: [
      'Saaty, T. L. (1980). The Analytic Hierarchy Process: Planning, priority setting, resource allocation. McGraw-Hill.',
      'Forman, E., & Peniwati, K. (1998). Aggregating individual judgments and priorities with the Analytic Hierarchy Process. European Journal of Operational Research, 108(1), 165–169.',
    ],
    caveat: 'Refleja las preferencias de los decisores; exige juicios consistentes (CR < 0.10).',
  },
  critic: {
    label: 'CRITIC (objetivo)',
    how: 'Los pesos se calculan solos a partir de la matriz de decisión: un criterio pesa más cuanto más varía entre alternativas (desviación estándar) y cuanto menos se parece a los demás (correlación baja). No intervienen expertos.',
    apa: [
      'Diakoulaki, D., Mavrotas, G., & Papayannakis, L. (1995). Determining objective weights in multiple criteria problems: The CRITIC method. Computers & Operations Research, 22(7), 763–770.',
      'ul Amin, F., Qian-Li, D., Grzybowska, K., Ahmed, Z., & Bo-Rui, Y. (2022). A novel fuzzy-based VIKOR–CRITIC soft computing method for evaluation of sustainable supply chain risk management. Sustainability, 14(5), 2827. https://doi.org/10.3390/su14052827',
    ],
    caveat: 'Mide contraste de los datos, no importancia para quien decide: un criterio muy relevante pero casi igual en todas las alternativas recibe peso bajo. Se recalcula si cambia la matriz.',
  },
  entropy: {
    label: 'Entropía de Shannon (objetivo)',
    how: 'Los pesos se calculan solos a partir de la matriz de decisión: un criterio cuyos valores se diferencian más entre alternativas tiene menor entropía, informa más y recibe más peso. No intervienen expertos.',
    apa: [
      'Shannon, C. E. (1948). A mathematical theory of communication. Bell System Technical Journal, 27(3), 379–423.',
      'Zeleny, M. (1982). Multiple criteria decision making. McGraw-Hill.',
    ],
    caveat: 'Mide dispersión de los datos, no importancia para quien decide; necesita valores positivos y varias alternativas. Se recalcula si cambia la matriz.',
  },
};

/** Los pesos objetivos (CRITIC/Entropía) no usan juicios de expertos: el flujo de expertos, CR y consenso no aplica. */
export const isObjectiveWeighting = (w: WeightingMethod | null | undefined): w is 'critic' | 'entropy' => w === 'critic' || w === 'entropy';
