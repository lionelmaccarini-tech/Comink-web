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

      setStyle({
        transform: `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(${scale},${scale},${scale})`,
        transition: 'transform 0.1s ease-out',
      })

      if (shine) {
        // Shine moves opposite to tilt direction (light reflection)
        const shineX = (1 - x) * 100
        const shineY = (1 - y) * 100
        setShineStyle({
          opacity: 0.12,
          background: `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.8) 0%, transparent 60%)`,
        })
      }
    })
  }, [intensity, scale, shine])

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setStyle({ transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)', transition: 'transform 0.5s ease-out' })
    setShineStyle({ opacity: 0, transition: 'opacity 0.4s' })
  }, [])

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{ ...style, transformStyle: 'preserve-3d', willChange: 'transform' }}
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
