'use client'

import React, { useRef, useState, useCallback } from 'react'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  intensity?: number   // max rotation degrees (default: 12)
  scale?: number       // scale on hover (default: 1.02)
  shine?: boolean      // show gloss shine (default: true)
}

export default function TiltCard({
  children,
  className = '',
  intensity = 12,
  scale = 1.02,
  shine = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [shineStyle, setShineStyle] = useState<React.CSSProperties>({ opacity: 0 })
  const rafRef = useRef<number>(0)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width   // 0 → 1
      const y = (e.clientY - rect.top)  / rect.height  // 0 → 1
      const rotX = (0.5 - y) * intensity * 2   // positive = tilt up
      const rotY = (x - 0.5) * intensity * 2   // positive = tilt right

      // Shadow shifts with tilt direction
      const shadowX = rotY * 0.5
      const shadowY = -rotX * 0.5
      const shadowBlur = 24 + Math.abs(rotX) + Math.abs(rotY)

      setStyle({
        transform: `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(${scale},${scale},${scale})`,
        transition: 'transform 0.1s ease-out',
        boxShadow: `${shadowX}px ${shadowY + 8}px ${shadowBlur}px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)`,
      })

      if (shine) {
        // Shine moves opposite to tilt direction
        const shineX = (1 - x) * 100
        const shineY = (1 - y) * 100
        setShineStyle({
          opacity: 0.28,
          background: `radial-gradient(ellipse at ${shineX}% ${shineY}%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)`,
          mixBlendMode: 'overlay',
        })
      }
    })
  }, [intensity, scale, shine])

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setStyle({
      transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
      transition: 'transform 0.5s ease-out, box-shadow 0.5s ease-out',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    })
    setShineStyle({ opacity: 0, transition: 'opacity 0.4s' })
  }, [])

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{ ...style, willChange: 'transform' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {shine && (
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none z-10"
          style={shineStyle}
        />
      )}
    </div>
  )
}
