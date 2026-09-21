import Link from 'next/link';
import type { ReactNode } from 'react';
import Logo from './Logo';

/** Barra superior compartida por todas las páginas: logo + "Plataforma MCDA" + badge + subtítulo,
 * más lo que cada página necesite a la derecha (link, botón, usuario…) vía `children`. */
export default function Topbar({
  badge,
  subtitle,
  href = '/',
  title = 'Plataforma MCDA · Inicio',
  children,
}: {
  badge: string;
  subtitle: string;
  href?: string;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="topbar">
      <Link className="brand" href={href} title={title}>
        <Logo size={26} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.2 }}>
            <span>Plataforma MCDA</span>
            <span
              style={{
                fontSize: 10, fontFamily: 'var(--f-mono)', padding: '1px 5px', borderRadius: 4,
                background: 'rgba(255,255,255,0.1)', color: 'var(--muted)',
              }}
            >
              {badge}
            </span>
          </div>
          <span className="brand-sub">{subtitle}</span>
        </div>
      </Link>
      {children}
    </div>
  );
}
