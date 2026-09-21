'use client';

import Link from 'next/link';
import { useState } from 'react';
import Logo from '@/components/Logo';

type MethodKey = 'ahp' | 'topsis' | 'vikor' | 'electre' | 'promethee' | 'saw' | 'fuzzy_topsis';

const METHOD_INFO: Record<MethodKey, { label: string; family: string; color: string; why: string; citation: string }> = {
  ahp: {
    label: 'AHP · Analytic Hierarchy Process',
    family: 'Pares Saaty',
    color: 'var(--m-ahp)',
    why: 'No tienes datos numéricos para todo, así que comparas de a pares qué alternativa es mejor en cada criterio — el mismo mecanismo que ya usaste para pesar los criterios.',
    citation: 'Saaty, T. L. (1980). The Analytic Hierarchy Process. McGraw-Hill.',
  },
  saw: {
    label: 'SAW · Simple Additive Weighting',
    family: 'Suma Directa',
    color: 'var(--m-saw)',
    why: 'Tienes datos reales y quieres el método más transparente: normalizar y sumar pesos × valores. Fácil de explicar, rápido de calcular, ideal cuando la sencillez argumentativa importa.',
    citation: 'MacCrimmon, K. R. (1968). Decisionmaking among multiple-attribute alternatives. RAND Memorandum.',
  },
  topsis: {
    label: 'TOPSIS · Similarity to Ideal Solution',
    family: 'Distancia Ideal',
    color: 'var(--m-topsis)',
    why: 'Tienes datos reales y quieres el método más directo: qué tan cerca está cada alternativa de una combinación «ideal» de todos los criterios.',
    citation: 'Hwang, C. L., & Yoon, K. (1981). Multiple Attribute Decision Making: Methods and Applications. Springer-Verlag.',
  },
  vikor: {
    label: 'VIKOR · Solución de Compromiso',
    family: 'Compromiso',
    color: 'var(--m-vikor)',
    why: 'Tienes datos reales y te importa evitar una alternativa que quede muy mal en un solo criterio, no solo la que suma más en total.',
    citation: 'Opricovic, S., & Tzeng, G. H. (2004). Compromise solution by MCDM methods. EJOR, 156(2), 445–455.',
  },
  promethee: {
    label: 'PROMETHEE II · Flujos de Preferencia',
    family: 'Superación',
    color: 'var(--m-promethee)',
    why: 'Tienes datos reales y prefieres comparar cada par de alternativas directamente, criterio por criterio, en vez de contra un punto «ideal» abstracto.',
    citation: 'Brans, J. P., & Vincke, P. (1985). A preference ranking organisation method. Management Science, 31(6), 647–656.',
  },
  electre: {
    label: 'ELECTRE · Relación de Concordancia y Veto',
    family: 'Concordancia',
    color: 'var(--m-electre)',
    why: 'Tienes datos reales y prefieres que el método te diga honestamente cuando dos alternativas no se pueden comparar, en vez de forzar un orden entre ellas.',
    citation: 'Roy, B. (1991). The outranking approach and the foundations of ELECTRE methods. Theory and Decision, 31(1), 49–73.',
  },
  fuzzy_topsis: {
    label: 'Fuzzy TOPSIS · Evaluaciones Lingüísticas',
    family: 'Lógica Difusa',
    color: 'var(--m-fuzzy)',
    why: 'Tus datos son inciertos o subjetivos y no se pueden reducir a un solo número. Evalúas con etiquetas (Muy buena, Buena, Regular…) y el método maneja la imprecisión con lógica difusa triangular.',
    citation: 'Chen, C. T. (2000). Extensions of the TOPSIS for group decision-making under fuzzy environment. Fuzzy Sets and Systems, 114(1), 1–9.',
  },
};

type Step = 'q1' | 'q1b' | 'q2' | 'q3' | MethodKey;

