'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Logo from '@/components/Logo';

type Answer = { label: string; ahp: number; topsis: number; note: string };
type Question = { q: string; answers: Answer[] };

const QUESTIONS: Question[] = [
  {
    q: '¿Tienes datos numéricos reales para cada alternativa en cada criterio (precios, mediciones, especificaciones técnicas)?',
    answers: [
      { label: 'Sí, para todos los criterios', ahp: 0, topsis: 2, note: 'TOPSIS aprovecha esos datos directamente.' },
      { label: 'Solo para algunos', ahp: 1, topsis: 1, note: 'Cualquiera funciona; con datos parciales, AHP deja opinar sobre lo que no se puede medir.' },
      { label: 'No, solo puedo juzgar cuál es mejor que cuál', ahp: 2, topsis: 0, note: 'Ese es exactamente el punto de partida de AHP: comparar de a pares.' },
    ],
  },
  {
    q: '¿Cuántas alternativas necesitas comparar?',
    answers: [
      { label: '2 a 5', ahp: 1, topsis: 1, note: 'Con pocas alternativas, comparar de a pares (AHP) es manejable.' },
      { label: 'Más de 9', ahp: 0, topsis: 2, note: 'AHP con más de 9 elementos por matriz es difícil de mantener consistente (Saaty); TOPSIS no tiene ese límite: solo llenas la matriz.' },
    ],
  },
];

export default function MetodoPage() {
  const [chosen, setChosen] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const answered = chosen.filter((c) => c != null).length;

  const rec = useMemo(() => {
    let ahp = 0, topsis = 0;
    chosen.forEach((c, i) => { if (c != null) { ahp += QUESTIONS[i].answers[c].ahp; topsis += QUESTIONS[i].answers[c].topsis; } });
    return { ahp, topsis, winner: ahp === topsis ? null : ahp > topsis ? 'ahp' : 'topsis' } as const;
  }, [chosen]);

  return (
    <div className="wrap">
      <div className="topbar">
        <Link className="brand" href="/"><Logo />Plataforma MCDA</Link>
        <Link className="btn sm" href="/tutorial">Cómo funciona</Link>
      </div>

      <div className="ttl">
        <div className="eyebrow">¿Qué método uso?</div>
        <h1>AHP o TOPSIS, según lo que tengas para trabajar</h1>
        <p className="muted lnote" style={{ marginTop: 10 }}>
          Los dos pesan los criterios igual (con juicios de a pares de tus expertos). La diferencia está en cómo
          comparas las alternativas entre sí. Responde estas 2 preguntas para ver cuál te conviene — o decide tú
          mismo con la comparación de abajo.
        </p>
      </div>

      <div className="card form" style={{ marginTop: 24 }}>
        {QUESTIONS.map((qq, i) => (
          <div key={qq.q} className="fgrp">
            <label className="lbl">{i + 1}. {qq.q}</label>
            <div className="seg" role="group" aria-label={qq.q}>
              {qq.answers.map((a, j) => (
                <button key={a.label} type="button" aria-pressed={chosen[i] === j}
                  onClick={() => setChosen((prev) => prev.map((c, k) => (k === i ? j : c)))}>
                  {a.label}
                </button>
              ))}
            </div>
            {chosen[i] != null && <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>{qq.answers[chosen[i] as number].note}</p>}
          </div>
        ))}
      </div>

      {answered === QUESTIONS.length && (
        <div className="card win" style={{ marginTop: 16 }}>
          <span className="eyebrow">Recomendación</span>
          {rec.winner == null ? (
            <span className="big">Empate — cualquiera de los dos te sirve, sigue tu preferencia</span>
          ) : (
            <span className="big">{rec.winner === 'ahp' ? 'AHP · juicios por pares' : 'TOPSIS · matriz de datos'}</span>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>Comparación directa</h3>
        <div className="tbl">
          <table>
            <thead><tr><th></th><th className="n">AHP</th><th className="n">TOPSIS</th></tr></thead>
            <tbody>
              <tr><td>Pesa los criterios</td><td className="n">Sí (juicios de a pares)</td><td className="n">Sí, igual (misma hoja Criterios)</td></tr>
              <tr><td>Compara alternativas con</td><td className="n">Juicios de a pares</td><td className="n">Matriz de datos reales</td></tr>
              <tr><td>Necesita datos cuantitativos</td><td className="n">No</td><td className="n">Sí, uno por alternativa × criterio</td></tr>
              <tr><td>Con muchas alternativas (&gt;9)</td><td className="n">Se vuelve difícil de mantener consistente</td><td className="n">Sin ese límite</td></tr>
              <tr><td>De dónde sale la opinión</td><td className="n">Del panel de expertos</td><td className="n">De los datos; los expertos solo pesan criterios</td></tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
          Este curso también enseña VIKOR, ELECTRE, PROMETHEE y ANP (Sesiones 3, 4 y 6) — la plataforma todavía no los
          implementa, este asistente crecerá con cada método nuevo.
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
