import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProjectWorkspace from '@/components/ProjectWorkspace';
import SignOutButton from '@/components/SignOutButton';
import Logo from '@/components/Logo';
import type { ExpertRow, JudgmentRow, ProjectRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${id}`);

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (!project) notFound();
  const { data: experts } = await supabase.from('experts').select('*').eq('project_id', id).order('position').order('created_at');
  const ids = (experts ?? []).map((e) => e.id);
  const { data: judgments } = ids.length
    ? await supabase.from('judgments').select('expert_id,sheet,pair_key,value').in('expert_id', ids).limit(20000)
    : { data: [] };

  return (
    <div className="wrap">
      <div className="topbar">
        <Link className="brand" href="/dashboard" title="Volver al panel de proyectos">
          <Logo size={26} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.2 }}>
              <span>Plataforma MCDA</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--f-mono)', padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', color: 'var(--muted)' }}>PRO</span>
            </div>
            <span className="brand-sub">← Mis proyectos</span>
          </div>
        </Link>
        <div className="user">
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>{user.email}</span>
          <SignOutButton />
        </div>
      </div>
      <ProjectWorkspace
        initialProject={project as ProjectRow}
        initialExperts={(experts ?? []) as ExpertRow[]}
        initialJudgments={(judgments ?? []) as JudgmentRow[]}
      />
    </div>
  );
}
