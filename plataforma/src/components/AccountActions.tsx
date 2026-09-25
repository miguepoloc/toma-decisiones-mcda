'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { removeAllUserLayers } from '@/lib/geo/store';
import { friendlyError } from '@/lib/errors';
import ConfirmDialog from './ConfirmDialog';

type Which = 'pause' | 'delete' | null;

/** Desactivar (pausa reversible) y eliminar (irreversible) la cuenta propia. Ver 20240101000014_account_status.sql:
 * `pause_my_account()` la pausa (volver a iniciar sesión la reactiva); `delete_my_account()` la borra en cascada.
 * Los archivos de mapas viven en Storage y el SQL no puede borrarlos, así que se borran aquí PRIMERO por la API. */
export default function AccountActions({ uid, email, isAdmin, projects }: { uid: string; email: string; isAdmin: boolean; projects: number }) {
  const router = useRouter();
  const [open, setOpen] = useState<Which>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => { if (busy) return; setOpen(null); setTyped(''); setError(''); };
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  async function leave(motivo: 'pausada' | 'eliminada') {
    await createClient().auth.signOut();
    router.push(`/login?motivo=${motivo}`);
    router.refresh();
  }

  async function pause() {
    setBusy(true); setError('');
    const { error: e } = await createClient().rpc('pause_my_account');
    if (e) { setError(friendlyError(e, 'No se pudo desactivar la cuenta. Intenta de nuevo.')); setBusy(false); return; }
    await leave('pausada');
  }

  async function remove() {
    setBusy(true); setError('');
    const sb = createClient();
    try { await removeAllUserLayers(sb, uid); }
    catch (e) { setError(friendlyError(e, 'No pudimos borrar tus mapas guardados. No se eliminó nada: intenta de nuevo.')); setBusy(false); return; }
    const { error: e } = await sb.rpc('delete_my_account');
    if (e) {
      const raw = e.message ?? '';
      setError(/suspendida|admin/i.test(raw) ? raw : friendlyError(e, 'No se pudo eliminar la cuenta. Intenta de nuevo.'));
      setBusy(false); return;
    }
    await leave('eliminada');
  }

  return (
    <>
      <section className="card acct-zone" aria-labelledby="pausa-ttl">
        <div>
          <h2 id="pausa-ttl" style={{ fontSize: 16 }}>Desactivar mi cuenta</h2>
          <p className="muted">Pausa tu cuenta sin perder nada. Cierra tu sesión y oculta tus enlaces (los de tus expertos y los públicos)
            mientras esté desactivada. <b>Para reactivarla, basta con volver a iniciar sesión.</b></p>
        </div>
        <button type="button" className="btn" onClick={() => setOpen('pause')} disabled={isAdmin}>Desactivar cuenta</button>
      </section>

      <section className="card acct-zone danger" aria-labelledby="borrar-ttl">
        <div>
          <h2 id="borrar-ttl" style={{ fontSize: 16 }}>Eliminar mi cuenta y mis datos</h2>
          <p className="muted">Borra para siempre tu cuenta, tus {projects === 1 ? 'proyecto' : `${projects} proyectos`}, los juicios de tus expertos,
            los mapas que subiste y tus enlaces. <b>No se puede deshacer</b> y no hay copia: si quieres conservar algo, exporta antes tus resultados a Excel.</p>
          {isAdmin && <p className="muted" style={{ marginTop: 6 }}>Las cuentas de administrador no se desactivan ni se eliminan desde aquí.</p>}
        </div>
        <button type="button" className="btn danger" onClick={() => setOpen('delete')} disabled={isAdmin}>Eliminar cuenta…</button>
      </section>

      {open === 'pause' && (
        <ConfirmDialog
          title="¿Desactivar tu cuenta?" tone="neutral" confirmLabel="Desactivar y salir" busyLabel="Desactivando…"
          busy={busy} error={error} onConfirm={() => void pause()} onClose={close}
          description={<>Cerraremos tu sesión y tus enlaces dejarán de funcionar hasta que vuelvas. Tus proyectos y datos <b>se conservan</b>. Al iniciar sesión de nuevo, todo vuelve como estaba.</>}
        />
      )}

      {open === 'delete' && (
        <ConfirmDialog
          title="Eliminar cuenta y datos" confirmLabel="Eliminar para siempre" busyLabel="Eliminando…"
          confirmDisabled={!matches} busy={busy} error={error} onConfirm={() => void remove()} onClose={close}
          description={<>Se borrarán tu cuenta, tus proyectos, los juicios de tus expertos, tus mapas y tus enlaces. <b>Esta acción no se puede deshacer.</b></>}
        >
          <div className="confirm-field">
            <label className="lbl" htmlFor="del-acct">Para confirmar, escribe tu correo</label>
            <input id="del-acct" type="text" autoComplete="off" spellCheck={false} value={typed} placeholder={email}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && matches && !busy) void remove(); }} />
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
