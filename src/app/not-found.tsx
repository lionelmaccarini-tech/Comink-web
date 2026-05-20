import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <p className="text-6xl font-black text-slate-200 mb-4">404</p>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Page introuvable</h1>
        <p className="text-slate-500 text-sm mb-8">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors">
            Retour à l'accueil
          </Link>
          <Link href="/catalogue"
            className="border-2 border-slate-200 hover:border-blue-400 text-slate-700 font-bold text-sm px-6 py-3 rounded-xl transition-colors">
            Voir le catalogue
          </Link>
        </div>
      </div>
    </div>
  )
}
