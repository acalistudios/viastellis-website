import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

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
import { OnboardingPage } from '@/pages/OnboardingPage'
import { TermsPage, PrivacyPage, RefundPage, ContactPage } from '@/pages/LegalPages'
import { UpgradePage } from '@/pages/UpgradePage'

// Auth + Onboarding features
import { AuthPage } from '@/features/auth/AuthPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { MatchInvitePage } from '@/features/match/MatchInvitePage'
import { BirthDataForm } from '@/features/onboarding/BirthDataForm'

// Route guards
import { AuthGuard } from '@/components/layout/AuthGuard'

function App() {
  return (
    <Routes>
      {/* ── Public routes (no shell, no auth required) ── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/welcome" element={<OnboardingPage />} />
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
  )
}

export default App
