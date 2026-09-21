'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, supabaseConfigurado } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/errors';
import Topbar from '@/components/Topbar';

function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const hasMinLength = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = hasMinLength && passwordsMatch && !busy;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccess && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (isSuccess && countdown === 0) {
      router.push('/dashboard');
      router.refresh();
    }
    return () => clearTimeout(timer);
  }, [isSuccess, countdown, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setMsg('');

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMsg(friendlyError(error, 'No se pudo actualizar la contraseña.'));
      setBusy(false);
    } else {
      setIsSuccess(true);
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <Topbar badge="SEGURIDAD" subtitle="← Ir al inicio" />

      <div style={{ maxWidth: 440, margin: '48px auto 80px', display: 'grid', gap: 18 }}>
        <div>
          <div className="eyebrow">Restablecimiento de Credenciales</div>
          <h1 style={{ fontSize: 26, margin: '6px 0 8px' }}>Establecer nueva contraseña</h1>
          <p className="muted" style={{ fontSize: 14 }}>
            Crea una clave segura para proteger tus proyectos, matrices y modelos multicriterio.
          </p>
        </div>

        {!supabaseConfigurado && (
          <div className="banner">
            <span><b>Falta configurar Supabase.</b> Verifica las variables de entorno del sistema.</span>
          </div>
        )}

        {isSuccess ? (
          <div className="card" style={{ borderTop: '3px solid var(--pass)', display: 'grid', gap: 14, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--pass)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 22, fontWeight: 700 }}>
              ✓
            </div>
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>¡Contraseña actualizada!</h3>
              <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
                Tu clave ha sido modificada correctamente. Redirigiéndote a tus proyectos en <b>{countdown}s</b>...
              </p>
            </div>
            <button className="btn primary" onClick={() => { router.push('/dashboard'); router.refresh(); }}>
              Ir a Mis Proyectos ahora →
            </button>
          </div>
        ) : (
          <form className="card form" onSubmit={submit} style={{ borderTop: '3px solid var(--accent)' }}>
            <div>
              <label className="lbl" htmlFor="np">Nueva contraseña</label>
              <input
                id="np"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label className="lbl" htmlFor="cp">Confirmar nueva contraseña</label>
              <input
                id="cp"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Repite la contraseña"
              />
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px', display: 'grid', gap: 6, fontSize: 12.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: hasMinLength ? 'var(--pass)' : 'var(--muted)' }}>
                <span>{hasMinLength ? '●' : '○'}</span>
                <span>Mínimo 8 caracteres</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: passwordsMatch ? 'var(--pass)' : 'var(--muted)' }}>
                <span>{passwordsMatch ? '●' : '○'}</span>
                <span>Las contraseñas coinciden</span>
              </div>
            </div>

            {msg && (
              <div className="banner" role="alert" style={{ margin: 0, fontSize: 13.5 }}>
                <span><b>Error:</b> {msg}</span>
              </div>
            )}

            <button className="btn primary" type="submit" disabled={!canSubmit}>
              {busy ? 'Actualizando clave…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}

        <p className="muted" style={{ fontSize: 12.5, textAlign: 'center' }}>
          ¿Recordaste tu contraseña anterior? <Link href="/login" style={{ color: 'var(--accent)' }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense>
      <UpdatePasswordForm />
    </Suspense>
  );
}
