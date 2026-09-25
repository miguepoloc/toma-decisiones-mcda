'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ago, countByFilter, filterUsers, fmtDate, INACTIVE_DAYS, sortUsers, type UserFilter, type UserSort, type UserSortKey } from '@/lib/admin';
import type { AccountState, AdminUserActivity } from '@/lib/types';
import ConfirmDialog from '../ConfirmDialog';

const FILTERS: { id: UserFilter; label: string; hint: string }[] = [
  { id: 'todos', label: 'Todos', hint: 'Todas las cuentas' },
  { id: 'suspendidas', label: 'Suspendidas', hint: 'Bloqueadas por un admin' },
  { id: 'pausadas', label: 'Desactivadas', hint: 'Pausadas por su dueño; vuelven al iniciar sesión' },
  { id: 'sin_confirmar', label: 'Correo sin confirmar', hint: 'No abrieron el enlace de confirmación del correo: no pueden entrar hasta que lo confirmes' },
  { id: 'sin_login', label: 'Nunca entraron', hint: 'Cuenta creada, sin ningún inicio de sesión' },
  { id: 'inactivos', label: `Inactivas +${INACTIVE_DAYS} d`, hint: `Sin iniciar sesión hace más de ${INACTIVE_DAYS} días` },
];

/** Icono + texto (no solo color) para que el estado se entienda sin distinguir colores. */
function StatePill({ estado }: { estado: AccountState }) {
  const cfg = {
    activa: { cls: '', label: 'Activa', d: 'M20 6 9 17l-5-5' },
    pausada: { cls: ' neutral', label: 'Desactivada', d: 'M10 5v14M14 5v14' },
    suspendida: { cls: ' warn', label: 'Suspendida', d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.7 5.7l12.6 12.6' },
  }[estado];
  return (
    <span className={'pill st' + cfg.cls}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={cfg.d} /></svg>
      {cfg.label}
    </span>
  );
}

function SortTh({ k, sort, onSort, children }: { k: UserSortKey; sort: UserSort; onSort: (k: UserSortKey) => void; children: string }) {
  const active = sort.key === k;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="thsort" onClick={() => onSort(k)}>
        {children}<span aria-hidden="true">{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
      </button>
    </th>
  );
}

type DialogKind = 'suspend' | 'reactivate' | 'confirm' | 'delete';

/** Tabla de usuarios del backoffice: búsqueda, filtros por estado, orden y acciones por cuenta: Suspender /
 * Reactivar (`admin_set_user_status`), Confirmar correo (`admin_confirm_user_email`, para quien no recibió el
 * mensaje) y Eliminar (`admin_delete_user`). La base valida que seas admin, que no sea tu propia cuenta ni otro
 * admin, y exige el motivo al suspender/eliminar. Los datos vienen del servidor; tras cada acción se refresca. */
export default function AdminUsers({ users, currentUserId, initialFilter = 'todos' }: { users: AdminUserActivity[]; currentUserId: string; initialFilter?: UserFilter }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>(initialFilter);
  const [sort, setSort] = useState<UserSort>({ key: 'ultimo_acceso', dir: 'desc' });
  const [dialog, setDialog] = useState<{ kind: DialogKind; user: AdminUserActivity } | null>(null);
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [now] = useState(() => Date.now());
  const counts = useMemo(() => countByFilter(users, now), [users, now]);
  const rows = useMemo(() => sortUsers(filterUsers(users, query, filter, now), sort), [users, query, filter, sort, now]);

  const onSort = (key: UserSortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'nombre' ? 'asc' : 'desc' }));
  const closeDialog = () => { if (busy) return; setDialog(null); setReason(''); setTyped(''); setError(''); };
  const open = (kind: DialogKind, user: AdminUserActivity) => { setNotice(''); setDialog({ kind, user }); };

  async function run() {
    if (!dialog) return;
    const { kind, user: u } = dialog;
    setBusy(true); setError('');
    const sb = createClient();
    const { error: e } = kind === 'confirm'
      ? await sb.rpc('admin_confirm_user_email', { p_user: u.id })
      : kind === 'delete'
        ? await sb.rpc('admin_delete_user', { p_user: u.id, p_reason: reason })
        : await sb.rpc('admin_set_user_status', { p_user: u.id, p_action: kind, p_reason: kind === 'suspend' ? reason : null });
    if (e) { setError(e.message); setBusy(false); return; }
    setNotice({
      suspend: `Suspendiste la cuenta de ${u.email}. Ya no puede iniciar sesión y sus enlaces dejaron de funcionar.`,
      reactivate: `Reactivaste la cuenta de ${u.email}.`,
      confirm: `Confirmaste el correo de ${u.email}: ya puede iniciar sesión con su contraseña.`,
      delete: `Eliminaste la cuenta de ${u.email}. Si subió mapas, sus archivos quedaron huérfanos: límpialos en la pestaña Mapas.`,
    }[kind]);
    setBusy(false); setDialog(null); setReason(''); setTyped('');
    router.refresh();
  }

  const reasonOk = reason.trim().length >= 3;
  const typedOk = dialog?.kind === 'delete' && typed.trim().toLowerCase() === dialog.user.email.toLowerCase();

  return (
    <div className="stack">
      <div className="ufilters">
        <div className="usearch">
          <label htmlFor="u-search" className="sr-only">Buscar por nombre o correo</label>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input id="u-search" type="search" placeholder="Buscar por nombre o correo" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        </div>
        <div className="seg" role="group" aria-label="Filtrar por estado">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} title={f.hint} onClick={() => setFilter(f.id)}>
              {f.label} <span className="mono">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="muted" style={{ fontSize: 13 }} role="status" aria-live="polite">
        {notice ? <b style={{ color: 'var(--ink)' }}>{notice}</b> : `Mostrando ${rows.length} de ${users.length} cuentas.`}
      </p>

      {rows.length === 0 ? (
        <div className="card empty">
          <p><b>Ninguna cuenta coincide.</b></p>
          <p className="muted">{query ? 'Prueba con otro nombre o correo.' : 'No hay cuentas en este filtro.'}</p>
          {(query || filter !== 'todos') && <button type="button" className="btn sm" onClick={() => { setQuery(''); setFilter('todos'); }}>Quitar búsqueda y filtros</button>}
        </div>
      ) : (
        <div className="tbl utable-wrap">
          <table className="utable">
            <caption className="sr-only">Cuentas de la plataforma, con estado, último inicio de sesión y acciones</caption>
            <thead>
              <tr>
                <SortTh k="nombre" sort={sort} onSort={onSort}>Cuenta</SortTh>
                <th scope="col">Estado</th>
                <SortTh k="creado" sort={sort} onSort={onSort}>Registrada</SortTh>
                <SortTh k="ultimo_acceso" sort={sort} onSort={onSort}>Último login</SortTh>
                <th scope="col" className="n">Proyectos</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const self = u.id === currentUserId;
                return (
                  <tr key={u.id} className={u.estado === 'suspendida' ? 'row-susp' : undefined}>
                    <th scope="row" className="ucell">
                      <span className="uname">{u.nombre || u.email}{u.rol === 'admin' && <span className="pill neutral" style={{ marginLeft: 8 }}>Admin</span>}{self && <span className="muted"> (tú)</span>}</span>
                      {u.nombre && <span className="mono muted uemail">{u.email}</span>}
                    </th>
                    <td>
                      <StatePill estado={u.estado} />
                      {u.estado !== 'activa' && <span className="muted since">desde {fmtDate((u.suspendida_el ?? u.pausada_el) as string)}</span>}
                      {!u.correo_confirmado && <span className="pill warn unconf" title="No abrió el enlace de confirmación del correo">Correo sin confirmar</span>}
                    </td>
                    <td className="mono">{fmtDate(u.creado)}</td>
                    <td>
                      {u.ultimo_acceso
                        ? <><span>{ago(u.ultimo_acceso)}</span><span className="mono muted since">{fmtDate(u.ultimo_acceso)}</span></>
                        : <span className="muted">Nunca ha entrado</span>}
                    </td>
                    <td className="n">{u.proyectos}</td>
                    <td className="uact">
                      {self || u.rol === 'admin'
                        ? <span className="muted" style={{ fontSize: 12 }}>{self ? '—' : 'Cuenta admin'}</span>
                        : (
                          <div className="uact-btns">
                            {!u.correo_confirmado && <button type="button" className="btn sm primary" onClick={() => open('confirm', u)}>Confirmar correo</button>}
                            {u.estado === 'suspendida'
                              ? <button type="button" className="btn sm" onClick={() => open('reactivate', u)}>Reactivar</button>
                              : <button type="button" className="btn sm danger" onClick={() => open('suspend', u)}>Suspender</button>}
                            <button type="button" className="btn sm" onClick={() => open('delete', u)} aria-label={`Eliminar la cuenta de ${u.email}`}>Eliminar…</button>
                          </div>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog?.kind === 'suspend' && (
        <ConfirmDialog
          title={`Suspender a ${dialog.user.nombre || dialog.user.email}`} confirmLabel="Suspender cuenta" busyLabel="Suspendiendo…"
          confirmDisabled={!reasonOk} busy={busy} error={error} onConfirm={() => void run()} onClose={closeDialog}
          description={
            <>
              <p>Al suspender <b className="mono">{dialog.user.email}</b>:</p>
              <ul className="modal-list">
                <li>No podrá iniciar sesión y su sesión actual deja de funcionar al instante.</li>
                <li>Sus enlaces de expertos y los públicos dejan de responder.</li>
                <li>Sus proyectos y archivos <b>se conservan</b>. Puedes reactivarla cuando quieras.</li>
              </ul>
              <p>Suspender bloquea la cuenta, no a la persona: podría registrarse con otro correo.</p>
            </>
          }
        >
          <div className="confirm-field">
            <label className="lbl" htmlFor="susp-reason">Motivo (queda en el registro, no lo ve el usuario)</label>
            <textarea id="susp-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. Subida masiva de archivos que no son del curso" aria-describedby="susp-count" />
            <span id="susp-count" className="muted" style={{ fontSize: 12 }}>{reason.trim().length}/500{!reasonOk && ' · mínimo 3 caracteres'}</span>
          </div>
        </ConfirmDialog>
      )}

      {dialog?.kind === 'confirm' && (
        <ConfirmDialog
          title={`Confirmar el correo de ${dialog.user.nombre || dialog.user.email}`} tone="neutral" confirmLabel="Confirmar correo" busyLabel="Confirmando…"
          busy={busy} error={error} onConfirm={() => void run()} onClose={closeDialog}
          description={
            <>
              <p>Marcarás <b className="mono">{dialog.user.email}</b> como confirmado, sin que tenga que abrir el enlace del mensaje. Podrá iniciar sesión de inmediato con la contraseña que eligió.</p>
              <p>Hazlo solo si te consta que ese correo es de la persona: confirmarlo a ciegas le da acceso a quien lo registró.</p>
            </>
          }
        />
      )}

      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title={`Eliminar la cuenta de ${dialog.user.nombre || dialog.user.email}`} confirmLabel="Eliminar para siempre" busyLabel="Eliminando…"
          confirmDisabled={!reasonOk || !typedOk} busy={busy} error={error} onConfirm={() => void run()} onClose={closeDialog}
          description={
            <>
              <p>Se borrarán para siempre la cuenta <b className="mono">{dialog.user.email}</b>, sus {dialog.user.proyectos === 1 ? 'proyecto' : `${dialog.user.proyectos} proyectos`}, los juicios de sus expertos y sus enlaces. <b>No se puede deshacer.</b></p>
              <p>Sus archivos de mapas quedan huérfanos en el almacenamiento: límpialos después en la pestaña Mapas. Si solo quieres frenarla, mejor <b>suspéndela</b>: se conserva todo y se puede revertir.</p>
            </>
          }
        >
          <div className="confirm-field stack">
            <label className="lbl" htmlFor="del-reason">Motivo (queda en el registro con su correo)</label>
            <textarea id="del-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. Cuenta duplicada / spam" />
            <label className="lbl" htmlFor="del-typed">Para confirmar, escribe su correo</label>
            <input id="del-typed" type="text" autoComplete="off" spellCheck={false} value={typed} placeholder={dialog.user.email} onChange={(e) => setTyped(e.target.value)} />
          </div>
        </ConfirmDialog>
      )}

      {dialog?.kind === 'reactivate' && (
        <ConfirmDialog
          title={`Reactivar a ${dialog.user.nombre || dialog.user.email}`} tone="neutral" confirmLabel="Reactivar cuenta" busyLabel="Reactivando…"
          busy={busy} error={error} onConfirm={() => void run()} onClose={closeDialog}
          description={<>Podrá iniciar sesión otra vez y sus enlaces de expertos y públicos vuelven a funcionar tal como estaban.</>}
        />
      )}
    </div>
  );
}
