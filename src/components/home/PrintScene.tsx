'use client'

import React, { useEffect, useRef, useMemo } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

// ── Panel config (positions en px relatifs au centre du viewport) ─────────────

const PANELS = [
  { id: 'forex1',   w: 280, h: 175, label: 'FOREX',      sub: '10mm PVC',
    cx: -120, cy: 30,   tz:-140, rx: 8,  ry:-20, color:'#e8f2ff', accent:'#3b82f6', delay:0.0, dur:6.5, amp:16 },
  { id: 'dibond1',  w: 210, h: 130, label: 'DIBOND',     sub: 'Alu. 3mm',
    cx:  260, cy:-60,   tz: -60, rx:-10, ry: 26, color:'#ccdcf4', accent:'#60a5fa', delay:0.3, dur:5.8, amp:20 },
  { id: 'bache1',   w: 380, h:  95, label: 'BÂCHE',      sub: '510gr grand format',
    cx:   60, cy: 160,  tz:-220, rx: 4,  ry:  8, color:'#ddeeff', accent:'#6366f1', delay:0.6, dur:8.0, amp:10 },
  { id: 'rollup1',  w:  80, h: 215, label: 'ROLL-UP',    sub: '85×200 cm',
    cx: -340, cy:  10,  tz: -50, rx: 4,  ry: 42, color:'#f0f4ff', accent:'#8b5cf6', delay:0.2, dur:7.0, amp:24 },
  { id: 'adhesif1', w: 145, h:  90, label: 'ADHÉSIF',    sub: 'Vinyle découpé',
    cx:  380, cy:  90,  tz:  30, rx: 16, ry:-36, color:'#e4f0ff', accent:'#0ea5e9', delay:0.9, dur:4.8, amp:28 },
  { id: 'carton1',  w: 185, h: 130, label: 'CARTON',     sub: 'Mousse 3mm',
    cx: -260, cy:-130,  tz: -90, rx:-16, ry: 46, color:'#f5edd0', accent:'#d97706', delay:0.5, dur:6.2, amp:18 },
  { id: 'panneau1', w: 165, h: 110, label: 'PANNEAU',    sub: 'PVC Expensé',
    cx:  420, cy:-140,  tz:-100, rx: 12, ry:-50, color:'#eef2ff', accent:'#3b82f6', delay:0.7, dur:5.5, amp:22 },
  { id: 'forex2',   w: 130, h:  82, label: 'FOREX',      sub: '5mm blanc',
    cx: -420, cy: 150,  tz:  10, rx:-26, ry: 56, color:'#dce8ff', accent:'#6366f1', delay:1.1, dur:5.2, amp:30 },
  { id: 'grand1',   w: 240, h: 155, label: 'IMPRESSION', sub: 'Grand Format Liège',
    cx:   20, cy:-200,  tz:-300, rx: 6,  ry: 16, color:'#c8d8f0', accent:'#1d4ed8', delay:0.4, dur:9.0, amp: 8 },
  { id: 'dibond2',  w: 105, h:  66, label: 'DIBOND',     sub: 'Brillant',
    cx:  140, cy: 220,  tz:  50, rx: 18, ry:-28, color:'#b8ccee', accent:'#2563eb', delay:1.3, dur:4.5, amp:26 },
]

export default function PrintScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const mx = useSpring(rawX, { stiffness: 25, damping: 18 })
  const my = useSpring(rawY, { stiffness: 25, damping: 18 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      rawX.set((e.clientX - r.left  - r.width  / 2) / r.width  * 40)
      rawY.set((e.clientY - r.top   - r.height / 2) / r.height * 28)
    }
    const onLeave = () => { rawX.set(0); rawY.set(0) }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave) }
  }, [rawX, rawY])

  // Particles
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      s: Math.random() * 3 + 1.5, d: 4 + Math.random() * 5, dl: Math.random() * 4,
    })), [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ perspective: '1100px', perspectiveOrigin: '50% 50%' }}
    >
      {/* Particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-400/35 pointer-events-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s }}
          animate={{ y: [0, -28, 0], opacity: [0.15, 0.55, 0.15] }}
          transition={{ duration: p.d, delay: p.dl, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Panels — positionnés depuis le centre avec translateX/Y absolus */}
      {PANELS.map(p => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: '50%',
            top:  '50%',
            width: p.w,
            height: p.h,
            marginLeft: -(p.w / 2),
            marginTop:  -(p.h / 2),
          }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: p.delay * 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            style={{
              width: '100%',
              height: '100%',
              rotateX: p.rx,
              rotateY: p.ry,
            }}
            animate={{
              x:       [p.cx, p.cx + p.amp * 0.5,  p.cx - p.amp * 0.3, p.cx],
              y:       [p.cy, p.cy - p.amp,         p.cy + p.amp * 0.4, p.cy],
              rotateY: [p.ry, p.ry + 5,  p.ry - 4,  p.ry],
              rotateX: [p.rx, p.rx - 3,  p.rx + 2,  p.rx],
              translateZ: [p.tz, p.tz + 20, p.tz - 10, p.tz],
            }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              className="w-full h-full rounded-xl flex flex-col items-start justify-between p-3 select-none"
              style={{
                background: `linear-gradient(135deg, ${p.color} 0%, ${p.color}cc 100%)`,
                border: `1px solid ${p.accent}28`,
                boxShadow: `0 16px 48px ${p.accent}18, 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.22)`,
                backdropFilter: 'blur(2px)',
              }}
            >
              <div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%)' }}
              />
              <span className="text-[9px] font-black tracking-[0.18em] uppercase relative z-10" style={{ color: p.accent }}>
                {p.label}
              </span>
              <span className="text-[8px] font-medium relative z-10 mt-auto" style={{ color: p.accent, opacity: 0.55 }}>
                {p.sub}
              </span>
              <div className="absolute bottom-0 left-0 h-[2px] w-2/3 rounded-b-xl" style={{ background: `linear-gradient(90deg, ${p.accent}70, transparent)` }} />
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  )
}
