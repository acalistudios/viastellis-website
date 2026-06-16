/**
 * placementMeanings — plain-language interpretations of a person's key placements.
 *
 * In Vedic astrology the three "pillars" of a chart each answer a different question:
 *   - Moon sign (Rashi)  → your emotional nature & inner world (the most important point in Jyotish)
 *   - Sun sign           → your core identity, ego, vitality, and sense of purpose
 *   - Lagna (Ascendant)  → your outward personality, body, and how you meet the world
 *
 * The same zodiac sign therefore "means" something different depending on which role it plays.
 * These blurbs are short, warm, and specific — written for someone new to astrology.
 */

import type { ZodiacSign } from '@/types'

export type PlacementRole = 'moon' | 'sun' | 'lagna'

const SIGN_TRAITS: Record<ZodiacSign, { keyword: string; element: string }> = {
  Aries: { keyword: 'bold, pioneering, quick to act', element: 'Fire' },
  Taurus: { keyword: 'steady, sensual, security-seeking', element: 'Earth' },
  Gemini: { keyword: 'curious, communicative, adaptable', element: 'Air' },
  Cancer: { keyword: 'nurturing, protective, deeply feeling', element: 'Water' },
  Leo: { keyword: 'warm, proud, naturally expressive', element: 'Fire' },
  Virgo: { keyword: 'precise, helpful, improvement-minded', element: 'Earth' },
  Libra: { keyword: 'fair, relational, harmony-seeking', element: 'Air' },
  Scorpio: { keyword: 'intense, private, transformative', element: 'Water' },
  Sagittarius: { keyword: 'optimistic, freedom-loving, philosophical', element: 'Fire' },
  Capricorn: { keyword: 'disciplined, ambitious, patient', element: 'Earth' },
  Aquarius: { keyword: 'independent, inventive, humanitarian', element: 'Air' },
  Pisces: { keyword: 'compassionate, dreamy, spiritually attuned', element: 'Water' },
}

/** What the sign means specifically in the Moon role (emotions & inner life). */
const MOON_BY_SIGN: Record<ZodiacSign, string> = {
  Aries: 'Your emotions run hot and fast — you feel things immediately and need action to process them. Independence soothes you; sitting still frustrates you.',
  Taurus: 'The Moon is exalted here — emotionally you are calm, loyal, and grounded. You need comfort, routine, and physical reassurance (good food, touch, nature) to feel safe.',
  Gemini: 'You process feelings by talking and thinking them through. Your inner world is restless and curious; mental stimulation matters as much as emotional security.',
  Cancer: 'The Moon rules this sign — you feel everything deeply and remember it all. Home, family, and emotional belonging are the bedrock of your wellbeing.',
  Leo: 'Your heart is big and warm. You need to feel appreciated, seen, and special; giving and receiving affection openly keeps you emotionally nourished.',
  Virgo: 'You soothe yourself through usefulness and order. Worry is your default when stressed; small acts of service and tidy routines restore your calm.',
  Libra: 'Your emotional balance depends on relationships and harmony. Conflict unsettles you deeply; beauty, fairness, and companionship bring you back to center.',
  Scorpio: 'The Moon is debilitated here, so emotions run deep, private, and intense. You feel things to the bone and guard your inner world fiercely — but this gives you profound emotional resilience and insight.',
  Sagittarius: 'You need freedom, meaning, and room to roam emotionally. Optimism is your reset button; feeling trapped or hemmed in is what truly distresses you.',
  Capricorn: 'You manage emotions with maturity and restraint, sometimes more than you let on. You feel safest when you are in control and building toward something lasting.',
  Aquarius: 'You process feelings at a slight distance, through the mind. Friendships and a sense of belonging to a larger cause matter deeply to your emotional health.',
  Pisces: 'You are a sponge for the moods around you — empathic, imaginative, and tender. Solitude, art, music, or spirituality help you cleanse and recharge.',
}

