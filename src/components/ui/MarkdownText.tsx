/**
 * MarkdownText — lightweight renderer for AI-generated report/reading bodies.
 *
 * The model output sometimes includes light markdown (# / ## headings, **bold**,
 * "- " bullet lists). Rendering that as raw text leaves literal #/** characters
 * on screen. Rather than pull in a full markdown library for a handful of
 * constructs, this parses just those and styles them with the app's palette
 * (headings in stardust, bold as a brighter inline accent).
 *
 * Plain text with no markdown renders exactly as before (one <p> per blank-line
 * paragraph, single newlines preserved as line breaks).
 */
import { Fragment } from 'react'

/** Render inline **bold** spans within a line of text. */
function renderInline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(seg)
    return m
      ? <span key={`${keyPrefix}-${i}`} className="text-stardust-300 font-semibold">{m[1]}</span>
      : <Fragment key={`${keyPrefix}-${i}`}>{seg}</Fragment>
  })
}

interface MarkdownTextProps {
  text: string
  className?: string
  /** Rendered inline at the very end of the text (e.g. a streaming-cursor blink). */
  trailing?: React.ReactNode
}

export function MarkdownText({ text, className, trailing }: MarkdownTextProps) {
  const blocks = text.split(/\n{2,}/)
  const lastBlockIndex = blocks.length - 1

  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '')
        const isLastBlock = bi === lastBlockIndex
        if (lines.length === 0) return isLastBlock && trailing ? <Fragment key={bi}>{trailing}</Fragment> : null

        // Heading block: a single line starting with #, ##, or ###.
        const headingMatch = lines.length === 1 ? /^(#{1,3})\s+(.*)$/.exec(lines[0]) : null
        if (headingMatch) {
          const level = headingMatch[1].length
          const content = renderInline(headingMatch[2], `h${bi}`)
          if (level === 1) {
            return <h3 key={bi} className="font-display text-lg text-stardust-300 mt-5 mb-2 first:mt-0">{content}{isLastBlock && trailing}</h3>
          }
          if (level === 2) {
            return <h4 key={bi} className="font-display text-base text-stardust-300 mt-4 mb-1.5 first:mt-0">{content}{isLastBlock && trailing}</h4>
          }
          return <h5 key={bi} className="text-sm font-semibold text-slate-200 mt-3 mb-1 first:mt-0">{content}{isLastBlock && trailing}</h5>
        }

        // List block: every line starts with "- " or "* ".
        const isList = lines.every((l) => /^[-*]\s+/.test(l))
        if (isList) {
          return (
            <ul key={bi} className="list-disc list-outside pl-5 space-y-1 my-2">
              {lines.map((l, li) => {
                const isLastLine = isLastBlock && li === lines.length - 1
                return <li key={li}>{renderInline(l.replace(/^[-*]\s+/, ''), `li${bi}-${li}`)}{isLastLine && trailing}</li>
              })}
            </ul>
          )
        }

        // Plain paragraph — preserve single newlines as line breaks.
        return (
          <p key={bi} className="leading-relaxed my-2 first:mt-0 last:mb-0">
            {lines.map((l, li) => {
              const isLastLine = isLastBlock && li === lines.length - 1
              return (
                <Fragment key={li}>
                  {li > 0 && <br />}
                  {renderInline(l, `p${bi}-${li}`)}
                  {isLastLine && trailing}
                </Fragment>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}
