'use client';

import Link from 'next/link';
import { useState } from 'react';
import Logo from '@/components/Logo';
import ScientificMethodModal, { METHOD_SPECS, type MethodKey } from '@/components/ScientificMethodModal';

type Step = 'q1' | 'q1b' | 'q2' | 'q3' | MethodKey;

interface QuestionConfig {
  number: number;
  title: string;
  subtitle: string;
  progressPercent: number;
  options: {
    badge: string;
    title: string;
    desc: string;
    target: Step;
    tag?: string;
  }[];
}

const QUESTIONS: Record<'q1' | 'q1b' | 'q2' | 'q3', QuestionConfig> = {
  q1: {
    number: 1,
    title: '¿Tienes un valor medible por cada alternativa en cada criterio?',
    subtitle: 'Elige la opción que mejor describa la naturaleza de los datos de tu problema:',
    progressPercent: 25,
    options: [
      {
        badge: 'A',
        title: 'Sí, tengo datos reales exactos',
        desc: 'Precios en dinero, distancias en km, duración de batería en meses, consumos, tasas técnicas...',
        target: 'q1b',
        tag: 'CUANTITATIVO',
      },
      {
        badge: 'B',
        title: 'Sí, pero son subjetivos, vagos o cualitativos',
        desc: 'Solo dispongo de juicios como «Muy buena», «Regular», «Poco confiable» o percepciones ambiguas.',
        target: 'fuzzy_topsis',
        tag: 'LÓGICA DIFUSA',
      },
      {
        badge: 'C',
        title: 'No tengo datos numéricos, solo comparaciones relativas',
        desc: 'Mis expertos comparan de a pares cuál alternativa es superior en cada criterio según la escala 1–9.',
        target: 'ahp',
        tag: 'PARES SAATY',
      },
    ],
  },
  q1b: {
    number: 2,
    title: '¿Qué tan importante es la simplicidad del argumento al sustentar la decisión?',
    subtitle: 'Considera ante quién presentarás los resultados (un comité directivo, una comunidad o un jurado):',
    progressPercent: 50,
    options: [
      {
        badge: 'A',
        title: 'Muy importante — debe ser intuitivo y transparente',
        desc: 'Prefiero un método directo (normalizar y sumar pesos × valores) que cualquier persona pueda auditar.',
        target: 'saw',
        tag: 'SUMA DIRECTA',
      },
      {
        badge: 'B',
        title: 'No es prioritario — busco robustez matemática',
        desc: 'Puedo emplear algoritmos de optimización multiobjetivo más avanzados y fundamentados.',
        target: 'q2',
        tag: 'AVANZADO',
      },
    ],
  },
  q2: {
    number: 3,
    title: '¿Está bien si el método señala que dos opciones son incomparables?',
    subtitle: 'Enfoque de relaciones de superación (outranking) frente a enfoques compensatorios:',
    progressPercent: 75,
    options: [
      {
        badge: 'A',
        title: 'Sí, prefiero que lo señale si no hay evidencia suficiente',
        desc: 'Filtrado no compensatorio: valida concordancia y umbrales de veto estricto sin forzar una suma.',
        target: 'electre',
        tag: 'SUPERACIÓN',
      },
      {
        badge: 'B',
        title: 'No, requiero un ranking completo obligatorio',
        desc: 'Necesito una posición del 1 al N para todas las alternativas analizadas.',
        target: 'q3',
        tag: 'ORDEN COMPLETO',
      },
    ],
  },
  q3: {
    number: 4,
    title: '¿Qué principio de preferencia prefieres aplicar entre alternativas?',
    subtitle: 'Elige el concepto matemático central de comparación:',
    progressPercent: 100,
    options: [
      {
        badge: 'A',
        title: 'Distancia a una combinación ideal y anti-ideal',
        desc: 'Buscar la alternativa más cercana a la mejor solución posible y más lejana a la peor (TOPSIS).',
        target: 'topsis',
        tag: 'DISTANCIA IDEAL',
      },
      {
        badge: 'B',
        title: 'Solución de compromiso (evitar el peor desempeño individual)',
        desc: 'Maximizar el beneficio grupal pero penalizar fuertemente si una opción falla en un criterio clave (VIKOR).',
        target: 'vikor',
        tag: 'COMPROMISO',
      },
      {
        badge: 'C',
        title: 'Comparación par a par criterio por criterio con flujos de preferencia',
        desc: 'Medir la intensidad de superación entre cada par de opciones para calcular flujos netos (PROMETHEE II).',
        target: 'promethee',
        tag: 'FLUJOS NETOS',
      },
    ],
  },
};

