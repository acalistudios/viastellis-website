import { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stardust-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cosmos-950',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        // Variants
        variant === 'primary' && 'bg-stardust-400 hover:bg-stardust-300 text-cosmos-950 active:scale-95',
        variant === 'secondary' && 'border border-stardust-400 text-stardust-400 hover:bg-cosmos-800 active:scale-95',
        variant === 'ghost' && 'text-slate-400 hover:text-slate-200',
        // Sizes
        size === 'sm' && 'text-sm px-4 py-2',
        size === 'md' && 'text-base px-6 py-3',
        size === 'lg' && 'text-lg px-8 py-4 w-full',
        className
      )}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
