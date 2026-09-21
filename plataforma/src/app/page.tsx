import Link from 'next/link';
import type { CSSProperties } from 'react';
import { createClient } from '@/lib/supabase/server';
import Logo from '@/components/Logo';

const famVar = (v: string): CSSProperties => ({ '--fam': v } as CSSProperties);

export default async function Home() {
  const supabase = await createClient();
  let logged = false;
  try {
    const { data } = await supabase.auth.getUser();
    logged = !!data.user;
  } catch { /* sin configurar */ }
  const primaryHref = logged ? '/dashboard' : '/login';
  const primaryLabel = logged ? 'Ir a mis proyectos' : 'Entrar o crear cuenta';

  return (
    <>
      <div className="wrap">
        <div className="topbar">
          <Link className="brand" href="/" title="Plataforma MCDA · Inicio">
            <Logo size={26} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.2 }}>
                <span>Plataforma MCDA</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--f-mono)', padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', color: 'var(--muted)' }}>v2.0</span>
              </div>
              <span className="brand-sub">Ingeniería de Decisión</span>
            </div>
          </Link>
          <div className="acts">
            <Link className="btn sm" href="/metodo">¿Qué método uso?</Link>
            <Link className="btn sm" href="/tutorial">Cómo funciona</Link>
            <Link className="btn sm primary" href={primaryHref}>{primaryLabel}</Link>
          </div>
        </div>

        <div className="lhero">
          <div>
            <div className="eyebrow">Toma de Decisiones Multicriterio</div>
            <h1>Pesa lo que importa. Decide con números, no con corazonadas.</h1>
            <p className="lead">
              Crea un proyecto, pesa tus criterios con juicios de expertos por pares (o déjale los pesos al método
              con CRITIC o Entropía) y elige cómo comparar tus alternativas: con juicios por pares (AHP), con datos
              reales (TOPSIS, VIKOR, SAW, PROMETHEE, ELECTRE) o con evaluaciones lingüísticas difusas (Fuzzy TOPSIS).
              Cada experto responde por un enlace propio, sin necesitar cuenta. Tú ves los pesos, qué tan
              consistentes son los juicios y el resultado final — listo para exportar o compartir.
            </p>
            <div className="acts" style={{ marginTop: 22 }}>
              <Link className="btn primary" href={primaryHref}>{primaryLabel}</Link>
              <Link className="btn" href="/tutorial">Ver el paso a paso</Link>
            </div>
            <p className="muted lnote">¿Eres experto y te compartieron un enlace? No necesitas cuenta: ábrelo y responde directamente.</p>
              <div className="lstrip">
                <div className="fact"><b>7 métodos</b><span>AHP, TOPSIS, VIKOR, PROMETHEE, ELECTRE, SAW, Fuzzy TOPSIS</span></div>
                <div className="fact"><b>3 formas</b><span>de calcular los pesos de criterios</span></div>
                <div className="fact"><b>0 cuentas</b><span>para que un experto responda</span></div>
              </div>
          </div>

          <div className="lmock" aria-hidden="true">
            <span className="tag">Así se ve un juicio</span>
            <div className="pair">
              <div className="names"><span>LoRaWAN</span><span>Sigfox</span></div>
              <input type="range" min={-8} max={8} value={4} disabled tabIndex={-1} />
              <div className="ticks"><span>9</span><span>7</span><span>5</span><span>3</span><span>1</span><span>3</span><span>5</span><span>7</span><span>9</span></div>
              <div className="read">5 · Sigfox es fuertemente preferida que LoRaWAN.</div>
            </div>
            <hr />
            <span className="tag">Y el resultado, en vivo</span>
            <div className="wbar"><span className="nm">Sigfox</span><div className="track"><div className="fill" style={{ width: '78%' }} /><span className="val" style={{ left: '78%' }}>0.401</span></div></div>
            <div className="wbar"><span className="nm">LoRaWAN</span><div className="track"><div className="fill" style={{ width: '51%' }} /><span className="val" style={{ left: '51%' }}>0.263</span></div></div>
            <div className="wbar"><span className="nm">GSM/GPRS</span><div className="track"><div className="fill" style={{ width: '38%' }} /><span className="val" style={{ left: '38%' }}>0.197</span></div></div>
          </div>
        </div>
      </div>

      <section className="lsection alt">
        <div className="wrap">
          <div className="lhead">
            <div className="eyebrow">El problema</div>
            <h2>Calificar del 1 al 5 no es lo mismo que decidir</h2>
            <p>
              Repartir puntajes a ojo entre varios criterios esconde una trampa: es fácil calificar dos cosas
              distintas con el mismo número sin darte cuenta de que una te importa mucho más que la otra. Comparar
              de a pares — «¿A o B? ¿cuánto más?» — obliga a esa decisión explícita una y otra vez, y de ahí salen
              pesos que sí reflejan tu criterio real, con un número (CR) que te avisa si te contradijiste. Ese mismo
              mecanismo de pesos alimenta los 5 métodos de la plataforma; lo que cambia entre ellos es solo cómo
              comparan después las alternativas.
            </p>
          </div>
        </div>
      </section>

      <section className="lsection">
        <div className="wrap">
          <div className="lhead">
            <div className="eyebrow">Cómo funciona</div>
            <h2>De la idea al resultado, en cuatro pasos</h2>
            <p>El mismo flujo que verías en las sesiones de criterios y método del curso, pero con base de datos, enlaces y cálculo en vivo.</p>
          </div>
          <div className="lgrid4">
            <div className="lstep">
              <span className="no">01</span>
              <h3>Define tu proyecto y el método</h3>
              <p>Objetivo de decisión, criterios y alternativas — los que tú necesites, no una plantilla fija de 4x4 — y cómo vas a comparar: por pares o con datos.</p>
            </div>
            <div className="lstep">
              <span className="no">02</span>
              <h3>Invita a tus expertos</h3>
              <p>Cada uno recibe un enlace propio: responde sus comparaciones sin crear cuenta, sin ver lo que respondieron los demás.</p>
            </div>
            <div className="lstep">
              <span className="no">03</span>
              <h3>Mira los resultados</h3>
              <p>Pesos, consistencia (CR) y resultado final se recalculan solos con cada respuesta — agregados o por experto.</p>
            </div>
            <div className="lstep">
              <span className="no">04</span>
              <h3>Exporta o comparte</h3>
              <p>Descarga el Excel con fórmulas vivas, o publica un enlace de solo resultados.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lsection alt">
        <div className="wrap">
          <div className="lhead">
            <div className="eyebrow">7 métodos</div>
            <h2>Un mismo panel de expertos, siete formas de comparar</h2>
            <p>Los pesos de los criterios salen de juicios por pares o, si lo prefieres, se calculan solos con CRITIC o Entropía. Lo que elige el método es cómo comparan las alternativas.</p>
          </div>
          <div className="lmethods">
            <div className="lmethod" style={famVar('var(--fam-pares)')}>
              <span className="fam">Comparación por pares</span>
              <b>AHP</b>
              <span>Comparas cada par de alternativas y cada par de criterios: cuánto más importa uno que el otro. El método deriva pesos y ranking, y te avisa si te contradijiste (CR).</span>
            </div>
            <div className="lmethod" style={famVar('var(--fam-dist)')}>
              <span className="fam">Distancia al ideal</span>
              <b>TOPSIS</b>
              <span>Con datos reales por criterio, mide qué tan cerca está cada alternativa de una combinación ideal y qué tan lejos de la peor combinación posible.</span>
            </div>
            <div className="lmethod" style={famVar('var(--fam-dist)')}>
              <span className="fam">Distancia al ideal</span>
              <b>VIKOR</b>
              <span>Como TOPSIS, pero prioriza una solución de compromiso: evita alternativas que queden muy mal en un solo criterio, aunque sumen bien en total.</span>
            </div>
            <div className="lmethod" style={famVar('var(--fam-out)')}>
              <span className="fam">Sobreclasificación</span>
              <b>PROMETHEE</b>
              <span>Compara cada par de alternativas directamente, criterio por criterio, y construye el ranking a partir de esas preferencias netas.</span>
            </div>
            <div className="lmethod" style={famVar('var(--fam-out)')}>
              <span className="fam">Sobreclasificación</span>
              <b>ELECTRE</b>
              <span>Construye una relación de superación entre alternativas y puede decir honestamente que dos no son comparables, en vez de forzar un orden.</span>
            </div>
            <div className="lmethod" style={famVar('var(--fam-saw)')}>
              <span className="fam">Suma ponderada</span>
              <b>SAW</b>
              <span>El método más simple: normaliza los datos y suma criterio a criterio con sus pesos. Transparente, rápido y fácil de explicar.</span>
            </div>
            <div className="lmethod" style={famVar('var(--fam-fuzzy)')}>
              <span className="fam">Distancia difusa al ideal</span>
              <b>Fuzzy TOPSIS</b>
              <span>Cuando los datos son inciertos o subjetivos, evalúas con etiquetas lingüísticas (Muy mala → Muy buena); el método maneja la imprecisión con lógica difusa triangular.</span>
            </div>
          </div>
          <p className="lmethods-note">
            Colores por familia: violeta para comparación por pares, verde-azulado para distancia al ideal,
            magenta para sobreclasificación, naranja para suma ponderada, cian para lógica difusa.{' '}
            <Link href="/metodo">Respóndelo en tres preguntas</Link>.
          </p>
        </div>
      </section>

      <section className="lsection">
        <div className="wrap">
          <div className="lhead">
            <div className="eyebrow">Para quién</div>
            <h2>Pensado para decisiones con criterios en conflicto</h2>
          </div>
          <div className="laudience">
            <div className="laud"><b>Estudiantes de tesis</b><span>que necesitan un modelo propio con su número exacto de criterios, alternativas y expertos — AHP, TOPSIS o el método que mejor encaje, no el ejemplo fijo del curso.</span></div>
            <div className="laud"><b>Investigadores</b><span>que consultan un panel de expertos y quieren agregar sus juicios con rigor (media geométrica), no promediarlos a mano.</span></div>
            <div className="laud"><b>Equipos y organizaciones</b><span>que eligen entre proveedores, tecnologías o estrategias y quieren dejar el porqué documentado, no solo el resultado.</span></div>
          </div>
        </div>
      </section>

      <section className="lsection alt">
        <div className="wrap">
          <div className="lhead">
            <div className="eyebrow">Privacidad por diseño</div>
            <h2>Cada quien ve solo lo suyo</h2>
          </div>
          <div className="lpriv">
            <ul>
              <li>Tus proyectos son privados por defecto; nadie más los ve ni los edita.</li>
              <li>Un experto solo ve su propio formulario — nunca las respuestas de los demás.</li>
            </ul>
            <ul>
              <li>Si publicas resultados, se ocultan los nombres de los expertos y sus enlaces de invitación.</li>
              <li>Puedes desactivar el enlace público en cualquier momento; deja de verse al instante.</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="lcta">
          <h2>¿Listo para pesar lo que de verdad importa?</h2>
          <p>Crea tu proyecto en un par de minutos, o revisa primero el paso a paso completo.</p>
          <div className="acts">
            <Link className="btn primary" href={primaryHref}>{primaryLabel}</Link>
            <Link className="btn" href="/tutorial">Ver el paso a paso</Link>
          </div>
        </div>

        <footer className="lfoot">
          <span>Plataforma MCDA — Toma de Decisiones Multicriterio</span>
          <span><Link href="/tutorial">Cómo funciona</Link></span>
        </footer>
      </div>
    </>
  );
}
