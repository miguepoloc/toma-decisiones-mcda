'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type { Criterion, Alternative, DecisionMatrix, WeightingMethod } from '@/lib/types';
import ElectreGraph from './ElectreGraph';
import MethodCharts, { type MethodChartData } from './MethodCharts';
import WeightBars from './WeightBars';
import VikorSensitivityChart from './VikorSensitivityChart';
import { METHOD_SPECS, type MethodKey } from './ScientificMethodModal';
import { getCell, getKind, getTarget } from '@/lib/topsis';
import { LINGUISTIC_ALT } from '@/lib/fuzzy_topsis';
import type { WeightMethod } from '@/lib/ahp';

/** Colores del informe: el modal es siempre blanco (también en impresión), pero los gráficos leen las variables del tema de la app;
 * en modo oscuro `--ink` sería casi blanco sobre papel blanco. Se redefinen aquí en claro, con los tonos de método oscurecidos
 * (el cian de TOPSIS y el ámbar de ELECTRE de la app casi no se ven sobre blanco). */
const REPORT_VARS = {
  '--ink': '#0F172A', '--muted': '#475569', '--line': '#CBD5E1', '--surface': '#FFFFFF', '--surface2': '#F1F5F9',
  '--pass': '#059669', '--accent': '#0284C7',
  '--s1': '#2563EB', '--s2': '#EA580C', '--s3': '#059669', '--s4': '#A16207', '--s5': '#DB2777',
  '--m-topsis': '#0891B2', '--m-vikor': '#059669', '--m-electre': '#B45309',
} as CSSProperties;

/** Consistencia de UNA hoja de comparaciones por pares (criterios, o las alternativas bajo un criterio). */
export type ReportSheetCr = {
  label: string;
  /** Elementos comparados (matriz n×n). Con n < 3 el CR es siempre 0 (RI = 0), no informa nada. */
  n: number;
  cr: number;
  /** CR < 0.10 (Saaty). */
  ok: boolean;
  /** Pares con juicio registrado, sumados entre los expertos incluidos, y los que habría con todos respondidos. */
  answered: number;
  total: number;
  /** CR de cada experto por separado: el agregado puede verse consistente aunque un experto no lo sea. */
  perExpert: { label: string; cr: number; ok: boolean }[];
};

/** Todo lo del informe que sale de juicios por pares (AHP). Solo se pasa cuando hay juicios detrás: AHP, o un método de matriz
 * con pesos por AHP. */
export type ReportAhpInfo = {
  weightMethod: WeightMethod;
  /** Expertos incluidos en el cálculo (agregados por media geométrica). */
  expertCount: number;
  criteriaSheet: ReportSheetCr;
  /** Una por criterio. Vacío en los métodos de matriz (no tienen hojas de alternativas). */
  altSheets: ReportSheetCr[];
  /** Prioridad local de cada alternativa (fila, en el orden de `alternatives`) bajo cada criterio (columna). Vacío fuera de AHP. */
  local: number[][];
};

/** Qué mide el puntaje de cada método y hacia dónde es mejor: un mismo número (0.62) significa cosas opuestas en TOPSIS y en VIKOR. */
const SCORE: Record<MethodKey, { label: string; short: string; fmt: (v: number) => string }> = {
  ahp: { label: 'Prioridad global (mayor es mejor)', short: 'Prioridad global', fmt: (v) => v.toFixed(4) },
  topsis: { label: 'Cercanía relativa C (0 a 1, mayor es mejor)', short: 'Cercanía relativa C', fmt: (v) => v.toFixed(4) },
  vikor: { label: 'Índice Q (0 a 1, MENOR es mejor)', short: 'Índice Q', fmt: (v) => v.toFixed(4) },
  promethee: { label: 'Flujo neto φ (mayor es mejor)', short: 'Flujo neto φ', fmt: (v) => (v >= 0 ? '+' : '') + v.toFixed(4) },
  saw: { label: 'Puntaje SAW (0 a 1, mayor es mejor)', short: 'Puntaje SAW', fmt: (v) => v.toFixed(4) },
  fuzzy_topsis: { label: 'Coeficiente de cercanía CC (0 a 1, mayor es mejor)', short: 'Coeficiente CC', fmt: (v) => v.toFixed(4) },
  // ELECTRE no tiene puntaje: la entrada existe solo para completar el Record; el informe usa la relación de superación.
  electre: { label: 'Sin puntaje (relación de superación)', short: 'Sin puntaje', fmt: (v) => v.toFixed(4) },
};

