import { supabase } from '@/lib/supabase'
import { calculateNatalChart } from '@/lib/ephemeris'
import { calculateWesternChart } from '@/lib/westernChart'
import type { BirthData, NatalChart, WesternChart } from '@/types'
import type { Json } from '@/types/supabase'

const PROXY_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '/api'

export interface ClientReportRecord {
  id: string
  user_id: string
  title: string
  birth_data: BirthData
  status: 'draft' | 'final'
  systems: 'vedic_western'
  prep_notes: string | null
  credits_debited: number
  generated_at: string | null
  created_at: string
  updated_at: string
}

export interface ClientReportContext {
  name: string
  birthDetails: string
  vedicSummary: string
  westernSummary: string
}

export async function listClientReports(): Promise<ClientReportRecord[]> {
  const { data, error } = await supabase
    .from('client_reports')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as ClientReportRecord[]
}

export async function createClientReportDraft(userId: string, birthData: BirthData): Promise<ClientReportRecord> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('client_reports')
    .insert({
      user_id: userId,
      title: `${birthData.name}'s Client Birth Chart`,
      birth_data: birthData as unknown as Json,
      systems: 'vedic_western',
      status: 'draft',
      updated_at: now,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as unknown as ClientReportRecord
}

export async function deleteClientReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('client_reports')
    .delete()
    .eq('id', reportId)

  if (error) throw error
}

export async function finalizeClientReport(args: {
  reportId: string
  context: ClientReportContext
}): Promise<{ report: ClientReportRecord; charged: number }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in.')

  const res = await fetch(`${PROXY_BASE}/client-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(args),
  })

  if (res.status === 402) {
    throw new Error("You're out of credits. Add a credit pack to generate this client report.")
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error ?? 'Could not generate this client report.')
  }
  return res.json()
}

export function buildClientReportContext(birthData: BirthData): ClientReportContext {
  const vedic = calculateNatalChart(birthData)
  const western = birthData.time_unknown ? null : calculateWesternChart(birthData)

  return {
    name: birthData.name,
    birthDetails: birthDetails(birthData),
    vedicSummary: summarizeVedicChart(vedic),
    westernSummary: western ? summarizeWesternChart(western) : '',
  }
}

function birthDetails(birthData: BirthData): string {
  const time = birthData.time_unknown ? 'time unknown' : birthData.time
  return `${birthData.date}, ${time}, ${birthData.city}, ${birthData.country}`
}

function summarizeVedicChart(chart: NatalChart): string {
  const planets = chart.planets
    .map(p => `${p.planet}: ${p.sign}, house ${p.house}, ${p.degree.toFixed(1)} degrees, ${p.nakshatra} pada ${p.nakshatra_pada}${p.retrograde ? ', retrograde' : ''}`)
    .join('\n')

  return [
    `Ascendant: ${chart.ascendant.sign} ${chart.ascendant.degree.toFixed(1)} degrees.`,
    `Ayanamsa: ${chart.ayanamsa}.`,
    `Planets:\n${planets}`,
  ].join('\n')
}

function summarizeWesternChart(chart: WesternChart): string {
  const planets = chart.planets
    .map(p => `${p.body}: ${p.sign}, house ${p.house}, ${p.degree.toFixed(1)} degrees${p.retrograde ? ', retrograde' : ''}`)
    .join('\n')
  const aspects = chart.aspects
    .slice(0, 16)
    .map(a => `${a.a} ${a.type} ${a.b}, orb ${a.orb.toFixed(1)}, ${a.applying ? 'applying' : 'separating'}`)
    .join('\n')

  return [
    `Ascendant: ${chart.ascendant.sign} ${chart.ascendant.degree.toFixed(1)} degrees.`,
    `Midheaven: ${chart.midheaven.sign} ${chart.midheaven.degree.toFixed(1)} degrees.`,
    `House system: ${chart.house_system}.`,
    `Planets:\n${planets}`,
    `Major aspects:\n${aspects || '(none tight)'}`,
  ].join('\n')
}
