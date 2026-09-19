'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button className="btn sm" type="button" onClick={async () => { await createClient().auth.signOut(); router.push('/login'); router.refresh(); }}>
      Salir
    </button>
  );
}
