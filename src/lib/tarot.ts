/**
 * Tarot card data + deterministic pickers.
 *
 * Daily card: same for all users on a given date (shareable, no AI).
 * 3-card spread: unique per user+date (seeded hash), AI narrative via edge fn.
 */
import { supabase } from './supabase'

const PROXY_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '/api'

// ─── Card data ───────────────────────────────────────────────────────────────

export interface TarotCard {
  index: number
  name: string
  keywords: [string, string, string]
  upright: string
}

export const TAROT_CARDS: TarotCard[] = [
  // Major Arcana
  { index: 0,  name: 'The Fool',            keywords: ['beginnings', 'spontaneity', 'faith'],          upright: 'A fresh start and leap of faith opens limitless potential.' },
  { index: 1,  name: 'The Magician',        keywords: ['manifestation', 'resourcefulness', 'power'],   upright: 'You have every tool you need — direct your will and make it real.' },
  { index: 2,  name: 'The High Priestess',  keywords: ['intuition', 'mystery', 'inner knowing'],       upright: 'Trust what lies beneath the surface; your inner voice holds the answer.' },
  { index: 3,  name: 'The Empress',         keywords: ['abundance', 'nurturing', 'fertility'],         upright: 'Creation, growth, and sensual abundance flow through you now.' },
  { index: 4,  name: 'The Emperor',         keywords: ['authority', 'structure', 'stability'],         upright: 'Build with discipline; strong foundations lead to lasting success.' },
  { index: 5,  name: 'The Hierophant',      keywords: ['tradition', 'guidance', 'belief'],             upright: 'Seek wisdom from established teachings or a trusted mentor.' },
  { index: 6,  name: 'The Lovers',          keywords: ['union', 'values', 'choice'],                   upright: 'A meaningful choice or connection asks you to align with your deepest values.' },
  { index: 7,  name: 'The Chariot',         keywords: ['willpower', 'determination', 'victory'],       upright: 'Harness opposing forces and charge forward with focused intention.' },
  { index: 8,  name: 'Strength',            keywords: ['courage', 'patience', 'compassion'],           upright: 'Gentle inner strength and quiet courage carry you through.' },
  { index: 9,  name: 'The Hermit',          keywords: ['solitude', 'introspection', 'guidance'],       upright: 'Withdraw to seek inner truth; the answer lives within.' },
  { index: 10, name: 'Wheel of Fortune',    keywords: ['cycles', 'luck', 'turning point'],             upright: "Life's wheel turns; a significant cycle shifts in your favor." },
  { index: 11, name: 'Justice',             keywords: ['fairness', 'truth', 'cause and effect'],       upright: 'Balanced action and honest assessment bring the right outcome.' },
  { index: 12, name: 'The Hanged Man',      keywords: ['pause', 'surrender', 'new perspective'],       upright: 'Let go and see from a new angle; the pause itself is the wisdom.' },
  { index: 13, name: 'Death',               keywords: ['transition', 'endings', 'transformation'],     upright: 'Something must end so something far greater can begin.' },
  { index: 14, name: 'Temperance',          keywords: ['balance', 'moderation', 'patience'],           upright: 'Blend extremes with grace; steady patience yields true alchemy.' },
  { index: 15, name: 'The Devil',           keywords: ['bondage', 'materialism', 'shadow'],            upright: 'Examine what binds you; awareness is the first step to freedom.' },
  { index: 16, name: 'The Tower',           keywords: ['upheaval', 'revelation', 'awakening'],         upright: 'Sudden disruption clears the ground for authentic rebuilding.' },
  { index: 17, name: 'The Star',            keywords: ['hope', 'healing', 'renewal'],                  upright: 'After the storm, renewed hope and healing light your way.' },
  { index: 18, name: 'The Moon',            keywords: ['illusion', 'fear', 'subconscious'],            upright: 'Not all is as it seems; navigate by feeling, not logic alone.' },
  { index: 19, name: 'The Sun',             keywords: ['joy', 'success', 'vitality'],                  upright: 'Radiant clarity, success, and joy illuminate every step.' },
  { index: 20, name: 'Judgement',           keywords: ['reflection', 'reckoning', 'absolution'],       upright: 'An honest reckoning leads to release and a higher calling.' },
  { index: 21, name: 'The World',           keywords: ['completion', 'integration', 'wholeness'],      upright: 'A cycle completes in triumph; you are ready for the next level.' },
  // Wands
  { index: 22, name: 'Ace of Wands',        keywords: ['inspiration', 'spark', 'potential'],           upright: 'A creative spark ignites — seize this surge of energy.' },
  { index: 23, name: 'Two of Wands',        keywords: ['planning', 'vision', 'expansion'],             upright: 'Plan boldly; the world opens up before your eyes.' },
  { index: 24, name: 'Three of Wands',      keywords: ['progress', 'foresight', 'enterprise'],         upright: 'Your efforts expand; watch your plans come to fruition.' },
  { index: 25, name: 'Four of Wands',       keywords: ['celebration', 'harmony', 'homecoming'],        upright: 'Celebrate a milestone; joy and community surround you.' },
  { index: 26, name: 'Five of Wands',       keywords: ['conflict', 'competition', 'diversity'],        upright: 'Healthy competition or friction sharpens your edge.' },
  { index: 27, name: 'Six of Wands',        keywords: ['victory', 'recognition', 'confidence'],        upright: 'Public recognition and well-earned victory are yours.' },
  { index: 28, name: 'Seven of Wands',      keywords: ['perseverance', 'defense', 'challenge'],        upright: 'Hold your ground with confidence against challengers.' },
  { index: 29, name: 'Eight of Wands',      keywords: ['speed', 'movement', 'momentum'],               upright: 'Events accelerate; swift action and communication are favored.' },
  { index: 30, name: 'Nine of Wands',       keywords: ['resilience', 'courage', 'persistence'],        upright: "You're nearly there — one final push draws on all your resilience." },
  { index: 31, name: 'Ten of Wands',        keywords: ['burden', 'responsibility', 'completion'],      upright: 'Lighten your load; release or delegate what no longer serves.' },
  { index: 32, name: 'Page of Wands',       keywords: ['enthusiasm', 'exploration', 'discovery'],      upright: 'Embrace a new passion with adventurous, open-hearted curiosity.' },
  { index: 33, name: 'Knight of Wands',     keywords: ['action', 'adventure', 'impulsiveness'],        upright: 'Channel fiery drive into bold action, but temper impulsiveness.' },
  { index: 34, name: 'Queen of Wands',      keywords: ['confidence', 'warmth', 'determination'],       upright: 'Lead with vibrant confidence, warmth, and fierce independence.' },
  { index: 35, name: 'King of Wands',       keywords: ['vision', 'leadership', 'entrepreneur'],        upright: 'Visionary leadership and bold entrepreneurial energy guide you.' },
  // Cups
  { index: 36, name: 'Ace of Cups',         keywords: ['love', 'new feelings', 'compassion'],          upright: 'A flood of new love, creativity, or emotional insight arrives.' },
  { index: 37, name: 'Two of Cups',         keywords: ['partnership', 'connection', 'unity'],          upright: 'A meaningful bond forms in mutual respect and deep attraction.' },
  { index: 38, name: 'Three of Cups',       keywords: ['friendship', 'celebration', 'community'],      upright: 'Gather your people; joy and shared celebration overflow.' },
  { index: 39, name: 'Four of Cups',        keywords: ['contemplation', 'apathy', 'reevaluation'],     upright: 'Look up from brooding — a quiet new opportunity waits unnoticed.' },
  { index: 40, name: 'Five of Cups',        keywords: ['loss', 'grief', 'regret'],                     upright: 'Mourn what was lost, then turn gently toward what still remains.' },
  { index: 41, name: 'Six of Cups',         keywords: ['nostalgia', 'childhood', 'innocence'],         upright: 'Fond memories and kindness from the past bring unexpected healing.' },
  { index: 42, name: 'Seven of Cups',       keywords: ['choices', 'fantasy', 'illusion'],              upright: 'Many options, some illusory — discern clearly what is truly real.' },
  { index: 43, name: 'Eight of Cups',       keywords: ['moving on', 'withdrawal', 'seeking'],          upright: 'Leave what no longer fulfills; deeper meaning awaits.' },
  { index: 44, name: 'Nine of Cups',        keywords: ['contentment', 'satisfaction', 'gratitude'],    upright: 'Your wishes manifest; savor this rare moment of fulfillment.' },
  { index: 45, name: 'Ten of Cups',         keywords: ['harmony', 'happiness', 'alignment'],           upright: 'Deep happiness and emotional fulfillment bless your relationships.' },
  { index: 46, name: 'Page of Cups',        keywords: ['creativity', 'intuition', 'sensitivity'],      upright: 'Embrace intuitive messages and let creativity flow freely.' },
  { index: 47, name: 'Knight of Cups',      keywords: ['romance', 'charm', 'following the heart'],     upright: 'Follow your heart on a quest for beauty and deep feeling.' },
  { index: 48, name: 'Queen of Cups',       keywords: ['empathy', 'nurturing', 'intuitive'],           upright: 'Lead from the heart with deep empathy and fluid intuition.' },
  { index: 49, name: 'King of Cups',        keywords: ['emotional balance', 'compassion', 'wisdom'],   upright: 'Calm, compassionate wisdom guides you through emotional waters.' },
  // Swords
  { index: 50, name: 'Ace of Swords',       keywords: ['clarity', 'breakthrough', 'truth'],            upright: 'Mental clarity cuts through confusion — speak and act with truth.' },
  { index: 51, name: 'Two of Swords',       keywords: ['indecision', 'stalemate', 'truce'],            upright: "A difficult choice is deferred; face the truth you've been avoiding." },
  { index: 52, name: 'Three of Swords',     keywords: ['heartbreak', 'grief', 'sorrow'],               upright: 'Pain must be felt before it can heal; allow the release.' },
  { index: 53, name: 'Four of Swords',      keywords: ['rest', 'recovery', 'contemplation'],           upright: 'Rest and withdraw; recuperation now powers future action.' },
  { index: 54, name: 'Five of Swords',      keywords: ['conflict', 'defeat', 'betrayal'],              upright: 'Pick your battles wisely; hollow victories cost more than they gain.' },
  { index: 55, name: 'Six of Swords',       keywords: ['transition', 'healing', 'moving away'],        upright: 'Leave troubled waters behind; calmer shores await ahead.' },
  { index: 56, name: 'Seven of Swords',     keywords: ['deception', 'strategy', 'cunning'],            upright: 'Tactics and careful strategy are needed; stay alert to deception.' },
  { index: 57, name: 'Eight of Swords',     keywords: ['restriction', 'self-limiting', 'imprisonment'], upright: 'The cage is largely mental — your freedom is closer than you think.' },
  { index: 58, name: 'Nine of Swords',      keywords: ['anxiety', 'nightmares', 'worry'],              upright: 'Fear amplifies in the dark; seek perspective and reach for support.' },
  { index: 59, name: 'Ten of Swords',       keywords: ['endings', 'betrayal', 'rock bottom'],          upright: 'A painful end fully clears the way for a genuine new beginning.' },
  { index: 60, name: 'Page of Swords',      keywords: ['curiosity', 'vigilance', 'mental agility'],    upright: 'Stay sharp, ask questions, and approach challenges with agility.' },
  { index: 61, name: 'Knight of Swords',    keywords: ['ambition', 'speed', 'assertiveness'],          upright: 'Charge forward with fierce ambition, but think before you act.' },
  { index: 62, name: 'Queen of Swords',     keywords: ['perception', 'independence', 'directness'],    upright: 'Cut through illusion with clear perception and direct speech.' },
  { index: 63, name: 'King of Swords',      keywords: ['authority', 'clarity', 'intellect'],           upright: 'Lead with sharp intellect, fairness, and ethical authority.' },
  // Pentacles
  { index: 64, name: 'Ace of Pentacles',    keywords: ['opportunity', 'prosperity', 'new path'],       upright: 'A tangible new opportunity for abundance plants its seed today.' },
  { index: 65, name: 'Two of Pentacles',    keywords: ['balance', 'adaptability', 'juggling'],         upright: 'Stay flexible and balanced as you manage competing priorities.' },
  { index: 66, name: 'Three of Pentacles',  keywords: ['teamwork', 'skill', 'collaboration'],          upright: 'Skilled collaboration and craftsmanship produce outstanding results.' },
  { index: 67, name: 'Four of Pentacles',   keywords: ['security', 'control', 'conservation'],         upright: 'Guard your resources, but beware of clinging too tightly.' },
  { index: 68, name: 'Five of Pentacles',   keywords: ['hardship', 'isolation', 'worry'],              upright: 'Seek help and community; support is available if you only ask.' },
  { index: 69, name: 'Six of Pentacles',    keywords: ['generosity', 'charity', 'sharing'],            upright: 'Give and receive with grace; generosity flows in both directions.' },
  { index: 70, name: 'Seven of Pentacles',  keywords: ['patience', 'investment', 'assessment'],        upright: 'Pause to assess your harvest; patient tending yields real results.' },
  { index: 71, name: 'Eight of Pentacles',  keywords: ['diligence', 'mastery', 'skill'],               upright: 'Focused, dedicated practice builds true mastery over time.' },
  { index: 72, name: 'Nine of Pentacles',   keywords: ['abundance', 'self-sufficiency', 'luxury'],     upright: 'Independent prosperity and refined enjoyment are well deserved.' },
  { index: 73, name: 'Ten of Pentacles',    keywords: ['legacy', 'family', 'long-term success'],       upright: 'Lasting wealth, family harmony, and a meaningful legacy await.' },
  { index: 74, name: 'Page of Pentacles',   keywords: ['ambition', 'learning', 'groundedness'],        upright: 'Approach a practical goal with diligent, grounded study.' },
  { index: 75, name: 'Knight of Pentacles', keywords: ['hard work', 'reliability', 'routine'],         upright: 'Steady, methodical effort and reliability carry you to success.' },
  { index: 76, name: 'Queen of Pentacles',  keywords: ['nurturing', 'practicality', 'abundance'],      upright: 'Nurture your resources and loved ones with warm practicality.' },
  { index: 77, name: 'King of Pentacles',   keywords: ['wealth', 'security', 'success'],               upright: 'Disciplined stewardship of resources creates enduring security.' },
]

