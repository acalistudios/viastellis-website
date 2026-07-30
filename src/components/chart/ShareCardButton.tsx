/**
 * ShareCardButton - renders a branded, ink-friendly PNG chart card from the
 * on-page kundali SVG, then shares or downloads it.
 */

import { useState, type RefObject } from 'react'
import type { NatalChart } from '@/types'
import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  birthDetails,
  drawFooter,
  drawInfoPill,
  drawShareCardFrame,
  drawTitleBlock,
  loadLogo,
  rasterizeSvg,
} from '@/lib/chartExport'

const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}

interface Props {
  chart: NatalChart
  /** Container holding the rendered kundali <svg> */
  svgContainerRef: RefObject<HTMLDivElement | null>
}

export function ShareCardButton({ chart, svgContainerRef }: Props) {
  const [busy, setBusy] = useState(false)

  async function buildCard(): Promise<Blob | null> {
    const svgEl = svgContainerRef.current?.querySelector('svg')
    if (!svgEl) return null

    const [img, logo] = await Promise.all([rasterizeSvg(svgEl), loadLogo()])
    const canvas = document.createElement('canvas')
    canvas.width = SHARE_CARD_WIDTH
    canvas.height = SHARE_CARD_HEIGHT
    const ctx = canvas.getContext('2d')!

    drawShareCardFrame(ctx, logo)
    drawTitleBlock(
      ctx,
      `${chart.birth_data.name}'s Birth Chart`,
      'Vedic natal chart',
      birthDetails(chart.birth_data)
    )

    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#e3d8f1'
    ctx.lineWidth = 2
    ctx.fillRect(160, 432, 760, 760)
    ctx.strokeRect(160, 432, 760, 760)
    ctx.drawImage(img, 160, 432, 760, 760)

    const moon = chart.planets.find(p => p.planet === 'Moon')
    const sun = chart.planets.find(p => p.planet === 'Sun')
    const parts: string[] = []
    if (moon) parts.push(`Moon ${SIGN_GLYPHS[moon.sign]} ${moon.sign}`)
    if (sun) parts.push(`Sun ${SIGN_GLYPHS[sun.sign]} ${sun.sign}`)
    if (!chart.birth_data.time_unknown) {
      parts.push(`Rising ${SIGN_GLYPHS[chart.ascendant.sign]} ${chart.ascendant.sign}`)
    }

    drawInfoPill(ctx, parts.join(' | '), 92, 1210, 896)
    drawFooter(
      ctx,
      moon ? `Nakshatra: ${moon.nakshatra} | Pada ${moon.nakshatra_pada} | viastellis.com` : 'viastellis.com'
    )

    return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  }

  async function handleShare() {
    setBusy(true)
    try {
      const blob = await buildCard()
      if (!blob) return

      const file = new File([blob], 'viastellis-vedic-birth-chart.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Vedic Birth Chart - ViaStellis' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'viastellis-vedic-birth-chart.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // User cancelled the share sheet.
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
      {busy ? 'Creating...' : 'Share Card'}
    </button>
  )
}
