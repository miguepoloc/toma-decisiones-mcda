'use client';

import { useState, useEffect, useRef } from 'react';

export type MethodKey = 'ahp' | 'topsis' | 'vikor' | 'promethee' | 'electre' | 'saw' | 'fuzzy_topsis';
export type CitationFormat = 'ieee' | 'apa' | 'bibtex' | 'chicago';

interface MethodDoc {
  name: string;
  family: string;
  color: string;
  author: string;
  year: number;
  publication: string;
  doi: string;
  doiUrl: string;
  summary: string;
  steps: { title: string; formula?: string; desc: string }[];
  citations: Record<CitationFormat, string>;
  citationApa: string; // compatibilidad
}

export const METHOD_SPECS: Record<MethodKey, MethodDoc> = {
  ahp: {
    name: 'AHP · Analytic Hierarchy Process',
    family: 'Pares Saaty',
    color: 'var(--m-ahp)',
    author: 'Saaty, Thomas L.',
    year: 1990,
    publication: 'European Journal of Operational Research, 48(1), 9–26',
    doi: '10.1016/0377-2217(90)90057-I',
    doiUrl: 'https://doi.org/10.1016/0377-2217(90)90057-I',
    summary: 'Descompone el problema en una estructura jerárquica. Emplea comparaciones de a pares bajo una escala fundamental (1 al 9) y deriva el vector de prioridades resolviendo el problema de autovalor máximo (A · w = λ_max · w). Incluye el cálculo riguroso de la Razón de Consistencia (CR < 0.10).',
    steps: [
      {
        title: '1. Matriz de Juicios Pareados A',
        formula: 'a_ij > 0,  a_ji = 1 / a_ij,  a_ii = 1',
        desc: 'Construcción de la matriz recíproca positiva a partir de las evaluaciones de los expertos.',
      },
      {
        title: '2. Vector de Prioridades (Autovector)',
        formula: 'A · w = λ_max · w   ⇒   w_i ≈ ( ∏_j a_ij )^(1/n) / Σ_k [ ( ∏_j a_kj )^(1/n) ]',
        desc: 'Aproximación por media geométrica normalizada del autovector principal de Perron-Frobenius.',
      },
      {
        title: '3. Índice y Razón de Consistencia',
        formula: 'CI = (λ_max - n) / (n - 1),   CR = CI / RI_n',
        desc: 'Si CR ≤ 0.10, la matriz es formalmente consistente. Si no, se requiere revisar los juicios.',
      },
    ],
    citationApa: 'Saaty, T. L. (1990). How to make a decision: The Analytic Hierarchy Process. European Journal of Operational Research, 48(1), 9–26. https://doi.org/10.1016/0377-2217(90)90057-I',
    citations: {
      ieee: 'T. L. Saaty, "How to make a decision: The Analytic Hierarchy Process," European Journal of Operational Research, vol. 48, no. 1, pp. 9–26, 1990, doi: 10.1016/0377-2217(90)90057-I.',
      apa: 'Saaty, T. L. (1990). How to make a decision: The Analytic Hierarchy Process. European Journal of Operational Research, 48(1), 9–26. https://doi.org/10.1016/0377-2217(90)90057-I',
      bibtex: `@article{saaty1990how,
  author    = {Saaty, Thomas L.},
  title     = {How to make a decision: The Analytic Hierarchy Process},
  journal   = {European Journal of Operational Research},
  volume    = {48},
  number    = {1},
  pages     = {9--26},
  year      = {1990},
  doi       = {10.1016/0377-2217(90)90057-I}
}`,
      chicago: 'Saaty, Thomas L. 1990. "How to Make a Decision: The Analytic Hierarchy Process." European Journal of Operational Research 48 (1): 9–26. https://doi.org/10.1016/0377-2217(90)90057-I.',
    },
  },
  topsis: {
    name: 'TOPSIS · Technique for Order Preference by Similarity to Ideal Solution',
    family: 'Distancia Ideal',
    color: 'var(--m-topsis)',
    author: 'Hwang, Ching-Lai & Yoon, Kwangsun',
    year: 1981,
    publication: 'Multiple Attribute Decision Making: Methods and Applications. Springer-Verlag',
    doi: '10.1007/978-3-642-48318-9',
    doiUrl: 'https://doi.org/10.1007/978-3-642-48318-9',
    summary: 'Selecciona la alternativa con la menor distancia euclidiana a la Solución Ideal Positiva (PIS, A+) y simultáneamente la mayor distancia a la Solución Ideal Negativa o Anti-ideal (NIS, A-). Requiere normalización vectorial previa.',
    steps: [
      {
        title: '1. Normalización Vectorial',
        formula: 'r_ij = x_ij / √( ∑_{k=1}^m x_kj² )',
        desc: 'Transforma los datos de distintas magnitudes y unidades a una escala adimensional euclidiana.',
      },
      {
        title: '2. Matriz Ponderada y Soluciones Ideales',
        formula: 'v_ij = w_j · r_ij;   A⁺ = (max_i v_ij | j∈B, min_i v_ij | j∈C);   A⁻ = (min_i v_ij | j∈B, max_i v_ij | j∈C)',
        desc: 'Identificación de los mejores y peores desempeños ponderados para criterios de beneficio (B) y costo (C).',
      },
      {
        title: '3. Coeficiente de Proximidad Relativa',
        formula: 'C_i = d_i⁻ / ( d_i⁺ + d_i⁻ ),   donde C_i ∈ [0, 1]',
        desc: 'Distancias euclidianas d_i⁺ y d_i⁻. Cuanto más cercano a 1 sea C_i, mayor es la preferencia de la alternativa.',
      },
    ],
    citationApa: 'Hwang, C. L., & Yoon, K. (1981). Multiple Attribute Decision Making: Methods and Applications. Springer-Verlag, Berlin/Heidelberg. https://doi.org/10.1007/978-3-642-48318-9',
    citations: {
      ieee: 'C.-L. Hwang and K. Yoon, Multiple Attribute Decision Making: Methods and Applications. Berlin, Heidelberg: Springer-Verlag, 1981, doi: 10.1007/978-3-642-48318-9.',
      apa: 'Hwang, C. L., & Yoon, K. (1981). Multiple Attribute Decision Making: Methods and Applications. Springer-Verlag, Berlin/Heidelberg. https://doi.org/10.1007/978-3-642-48318-9',
      bibtex: `@book{hwang1981multiple,
  author    = {Hwang, Ching-Lai and Yoon, Kwangsun},
  title     = {Multiple Attribute Decision Making: Methods and Applications},
  publisher = {Springer-Verlag},
  address   = {Berlin, Heidelberg},
  year      = {1981},
  doi       = {10.1007/978-3-642-48318-9}
}`,
      chicago: 'Hwang, Ching-Lai, and Kwangsun Yoon. 1981. Multiple Attribute Decision Making: Methods and Applications. Berlin: Springer-Verlag. https://doi.org/10.1007/978-3-642-48318-9.',
    },
  },
  vikor: {
    name: 'VIKOR · VlseKriterijumska Optimizacija I Kompromisno Resenje',
    family: 'Compromiso',
    color: 'var(--m-vikor)',
    author: 'Opricovic, Serafim & Tzeng, Gwo-Hshiung',
    year: 2004,
    publication: 'European Journal of Operational Research, 156(2), 445–455',
    doi: '10.1016/S0377-2217(03)00020-1',
    doiUrl: 'https://doi.org/10.1016/S0377-2217(03)00020-1',
    summary: 'Desarrollado para optimización multiobjetivo de sistemas complejos. Determina una solución de compromiso que maximiza la utilidad del grupo (mínimo S) y minimiza el pesar individual del oponente (mínimo R), sintetizado mediante el índice global Q.',
    steps: [
      {
        title: '1. Medidas de Utilidad y Pesar (S_i y R_i)',
        formula: 'S_i = ∑_j w_j · (f_j* - f_ij) / (f_j* - f_j⁻),   R_i = max_j [ w_j · (f_j* - f_ij) / (f_j* - f_j⁻) ]',
        desc: 'Donde f_j* y f_j⁻ representan el mejor y peor valor en el criterio j.',
      },
      {
        title: '2. Índice Multicriterio de Compromiso Q_i',
        formula: 'Q_i = v · (S_i - S*) / (S⁻ - S*) + (1 - v) · (R_i - R*) / (R⁻ - R*)',
        desc: 'Parámetro v (peso de la estrategia de máxima utilidad de grupo, típicamente v = 0.5).',
      },
      {
        title: '3. Condiciones de Decisión Aceptable',
        formula: 'C1: Ventaja Aceptable (Q(2) - Q(1) ≥ 1/(m-1))   y   C2: Estabilidad Aceptable',
        desc: 'Verificación estricta de estabilidad del ranking antes de declarar una alternativa ganadora única.',
      },
    ],
    citationApa: 'Opricovic, S., & Tzeng, G. H. (2004). Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS. European Journal of Operational Research, 156(2), 445–455. https://doi.org/10.1016/S0377-2217(03)00020-1',
    citations: {
      ieee: 'S. Opricovic and G.-H. Tzeng, "Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS," European Journal of Operational Research, vol. 156, no. 2, pp. 445–455, 2004, doi: 10.1016/S0377-2217(03)00020-1.',
      apa: 'Opricovic, S., & Tzeng, G. H. (2004). Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS. European Journal of Operational Research, 156(2), 445–455. https://doi.org/10.1016/S0377-2217(03)00020-1',
      bibtex: `@article{opricovic2004compromise,
  author    = {Opricovic, Serafim and Tzeng, Gwo-Hshiung},
  title     = {Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS},
  journal   = {European Journal of Operational Research},
  volume    = {156},
  number    = {2},
  pages     = {445--455},
  year      = {2004},
  doi       = {10.1016/S0377-2217(03)00020-1}
}`,
      chicago: 'Opricovic, Serafim, and Gwo-Hshiung Tzeng. 2004. "Compromise Solution by MCDM Methods: A Comparative Analysis of VIKOR and TOPSIS." European Journal of Operational Research 156 (2): 445–455. https://doi.org/10.1016/S0377-2217(03)00020-1.',
    },
  },
  promethee: {
    name: 'PROMETHEE II · Preference Ranking Organization METHod',
    family: 'Superación',
    color: 'var(--m-promethee)',
    author: 'Brans, Jean-Pierre & Vincke, Philippe',
    year: 1985,
    publication: 'Management Science, 31(6), 647–656',
    doi: '10.1287/mnsc.31.6.647',
    doiUrl: 'https://doi.org/10.1287/mnsc.31.6.647',
    summary: 'Método de relaciones de superación (outranking) basado en la comparación pairwise de alternativas en cada criterio con funciones de preferencia generalizadas P_j(a, b), calculando flujos entrantes, salientes y el flujo neto total Φ.',
    steps: [
      {
        title: '1. Índice de Preferencia Global',
        formula: 'π(a, b) = ∑_j w_j · P_j(a, b)',
        desc: 'P_j mide la intensidad de preferencia de la alternativa a sobre b en función de su diferencia f_j(a) - f_j(b).',
      },
      {
        title: '2. Flujos Positivos y Negativos',
        formula: 'Φ⁺(a) = 1/(m-1) ∑_x π(a, x),   Φ⁻(a) = 1/(m-1) ∑_x π(x, a)',
        desc: 'Φ⁺ indica el poder de superación de a sobre las demás; Φ⁻ su debilidad frente a las demás.',
      },
      {
        title: '3. Flujo Neto Completo (PROMETHEE II)',
        formula: 'Φ(a) = Φ⁺(a) - Φ⁻(a),   donde ∑_a Φ(a) = 0',
        desc: 'Proporciona un preorden completo y ordenación total sin pares incomparables.',
      },
    ],
    citationApa: 'Brans, J. P., & Vincke, P. (1985). A preference ranking organisation method: The PROMETHEE method for multiple criteria decision-making. Management Science, 31(6), 647–656. https://doi.org/10.1287/mnsc.31.6.647',
    citations: {
      ieee: 'J.-P. Brans and P. Vincke, "A preference ranking organisation method: The PROMETHEE method for multiple criteria decision-making," Management Science, vol. 31, no. 6, pp. 647–656, 1985, doi: 10.1287/mnsc.31.6.647.',
      apa: 'Brans, J. P., & Vincke, P. (1985). A preference ranking organisation method: The PROMETHEE method for multiple criteria decision-making. Management Science, 31(6), 647–656. https://doi.org/10.1287/mnsc.31.6.647',
      bibtex: `@article{brans1985preference,
  author    = {Brans, Jean-Pierre and Vincke, Philippe},
  title     = {A preference ranking organisation method: The {PROMETHEE} method for multiple criteria decision-making},
  journal   = {Management Science},
  volume    = {31},
  number    = {6},
  pages     = {647--656},
  year      = {1985},
  doi       = {10.1287/mnsc.31.6.647}
}`,
      chicago: 'Brans, Jean-Pierre, and Philippe Vincke. 1985. "A Preference Ranking Organisation Method: The PROMETHEE Method for Multiple Criteria Decision-Making." Management Science 31 (6): 647–656. https://doi.org/10.1287/mnsc.31.6.647.',
    },
  },
  electre: {
    name: 'ELECTRE · ELimination Et Choix Traduisant la REalité',
    family: 'Concordancia',
    color: 'var(--m-electre)',
    author: 'Roy, Bernard',
    year: 1991,
    publication: 'Theory and Decision, 31(1), 49–73',
    doi: '10.1007/BF00134132',
    doiUrl: 'https://doi.org/10.1007/BF00134132',
    summary: 'Familia francesa de superación no compensatoria. Examina si existe una mayoría suficiente de criterios a favor de una alternativa (concordancia C_ik ≥ c) y ningún criterio en desacuerdo inaceptable (discordancia D_ik ≤ d con umbral de veto).',
    steps: [
      {
        title: '1. Índice de Concordancia',
        formula: 'C_ik = ∑_{j: x_ij ≥ x_kj} w_j / ∑_j w_j',
        desc: 'Suma de pesos de todos los criterios donde la alternativa i es al menos tan buena como la alternativa k.',
      },
      {
        title: '2. Índice de Discordancia',
        formula: 'D_ik = max_{j: x_ij < x_kj} [ |x_ij - x_kj| ] / max_j [ max_a x_aj - min_a x_aj ]',
        desc: 'Intensidad de la mayor oposición en contra de la afirmación de que i supera a k.',
      },
      {
        title: '3. Relación de Superación y Grafo',
        formula: 'i S k ⇔ C_ik ≥ c̄  y  D_ik ≤ d̄',
        desc: 'Permite identificar incomparabilidades genuinas cuando la información no justifica una ordenación forzada.',
      },
    ],
    citationApa: 'Roy, B. (1991). The outranking approach and the foundations of ELECTRE methods. Theory and Decision, 31(1), 49–73. https://doi.org/10.1007/BF00134132',
    citations: {
      ieee: 'B. Roy, "The outranking approach and the foundations of ELECTRE methods," Theory and Decision, vol. 31, no. 1, pp. 49–73, 1991, doi: 10.1007/BF00134132.',
      apa: 'Roy, B. (1991). The outranking approach and the foundations of ELECTRE methods. Theory and Decision, 31(1), 49–73. https://doi.org/10.1007/BF00134132',
      bibtex: `@article{roy1991outranking,
  author    = {Roy, Bernard},
  title     = {The outranking approach and the foundations of {ELECTRE} methods},
  journal   = {Theory and Decision},
  volume    = {31},
  number    = {1},
  pages     = {49--73},
  year      = {1991},
  doi       = {10.1007/BF00134132}
}`,
      chicago: 'Roy, Bernard. 1991. "The Outranking Approach and the Foundations of ELECTRE Methods." Theory and Decision 31 (1): 49–73. https://doi.org/10.1007/BF00134132.',
    },
  },
  saw: {
    name: 'SAW · Simple Additive Weighting',
    family: 'Suma Directa',
    color: 'var(--m-saw)',
    author: 'MacCrimmon, Kenneth R.',
    year: 1968,
    publication: 'Decisionmaking among multiple-attribute alternatives: a survey and consolidated approach. RAND Memorandum',
    doi: 'RAND-RM-5687-PR',
    doiUrl: 'https://www.rand.org/pubs/memoranda/RM4823.html',
    summary: 'El método MCDA más clásico, intuitivo y transparente. Realiza una normalización lineal Min-Max por criterio y calcula la suma ponderada del vector de alternativas. Excelente para comunicación y justificación ejecutiva ante comités.',
    steps: [
      {
        title: '1. Normalización Lineal Min-Max',
        formula: 'Beneficio: r_ij = (x_ij - min x_j) / (max x_j - min x_j);   Costo: r_ij = (max x_j - x_ij) / (max x_j - min x_j)',
        desc: 'Asegura que el mejor desempeño tome valor 1.0 y el peor tome 0.0.',
      },
      {
        title: '2. Síntesis Ponderada Aditiva',
        formula: 'S_i = ∑_{j=1}^n w_j · r_ij',
        desc: 'Cálculo de la utilidad global como producto punto entre el vector de pesos y el vector normalizado.',
      },
      {
        title: '3. Ranking Final',
        formula: 'A* = arg max_i (S_i)',
        desc: 'La alternativa con mayor puntuación acumulada S_i encabeza el orden de prioridad.',
      },
    ],
    citationApa: 'MacCrimmon, K. R. (1968). Decisionmaking among multiple-attribute alternatives: A survey and consolidated approach. RAND Corporation Memorandum RM-4823-PR.',
    citations: {
      ieee: 'K. R. MacCrimmon, "Decisionmaking among multiple-attribute alternatives: A survey and consolidated approach," RAND Corporation, Santa Monica, CA, Tech. Rep. RM-4823-PR, 1968.',
      apa: 'MacCrimmon, K. R. (1968). Decisionmaking among multiple-attribute alternatives: A survey and consolidated approach (RAND Memorandum RM-4823-PR). RAND Corporation.',
      bibtex: `@techreport{maccrimmon1968decisionmaking,
  author      = {MacCrimmon, Kenneth R.},
  title       = {Decisionmaking among multiple-attribute alternatives: A survey and consolidated approach},
  institution = {RAND Corporation},
  address     = {Santa Monica, CA},
  number      = {RM-4823-PR},
  year        = {1968},
  url         = {https://www.rand.org/pubs/memoranda/RM4823.html}
}`,
      chicago: 'MacCrimmon, Kenneth R. 1968. "Decisionmaking among Multiple-Attribute Alternatives: A Survey and Consolidated Approach." RAND Memorandum RM-4823-PR. Santa Monica, CA: RAND Corporation.',
    },
  },
  fuzzy_topsis: {
    name: 'Fuzzy TOPSIS · Números Difusos Triangulares (TFN)',
    family: 'Lógica Difusa',
    color: 'var(--m-fuzzy)',
    author: 'Chen, Chen-Tung',
    year: 2000,
    publication: 'Fuzzy Sets and Systems, 114(1), 1–9',
    doi: '10.1016/S0165-0114(97)00377-1',
    doiUrl: 'https://doi.org/10.1016/S0165-0114(97)00377-1',
    summary: 'Modela la imprecisión y ambigüedad del juicio humano mediante Números Difusos Triangulares TFN (a, b, c). Evalúa las alternativas a través de variables lingüísticas y calcula la distancia difusa por el método de vértice euclidiano.',
    steps: [
      {
        title: '1. Variables Lingüísticas y Escala Difusa',
        formula: 'VP = (0,0,1),  P = (0,1,3),  MP = (1,3,5),  F = (3,5,7),  MG = (5,7,9),  G = (7,9,10),  VG = (9,10,10)',
        desc: 'Transforma juicios cualitativos en tripletas triangulares con soporte y vértice central.',
      },
      {
        title: '2. Distancia por Método de Vértice',
        formula: 'd(x̃, ỹ) = √[ 1/3 · ( (a_x - a_y)² + (b_x - b_y)² + (c_x - c_y)² ) ]',
        desc: 'Mide la proximidad espacial entre números difusos triangulares sin necesidad de defuzzificación prematura.',
      },
      {
        title: '3. Coeficiente de Cercanía Difuso (CC_i)',
        formula: 'CC_i = d_i⁻ / ( d_i⁺ + d_i⁻ )',
        desc: 'Ranqueo final basado en cercanía al FPIS (A*) y lejanía del FNIS (A⁻).',
      },
    ],
    citationApa: 'Chen, C. T. (2000). Extensions of the TOPSIS for group decision-making under fuzzy environment. Fuzzy Sets and Systems, 114(1), 1–9. https://doi.org/10.1016/S0165-0114(97)00377-1',
    citations: {
      ieee: 'C.-T. Chen, "Extensions of the TOPSIS for group decision-making under fuzzy environment," Fuzzy Sets and Systems, vol. 114, no. 1, pp. 1–9, 2000, doi: 10.1016/S0165-0114(97)00377-1.',
      apa: 'Chen, C. T. (2000). Extensions of the TOPSIS for group decision-making under fuzzy environment. Fuzzy Sets and Systems, 114(1), 1–9. https://doi.org/10.1016/S0165-0114(97)00377-1',
      bibtex: `@article{chen2000extensions,
  author    = {Chen, Chen-Tung},
  title     = {Extensions of the {TOPSIS} for group decision-making under fuzzy environment},
  journal   = {Fuzzy Sets and Systems},
  volume    = {114},
  number    = {1},
  pages     = {1--9},
  year      = {2000},
  doi       = {10.1016/S0165-0114(97)00377-1}
}`,
      chicago: 'Chen, Chen-Tung. 2000. "Extensions of the TOPSIS for Group Decision-Making under Fuzzy Environment." Fuzzy Sets and Systems 114 (1): 1–9. https://doi.org/10.1016/S0165-0114(97)00377-1.',
    },
  },
};

