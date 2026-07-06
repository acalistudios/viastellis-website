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

export type TarotSuit = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'

export interface TarotCard {
  index: number
  name: string
  suit: TarotSuit
  /** Roman numeral for Major Arcana; pip label for Minor (e.g. "Ace", "7") */
  label: string
  keywords: [string, string, string]
  upright: string
}

export const TAROT_CARDS: TarotCard[] = [
  // Major Arcana
  { index: 0,  suit: 'major', label: '0',      name: 'The Fool',            keywords: ['beginnings', 'spontaneity', 'faith'],          upright: 'A fresh start and leap of faith opens limitless potential.' },
  { index: 1,  suit: 'major', label: 'I',      name: 'The Magician',        keywords: ['manifestation', 'resourcefulness', 'power'],   upright: 'You have every tool you need — direct your will and make it real.' },
  { index: 2,  suit: 'major', label: 'II',     name: 'The High Priestess',  keywords: ['intuition', 'mystery', 'inner knowing'],       upright: 'Trust what lies beneath the surface; your inner voice holds the answer.' },
  { index: 3,  suit: 'major', label: 'III',    name: 'The Empress',         keywords: ['abundance', 'nurturing', 'fertility'],         upright: 'Creation, growth, and sensual abundance flow through you now.' },
  { index: 4,  suit: 'major', label: 'IV',     name: 'The Emperor',         keywords: ['authority', 'structure', 'stability'],         upright: 'Build with discipline; strong foundations lead to lasting success.' },
  { index: 5,  suit: 'major', label: 'V',      name: 'The Hierophant',      keywords: ['tradition', 'guidance', 'belief'],             upright: 'Seek wisdom from established teachings or a trusted mentor.' },
  { index: 6,  suit: 'major', label: 'VI',     name: 'The Lovers',          keywords: ['union', 'values', 'choice'],                   upright: 'A meaningful choice or connection asks you to align with your deepest values.' },
  { index: 7,  suit: 'major', label: 'VII',    name: 'The Chariot',         keywords: ['willpower', 'determination', 'victory'],       upright: 'Harness opposing forces and charge forward with focused intention.' },
  { index: 8,  suit: 'major', label: 'VIII',   name: 'Strength',            keywords: ['courage', 'patience', 'compassion'],           upright: 'Gentle inner strength and quiet courage carry you through.' },
  { index: 9,  suit: 'major', label: 'IX',     name: 'The Hermit',          keywords: ['solitude', 'introspection', 'guidance'],       upright: 'Withdraw to seek inner truth; the answer lives within.' },
  { index: 10, suit: 'major', label: 'X',      name: 'Wheel of Fortune',    keywords: ['cycles', 'luck', 'turning point'],             upright: "Life's wheel turns; a significant cycle shifts in your favor." },
  { index: 11, suit: 'major', label: 'XI',     name: 'Justice',             keywords: ['fairness', 'truth', 'cause and effect'],       upright: 'Balanced action and honest assessment bring the right outcome.' },
  { index: 12, suit: 'major', label: 'XII',    name: 'The Hanged Man',      keywords: ['pause', 'surrender', 'new perspective'],       upright: 'Let go and see from a new angle; the pause itself is the wisdom.' },
  { index: 13, suit: 'major', label: 'XIII',   name: 'Death',               keywords: ['transition', 'endings', 'transformation'],     upright: 'Something must end so something far greater can begin.' },
  { index: 14, suit: 'major', label: 'XIV',    name: 'Temperance',          keywords: ['balance', 'moderation', 'patience'],           upright: 'Blend extremes with grace; steady patience yields true alchemy.' },
  { index: 15, suit: 'major', label: 'XV',     name: 'The Devil',           keywords: ['bondage', 'materialism', 'shadow'],            upright: 'Examine what binds you; awareness is the first step to freedom.' },
  { index: 16, suit: 'major', label: 'XVI',    name: 'The Tower',           keywords: ['upheaval', 'revelation', 'awakening'],         upright: 'Sudden disruption clears the ground for authentic rebuilding.' },
  { index: 17, suit: 'major', label: 'XVII',   name: 'The Star',            keywords: ['hope', 'healing', 'renewal'],                  upright: 'After the storm, renewed hope and healing light your way.' },
  { index: 18, suit: 'major', label: 'XVIII',  name: 'The Moon',            keywords: ['illusion', 'fear', 'subconscious'],            upright: 'Not all is as it seems; navigate by feeling, not logic alone.' },
  { index: 19, suit: 'major', label: 'XIX',    name: 'The Sun',             keywords: ['joy', 'success', 'vitality'],                  upright: 'Radiant clarity, success, and joy illuminate every step.' },
  { index: 20, suit: 'major', label: 'XX',     name: 'Judgement',           keywords: ['reflection', 'reckoning', 'absolution'],       upright: 'An honest reckoning leads to release and a higher calling.' },
  { index: 21, suit: 'major', label: 'XXI',    name: 'The World',           keywords: ['completion', 'integration', 'wholeness'],      upright: 'A cycle completes in triumph; you are ready for the next level.' },
  // Wands
  { index: 22, suit: 'wands', label: 'Ace',    name: 'Ace of Wands',        keywords: ['inspiration', 'spark', 'potential'],           upright: 'A creative spark ignites — seize this surge of energy.' },
  { index: 23, suit: 'wands', label: '2',      name: 'Two of Wands',        keywords: ['planning', 'vision', 'expansion'],             upright: 'Plan boldly; the world opens up before your eyes.' },
  { index: 24, suit: 'wands', label: '3',      name: 'Three of Wands',      keywords: ['progress', 'foresight', 'enterprise'],         upright: 'Your efforts expand; watch your plans come to fruition.' },
  { index: 25, suit: 'wands', label: '4',      name: 'Four of Wands',       keywords: ['celebration', 'harmony', 'homecoming'],        upright: 'Celebrate a milestone; joy and community surround you.' },
  { index: 26, suit: 'wands', label: '5',      name: 'Five of Wands',       keywords: ['conflict', 'competition', 'diversity'],        upright: 'Healthy competition or friction sharpens your edge.' },
  { index: 27, suit: 'wands', label: '6',      name: 'Six of Wands',        keywords: ['victory', 'recognition', 'confidence'],        upright: 'Public recognition and well-earned victory are yours.' },
  { index: 28, suit: 'wands', label: '7',      name: 'Seven of Wands',      keywords: ['perseverance', 'defense', 'challenge'],        upright: 'Hold your ground with confidence against challengers.' },
  { index: 29, suit: 'wands', label: '8',      name: 'Eight of Wands',      keywords: ['speed', 'movement', 'momentum'],               upright: 'Events accelerate; swift action and communication are favored.' },
  { index: 30, suit: 'wands', label: '9',      name: 'Nine of Wands',       keywords: ['resilience', 'courage', 'persistence'],        upright: "You're nearly there — one final push draws on all your resilience." },
  { index: 31, suit: 'wands', label: '10',     name: 'Ten of Wands',        keywords: ['burden', 'responsibility', 'completion'],      upright: 'Lighten your load; release or delegate what no longer serves.' },
  { index: 32, suit: 'wands', label: 'Page',   name: 'Page of Wands',       keywords: ['enthusiasm', 'exploration', 'discovery'],      upright: 'Embrace a new passion with adventurous, open-hearted curiosity.' },
  { index: 33, suit: 'wands', label: 'Knight', name: 'Knight of Wands',     keywords: ['action', 'adventure', 'impulsiveness'],        upright: 'Channel fiery drive into bold action, but temper impulsiveness.' },
  { index: 34, suit: 'wands', label: 'Queen',  name: 'Queen of Wands',      keywords: ['confidence', 'warmth', 'determination'],       upright: 'Lead with vibrant confidence, warmth, and fierce independence.' },
  { index: 35, suit: 'wands', label: 'King',   name: 'King of Wands',       keywords: ['vision', 'leadership', 'entrepreneur'],        upright: 'Visionary leadership and bold entrepreneurial energy guide you.' },
  // Cups
  { index: 36, suit: 'cups',  label: 'Ace',    name: 'Ace of Cups',         keywords: ['love', 'new feelings', 'compassion'],          upright: 'A flood of new love, creativity, or emotional insight arrives.' },
  { index: 37, suit: 'cups',  label: '2',      name: 'Two of Cups',         keywords: ['partnership', 'connection', 'unity'],          upright: 'A meaningful bond forms in mutual respect and deep attraction.' },
  { index: 38, suit: 'cups',  label: '3',      name: 'Three of Cups',       keywords: ['friendship', 'celebration', 'community'],      upright: 'Gather your people; joy and shared celebration overflow.' },
  { index: 39, suit: 'cups',  label: '4',      name: 'Four of Cups',        keywords: ['contemplation', 'apathy', 'reevaluation'],     upright: 'Look up from brooding — a quiet new opportunity waits unnoticed.' },
  { index: 40, suit: 'cups',  label: '5',      name: 'Five of Cups',        keywords: ['loss', 'grief', 'regret'],                     upright: 'Mourn what was lost, then turn gently toward what still remains.' },
  { index: 41, suit: 'cups',  label: '6',      name: 'Six of Cups',         keywords: ['nostalgia', 'childhood', 'innocence'],         upright: 'Fond memories and kindness from the past bring unexpected healing.' },
  { index: 42, suit: 'cups',  label: '7',      name: 'Seven of Cups',       keywords: ['choices', 'fantasy', 'illusion'],              upright: 'Many options, some illusory — discern clearly what is truly real.' },
  { index: 43, suit: 'cups',  label: '8',      name: 'Eight of Cups',       keywords: ['moving on', 'withdrawal', 'seeking'],          upright: 'Leave what no longer fulfills; deeper meaning awaits.' },
  { index: 44, suit: 'cups',  label: '9',      name: 'Nine of Cups',        keywords: ['contentment', 'satisfaction', 'gratitude'],    upright: 'Your wishes manifest; savor this rare moment of fulfillment.' },
  { index: 45, suit: 'cups',  label: '10',     name: 'Ten of Cups',         keywords: ['harmony', 'happiness', 'alignment'],           upright: 'Deep happiness and emotional fulfillment bless your relationships.' },
  { index: 46, suit: 'cups',  label: 'Page',   name: 'Page of Cups',        keywords: ['creativity', 'intuition', 'sensitivity'],      upright: 'Embrace intuitive messages and let creativity flow freely.' },
  { index: 47, suit: 'cups',  label: 'Knight', name: 'Knight of Cups',      keywords: ['romance', 'charm', 'following the heart'],     upright: 'Follow your heart on a quest for beauty and deep feeling.' },
  { index: 48, suit: 'cups',  label: 'Queen',  name: 'Queen of Cups',       keywords: ['empathy', 'nurturing', 'intuitive'],           upright: 'Lead from the heart with deep empathy and fluid intuition.' },
  { index: 49, suit: 'cups',  label: 'King',   name: 'King of Cups',        keywords: ['emotional balance', 'compassion', 'wisdom'],   upright: 'Calm, compassionate wisdom guides you through emotional waters.' },
  // Swords
  { index: 50, suit: 'swords', label: 'Ace',    name: 'Ace of Swords',       keywords: ['clarity', 'breakthrough', 'truth'],            upright: 'Mental clarity cuts through confusion — speak and act with truth.' },
  { index: 51, suit: 'swords', label: '2',      name: 'Two of Swords',       keywords: ['indecision', 'stalemate', 'truce'],            upright: "A difficult choice is deferred; face the truth you've been avoiding." },
  { index: 52, suit: 'swords', label: '3',      name: 'Three of Swords',     keywords: ['heartbreak', 'grief', 'sorrow'],               upright: 'Pain must be felt before it can heal; allow the release.' },
  { index: 53, suit: 'swords', label: '4',      name: 'Four of Swords',      keywords: ['rest', 'recovery', 'contemplation'],           upright: 'Rest and withdraw; recuperation now powers future action.' },
  { index: 54, suit: 'swords', label: '5',      name: 'Five of Swords',      keywords: ['conflict', 'defeat', 'betrayal'],              upright: 'Pick your battles wisely; hollow victories cost more than they gain.' },
  { index: 55, suit: 'swords', label: '6',      name: 'Six of Swords',       keywords: ['transition', 'healing', 'moving away'],        upright: 'Leave troubled waters behind; calmer shores await ahead.' },
  { index: 56, suit: 'swords', label: '7',      name: 'Seven of Swords',     keywords: ['deception', 'strategy', 'cunning'],            upright: 'Tactics and careful strategy are needed; stay alert to deception.' },
  { index: 57, suit: 'swords', label: '8',      name: 'Eight of Swords',     keywords: ['restriction', 'self-limiting', 'imprisonment'], upright: 'The cage is largely mental — your freedom is closer than you think.' },
  { index: 58, suit: 'swords', label: '9',      name: 'Nine of Swords',      keywords: ['anxiety', 'nightmares', 'worry'],              upright: 'Fear amplifies in the dark; seek perspective and reach for support.' },
  { index: 59, suit: 'swords', label: '10',     name: 'Ten of Swords',       keywords: ['endings', 'betrayal', 'rock bottom'],          upright: 'A painful end fully clears the way for a genuine new beginning.' },
  { index: 60, suit: 'swords', label: 'Page',   name: 'Page of Swords',      keywords: ['curiosity', 'vigilance', 'mental agility'],    upright: 'Stay sharp, ask questions, and approach challenges with agility.' },
  { index: 61, suit: 'swords', label: 'Knight', name: 'Knight of Swords',    keywords: ['ambition', 'speed', 'assertiveness'],          upright: 'Charge forward with fierce ambition, but think before you act.' },
  { index: 62, suit: 'swords', label: 'Queen',  name: 'Queen of Swords',     keywords: ['perception', 'independence', 'directness'],    upright: 'Cut through illusion with clear perception and direct speech.' },
  { index: 63, suit: 'swords', label: 'King',   name: 'King of Swords',      keywords: ['authority', 'clarity', 'intellect'],           upright: 'Lead with sharp intellect, fairness, and ethical authority.' },
  // Pentacles
  { index: 64, suit: 'pentacles', label: 'Ace',    name: 'Ace of Pentacles',    keywords: ['opportunity', 'prosperity', 'new path'],       upright: 'A tangible new opportunity for abundance plants its seed today.' },
  { index: 65, suit: 'pentacles', label: '2',      name: 'Two of Pentacles',    keywords: ['balance', 'adaptability', 'juggling'],         upright: 'Stay flexible and balanced as you manage competing priorities.' },
  { index: 66, suit: 'pentacles', label: '3',      name: 'Three of Pentacles',  keywords: ['teamwork', 'skill', 'collaboration'],          upright: 'Skilled collaboration and craftsmanship produce outstanding results.' },
  { index: 67, suit: 'pentacles', label: '4',      name: 'Four of Pentacles',   keywords: ['security', 'control', 'conservation'],         upright: 'Guard your resources, but beware of clinging too tightly.' },
  { index: 68, suit: 'pentacles', label: '5',      name: 'Five of Pentacles',   keywords: ['hardship', 'isolation', 'worry'],              upright: 'Seek help and community; support is available if you only ask.' },
  { index: 69, suit: 'pentacles', label: '6',      name: 'Six of Pentacles',    keywords: ['generosity', 'charity', 'sharing'],            upright: 'Give and receive with grace; generosity flows in both directions.' },
  { index: 70, suit: 'pentacles', label: '7',      name: 'Seven of Pentacles',  keywords: ['patience', 'investment', 'assessment'],        upright: 'Pause to assess your harvest; patient tending yields real results.' },
  { index: 71, suit: 'pentacles', label: '8',      name: 'Eight of Pentacles',  keywords: ['diligence', 'mastery', 'skill'],               upright: 'Focused, dedicated practice builds true mastery over time.' },
  { index: 72, suit: 'pentacles', label: '9',      name: 'Nine of Pentacles',   keywords: ['abundance', 'self-sufficiency', 'luxury'],     upright: 'Independent prosperity and refined enjoyment are well deserved.' },
  { index: 73, suit: 'pentacles', label: '10',     name: 'Ten of Pentacles',    keywords: ['legacy', 'family', 'long-term success'],       upright: 'Lasting wealth, family harmony, and a meaningful legacy await.' },
  { index: 74, suit: 'pentacles', label: 'Page',   name: 'Page of Pentacles',   keywords: ['ambition', 'learning', 'groundedness'],        upright: 'Approach a practical goal with diligent, grounded study.' },
  { index: 75, suit: 'pentacles', label: 'Knight', name: 'Knight of Pentacles', keywords: ['hard work', 'reliability', 'routine'],         upright: 'Steady, methodical effort and reliability carry you to success.' },
  { index: 76, suit: 'pentacles', label: 'Queen',  name: 'Queen of Pentacles',  keywords: ['nurturing', 'practicality', 'abundance'],      upright: 'Nurture your resources and loved ones with warm practicality.' },
  { index: 77, suit: 'pentacles', label: 'King',   name: 'King of Pentacles',   keywords: ['wealth', 'security', 'success'],               upright: 'Disciplined stewardship of resources creates enduring security.' },
]

