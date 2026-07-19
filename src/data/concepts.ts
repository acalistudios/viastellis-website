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
  {
    slug: 'sade-sati',
    title: 'Sade Sati: Saturn\'s 7½-Year Passage',
    teaser: 'Saturn\'s long transit over the signs around your Moon — a maturation, not a curse.',
    emoji: '🪐',
    tradition: 'Vedic',
    seoTitle: 'Sade Sati Explained: Saturn\'s 7.5-Year Transit Over Your Moon',
    seoDescription: 'What Sade Sati is, how the 7.5-year Saturn transit works, its three 2.5-year phases, and why it\'s a period of maturation rather than misfortune.',
    intro: 'Few terms in Vedic astrology carry as much dread as Sade Sati — and most of that dread is misplaced. Sade Sati is the roughly seven-and-a-half-year period when Saturn transits the three signs centered on your natal Moon. It has a reputation as a hard time, but its real theme is maturation: pruning what isn\'t working so something sturdier can grow.',
    sections: [
      {
        heading: 'What Sade Sati actually is',
        body: [
          'Saturn takes about 2½ years to move through each zodiac sign. Sade Sati begins when Saturn enters the sign just before your natal Moon\'s sign, continues across the Moon\'s own sign, and ends as Saturn leaves the sign just after — three signs, about 7½ years in total. "Sade Sati" literally means "seven and a half."',
          'Because it is measured from the Moon (the mind and emotions in Vedic astrology), Sade Sati is felt inwardly — in mood, responsibilities, and sense of security — more than as external events alone.',
        ],
      },
      {
        heading: 'The three phases',
        body: [
          'The rising phase (Saturn in the 12th sign from your Moon) tends to bring endings, expenses, and a sense of things winding down. The peak phase (Saturn over your Moon sign) is the most intense — pressure on identity, health, and emotional footing. The setting phase (Saturn in the 2nd sign from your Moon) is about rebuilding, often around family, finances, and speech.',
          'Each phase lasts roughly 2½ years, and their flavor depends heavily on where Saturn sits in your chart and whether it is otherwise strong or weak.',
        ],
      },
      {
        heading: 'Maturation, not misfortune',
        body: [
          'Saturn is the planet of discipline, time, and consequence. Its transits ask you to get honest, do the work, and let go of what you\'ve outgrown. People often emerge from Sade Sati more grounded, more capable, and clearer about what matters — precisely because the period stripped away what didn\'t.',
          'Traditional practice offers remedies (Saturn-related charity, discipline, patience), but the healthiest frame is simple: treat it as a season of pruning and consolidation rather than a verdict.',
        ],
      },
    ],
    related: ['vimshottari-dasha', 'nakshatras'],
  },
  {
    slug: 'astrology-houses',
    title: 'The 12 Houses of the Birth Chart',
    teaser: 'How the sky maps onto the areas of your life — from self and money to career and the unseen.',
    emoji: '🏠',
    tradition: 'Both',
    seoTitle: 'The 12 Houses in Astrology Explained (Vedic & Western)',
    seoDescription: 'What the 12 astrological houses mean, what each one governs from the 1st to the 12th, and how Vedic Whole Sign houses differ from Western Placidus houses.',
    intro: 'If the signs describe how planetary energy expresses, the twelve houses describe where — which area of life it plays out in. The houses are a wheel laid over your birth chart, each governing a domain: self, money, communication, home, and so on around to the twelfth. Together they turn a snapshot of the sky into a map of a life.',
    sections: [
      {
        heading: 'What the houses are',
        body: [
          'The houses are twelve divisions of the chart anchored to the horizon at your birth — which is why your birth time and place matter for them. The first house begins at your Ascendant (rising sign) and the rest follow in order. A planet\'s house placement tells you which part of life it most colors.',
          'An empty house isn\'t a problem — with far more houses than planets, every chart has several empty ones, and they simply run on the quieter influence of their ruling sign and planet.',
        ],
      },
      {
        heading: 'What each house rules',
        body: [
          '1st: self, body, vitality. 2nd: money, possessions, values. 3rd: communication, siblings, courage. 4th: home, family, roots. 5th: creativity, romance, children. 6th: work, health, service. 7th: partnership, marriage, contracts. 8th: transformation, shared resources, the hidden. 9th: philosophy, higher learning, fortune. 10th: career, reputation, public role. 11th: gains, friendships, community. 12th: solitude, spirituality, letting go.',
          'Reading a chart is largely about combining these three layers: the planet (what), the sign (how), and the house (where).',
        ],
      },
      {
        heading: 'Whole Sign vs Placidus',
        body: [
          'The two traditions divide the houses differently. Classical Vedic astrology uses Whole Sign houses — each house is exactly one sign, and the sign of your Ascendant becomes the entire first house. Modern Western astrology usually uses Placidus, where houses are unequal wedges based on the movement of the sky, so a single house can span parts of two signs.',
          'Neither is "correct" — they answer slightly different questions, which is one reason your placements can look different across the two systems.',
        ],
      },
    ],
    related: ['rising-sign', 'big-three'],
  },
  {
    slug: 'rising-sign',
    title: 'Your Rising Sign (Ascendant / Lagna)',
    teaser: 'The sign on the horizon at your birth — your outward self, and why the exact minute matters.',
    emoji: '🌅',
    tradition: 'Both',
    seoTitle: 'Rising Sign Explained: What Your Ascendant (Lagna) Means',
    seoDescription: 'What your rising sign (Ascendant / Lagna) is, why it needs an accurate birth time, how it shapes your outward self, and how the Vedic Lagna differs from the Western Ascendant.',
    intro: 'Your Sun sign gets all the attention, but many astrologers consider your rising sign just as important. Also called the Ascendant (in Western astrology) or Lagna (in Vedic), it\'s the zodiac sign that was climbing over the eastern horizon at the exact moment you were born — and it sets the entire framework of your chart.',
    sections: [
      {
        heading: 'What the rising sign is',
        body: [
          'As the Earth turns, a new sign rises on the eastern horizon roughly every two hours. The one rising at your birth is your Ascendant. It is read as your outward personality — the first impression you give, your instinctive way of meeting the world, and often your physical style and vitality.',
          'It also anchors the houses: your rising sign becomes your first house, which then sets where every other area of life falls in your chart.',
        ],
      },
      {
        heading: 'Why birth time matters so much',
        body: [
          'Because the Ascendant changes every couple of hours, it is the single most time-sensitive point in your chart. An accurate birth time — ideally to the minute — is what makes your rising sign and your houses reliable. If your time is unknown, astrologers can still read your planetary signs, but they\'ll usually skip the Ascendant and houses rather than guess.',
          'This is why two people born on the same day can have very different charts: same Sun sign, but potentially a completely different rising sign and house layout.',
        ],
      },
      {
        heading: 'Vedic Lagna vs Western Ascendant',
        body: [
          'The concept is the same in both systems — the sign rising in the east — but the zodiac differs. Vedic astrology uses the sidereal zodiac, so your Lagna may fall in a different sign than your tropical Western Ascendant. In Vedic practice the Lagna is especially central: it\'s the reference point for the entire chart and for many predictive techniques.',
        ],
      },
    ],
    related: ['big-three', 'astrology-houses'],
  },
  {
    slug: 'mangal-dosha',
    title: 'Mangal Dosha (Manglik) Explained',
    teaser: 'What it means to be "Manglik," how it\'s assessed, and why it\'s far less alarming than its reputation.',
    emoji: '♂',
    tradition: 'Vedic',
    seoTitle: 'Mangal Dosha (Manglik) Explained: What It Is & How It\'s Assessed',
    seoDescription: 'What Mangal Dosha (being Manglik) means in Vedic astrology, which houses cause it, how cancellations work, and a level-headed perspective on marriage compatibility.',
    intro: 'Mangal Dosha — being "Manglik" — is one of the most talked-about factors in Vedic marriage matching, and one of the most misunderstood. It refers to a specific placement of Mars in the birth chart, traditionally thought to affect the harmony of marriage. In practice, it\'s common, frequently cancelled, and rarely the dealbreaker it\'s made out to be.',
    sections: [
      {
        heading: 'What Mangal Dosha is',
        body: [
          'A person is considered Manglik when Mars sits in certain houses of the chart — most commonly the 1st, 4th, 7th, 8th, or 12th (counted from the Ascendant, and often also checked from the Moon and from Venus). Mars is the planet of drive, heat, and assertion, and these houses touch on self, home, partnership, and intimacy — hence the traditional concern about friction in marriage.',
          'It\'s worth knowing how ordinary this is: a large share of people are technically Manglik by one reference point or another.',
        ],
      },
      {
        heading: 'Cancellations and severity',
        body: [
          'Classical texts list many cancellations (parihara) that reduce or nullify the dosha — for example Mars in its own sign or exalted, certain sign placements, Mars aspected by benefics, or both partners being Manglik (traditionally said to cancel each other out). A careful astrologer weighs these rather than stopping at "Manglik: yes/no."',
          'The strength and sign of Mars, and the overall chart, matter far more than the label on its own.',
        ],
      },
      {
        heading: 'A level-headed perspective',
        body: [
          'Mangal Dosha is best understood as a flag to look closer at how two people handle conflict, passion, and independence — not a sentence. Plenty of happy marriages involve one or both partners being Manglik. Treat it as one input among many in compatibility, alongside the broader Guna Milan analysis and, above all, how two real people actually relate.',
        ],
      },
    ],
    related: ['kundli-matching', 'astrology-houses'],
  },
  {
    slug: 'big-three',
    title: 'Your Big Three: Sun, Moon & Rising',
    teaser: 'The three placements that form the backbone of your personality — and how they interlock.',
    emoji: '✨',
    tradition: 'Western',
    seoTitle: 'The Big Three in Astrology: Sun, Moon & Rising Signs Explained',
    seoDescription: 'What the "big three" — your Sun, Moon, and Rising signs — mean, how they work together to describe your personality, and how to find all three.',
    intro: 'When astrologers talk about your "big three," they mean your Sun sign, Moon sign, and Rising sign. Together these three placements form the backbone of a personality reading: your core self, your inner emotional world, and the face you show the world. Knowing all three is the leap from "I\'m a Leo" to actually understanding your chart.',
    sections: [
      {
        heading: 'What the big three are',
        body: [
          'Your Sun sign is your core identity, ego, and life direction — the "you" you\'re growing into. Your Moon sign is your emotional nature, instincts, and inner needs — how you feel and what makes you feel safe. Your Rising sign (Ascendant) is your outward style — how you come across and instinctively meet the world.',
          'Most people know only their Sun sign, because it\'s set by your birth date alone. The Moon and Rising need a more complete birth time and place.',
        ],
      },
      {
        heading: 'How they work together',
        body: [
          'The magic is in the combination. A Leo Sun with a Cancer Moon and a Scorpio Rising is a very different person from a Leo Sun with a Capricorn Moon and a Gemini Rising — bold core, but wildly different emotional lives and first impressions. Reading the interplay is what makes astrology feel personal rather than generic.',
          'When all three agree (say, three placements in fire signs) you get a concentrated, coherent personality; when they contrast, you get someone whose inside and outside can feel quite different.',
        ],
      },
      {
        heading: 'Finding yours',
        body: [
          'Your Sun sign comes from your birth date. Your Moon and Rising require your birth time and place — the Moon changes sign roughly every 2–3 days, and the Rising every couple of hours. The quickest way to see all three (in both the Western and Vedic systems) is to run your birth details through a birth chart calculator.',
        ],
      },
    ],
    related: ['rising-sign', 'astrology-houses'],
  },
]

export function conceptBySlug(slug: string): Concept | undefined {
  return CONCEPTS.find(c => c.slug === slug)
}
