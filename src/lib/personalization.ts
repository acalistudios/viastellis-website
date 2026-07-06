/**
 * Personalization context builder.
 *
 * Assembles a compact, human-readable "about the seeker" block that the client
 * passes into every AI edge function (same approach as the tarot canonical
 * meanings). Deterministic-first: facts + declared prefs here; the AI is the
 * overlay. See ViaStellis Private/personalization-design.md.
 */
import type { FocusArea, JobStatus, Kids, Pronouns, RelationshipStatus, UserPersonalization } from '@/types'

/** Whole years from an ISO birth date (YYYY-MM-DD). Null if unparseable. */
export function ageFromBirthDate(birthDate: string | null | undefined, now = new Date()): number | null {
  if (!birthDate) return null
  const [y, m, d] = birthDate.split('-').map(Number)
  if (!y || !m || !d) return null
  let age = now.getFullYear() - y
  // Subtract a year if this year's birthday hasn't happened yet.
  const hadBirthday =
    now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d)
  if (!hadBirthday) age -= 1
  return age >= 0 && age < 130 ? age : null
}

const PRONOUN_LABEL: Record<Pronouns, string> = {
  she: 'she/her',
  he: 'he/him',
  they: 'they/them',
  prefer_not: '',
}

const FOCUS_LABEL: Record<FocusArea, string> = {
  love: 'love & relationships',
  career: 'career',
  money: 'money',
  health: 'health',
  growth: 'personal growth',
}

// Natural-language phrasings for the AI. 'prefer_not' → '' (omitted entirely).
const RELATIONSHIP_LABEL: Record<RelationshipStatus, string> = {
  single: 'single', dating: 'in a relationship', married: 'married',
  divorced: 'divorced', widowed: 'widowed', prefer_not: '',
}
const JOB_LABEL: Record<JobStatus, string> = {
  student: 'a student', employed: 'employed', self_employed: 'self-employed',
  between_jobs: 'between jobs', retired: 'retired', prefer_not: '',
}
const KIDS_LABEL: Record<Kids, string> = {
  none: 'no children', trying: 'trying to conceive', young: 'young children',
  teen: 'teenage children', adult: 'adult children', prefer_not: '',
}

export interface PersonaInput {
  personalization: UserPersonalization
  birthDate?: string | null
  /** Phase 2+ (personalized mode only): one-line inferred interest summary. */
  interestSummary?: string | null
  /** Phase 3 (personalized mode only): short conversation memories. */
  memories?: string[]
}

/**
 * Build the persona block injected into AI prompts. Returns '' when there is
 * nothing to add beyond the base guardrail-free prompt.
 *
 * In `chart_only` mode, only declared setup info (age, pronouns, focus) is
 * included — never inferred interests or memories.
 */
export function buildPersonaContext(input: PersonaInput, now = new Date()): string {
  const { personalization: p, birthDate, interestSummary, memories } = input
  const personalized = p.personalization_mode === 'personalized'
  const lines: string[] = []

  // Line 1 — demographics (declared, both modes).
  const age = ageFromBirthDate(birthDate, now)
  const pronoun = p.pronouns && p.pronouns !== 'prefer_not' ? PRONOUN_LABEL[p.pronouns] : ''
  const bits = [age != null ? String(age) : '', pronoun].filter(Boolean)
  if (bits.length) lines.push(`About the seeker: ${bits.join(', ')}.`)

  // Line 2 — declared focus areas (both modes).
  if (p.focus_areas.length) {
    const labels = p.focus_areas.map((f) => FOCUS_LABEL[f]).filter(Boolean)
    if (labels.length) lines.push(`Interested in: ${labels.join(', ')}.`)
  }

  // Line 3 — life context (relationship / work / children). 'prefer_not' & null omitted.
  const life = [
    p.relationship_status ? RELATIONSHIP_LABEL[p.relationship_status] : '',
    p.job_status ? JOB_LABEL[p.job_status] : '',
    p.kids ? KIDS_LABEL[p.kids] : '',
  ].filter(Boolean)
  if (life.length) lines.push(`Life context: ${life.join(', ')}.`)

  // Lines 3-4 — inferred layer (personalized mode only).
  if (personalized && interestSummary?.trim()) {
    lines.push(`Current focus (recent): ${interestSummary.trim()}`)
  }
  if (personalized && memories?.length) {
    lines.push(`Stella remembers: ${memories.join('; ')}.`)
  }

  if (!lines.length) return ''

  // Always close with a tone guardrail. These details shape the reading's
  // appropriateness but must never be echoed back — users find that intrusive.
  lines.push(
    'Use these details only to keep your guidance relevant and appropriate. Never state or restate them back to the person — do NOT mention their age, birth year, pronouns, relationship status, job, or children in your reply. Where you would refer to who they are, say "a person with your astrological makeup" instead of naming any personal detail.',
  )
  return lines.join('\n')
}
