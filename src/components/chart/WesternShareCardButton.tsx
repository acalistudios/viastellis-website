/**
 * WesternShareCardButton — a 1080×1350 PNG "chart card" (wheel + big three +
 * branding) rendered from the on-page wheel SVG, shared via the native share
 * sheet when available, else downloaded. Western/tropical counterpart to
 * ShareCardButton (which is Vedic/kundali).
 */
import { useState, type RefObject } from 'react'
import type { WesternChart } from '@/types'

const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}

interface Props {
  chart: WesternChart
  name: string
  /** Container holding the rendered wheel <svg> */
  svgContainerRef: RefObject<HTMLDivElement | null>
}

export function WesternShareCardButton({ chart, name, svgContainerRef }: Props) {
  const [busy, setBusy] = useState(false)

  async function buildCard(): Promise<Blob | null> {
    const svgEl = svgContainerRef.current?.querySelector('svg')
    if (!svgEl) return null

    const clone = svgEl.cloneNode(true) as SVGSVGElement
    clone.setAttribute('width', '800')
    clone.setAttribute('height', '800')
    const svgUrl = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
    )

    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('SVG rasterization failed'))
        img.src = svgUrl
      })

      const W = 1080, H = 1350
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!

      ctx.fillStyle = '#07050f'
      ctx.fillRect(0, 0, W, H)

      ctx.textAlign = 'center'
      ctx.fillStyle = '#c4b5fd'
      ctx.font = '64px Georgia, serif'
      ctx.fillText('ViaStellis', W / 2, 110)
      ctx.fillStyle = '#64748b'
      ctx.font = '28px system-ui, sans-serif'
      ctx.fillText('Wisdom from the stars', W / 2, 155)

      ctx.fillStyle = '#e2e8f0'
      ctx.font = '600 44px system-ui, sans-serif'
      ctx.fillText(`${name}'s Western Chart`, W / 2, 235)

      ctx.drawImage(img, (W - 800) / 2, 280, 800, 800)

      // Big three (tropical Sun / Moon / Rising)
      const sun = chart.planets.find(p => p.body === 'Sun')
      const moon = chart.planets.find(p => p.body === 'Moon')
      const parts: string[] = []
      if (sun) parts.push(`Sun ${SIGN_GLYPHS[sun.sign]} ${sun.sign}`)
      if (moon) parts.push(`Moon ${SIGN_GLYPHS[moon.sign]} ${moon.sign}`)
      parts.push(`Rising ${SIGN_GLYPHS[chart.ascendant.sign]} ${chart.ascendant.sign}`)
      ctx.fillStyle = '#c4b5fd'
      ctx.font = '36px system-ui, sans-serif'
      ctx.fillText(parts.join('   ·   '), W / 2, 1160)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '28px system-ui, sans-serif'
      ctx.fillText(`Tropical zodiac · Ascendant ${chart.ascendant.sign}`, W / 2, 1210)

      ctx.fillStyle = '#475569'
      ctx.font = '20px system-ui, sans-serif'
      ctx.fillText('For entertainment purposes only · viastellis.com', W / 2, 1300)

      return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    } finally {
      URL.revokeObjectURL(svgUrl)
    }
  }

  async function handleShare() {
    setBusy(true)
    try {
      const blob = await buildCard()
      if (!blob) return
      const file = new File([blob], 'viastellis-western-chart.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Western Chart — ViaStellis' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'viastellis-western-chart.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // User cancelled the share sheet — nothing to do
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={() => void handleShare()}
      disabled={busy}
      className="text-xs text-slate-400 hover:text-stardust-300 border border-cosmos-700 hover:border-stardust-400/50 rounded-full px-4 py-2 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {busy ? 'Creating…' : 'Share Card'}
    </button>
  )
}
