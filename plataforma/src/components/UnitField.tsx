'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { filterUnitGroups, UNIT_GROUPS } from '@/lib/units';

/** Lista de sugerencias: chips por familia y, si lo escrito no está en la lista, una opción explícita «Usar “…”». Es solo la parte
 * visual; UnitField decide cuándo se abre y dónde se pinta. */
export function UnitSuggestions({ query, current, onPick, id }: { query: string; current: string; onPick: (u: string) => void; id?: string }) {
  const groups = filterUnitGroups(query);
  const typed = query.trim();
  const isKnown = UNIT_GROUPS.some((g) => g.units.some((u) => u.toLowerCase() === typed.toLowerCase()));
  return (
    <div className="unit-pop-body" id={id}>
      <p className="unit-head">{typed ? 'Elige una sugerencia o pulsa Intro para usar lo que escribiste.' : 'Elige una unidad o escribe la tuya en el campo: puede ser cualquiera.'}</p>
      {typed && !isKnown && (
        <button type="button" className="unit-use" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(typed)}>
          <span aria-hidden="true">＋</span> Usar «{typed}»
        </button>
      )}
      {groups.map((g) => (
        <div key={g.label} className="unit-grp">
          <div className="unit-grp-l">{g.label}</div>
          <div className="unit-chips">
            {g.units.map((u) => (
              <button key={u} type="button" className="unit-chip" aria-pressed={u === current} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(u)}>{u}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Campo de unidad: texto libre con sugerencias que se abren al enfocar. Sustituye al <datalist> nativo, que se veía como un
 * desplegable de sistema y no dejaba claro que se puede escribir una unidad distinta. La lista se pinta en un portal con posición
 * fija para que no la recorte el contenedor con scroll de la matriz. */
export default function UnitField({ value, onChange, ariaLabel, className, placeholder = 'Unidad o escribe la tuya' }: {
  value: string; onChange: (v: string) => void; ariaLabel: string; className?: string; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ left: number; top: number; width: number } | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const listId = useId();

  const place = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(260, Math.min(340, r.width));
    const left = Math.min(Math.max(8, r.left + r.width / 2 - width / 2), window.innerWidth - width - 8);
    setBox({ left, top: r.bottom + 6, width });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const on = () => place();
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); };
  }, [open]);

  const pick = (u: string) => { onChange(u); setOpen(false); ref.current?.blur(); };

  return (
    <>
      <input
        ref={ref} type="text" className={className} value={value} placeholder={placeholder} autoComplete="off" spellCheck={false}
        role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-label={ariaLabel}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); } else if (e.key === 'Enter') { e.preventDefault(); setOpen(false); ref.current?.blur(); } }}
      />
      {open && box && typeof document !== 'undefined' && createPortal(
        <div className="unit-pop" style={{ left: box.left, top: box.top, width: box.width }} role="listbox" aria-label="Unidades sugeridas">
          <UnitSuggestions id={listId} query={value} current={value.trim()} onPick={pick} />
        </div>,
        document.body,
      )}
    </>
  );
}
