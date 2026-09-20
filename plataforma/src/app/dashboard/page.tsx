import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NewProject from '@/components/NewProject';
import SignOutButton from '@/components/SignOutButton';
import Logo from '@/components/Logo';
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
      <div className="topbar">
        <Link className="brand" href="/"><Logo />Plataforma MCDA</Link>
        <div className="user"><span>{user.email}</span><SignOutButton /></div>
      </div>
      <div className="panel">
        <h1 style={{ fontSize: 30 }}>Mis proyectos</h1>
        <ProjectList initial={projects ?? []} />
        <NewProject userId={user.id} />
      </div>
    </div>
  );
}