/** Por qué la ganadora lo es, en los términos del método (la frase genérica «compromiso más favorable» no vale para todos). */
const WINNER_NOTE: Partial<Record<MethodKey, string>> = {
  ahp: 'tiene la mayor prioridad global: la suma, sobre todos los criterios, del peso del criterio por la prioridad local de la alternativa en él.',
  topsis: 'es la más cercana a la solución ideal positiva y la más lejana de la ideal negativa.',
  vikor: 'tiene el menor índice Q, que combina la utilidad de grupo (S) y el arrepentimiento individual máximo (R).',
  promethee: 'tiene el mayor flujo neto φ: la diferencia entre cuánto supera a las demás y cuánto la superan.',
  saw: 'obtiene la mayor suma ponderada de sus valores normalizados.',
  fuzzy_topsis: 'tiene el mayor coeficiente de cercanía CC a la solución ideal difusa, con las evaluaciones lingüísticas como números difusos triangulares.',
};

/** De dónde salen los pesos cuando NO son juicios de expertos: cita y frase. CRITIC y Entropía leen la matriz, no a los expertos. */
const OBJECTIVE_WEIGHTS: Record<'critic' | 'entropy', { text: string; apa: string }> = {
  critic: {
    text: 'Pesos objetivos calculados con CRITIC a partir de la propia matriz de decisión (contraste o desviación estándar de cada criterio y correlación entre criterios). No provienen de juicios de expertos.',
    apa: 'Diakoulaki, D., Mavrotas, G., & Papayannakis, L. (1995). Determining objective weights in multiple criteria problems: The CRITIC method. Computers & Operations Research, 22(7), 763–770.',
  },
  entropy: {
    text: 'Pesos objetivos calculados con el método de Entropía de Shannon a partir de la propia matriz de decisión (un criterio que varía más entre alternativas informa más y recibe más peso). No provienen de juicios de expertos.',
    apa: 'Shannon, C. E. (1948). A mathematical theory of communication. Bell System Technical Journal, 27(3), 379–423.',
  },
};

const SEC_H3: CSSProperties = { fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: 4 };
const NOTE_P: CSSProperties = { fontSize: 12.5, color: '#475569', margin: '8px 0 0' };
const LINGUISTIC_NAME: Record<string, string> = { VP: 'Muy pobre', P: 'Pobre', F: 'Regular', G: 'Bueno', VG: 'Muy bueno' };

interface ExecutiveReportModalProps {
  projectTitle: string;
  projectObjective: string;
  method: MethodKey;
  criteria: Criterion[];
  alternatives: Alternative[];
  decisionMatrix: DecisionMatrix;
  weights: number[];
  /** De dónde salen los pesos: juicios de expertos (AHP) o la propia matriz (CRITIC/Entropía). En AHP siempre 'ahp'. Default 'ahp'. */
  weightingMethod?: WeightingMethod;
  /** Consistencia (CR), expertos y prioridades locales de AHP. Solo AHP o pesos por AHP; sin él el informe no afirma nada sobre juicios. */
  ahp?: ReportAhpInfo;
  rankingRows: { name: string; score: number; rank: number }[];
  /** Solo VIKOR: v usado (se declara en el informe, no sale de los datos). */
  vikorV?: number;
  /** Solo VIKOR: conjunto de compromiso cuando NO hay ganador único (falla C1 o C2 de Opricovic & Tzeng 2004). */
  compromiseSet?: string[];
  /** Solo VIKOR: datos de la gráfica Q vs v (rectas en v = 0 y v = 1) y los v donde cambia el 1er lugar. Sin él no se dibuja. */
  vikorChart?: { names: string[]; ends: { q: number[] }[]; breaks: { v: number; from: string; to: string }[] };
  /** Solo ELECTRE: relación de superación. ELECTRE no da ranking total, así que en vez de `rankingRows` el informe usa esto. */
  /** Datos de las gráficas propias del método (ver MethodCharts). */
  charts?: MethodChartData;
  electre?: { names: string[]; outranks: boolean[][]; concordance: number[][]; discordance: number[][]; cStar: number; dStar: number };
  onClose: () => void;
}

