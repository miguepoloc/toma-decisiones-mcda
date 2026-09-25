'use client';

import { useEffect, useState } from 'react';

/** Input numérico que deja escribir "-", "1." o vacío sin pelear con el valor: solo confirma al
 * tener un número válido y re-sincroniza al perder el foco. */
export function Num({ value, onChange, step = 'any', min, max, width, label, disabled }: {
  value: number; onChange: (n: number) => void; step?: string; min?: number; max?: number; width?: number; label: string; disabled?: boolean;
}) {
  const fmt = (v: number) => (Number.isFinite(v) ? String(Math.round(v * 1e6) / 1e6) : '');
  const [t, setT] = useState(fmt(value));
  useEffect(() => { setT((prev) => (Number(prev) === value ? prev : fmt(value))); }, [value]);
  return (
    <input
      type="number" inputMode="decimal" step={step} min={min} max={max} value={t} aria-label={label} disabled={disabled}
      style={width ? { width } : undefined}
      onChange={(e) => { setT(e.target.value); const n = Number(e.target.value); if (e.target.value.trim() !== '' && Number.isFinite(n)) onChange(n); }}
      onBlur={() => setT(fmt(value))}
    />
  );
}

export function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export const ICONS = {
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M17.94 17.94A10.07 10.07 0 0112 19c-6.5 0-10-7-10-7a18.5 18.5 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c6.5 0 10 7 10 7a18.5 18.5 0 01-2.16 3.19M1 1l22 22',
  trash: 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6',
  fit: 'M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3',
  upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  check: 'M20 6L9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  square: 'M3 3h18v18H3z',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
};
