/**
 * Credit costs per AI action — the source of truth for cost LABELS in the UI.
 * These mirror what the server actually charges (stella-chat debits 1 per call;
 * shared-reading debits 1; the personalized horoscope debits 2). Keep in sync
 * with the edge functions if pricing changes.
 */
export const CREDIT_COSTS = {
  calendar_day: 1,
  weekly: 1,
  compatibility: 1,
  decision: 1,
  journal: 1,
  chat: 1,
  horoscope_generic: 1,
  horoscope_personalized: 2,
  report_career: 40,
  report_year_ahead: 40,
  report_birth_chart: 40,
  report_synastry: 40,
  report_numerology: 40,
  full_moon_reading: 40,
  tarot_spread: 2,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

export function creditLabel(n: number): string {
  return `${n} credit${n === 1 ? '' : 's'}`
}
