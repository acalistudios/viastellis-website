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
import { TermsPage, PrivacyPage, RefundPage, ContactPage, DeleteAccountPage } from '@/pages/LegalPages'
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
import { createNativeAuthHandler } from '@/lib/nativeAuth'

const processNativeCallback = createNativeAuthHandler(
  code => supabase.auth.exchangeCodeForSession(code),
  () => Browser.close(),
)

function App() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false
    const handles: Array<{ remove: () => Promise<void> }> = []

    const handleDeepLink = async (url: string) => {
      if (cancelled) return
      const result = await processNativeCallback(url)
      if (cancelled || result === null) return
      navigate(result === 'success' ? '/home' : '/auth?mode=signin&native_error=1', { replace: true })
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

    void setup().catch(() => {
      if (!cancelled) navigate('/auth?mode=signin&native_error=1', { replace: true })
    })

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
      {/* Public and unguarded on purpose: Google Play requires a deletion route
          reachable without installing the app or signing in. */}
      <Route path="/delete-account" element={<DeleteAccountPage />} />
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
