type GtagCommand = 'config' | 'event' | 'js' | 'set'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (command: GtagCommand, target: string | Date, params?: Record<string, unknown>) => void
  }
}

const tagId = import.meta.env.VITE_GOOGLE_TAG_ID as string | undefined
const conversionLabels: Record<string, string | undefined> = {
  signup_cta_click: import.meta.env.VITE_GOOGLE_ADS_SIGNUP_CTA_CONVERSION_LABEL as string | undefined,
  signup_submit: import.meta.env.VITE_GOOGLE_ADS_SIGNUP_CONVERSION_LABEL as string | undefined,
  checkout_start: import.meta.env.VITE_GOOGLE_ADS_CHECKOUT_CONVERSION_LABEL as string | undefined,
}
let initialized = false

function getTagId(): string | null {
  if (typeof window === 'undefined') return null
  return tagId || null
}

export function initAnalytics() {
  const id = getTagId()
  if (!id || initialized) return
  initialized = true

  window.dataLayer = window.dataLayer ?? []
  window.gtag = function gtag(...args) {
    window.dataLayer?.push(args)
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)

  window.gtag('js', new Date())
  window.gtag('config', id, {
    send_page_view: false,
    allow_ad_personalization_signals: false,
  })
}

export function trackPageView(path: string) {
  const id = getTagId()
  if (!id) return
  initAnalytics()
  window.gtag?.('config', id, {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
    send_page_view: true,
  })
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  const id = getTagId()
  if (!id) return
  initAnalytics()
  const conversionLabel = conversionLabels[name]
  const conversionParams =
    conversionLabel && id.startsWith('AW-')
      ? { ...params, send_to: `${id}/${conversionLabel}` }
      : params
  window.gtag?.('event', name, conversionParams)
}
