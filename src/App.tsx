import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { ScrollToTop } from '@/components/ScrollToTop'

// Pages
import { LandingPage } from '@/pages/LandingPage'
import { HomePage } from '@/pages/HomePage'
import { ChartPage } from '@/pages/ChartPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { CompatibilityPage } from '@/pages/CompatibilityPage'
import { DecisionPage } from '@/pages/DecisionPage'
import { StellaPage } from '@/pages/StellaPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { JournalPage } from '@/pages/JournalPage'
import { TermsPage, PrivacyPage, RefundPage, ContactPage } from '@/pages/LegalPages'
import { ZodiacSystemsPage } from '@/pages/ZodiacSystemsPage'
import { UnsubscribePage } from '@/pages/UnsubscribePage'
import { PublicHoroscopesPage } from '@/pages/PublicHoroscopesPage'
import { LearnPage } from '@/pages/LearnPage'
import { ConceptPage } from '@/pages/ConceptPage'
import { UpgradePage } from '@/pages/UpgradePage'
import { PractitionersPage } from '@/pages/PractitionersPage'
import { PractitionerChartPage } from '@/pages/PractitionerChartPage'
import { ClientReportsPage } from '@/pages/ClientReportsPage'

// Auth + Onboarding features
import { AuthPage } from '@/features/auth/AuthPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { MatchInvitePage } from '@/features/match/MatchInvitePage'
import { BirthDataForm } from '@/features/onboarding/BirthDataForm'

// Route guards
import { AuthGuard } from '@/components/layout/AuthGuard'

