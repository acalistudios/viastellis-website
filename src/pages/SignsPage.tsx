import { AllSignsHoroscopes } from '@/components/horoscopes/AllSignsHoroscopes'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'

/**
 * SignsPage — every sign's reading, inside the app. Same content as the public
 * /horoscopes page, but in the app frame ("← Home", bottom nav) and without the
 * sign-up pitch, which made no sense to someone already signed in.
 */
export function SignsPage() {
  return (
    <div className="px-6 pt-6 pb-10 max-w-lg lg:max-w-3xl mx-auto w-full">
      <AllSignsHoroscopes variant="app" />
      <p className="mt-8 text-[11px] text-slate-600 max-w-xs mx-auto text-center">{ENTERTAINMENT_DISCLAIMER}</p>
    </div>
  )
}
