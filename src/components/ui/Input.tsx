import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

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
