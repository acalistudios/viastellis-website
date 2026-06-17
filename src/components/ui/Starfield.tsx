/**
 * Animated starfield background — procedurally generated, fixed seed per render.
 * Used as a backdrop for auth and landing pages.
 */

import { useEffect, useRef } from 'react'

interface StarfieldProps {
  /** Number of stars (default 100) */
  count?: number
  /** CSS class for the container */
  className?: string
}

export function Starfield({ count = 100, className }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fit canvas to window
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Generate stable stars (seeded by position)
    const stars: Array<{ x: number; y: number; r: number; opacity: number }> = []
    const seed = 42
    let rng = seed

    // Simple seeded random
    const random = () => {
      rng = (rng * 9301 + 49297) % 233280
      return rng / 233280
    }

    for (let i = 0; i < count; i++) {
      stars.push({
        x: random() * canvas.width,
        y: random() * canvas.height,
        r: random() * 1.5,
        opacity: 0.3 + random() * 0.7,
      })
    }

    // Animation loop
    let animationId: number
    let time = 0

    const animate = () => {
      time += 0.01

      // Clear canvas with dark sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, '#0f0817')      // Deep purple
      gradient.addColorStop(0.5, '#1a1a3f')    // Blue-black
      gradient.addColorStop(1, '#0a0e27')      // Dark blue-black
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw stars with subtle twinkling
      ctx.fillStyle = '#ffffff'
      stars.forEach((star, i) => {
        const twinkle = Math.sin(time * 2 + i) * 0.3
        ctx.globalAlpha = Math.max(0.1, star.opacity + twinkle)
        ctx.fillRect(star.x, star.y, star.r, star.r)
      })
      ctx.globalAlpha = 1

      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [count])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 ${className || ''}`}
      style={{ background: 'transparent' }}
    />
  )
}
