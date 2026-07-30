import type { BirthData } from '@/types'

export const SHARE_CARD_WIDTH = 1080
export const SHARE_CARD_HEIGHT = 1350

export async function rasterizeSvg(svgEl: SVGSVGElement, size = 760): Promise<HTMLImageElement> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(size))
  clone.setAttribute('height', String(size))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

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
    return img
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

export async function loadLogo(): Promise<HTMLImageElement | null> {
  const img = new Image()
  img.crossOrigin = 'anonymous'

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Logo load failed'))
      img.src = '/logo.svg'
    })
    return img
  } catch {
    return null
  }
}

export function birthDetails(birthData: BirthData): string {
  const date = formatDate(birthData.date)
  const time = birthData.time_unknown ? 'Time unknown' : birthData.time
  return `${date} | ${time} | ${birthData.city}, ${birthData.country}`
}

export function drawShareCardFrame(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null) {
  const W = SHARE_CARD_WIDTH
  const H = SHARE_CARD_HEIGHT

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = '#e8e1f4'
  ctx.lineWidth = 2
  roundRect(ctx, 46, 46, W - 92, H - 92, 28)
  ctx.stroke()

  ctx.fillStyle = '#fbf9ff'
  roundRect(ctx, 70, 70, W - 140, 164, 22)
  ctx.fill()

  if (logo) {
    ctx.drawImage(logo, 96, 98, 72, 72)
  } else {
    drawFallbackLogo(ctx, 132, 134, 36)
  }

  ctx.textAlign = 'left'
  ctx.fillStyle = '#241639'
  ctx.font = '700 48px Georgia, serif'
  drawFitText(ctx, 'ViaStellis', 188, 132, 380, 48, '700', 'Georgia, serif')

  ctx.fillStyle = '#6b5c81'
  ctx.font = '24px system-ui, sans-serif'
  ctx.fillText('Wisdom from the stars', 190, 168)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#5b4a73'
  ctx.font = '600 24px system-ui, sans-serif'
  drawFitText(ctx, 'viastellis.com', W - 96, 132, 260, 24, '600', 'system-ui, sans-serif')
}

export function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  details: string
) {
  ctx.textAlign = 'center'
  ctx.fillStyle = '#160f22'
  drawFitText(ctx, title, SHARE_CARD_WIDTH / 2, 310, 900, 44, '700', 'system-ui, sans-serif')

  ctx.fillStyle = '#5f4b7d'
  ctx.font = '26px system-ui, sans-serif'
  ctx.fillText(subtitle, SHARE_CARD_WIDTH / 2, 350)

  ctx.fillStyle = '#6f647c'
  drawFitText(ctx, details, SHARE_CARD_WIDTH / 2, 388, 900, 23, '400', 'system-ui, sans-serif')
}

export function drawInfoPill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number) {
  ctx.fillStyle = '#f7f2ff'
  ctx.strokeStyle = '#dfd4ef'
  ctx.lineWidth = 1.5
  roundRect(ctx, x, y, w, 58, 20)
  ctx.fill()
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.fillStyle = '#392651'
  drawFitText(ctx, text, x + w / 2, y + 37, w - 36, 25, '600', 'system-ui, sans-serif')
}

export function drawFooter(ctx: CanvasRenderingContext2D, note: string) {
  ctx.textAlign = 'center'
  ctx.fillStyle = '#6f647c'
  drawFitText(ctx, note, SHARE_CARD_WIDTH / 2, 1264, 880, 22, '400', 'system-ui, sans-serif')

  ctx.fillStyle = '#9b8aae'
  ctx.font = '18px system-ui, sans-serif'
  ctx.fillText('For entertainment purposes only', SHARE_CARD_WIDTH / 2, 1300)
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function drawFallbackLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.strokeStyle = '#f59e0b'
  ctx.fillStyle = '#f59e0b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8
    const len = i % 2 === 0 ? r * 0.9 : r * 0.48
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(cx, cy, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  startSize: number,
  weight: string,
  family: string
) {
  let size = startSize
  do {
    ctx.font = `${weight} ${size}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 1
  } while (size > 15)
  ctx.fillText(text, x, y)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
