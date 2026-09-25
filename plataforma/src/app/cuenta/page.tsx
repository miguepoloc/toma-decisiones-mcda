import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Topbar from '@/components/Topbar';
import AccountActions from '@/components/AccountActions';

export const dynamic = 'force-dynamic';

/** «Mi cuenta»: datos básicos y las dos acciones del propio usuario sobre su cuenta — desactivarla (pausa
 * reversible) o eliminarla con todos sus datos (irreversible). Protegida por middleware (`/cuenta`). */
export default async function CuentaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/cuenta');

  const [{ data: profile }, { count: proyectos }] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle(),
    supabase.from('projects').select('id', { count: 'exact', head: true }),
  ]);

  return (
    <div className="wrap">
      <Topbar badge="CUENTA" subtitle="Toma de Decisiones Multicriterio" loggedIn userEmail={user.email} />
      <div className="panel">
        <header>
          <h1 style={{ fontSize: 30 }}>Mi cuenta</h1>
          <p>Tus datos y lo que puedes hacer con tu cuenta.</p>
        </header>

        <section className="card" aria-labelledby="datos-ttl">
          <h2 id="datos-ttl" style={{ fontSize: 16, marginBottom: 10 }}>Tus datos</h2>
          <dl className="acct-dl">
            <dt>Nombre</dt><dd>{profile?.full_name || '—'}</dd>
            <dt>Correo</dt><dd className="mono">{user.email}</dd>
            <dt>Proyectos</dt><dd>{proyectos ?? 0}</dd>
          </dl>
        </section>

        <AccountActions uid={user.id} email={user.email ?? ''} isAdmin={profile?.role === 'admin'} projects={proyectos ?? 0} />
      </div>
    </div>
  );
}
