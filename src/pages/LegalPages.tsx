/**
 * Legal & policy pages — public routes required for Stripe activation and
 * general trust: Terms of Service, Privacy Policy, Refund Policy, Contact.
 *
 * NOTE: These are solid, specific starting-point templates tailored to
 * ViaStellis. They are NOT legal advice — have counsel review before relying
 * on them in production. Entity, jurisdiction, and support inbox are filled in.
 */

import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

const SUPPORT_EMAIL = 'Stella@viastellis.com'
const COMPANY = 'ViaStellis' // the Service / brand name
const OPERATOR = 'ACALI Studios' // customer-facing operator (registered DBA)
const LEGAL_ENTITY = 'Pacific Summit Industries, LLC, doing business as ACALI Studios'
const GOVERNING_LAW = 'the State of California, United States'
const EFFECTIVE_DATE = 'June 22, 2026'

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cosmos-950 text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="text-stardust-400 hover:text-stardust-300 text-sm">
          ← Back to ViaStellis
        </Link>
        <h1 className="font-display text-4xl text-stardust-300 mt-6 mb-1">{title}</h1>
        <p className="text-slate-500 text-xs mb-8">Effective {EFFECTIVE_DATE}</p>
        <div className="space-y-5 text-sm leading-relaxed [&_h2]:text-slate-100 [&_h2]:font-display [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-2 [&_a]:text-stardust-400 [&_a]:underline">
          {children}
        </div>
        <footer className="mt-12 pt-6 border-t border-cosmos-800 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-2">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/refund">Refunds</Link>
          <Link to="/contact">Contact</Link>
        </footer>
      </div>
    </div>
  )
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        Welcome to {COMPANY}. {COMPANY} is operated by {LEGAL_ENTITY} (“{OPERATOR}”, “we”, “us”).
        By creating an account or using the {COMPANY} website and app (the “Service”), you agree to
        these Terms of Service. If you do not agree, please do not use the Service.
      </p>

      <h2>1. Entertainment purposes only</h2>
      <p>
        {COMPANY} provides Vedic and Western astrology readings, charts, and AI-generated guidance
        (“Stella”) for personal reflection and entertainment only. Nothing in the Service is, or
        should be relied upon as, financial, medical, legal, psychological, or other professional
        advice. Always consult a qualified professional for important decisions.
      </p>

      <h2>2. Eligibility & accounts</h2>
      <p>
        You must be at least 16 years old to use the Service. You are responsible for the activity
        on your account and for keeping your login credentials secure. Provide accurate information
        (including birth details, which power your chart) and keep it current.
      </p>

      <h2>3. Subscriptions, credits & billing</h2>
      <p>
        Some features (“Stella” AI readings) require credits. Credits are available through a paid
        subscription (which grants a recurring monthly credit allotment) or one-time credit packs.
        Payments are processed by our payment provider, Stripe; by purchasing, you also agree to
        Stripe’s terms. Subscriptions renew automatically until canceled. You can cancel anytime;
        cancellation stops future renewals but does not retroactively refund the current period.
        See our <Link to="/refund">Refund Policy</Link> for details.
      </p>

      <h2>4. Credits</h2>
      <p>
        Credits have no cash value, are non-transferable, and are consumed when you use AI
        features. Free, deterministic features (your birth chart, transit calendar, compatibility
        score, journal) do not require credits. We may adjust credit costs for AI features over
        time; material changes will be communicated in advance.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        Do not misuse the Service: no unlawful, abusive, or harmful activity; no attempts to
        reverse-engineer, overload, or gain unauthorized access to our systems; no using AI outputs
        to harm others. We may suspend or terminate accounts that violate these terms.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        The Service, including its design, text, and software, is owned by {OPERATOR} and protected
        by law. Your birth data and journal entries remain yours; you grant us a limited license to
        process them solely to operate the Service for you.
      </p>

      <h2>7. Disclaimers & limitation of liability</h2>
      <p>
        The Service is provided “as is,” without warranties of any kind. To the maximum extent
        permitted by law, {OPERATOR} is not liable for any indirect, incidental, or consequential
        damages, or for decisions you make based on the Service. Our total liability is limited to
        the amount you paid us in the 12 months before the claim.
      </p>

      <h2>8. Changes & governing law</h2>
      <p>
        We may update these Terms; continued use after changes means you accept them. These Terms
        are governed by the laws of {GOVERNING_LAW}. Questions? Contact{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalLayout>
  )
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains what information {OPERATOR} (operator of {COMPANY}) collects,
        how we use it, and your choices. We aim to collect only what we need to give you a meaningful, personal experience.
      </p>

      <h2>1. Information we collect</h2>
      <p>
        <strong>Account:</strong> your email address and display name.<br />
        <strong>Birth details:</strong> the date, time, and place of birth you provide, used to
        compute your astrological chart. You may mark your birth time as unknown.<br />
        <strong>Your content:</strong> journal entries, saved charts, and questions you ask Stella.<br />
        <strong>Usage:</strong> basic logs of feature usage and credit activity needed to run the
        Service.<br />
        <strong>Payment:</strong> handled by Stripe — we receive confirmation and subscription
        status, but <em>never</em> your full card number.
      </p>

      <h2>2. How we use it</h2>
      <p>
        To create your chart and readings, operate AI features, process payments and credits,
        provide support, secure the Service, and comply with law. We do not sell your personal
        information.
      </p>

      <h2>3. Service providers</h2>
      <p>
        We share data only with providers that help us operate, under contract: <strong>Supabase</strong>{' '}
        (authentication and database hosting), <strong>Stripe</strong> (payments), and{' '}
        <strong>Google (Gemini API)</strong> (AI generation — your chart context and questions are
        sent to generate Stella’s responses). These providers process data on our behalf.
      </p>

      <h2>4. Data retention & deletion</h2>
      <p>
        We keep your data while your account is active. You can request access to, correction of,
        or deletion of your personal data at any time by emailing{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Deleting your account removes your
        charts, journal entries, and profile, subject to limited records we must retain (e.g.,
        payment records for accounting).
      </p>

      <h2>5. Security</h2>
      <p>
        We use industry-standard measures including encryption in transit and row-level access
        controls so that your data is only accessible to you. No system is perfectly secure, but we
        work to protect your information.
      </p>

      <h2>6. Children</h2>
      <p>The Service is not directed to children under 16, and we do not knowingly collect their data.</p>

      <h2>7. Changes & contact</h2>
      <p>
        We may update this policy; we’ll revise the “Effective” date above. Questions or requests:{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalLayout>
  )
}

