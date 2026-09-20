import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Logo from '@/components/Logo';

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
          <Link className="brand" href="/"><Logo />Plataforma MCDA</Link>
          <div className="acts">
            <Link className="btn sm" href="/metodo">¿Qué método uso?</Link>
            <Link className="btn sm" href="/tutorial">Cómo funciona</Link>
            <Link className="btn sm primary" href={primaryHref}>{primaryLabel}</Link>
          </div>
        </div>

        <div className="lhero">
          <div>
            <div className="eyebrow">Toma de Decisiones Multicriterio · AHP</div>
            <h1>Compara de a pares. Decide con números, no con corazonadas.</h1>
            <p className="lead">
              Crea un proyecto, define tus criterios y alternativas, y comparte un enlace con cada experto para que
              responda sus comparaciones sin necesitar cuenta. Tú ves lo que dijo cada uno, los pesos que resultan,
              qué tan consistentes son sus juicios y el ranking final — y lo exportas a un Excel con las mismas
              fórmulas que verías si lo hicieras a mano.
            </p>
            <div className="acts" style={{ marginTop: 22 }}>
              <Link className="btn primary" href={primaryHref}>{primaryLabel}</Link>
              <Link className="btn" href="/tutorial">Ver el paso a paso</Link>
            </div>
            <p className="muted lnote">¿Eres experto y te compartieron un enlace? No necesitas cuenta: ábrelo y responde directamente.</p>
            <div className="lstrip">
              <div className="fact"><b>Sin límite fijo</b><span>de criterios ni alternativas</span></div>
              <div className="fact"><b>0 cuentas</b><span>para que un experto responda</span></div>
              <div className="fact"><b>1 Excel</b><span>con fórmulas vivas, listo para el informe</span></div>
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
              pesos que sí reflejan tu criterio real, con un número (CR) que te avisa si te contradijiste.
            </p>
          </div>
        </div>
      </section>

      <section className="lsection">
        <div className="wrap">
          <div className="lhead">
            <div className="eyebrow">Cómo funciona</div>
            <h2>De la idea al ranking, en cuatro pasos</h2>
            <p>El mismo flujo que verías en la sesión de AHP del curso, pero con base de datos, enlaces y cálculo en vivo.</p>
          </div>
          <div className="lgrid4">
            <div className="lstep">
              <span className="no">01</span>
              <h3>Define tu proyecto</h3>
              <p>Objetivo de decisión, criterios y alternativas — los que tú necesites, no una plantilla fija de 4x4.</p>
            </div>
            <div className="lstep">
              <span className="no">02</span>
              <h3>Invita a tus expertos</h3>
              <p>Cada uno recibe un enlace propio: responde sus comparaciones sin crear cuenta, sin ver lo que respondieron los demás.</p>
            </div>
            <div className="lstep">
              <span className="no">03</span>
              <h3>Mira los resultados</h3>
              <p>Pesos, consistencia (CR) y ranking se recalculan solos con cada respuesta — agregados o por experto.</p>
            </div>
            <div className="lstep">
              <span className="no">04</span>
              <h3>Exporta o comparte</h3>
              <p>Descarga el Excel con la misma estructura del ejercicio del curso, o publica un enlace de solo resultados.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lsection alt">
        <div className="wrap">
          <div className="lhead">
            <div className="eyebrow">Para quién</div>
            <h2>Pensado para decisiones con criterios en conflicto</h2>
          </div>
          <div className="laudience">
            <div className="laud"><b>Estudiantes de tesis</b><span>que necesitan un modelo AHP propio con su número exacto de criterios y expertos, no el ejemplo fijo del curso.</span></div>
            <div className="laud"><b>Investigadores</b><span>que consultan un panel de expertos y quieren agregar sus juicios con rigor (media geométrica), no promediarlos a mano.</span></div>
            <div className="laud"><b>Equipos y organizaciones</b><span>que eligen entre proveedores, tecnologías o estrategias y quieren dejar el porqué documentado, no solo el resultado.</span></div>
          </div>
        </div>
      </section>

      <section className="lsection">
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