const FORMAT_LABELS: Record<CitationFormat, string> = {
  ieee: 'IEEE',
  apa: 'APA 7.ª',
  bibtex: 'BibTeX',
  chicago: 'Chicago',
};

export default function ScientificMethodModal({
  methodKey,
  onClose,
}: {
  methodKey: MethodKey;
  onClose: () => void;
}) {
  const method = METHOD_SPECS[methodKey] || METHOD_SPECS.topsis;
  const [format, setFormat] = useState<CitationFormat>('ieee');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 2800);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  const activeCitation = method.citations[format];

  function copyCitation() {
    navigator.clipboard?.writeText(activeCitation);
    setToastMsg(`Cita en formato ${FORMAT_LABELS[format]} copiada al portapapeles`);
  }

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7, 10, 16, 0.84)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Toast Notificación Glassmórfica («Toast Lindo») */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(0, 229, 255, 0.5)',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 229, 255, 0.25)',
            borderRadius: 12,
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 3000,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            animation: 'toastSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'rgba(0, 229, 255, 0.2)',
              border: '1px solid #00E5FF',
              color: '#00E5FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            ✓
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>{toastMsg}</div>
            <div style={{ fontSize: 11.5, color: '#94A3B8' }}>Lista para pegar en tu artículo o Overleaf</div>
          </div>
        </div>
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="smm-title"
        tabIndex={-1}
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderTop: `4px solid ${method.color}`,
          borderRadius: 14,
          maxWidth: 700,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          padding: '28px',
          display: 'grid',
          gap: 20,
          animation: 'fadeIn 0.2s ease-out',
          position: 'relative',
        }}
      >
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--f-mono)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: method.color,
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  border: `1px solid ${method.color}`,
                }}
              >
                {method.family}
              </span>
              <span style={{ fontSize: 12, fontFamily: 'var(--f-mono)', color: 'var(--muted)' }}>
                FUNDAMENTO MATEMÁTICO
              </span>
            </div>
            <h2 id="smm-title" style={{ fontSize: 22, margin: 0, color: 'var(--ink)' }}>{method.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--line)',
              color: 'var(--muted)',
              fontSize: 16,
              width: 32,
              height: 32,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Resumen Conceptual */}
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
          {method.summary}
        </p>

        {/* Selector de Formato de Cita Bibliográfica */}
        <div
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '16px 18px',
            display: 'grid',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 11.5, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.06em', fontWeight: 600 }}>
              Formato de Cita para Publicación:
            </div>
            {/* Tabs de formatos */}
            <div style={{ display: 'flex', gap: 6 }}>
              {(['ieee', 'apa', 'bibtex', 'chicago'] as CitationFormat[]).map((fmt) => {
                const isActive = format === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    style={{
                      appearance: 'none',
                      background: isActive ? method.color : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? '#0B0F17' : 'var(--muted)',
                      border: `1px solid ${isActive ? method.color : 'var(--line)'}`,
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontFamily: 'var(--f-mono)',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {FORMAT_LABELS[fmt]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caja con la cita en el formato elegido */}
          <div
            style={{
              fontSize: format === 'bibtex' ? 12 : 13,
              fontFamily: 'var(--f-mono)',
              color: 'var(--ink)',
              lineHeight: 1.55,
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '12px 14px',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              whiteSpace: format === 'bibtex' ? 'pre' : 'normal',
              overflowX: 'auto',
            }}
          >
            {activeCitation}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
            <span>DOI: <b style={{ color: method.color }}>{method.doi}</b></span>
            <button
              type="button"
              onClick={copyCitation}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                padding: '4px 12px',
                borderRadius: 5,
                fontSize: 12,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--f-body)',
                fontWeight: 600,
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = method.color;
                e.currentTarget.style.color = method.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.color = 'var(--ink)';
              }}
            >
              📋 Copiar cita en {FORMAT_LABELS[format]}
            </button>
          </div>
        </div>

        {/* Formulación Matemática Paso a Paso */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 10 }}>
            Ecuaciones y Algoritmo de Cálculo
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {method.steps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--line)',
                  borderLeft: `3px solid ${method.color}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{step.title}</div>
                {step.formula && (
                  <div
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 12.5,
                      color: method.color,
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '6px 10px',
                      borderRadius: 4,
                      margin: '6px 0',
                      wordBreak: 'break-word',
                    }}
                  >
                    {step.formula}
                  </div>
                )}
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
          <button
            type="button"
            className="btn sm"
            onClick={copyCitation}
            style={{ fontWeight: 600 }}
          >
            Copiar {FORMAT_LABELS[format]}
          </button>
          <a
            href={method.doiUrl}
            target="_blank"
            rel="noreferrer"
            className="btn primary sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Abrir artículo original (DOI) ↗
          </a>
        </div>
      </div>

      <style jsx global>{`
        @keyframes toastSlideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -16px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}