/**
 * Reversed (upside-down) meanings, keyed by card index. A reversed card softens,
 * blocks, or inverts its upright message — same authorial voice as `upright`.
 */
export const REVERSED_MEANINGS: Record<number, string> = {
  // Major Arcana
  0:  'Recklessness or hesitation — look before you leap, or you may freeze at the edge.',
  1:  'Scattered energy or manipulation; the power is there but misdirected.',
  2:  'Ignored intuition and hidden truths; you are out of touch with your inner voice.',
  3:  'Creative block or smothering; nurture yourself before pouring into others.',
  4:  'Rigidity or control; structure has hardened into domination.',
  5:  'Rebellion against convention; question the dogma and find your own path.',
  6:  'Disharmony or misaligned values; a bond or choice is out of balance.',
  7:  'Loss of direction or willpower; you are pulling against yourself.',
  8:  'Self-doubt or raw impulse; inner courage wavers under pressure.',
  9:  'Isolation or avoidance; withdrawal has tipped into loneliness.',
  10: 'Resisting change or poor timing; the wheel turns against your grip.',
  11: 'Unfairness or dodged accountability; the scales are skewed.',
  12: 'Stalling or needless sacrifice; you are stuck rather than surrendered.',
  13: 'Clinging to what must end; resistance only prolongs the change.',
  14: 'Imbalance or excess; patience has given way to extremes.',
  15: 'Breaking free from what binds you; the chains are loosening.',
  16: 'Delayed upheaval or fear of change; disaster avoided is only postponed.',
  17: 'Fading hope or self-doubt; reconnect with faith after disappointment.',
  18: 'The fog is lifting — or deepening; illusion and clarity trade places.',
  19: 'Dimmed joy or delayed success; the light is temporarily clouded.',
  20: 'Self-doubt or ignoring the call; a reckoning is being avoided.',
  21: 'Loose ends and near-completion; the cycle is almost, but not yet, whole.',
  // Wands
  22: 'A false start or creative block; the spark sputters before it catches.',
  23: 'Fear of the unknown or thin planning; the vision stays on paper.',
  24: 'Delays or narrow foresight; expansion meets unexpected obstacles.',
  25: 'Fragile foundations or a muted celebration; harmony feels incomplete.',
  26: 'Avoided conflict or inner tension; the friction has turned inward.',
  27: 'Little recognition or wounded ego; victory feels hollow or unsure.',
  28: 'Overwhelm or losing ground; standing firm has grown exhausting.',
  29: 'Delays and crossed wires; momentum stalls and messages misfire.',
  30: 'Depleted resilience or defensiveness; you are guarded past the point of use.',
  31: 'Burnout or refusing to delegate; the load has become too much to carry.',
  32: 'Aimless enthusiasm or bad news; passion without direction.',
  33: 'Recklessness or frustration; drive curdles into haste and conflict.',
  34: 'Insecurity or jealousy; confidence masks quiet self-doubt.',
  35: 'Domineering or impulsive leadership; vision without patience.',
  // Cups
  36: 'Blocked or repressed emotion; the heart holds back what it feels.',
  37: 'Disharmony or broken trust; a bond is strained or one-sided.',
  38: 'Overindulgence or gossip; celebration tips into excess.',
  39: 'A quiet turn inward; you withdraw to reflect and reassess what truly matters.',
  40: 'Acceptance and self-forgiveness; you make peace with past mistakes and turn toward what remains.',
  41: 'Stuck in the past or naive nostalgia; memory clouds the present.',
  42: 'Clarity emerging, or lost in illusion; scattered choices come into focus.',
  43: 'Fear of moving on, or aimless drifting; you linger where you should not.',
  44: 'Smugness or a wish unfulfilled; contentment rings shallow.',
  45: 'Disconnection or strained harmony; the ideal and the real diverge.',
  46: 'Emotional immaturity or creative block; feelings are unclear or stuck.',
  47: 'Moodiness or unrealistic ideals; the heart leads you astray.',
  48: 'Emotional overwhelm or dependency; empathy tips into martyrdom.',
  49: 'Suppressed feeling or volatility; the calm surface hides turbulence.',
  // Swords
  50: 'Confusion or misused logic; clarity is clouded and truth twisted.',
  51: 'The stalemate breaking, or information overload; a choice can no longer wait.',
  52: 'Healing from heartbreak, or gripping the pain; the wound begins to close.',
  53: 'Restlessness or forced rest; recovery is resisted or overdue.',
  54: 'A chance to reconcile, or lingering conflict; lay down the sword.',
  55: 'Resistance to change or an unfinished passage; troubled waters linger.',
  56: 'Coming clean, or deeper deceit; hidden motives rise to the surface.',
  57: 'Freeing yourself, or deeper entrapment; the mental cage is opening.',
  58: 'Anxiety easing, or dread at its peak; fear loosens or tightens its hold.',
  59: 'Recovery and survival; the worst is behind you and you begin to rise.',
  60: 'Scattered thinking or deception; curiosity sours into cynicism.',
  61: 'Recklessness or aggression; haste overrides good judgment.',
  62: 'Coldness or harsh judgment; clarity has hardened into cruelty.',
  63: 'Manipulation or misused authority; intellect without compassion.',
  // Pentacles
  64: 'A missed opportunity or poor investment; prosperity slips through your fingers.',
  65: 'Overwhelm or lost balance; juggling too much, you drop something.',
  66: 'Weak teamwork or unready skill; the collaboration falters.',
  67: 'Greed or reckless spending; you grasp too tightly, or let go too loosely.',
  68: 'Recovery from hardship, or deepening worry; help is near if you look up.',
  69: 'Strings-attached giving or debt; the exchange has become unequal.',
  70: 'Impatience or wasted effort; the harvest disappoints.',
  71: 'Cut corners or lost focus; mastery stalls without care.',
  72: 'Overwork or hollow luxury; independence has begun to isolate.',
  73: 'Family friction or fleeting wealth; the legacy stands on unstable ground.',
  74: 'Distraction or squandered potential; goals go unpursued.',
  75: 'Stagnation or boredom; reliability has hardened into a rut.',
  76: 'Self-neglect or smothering; you nurture everyone but yourself.',
  77: 'Greed or control disguised as security; wealth becomes an anchor.',
}