export default function ExecutiveReportModal({
  projectTitle,
  projectObjective,
  method,
  criteria,
  alternatives,
  decisionMatrix,
  weights,
  weightingMethod = 'ahp',
  ahp,
  rankingRows,
  vikorV,
  compromiseSet,
  vikorChart,
  charts,
  electre,
  onClose,
}: ExecutiveReportModalProps) {
  // El fallback solo protege de un `method` inesperado en la base; con los 7 valores del tipo Method siempre existe su ficha.
  const methodDoc = METHOD_SPECS[method] || METHOD_SPECS.topsis;
  const methodLabel = methodDoc.name.split(' · ')[0];
  const score = SCORE[method] ?? SCORE.topsis;
  const isAhp = method === 'ahp';
  const isFuzzy = method === 'fuzzy_topsis';
  const winner = rankingRows.find((r) => r.rank === 1) || rankingRows[0];
  // Empate en el 1.er lugar (todas iguales por falta de datos, o dos que empatan): no hay «ganadora» que recomendar.
  const tied = rankingRows.filter((r) => r.rank === 1);
  const inCompromise = (name: string) => !!compromiseSet && compromiseSet.length > 1 && compromiseSet.includes(name);
  // La matriz de decisión existe solo donde el método la usa. AHP trabaja con juicios por pares: los valores que queden en
  // `decision_matrix` (de un método anterior) no son datos de este análisis y no deben aparecer.
  const showMatrix = !isAhp;
  const weightsFromJudgments = isAhp || weightingMethod === 'ahp';
  // Secciones que existen para este método, en orden: la numeración se deriva de aquí para que siga siendo consecutiva.
  const sections = ['weights', ...(isAhp ? ['consistency', 'local'] : ['matrix']), electre ? 'outranking' : 'ranking', 'justification'];
  const secNo = (k: string) => sections.indexOf(k) + 1;

  /** Regla de lectura del criterio. Fuzzy TOPSIS no tiene tipo «objetivo» (la matriz lingüística no lo admite) y trata cualquier
   * tipo que no sea max como costo, igual que `getType` en la biblioteca. */
  const ruleText = (critId: string) => {
    const k = getKind(decisionMatrix, critId);
    if (isFuzzy) return k === 'max' ? 'Maximizar (Beneficio)' : 'Minimizar (Costo)';
    if (k === 'min') return 'Minimizar (Costo)';
    if (k === 'target') {
      const t = getTarget(decisionMatrix, critId);
      return t ? `Objetivo ${t.value}${t.tol ? ` ± ${t.tol}` : ''} (minimizar la distancia)` : 'Objetivo (sin valor definido)';
    }
    return 'Maximizar (Beneficio)';
  };

  /** Celda de la matriz. Fuzzy TOPSIS guarda etiquetas (texto), no números; `getCell` solo lee números y las daría por vacías. */
  const cellText = (altId: string, critId: string) => {
    if (isFuzzy) {
      const v = decisionMatrix.values[altId]?.[critId];
      return typeof v === 'string' && v in LINGUISTIC_ALT ? v : 'F*';
    }
    const val = getCell(decisionMatrix, altId, critId);
    return val != null ? val : '—';
  };

  /** Estado legible de una hoja de AHP. Sin juicios (o con n < 3) el CR sale 0, pero eso no significa «consistente». */
  const sheetStatus = (sh: ReportSheetCr) => {
    if (sh.answered === 0) return { text: 'Sin juicios registrados: el CR no informa', color: '#64748B', bold: false };
    if (sh.n < 3) return { text: 'Con menos de 3 elementos siempre es consistente', color: '#64748B', bold: false };
    return sh.ok
      ? { text: 'Consistente (CR < 0.10)', color: '#15803D', bold: false }
      : { text: 'Revisar: CR ≥ 0.10, hay juicios contradictorios', color: '#B45309', bold: true };
  };
  const crText = (sh: ReportSheetCr) => {
    const st = sheetStatus(sh);
    return sh.answered === 0 || sh.n < 3
      ? `Consistencia de los juicios de criterios: ${st.text.toLowerCase()}.`
      : `Razón de consistencia de la comparación de criterios: CR = ${sh.cr.toFixed(4)} (${sh.ok ? 'aceptable, CR < 0.10 según Saaty' : 'NO aceptable: CR ≥ 0.10, conviene revisar los juicios'}).`;
  };
  const currentDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // ELECTRE: pares con relación, incomparables y núcleo (las que nadie supera). Se derivan de la misma matriz `outranks` del grafo.
  const el = electre && (() => {
    const n = electre.names.length;
    const rels: { i: number; k: number }[] = [];
    const incomparable: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < n; k++) if (i !== k && electre.outranks[i]?.[k]) rels.push({ i, k });
      for (let k = i + 1; k < n; k++) if (!electre.outranks[i]?.[k] && !electre.outranks[k]?.[i]) incomparable.push([i, k]);
    }
    const kernel = electre.names.filter((_, k) => !rels.some((r) => r.k === k));
    return { rels, incomparable, kernel };
  })();

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

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 14, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 3000,
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
        id="executive-report-container"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exec-report-title"
        tabIndex={-1}
        style={{
          background: '#FFFFFF',
          color: '#0F172A',
          borderRadius: 12,
          maxWidth: 860,
          width: '100%',
          maxHeight: '94vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
          padding: '36px 44px',
          display: 'grid',
          gap: 24,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: 1.5,
          ...REPORT_VARS,
        }}
      >
        {/* Acciones Superiores (Solo en pantalla, oculto en impresión) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, background: '#0284C7', color: '#FFF', padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
              REPORTE OFICIAL
            </span>
            <span style={{ fontSize: 13, color: '#64748B' }}>Vista previa de impresión académica</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Imprimir / Guardar como PDF 🖨️
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                color: '#475569',
                padding: '8px 14px',
                borderRadius: 6,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cerrar ✕
            </button>
          </div>
        </div>

        {/* Membrete Institucional */}
        <div style={{ borderBottom: '2px solid #0F172A', paddingBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0284C7' }}>
                Universidad del Magdalena · Facultad de Ingeniería
              </div>
              <h1 id="exec-report-title" style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 2px', color: '#0F172A' }}>
                Dictamen Ejecutivo de Decisión Multicriterio (MCDA)
              </h1>
              <div style={{ fontSize: 13, color: '#64748B' }}>
                Maestría en Ingeniería · Toma de Decisiones y Optimización
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
              <div>Fecha: <b>{currentDate}</b></div>
              <div>Algoritmo: <b>{methodLabel}</b></div>
            </div>
          </div>
        </div>

        {/* Resumen del Problema y Caso de Estudio */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, background: '#F8FAFC', padding: '14px 18px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Proyecto</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{projectTitle}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Objetivo Estratégico</div>
            <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{projectObjective || 'Selección óptima bajo criterios múltiples'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Dimensión</div>
            <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>
              {alternatives.length} Alternativas × {criteria.length} Criterios
            </div>
          </div>
        </div>

        {/* Dictamen y Alternativa Ganadora */}
        {el && electre ? (
          el.rels.length > 0 && el.kernel.length === 1 ? (
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderLeft: '5px solid #16A34A', borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#15803D', letterSpacing: '0.06em' }}>
                Alternativa no superada (núcleo de la relación)
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#14532D' }}>{el.kernel[0]}</span>
              </div>
              <p style={{ fontSize: 13, color: '#166534', margin: '6px 0 0' }}>
                Con c* = {electre.cStar.toFixed(2)} y d* = {electre.dStar.toFixed(2)}, ninguna otra alternativa supera a esta según <b>{methodDoc.name}</b>. No es un puntaje: ELECTRE no produce un orden total, solo una relación de superación.
              </p>
            </div>
          ) : (
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderLeft: '5px solid #D97706', borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#B45309', letterSpacing: '0.06em' }}>
                Sin ganador único
              </div>
              <p style={{ fontSize: 13, color: '#92400E', margin: '6px 0 0' }}>
                {el.rels.length === 0
                  ? <>Con c* = {electre.cStar.toFixed(2)} y d* = {electre.dStar.toFixed(2)} ninguna alternativa supera a otra: los datos no alcanzan para preferir una sobre otra con estos umbrales.</>
                  : el.kernel.length > 1
                    ? <>Con c* = {electre.cStar.toFixed(2)} y d* = {electre.dStar.toFixed(2)}, ninguna de estas alternativas es superada por otra: <b>{el.kernel.join(', ')}</b>. Son incomparables entre sí o se disputan el primer lugar.</>
                    : <>Con c* = {electre.cStar.toFixed(2)} y d* = {electre.dStar.toFixed(2)} todas las alternativas son superadas por alguna otra (ciclo de superación), así que no hay una no superada.</>}
              </p>
            </div>
          )
        ) : winner && compromiseSet && compromiseSet.length > 1 ? (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderLeft: '5px solid #D97706', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#B45309', letterSpacing: '0.06em' }}>
              Conjunto de compromiso (sin ganador único)
            </div>
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#78350F' }}>{compromiseSet.join(', ')}</span>
            </div>
            <p style={{ fontSize: 13, color: '#92400E', margin: '6px 0 0' }}>
              Según <b>{methodDoc.name}</b>, ninguna alternativa cumple a la vez las condiciones de ventaja aceptable y estabilidad (Opricovic &amp; Tzeng, 2004), así que se recomienda considerar estas alternativas en conjunto. La de menor Q es <b>{winner.name}</b> ({winner.score.toFixed(4)}), pero no es un ganador único.
            </p>
          </div>
        ) : winner && tied.length > 1 ? (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderLeft: '5px solid #D97706', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#B45309', letterSpacing: '0.06em' }}>
              Empate en el primer lugar (sin ganadora única)
            </div>
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#78350F' }}>{tied.length === rankingRows.length ? 'Todas las alternativas' : tied.map((r) => r.name).join(', ')}</span>
            </div>
            <p style={{ fontSize: 13, color: '#92400E', margin: '6px 0 0' }}>
              Según <b>{methodDoc.name}</b>, {tied.length === rankingRows.length ? 'los datos actuales no distinguen entre las alternativas' : 'estas alternativas quedan empatadas'} ({score.short}: {score.fmt(winner.score)}). No hay una recomendación que respaldar: completa o revisa los datos antes de decidir.
            </p>
          </div>
        ) : winner && (
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderLeft: '5px solid #16A34A', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#16A34A', letterSpacing: '0.06em' }}>
              Alternativa Seleccionada (Recomendación Óptima)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#14532D' }}>{winner.name}</span>
              <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#15803D' }}>
                ({score.short}: {score.fmt(winner.score)})
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#166534', margin: '6px 0 0' }}>
              Según <b>{methodLabel}</b>, esta alternativa {WINNER_NOTE[method] ?? 'representa la opción más favorable frente a los pesos establecidos.'}
            </p>
          </div>
        )}
        {vikorV != null && (
          <p style={{ fontSize: 12.5, color: '#475569', margin: 0 }}>
            <b>Parámetro v de VIKOR = {vikorV.toFixed(2)}.</b> No se deriva de los datos: lo fija quien decide (0.5 = «consenso», convención). El ranking puede cambiar con otros valores de v; ver la sensibilidad en la plataforma.
          </p>
        )}

        {electre && (
          <p style={{ fontSize: 12.5, color: '#475569', margin: 0 }}>
            <b>Umbrales de ELECTRE: c* = {electre.cStar.toFixed(2)} (concordancia mínima), d* = {electre.dStar.toFixed(2)} (discordancia máxima).</b> No se derivan de los datos: los fija quien decide, y con otros valores cambian las relaciones y los pares incomparables (convención del curso: c* = 0.65, d* = 0.30).
          </p>
        )}

        {/* Sección: Ponderación de Criterios */}
        <div>
          <h3 style={SEC_H3}>
            {secNo('weights')}. Ponderación de Criterios ({criteria.length})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '2px solid #CBD5E1' }}>
                <th style={{ padding: '8px 10px' }}>Criterio</th>
                {/* AHP compara por pares, no lee valores: «maximizar/minimizar» no existe en su método. */}
                {showMatrix && <th style={{ padding: '8px 10px' }}>Regla de Decisión</th>}
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Peso Obtenido (w_j)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Porcentaje Relativo</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c, i) => {
                const w = weights[i] ?? 0;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{c.name}</td>
                    {showMatrix && (
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>{ruleText(c.id)}</td>
                    )}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{w.toFixed(4)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0284C7', fontFamily: 'monospace' }}>
                      {(w * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Procedencia de los pesos: sin esto el lector no sabe si son juicios de expertos o cálculo sobre la matriz. */}
          {weightsFromJudgments ? (
            ahp && (
              <p style={NOTE_P}>
                {ahp.expertCount === 0
                  ? <><b>Sin juicios de expertos incluidos:</b> los pesos son iguales (1/{criteria.length}) porque no hay comparaciones por pares que agregar.</>
                  : <>Pesos derivados de la comparación por pares de criterios de <b>{ahp.expertCount} experto{ahp.expertCount === 1 ? '' : 's'}</b>{ahp.expertCount > 1 ? ', agregados por media geométrica (AIJ)' : ''}; se calculan como {ahp.weightMethod === 'eigenvector' ? 'el eigenvector principal de Saaty (iteración de potencias)' : 'el promedio de columnas normalizadas (procedimiento a mano del curso)'}.</>}
                {' '}{crText(ahp.criteriaSheet)}
              </p>
            )
          ) : (
            <p style={NOTE_P}>{OBJECTIVE_WEIGHTS[weightingMethod].text}</p>
          )}
          {isFuzzy && !weightsFromJudgments && (
            // CRITIC y Entropía necesitan números: Results.tsx desdifusifica las etiquetas (centroide de su TFN) antes de calcularlos.
            <p style={NOTE_P}>
              Como la matriz de Fuzzy TOPSIS es lingüística, estos pesos se calcularon sobre el valor nítido (centroide) de cada etiqueta, siguiendo el esquema de ul Amin et al. (2022). El método original de Chen (2000) usa pesos lingüísticos dados por los decisores; los pesos por AHP son la alternativa más cercana a ese planteamiento.
            </p>
          )}
          {ahp && weightsFromJudgments && ahp.criteriaSheet.perExpert.some((e) => !e.ok) && (
            <p style={{ ...NOTE_P, color: '#B45309' }}>
              Expertos con CR ≥ 0.10 en la comparación de criterios: {ahp.criteriaSheet.perExpert.filter((e) => !e.ok).map((e) => `${e.label} (${e.cr.toFixed(3)})`).join(', ')}. La matriz agregada puede verse consistente aunque un experto no lo sea.
            </p>
          )}
          {charts && charts.weights.length > 0 && (
            <figure style={{ margin: '14px 0 0', breakInside: 'avoid' }}>
              <figcaption style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Peso de cada criterio</figcaption>
              <WeightBars rows={charts.weights} />
            </figure>
          )}
        </div>

        {/* AHP: consistencia de los juicios (CR), lo que en los métodos de matriz no existe */}
        {isAhp && ahp && (
          <div style={{ breakInside: 'avoid' }}>
            <h3 style={SEC_H3}>
              {secNo('consistency')}. Consistencia de los Juicios (CR)
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '2px solid #CBD5E1' }}>
                  <th style={{ padding: '8px 10px' }}>Matriz de comparación</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Juicios</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>CR</th>
                  <th style={{ padding: '8px 10px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {[ahp.criteriaSheet, ...ahp.altSheets].map((sh, i) => {
                  const st = sheetStatus(sh);
                  return (
                    <tr key={sh.label + i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                        {i === 0 ? sh.label : `Alternativas según «${sh.label}»`}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{sh.answered} de {sh.total}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: st.color }}>{sh.cr.toFixed(4)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, color: st.color, fontWeight: st.bold ? 700 : 500 }}>{st.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={NOTE_P}>
              Criterio de Saaty: CR &lt; 0.10 es aceptable. Los juicios se agregan entre {ahp.expertCount} experto{ahp.expertCount === 1 ? '' : 's'} y la tabla muestra el CR de la matriz agregada; «Juicios» cuenta los pares comparados (sumados entre expertos) frente a los posibles. Un par sin juicio cuenta como igual importancia (1).
            </p>
            {(() => {
              const flagged = [ahp.criteriaSheet, ...ahp.altSheets].flatMap((sh) => sh.perExpert.filter((e) => !e.ok).map((e) => `${e.label} en «${sh.label}» (${e.cr.toFixed(3)})`));
              const bad = [ahp.criteriaSheet, ...ahp.altSheets].filter((sh) => !sh.ok).map((sh) => sh.label);
              return (
                <>
                  {bad.length > 0 && (
                    <p style={{ ...NOTE_P, color: '#B45309' }}>
                      <b>Revisar consistencia:</b> CR ≥ 0.10 en {bad.map((b) => `«${b}»`).join(', ')}. Hay juicios que se contradicen entre sí (por ejemplo, A mucho mejor que B, B mejor que C, pero C mejor que A); conviene que los expertos los revisen antes de tomar la decisión.
                    </p>
                  )}
                  {flagged.length > 0 && (
                    <p style={{ ...NOTE_P, color: '#B45309' }}>Expertos con CR ≥ 0.10: {flagged.join('; ')}.</p>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* AHP: prioridades locales (alternativa × criterio), de donde sale la síntesis global */}
        {isAhp && ahp && ahp.local.length > 0 && (
          <div>
            <h3 style={SEC_H3}>
              {secNo('local')}. Prioridades Locales por Criterio
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '2px solid #CBD5E1' }}>
                    <th style={{ padding: '6px 8px' }}>Alternativa</th>
                    {criteria.map((c, j) => (
                      <th key={c.id} style={{ padding: '6px 8px', textAlign: 'right' }}>
                        {c.name}
                        <div style={{ fontWeight: 400, color: '#64748B', fontFamily: 'monospace' }}>w = {(weights[j] ?? 0).toFixed(3)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map((alt, i) => (
                    <tr key={alt.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{alt.name}</td>
                      {criteria.map((c, j) => {
                        const v = ahp.local[i]?.[j];
                        const best = v != null && v >= Math.max(...ahp.local.map((r) => r[j] ?? 0)) - 1e-12;
                        return (
                          <td key={c.id} style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: best ? 700 : 400 }}>
                            {v != null ? v.toFixed(4) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={NOTE_P}>
              Cada columna suma 1: es el reparto de prioridad entre las alternativas según ese criterio, derivado de las comparaciones por pares de los expertos (en negrita, la mayor de cada criterio). La prioridad global es la suma de cada valor multiplicado por el peso <i>w</i> de su criterio.
            </p>
          </div>
        )}

        {/* Matriz de decisión: solo los métodos que leen valores por alternativa y criterio (todos menos AHP) */}
        {showMatrix && (
          <div>
            <h3 style={SEC_H3}>
              {secNo('matrix')}. {isFuzzy ? 'Matriz de Decisión Lingüística' : 'Matriz de Decisión Cuantitativa'}
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '2px solid #CBD5E1' }}>
                    <th style={{ padding: '6px 8px' }}>Alternativa</th>
                    {criteria.map((c) => (
                      <th key={c.id} style={{ padding: '6px 8px', textAlign: 'right' }}>
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map((alt) => (
                    <tr key={alt.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{alt.name}</td>
                      {criteria.map((c) => (
                        <td key={c.id} style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {cellText(alt.id, c.id)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isFuzzy && (
              <p style={NOTE_P}>
                Escala lingüística (Chen, 2000): {Object.keys(LINGUISTIC_ALT).map((k) => `${k} = ${LINGUISTIC_NAME[k]}`).join(', ')}. Una celda marcada con <b>F*</b> no tiene evaluación: el método le asigna «Regular» (F) por defecto.
              </p>
            )}
          </div>
        )}

        {/* Sección 3 (ELECTRE): relación de superación en vez de orden de mérito */}
        {el && electre && (
          <div>
            <h3 style={SEC_H3}>
              {secNo('outranking')}. Relación de Superación (ELECTRE)
            </h3>
            <div style={{ breakInside: 'avoid' }}>
              <ElectreGraph names={electre.names} outranks={electre.outranks} concordance={electre.concordance} discordance={electre.discordance} cStar={electre.cStar} dStar={electre.dStar} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 12 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '2px solid #CBD5E1' }}>
                  <th style={{ padding: '8px 10px' }}>Relación</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Concordancia (≥ c* {electre.cStar.toFixed(2)})</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Discordancia (≤ d* {electre.dStar.toFixed(2)})</th>
                </tr>
              </thead>
              <tbody>
                {el.rels.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '8px 10px', color: '#64748B' }}>Ninguna alternativa supera a otra con estos umbrales.</td></tr>
                ) : el.rels.map(({ i, k }) => (
                  <tr key={`${i}-${k}`} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '8px 10px' }}><b>{electre.names[i]}</b> supera a <b>{electre.names[k]}</b></td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{electre.concordance[i][k].toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{electre.discordance[i][k].toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {el.incomparable.length > 0 && (
              <p style={{ fontSize: 12.5, color: '#475569', margin: '10px 0 0' }}>
                <b>Incomparables (ninguna supera a la otra):</b> {el.incomparable.map(([a, b]) => `${electre.names[a]} y ${electre.names[b]}`).join('; ')}. No es una falla del método: con estos umbrales los datos no alcanzan para preferir una sobre la otra.
              </p>
            )}
          </div>
        )}

        {/* Orden de Mérito (Ranking Final) */}
        {!electre && (
        <div>
          <h3 style={SEC_H3}>
            {secNo('ranking')}. Orden de Mérito y Síntesis Final
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '2px solid #CBD5E1' }}>
                <th style={{ padding: '8px 10px', width: 80 }}>Posición</th>
                <th style={{ padding: '8px 10px' }}>Alternativa</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>{score.label}</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Dictamen</th>
              </tr>
            </thead>
            <tbody>
              {rankingRows.map((row) => (
                <tr
                  key={row.name}
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    background: row.rank === 1 ? '#F0FDF4' : undefined,
                  }}
                >
                  <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: 'monospace' }}>#{row.rank}</td>
                  <td style={{ padding: '8px 10px', fontWeight: row.rank === 1 ? 700 : 500 }}>
                    {row.name} {row.rank === 1 && tied.length === 1 && !(compromiseSet && compromiseSet.length > 1) && '✓'}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                    {score.fmt(row.score)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12 }}>
                    {inCompromise(row.name) ? (
                      // VIKOR sin ganador único: las del conjunto de compromiso se consideran juntas, ninguna es «la recomendada».
                      <span style={{ color: '#B45309', fontWeight: 700 }}>Conjunto de compromiso</span>
                    ) : row.rank === 1 && tied.length > 1 ? (
                      <span style={{ color: '#B45309', fontWeight: 700 }}>Empate</span>
                    ) : row.rank === 1 && !(compromiseSet && compromiseSet.length > 1) ? (
                      <span style={{ color: '#16A34A', fontWeight: 700 }}>Recomendada</span>
                    ) : (
                      <span style={{ color: '#64748B' }}>Viable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Gráfico propio del método, el mismo que ve quien usa la plataforma (sin interacción: el informe se imprime) */}
          {charts && rankingRows.length > 0 && (
            <MethodCharts method={method} data={charts} showWeights={false} showCloseness />
          )}
          {method === 'vikor' && vikorChart && (
            <figure style={{ margin: '14px 0 0', breakInside: 'avoid' }}>
              <figcaption style={{ fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
                Sensibilidad del ranking a v (Q de cada alternativa según v; menor Q es mejor)
              </figcaption>
              <VikorSensitivityChart names={vikorChart.names} ends={vikorChart.ends} v={vikorV ?? 0.5} breaks={vikorChart.breaks.map((b) => b.v)} solidLabels />
              <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0' }}>
                Línea discontinua vertical = v usado en este informe.{' '}
                {vikorChart.breaks.length === 0
                  ? 'El 1er lugar no cambia con ningún v entre 0 y 1.'
                  : `Círculo negro = v donde cambia el 1er lugar: ${vikorChart.breaks.map((b) => `con v = ${b.v.toFixed(2)} pasa de ${b.from} a ${b.to}`).join('; ')}.`}
              </p>
            </figure>
          )}
        </div>
        )}

        {/* Sección 4: Sustento Metodológico y Citas APA */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', margin: '0 0 6px' }}>
            {secNo('justification')}. Justificación Metodológica y Citas Científicas
          </h4>
          <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: '0 0 6px' }}>
            {methodDoc.summary}
          </p>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#0F172A', background: '#F8FAFC', padding: '8px 12px', borderRadius: 4, border: '1px solid #E2E8F0' }}>
            <strong>Cita formal:</strong> {methodDoc.citationApa}
          </div>
          {/* Los pesos tienen su propia fuente (no es la del método de ranking): se cita aparte. AHP ya se cita arriba. */}
          {!isAhp && (
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#0F172A', background: '#F8FAFC', padding: '8px 12px', borderRadius: 4, border: '1px solid #E2E8F0', marginTop: 6 }}>
              <strong>Cita de la ponderación ({weightingMethod === 'ahp' ? 'AHP' : weightingMethod === 'critic' ? 'CRITIC' : 'Entropía'}):</strong>{' '}
              {weightingMethod === 'ahp' ? METHOD_SPECS.ahp.citationApa : OBJECTIVE_WEIGHTS[weightingMethod].apa}
              {isFuzzy && weightingMethod !== 'ahp' && (
                <> ul Amin, F., Qian-Li, D., Grzybowska, K., Ahmed, Z., &amp; Bo-Rui, Y. (2022). A novel fuzzy-based VIKOR–CRITIC soft computing method for evaluation of sustainable supply chain risk management. Sustainability, 14(5), 2827. https://doi.org/10.3390/su14052827</>
              )}
            </div>
          )}
        </div>

        {/* Pie de Página */}
        <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8' }}>
          <span>Generado automáticamente con Plataforma MCDA</span>
          <span>Universidad del Magdalena · Santa Marta, Colombia</span>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #executive-report-container,
          #executive-report-container * {
            visibility: visible;
          }
          #executive-report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            padding: 20px !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          /* Sin esto Chrome/Safari omiten rellenos de barras y trazos de color al imprimir (ahorro de tinta) */
          #executive-report-container svg {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