// ─── Pickers ─────────────────────────────────────────────────────────────────

/** Today's shared card — same for every user on the same date. */
export function getDailyCard(dateStr: string): TarotCard {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dayOfYear = Math.floor(
    (new Date(y, m - 1, d).getTime() - new Date(y, 0, 0).getTime()) / 86400000
  )
  return TAROT_CARDS[(dayOfYear + 13) % 78]
}

function lcg(seed: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0)
}

function strHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

/** 3 unique cards for this user on this date (deterministic). */
export function getSpreadCards(userId: string, dateStr: string): [TarotCard, TarotCard, TarotCard] {
  let n = strHash(userId + dateStr)
  const picked: number[] = []
  while (picked.length < 3) {
    n = lcg(n)
    const idx = n % 78
    if (!picked.includes(idx)) picked.push(idx)
  }
  return [TAROT_CARDS[picked[0]], TAROT_CARDS[picked[1]], TAROT_CARDS[picked[2]]]
}

export const SPREAD_POSITIONS = ['Past', 'Present', 'Future'] as const

// ─── API client ──────────────────────────────────────────────────────────────

export interface SpreadContext {
  name: string
  ascendant: string
  moonSign: string
  sunSign: string
}

export interface SpreadResult {
  body?: string
  locked?: boolean
  cost?: number
}

export async function getTarotSpread(args: {
  date: string
  cardIndices: [number, number, number]
  context: SpreadContext
  unlock?: boolean
}): Promise<SpreadResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in.')

  const res = await fetch(`${PROXY_BASE}/tarot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(args),
  })

  if (res.status === 402) {
    throw new Error("You're out of credits. Add a credit pack or go Premium to unlock this spread.")
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error ?? 'Could not load your spread.')
  }
  return res.json()
}
