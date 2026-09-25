import type { SupabaseClient } from '@supabase/supabase-js';
import type { Example } from './examples';

/** Si el ejemplo trae un experto (p. ej. la Tabla IV de la boya, marcada como reconstrucción), lo crea ya completado en el proyecto.
 * Devuelve un mensaje de error o `null`. Fallar aquí no debe impedir abrir el proyecto: sin experto el mapa usa pesos iguales. */
export async function seedExampleExpert(sb: SupabaseClient, projectId: string, ex: Example | null | undefined): Promise<string | null> {
  if (!ex?.expert) return null;
  const { data, error } = await sb.from('experts').insert({
    project_id: projectId, name: ex.expert.name, role_desc: ex.expert.roleDesc, position: 0,
    status: 'submitted', filled_by: 'owner', submitted_at: new Date().toISOString(),
  }).select('id').single();
  if (error || !data) return 'No se pudo crear el experto de ejemplo.';
  const { error: je } = await sb.from('judgments').insert(ex.expert.judgments.map((j) => ({ expert_id: data.id, sheet: 'crit', pair_key: j.key, value: j.value })));
  return je ? 'No se pudieron guardar los juicios del experto de ejemplo.' : null;
}
