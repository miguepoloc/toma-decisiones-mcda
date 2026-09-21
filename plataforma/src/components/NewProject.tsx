'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/errors';
import { createFromImport, parseLegacyFile } from '@/lib/importer';
import { blankPrio } from '@/lib/prio';
import { uid } from '@/lib/types';
import { blankMatrix, setCell, setType } from '@/lib/topsis';
import type { MethodKey } from '@/components/ScientificMethodModal';

const METHOD_LABELS: Record<MethodKey, string> = {
  ahp: 'AHP · Jerarquía y Comparación por Pares',
  topsis: 'TOPSIS · Cercanía a Solución Ideal',
  vikor: 'VIKOR · Solución de Compromiso',
  promethee: 'PROMETHEE · Relaciones de Superación',
  electre: 'ELECTRE · Veto y Concordancia',
  saw: 'SAW · Suma Ponderada Simple',
  fuzzy_topsis: 'Fuzzy TOPSIS · Lógica Difusa',
};

// Caso guiado del curso (Sesiones 1-3): elegir tecnología de comunicación IoT/WSN para una red de
// sensores agroclimáticos en Palmor, Sierra Nevada de Santa Marta — mismos criterios/alternativas/datos
// que `Investigacion_didactica_IoT_WSN/PLAN_INVESTIGACION.md` y el Excel guiado de la Sesión 2
// (`s2_ahp_excel/Ejercicio.xlsx`). Da a un estudiante un proyecto con datos reales del curso en vez de
// "Criterio 1/2/3" al crear su primer proyecto — no reemplaza su propio problema de tesis.
const IOT_PALMOR_TITLE = 'Selección de tecnología IoT — Palmor (ejemplo del curso)';
const IOT_PALMOR_OBJECTIVE = 'Elegir la tecnología de comunicación (LoRaWAN, GSM/GPRS, Sigfox o Zigbee) para una red de sensores agroclimáticos en Palmor, Sierra Nevada de Santa Marta.';
const IOT_PALMOR_CRITERIA = [
  { name: 'Alcance de comunicación', hint: 'Distancia máxima confiable entre el nodo sensor y el gateway/estación base, en km.' },
  { name: 'Autonomía energética', hint: 'Vida útil estimada de la batería del nodo antes de requerir recambio o recarga, en años.' },
  { name: 'Infraestructura/cobertura comercial', hint: 'Disponibilidad de cobertura comercial ya desplegada en Colombia (1 = nula, 5 = amplia).' },
  { name: 'Madurez/viabilidad comercial', hint: 'Qué tan probada y sostenible comercialmente está la tecnología para este uso (1 = incipiente, 5 = consolidada).' },
];
const IOT_PALMOR_ALTERNATIVES = ['LoRaWAN', 'GSM/GPRS', 'Sigfox', 'Zigbee'];
// [Alcance (km), Autonomía (años), Infraestructura (1-5), Madurez (1-5)] — las 4 son de beneficio
// (más es mejor). Mismo dataset que scripts/check-topsis.ts y los demás check-*.ts de la plataforma.
const IOT_PALMOR_MATRIX = [[10, 8, 2, 5], [10.5, 0.5, 3, 2], [40, 2, 5, 2], [0.07, 1.5, 2, 4]];

