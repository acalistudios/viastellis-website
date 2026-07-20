/**
 * Seo - per-route <title>, meta description, canonical, and Open Graph tags.
 *
 * Dependency-free (no react-helmet): a small effect that updates the document
 * head on mount. Googlebot renders JS and picks these up, so each public route
 * can present its own title/description/social card instead of the single
 * static one in index.html.
 *
 * Use on PUBLIC / indexable routes (landing, horoscopes, explainer, legal,
 * future concept & tool pages). Auth-gated app screens don't need it.
 */

import { useEffect } from 'react'

const SITE = 'https://viastellis.com'
const DEFAULT_OG_IMAGE = `${SITE}/og-cover.png`
const OG_IMAGE_ALT = 'ViaStellis social preview with a cosmic background, compass star, and astrology app tagline.'

interface SeoProps {
  title: string
  description: string
  /** Path only, e.g. "/zodiac-systems". Used for canonical + og:url. */
  path: string
  image?: string
  /** Defaults to 'website'; use 'article' for concept/blog pages. */
  type?: 'website' | 'article'
  /** Set true for thin/duplicate/utility pages you don't want indexed. */
  noindex?: boolean
  /** Optional JSON-LD structured data for this route (schema.org object/array). */
  jsonLd?: object
}

/** Create or update a <meta>/<link> in <head>, keyed by an attribute. */
function upsert(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta')
    document.head.appendChild(el)
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
}

export function Seo({ title, description, path, image = DEFAULT_OG_IMAGE, type = 'website', noindex = false, jsonLd }: SeoProps) {
  useEffect(() => {
    const url = `${SITE}${path}`
    const fullTitle = title.includes('ViaStellis') ? title : `${title} - ViaStellis`

    document.title = fullTitle
    upsert('meta[name="description"]', { name: 'description', content: description })
    upsert('link[rel="canonical"]', { rel: 'canonical', href: url })
    upsert('meta[name="robots"]', { name: 'robots', content: noindex ? 'noindex,follow' : 'index,follow' })

    // Open Graph
    upsert('meta[property="og:title"]', { property: 'og:title', content: fullTitle })
    upsert('meta[property="og:description"]', { property: 'og:description', content: description })
    upsert('meta[property="og:url"]', { property: 'og:url', content: url })
    upsert('meta[property="og:type"]', { property: 'og:type', content: type })
    upsert('meta[property="og:image"]', { property: 'og:image', content: image })
    upsert('meta[property="og:image:type"]', { property: 'og:image:type', content: 'image/png' })
    upsert('meta[property="og:image:width"]', { property: 'og:image:width', content: '1200' })
    upsert('meta[property="og:image:height"]', { property: 'og:image:height', content: '630' })
    upsert('meta[property="og:image:alt"]', { property: 'og:image:alt', content: OG_IMAGE_ALT })

    // Twitter
    upsert('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle })
    upsert('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
    upsert('meta[name="twitter:image"]', { name: 'twitter:image', content: image })
    upsert('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: OG_IMAGE_ALT })

    // Per-route JSON-LD (a single <script> we manage; removed on unmount so
    // one route's schema never leaks onto the next).
    const SCRIPT_ID = 'route-jsonld'
    document.getElementById(SCRIPT_ID)?.remove()
    if (jsonLd) {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.id = SCRIPT_ID
      s.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(s)
    }
    return () => { document.getElementById(SCRIPT_ID)?.remove() }
  }, [title, description, path, image, type, noindex, jsonLd])

  return null
}
