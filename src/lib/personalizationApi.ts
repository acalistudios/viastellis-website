/**
 * Data access for the personalization profile + Stella memories.
 *
 * Every read fails soft: if the tables don't exist yet (before the migrations
 * are run) or the query errors, we return safe defaults so nothing in the app
 * breaks. Writes are best-effort and surface errors to the caller.
 */
import { supabase } from './supabase'
import {
  DEFAULT_PERSONALIZATION,
  type FocusArea,
  type JobStatus,
  type Kids,
  type Pronouns,
  type RelationshipStatus,
  type StellaMemory,
  type UserPersonalization,
} from '@/types'

export async function fetchPersonalization(userId: string): Promise<UserPersonalization> {
  try {
    const { data, error } = await supabase
      .from('user_personalization')
      .select('personalization_mode, pronouns, focus_areas, relationship_status, job_status, kids')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return DEFAULT_PERSONALIZATION
    return {
      personalization_mode: data.personalization_mode === 'personalized' ? 'personalized' : 'chart_only',
      pronouns: (data.pronouns ?? null) as Pronouns | null,
      focus_areas: (data.focus_areas ?? []) as FocusArea[],
      relationship_status: (data.relationship_status ?? null) as RelationshipStatus | null,
      job_status: (data.job_status ?? null) as JobStatus | null,
      kids: (data.kids ?? null) as Kids | null,
    }
  } catch {
    return DEFAULT_PERSONALIZATION
  }
}

export async function savePersonalization(userId: string, p: UserPersonalization): Promise<void> {
  const { error } = await supabase
    .from('user_personalization')
    .upsert(
      {
        user_id: userId,
        personalization_mode: p.personalization_mode,
        pronouns: p.pronouns,
        focus_areas: p.focus_areas,
        relationship_status: p.relationship_status,
        job_status: p.job_status,
        kids: p.kids,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  if (error) throw new Error(error.message)
}

export async function fetchMemories(userId: string): Promise<StellaMemory[]> {
  try {
    const { data, error } = await supabase
      .from('stella_memories')
      .select('id, note, source, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data as StellaMemory[]
  } catch {
    return []
  }
}

export async function addMemory(
  userId: string,
  note: string,
  source: 'intake' | 'chat' = 'intake',
): Promise<void> {
  const trimmed = note.trim().slice(0, 500)
  if (!trimmed) return
  const { error } = await supabase
    .from('stella_memories')
    .insert({ user_id: userId, note: trimmed, source })
  if (error) throw new Error(error.message)
}

export async function updateMemory(id: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('stella_memories')
    .update({ note: note.trim().slice(0, 500), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.from('stella_memories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Erase all memories for a user — used when switching off personalized mode. */
export async function clearMemories(userId: string): Promise<void> {
  const { error } = await supabase.from('stella_memories').delete().eq('user_id', userId)
  if (error) throw new Error(error.message)
}

const PROXY_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '/api'

/**
 * Optional AI polish for the intake free-text: distill it into a clean memory
 * line + a warm closing reply. Fails soft — on any error, stores the raw text
 * and returns no closing line, so the flow never breaks.
 */
export async function distillIntake(
  freeText: string,
  name: string | undefined,
  token: string,
): Promise<{ memory: string; reply: string }> {
  const fallback = { memory: freeText.trim().slice(0, 200), reply: '' }
  try {
    const res = await fetch(`${PROXY_BASE}/personalize-intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ freeText: freeText.trim().slice(0, 1000), name }),
    })
    if (!res.ok) return fallback
    const data = await res.json()
    return {
      memory: (typeof data.memory === 'string' && data.memory.trim() ? data.memory : fallback.memory).slice(0, 200),
      reply: typeof data.reply === 'string' ? data.reply : '',
    }
  } catch {
    return fallback
  }
}