function NewProjectForm({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawMethod = searchParams.get('new_method');
  const validMethod = rawMethod && rawMethod in METHOD_LABELS ? (rawMethod as MethodKey) : 'ahp';

  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [method, setMethod] = useState<MethodKey>(validMethod);
  const [useIotCase, setUseIotCase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (rawMethod && rawMethod in METHOD_LABELS) {
      setMethod(rawMethod as MethodKey);
    }
  }, [rawMethod]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const finalTitle = title.trim() || (useIotCase ? IOT_PALMOR_TITLE : '');
    if (!finalTitle) return;
    setBusy(true);
    setMsg('');
    const criteria = useIotCase
      ? IOT_PALMOR_CRITERIA.map((c) => ({ id: uid('k'), name: c.name, hint: c.hint, src: null }))
      : [1, 2, 3].map((i) => ({ id: uid('k'), name: 'Criterio ' + i, hint: '', src: null }));
    const alternatives = useIotCase
      ? IOT_PALMOR_ALTERNATIVES.map((name) => ({ id: uid('a'), name }))
      : [1, 2, 3].map((i) => ({ id: uid('a'), name: 'Alternativa ' + i }));
    // Fuzzy TOPSIS necesita etiquetas lingüísticas (VP/P/F/G/VG), no los valores numéricos de este
    // caso — se deja sin matriz precargada para ese método, igual que un proyecto en blanco.
    let decisionMatrix = blankMatrix();
    if (useIotCase && method !== 'ahp' && method !== 'fuzzy_topsis') {
      alternatives.forEach((a, i) => criteria.forEach((c, j) => { decisionMatrix = setCell(decisionMatrix, a.id, c.id, IOT_PALMOR_MATRIX[i][j]); }));
      criteria.forEach((c) => { decisionMatrix = setType(decisionMatrix, c.id, 'max'); });
    }
    const { data, error } = await createClient().from('projects').insert({
      owner_id: userId,
      title: finalTitle,
      objective: objective.trim() || (useIotCase ? IOT_PALMOR_OBJECTIVE : ''),
      method,
      criteria,
      alternatives,
      decision_matrix: decisionMatrix,
      prioritization: blankPrio(),
    }).select('id').single();
    setBusy(false);
    if (error || !data) setMsg(error ? friendlyError(error, 'No se pudo crear el proyecto.') : 'No se pudo crear el proyecto.');
    else router.push(`/projects/${data.id}`);
  }

  async function importFile(f: File) {
    setBusy(true);
    setMsg('');
    const imp = await parseLegacyFile(f);
    if (!imp) {
      setBusy(false);
      setMsg('Ese archivo no es un respaldo de la herramienta HTML (.json o el .xlsx que ella descarga).');
      return;
    }
    const r = await createFromImport(createClient(), userId, imp, f.name.replace(/\.[^.]+$/, '') || 'Proyecto importado');
    setBusy(false);
    if (r.id) router.push(`/projects/${r.id}`);
    else setMsg(r.error ?? 'No se pudo importar');
  }

  return (
    <div className="two-col">
      <form className="card form" onSubmit={create}>
        <h3>Nuevo proyecto</h3>
        <div>
          <label className="lbl" htmlFor="pt">Título</label>
          <input
            id="pt"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej.: Estrategia de adaptación ASR"
          />
        </div>
        <div>
          <label className="lbl" htmlFor="po">Objetivo de decisión</label>
          <textarea
            id="po"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Describe el propósito u objetivo central de la evaluación..."
          />
        </div>
        <div>
          <label className="lbl" htmlFor="pm">Método multicriterio inicial</label>
          <select
            id="pm"
            value={method}
            onChange={(e) => setMethod(e.target.value as MethodKey)}
            style={{ width: '100%' }}
          >
            {Object.entries(METHOD_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          {rawMethod && rawMethod in METHOD_LABELS && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                fontFamily: 'var(--f-mono)',
                color: '#00E5FF',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>✓</span> Preseleccionado según tu test metodológico ({rawMethod.toUpperCase()})
            </div>
          )}
        </div>
        <div>
          <label className="lbl" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useIotCase}
              onChange={(e) => setUseIotCase(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              Empezar con el caso de ejemplo del curso: tecnología IoT para Palmor (LoRaWAN/GSM-GPRS/Sigfox/Zigbee,
              Sesiones 1-3). Precarga criterios, alternativas{method !== 'ahp' && method !== 'fuzzy_topsis' ? ' y la matriz de datos' : ''} —
              tú decides si lo usas para explorar la plataforma o reemplazas todo por tu propio problema de tesis.
            </span>
          </label>
        </div>
        <div className="acts">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Creando...' : 'Crear proyecto'}
          </button>
        </div>
      </form>
      <div className="card form">
        <h3>Importar de la herramienta HTML</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          Trae tu trabajo previo: sube el respaldo <b>.json</b> o el <b>.xlsx</b> que descargaste de MCDA_ASR_Harold.html. Se crean el proyecto, los expertos y todos los juicios.
        </p>
        <input
          ref={file}
          type="file"
          accept=".xlsx,.json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = '';
          }}
        />
        <div className="acts">
          <button className="btn" type="button" disabled={busy} onClick={() => file.current?.click()}>
            Elegir archivo…
          </button>
        </div>
      </div>
      {msg && <p className="err" role="alert">{msg}</p>}
    </div>
  );
}

export default function NewProject({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<div className="card muted">Cargando formulario...</div>}>
      <NewProjectForm userId={userId} />
    </Suspense>
  );
}