export default function MetodoPage() {
  const [step, setStep] = useState<Step>('q1');
  const isResult = !['q1', 'q1b', 'q2', 'q3'].includes(step);

  return (
    <div className="wrap">
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
        <Link className="btn sm" href="/tutorial">Cómo funciona</Link>
      </div>

      <div className="ttl">
        <div className="eyebrow">¿Qué método uso?</div>
        <h1>Cuatro preguntas, un método</h1>
        <p className="muted lnote" style={{ marginTop: 10 }}>
          Todos pesan los criterios igual (con juicios de a pares de tus expertos, pestaña Criterios). La diferencia
          está en cómo comparas las alternativas entre sí.
        </p>
      </div>

      <div className="card form" style={{ marginTop: 24 }}>
        {step === 'q1' && (
          <div className="fgrp">
            <label className="lbl">1. ¿Tienes un valor por cada alternativa en cada criterio?</label>
            <div className="seg" role="group" aria-label="Pregunta 1">
              <button type="button" onClick={() => setStep('q1b')}>Sí, tengo datos reales (precio, kilómetros, años…)</button>
              <button type="button" onClick={() => setStep('fuzzy_topsis')}>Sí, pero son subjetivos o inciertos — solo puedo decir «buena», «mala»…</button>
              <button type="button" className="d" onClick={() => setStep('ahp')}>No, solo puedo comparar cuál alternativa es mejor en cada criterio</button>
            </div>
          </div>
        )}
        {step === 'q1b' && (
          <div className="fgrp">
            <label className="lbl">2. ¿Qué tan importante es la simplicidad del argumento al presentar la decisión?</label>
            <div className="seg" role="group" aria-label="Pregunta 1b">
              <button type="button" onClick={() => setStep('saw')}>Muy importante — prefiero algo que cualquiera pueda seguir paso a paso</button>
              <button type="button" className="d" onClick={() => setStep('q2')}>No es prioritario — puedo usar un método más sofisticado</button>
            </div>
          </div>
        )}
        {step === 'q2' && (
          <div className="fgrp">
            <label className="lbl">3. ¿Está bien que el método a veces diga «no se puede comparar estas dos» en vez de forzar un orden completo?</label>
            <div className="seg" role="group" aria-label="Pregunta 2">
              <button type="button" onClick={() => setStep('electre')}>Sí, prefiero que lo diga si pasa</button>
              <button type="button" className="d" onClick={() => setStep('q3')}>No, quiero un orden completo siempre</button>
            </div>
          </div>
        )}
        {step === 'q3' && (
          <div className="fgrp">
            <label className="lbl">4. ¿Qué te importa más al comparar las alternativas?</label>
            <div className="seg" role="group" aria-label="Pregunta 3">
              <button type="button" onClick={() => setStep('topsis')}>Que cada una se mida contra una combinación «ideal»</button>
              <button type="button" onClick={() => setStep('vikor')}>Que ninguna quede muy mal en un solo criterio (compromiso)</button>
              <button type="button" onClick={() => setStep('promethee')}>Comparar cada par de alternativas directamente</button>
            </div>
          </div>
        )}
        {isResult && (
          <div
            className="card win"
            style={{
              margin: 0,
              borderLeft: `5px solid ${METHOD_INFO[step as MethodKey].color}`,
              background: `linear-gradient(135deg, var(--surface) 0%, color-mix(in srgb, ${METHOD_INFO[step as MethodKey].color} 10%, var(--surface)) 100%)`,
              boxShadow: `0 8px 30px color-mix(in srgb, ${METHOD_INFO[step as MethodKey].color} 20%, transparent)`,
            }}
          >
            <div className="acts" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="eyebrow" style={{ color: METHOD_INFO[step as MethodKey].color }}>Recomendación para tu caso</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--f-mono)', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4 }}>
                Familia: {METHOD_INFO[step as MethodKey].family}
              </span>
            </div>
            <span className="big" style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
              {METHOD_INFO[step as MethodKey].label}
            </span>
            <p style={{ fontSize: 14.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
              {METHOD_INFO[step as MethodKey].why}
            </p>
            <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(0,0,0,0.2)', fontSize: 12, fontFamily: 'var(--f-mono)', color: 'var(--ink)' }}>
              📚 <strong>Referencia fundacional:</strong> {METHOD_INFO[step as MethodKey].citation}
            </div>
          </div>
        )}
        {step !== 'q1' && (
          <div className="acts"><button className="btn sm" type="button" onClick={() => setStep('q1')}>↺ Empezar de nuevo</button></div>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Comparación directa de los 7 métodos del curso</h3>
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
              <tr><td>Compara alternativas con</td><td className="n">Juicios por pares</td><td className="n" colSpan={5} style={{ textAlign: 'center' }}>Matriz de datos reales cuantitativos</td><td className="n">Etiquetas lingüísticas</td></tr>
              <tr><td>Ponderación de criterios</td><td className="n">Siempre AHP (expertos)</td><td className="n" colSpan={6} style={{ textAlign: 'center' }}>AHP (expertos), CRITIC o Entropía (objetivo)</td></tr>
              <tr><td>Resultado</td><td className="n">Ranking completo</td><td className="n">Ranking completo</td><td className="n">Ranking completo</td><td className="n">Ranking (compromiso)</td><td className="n">Ranking completo</td><td className="n">Puede dejar pares incomparables</td><td className="n">Ranking completo</td></tr>
              <tr><td>Principio matemático</td><td className="n">Autovalores y Consistencia (CR)</td><td className="n">Suma ponderada Min-Max</td><td className="n">Distancia euclidiana al PIS/NIS</td><td className="n">Optimización S, R y Q</td><td className="n">Flujos netos Φ+ y Φ-</td><td className="n">Concordancia, discordancia y veto</td><td className="n">Lógica difusa triangular (TFN)</td></tr>
              <tr><td>Datos inciertos o subjetivos</td><td className="n">No aplica</td><td className="n" colSpan={5} style={{ textAlign: 'center' }}>Requiere datos exactos</td><td className="n">✓ Diseñado para esto</td></tr>
              <tr><td>Límite sugerido de alternativas</td><td className="n">Hasta 9 (Saaty)</td><td className="n" colSpan={6} style={{ textAlign: 'center' }}>Sin límite de 9 elementos</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>📚 Marco Teórico y Bibliografía Científica del Curso</h3>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>
          La plataforma implementa los algoritmos estándar descritos en las publicaciones de referencia de la disciplina (Universidad del Magdalena, Maestría en Ingeniería):
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', borderLeft: '3px solid var(--m-ahp)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>AHP (Analytic Hierarchy Process)</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              <strong>Saaty, T. L. (1980).</strong> <em>The Analytic Hierarchy Process: Planning, Priority Setting, Resource Allocation</em>. McGraw-Hill, New York.
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', borderLeft: '3px solid var(--m-topsis)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              <strong>Hwang, C. L., & Yoon, K. (1981).</strong> <em>Multiple Attribute Decision Making: Methods and Applications</em>. Springer-Verlag, Berlin/Heidelberg.
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', borderLeft: '3px solid var(--m-vikor)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>VIKOR (VlseKriterijumska Optimizacija I Kompromisno Resenje)</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              <strong>Opricovic, S., & Tzeng, G. H. (2004).</strong> Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS. <em>European Journal of Operational Research</em>, 156(2), 445–455.
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', borderLeft: '3px solid var(--m-promethee)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>PROMETHEE II (Preference Ranking Organization METHod for Enrichment Evaluations)</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              <strong>Brans, J. P., & Vincke, P. (1985).</strong> A preference ranking organisation method: The PROMETHEE method for multiple criteria decision-making. <em>Management Science</em>, 31(6), 647–656.
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', borderLeft: '3px solid var(--m-electre)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>ELECTRE (ELimination Et Choix Traduisant la REalité)</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              <strong>Roy, B. (1991).</strong> The outranking approach and the foundations of ELECTRE methods. <em>Theory and Decision</em>, 31(1), 49–73.
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', borderLeft: '3px solid var(--m-saw)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>SAW (Simple Additive Weighting)</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              <strong>MacCrimmon, K. R. (1968).</strong> <em>Decisionmaking among multiple-attribute alternatives: a survey and consolidated approach</em>. RAND Memorandum.
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', borderLeft: '3px solid var(--m-fuzzy)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Fuzzy TOPSIS (Lógica Difusa)</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              <strong>Chen, C. T. (2000).</strong> Extensions of the TOPSIS for group decision-making under fuzzy environment. <em>Fuzzy Sets and Systems</em>, 114(1), 1–9.
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', borderLeft: '3px solid var(--s1)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Ponderaciones Objetivas (CRITIC y Entropía)</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              <strong>Diakoulaki, D., Mavrotas, G., & Papayannakis, L. (1995).</strong> Determining objective weights in multiple criteria problems: The CRITIC method. <em>Computers & Operations Research</em>, 22(7), 763–770. &bull; <strong>Shannon, C. E. (1948).</strong> A mathematical theory of communication. <em>Bell System Technical Journal</em>, 27(3), 379–423.
            </div>
          </div>
        </div>
      </div>

      <div className="lcta" style={{ marginBlock: '32px 24px' }}>
        <h2>Listo, ¿empezamos?</h2>
        <div className="acts">
          <Link className="btn primary" href="/login">Crear proyecto</Link>
          <Link className="btn" href="/tutorial">Ver el paso a paso</Link>
        </div>
      </div>
    </div>
  );
}
