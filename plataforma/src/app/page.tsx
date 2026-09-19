import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  let logged = false;
  try {
    const { data } = await supabase.auth.getUser();
    logged = !!data.user;
  } catch { /* sin configurar */ }
  return (
    <div className="wrap">
      <div className="hero">
        <div className="eyebrow">Toma de Decisiones Multicriterio</div>
        <h1>Prioriza criterios y decide con AHP, junto a tus expertos</h1>
        <p className="muted">
          Crea un proyecto, define tus criterios y alternativas, y comparte un enlace con cada experto para que responda
          sus comparaciones. Tú ves lo que dijo cada uno, los pesos, la consistencia y el ranking final, y lo exportas a Excel.
        </p>
        <div className="acts">
          {logged
            ? <Link className="btn primary" href="/dashboard">Ir a mis proyectos</Link>
            : <Link className="btn primary" href="/login">Entrar o crear cuenta</Link>}
        </div>
        <p className="muted" style={{ fontSize: 14 }}>¿Eres experto? No necesitas cuenta: abre el enlace que te envió el estudiante.</p>
      </div>
    </div>
  );
}
