import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Topbar from '@/components/Topbar';
import GeoAdmin from '@/components/GeoAdmin';
import AdminTabs, { ADMIN_TABS, type AdminTab } from '@/components/admin/AdminTabs';
import AdminUsers from '@/components/admin/AdminUsers';
import type { AccountAction, AdminAccountEvent, AdminAhpRawProject, AdminStats, AdminUserActivity, Method, WeightingMethod } from '@/lib/types';
import { ago, collapseAccesses, computeAhpConsistency, fmtDate, sparklinePoints, type UserFilter } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const METHODS: Method[] = ['ahp', 'topsis', 'vikor', 'electre', 'promethee', 'saw', 'fuzzy_topsis'];
const METHOD_LABEL: Record<Method, string> = {
  ahp: 'AHP', topsis: 'TOPSIS', vikor: 'VIKOR', electre: 'ELECTRE',
  promethee: 'PROMETHEE', saw: 'SAW', fuzzy_topsis: 'Fuzzy TOPSIS',
};
const METHOD_COLOR: Record<Method, string> = {
  ahp: 'var(--m-ahp)', topsis: 'var(--m-topsis)', vikor: 'var(--m-vikor)', electre: 'var(--m-electre)',
  promethee: 'var(--m-promethee)', saw: 'var(--m-saw)', fuzzy_topsis: 'var(--m-fuzzy)',
};
const WEIGHTS: WeightingMethod[] = ['ahp', 'critic', 'entropy'];
const WEIGHT_LABEL: Record<WeightingMethod, string> = { ahp: 'AHP', critic: 'CRITIC', entropy: 'Entropía' };
const WEIGHT_COLOR: Record<WeightingMethod, string> = { ahp: 'var(--s1)', critic: 'var(--s2)', entropy: 'var(--s3)' };

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  // Tope de 88 %: la etiqueta con el valor va a la derecha de la barra y, al 100 %, se saldría de la tarjeta.
  const w = max > 0 ? (value / max) * 88 : 0;
  return (
    <div className="wbar">
      <span className="nm">{label}</span>
      <div className="track">
        <div className="fill" style={{ width: `${w}%`, ...(color ? { background: color } : {}) }} />
        <span className="val" style={{ left: `${w}%` }}>{value}</span>
      </div>
    </div>
  );
}