/** What the sign means in the Sun role (identity, vitality, purpose). */
const SUN_BY_SIGN: Record<ZodiacSign, string> = {
  Aries: 'The Sun is exalted here — your core drive is to lead, initiate, and prove yourself. You shine when blazing your own trail and taking the first step others hesitate at.',
  Taurus: 'Your sense of self is built on stability and worth. You express your identity by creating lasting value, comfort, and beauty — slowly, deliberately, on your own terms.',
  Gemini: 'You define yourself through ideas, words, and versatility. Your vitality comes from learning, connecting, and keeping many doors open at once.',
  Cancer: 'Your identity is rooted in care, protection, and emotional connection. You shine when nurturing others and building a sense of home and belonging.',
  Leo: 'The Sun rules this sign — this is your natural seat of power. Your purpose is to express, create, and lead from the heart, radiating warmth and confidence.',
  Virgo: 'You find your identity in mastery, service, and getting things right. Your vitality grows through meaningful work and quietly making the world function better.',
  Libra: 'The Sun is debilitated here, so you may downplay yourself in favor of others — yet your gift is bringing balance, fairness, and grace to everything you touch. Owning your own needs is your growth edge.',
  Scorpio: 'Your core is intense and transformative. You shine through depth, focus, and the courage to face what others avoid; you are here to be reborn many times.',
  Sagittarius: 'Your identity is tied to truth, freedom, and the bigger picture. You come alive while exploring, teaching, and chasing meaning beyond the horizon.',
  Capricorn: 'You define yourself through achievement, responsibility, and the long climb. Your vitality is the slow, steady mastery that earns lasting respect.',
  Aquarius: 'Your sense of self is original and future-facing. You shine by thinking differently, championing the collective, and refusing to simply follow the crowd.',
  Pisces: 'Your identity is fluid, compassionate, and spiritual. You shine through imagination, empathy, and a quiet sense of being connected to something larger.',
}

/** What the sign means in the Lagna role (outer self, body, first impression). */
const LAGNA_BY_SIGN: Record<ZodiacSign, string> = {
  Aries: 'You come across as direct, energetic, and ready to go. People meet a doer — someone who moves first and asks questions later. Mars rules your whole chart, giving you drive and a competitive edge.',
  Taurus: 'You present as calm, grounded, and reliable. Others sense steadiness and an eye for quality. Venus rules your chart, drawing comfort, beauty, and ease toward you.',
  Gemini: 'You appear bright, talkative, and quick-witted. People experience you as youthful and adaptable. Mercury rules your chart, making communication your superpower.',
  Cancer: 'You give a warm, caring, slightly guarded first impression. People feel emotionally safe around you. The Moon rules your chart, so your moods color your whole life.',
  Leo: 'You carry natural presence and dignity — people notice you walk in. The Sun rules your chart, giving you warmth, pride, and a flair for leadership.',
  Virgo: 'You seem capable, modest, and observant. Others trust you to notice details and get things right. Mercury rules your chart, sharpening your analytical mind.',
  Libra: 'You appear charming, balanced, and easy to be around. People feel met halfway. Venus rules your chart, making relationships and aesthetics central to your path.',
  Scorpio: 'You project depth, magnetism, and a touch of mystery. People sense there is more beneath the surface. Mars (and Ketu) rule your chart, giving you intensity and willpower.',
  Sagittarius: 'You come across as open, optimistic, and frank. People feel your enthusiasm and honesty. Jupiter rules your chart, blessing you with luck, wisdom, and a love of growth.',
  Capricorn: 'You present as serious, capable, and self-possessed — older than your years when young. Saturn rules your chart, rewarding patience with lasting authority.',
  Aquarius: 'You appear original, friendly, and a little unconventional. People sense an independent thinker. Saturn rules your chart, grounding your big-picture vision in discipline.',
  Pisces: 'You give a gentle, dreamy, approachable impression. People feel your compassion right away. Jupiter rules your chart, lending you faith, imagination, and grace.',
}

export interface PlacementMeaning {
  /** One-line summary for the card subtitle. */
  summary: string
  /** Full paragraph for the expandable detail. */
  detail: string
  /** Element of the sign (Fire/Earth/Air/Water). */
  element: string
}

const ROLE_INTRO: Record<PlacementRole, string> = {
  moon: 'Your Moon sign is the most important point in Vedic astrology — it describes your emotional nature and inner world.',
  sun: 'Your Sun sign describes your core identity, ego, and the purpose your soul is here to express.',
  lagna: 'Your Lagna (rising sign) is the mask you wear into the world — your outward personality, body, and first impression. It also sets the framework for your entire chart.',
}

