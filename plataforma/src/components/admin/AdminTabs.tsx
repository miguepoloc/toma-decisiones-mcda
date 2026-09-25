import Link from 'next/link';

export type AdminTab = 'resumen' | 'usuarios' | 'proyectos' | 'seguridad' | 'mapas';

export const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'proyectos', label: 'Proyectos' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'mapas', label: 'Mapas' },
];

/** Navegación del backoffice. Son enlaces reales (`?tab=…`), no estado del cliente: cada sección tiene su
 * URL (se puede compartir y el botón «atrás» funciona) y la página se renderiza en el servidor. `badges`
 * marca lo que pide atención (p. ej. cuentas suspendidas) con número Y texto accesible, no solo color. */
export default function AdminTabs({ active, badges = {} }: { active: AdminTab; badges?: Partial<Record<AdminTab, { n: number; label: string }>> }) {
  return (
    <nav className="admin-tabs" aria-label="Secciones del backoffice">
      {ADMIN_TABS.map((t) => {
        const b = badges[t.id];
        return (
          <Link key={t.id} href={`/admin?tab=${t.id}`} className={'admin-tab' + (active === t.id ? ' active' : '')} aria-current={active === t.id ? 'page' : undefined} scroll={false}>
            {t.label}
            {b && b.n > 0 && <span className="tab-badge" title={b.label}>{b.n}<span className="sr-only"> {b.label}</span></span>}
          </Link>
        );
      })}
    </nav>
  );
}
