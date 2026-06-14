import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#09111f' }}>
      {/* Barre CMYK */}
      <div className="fixed top-0 left-0 right-0 flex" style={{ height: '3px' }}>
        <div className="flex-1" style={{ background: '#00AEEF' }} />
        <div className="flex-1" style={{ background: '#E8001A' }} />
        <div className="flex-1" style={{ background: '#F5C400' }} />
      </div>

      <div className="rounded-2xl p-10 max-w-md w-full text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="font-black mb-2" style={{ fontSize: '7rem', lineHeight: 1, color: '#00AEEF' }}>404</p>
        <h1 className="text-xl font-bold text-white mb-2">Page introuvable</h1>
        <p className="text-slate-400 text-sm mb-8">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="font-bold text-sm px-6 py-3 rounded-xl transition-opacity hover:opacity-90"
            style={{ background: '#00AEEF', color: 'white' }}>
            Retour à l'accueil
          </Link>
          <Link href="/catalogue"
            className="font-bold text-sm px-6 py-3 rounded-xl transition-colors hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}>
            Voir le catalogue
          </Link>
        </div>
      </div>
    </div>
  )
}
