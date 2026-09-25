import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NewProject from '@/components/NewProject';
import Topbar from '@/components/Topbar';
import ProjectList from '@/components/ProjectList';
import { PROJECT_LIST_SELECT, type ProjectListRow } from '@/lib/projects';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard');
  const { data: projects } = await supabase
    .from('projects').select(PROJECT_LIST_SELECT).order('updated_at', { ascending: false });

  return (
    <div className="wrap">
      <Topbar badge="PANEL" subtitle="Toma de Decisiones Multicriterio" loggedIn userEmail={user.email} />
      <div className="panel">
        <h1 style={{ fontSize: 30 }}>Mis proyectos</h1>
        <ProjectList initial={(projects ?? []) as unknown as ProjectListRow[]} />
        <NewProject userId={user.id} />
      </div>
    </div>
  );
}
