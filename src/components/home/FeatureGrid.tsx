/**
 * FeatureGrid — the home page's app-style launcher.
 *
 * Big tap targets for every pillar, so a returning user reaches what they came
 * for in one tap instead of scrolling past the day's reading. Every tile opens
 * its own screen (each with a way back Home), so they all behave the same.
 */

import { Link } from 'react-router-dom'
import {
  BookOpen,
  Calendar,
  ChevronRight,
  HelpCircle,
  Layers,
  MessageCircle,
  Star,
  Sun,
  Users,
  type LucideIcon,
} from 'lucide-react'

type Tone = 'gold' | 'violet' | 'teal' | 'rose' | 'slate'

const TONES: Record<Tone, { card: string; icon: string }> = {
  gold:   { card: 'from-stellar-400/15 to-cosmos-900 border-stellar-300/30 hover:border-stellar-300/60', icon: 'bg-stellar-300/15 text-stellar-300' },
  violet: { card: 'from-stardust-400/15 to-cosmos-900 border-stardust-400/30 hover:border-stardust-400/60', icon: 'bg-stardust-400/15 text-stardust-300' },
  teal:   { card: 'from-emerald-400/10 to-cosmos-900 border-emerald-400/25 hover:border-emerald-400/50', icon: 'bg-emerald-400/15 text-emerald-300' },
  rose:   { card: 'from-rose-400/10 to-cosmos-900 border-rose-400/25 hover:border-rose-400/50', icon: 'bg-rose-400/15 text-rose-300' },
  slate:  { card: 'from-cosmos-800 to-cosmos-900 border-cosmos-600 hover:border-cosmos-500', icon: 'bg-cosmos-700 text-slate-200' },
}

interface Feature {
  title: string
  subtitle: string
  icon: LucideIcon
  tone: Tone
  to: string
}

const FEATURES: Feature[] = [
  { title: 'Ask Stella',    subtitle: 'Your personal astrologer', icon: MessageCircle, tone: 'violet', to: '/stella' },
  { title: 'Birth Chart',   subtitle: 'Your cosmic blueprint',    icon: Star,          tone: 'gold',   to: '/chart' },
  { title: 'Daily Tarot',   subtitle: "Draw today's card",        icon: Layers,        tone: 'rose',   to: '/tarot' },
  { title: 'Best Days',     subtitle: 'Your month at a glance',   icon: Calendar,      tone: 'teal',   to: '/calendar' },
  { title: 'Compatibility', subtitle: 'You and someone else',     icon: Users,         tone: 'rose',   to: '/compatibility' },
  { title: 'Decisions',     subtitle: 'Should I…? Ask the stars', icon: HelpCircle,    tone: 'violet', to: '/decision' },
  { title: 'Journal',       subtitle: 'Reflect on your days',     icon: BookOpen,      tone: 'slate',  to: '/journal' },
  { title: 'Horoscopes',    subtitle: 'Every sign, every day',    icon: Sun,           tone: 'gold',   to: '/horoscopes' },
]

const CARD = 'group relative flex flex-col justify-start min-h-[112px] rounded-2xl border bg-gradient-to-br px-4 py-4 text-left transition-colors'

function FeatureCard({ f }: { f: Feature }) {
  const tone = TONES[f.tone]
  const Icon = f.icon
  const body = (
    <>
      <span className={`inline-flex w-10 h-10 items-center justify-center rounded-xl ${tone.icon}`}>
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <span className="mt-3 block">
        <span className="block text-slate-100 text-[15px] font-medium leading-tight">{f.title}</span>
        <span className="block text-slate-400 text-xs mt-0.5 leading-snug">{f.subtitle}</span>
      </span>
    </>
  )
  return <Link to={f.to} className={`${CARD} ${tone.card}`}>{body}</Link>
}

interface TodayTileProps {
  dayLabel: string
  dayTone: string
  moonLine: string
}

/** Wide lead tile: today's quality at a glance; opens the full reading at /today. */
function TodayTile({ dayLabel, dayTone, moonLine }: TodayTileProps) {
  return (
    <Link
      to="/today"
      className={`${CARD} ${TONES.gold.card} col-span-2 sm:col-span-4 min-h-0 flex-row items-center gap-4`}
    >
      <span className={`inline-flex w-12 h-12 shrink-0 items-center justify-center rounded-2xl ${TONES.gold.icon}`}>
        <Sun size={24} strokeWidth={1.75} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] uppercase tracking-widest text-stellar-300/80">Today's horoscope</span>
        <span className={`block text-lg font-display leading-tight ${dayTone}`}>{dayLabel}</span>
        <span className="block text-slate-400 text-xs mt-0.5 leading-snug line-clamp-2">{moonLine}</span>
      </span>
      <span className="inline-flex items-center gap-0.5 text-stellar-300 text-sm font-medium shrink-0">
        <span className="hidden sm:inline">Read</span>
        <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

export function FeatureGrid(props: TodayTileProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-8">
      <TodayTile {...props} />
      {FEATURES.map(f => <FeatureCard key={f.title} f={f} />)}
    </div>
  )
}
