import type { Json } from '@/types/database'

export function serializeCanvas(snapshot: unknown): Json {
  return snapshot as Json
}

export function deserializeCanvas(data: Json): Record<string, any> | null {
  if (!data || typeof data !== 'object') return null
  return data as Record<string, any>
}
