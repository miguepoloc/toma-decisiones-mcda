import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Logo from '@/components/Logo';

export const metadata = { title: 'Cómo funciona · Plataforma MCDA' };

export default async function TutorialPage() {
  const supabase = await createClient();
  let logged = false;
  try {
    const { data } = await supabase.auth.getUser();
    logged = !!data.user;
  } catch { /* sin configurar */ }
  const primaryHref = logged ? '/dashboard' : '/login';
  const primaryLabel = logged ? 'Ir a mis proyectos' : 'Entrar o crear cuenta';

  return (
    <div className="wrap">
      <div className="topbar">
        <Link className="brand" href="/"><Logo />Plataforma MCDA</Link>
        <div className="acts">
          <Link className="btn sm primary" href={primaryHref}>{primaryLabel}</Link>
        </div>
      </div>

      <div className="ttl">
        <div className="eyebrow">Guía completa</div>
        <h1>Del objetivo al ranking, paso a paso</h1>
        <p className="muted lnote" style={{ marginTop: 10 }}>
          Este es el mismo flujo que verías montando el ejercicio a mano en Excel — la plataforma solo se encarga de
          las cuentas, los enlaces y la aritmética. Nada de esto reemplaza entender AHP; te deja tiempo para pensar
          en los juicios en vez de en las fórmulas.
        </p>
      </div>

      <div className="tlayout">
        <div className="tmain">
          <div className="tphase" id="antes">
            <span className="k">Antes de empezar</span>
            <h2>Qué necesitas tener listo</h2>

            <div className="titem">
              <span className="no">1</span>
              <h3>Un objetivo de decisión claro</h3>
              <p>Una frase concreta: qué vas a elegir y en qué contexto. Ej.: «seleccionar la estrategia de adaptación de un modelo ASR para hablantes de español rural».</p>
            </div>
            <div className="titem">
              <span className="no">2</span>
              <h3>Tus criterios y alternativas</h3>
              <p>Los criterios con los que vas a juzgar (idealmente ya priorizados: 3 a 9 es el rango manejable) y las alternativas entre las que vas a elegir (2 o más).</p>
              <div className="tip"><b>Tip:</b> si ya hiciste la priorización de criterios de la Sesión 1 (lluvia de ideas → tamizaje → independencia → panel → corte), la pestaña «Priorización (A)» del proyecto reproduce ese mismo proceso y luego lleva los finalistas directo al AHP con un clic.</div>
            </div>
            <div className="titem">
              <span className="no">3</span>
              <h3>Elige el método</h3>
              <p>AHP (comparar de a pares) o TOPSIS (matriz de datos reales) — los dos pesan los criterios igual, cambia cómo comparas las alternativas. <Link href="/metodo">Responde 2 preguntas y te decimos cuál</Link>.</p>
            </div>
          </div>

          <div className="tphase" id="configurar">
            <span className="k">Configurar tu proyecto</span>
            <h2>Crear y ajustar el modelo</h2>

            <div className="titem">
              <span className="no">4</span>
              <h3>Crea el proyecto</h3>
              <p>Desde «Mis proyectos» → «Nuevo proyecto»: título y objetivo. Arranca con 3 criterios y 3 alternativas de ejemplo — los editas, renombras o agregas/quitas los que necesites en la pestaña «Proyecto».</p>
              <div className="tip"><b>Tip:</b> ¿ya tienes un respaldo de la herramienta HTML del curso (.json o el .xlsx que descargaste)? Usa «Importar de la herramienta HTML» en vez de empezar de cero: trae el proyecto, los expertos y todos los juicios.</div>
            </div>
            <div className="titem">
              <span className="no">5</span>
              <h3>Escribe la regla de cada criterio</h3>
              <p>Junto a cada criterio hay un campo «Regla: ¿qué es mejor?». Es la frase que verán tus expertos al comparar — importante sobre todo en criterios donde <i>menos es mejor</i> (costo, riesgo), para comparar en la dirección correcta.</p>
            </div>
          </div>

          <div className="tphase" id="expertos">
            <span className="k">Los expertos</span>
            <h2>Reunir los juicios</h2>

            <div className="titem">
              <span className="no">6</span>
              <h3>Agrega a tus expertos</h3>
              <p>Pestaña «Expertos» → nombre y rol de cada uno. Cada persona genera automáticamente un enlace propio (<code className="mono">/e/&lt;token&gt;</code>) que solo funciona para ella.</p>
            </div>
            <div className="titem">
              <span className="no">7</span>
              <h3>Comparte el enlace</h3>
              <p>Copia y envía el enlace de cada experto (WhatsApp, correo, lo que uses). No necesitan crear cuenta ni instalar nada: abren el enlace, mueven un control por cada par de elementos, y pulsan «Enviar respuestas» al terminar. Pueden cerrar la pestaña y volver después con el mismo enlace.</p>
              <div className="tip"><b>Tip:</b> ¿entrevistaste a un experto en persona o por llamada? Puedes llenar sus juicios tú mismo desde «Llenar yo por él/ella», sin que necesite abrir nada.</div>
            </div>
          </div>

          <div className="tphase" id="resultados">
            <span className="k">Resultados</span>
            <h2>Leer y compartir lo que salió</h2>

            <div className="titem">
              <span className="no">8</span>
              <h3>Revisa pesos y consistencia</h3>
              <p>Pestaña «Resultados»: el ranking final, cuánto aporta cada criterio, y el CR (razón de consistencia) de cada matriz — agregado o filtrando por experto individual. Un CR ≥ 0.10 es la señal de que alguien se contradijo y vale la pena revisar esos juicios con esa persona.</p>
            </div>
            <div className="titem">
              <span className="no">9</span>
              <h3>Exporta o publica</h3>
              <p>Pestaña «Compartir»: descarga el Excel con la misma estructura del ejercicio del curso (fórmulas vivas, listo para el informe), o activa un enlace público de solo resultados — sin nombres de expertos, sin sus enlaces, sin la priorización de criterios.</p>
            </div>
          </div>
        </div>

        <nav className="trail" aria-label="Secciones de esta guía">
          <span className="lbl">En esta guía</span>
          <a href="#antes">1. Antes de empezar</a>
          <a href="#configurar">2. Configurar tu proyecto</a>
          <a href="#expertos">3. Los expertos</a>
          <a href="#resultados">4. Resultados</a>
        </nav>
      </div>

      <div className="lcta" style={{ marginBlock: '48px 24px' }}>
        <h2>Ya sabes cómo funciona — el resto es tu criterio</h2>
        <div className="acts">
          <Link className="btn primary" href={primaryHref}>{primaryLabel}</Link>
          <Link className="btn" href="/">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
