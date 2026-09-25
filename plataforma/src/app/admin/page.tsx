import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Topbar from '@/components/Topbar';
import GeoAdmin from '@/components/GeoAdmin';
import type { AdminAhpRawProject, AdminStats, AdminUserActivity, Method, WeightingMethod } from '@/lib/types';
import { computeAhpConsistency, fmtDate, fmtLastLogin, sparklinePoints } from '@/lib/admin';

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
  const w = max > 0 ? (value / max) * 100 : 0;
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
      <svg viewBox="0 0 120 32" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const dias = (n: number | null) => (n == null ? '—' : `${n.toFixed(1)} días`);

/** Backoffice de solo lectura, solo para cuentas con profiles.role = 'admin' (ver admin_stats()/
 * admin_ahp_raw() en 20240101000009_admin_v2.sql, que amplía 20240101000007/000008). No aparece
 * en la navegación normal: quien no sea admin y llegue aquí (con o sin sesión) termina en
 * /dashboard, sin indicio de que esta ruta existe. A diferencia de la primera versión, ya NO es
 * "solo agregados": proyectos_abandonados/usuarios_historial/proyectos_historial identifican
 * individuos a propósito (aprobado explícitamente, ver README § Historial de cambios). */
export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  const [{ data, error }, { data: ahpRawData, error: ahpError }, { data: activityData, error: activityError }] = await Promise.all([
    supabase.rpc('admin_stats'),
    supabase.rpc('admin_ahp_raw'),
    supabase.rpc('admin_users_activity'),
  ]);
  if (error || !data) redirect('/dashboard');
  const s = data as AdminStats;
  // null si la migración 13 aún no está aplicada: la tabla cae al historial sin columna de acceso.
  const activity = activityError || !activityData ? null : (activityData as AdminUserActivity[]);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const activos7d = activity?.filter((u) => u.ultimo_acceso && new Date(u.ultimo_acceso).getTime() >= weekAgo).length;
  const ahp = computeAhpConsistency(ahpError || !ahpRawData ? [] : (ahpRawData as AdminAhpRawProject[]));

  const metodoCount = Object.fromEntries(s.metodos.map((m) => [m.metodo, m.total])) as Record<string, number>;
  const metodoMax = Math.max(1, ...METHODS.map((m) => metodoCount[m] ?? 0));
  const ponderacionCount = Object.fromEntries(s.ponderacion.map((p) => [p.metodo, p.total])) as Record<string, number>;
  const ponderacionMax = Math.max(1, ...WEIGHTS.map((w) => ponderacionCount[w] ?? 0));
  const filledByCount = Object.fromEntries(s.expertos_filled_by.map((f) => [f.quien, f.total])) as Record<string, number>;
  const embudoMax = Math.max(1, s.embudo_expertos.invitados);

  return (
    <div className="wrap">
      <Topbar badge="ADMIN" subtitle="Backoffice" loggedIn userEmail={user.email} showNav={false} />
      <div className="panel">
        <header>
          <h1 style={{ fontSize: 30 }}>Backoffice</h1>
          <p>Vista de toda la plataforma. La mayoría son agregados; unas pocas listas (proyectos
            abandonados, historiales) identifican individuos a propósito, para ser accionables.</p>
        </header>

        <div className="stat-group">
          <h2>Proyectos</h2>
          <div className="stat-grid">
            <div className="stat"><span className="n">{s.proyectos_total}</span><span className="l">Total</span></div>
            <div className="stat"><span className="n">{s.proyectos_publicos}</span><span className="l">Públicos</span></div>
            <div className="stat"><span className="n">{s.proyectos_privados}</span><span className="l">Privados</span></div>
          </div>
        </div>

        <div className="stat-group">
          <h2>Usuarios</h2>
          <div className="stat-grid">
            <div className="stat"><span className="n">{s.usuarios_total}</span><span className="l">Cuentas registradas</span></div>
            {activos7d != null && (
              <div className="stat"><span className="n">{activos7d}</span><span className="l">Con login en los últimos 7 días</span></div>
            )}
          </div>
        </div>

        <div className="stat-group">
          <h2>Expertos</h2>
          <div className="stat-grid">
            <div className="stat"><span className="n">{s.expertos_total}</span><span className="l">Total</span></div>
            <div className="stat"><span className="n">{s.expertos_pending}</span><span className="l">Pendientes</span></div>
            <div className="stat"><span className="n">{s.expertos_in_progress}</span><span className="l">En progreso</span></div>
            <div className="stat"><span className="n">{s.expertos_submitted}</span><span className="l">Enviados</span></div>
          </div>
        </div>

        <div className="stat-group">
          <h2>Contenido</h2>
          <div className="stat-grid">
            <div className="stat"><span className="n">{s.criterios_total}</span><span className="l">Criterios (suma)</span></div>
            <div className="stat"><span className="n">{s.alternativas_total}</span><span className="l">Alternativas (suma)</span></div>
            <div className="stat"><span className="n">{s.juicios_total}</span><span className="l">Juicios registrados</span></div>
          </div>
        </div>

        <div className="stat-group">
          <h2>Crecimiento (últimas 8 semanas)</h2>
          <div className="spark-grid">
            <Sparkline label="Usuarios nuevos" values={s.crecimiento_semanal.map((w) => w.usuarios)} />
            <Sparkline label="Proyectos nuevos" values={s.crecimiento_semanal.map((w) => w.proyectos)} />
            <Sparkline label="Juicios (altas/ediciones)" values={s.crecimiento_semanal.map((w) => w.juicios)} />
          </div>
        </div>

        <div className="stat-group">
          <h2>Qué método eligen</h2>
          <div className="card stack">
            {METHODS.map((m) => (
              <Bar key={m} label={METHOD_LABEL[m]} value={metodoCount[m] ?? 0} max={metodoMax} color={METHOD_COLOR[m]} />
            ))}
          </div>
        </div>

        <div className="stat-group">
          <h2>Qué ponderación eligen</h2>
          <div className="card stack">
            {WEIGHTS.map((w) => (
              <Bar key={w} label={WEIGHT_LABEL[w]} value={ponderacionCount[w] ?? 0} max={ponderacionMax} color={WEIGHT_COLOR[w]} />
            ))}
          </div>
        </div>

        <div className="stat-group">
          <h2>Flujo multi-experto</h2>
          <div className="card stack">
            <Split
              label="¿Quién llenó a cada experto?"
              segments={[
                { name: 'Experto invitado', value: filledByCount.expert ?? 0, color: 'var(--accent)' },
                { name: 'El propio dueño', value: filledByCount.owner ?? 0, color: 'var(--other)' },
              ]}
            />
          </div>
        </div>

        <div className="stat-group">
          <h2>Embudo de expertos</h2>
          <div className="card afunnel">
            <Bar label="Invitados" value={s.embudo_expertos.invitados} max={embudoMax} />
            <p className="afunnel-step">↓ en promedio {dias(s.embudo_expertos.avg_dias_invitado_a_empezar)} para empezar</p>
            <Bar label="Empezaron" value={s.embudo_expertos.empezaron} max={embudoMax} />
            <p className="afunnel-step">↓ en promedio {dias(s.embudo_expertos.avg_dias_empezar_a_enviar)} para enviar</p>
            <Bar label="Enviaron" value={s.embudo_expertos.enviaron} max={embudoMax} />
          </div>
        </div>

        <div className="stat-group">
          <h2>Consistencia de los juicios AHP</h2>
          <div className="card stack">
            <Split
              label={`${ahp.total_matrices} matrices evaluadas (cr < 0.10 = consistente)`}
              segments={[
                { name: 'Consistentes', value: ahp.total_matrices - ahp.inconsistentes, color: 'var(--pass)' },
                { name: 'Inconsistentes', value: ahp.inconsistentes, color: 'var(--warn)' },
              ]}
            />
            <p className="muted" style={{ fontSize: 13 }}>
              Calculado con la misma matemática de <code>ahp.ts</code> (eigenvector + cr {'<'} 0.10) que ya usa
              ExpertFlow.tsx en vivo — no una reimplementación en SQL.
            </p>
          </div>
        </div>

        <div className="stat-group">
          <h2>Proyectos abandonados</h2>
          <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>
            &gt;=14 días sin tocarse y ningún experto que haya enviado.
          </p>
          {s.proyectos_abandonados.length === 0 ? (
            <p className="muted">Ninguno ahora mismo.</p>
          ) : (
            <div className="tbl">
              <table>
                <thead><tr><th>Título</th><th>Dueño</th><th>Actualizado</th><th className="n">Expertos</th></tr></thead>
                <tbody>
                  {s.proyectos_abandonados.map((p) => (
                    <tr key={p.id}>
                      <td>{p.titulo}</td><td>{p.dueño_email}</td><td>{fmtDate(p.actualizado)}</td><td className="n">{p.expertos_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="stat-group">
          <h2>Salud técnica</h2>
          <div className="two-col">
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Rate limiter (picos, 24h)</h3>
              <div className="tbl">
                <table>
                  <thead><tr><th>Función</th><th className="n">Pico/min</th><th className="n">Límite</th><th>Estado</th></tr></thead>
                  <tbody>
                    {s.rate_limit_picos.map((r) => (
                      <tr key={r.funcion}>
                        <td>{r.funcion}</td><td className="n">{r.pico_por_minuto}</td><td className="n">{r.limite}</td>
                        <td><span className={`pill${r.cerca_del_limite ? ' warn' : ''}`}>{r.cerca_del_limite ? 'Cerca del límite' : 'OK'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Accesos recientes a este panel</h3>
              <div className="stack">
                {s.accesos_recientes.slice(0, 8).map((a, i) => (
                  <div key={i} className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>{a.email}</span><span className="muted mono">{fmtDate(a.fecha)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-group">
          <h2>Historiales</h2>
          <details>
            <summary>Usuarios registrados ({s.usuarios_historial.length})</summary>
            <div className="tbl" style={{ marginTop: 10 }}>
              <table>
                <thead><tr><th>Nombre</th><th>Email</th><th>Registrado</th>{activity && <th>Último login</th>}</tr></thead>
                <tbody>
                  {(activity ?? s.usuarios_historial).map((u, i) => (
                    <tr key={i}>
                      <td>{u.nombre || '—'}</td><td>{u.email}</td><td>{fmtDate(u.creado)}</td>
                      {activity && <td>{fmtLastLogin((u as AdminUserActivity).ultimo_acceso)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <details style={{ marginTop: 10 }}>
            <summary>Proyectos creados ({s.proyectos_historial.length})</summary>
            <div className="tbl" style={{ marginTop: 10 }}>
              <table>
                <thead><tr><th>Título</th><th>Dueño</th><th>Método</th><th>Visibilidad</th><th>Creado</th></tr></thead>
                <tbody>
                  {s.proyectos_historial.map((p) => (
                    <tr key={p.id}>
                      <td>{p.titulo}</td><td>{p.dueño_email}</td><td>{METHOD_LABEL[p.metodo] ?? p.metodo}</td>
                      <td>{p.publico ? 'Público' : 'Privado'}</td><td>{fmtDate(p.creado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>

        <GeoAdmin />
      </div>
    </div>
  );
}
