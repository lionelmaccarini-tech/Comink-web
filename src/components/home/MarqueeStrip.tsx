const ITEMS = [
  'BANDEROLES',
  'BÂCHES',
  'ROLL-UP',
  'DIBOND',
  'FOREX',
  'ADHÉSIFS',
  'DRAPEAUX',
  'PANNEAUX',
  'TOILES',
  'TEXTILE',
  'KAKÉMONOS',
  'VITROPHANIE',
]

const SEPARATOR = '·'

export default function MarqueeStrip() {
  // Duplicate list for seamless loop
  const track = [...ITEMS, ...ITEMS]

  return (
    <div
      className="w-full overflow-hidden bg-[#0a0f1e] border-y border-white/[0.06] py-3.5"
      aria-hidden="true"
    >
      <div
        className="flex whitespace-nowrap"
        style={{
          animation: 'marquee 28s linear infinite',
          willChange: 'transform',
        }}
      >
        {track.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="text-sm font-black uppercase tracking-[0.2em] text-white/50 px-4">
              {item}
            </span>
            <span className="text-white/25 font-black text-xs">{SEPARATOR}</span>
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
