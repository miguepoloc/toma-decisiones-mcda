'use client';

/** Backoffice del Geovisor (solo admin; las funciones `admin_geo_*` validan el rol en la base):
 * topes globales y cuota editables (suben o bajan; bajar nunca borra nada), uso por usuario,
 * catálogo de paquetes y limpieza de archivos huérfanos. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { deleteCatalogPack, listCatalog, type CatalogRow } from '@/lib/geo/catalog';
import { BUCKET, removeLayers } from '@/lib/geo/store';
import { Num } from './GeoBits';

type Settings = { quota_mb: number; max_layers: number; max_pixels: number; public_max_kb: number };
type Usage = { user_id: string; email: string; name: string | null; used_bytes: number; layers: number; projects: number; quota_bytes: number; custom_mb: number | null };
type Orphan = { name: string; bytes: number };

const mb = (b: number) => (b / 1048576).toLocaleString('es-CO', { maximumFractionDigits: 1 });

export default function GeoAdmin({ client }: { client?: SupabaseClient } = {}) {
  const sb = useMemo(() => client ?? createClient(), [client]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [orphans, setOrphans] = useState<Orphan[]>([]);
  const [packs, setPacks] = useState<CatalogRow[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{ email: string; mb: number | null } | null>(null);
  const [ask, setAsk] = useState('');

  const load = useCallback(async () => {
    const [s, u, o, c] = await Promise.all([sb.rpc('admin_geo_settings'), sb.rpc('admin_geo_usage'), sb.rpc('admin_geo_orphans'), listCatalog(sb)]);
    if (s.data) setSettings(s.data as Settings);
    setUsage((u.data as Usage[]) ?? []); setOrphans((o.data as Orphan[]) ?? []); setPacks(c);
  }, [sb]);
  useEffect(() => { void load(); }, [load]);

  async function run(fn: () => Promise<string | void>) {
    setBusy(true); setMsg('');
    try { const m = await fn(); setMsg(m || 'Guardado.'); await load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }
  const rpc = async (name: string, args: Record<string, unknown>) => { const { error } = await sb.rpc(name, args); if (error) throw new Error(error.message); };

  if (!settings) return null;
  const orphanBytes = orphans.reduce((a, o) => a + o.bytes, 0);

  return (
    <div className="stat-group" id="geovisor">
      <h2>Mapas de aptitud (Geovisor)</h2>
      <p className="muted" style={{ maxWidth: '75ch', fontSize: 13.5 }}>
        La cuota se mide sobre los archivos reales guardados. Puedes subirla o bajarla cuando quieras: <b>bajarla no borra nada</b>, solo bloquea nuevas subidas a quien ya la superó.
      </p>

      <div className="card form">
        <h3 style={{ fontSize: 16 }}>Topes globales</h3>
        <div className="gv-admin-grid">
          {([['quota_mb', 'Cuota por usuario (MB)'], ['max_layers', 'Capas máximas por usuario'], ['max_pixels', 'Celdas máximas por mapa'], ['public_max_kb', 'Tamaño máximo publicado (KB)']] as const).map(([k, label]) => (
            <label key={k} className="gv-field"><span>{label}</span>
              <Num label={label} value={settings[k]} onChange={(n) => setSettings({ ...settings, [k]: Math.round(n) })} /></label>
          ))}
        </div>
        <div className="acts">
          <button type="button" className="btn primary" disabled={busy} onClick={() => run(() => rpc('admin_set_geo_settings', { p_quota_mb: settings.quota_mb, p_max_layers: settings.max_layers, p_max_pixels: settings.max_pixels, p_public_max_kb: settings.public_max_kb }))}>Guardar topes</button>
        </div>
        {msg && <p className="muted" role="status" style={{ fontSize: 13 }}>{msg}</p>}
      </div>

      <details open style={{ marginTop: 12 }}>
        <summary>Uso por usuario ({usage.length})</summary>
        <div className="tbl" style={{ marginTop: 10 }}>
          <table>
            <thead><tr><th>Usuario</th><th>Proyectos de mapa</th><th>Capas</th><th>Usado</th><th>Cuota</th><th /></tr></thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.name || '—'}<br /><span className="muted" style={{ fontSize: 12 }}>{u.email}</span></td>
                  <td>{u.projects}</td><td>{u.layers}</td>
                  <td>{mb(u.used_bytes)} MB{u.used_bytes > u.quota_bytes && <b style={{ color: 'var(--warn)', marginLeft: 6 }}>sobre la cuota</b>}</td>
                  <td>{edit?.email === u.email
                    ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <Num label="Cuota individual en MB" width={80} value={edit.mb ?? settings.quota_mb} onChange={(n) => setEdit({ email: u.email, mb: Math.round(n) })} /> MB
                        <button type="button" className="btn sm primary" disabled={busy} onClick={() => run(async () => { await rpc('admin_set_user_quota', { p_email: u.email, p_mb: edit.mb }); setEdit(null); })}>Guardar</button>
                        <button type="button" className="btn sm" onClick={() => setEdit(null)}>Cancelar</button>
                      </span>
                    : <>{mb(u.quota_bytes)} MB{u.custom_mb !== null ? ' (individual)' : ' (global)'}</>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {edit?.email !== u.email && <button type="button" className="btn sm" onClick={() => setEdit({ email: u.email, mb: u.custom_mb })}>Cambiar cuota</button>}
                    {u.custom_mb !== null && edit?.email !== u.email && <button type="button" className="btn sm" style={{ marginLeft: 6 }} disabled={busy} onClick={() => run(() => rpc('admin_set_user_quota', { p_email: u.email, p_mb: null }))}>Usar la global</button>}
                  </td>
                </tr>
              ))}
              {!usage.length && <tr><td colSpan={6} className="muted">Nadie ha creado mapas todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </details>

      <details open style={{ marginTop: 10 }}>
        <summary>Catálogo del curso ({packs.length})</summary>
        <p className="muted" style={{ fontSize: 13 }}>Los paquetes se crean desde un proyecto de mapa tuyo: Geovisor → Exportar → «Catálogo del curso». Aquí los activas, ocultas o borras.</p>
        <div className="tbl" style={{ marginTop: 10 }}>
          <table>
            <thead><tr><th>Paquete</th><th>Capas</th><th>Peso</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {packs.map((p) => {
                const layers = Object.values(p.definition.geo.layers);
                return (
                  <tr key={p.id}>
                    <td><b>{p.title}</b><br /><span className="muted mono" style={{ fontSize: 12 }}>{p.id}</span></td>
                    <td>{layers.length}</td><td>{mb(layers.reduce((a, l) => a + (l.bytes || 0), 0))} MB</td>
                    <td>{p.is_active ? 'Activo' : 'Oculto'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn sm" disabled={busy} onClick={() => run(async () => { const { error } = await sb.from('geo_packs').update({ is_active: !p.is_active }).eq('id', p.id); if (error) throw new Error(error.message); })}>{p.is_active ? 'Ocultar' : 'Activar'}</button>
                      <button type="button" className={'btn sm' + (ask === p.id ? ' danger' : '')} style={{ marginLeft: 6 }} disabled={busy}
                        onClick={() => (ask === p.id ? run(async () => { await deleteCatalogPack(sb, p); setAsk(''); }) : (setAsk(p.id), setTimeout(() => setAsk(''), 3500)))}>{ask === p.id ? '¿Seguro? Los proyectos que lo usan dejarán de cargar' : 'Borrar'}</button>
                    </td>
                  </tr>
                );
              })}
              {!packs.length && <tr><td colSpan={5} className="muted">Aún no has publicado paquetes.</td></tr>}
            </tbody>
          </table>
        </div>
      </details>

      <details style={{ marginTop: 10 }}>
        <summary>Archivos huérfanos ({orphans.length} · {mb(orphanBytes)} MB)</summary>
        <p className="muted" style={{ fontSize: 13 }}>Capas cuyo proyecto ya no existe (quedan si falló una limpieza). Solo se listan y borran estas; nunca las de un proyecto vivo.</p>
        <div className="acts">
          <button type="button" className="btn sm danger" disabled={busy || !orphans.length} onClick={() => run(async () => { await removeLayers(sb, orphans.map((o) => o.name)); return `Se borraron ${orphans.length} archivo(s) (bucket ${BUCKET}).`; })}>Borrar los {orphans.length} huérfanos</button>
        </div>
      </details>
    </div>
  );
}
