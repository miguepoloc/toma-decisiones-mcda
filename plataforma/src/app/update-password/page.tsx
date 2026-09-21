import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import UpdatePasswordForm from '@/components/UpdatePasswordForm';

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  let logged = false;
  let userEmail: string | undefined;
  try {
    const { data } = await supabase.auth.getUser();
    logged = !!data.user;
    userEmail = data.user?.email;
  } catch { /* sin configurar */ }

  return (
    <Suspense>
      <UpdatePasswordForm loggedIn={logged} userEmail={userEmail} />
    </Suspense>
  );
}
