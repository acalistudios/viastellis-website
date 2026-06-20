/**
 * CreditCost — a small "· N credits" badge shown next to paid AI actions.
 * Hidden for Premium subscribers (everything is free for them).
 */
import { useUser } from '@/store/UserContext'
import { creditLabel } from '@/config/creditCosts'

export function CreditCost({
  credits,
  color = 'text-stellar-300',
  className = '',
}: {
  credits: number
  /** Tailwind text-color class — override for light-on-dark buttons. */
  color?: string
  className?: string
}) {
  const { profile } = useUser()
  if (profile?.subscription_tier === 'premium') return null
  return (
    <span className={`text-[10px] font-medium whitespace-nowrap ${color} ${className}`}>
      · {creditLabel(credits)}
    </span>
  )
}
