/** Persistencia de capas propias: Float32 + gzip en Supabase Storage (bucket privado `geo-layers`,
 * carpeta = uid del dueño; ver migración 20240101000011_geo_storage.sql). Solo cliente. */
import type { SupabaseClient } from '@supabase/supabase-js';

export const BUCKET = 'geo-layers';
/** Tope blando por proyecto (suma de bytes comprimidos). La cuota por usuario editable por el
 * administrador es una entrega posterior (ver plataforma/docs/PLAN_geovisor_ahp_sig.md). */
export const MAX_PROJECT_BYTES = 60 * 1024 * 1024;

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const src = new Blob([bytes as BlobPart]).stream().pipeThrough(stream as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(src).arrayBuffer());
}
export const gzip = (b: Uint8Array) => pipe(b, new CompressionStream('gzip'));
export const gunzip = (b: Uint8Array) => pipe(b, new DecompressionStream('gzip'));

export const layerPath = (ownerId: string, projectId: string, key: string) => `${ownerId}/${projectId}/${key}.f32.gz`;

export async function uploadLayer(sb: SupabaseClient, path: string, data: Float32Array): Promise<number> {
  const gz = await gzip(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  const { error } = await sb.storage.from(BUCKET).upload(path, new Blob([gz as BlobPart], { type: 'application/gzip' }), { upsert: true, contentType: 'application/gzip' });
  if (error) throw new Error(error.message);
  return gz.byteLength;
}

export async function downloadLayer(sb: SupabaseClient, path: string): Promise<Float32Array> {
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? 'No se pudo descargar la capa');
  const raw = await gunzip(new Uint8Array(await data.arrayBuffer()));
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
}

export async function removeLayers(sb: SupabaseClient, paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await sb.storage.from(BUCKET).remove(paths);
  if (error) throw new Error(error.message);
}
