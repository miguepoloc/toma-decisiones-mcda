'use client';

import Link from 'next/link';
import { useState } from 'react';
import Logo from '@/components/Logo';

type MethodKey = 'ahp' | 'topsis' | 'vikor' | 'electre' | 'promethee';

const METHOD_INFO: Record<MethodKey, { label: string; why: string }> = {
  ahp: { label: 'AHP · juicios por pares', why: 'No tienes datos numéricos para todo, así que comparas de a pares qué alternativa es mejor en cada criterio — el mismo mecanismo que ya usaste para pesar los criterios.' },
  topsis: { label: 'TOPSIS · matriz de datos', why: 'Tienes datos reales y quieres el método más directo: qué tan cerca está cada alternativa de una combinación "ideal" de todos los criterios.' },
  vikor: { label: 'VIKOR · solución de compromiso', why: 'Tienes datos reales y te importa evitar una alternativa que quede muy mal en un solo criterio, no solo la que suma más en total.' },
  promethee: { label: 'PROMETHEE · flujos de preferencia', why: 'Tienes datos reales y prefieres comparar cada par de alternativas directamente, criterio por criterio, en vez de contra un punto "ideal" abstracto.' },
  electre: { label: 'ELECTRE · relación de superación', why: 'Tienes datos reales y prefieres que el método te diga honestamente cuando dos alternativas no se pueden comparar, en vez de forzar un orden entre ellas.' },
};

type Step = 'q1' | 'q2' | 'q3' | MethodKey;

export default function MetodoPage() {
  const [step, setStep] = useState<Step>('q1');
  const isResult = step !== 'q1' && step !== 'q2' && step !== 'q3';

  return (
    <div className="wrap">
      <div className="topbar">
        <Link className="brand" href="/"><Logo />Plataforma MCDA</Link>
        <Link className="btn sm" href="/tutorial">Cómo funciona</Link>
      </div>

      <div className="ttl">
        <div className="eyebrow">¿Qué método uso?</div>
        <h1>Tres preguntas, un método</h1>
        <p className="muted lnote" style={{ marginTop: 10 }}>
          Todos pesan los criterios igual (con juicios de a pares de tus expertos, pestaña Criterios). La diferencia
          está en cómo comparas las alternativas entre sí.
        </p>
      </div>

      <div className="card form" style={{ marginTop: 24 }}>
        {step === 'q1' && (
          <div className="fgrp">
            <label className="lbl">1. ¿Tienes un valor numérico real por cada alternativa en cada criterio (precio, kilómetros, años, una métrica técnica)?</label>
            <div className="seg" role="group" aria-label="Pregunta 1">
              <button type="button" onClick={() => setStep('q2')}>Sí, para todos los criterios</button>
              <button type="button" className="d" onClick={() => setStep('ahp')}>No, solo puedo comparar cuál es mejor</button>
            </div>
          </div>
        )}
        {step === 'q2' && (
          <div className="fgrp">
            <label className="lbl">2. ¿Está bien que el método a veces diga «no se puede comparar estas dos» en vez de forzar un orden completo?</label>
            <div className="seg" role="group" aria-label="Pregunta 2">
              <button type="button" onClick={() => setStep('electre')}>Sí, prefiero que lo diga si pasa</button>
              <button type="button" className="d" onClick={() => setStep('q3')}>No, quiero un orden completo siempre</button>
            </div>
          </div>
        )}
        {step === 'q3' && (
          <div className="fgrp">
            <label className="lbl">3. ¿Qué te importa más al comparar las alternativas?</label>
            <div className="seg" role="group" aria-label="Pregunta 3">
              <button type="button" onClick={() => setStep('topsis')}>Qué tan cerca está cada una de una combinación «ideal»</button>
              <button type="button" onClick={() => setStep('vikor')}>Que ninguna quede muy mal en un solo criterio (compromiso)</button>
              <button type="button" onClick={() => setStep('promethee')}>Comparar cada par de alternativas directamente</button>
            </div>
          </div>
        )}
        {isResult && (
          <div className="card win" style={{ margin: 0 }}>
            <span className="eyebrow">Recomendación</span>
            <span className="big">{METHOD_INFO[step as MethodKey].label}</span>
            <span className="muted" style={{ fontSize: 14 }}>{METHOD_INFO[step as MethodKey].why}</span>
          </div>
        )}
        {step !== 'q1' && (
          <div className="acts"><button className="btn sm" type="button" onClick={() => setStep('q1')}>↺ Empezar de nuevo</button></div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>Comparación directa</h3>
        <div className="tbl">
          <table>
            <thead><tr><th></th><th className="n">AHP</th><th className="n">TOPSIS</th><th className="n">VIKOR</th><th className="n">PROMETHEE</th><th className="n">ELECTRE</th></tr></thead>
            <tbody>
              <tr><td>Compara alternativas con</td><td className="n">Juicios por pares</td><td className="n" colSpan={4} style={{ textAlign: 'center' }}>Matriz de datos reales</td></tr>
              <tr><td>Resultado</td><td className="n">Ranking completo</td><td className="n">Ranking completo</td><td className="n">Ranking (compromiso)</td><td className="n">Ranking completo</td><td className="n">Puede dejar pares incomparables</td></tr>
              <tr><td>Idea central</td><td className="n">Consistencia de juicios (CR)</td><td className="n">Distancia a un ideal</td><td className="n">Balance grupo/individuo</td><td className="n">Comparación par a par</td><td className="n">Concordancia/discordancia</td></tr>
              <tr><td>Con muchas alternativas (&gt;9)</td><td className="n">Difícil de mantener consistente</td><td className="n" colSpan={4} style={{ textAlign: 'center' }}>Sin ese límite</td></tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
          Este curso también enseña ANP (Sesión 6) — no está en esta comparación porque, a diferencia de los 5
          anteriores, no usa una matriz de decisión: generaliza el paso de pesos a una red con dependencias. La
          plataforma todavía no lo implementa.
        </p>
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