function App() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false
    const handles: Array<{ remove: () => Promise<void> }> = []

    /**
     * Close the OAuth Custom Tab.
     *
     * Deliberately swallowing the error: on some Android versions Browser.close()
     * rejects when no tab is open, which is exactly the cold-start case below. An
     * unhandled rejection here aborts the whole callback, so the user lands back
     * in the app silently signed out — the failure mode is invisible, which is
     * what makes it worth guarding.
     */
    const closeBrowserQuietly = async () => {
      try {
        await Browser.close()
      } catch {
        /* nothing was open */
      }
    }

    /**
     * Handle a deep link, whether it arrived while running or launched the app.
     *
     * Params are pulled out by string rather than via `new URL()`: the redirect
     * uses the custom scheme `com.acalistudios.viastellis://auth-callback?...`,
     * where `pathname` is empty and `host` is "auth-callback", so URL's normal
     * http assumptions do not hold.
     */
    const handleDeepLink = async (urlStr: string) => {
      if (!urlStr) return
      await closeBrowserQuietly()

      const queryStr = urlStr.includes('?')
        ? urlStr.slice(urlStr.indexOf('?') + 1).split('#')[0]
        : ''
      const hashStr = urlStr.includes('#') ? urlStr.slice(urlStr.indexOf('#') + 1) : ''
      const query = new URLSearchParams(queryStr)
      const hash = new URLSearchParams(hashStr)

      const isCallback = urlStr.includes('auth-callback') || urlStr.includes('/auth/callback')

      if (!isCallback) {
        try {
          const url = new URL(urlStr)
          const target = url.host ? `/${url.host}${url.pathname}` : url.pathname
          if (target && target !== '/') navigate(target)
        } catch {
          console.error('Unparseable deep link:', urlStr)
        }
        return
      }

      // Supabase reports OAuth failures on the redirect itself. Without this the
      // user is bounced back to a blank screen with nothing logged.
      const oauthError = query.get('error') ?? hash.get('error')
      if (oauthError) {
        console.error('OAuth error:', oauthError, query.get('error_description') ?? hash.get('error_description') ?? '')
        navigate('/auth', { replace: true })
        return
      }

      // PKCE (Supabase's default) returns ?code=. Implicit returns tokens in the
      // fragment. Handle both so a flow change cannot silently break sign-in.
      const code = query.get('code')
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Error exchanging code for session:', error)
          navigate('/auth', { replace: true })
          return
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          console.error('Error setting session from tokens:', error)
          navigate('/auth', { replace: true })
          return
        }
      } else {
        console.error('Auth callback carried neither a code nor tokens:', urlStr)
        navigate('/auth', { replace: true })
        return
      }

      navigate('/home', { replace: true })
    }

    const setup = async () => {
      const urlHandle = await CapApp.addListener('appUrlOpen', (data) => {
        void handleDeepLink(data.url)
      })
      const backHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back()
        } else {
          CapApp.exitApp()
        }
      })

      if (cancelled) {
        void urlHandle.remove()
        void backHandle.remove()
        return
      }
      handles.push(urlHandle, backHandle)

      /**
       * Cold start: if Android killed the app while the Custom Tab was open, the
       * redirect relaunches it and the URL arrives as the launch URL — appUrlOpen
       * never fires, because this listener did not exist yet. Without this the
       * user completes Google sign-in and lands on a logged-out app.
       */
      const launch = await CapApp.getLaunchUrl()
      if (!cancelled && launch?.url) await handleDeepLink(launch.url)
    }

    void setup()

    return () => {
      cancelled = true
      // Remove only our own listeners. removeAllListeners() is global to the App
      // plugin and would also drop handlers registered elsewhere.
      handles.forEach(h => void h.remove())
    }
  }, [navigate])

  return (
    <>
    <ScrollToTop />
    <Routes>
      {/* ── Public routes (no shell, no auth required) ── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      {/* Recovery-link landing page — needs a session but NOT a chart */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {/* Public partner-invite landing (no account needed) */}
      <Route path="/match" element={<MatchInvitePage />} />

      {/* Public legal/policy pages (required for Stripe + general trust) */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/refund" element={<RefundPage />} />
      <Route path="/contact" element={<ContactPage />} />
      {/* Public explainer: Western vs Vedic zodiac systems */}
      <Route path="/zodiac-systems" element={<ZodiacSystemsPage />} />
      {/* Public "Today's Horoscopes" demo — all 12 signs, no signup */}
      <Route path="/horoscopes" element={<PublicHoroscopesPage />} />
      {/* Public practitioner offering for astrologers */}
      <Route path="/practitioners" element={<PractitionersPage />} />
      <Route path="/practitioners/create" element={<PractitionerChartPage />} />
      {/* Public SEO/top-of-funnel: free horoscope demo + concept hub */}
      <Route path="/learn" element={<LearnPage />} />
      <Route path="/learn/:slug" element={<ConceptPage />} />
      {/* Public: unsubscribe from the daily email. MUST work logged-out —
          the token is the credential (see UnsubscribePage). */}
      <Route path="/unsubscribe" element={<UnsubscribePage />} />

      {/* ── Auth-gated: birth data entry (needs account, no chart yet) ── */}
      <Route
        path="/onboarding"
        element={
          <AuthGuard requireChart={false}>
            <BirthDataForm />
          </AuthGuard>
        }
      />

      {/* ── Auth-gated: upgrade / buy credits (needs account) ── */}
      <Route
        path="/upgrade"
        element={
          <AuthGuard requireChart="any">
            <UpgradePage />
          </AuthGuard>
        }
      />

      {/* ── Auth-gated: edit existing birth data (needs account + chart) ── */}
      <Route
        path="/settings/birth"
        element={
          <AuthGuard requireChart>
            <BirthDataForm mode="edit" />
          </AuthGuard>
        }
      />

      {/* ── Main app (needs account + primary chart) ── */}
      <Route
        element={
          <AuthGuard requireChart>
            <AppShell />
          </AuthGuard>
        }
      >
        <Route path="/home" element={<HomePage />} />
        <Route path="/chart" element={<ChartPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/compatibility" element={<CompatibilityPage />} />
        <Route path="/decision" element={<DecisionPage />} />
        <Route path="/stella" element={<StellaPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/client-reports" element={<ClientReportsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

export default App
