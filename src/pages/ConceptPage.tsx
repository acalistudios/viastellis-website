/**
 * ConceptPage — renders one concept article from data/concepts.ts. `/learn/:slug`
 * SEO'd as an article, with internal links to related concepts and a soft CTA.
 */

import { Link, Navigate, useParams } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { conceptBySlug, CONCEPTS } from '@/data/concepts'

export function ConceptPage() {
  const { slug } = useParams<{ slug: string }>()
  const concept = slug ? conceptBySlug(slug) : undefined

  // Unknown slug → send to the hub (keeps crawlers off dead URLs).
  if (!concept) return <Navigate to="/learn" replace />

  const url = `https://viastellis.com/learn/${concept.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: concept.seoTitle,
        description: concept.seoDescription,
        about: `${concept.tradition} astrology`,
        mainEntityOfPage: url,
        author: { '@type': 'Organization', name: 'ViaStellis', url: 'https://viastellis.com/' },
        publisher: { '@id': 'https://viastellis.com/#org' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Learn', item: 'https://viastellis.com/learn' },
          { '@type': 'ListItem', position: 2, name: concept.title, item: url },
        ],
      },
    ],
  }

  return (
    <div className="min-h-screen bg-cosmos-950 text-slate-300">
      <Seo
        title={concept.seoTitle}
        description={concept.seoDescription}
        path={`/learn/${concept.slug}`}
        type="article"
        jsonLd={jsonLd}
      />
      <article className="max-w-2xl mx-auto px-6 py-12">
        <nav className="text-sm text-slate-500 mb-6">
          <Link to="/learn" className="text-stardust-400 hover:text-stardust-300">Learn</Link>
          <span className="mx-2">/</span>
          <span>{concept.tradition}</span>
        </nav>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{concept.emoji}</span>
          <span className="text-[10px] uppercase tracking-wider text-stellar-300 border border-stellar-300/40 rounded-full px-2 py-0.5">
            {concept.tradition}
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-stardust-200 leading-tight mb-4">{concept.title}</h1>
        <p className="text-slate-300 text-base leading-relaxed mb-8">{concept.intro}</p>

        {concept.sections.map(section => (
          <section key={section.heading} className="mb-8">
            <h2 className="font-display text-xl text-slate-100 mb-3">{section.heading}</h2>
            {section.body.map((p, i) => (
              <p key={i} className="text-slate-300 text-sm sm:text-[15px] leading-relaxed mb-3">{p}</p>
            ))}
          </section>
        ))}

        {/* Soft CTA — this concept, made personal */}
        <div className="bg-gradient-to-br from-cosmos-800/80 to-cosmos-900/80 border border-stardust-400/30 rounded-2xl px-5 py-5 my-8 text-center">
          <p className="text-slate-100 font-display text-lg mb-1">See it in your own chart</p>
          <p className="text-slate-400 text-sm mb-4">
            Create your free account for your full ViaStellis birth chart, daily readings, tarot, compatibility, and Stella.
          </p>
          <Link to="/auth"
            className="inline-block rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold px-6 py-2.5">
            Get my full chart →
          </Link>
        </div>

        {/* Related concepts — internal linking */}
        {concept.related.length > 0 && (
          <div className="border-t border-cosmos-800 pt-6">
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">Keep reading</p>
            <div className="flex flex-col gap-2">
              {concept.related
                .map(conceptBySlug)
                .filter((c): c is NonNullable<typeof c> => Boolean(c))
                .map(c => (
                  <Link key={c.slug} to={`/learn/${c.slug}`}
                    className="text-stardust-300 hover:text-stardust-200 text-sm">
                    {c.emoji} {c.title} →
                  </Link>
                ))}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}

// Re-export so a future static-sitemap generator can enumerate slugs.
export const CONCEPT_SLUGS = CONCEPTS.map(c => c.slug)
