import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

/**
 * Date and time inputs need extra help in WKWebView (iOS).
 *
 * Safari gives input[type=date|time|datetime-local] an intrinsic width from
 * its UA stylesheet which `w-full` alone does not defeat, so the control
 * overflows its container — observed on 2026-10-31 on onboarding step 3,
 * where the birth-time field ran off the right edge of an iPhone screen
 * while every neighbouring element respected the gutter.
 *
 * - `min-w-0` lets the control shrink below that intrinsic minimum.
 * - `appearance-none` drops the UA widget sizing. The native picker still
 *   opens on tap; only Safari's own chrome around the value goes away.
 * - `::-webkit-date-and-time-value` is the inner element that actually holds
 *   the text; Safari centres it, which looks wrong next to our left-aligned
 *   text inputs.
 *
 * Scoped to these three types so ordinary text inputs are untouched.
 */
const DATE_TIME_TYPES = new Set(['date', 'time', 'datetime-local'])
const DATE_TIME_FIXES =
  'min-w-0 appearance-none [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.2em]'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const isDateTime = typeof props.type === 'string' && DATE_TIME_TYPES.has(props.type)

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm text-slate-400 font-medium">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          {...props}
          className={cn(
            'w-full bg-cosmos-800 border border-cosmos-600 rounded-xl px-4 py-3',
            'text-slate-100 placeholder:text-slate-600',
            'transition-colors duration-200',
            'focus:outline-none focus:border-stardust-400 focus:ring-1 focus:ring-stardust-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isDateTime && DATE_TIME_FIXES,
            error && 'border-rose-400 focus:border-rose-400 focus:ring-rose-400',
            className
          )}
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