function Split({ label, segments }: { label: string; segments: { value: number; color: string; name: string }[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  return (
    <div className="srow">
      <span className="nm">{label}</span>
      <div className="strack">
        <div className="sbar" style={{ width: '100%' }}>
          {segments.map((s) => (
            <i key={s.name} style={{ background: s.color, width: total ? `${(s.value / total) * 100}%` : `${100 / segments.length}%` }}
               title={`${s.name}: ${s.value}`} />
          ))}
        </div>
        <span className="sval">{total}</span>
      </div>
      <div className="lg" style={{ marginTop: 4 }}>
        {segments.map((s) => (
          <span key={s.name}><i style={{ background: s.color }} />{s.name} ({s.value}{total ? ` · ${Math.round((s.value / total) * 100)}%` : ''})</span>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ label, values }: { label: string; values: number[] }) {
  const points = sparklinePoints(values);
  const last = values[values.length - 1] ?? 0;
  const first = values[0] ?? 0;
  const delta = last - first;
  return (
    <div className="spark">
      <span className="l">{label}</span>
      <span className="n">{last}<small>{delta > 0 ? `+${delta}` : delta} vs. hace 8 sem.</small></span>
      <svg viewBox="0 0 120 32" preserveAspectRatio="none" role="img" aria-label={`${label}: de ${first} a ${last} en 8 semanas`}>
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const dias = (n: number | null) => (n == null ? '—' : `${n.toFixed(1)} días`);

const ACTION_LABEL: Record<AccountAction, string> = {
  suspend: 'Suspendida', reactivate: 'Reactivada', pause: 'Desactivada por su dueño', resume: 'Reactivada al iniciar sesión',
  delete: 'Eliminada', confirm_email: 'Correo confirmado por un admin',
};

function Table({ caption, children, className }: { caption: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={'tbl' + (className ? ' ' + className : '')}>
      <table><caption className="sr-only">{caption}</caption>{children}</table>
    </div>
  );
}

/** Backoffice, solo para cuentas con profiles.role = 'admin'. Cada sección es una pestaña con su propia URL
 * (`/admin?tab=usuarios`). No aparece en la navegación normal: quien no sea admin y llegue aquí (con o sin
 * sesión) termina en /dashboard, sin indicio de que la ruta existe. La seguridad NO está aquí: cada función
 * (`admin_*`) comprueba el rol en la base, esta página solo pinta lo que ellas devuelven.
 * Ya NO es «solo agregados»: usuarios, proyectos abandonados y los historiales identifican individuos a
 * propósito (aprobado explícitamente, ver README § Historial de cambios). */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; filtro?: string }> }) {
  const sp = await searchParams;
  const tab: AdminTab = ADMIN_TABS.some((t) => t.id === sp.tab) ? (sp.tab as AdminTab) : 'resumen';
  const filtro: UserFilter = (['suspendidas', 'pausadas', 'sin_confirmar', 'sin_login', 'inactivos'] as const).find((f) => f === sp.filtro) ?? 'todos';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  // admin_users_activity no registra accesos y siempre hace falta (insignias de las pestañas): es también la
  // puerta de entrada. admin_stats SÍ registra un acceso cada vez, así que solo se llama en las pestañas que lo usan.
  const needStats = tab === 'resumen' || tab === 'proyectos' || tab === 'seguridad';
  const [usersRes, statsRes, ahpRes, eventsRes] = await Promise.all([
    supabase.rpc('admin_users_activity'),
    needStats ? supabase.rpc('admin_stats') : Promise.resolve({ data: null, error: null }),
    tab === 'proyectos' ? supabase.rpc('admin_ahp_raw') : Promise.resolve({ data: null, error: null }),
    tab === 'seguridad' ? supabase.rpc('admin_account_events', { p_limit: 50 }) : Promise.resolve({ data: null, error: null }),
  ]);
  if (usersRes.error || !usersRes.data) redirect('/dashboard');
  if (needStats && (statsRes.error || !statsRes.data)) redirect('/dashboard');

  const users = usersRes.data as AdminUserActivity[];
  const s = statsRes.data as AdminStats | null;
  const events = (eventsRes.data ?? []) as AdminAccountEvent[];
  const ahp = computeAhpConsistency(ahpRes.error || !ahpRes.data ? [] : (ahpRes.data as AdminAhpRawProject[]));

  const now = Date.now();
  const suspendidas = users.filter((u) => u.estado === 'suspendida').length;
  const activos7d = users.filter((u) => u.ultimo_acceso && now - new Date(u.ultimo_acceso).getTime() < 7 * 86_400_000).length;
  const sinLogin = users.filter((u) => !u.ultimo_acceso).length;

  return (
    <div className="wrap">
      <Topbar badge="ADMIN" subtitle="Backoffice" loggedIn userEmail={user.email} showNav={false} />
      <div className="panel">
        <header>
          <h1 style={{ fontSize: 30 }}>Backoffice</h1>
          <p>Vista de toda la plataforma. Las cifras son agregados; usuarios, historiales y proyectos abandonados
            identifican individuos a propósito, para poder actuar.</p>
        </header>

        <AdminTabs active={tab} badges={{ usuarios: { n: suspendidas, label: 'cuentas suspendidas' } }} />

        {tab === 'resumen' && s && <Resumen s={s} activos7d={activos7d} sinLogin={sinLogin} suspendidas={suspendidas} totalUsers={users.length} />}
        {tab === 'usuarios' && (
          <section className="stat-group" aria-labelledby="h-usuarios">
            <h2 id="h-usuarios">Usuarios</h2>
            <p className="muted" style={{ maxWidth: '75ch', fontSize: 13.5 }}>
              «Último login» es la última vez que la persona <b>inició sesión</b>, no su última actividad: quien mantiene la
              sesión abierta días puede verse antiguo aunque use la plataforma.
            </p>
            <AdminUsers users={users} currentUserId={user.id} initialFilter={filtro} />
          </section>
        )}
        {tab === 'proyectos' && s && <Proyectos s={s} ahp={ahp} />}
        {tab === 'seguridad' && s && <Seguridad s={s} events={events} suspendidas={suspendidas} />}
        {tab === 'mapas' && <GeoAdmin />}
      </div>
    </div>
  );
}

function Resumen({ s, activos7d, sinLogin, suspendidas, totalUsers }: { s: AdminStats; activos7d: number; sinLogin: number; suspendidas: number; totalUsers: number }) {
  const metodoCount = Object.fromEntries(s.metodos.map((m) => [m.metodo, m.total])) as Record<string, number>;
  const metodoMax = Math.max(1, ...METHODS.map((m) => metodoCount[m] ?? 0));
  const ponderacionCount = Object.fromEntries(s.ponderacion.map((p) => [p.metodo, p.total])) as Record<string, number>;
  const ponderacionMax = Math.max(1, ...WEIGHTS.map((w) => ponderacionCount[w] ?? 0));
  const cerca = s.rate_limit_picos.filter((r) => r.cerca_del_limite).length;

  // Lo que pide una acción, con enlace directo. Si no hay nada, se dice: «todo en orden» también es información.
  const atencion: { n: number; texto: string; href: string }[] = [
    { n: suspendidas, texto: suspendidas === 1 ? 'cuenta suspendida' : 'cuentas suspendidas', href: '/admin?tab=usuarios&filtro=suspendidas' },
    { n: s.proyectos_abandonados.length, texto: `${s.proyectos_abandonados.length === 1 ? 'proyecto abandonado' : 'proyectos abandonados'} (+14 días sin tocar, sin expertos que hayan enviado)`, href: '/admin?tab=proyectos' },
    { n: cerca, texto: `${cerca === 1 ? 'función' : 'funciones'} cerca del límite de frecuencia`, href: '/admin?tab=seguridad' },
  ].filter((a) => a.n > 0);

  return (
    <>
      <section className="stat-group" aria-labelledby="h-atencion">
        <h2 id="h-atencion">Atención</h2>
        {atencion.length === 0 ? (
          <div className="card ok-card"><p><b>Todo en orden.</b> <span className="muted">Sin cuentas suspendidas, proyectos abandonados ni límites de frecuencia cerca de saturarse.</span></p></div>
        ) : (
          <ul className="attn card">
            {atencion.map((a) => (
              <li key={a.href}><a href={a.href}><b className="mono">{a.n}</b> {a.texto} <span aria-hidden="true">→</span></a></li>
            ))}
          </ul>
        )}
      </section>

      <section className="stat-group" aria-labelledby="h-cifras">
        <h2 id="h-cifras">Cifras</h2>
        <div className="stat-grid">
          <div className="stat"><span className="n">{totalUsers}</span><span className="l">Cuentas</span></div>
          <div className="stat"><span className="n">{activos7d}</span><span className="l">Con login en 7 días</span>{sinLogin > 0 && <span className="sub">{sinLogin} nunca han entrado</span>}</div>
          <div className="stat"><span className="n">{s.proyectos_total}</span><span className="l">Proyectos</span><span className="sub">{s.proyectos_publicos} públicos · {s.proyectos_privados} privados</span></div>
          <div className="stat"><span className="n">{s.expertos_total}</span><span className="l">Expertos</span><span className="sub">{s.expertos_submitted} ya enviaron</span></div>
          <div className="stat"><span className="n">{s.juicios_total}</span><span className="l">Juicios registrados</span></div>
        </div>
      </section>

      <section className="stat-group" aria-labelledby="h-crec">
        <h2 id="h-crec">Crecimiento (últimas 8 semanas)</h2>
        <div className="spark-grid">
          <Sparkline label="Usuarios nuevos" values={s.crecimiento_semanal.map((w) => w.usuarios)} />
          <Sparkline label="Proyectos nuevos" values={s.crecimiento_semanal.map((w) => w.proyectos)} />
          <Sparkline label="Juicios (altas/ediciones)" values={s.crecimiento_semanal.map((w) => w.juicios)} />
        </div>
      </section>

      <div className="two-col">
        <section className="stat-group" aria-labelledby="h-metodo">
          <h2 id="h-metodo">Qué método eligen</h2>
          <div className="card stack">
            {METHODS.map((m) => <Bar key={m} label={METHOD_LABEL[m]} value={metodoCount[m] ?? 0} max={metodoMax} color={METHOD_COLOR[m]} />)}
          </div>
        </section>
        <section className="stat-group" aria-labelledby="h-pond">
          <h2 id="h-pond">Qué ponderación eligen</h2>
          <div className="card stack">
            {WEIGHTS.map((w) => <Bar key={w} label={WEIGHT_LABEL[w]} value={ponderacionCount[w] ?? 0} max={ponderacionMax} color={WEIGHT_COLOR[w]} />)}
          </div>
        </section>
      </div>
    </>
  );
}

function Proyectos({ s, ahp }: { s: AdminStats; ahp: ReturnType<typeof computeAhpConsistency> }) {
  const filledByCount = Object.fromEntries(s.expertos_filled_by.map((f) => [f.quien, f.total])) as Record<string, number>;
  const embudoMax = Math.max(1, s.embudo_expertos.invitados);
  return (
    <>
      <section className="stat-group" aria-labelledby="h-cont">
        <h2 id="h-cont">Contenido</h2>
        <div className="stat-grid">
          <div className="stat"><span className="n">{s.proyectos_total}</span><span className="l">Proyectos</span><span className="sub">{s.proyectos_publicos} públicos · {s.proyectos_privados} privados</span></div>
          <div className="stat"><span className="n">{s.criterios_total}</span><span className="l">Criterios (suma)</span></div>
          <div className="stat"><span className="n">{s.alternativas_total}</span><span className="l">Alternativas (suma)</span></div>
          <div className="stat"><span className="n">{s.expertos_total}</span><span className="l">Expertos</span><span className="sub">{s.expertos_pending} pendientes · {s.expertos_in_progress} en progreso · {s.expertos_submitted} enviados</span></div>
        </div>
      </section>

      <section className="stat-group" aria-labelledby="h-abandon">
        <h2 id="h-abandon">Proyectos abandonados</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>14 días o más sin tocarse y ningún experto que haya enviado.</p>
        {s.proyectos_abandonados.length === 0 ? (
          <p className="muted">Ninguno ahora mismo.</p>
        ) : (
          <Table caption="Proyectos abandonados">
            <thead><tr><th scope="col">Título</th><th scope="col">Dueño</th><th scope="col">Actualizado</th><th scope="col" className="n">Expertos</th></tr></thead>
            <tbody>
              {s.proyectos_abandonados.map((p) => (
                <tr key={p.id}><td>{p.titulo}</td><td>{p.dueño_email}</td><td className="mono">{fmtDate(p.actualizado)}</td><td className="n">{p.expertos_total}</td></tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <div className="two-col">
        <section className="stat-group" aria-labelledby="h-embudo">
          <h2 id="h-embudo">Embudo de expertos</h2>
          <div className="card afunnel">
            <Bar label="Invitados" value={s.embudo_expertos.invitados} max={embudoMax} />
            <p className="afunnel-step">↓ en promedio {dias(s.embudo_expertos.avg_dias_invitado_a_empezar)} para empezar</p>
            <Bar label="Empezaron" value={s.embudo_expertos.empezaron} max={embudoMax} />
            <p className="afunnel-step">↓ en promedio {dias(s.embudo_expertos.avg_dias_empezar_a_enviar)} para enviar</p>
            <Bar label="Enviaron" value={s.embudo_expertos.enviaron} max={embudoMax} />
          </div>
        </section>
        <section className="stat-group" aria-labelledby="h-flujo">
          <h2 id="h-flujo">Flujo multi-experto</h2>
          <div className="card stack">
            <Split
              label="¿Quién llenó a cada experto?"
              segments={[
                { name: 'Experto invitado', value: filledByCount.expert ?? 0, color: 'var(--accent)' },
                { name: 'El propio dueño', value: filledByCount.owner ?? 0, color: 'var(--other)' },
              ]}
            />
            <Split
              label={`Consistencia AHP: ${ahp.total_matrices} matrices (CR < 0.10 = consistente)`}
              segments={[
                { name: 'Consistentes', value: ahp.total_matrices - ahp.inconsistentes, color: 'var(--pass)' },
                { name: 'Inconsistentes', value: ahp.inconsistentes, color: 'var(--warn)' },
              ]}
            />
            <p className="muted" style={{ fontSize: 12.5 }}>La consistencia usa la misma matemática de <code>ahp.ts</code> (eigenvector + CR) que ya corre en vivo para los expertos, no una reimplementación en SQL.</p>
          </div>
        </section>
      </div>

      <section className="stat-group" aria-labelledby="h-hist">
        <h2 id="h-hist">Proyectos creados ({s.proyectos_historial.length})</h2>
        <Table caption="Todos los proyectos creados, del más reciente al más antiguo" className="scroll-y">
          <thead><tr><th scope="col">Título</th><th scope="col">Dueño</th><th scope="col">Método</th><th scope="col">Visibilidad</th><th scope="col">Creado</th></tr></thead>
          <tbody>
            {s.proyectos_historial.map((p) => (
              <tr key={p.id}>
                <td>{p.titulo}</td><td>{p.dueño_email}</td><td>{METHOD_LABEL[p.metodo] ?? p.metodo}</td>
                <td>{p.publico ? 'Público' : 'Privado'}</td><td className="mono">{fmtDate(p.creado)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
    </>
  );
}

function Seguridad({ s, events, suspendidas }: { s: AdminStats; events: AdminAccountEvent[]; suspendidas: number }) {
  const accesos = collapseAccesses(s.accesos_recientes);
  return (
    <>
      <section className="stat-group" aria-labelledby="h-acciones">
        <h2 id="h-acciones">Acciones sobre cuentas</h2>
        <p className="muted" style={{ maxWidth: '75ch', fontSize: 13.5 }}>
          Registro de suspensiones, reactivaciones, confirmaciones de correo, desactivaciones y eliminaciones{suspendidas > 0 ? ` (${suspendidas} ${suspendidas === 1 ? 'cuenta suspendida' : 'cuentas suspendidas'} ahora)` : ''}.
          Para suspender o reactivar, ve a <a href="/admin?tab=usuarios">Usuarios</a>.
        </p>
        {events.length === 0 ? (
          <p className="muted">Todavía no hay acciones registradas.</p>
        ) : (
          <Table caption="Últimas acciones sobre cuentas">
            <thead><tr><th scope="col">Fecha</th><th scope="col">Acción</th><th scope="col">Cuenta</th><th scope="col">Por</th><th scope="col">Motivo</th></tr></thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i}>
                  <td className="mono">{fmtDate(e.fecha)} <span className="muted">{e.fecha.slice(11, 16)}</span></td>
                  <td><span className={'pill' + (e.accion === 'suspend' || (e.accion === 'delete' && !e.autoservicio) ? ' warn' : e.accion === 'reactivate' || e.accion === 'resume' || e.accion === 'confirm_email' ? '' : ' neutral')}>{ACTION_LABEL[e.accion]}{e.accion === 'delete' ? (e.autoservicio ? ' por su dueño' : ' por un admin') : ''}</span></td>
                  <td>{e.usuario_email ?? <span className="muted">cuenta eliminada</span>}</td>
                  <td>{e.autoservicio ? <span className="muted">el propio usuario</span> : (e.actor_email ?? '—')}</td>
                  <td>{e.motivo ?? <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="banner info" style={{ fontSize: 13.5 }}>
          <span><b>Lo que esto no cubre:</b> suspender bloquea la <i>cuenta</i>, no a la persona; podría registrarse con otro correo.
            Para frenar registros masivos activa CAPTCHA en Supabase → Authentication → Attack Protection. Los enlaces anónimos
            (expertos y vista pública) ya tienen límite de frecuencia por enlace.</span>
        </div>
      </section>

      <div className="two-col">
        <section className="stat-group" aria-labelledby="h-rate">
          <h2 id="h-rate">Límite de frecuencia (picos, 24 h)</h2>
          <div className="card">
            <Table caption="Picos por minuto de las funciones con límite de frecuencia">
              <thead><tr><th scope="col">Función</th><th scope="col" className="n">Pico/min</th><th scope="col" className="n">Límite</th><th scope="col">Estado</th></tr></thead>
              <tbody>
                {s.rate_limit_picos.length === 0 && <tr><td colSpan={4} className="muted">Sin actividad en las últimas 24 h.</td></tr>}
                {s.rate_limit_picos.map((r) => (
                  <tr key={r.funcion}>
                    <td>{r.funcion}</td><td className="n">{r.pico_por_minuto}</td><td className="n">{r.limite}</td>
                    <td><span className={`pill${r.cerca_del_limite ? ' warn' : ''}`}>{r.cerca_del_limite ? 'Cerca del límite' : 'OK'}</span></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </section>
        <section className="stat-group" aria-labelledby="h-acc">
          <h2 id="h-acc">Accesos recientes al backoffice</h2>
          <div className="card">
            <ul className="acc-list">
              {accesos.map((a, i) => (
                <li key={i}><span>{a.email}{a.veces > 1 && <span className="muted"> · {a.veces} visitas</span>}</span><span className="muted mono">{fmtDate(a.fecha)} {a.fecha.slice(11, 16)} · {ago(a.fecha)}</span></li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
