/**
 * Concept articles for the /learn hub. Data-driven so adding an article is just
 * appending an entry here — the hub (LearnPage) and the article template
 * (ConceptPage) render from this list, each getting its own SEO'd URL.
 *
 * Strategy: lead with VEDIC concepts. Western astrology content is fiercely
 * contested; Vedic terms (nakshatra, dasha, kundli matching, Sade Sati…) have
 * real search volume and far less competition — that's where we can rank.
 */

export interface ConceptSection {
  heading: string
  /** Paragraphs; rendered as <p>. Keep plain text (no markdown). */
  body: string[]
}

export interface Concept {
  slug: string
  /** Card title on the hub + <h1> on the page. */
  title: string
  /** One-line hook shown on the hub card. */
  teaser: string
  emoji: string
  tradition: 'Vedic' | 'Western' | 'Both'
  seoTitle: string
  seoDescription: string
  intro: string
  sections: ConceptSection[]
  /** Slugs of related concepts to cross-link (internal linking = SEO). */
  related: string[]
}

export const CONCEPTS: Concept[] = [
  {
    slug: 'nakshatras',
    title: 'Nakshatras: The 27 Lunar Mansions',
    teaser: 'The finer, older layer beneath the 12 signs — and your deepest emotional signature.',
    emoji: '🌙',
    tradition: 'Vedic',
    seoTitle: 'Nakshatras Explained: The 27 Lunar Mansions of Vedic Astrology',
    seoDescription: 'What nakshatras are, how the 27 lunar mansions work, why your Moon nakshatra matters most, and how padas divide each one. A clear beginner-friendly guide.',
    intro: 'Long before the 12 zodiac signs, Vedic astrology mapped the sky into 27 nakshatras — "lunar mansions." Each is a 13°20′ slice of the zodiac the Moon passes through in roughly a day. They are a finer, more ancient layer than the signs, and in Vedic tradition your Moon\'s nakshatra is considered your deepest emotional and karmic signature.',
    sections: [
      {
        heading: 'What is a nakshatra?',
        body: [
          'The zodiac is a 360° circle. The 12 signs divide it into 30° segments; the 27 nakshatras divide the same circle into 13°20′ segments. Because the Moon travels about 13° a day, it spends roughly one day in each nakshatra — which is why the system is anchored to the Moon.',
          'Each nakshatra has a name, a ruling planet, a symbol, and a presiding deity, all of which color its meaning. For example, Rohini (a Taurus nakshatra) is symbolized by a cart and associated with growth and abundance; Ashwini (the first, in Aries) is symbolized by a horse\'s head and associated with speed and new beginnings.',
        ],
      },
      {
        heading: 'Why your Moon nakshatra matters most',
        body: [
          'In Western astrology the Sun sign is king. In Vedic astrology the Moon takes that role, because the mind and emotions — how you actually experience life day to day — are ruled by the Moon. Your Moon\'s nakshatra is therefore read as your core emotional nature.',
          'It also anchors your Vimshottari dasha, the timing system that maps out the chapters of your life. The nakshatra your Moon occupied at birth determines which planetary period you were born into and the whole sequence that follows.',
        ],
      },
      {
        heading: 'Padas: the four quarters',
        body: [
          'Each nakshatra is further divided into four padas (quarters) of 3°20′ each. Padas add precision — two people with their Moon in the same nakshatra but different padas can express its energy quite differently, and padas link the nakshatra to the Navamsa (D9) divisional chart used for deeper analysis.',
        ],
      },
    ],
    related: ['vimshottari-dasha', 'kundli-matching'],
  },
  {
    slug: 'vimshottari-dasha',
    title: 'Vimshottari Dasha: Your Life\'s Timeline',
    teaser: 'The Vedic timing system that maps which planet is shaping each chapter of your life.',
    emoji: '🕰️',
    tradition: 'Vedic',
    seoTitle: 'Vimshottari Dasha Explained: The Vedic Astrology Timing System',
    seoDescription: 'What Vimshottari dasha is, how the 120-year planetary cycle works, how your Moon nakshatra sets your starting period, and how mahadashas and antardashas shape your life.',
    intro: 'One of Vedic astrology\'s most distinctive tools is Vimshottari dasha — a system that assigns each period of your life to a ruling planet. Rather than reading only the fixed birth chart, dashas describe timing: which planet\'s themes are active now, and when the next chapter begins.',
    sections: [
      {
        heading: 'A 120-year cycle',
        body: [
          'Vimshottari dasha divides a notional 120-year human lifespan among nine planets (the seven classical planets plus the lunar nodes Rahu and Ketu). Each planet rules a period of a fixed length — Venus 20 years, Saturn 19, Mercury 17, and so on down to the Sun\'s 6 years.',
          'The planet whose "mahadasha" (major period) is running is considered the dominant influence on that stretch of your life, filtering its natural significations through where it sits in your chart.',
        ],
      },
      {
        heading: 'Where your first dasha comes from',
        body: [
          'Your starting period isn\'t random — it\'s set by your Moon\'s nakshatra at birth. Each nakshatra is ruled by one of the nine planets, and that ruler\'s dasha is the one you were born into, already partway through. The rest of the sequence follows in a fixed order from there.',
          'This is one reason the Moon and its nakshatra are so central in Vedic practice: they don\'t just describe your emotional nature, they set the clock for your whole life\'s timeline.',
        ],
      },
      {
        heading: 'Mahadashas and antardashas',
        body: [
          'Each major period (mahadasha) is subdivided into smaller sub-periods (antardashas or bhuktis) ruled by each of the nine planets in turn. So at any moment you\'re under a combination — for example a Jupiter major period with a Saturn sub-period — and astrologers read the interplay of the two to understand the flavor of the time.',
          'This nesting is what lets dasha analysis get specific about timing, rather than only describing lifelong tendencies.',
        ],
      },
    ],
    related: ['nakshatras', 'kundli-matching'],
  },
  {
    slug: 'kundli-matching',
    title: 'Kundli Matching (Guna Milan) for Compatibility',
    teaser: 'The traditional Vedic system for scoring how two charts fit — beyond a simple percentage.',
    emoji: '💞',
    tradition: 'Vedic',
    seoTitle: 'Kundli Matching Explained: Guna Milan & the 36 Gunas',
    seoDescription: 'How Vedic kundli matching (Guna Milan / Ashtakoot) works, what the 36 gunas measure, what score is considered good, and what the system does and doesn\'t tell you.',
    intro: 'Kundli matching — also called Guna Milan or Ashtakoot — is the traditional Vedic method for assessing compatibility between two people by comparing their birth charts. It\'s best known from the arranged-marriage tradition, but the underlying idea (comparing two Moons across several dimensions) is useful for any relationship.',
    sections: [
      {
        heading: 'The 36 gunas',
        body: [
          'Ashtakoot ("eight-fold") matching compares the two charts across eight factors, or koots, each weighted by a number of points. Together they add up to 36 possible points — the "36 gunas." The factors range from mental compatibility and temperament to health, values, and the dynamic of power in the relationship.',
          'Crucially, the comparison is based on each person\'s Moon sign and nakshatra, not their Sun sign — consistent with the Vedic emphasis on the Moon as the seat of the mind and emotions.',
        ],
      },
      {
        heading: 'What score is "good"?',
        body: [
          'Traditionally, a total of 18 out of 36 or above is considered an acceptable match, with higher scores seen as more harmonious. But the raw number is only a starting point. A skilled reading weighs which koots are strong or weak, checks for specific doshas (afflictions) such as Mangal dosha, and considers the charts as a whole rather than stopping at the tally.',
        ],
      },
      {
        heading: 'What it does and doesn\'t tell you',
        body: [
          'Guna Milan is a structured way to surface where two people naturally align and where they\'ll need to work — communication styles, emotional needs, shared values. What it isn\'t is a verdict. A modest score doesn\'t doom a relationship, and a high one doesn\'t guarantee ease; real relationships are built by real people.',
          'This is why a narrative, chart-aware reading tends to be more useful than a lone percentage — it tells you the "why" behind the compatibility, not just the score.',
        ],
      },
    ],
    related: ['nakshatras', 'vimshottari-dasha'],
  },
]

export function conceptBySlug(slug: string): Concept | undefined {
  return CONCEPTS.find(c => c.slug === slug)
}