export function RefundPage() {
  return (
    <LegalLayout title="Refund & Cancellation Policy">
      <p>
        We want you to be happy with {COMPANY}. This policy explains how subscriptions, credit
        packs, and refunds work.
      </p>

      <h2>1. Subscriptions</h2>
      <p>
        Subscriptions renew automatically each billing period. You can cancel anytime from your
        account settings or by emailing <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        When you cancel, you keep access through the end of the period you already paid for, and you
        won’t be charged again. We generally do not provide partial refunds for the current period.
      </p>

      <h2>2. Free trial</h2>
      <p>
        If your subscription includes a free trial, you won’t be charged until the trial ends.
        Cancel before the trial ends to avoid any charge.
      </p>

      <h2>3. Credit packs</h2>
      <p>
        One-time credit packs are sold as digital goods and are generally non-refundable once any
        credits from the pack have been used, since AI generation incurs immediate cost. Unused,
        unredeemed packs may be refundable at our discretion within 14 days of purchase.
      </p>

      <h2>4. How to request a refund</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your account email and a
        brief description. We review requests case by case and aim to respond within a few business
        days. Where required by applicable consumer-protection law, we honor your statutory refund
        rights regardless of the above.
      </p>
    </LegalLayout>
  )
}

export function ContactPage() {
  return (
    <LegalLayout title="Contact Us">
      <p>
        We’d love to hear from you — questions, feedback, billing help, or data requests.
      </p>
      <h2>Email</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        <br />
        We aim to reply within a few business days.
      </p>
      <h2>What to include</h2>
      <p>
        For account or billing issues, include the email address on your account (please never send
        full payment card details). For data access or deletion requests, let us know what you’d
        like and we’ll guide you through it.
      </p>
    </LegalLayout>
  )
}
