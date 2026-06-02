'use client'

import React from 'react'

const PANELS = [
  { w: 340, h:  88, left: '8%',   top: '18%', rx:  8, ry:-18, color: '#e4eeff', dur: 7.2, delay: 0.0, label: 'BÂCHE' },
  { w: 240, h: 148, left: '64%',  top: '12%', rx:-10, ry: 24, color: '#c8d8f4', dur: 6.1, delay: 0.8, label: 'DIBOND' },
  { w:  78, h: 210, left:  '2%',  top: '42%', rx:  4, ry: 42, color: '#dce8ff', dur: 7.8, delay: 0.3, label: 'ROLL-UP' },
  { w: 390, h:  80, left: '22%',  top: '74%', rx:  3, ry:  7, color: '#d4e4ff', dur: 9.5, delay: 1.2, label: 'BÂCHE' },
  { w: 138, h:  84, left: '80%',  top: '55%', rx: 15, ry:-36, color: '#dce8ff', dur: 5.5, delay: 1.6, label: 'ADHÉSIF' },
  { w: 172, h: 118, left:  '1%',  top: '62%', rx:-14, ry: 46, color: '#e8efff', dur: 6.8, delay: 0.6, label: 'FOREX' },
  { w: 154, h: 106, left: '84%',  top: '20%', rx: 11, ry:-48, color: '#dde8ff', dur: 6.2, delay: 1.0, label: 'PANNEAU' },
  { w: 124, h:  78, left: '70%',  top: '82%', rx:-24, ry: 54, color: '#d0dcf4', dur: 5.8, delay: 1.9, label: 'FOREX' },
  { w: 272, h: 158, left: '33%',  top:  '8%', rx:  5, ry: 14, color: '#c4d4ee', dur:11.0, delay: 0.5, label: 'IMPRESSION' },
  { w: 100, h:  64, left: '52%',  top: '80%', rx: 17, ry:-26, color: '#b8ccee', dur: 5.2, delay: 2.2, label: 'DIBOND' },
  { w: 200, h:  62, left: '14%',  top: '86%', rx:  4, ry: 10, color: '#cce0ff', dur: 8.3, delay: 0.9, label: 'BÂCHE' },
  { w:  72, h: 195, left: '90%',  top: '38%', rx:  6, ry:-40, color: '#d8e8ff', dur: 6.6, delay: 1.4, label: 'ROLL-UP' },
]

export default function PrintScene() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ perspective: '1000px' }}>

      {/* Particules */}
      {Array.from({ length: 45 }, (_, i) => (
        <div
          key={`pt${i}`}
          className="absolute rounded-full"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            left: `${3 + (i * 137.5) % 94}%`,
            top: `${3 + (i * 97.3) % 94}%`,
            background: `rgba(96,165,250,${0.15 + (i % 5) * 0.08})`,
            animation: `cp-float ${4 + (i % 6)}s ease-in-out ${(i * 0.28) % 4}s infinite`,
          }}
        />
      ))}

      {/* Panneaux — float wrapper + tilt inner (pas de preserve-3d, pas d'overflow-hidden) */}
      {PANELS.map((p, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: p.left,
            top: p.top,
            width: p.w,
            height: p.h,
            animation: `cp-float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        >
          {/* Tilt 3D — pas de preserve-3d ni overflow-hidden */}
          <div
            style={{
              width: '100%',
              height: '100%',
              transform: `rotateX(${p.rx}deg) rotateY(${p.ry}deg)`,
            }}
          >
            {/* Face */}
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 12,
                background: `linear-gradient(135deg, ${p.color} 0%, ${p.color}cc 100%)`,
                border: '1px solid rgba(96,165,250,0.18)',
                boxShadow: '0 10px 36px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              {/* Reflet */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 52%)',
                pointerEvents: 'none',
              }} />
              <span style={{
                fontSize: 9, fontWeight: 900, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: 'rgba(59,130,246,0.75)',
                position: 'relative', zIndex: 1,
              }}>
                {p.label}
              </span>
              {/* Barre accent */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0,
                height: 2, width: '55%', borderRadius: '0 0 0 12px',
                background: 'linear-gradient(90deg, rgba(59,130,246,0.45), transparent)',
              }} />
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes cp-float {
          0%, 100% { transform: translateY(0px); }
          30% { transform: translateY(-13px) rotate(0.25deg); }
          70% { transform: translateY(-6px) rotate(-0.15deg); }
        }
      `}</style>
    </div>
  )
}
