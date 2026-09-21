import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NewProject from '@/components/NewProject';
import SignOutButton from '@/components/SignOutButton';
import Topbar from '@/components/Topbar';
import ProjectList from '@/components/ProjectList';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard');
  const { data: projects } = await supabase
    .from('projects').select('id,title,objective,is_public,updated_at').order('updated_at', { ascending: false });

  return (
    <div className="wrap">
      <Topbar badge="PANEL" subtitle="Toma de Decisiones Multicriterio">
        <div className="user">
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>{user.email}</span>
          <SignOutButton />
        </div>
      </Topbar>
      <div className="panel">
        <h1 style={{ fontSize: 30 }}>Mis proyectos</h1>
        <ProjectList initial={projects ?? []} />
        <NewProject userId={user.id} />
      </div>
    </div>
  );
}
