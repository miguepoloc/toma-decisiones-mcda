'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, supabaseConfigurado } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/dashboard';
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const supabase = createClient();
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message);
      else { router.push(next); router.refresh(); }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) setMsg(error.message);
      else if (data.session) { router.push(next); router.refresh(); }
      else setMsg('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
    }
    setBusy(false);
  }

  return (
    <div className="wrap">
      <div className="hero" style={{ maxWidth: 420 }}>
        <h1>{mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
        {!supabaseConfigurado && <div className="banner"><span><b>Falta configurar Supabase.</b> Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (ver README).</span></div>}
        <form className="card form" onSubmit={submit}>
          {mode === 'up' && <div><label className="lbl" htmlFor="n">Nombre</label><input id="n" type="text" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>}
          <div><label className="lbl" htmlFor="e">Correo</label><input id="e" type="text" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <div><label className="lbl" htmlFor="p">Contraseña</label><input id="p" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></div>
          {msg && <p className="err" role="alert">{msg}</p>}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Un momento…' : mode === 'in' ? 'Entrar' : 'Crear cuenta'}</button>
        </form>
        <button className="btn" type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); }}>
          {mode === 'in' ? 'No tengo cuenta: crear una' : 'Ya tengo cuenta: entrar'}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
