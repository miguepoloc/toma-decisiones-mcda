/** Mismo diseño que src/app/icon.tsx (el favicon), como SVG vectorial para usar
 * inline en topbars y encabezados sin depender de un <img> apuntando a /icon. */
export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect width="32" height="32" rx="8" fill="#0B7A85" />
      <rect x="3" y="12" width="8" height="8" rx="2" fill="#8FE0E2" />
      <rect x="14" y="8.5" width="15" height="15" rx="3.5" fill="#FFFFFF" />
    </svg>
  );
}
