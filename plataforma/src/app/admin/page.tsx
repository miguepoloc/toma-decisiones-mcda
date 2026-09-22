import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Topbar from '@/components/Topbar';
import type { AdminStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Backoffice de solo lectura, solo para cuentas con profiles.role = 'admin' (ver admin_stats()
 * en 20240101000008_admin_role.sql). No aparece en la navegación normal: quien no sea admin y
 * llegue aquí (con o sin sesión) termina en /dashboard, sin indicio de que esta ruta existe. */
export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  const { data, error } = await supabase.rpc('admin_stats');
  if (error || !data) redirect('/dashboard');
  const s = data as AdminStats;

  return (
    <div className="wrap">
      <Topbar badge="ADMIN" subtitle="Backoffice · solo lectura" loggedIn userEmail={user.email} showNav={false} />
      <div className="panel">
        <header>
          <h1 style={{ fontSize: 30 }}>Backoffice</h1>
          <p>Vista agregada de toda la plataforma. Solo números, ningún dato de proyectos individuales.</p>
        </header>

        <div className="stat-group">
          <h2>Proyectos</h2>
          <div className="stat-grid">
            <div className="stat">
              <span className="n">{s.proyectos_total}</span>
              <span className="l">Total</span>
            </div>
            <div className="stat">
              <span className="n">{s.proyectos_publicos}</span>
              <span className="l">Públicos</span>
            </div>
            <div className="stat">
              <span className="n">{s.proyectos_privados}</span>
              <span className="l">Privados</span>
            </div>
          </div>
        </div>

        <div className="stat-group">
          <h2>Usuarios</h2>
          <div className="stat-grid">
            <div className="stat">
              <span className="n">{s.usuarios_total}</span>
              <span className="l">Cuentas registradas</span>
            </div>
          </div>
        </div>

        <div className="stat-group">
          <h2>Expertos</h2>
          <div className="stat-grid">
            <div className="stat">
              <span className="n">{s.expertos_total}</span>
              <span className="l">Total</span>
            </div>
            <div className="stat">
              <span className="n">{s.expertos_pending}</span>
              <span className="l">Pendientes</span>
            </div>
            <div className="stat">
              <span className="n">{s.expertos_in_progress}</span>
              <span className="l">En progreso</span>
            </div>
            <div className="stat">
              <span className="n">{s.expertos_submitted}</span>
              <span className="l">Enviados</span>
            </div>
          </div>
        </div>

        <div className="stat-group">
          <h2>Contenido</h2>
          <div className="stat-grid">
            <div className="stat">
              <span className="n">{s.criterios_total}</span>
              <span className="l">Criterios (suma)</span>
            </div>
            <div className="stat">
              <span className="n">{s.alternativas_total}</span>
              <span className="l">Alternativas (suma)</span>
            </div>
            <div className="stat">
              <span className="n">{s.juicios_total}</span>
              <span className="l">Juicios registrados</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
