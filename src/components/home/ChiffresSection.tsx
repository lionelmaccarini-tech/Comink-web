'use client'

import React, { useEffect, useRef, useState } from 'react'

const chiffres = [
  { value: 15000, suffix: ' m²', sub: 'imprimés chaque mois', label: 'pour vos projets' },
  { value: 850, suffix: '+', sub: 'clients professionnels', label: 'nous font confiance' },
  { value: 10, suffix: ' ans', sub: "d'expérience", label: 'au service des pros' },
  { value: 100, suffix: '%', sub: 'production locale', label: 'à Liège' },
]

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const duration = 1500
        const step = Math.ceil(target / (duration / 16))
        let current = 0
        const timer = setInterval(() => {
          current = Math.min(current + step, target)
          setCount(current)
          if (current >= target) clearInterval(timer)
        }, 16)
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return <span ref={ref}>{count.toLocaleString('fr-BE')}{suffix}</span>
}

export default function ChiffresSection() {
  return (
    <section className="bg-slate-900 py-14">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {chiffres.map((c) => (
            <div key={c.sub} className="flex flex-col items-center text-center">
              <span className="text-3xl md:text-4xl font-extrabold text-white">
                <CountUp target={c.value} suffix={c.suffix} />
              </span>
              <span className="text-sm font-bold mt-1 text-blue-400">{c.sub}</span>
              <span className="text-slate-400 text-xs mt-0.5">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
