import PublicView from '@/components/PublicView';

export default async function PublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicView token={token} />;
}