const ROLE_DETAIL: Record<PlacementRole, Record<ZodiacSign, string>> = {
  moon: MOON_BY_SIGN,
  sun: SUN_BY_SIGN,
  lagna: LAGNA_BY_SIGN,
}

/** Get a plain-language interpretation of a sign in a given role. */
export function getPlacementMeaning(role: PlacementRole, sign: ZodiacSign): PlacementMeaning {
  const traits = SIGN_TRAITS[sign]
  return {
    summary: `${traits.keyword} · ${traits.element} sign`,
    detail: `${ROLE_INTRO[role]} ${ROLE_DETAIL[role][sign]}`,
    element: traits.element,
  }
}

/**
 * The 27 nakshatras (lunar mansions) — each a 13°20' slice of the zodiac with its
 * own deity, symbol, and temperament. The nakshatra of your Moon adds a fine layer
 * of personality on top of the sign.
 */
export const NAKSHATRA_MEANINGS: Record<string, { symbol: string; deity: string; meaning: string }> = {
  Ashwini: { symbol: "Horse's head", deity: 'Ashwini Kumaras (healers)', meaning: 'Fast, youthful, pioneering. A natural healer and starter who moves quickly and loves fresh beginnings.' },
  Bharani: { symbol: 'Yoni (vessel)', deity: 'Yama (lord of death)', meaning: 'Intense, creative, transformative. Carries great willpower and the capacity to bear and birth new things.' },
  Krittika: { symbol: 'Razor / flame', deity: 'Agni (fire)', meaning: 'Sharp, purifying, determined. Cuts through illusion; ambitious with a fiery, protective streak.' },
  Rohini: { symbol: 'Ox-cart / chariot', deity: 'Brahma (creator)', meaning: 'Magnetic, sensual, creative. The most fertile and charming nakshatra — beauty, growth, and material grace come naturally.' },
  Mrigashira: { symbol: "Deer's head", deity: 'Soma (moon)', meaning: 'Curious, gentle, searching. A perpetual seeker, always exploring for something a little better just over the hill.' },
  Ardra: { symbol: 'Teardrop / diamond', deity: 'Rudra (storm)', meaning: 'Stormy, sharp-minded, transformative. Emotional intensity that clears the air, leading to renewal after upheaval.' },
  Punarvasu: { symbol: 'Quiver of arrows', deity: 'Aditi (boundlessness)', meaning: 'Optimistic, generous, renewing. The energy of return and second chances — resilient and nurturing.' },
  Pushya: { symbol: 'Cow udder / lotus', deity: 'Brihaspati (Jupiter)', meaning: 'Nourishing, dutiful, devoted. Considered the most auspicious nakshatra — caring, wise, and steadily supportive.' },
  Ashlesha: { symbol: 'Coiled serpent', deity: 'Nagas (serpents)', meaning: 'Hypnotic, perceptive, strategic. Deep intuitive and psychological insight; powerful when channeled with integrity.' },
  Magha: { symbol: 'Throne', deity: 'Pitris (ancestors)', meaning: 'Regal, proud, tradition-honoring. A natural sense of authority and connection to lineage and legacy.' },
  'Purva Phalguni': { symbol: 'Hammock / bed', deity: 'Bhaga (delight)', meaning: 'Warm, pleasure-loving, creative. Enjoys romance, relaxation, and the good things in life; generous and sociable.' },
  'Uttara Phalguni': { symbol: 'Bed (legs)', deity: 'Aryaman (patronage)', meaning: 'Reliable, generous, partnership-minded. Loyal and helpful, building lasting bonds and steady success.' },
  Hasta: { symbol: 'Hand', deity: 'Savitar (sun)', meaning: 'Skillful, clever, hands-on. Great craft and dexterity; can grasp and accomplish whatever they set out to do.' },
  Chitra: { symbol: 'Bright jewel', deity: 'Tvashtar (cosmic architect)', meaning: 'Artistic, charismatic, design-minded. A maker of beautiful things who shines and draws admiration.' },
  Swati: { symbol: 'Young sprout in wind', deity: 'Vayu (wind)', meaning: 'Independent, adaptable, self-driven. Values freedom and balance; flexible like a reed yet quietly determined.' },
  Vishakha: { symbol: 'Triumphal archway', deity: 'Indra-Agni', meaning: 'Goal-focused, ambitious, determined. Single-minded pursuit of purpose, with the patience to win in the end.' },
  Anuradha: { symbol: 'Lotus / staff', deity: 'Mitra (friendship)', meaning: 'Devoted, friendly, cooperative. Builds deep friendships and thrives through loyalty and collaboration.' },
  Jyeshtha: { symbol: 'Earring / umbrella', deity: 'Indra (king)', meaning: 'Senior, protective, capable. A natural elder and protector who carries responsibility and hard-won wisdom.' },
  Mula: { symbol: 'Tied roots', deity: 'Nirriti (dissolution)', meaning: 'Investigative, intense, truth-seeking. Digs to the root of things; transformation through getting to the core.' },
  'Purva Ashadha': { symbol: 'Fan / winnowing basket', deity: 'Apas (waters)', meaning: 'Invincible optimism, persuasive, proud. Hard to defeat once committed; inspires and uplifts others.' },
  'Uttara Ashadha': { symbol: 'Elephant tusk', deity: 'Vishvedevas', meaning: 'Principled, enduring, victorious. Achieves lasting success through integrity and steady effort.' },
  Shravana: { symbol: 'Ear / three footprints', deity: 'Vishnu', meaning: 'Attentive, learned, wise. A great listener and learner who gathers knowledge and connects people.' },
  Dhanishtha: { symbol: 'Drum', deity: 'Vasus (abundance)', meaning: 'Rhythmic, prosperous, talented. Musical and energetic; wealth and recognition come through skill and timing.' },
  Shatabhisha: { symbol: 'Empty circle / 100 healers', deity: 'Varuna (cosmic waters)', meaning: 'Healing, independent, mysterious. A private, unconventional mind drawn to medicine, secrets, and reform.' },
  'Purva Bhadrapada': { symbol: 'Front legs of a cot', deity: 'Aja Ekapada', meaning: 'Idealistic, intense, transformative. Passionate convictions and a touch of the visionary or otherworldly.' },
  'Uttara Bhadrapada': { symbol: 'Back legs of a cot', deity: 'Ahir Budhnya (deep serpent)', meaning: 'Wise, calm, deep. Quiet inner depth and patience; a stabilizing, spiritually mature presence.' },
  Revati: { symbol: 'Fish / drum', deity: 'Pushan (nourisher)', meaning: 'Gentle, nurturing, protective. The final nakshatra — kind, spiritually attuned, and a safe guide for others on their journey.' },
}

