# Google Ads Starter Plan

## Goal

Start with high-intent Google Search traffic and send visitors to public tools, not the homepage.

Primary landing pages:

- `https://viastellis.com/horoscopes`
- `https://viastellis.com/compatibility-calculator`

Initial budget:

- `$10-$25/day`
- Run for 7 days before judging
- Optimize for completed tool use first, then signup

## Tracking Setup

The app now supports an optional Google tag through:

```text
VITE_GOOGLE_TAG_ID=G-XXXXXXXXXX
```

or:

```text
VITE_GOOGLE_TAG_ID=AW-XXXXXXXXXX
```

Tracking is disabled when this variable is blank.

Tracked events:

- `page_view`
- `compatibility_check_complete`
- `signup_cta_click`
- `signup_submit`
- `auth_oauth_start`
- `checkout_start`

Recommended Google Ads conversions:

- Primary: `signup_submit`
- Secondary: `signup_cta_click`
- Secondary: `checkout_start`
- Observation only: `compatibility_check_complete`

Privacy posture:

- Do not send birth dates, birth times, city names, emails, names, or chart data to Google.
- Keep ad personalization signals off initially.

## Campaign 1: Free Horoscopes

Landing page:

```text
https://viastellis.com/horoscopes?utm_source=google&utm_medium=cpc&utm_campaign=free_horoscopes_search
```

Ad group: Free Horoscopes

Keywords:

```text
"free daily horoscope"
"today horoscope"
"daily horoscope"
"free horoscopes"
"vedic horoscope"
"western horoscope"
"moon sign horoscope"
```

Headlines:

```text
Free Daily Horoscopes
Vedic + Western Horoscopes
Today's Horoscope Free
Read All 12 Signs
Daily Astrology Readings
```

Descriptions:

```text
Read today's free horoscopes for all 12 signs in both Vedic and Western astrology.
Start with a free daily reading, then create an account for your full birth chart.
```

## Campaign 2: Compatibility Calculator

Landing page:

```text
https://viastellis.com/compatibility-calculator?utm_source=google&utm_medium=cpc&utm_campaign=compatibility_search
```

Ad group: Astrology Compatibility

Keywords:

```text
"astrology compatibility calculator"
"zodiac compatibility calculator"
"love compatibility astrology"
"birth chart compatibility"
"vedic compatibility"
"kundli matching"
```

Headlines:

```text
Astrology Compatibility
Free Compatibility Check
Vedic Moon Sign Match
Check Your Vibe Score
Birth Chart Compatibility
```

Descriptions:

```text
Check how two charts connect with a Vedic Moon-sign and nakshatra based reading.
Free instant compatibility score. Explore strengths, friction, and next steps.
```

## Negative Keywords

Start with:

```text
job
jobs
course
certification
degree
pdf
book
meaning tattoo
free psychic
lottery
casino
gambling
spell
curse
black magic
```

## Policy-Safe Copy Rules

Use:

- "explore"
- "understand"
- "reflect"
- "birth chart"
- "compatibility"
- "daily astrology"

Avoid:

- exact predictions
- guaranteed outcomes
- fear-based claims
- medical, financial, legal, or psychological claims
- implying the ad knows a sensitive personal condition

## First-Week Review

After 7 days, review:

- Cost per `signup_cta_click`
- Cost per `signup_submit`
- Search terms report
- Mobile conversion rate
- Landing-page drop-off

Pause keywords with clicks but no completed chart. Add useful search terms as exact-match keywords.
