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
import { FreeBirthChartPage } from '@/pages/FreeBirthChartPage'
import { CompatibilityCalculatorPage } from '@/pages/CompatibilityCalculatorPage'
import { LearnPage } from '@/pages/LearnPage'
import { ConceptPage } from '@/pages/ConceptPage'
import { UpgradePage } from '@/pages/UpgradePage'

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

    const setupDeepLinks = async () => {
      await CapApp.addListener('appUrlOpen', async (data) => {
        const urlStr = data.url
        const url = new URL(urlStr)
        
        await Browser.close()

        const isCallback = 
          urlStr.includes('auth-callback') || 
          url.pathname.endsWith('/auth/callback') ||
          url.pathname.includes('auth-callback')

        if (isCallback) {
          const code = url.searchParams.get('code')
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) {
              console.error('Error exchanging code for session:', error)
            } else {
              navigate('/home', { replace: true })
            }
          }
        }
      })
    }

    const setupBackButton = async () => {
      await CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back()
        } else {
          CapApp.exitApp()
        }
      })
    }

    setupDeepLinks()
    setupBackButton()

    return () => {
      CapApp.removeAllListeners()
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
      {/* Public SEO/top-of-funnel: free chart tool + concept hub */}
      <Route path="/free-birth-chart" element={<FreeBirthChartPage />} />
      <Route path="/compatibility-calculator" element={<CompatibilityCalculatorPage />} />
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
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

export default App