/** Look up a nakshatra's interpretation (returns undefined for unknown names). */
export function getNakshatraMeaning(nakshatra: string) {
  return NAKSHATRA_MEANINGS[nakshatra]
}

/**
 * Career & vocational leanings by sign. Classically read most from the Lagna
 * (and its lord) plus the 10th house, but the Sun and Moon signs add flavor.
 * These are inclinations, not prescriptions.
 */
const CAREER_BY_SIGN: Record<ZodiacSign, string> = {
  Aries: 'leadership, entrepreneurship, sports, military, engineering, surgery, emergency work — anything pioneering and fast-moving',
  Taurus: 'finance, banking, real estate, food, agriculture, music, luxury goods, design — stable fields that build tangible value',
  Gemini: 'writing, journalism, teaching, sales, marketing, media, tech, translation — communication- and idea-driven work',
  Cancer: 'caregiving, nursing, hospitality, real estate, food, counseling, history, anything home- or nurture-related',
  Leo: 'management, performance, politics, entertainment, creative direction, education — roles with visibility and authority',
  Virgo: 'healthcare, analysis, editing, accounting, research, nutrition, IT, quality control — detail- and service-oriented work',
  Libra: 'law, diplomacy, design, fashion, the arts, HR, mediation, public relations — relational and aesthetic fields',
  Scorpio: 'research, investigation, psychology, surgery, finance, occult studies, crisis management — depth and transformation',
  Sagittarius: 'teaching, law, publishing, travel, philosophy, religion, coaching, international work — meaning- and freedom-driven',
  Capricorn: 'business, administration, government, engineering, law, architecture — structured, ambitious, long-game careers',
  Aquarius: 'technology, science, social causes, innovation, networking, aviation, research — unconventional and future-facing work',
  Pisces: 'arts, music, film, healing, spirituality, charity, marine fields, anything imaginative or compassionate',
}