/** The meaning to show for a card in a given orientation. */
export function cardMeaning(card: TarotCard, reversed: boolean): string {
  return reversed ? (REVERSED_MEANINGS[card.index] ?? card.upright) : card.upright
}

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

/**
 * 3 unique cards for this user on this date (deterministic).
 * `excludeIndices` (e.g. today's daily card) are skipped so the spread never
 * repeats a card already shown — the daily draw + spread act as one 78-card deck.
 */
export function getSpreadCards(
  userId: string,
  dateStr: string,
  excludeIndices: number[] = [],
): [TarotCard, TarotCard, TarotCard] {
  let n = strHash(userId + dateStr)
  const used = new Set(excludeIndices)
  const picked: number[] = []
  while (picked.length < 3) {
    n = lcg(n)
    const idx = n % 78
    if (!used.has(idx)) {
      used.add(idx)
      picked.push(idx)
    }
  }
  return [TAROT_CARDS[picked[0]], TAROT_CARDS[picked[1]], TAROT_CARDS[picked[2]]]
}

export const SPREAD_POSITIONS = ['Past', 'Present', 'Future'] as const

/**
 * ~20% of cards drawn come up reversed — the common tarot convention of
 * "reverse roughly a fifth of the deck" (reversals as punctuation, not the norm).
 * strHash's low bit is just a char-code parity (skewed), so fold the well-mixed
 * high bits down first, then take 1-in-5.
 */
const REVERSAL_DENOMINATOR = 5 // 1 / 5 = 20%
function isReversedFor(seed: string): boolean {
  let h = strHash(seed)
  h ^= h >>> 16
  return (h >>> 0) % REVERSAL_DENOMINATOR === 0
}

/** Whether today's shared daily card is reversed (same for everyone, by date). */
export function isDailyReversed(dateStr: string): boolean {
  return isReversedFor(dateStr + '|rev')
}

/** Reversed flags for the 3 spread cards (deterministic per user+date). */
export function getSpreadReversed(userId: string, dateStr: string): [boolean, boolean, boolean] {
  return [0, 1, 2].map(
    (i) => isReversedFor(`${userId}|${dateStr}|rev|${i}`),
  ) as [boolean, boolean, boolean]
}

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
  reversed?: [boolean, boolean, boolean]
  /** Canonical per-card meanings (upright/reversed) — ground truth for the AI. */
  meanings?: [string, string, string]
  /** Compact "about the seeker" block from buildPersonaContext (may be ''). */
  persona?: string
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
