/**
 * Pythagorean numerology calculations from birth date + name.
 * Purely deterministic — no API calls, no credits.
 */

// Pythagorean letter values
const LETTER_VALUE: Record<string, number> = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8,
}
const VOWELS = new Set(['A','E','I','O','U'])

function sumDigits(n: number): number {
  return String(n).split('').reduce((s, d) => s + Number(d), 0)
}

/** Reduce to single digit, preserving master numbers 11, 22, 33. */
function reduce(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = sumDigits(n)
  }
  return n
}

export function lifePathNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-')
  return reduce(
    reduce(Number(m)) +
    reduce(Number(d)) +
    reduce(sumDigits(Number(y)))
  )
}

function nameSum(name: string, filter?: (ch: string) => boolean): number {
  return name.toUpperCase().split('').reduce((s, ch) => {
    const v = LETTER_VALUE[ch]
    if (!v) return s
    if (filter && !filter(ch)) return s
    return s + v
  }, 0)
}

/** Expression (Destiny) — full name. */
export function expressionNumber(name: string): number {
  return reduce(nameSum(name))
}

/** Soul Urge (Heart's Desire) — vowels only. */
export function soulUrgeNumber(name: string): number {
  return reduce(nameSum(name, ch => VOWELS.has(ch)))
}

/** Personality — consonants only. */
export function personalityNumber(name: string): number {
  return reduce(nameSum(name, ch => !VOWELS.has(ch)))
}

/** Birthday — the day of birth reduced. */
export function birthdayNumber(dateStr: string): number {
  return reduce(Number(dateStr.split('-')[2]))
}

// ─── Meanings ────────────────────────────────────────────────────────────────

export interface NumberMeaning {
  title: string
  keywords: [string, string, string]
  body: string
}

export const NUMBER_MEANINGS: Record<number, NumberMeaning> = {
  1: {
    title: 'The Pioneer',
    keywords: ['independence', 'leadership', 'originality'],
    body: 'You are here to forge your own path. A natural pioneer with strong instincts, you thrive when you trust your ideas and step into leadership. Your growth edge is channelling self-reliance without isolation.',
  },
  2: {
    title: 'The Peacemaker',
    keywords: ['harmony', 'diplomacy', 'sensitivity'],
    body: 'Cooperation and emotional attunement are your gifts. You read rooms effortlessly and build bridges between opposing views. Your growth edge is honouring your own needs as steadily as you honour others\' ',
  },
  3: {
    title: 'The Creator',
    keywords: ['creativity', 'expression', 'joy'],
    body: 'You are here to express, create, and uplift. Words, art, and ideas flow through you with unusual ease. Your growth edge is focusing your abundant creative energy rather than scattering it across too many ventures.',
  },
  4: {
    title: 'The Builder',
    keywords: ['stability', 'discipline', 'reliability'],
    body: 'You are the foundation others depend on. Methodical and trustworthy, you build things designed to last. Your growth edge is embracing flexibility — structures serve you best when they can adapt.',
  },
  5: {
    title: 'The Freedom Seeker',
    keywords: ['freedom', 'adventure', 'adaptability'],
    body: 'Change is your natural element. You bring excitement and fresh perspective wherever you go. Your growth edge is cultivating commitment and discerning when freedom of movement is wisdom versus avoidance.',
  },
  6: {
    title: 'The Nurturer',
    keywords: ['love', 'responsibility', 'harmony'],
    body: 'Service and love are your calling. You create warmth, beauty, and belonging in every space you inhabit. Your growth edge is giving without self-erasure and accepting that imperfection is still worthy of love.',
  },
  7: {
    title: 'The Seeker',
    keywords: ['wisdom', 'intuition', 'introspection'],
    body: 'You are drawn to life\'s deeper mysteries. A natural analyst and philosopher, you recharge in solitude and arrive at truths others overlook. Your growth edge is trusting — and sharing — the insights you find.',
  },
  8: {
    title: 'The Powerhouse',
    keywords: ['abundance', 'authority', 'achievement'],
    body: 'You are here to master the material world. Ambitious, capable, and built for responsibility, you understand power and how to wield it effectively. Your growth edge is balancing outer success with inner wisdom.',
  },
  9: {
    title: 'The Humanitarian',
    keywords: ['compassion', 'wisdom', 'completion'],
    body: 'You carry the wisdom of all numbers. Compassionate and idealistic, you are here to serve on a broad scale and help others complete cycles. Your growth edge is releasing attachment — endings are part of your gift.',
  },
  11: {
    title: 'The Illuminator',
    keywords: ['inspiration', 'intuition', 'spiritual vision'],
    body: 'As a master number, 11 brings heightened intuition and a calling to inspire. You sense what others cannot and can uplift whole rooms simply by being present. Your growth edge is grounding this intensity without dimming your light.',
  },
  22: {
    title: 'The Master Builder',
    keywords: ['vision', 'mastery', 'legacy'],
    body: 'The most powerful master number combines grand vision with the capacity to make it real. You are built to create systems and structures that benefit many. Your growth edge is carrying this immense potential with patience and humility.',
  },
  33: {
    title: 'The Master Teacher',
    keywords: ['compassion', 'healing', 'service'],
    body: 'The rarest master number embodies unconditional love and healing in service to others. You are here to uplift through compassion and wisdom at scale. Your growth edge is living fully what you teach.',
  },
}
