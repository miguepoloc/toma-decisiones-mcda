'use client';

import { useEffect } from 'react';

export type MethodKey = 'ahp' | 'topsis' | 'vikor' | 'promethee' | 'electre' | 'saw' | 'fuzzy_topsis';

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
  citationApa: string;
}

export const METHOD_SPECS: Record<MethodKey, MethodDoc> = {
  ahp: {
    name: 'AHP · Analytic Hierarchy Process',
    family: 'Pares Saaty',
    color: 'var(--m-ahp)',
    author: 'Saaty, Thomas L.',
    year: 1980,
    publication: 'The Analytic Hierarchy Process. McGraw-Hill / European Journal of Operational Research (1990)',
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
  },
};

export default function ScientificMethodModal({
  methodKey,
  onClose,
}: {
  methodKey: MethodKey;
  onClose: () => void;
}) {
  const method = METHOD_SPECS[methodKey] || METHOD_SPECS.topsis;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7, 10, 16, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderTop: `4px solid ${method.color}`,
          borderRadius: 14,
          maxWidth: 680,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          padding: '28px',
          display: 'grid',
          gap: 20,
          animation: 'fadeIn 0.2s ease-out',
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
            <h2 style={{ fontSize: 22, margin: 0, color: 'var(--ink)' }}>{method.name}</h2>
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

        {/* Referencia Formal */}
        <div
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '14px 16px',
            display: 'grid',
            gap: 6,
          }}
        >
          <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>
            Referencia Bibliográfica del Artículo (APA 7.ª ed.)
          </div>
          <div style={{ fontSize: 13, fontFamily: 'var(--f-mono)', color: 'var(--ink)', lineHeight: 1.5 }}>
            {method.citationApa}
          </div>
          <div style={{ fontSize: 12, color: method.color, fontFamily: 'var(--f-mono)', marginTop: 2 }}>
            DOI: {method.doi}
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
            onClick={() => {
              navigator.clipboard?.writeText(method.citationApa);
              alert('Cita bibliográfica copiada al portapapeles en formato APA');
            }}
          >
            Copiar Cita APA
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
    </div>
  );
}