export interface ChartSynthesis {
  /** A short headline, e.g. "Aries rising, Aries Sun, Pisces Moon". */
  headline: string
  /** True when Lagna and Sun share a sign (a "double" signature). */
  isDouble: boolean
  /** Paragraphs describing the overall personality blend. */
  personality: string
  /** A career-leaning paragraph. */
  career: string
}

/**
 * Synthesize the three pillars into a combined personality + career reading.
 * @param lagna  rising sign (undefined if birth time unknown)
 * @param sun    Sun sign
 * @param moon   Moon sign
 */
export function getChartSynthesis(
  sun: ZodiacSign,
  moon: ZodiacSign,
  lagna?: ZodiacSign
): ChartSynthesis {
  const outer = lagna ?? sun // without a birth time, the Sun carries the outer role
  const isDouble = lagna != null && lagna === sun

  const outerTraits = SIGN_TRAITS[outer]
  const sunTraits = SIGN_TRAITS[sun]
  const moonTraits = SIGN_TRAITS[moon]

  const headlineParts = [
    lagna ? `${lagna} rising` : null,
    `${sun} Sun`,
    `${moon} Moon`,
  ].filter(Boolean)

  // Personality: how the outer self, the ego, and the emotions combine.
  let personality: string
  if (isDouble) {
    personality =
      `With both your rising sign and your Sun in ${sun}, you are a "double ${sun}" — the way you ` +
      `come across and your inner sense of purpose point the same direction, so the world tends to ` +
      `meet you exactly as you are: ${sunTraits.keyword}. There is little gap between the mask and the ` +
      `person behind it, which makes you refreshingly direct and consistent. ` +
      `Your ${moon} Moon, however, runs a quieter undercurrent: emotionally you are ${moonTraits.keyword}. ` +
      `So a confident, ${outerTraits.element}-driven exterior carries a ${moonTraits.element.toLowerCase()}, ` +
      `more ${moon === 'Pisces' ? 'sensitive and dreamy' : moonTraits.keyword.split(',')[0]} interior — ` +
      `the part of you that close people get to know.`
  } else {
    personality =
      `Your ${outer}${lagna ? ' rising' : ' Sun'} shapes how you meet the world — ${outerTraits.keyword}. ` +
      `Your ${sun} Sun is the core you are growing into — ${sunTraits.keyword}. ` +
      `And your ${moon} Moon is your private emotional nature — ${moonTraits.keyword}. ` +
      `The interplay of these three (${[lagna, sun, moon].filter(Boolean).join(', ')}) is what makes you ` +
      `more than any single sign: an outward ${outerTraits.element} style, a ${sunTraits.element} sense of ` +
      `purpose, and a ${moonTraits.element} emotional world underneath.`
  }

  // Career: blend the outer/vocational sign with the Sun's drive.
  const careerSign = lagna ?? sun
  const sameCareerLane = careerSign === sun
  const career = sameCareerLane
    ? `Vocationally, ${careerSign} energy points you toward ${CAREER_BY_SIGN[careerSign]}. ` +
      `Because your outer drive and core purpose align here, you tend to thrive when you can act ` +
      `decisively and own the outcome rather than blend into a committee. ` +
      `Your ${moon} Moon suggests you will feel most fulfilled when the work also honors ` +
      `${moon === 'Pisces' ? 'your imagination and need for meaning — purely mechanical roles will quietly drain you' : `your emotional need to be ${moonTraits.keyword.split(',')[0]}`}.`
    : `Vocationally, your ${careerSign}${lagna ? ' rising' : ' Sun'} leans toward ${CAREER_BY_SIGN[careerSign]}, ` +
      `while your ${sun} Sun adds a pull toward ${CAREER_BY_SIGN[sun]}. ` +
      `The sweet spot is a role that lets both express. Your ${moon} Moon adds the human factor: ` +
      `you will stay engaged longest in work that satisfies your need to be ${moonTraits.keyword.split(',')[0]}.`

  return {
    headline: headlineParts.join(', '),
    isDouble,
    personality,
    career,
  }
}
