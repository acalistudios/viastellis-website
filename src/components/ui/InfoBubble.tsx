/**
 * InfoBubble — a small "?" icon that toggles an explanatory popover.
 * Click/tap to open; click anywhere else (or Escape) to close.
 */

import { useState, useRef, useEffect, type ReactNode } from 'react'

interface InfoBubbleProps {
  /** Popover heading */
  title: string
  children: ReactNode
  /** Where the popover opens relative to the icon */
  align?: 'left' | 'right' | 'center'
}

export function InfoBubble({ title, children, align = 'center' }: InfoBubbleProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const alignClass =
    align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'

  return (
    <span ref={ref} className="relative inline-flex print:hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={`What is ${title}?`}
        aria-expanded={open}
        className="w-4 h-4 rounded-full bg-cosmos-700 hover:bg-cosmos-600 text-slate-400 hover:text-stardust-300 text-[10px] font-semibold leading-none inline-flex items-center justify-center transition-colors align-middle"
      >
        ?
      </button>

      {open && (
        <span
          role="tooltip"
          className={`absolute z-40 top-6 ${alignClass} w-60 bg-cosmos-800 border border-cosmos-600 rounded-xl px-4 py-3 shadow-2xl text-left normal-case tracking-normal`}
        >
          <span className="block text-stardust-300 text-xs font-semibold mb-1">{title}</span>
          <span className="block text-slate-400 text-xs leading-relaxed font-normal">{children}</span>
        </span>
      )}
    </span>
  )
}
