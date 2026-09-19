import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NewProject from '@/components/NewProject';
import SignOutButton from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard');
  const { data: projects } = await supabase
    .from('projects').select('id,title,objective,is_public,updated_at').order('updated_at', { ascending: false });

  return (
    <div className="wrap">
      <div className="topbar">
        <Link className="brand" href="/">Plataforma MCDA</Link>
        <div className="user"><span>{user.email}</span><SignOutButton /></div>
      </div>
      <div className="panel">
        <h1 style={{ fontSize: 30 }}>Mis proyectos</h1>
        <div className="plist">
          {(projects ?? []).map((p) => (
            <Link key={p.id} className="prow" href={`/projects/${p.id}`}>
              <span><b>{p.title}</b><br /><span className="muted" style={{ fontSize: 13 }}>{p.objective ? p.objective.slice(0, 110) : 'Sin objetivo todavía'}</span></span>
              <span className={'pill ' + (p.is_public ? '' : 'neutral')}>{p.is_public ? 'Público con enlace' : 'Privado'}</span>
            </Link>
          ))}
          {!(projects ?? []).length && <div className="card muted">Aún no tienes proyectos. Crea el primero o importa tu trabajo de la herramienta HTML.</div>}
        </div>
        <NewProject userId={user.id} />
      </div>
    </div>
  );
}