export default function MetodoPage() {
  const [step, setStep] = useState<Step>('q1');
  const [modalMethod, setModalMethod] = useState<MethodKey | null>(null);

  const isQuestion = step === 'q1' || step === 'q1b' || step === 'q2' || step === 'q3';
  const currentQ = isQuestion ? QUESTIONS[step] : null;
  const currentSpec = !isQuestion ? METHOD_SPECS[step as MethodKey] : null;

  return (
    <div className="wrap">
      {/* Sticky Header */}
      <div className="topbar">
        <Link className="brand" href="/" title="Plataforma MCDA · Inicio">
          <Logo size={26} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.2 }}>
              <span>Plataforma MCDA</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--f-mono)', padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', color: 'var(--muted)' }}>TEORÍA</span>
            </div>
            <span className="brand-sub">← Ir al inicio</span>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link className="btn sm" href="/tutorial">Tutorial</Link>
          <Link className="btn sm primary" href="/login">Crear proyecto</Link>
        </div>
      </div>

      <div className="ttl">
        <div className="eyebrow">Guía de Selección Metodológica</div>
        <h1>¿Qué método multicriterio debo usar?</h1>
        <p className="muted lnote" style={{ marginTop: 10, maxWidth: '65ch', fontSize: 14 }}>
          En todos los métodos del curso, la ponderación de criterios se fundamenta de forma rigurosa
          (juicios de expertos con AHP, o ponderaciones objetivas con CRITIC y Entropía). La diferencia
          recae en el algoritmo matemático utilizado para comparar las alternativas entre sí.
        </p>
      </div>

      {/* Cuestionario Interactivo con Choice Cards */}
      <div style={{ marginTop: 28 }}>
        {isQuestion && currentQ && (
          <div
            className="card"
            style={{
              borderTop: '3px solid var(--accent)',
              display: 'grid',
              gap: 18,
              padding: '24px 28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                PREGUNTA {currentQ.number} DE 4
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
                Progreso: {currentQ.progressPercent}%
              </span>
            </div>

            {/* Barra de progreso */}
            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent), #3B82F6)',
                  width: `${currentQ.progressPercent}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            <div>
              <h2 style={{ fontSize: 20, margin: '4px 0 6px', color: 'var(--ink)' }}>
                {currentQ.number}. {currentQ.title}
              </h2>
              <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
                {currentQ.subtitle}
              </p>
            </div>

            {/* Choice Cards List */}
            <div style={{ display: 'grid', gap: 12, marginTop: 4 }}>
              {currentQ.options.map((opt) => (
                <button
                  key={opt.badge}
                  type="button"
                  onClick={() => setStep(opt.target)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 20px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'inherit',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 229, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontFamily: 'var(--f-mono)',
                      fontSize: 14,
                      color: 'var(--muted)',
                      flexShrink: 0,
                    }}
                  >
                    {opt.badge}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{opt.title}</span>
                      {opt.tag && (
                        <span style={{ fontSize: 10, fontFamily: 'var(--f-mono)', padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: 'var(--muted)' }}>
                          {opt.tag}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>{opt.desc}</div>
                  </div>
                  <div style={{ fontSize: 18, color: 'var(--muted)', paddingLeft: 8 }}>→</div>
                </button>
              ))}
            </div>

            {step !== 'q1' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <button
                  className="btn sm"
                  type="button"
                  onClick={() => setStep('q1')}
                  style={{ color: 'var(--muted)' }}
                >
                  ↺ Volver al inicio del cuestionario
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tarjeta de Recomendación Final */}
        {!isQuestion && currentSpec && (
          <div
            className="card"
            style={{
              borderLeft: `5px solid ${currentSpec.color}`,
              background: `linear-gradient(135deg, var(--surface) 0%, color-mix(in srgb, ${currentSpec.color} 8%, var(--surface)) 100%)`,
              padding: '28px',
              display: 'grid',
              gap: 18,
              boxShadow: `0 12px 35px color-mix(in srgb, ${currentSpec.color} 18%, transparent)`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--f-mono)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: currentSpec.color,
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    border: `1px solid ${currentSpec.color}`,
                  }}
                >
                  {currentSpec.family}
                </span>
                <span style={{ fontSize: 12, fontFamily: 'var(--f-mono)', color: 'var(--muted)' }}>
                  RECOMENDACIÓN METODOLÓGICA ÓPTIMA
                </span>
              </div>
              <button className="btn sm" type="button" onClick={() => setStep('q1')}>
                ↺ Reiniciar cuestionario
              </button>
            </div>

            <div>
              <h2 style={{ fontSize: 24, margin: '2px 0 8px', color: 'var(--ink)' }}>{currentSpec.name}</h2>
              <p style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                {currentSpec.summary}
              </p>
            </div>

            {/* Referencia Formal */}
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Publicación Científica de Referencia (APA 7.ª ed.)
              </div>
              <div style={{ fontSize: 13, fontFamily: 'var(--f-mono)', color: 'var(--ink)' }}>
                {currentSpec.citationApa}
              </div>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                className="btn sm"
                style={{ borderColor: currentSpec.color, color: 'var(--ink)' }}
                onClick={() => setModalMethod(step as MethodKey)}
              >
                Ver fórmulas y ecuaciones matemáticas →
              </button>
              <a
                href={currentSpec.doiUrl}
                target="_blank"
                rel="noreferrer"
                className="btn sm"
                style={{ textDecoration: 'none' }}
              >
                Abrir artículo original (DOI) ↗
              </a>
              <Link
                href="/login"
                className="btn sm primary"
                style={{ marginLeft: 'auto', textDecoration: 'none' }}
              >
                Crear proyecto con este método →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Comparación directa de los 7 métodos */}
      <div className="card" style={{ marginTop: 32 }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Comparación directa de los 7 métodos del curso</h3>
          <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
            Matriz de características y principios matemáticos de la disciplina:
          </p>
        </div>

        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>Característica</th>
                <th className="n"><span style={{ color: 'var(--m-ahp)', fontWeight: 700 }}>AHP</span></th>
                <th className="n"><span style={{ color: 'var(--m-saw)', fontWeight: 700 }}>SAW</span></th>
                <th className="n"><span style={{ color: 'var(--m-topsis)', fontWeight: 700 }}>TOPSIS</span></th>
                <th className="n"><span style={{ color: 'var(--m-vikor)', fontWeight: 700 }}>VIKOR</span></th>
                <th className="n"><span style={{ color: 'var(--m-promethee)', fontWeight: 700 }}>PROMETHEE</span></th>
                <th className="n"><span style={{ color: 'var(--m-electre)', fontWeight: 700 }}>ELECTRE</span></th>
                <th className="n"><span style={{ color: 'var(--m-fuzzy)', fontWeight: 700 }}>Fuzzy TOPSIS</span></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Compara alternativas con</td>
                <td className="n">Juicios por pares (1 al 9)</td>
                <td className="n" colSpan={5} style={{ textAlign: 'center' }}>Matriz de datos cuantitativos reales</td>
                <td className="n">Etiquetas lingüísticas difusas</td>
              </tr>
              <tr>
                <td>Ponderación de criterios</td>
                <td className="n">Siempre AHP (expertos)</td>
                <td className="n" colSpan={6} style={{ textAlign: 'center' }}>AHP (expertos), CRITIC o Entropía (ponderación objetiva)</td>
              </tr>
              <tr>
                <td>Tipo de resultado</td>
                <td className="n">Ranking completo</td>
                <td className="n">Ranking completo</td>
                <td className="n">Ranking completo</td>
                <td className="n">Ranking (compromiso Q)</td>
                <td className="n">Ranking completo (Φ)</td>
                <td className="n">Grafo de superación (incomparables)</td>
                <td className="n">Ranking completo (CC_i)</td>
              </tr>
              <tr>
                <td>Principio matemático</td>
                <td className="n">Autovalores y Consistencia (CR)</td>
                <td className="n">Suma ponderada Min-Max</td>
                <td className="n">Distancia euclidiana al PIS/NIS</td>
                <td className="n">Optimización S, R y Q</td>
                <td className="n">Flujos netos Φ+ y Φ-</td>
                <td className="n">Concordancia y veto no compensatorio</td>
                <td className="n">Distancia euclidiana de vértice difuso</td>
              </tr>
              <tr>
                <td>Manejo de ambigüedad</td>
                <td className="n">Subjetivo pero consistente</td>
                <td className="n" colSpan={5} style={{ textAlign: 'center' }}>Requiere datos numéricos precisos</td>
                <td className="n">✓ Diseñado para incertidumbre humana</td>
              </tr>
              <tr>
                <td>Límite recomendado de alternativas</td>
                <td className="n">Hasta 9 (límite cognitivo de Saaty)</td>
                <td className="n" colSpan={6} style={{ textAlign: 'center' }}>Sin límite de 9 elementos</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Marco Teórico y Bibliografía con Enlaces Directos al DOI */}
      <div className="card" style={{ marginTop: 28 }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>📚 Marco Teórico y Bibliografía Científica del Curso</h3>
          <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
            Publicaciones fundacionales de referencia en la disciplina (Universidad del Magdalena, Maestría en Ingeniería):
          </p>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {Object.entries(METHOD_SPECS).map(([key, spec]) => (
            <div
              key={key}
              style={{
                padding: '16px 18px',
                borderRadius: 8,
                background: 'var(--surface2)',
                borderLeft: `4px solid ${spec.color}`,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{spec.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                  {spec.citationApa}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setModalMethod(key as MethodKey)}
                  style={{ fontSize: 12 }}
                >
                  Fórmulas
                </button>
                <a
                  href={spec.doiUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn sm"
                  style={{ fontSize: 12, textDecoration: 'none', color: spec.color, borderColor: spec.color }}
                >
                  Abrir paper (DOI) ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Final */}
      <div className="lcta" style={{ marginBlock: '36px 28px' }}>
        <h2>¿Listo para modelar tu caso de estudio?</h2>
        <p>Crea tu modelo, asigna criterios y calcula el ranking óptimo con cualquiera de los métodos multicriterio.</p>
        <div className="acts">
          <Link className="btn primary" href="/login">Crear proyecto</Link>
          <Link className="btn" href="/tutorial">Ver tutorial paso a paso</Link>
        </div>
      </div>

      {/* Modal Científico si está activo */}
      {modalMethod && (
        <ScientificMethodModal
          methodKey={modalMethod}
          onClose={() => setModalMethod(null)}
        />
      )}
    </div>
  );
}
