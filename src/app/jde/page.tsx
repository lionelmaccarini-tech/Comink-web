import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function JDEDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/jde/login')

  const service = await createServiceClient()
  const { data: jdeClient } = await service
    .from('jde_clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!jdeClient) redirect('/jde/login')

  const { data: recentOrders } = await service
    .from('jde_orders')
    .select('*')
    .eq('client_id', jdeClient.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: transactions } = await service
    .from('jde_point_transactions')
    .select('*')
    .eq('client_id', jdeClient.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Welcome banner */}
      <div className="bg-[#E8271A] rounded-2xl p-6 mb-8 text-white">
        <h1 className="text-2xl font-extrabold mb-1">
          Bonjour, {jdeClient.full_name}
        </h1>
        {jdeClient.company && (
          <p className="text-red-100 text-sm">{jdeClient.company}</p>
        )}
      </div>

      {/* Points + logo status grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Points card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">Solde de points</p>
          <p className="text-5xl font-extrabold text-[#F5C200]">{jdeClient.points_balance}</p>
          <p className="text-xs text-slate-400 mt-1">points disponibles</p>
          <Link
            href="/jde/catalogue"
            className="mt-4 inline-flex items-center gap-1.5 bg-[#F5C200] hover:bg-yellow-400 text-slate-900 font-bold text-sm px-4 py-2 rounded-xl transition-colors"
          >
            Voir le catalogue
          </Link>
        </div>

        {/* Logo card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-3">Votre logo</p>
          {jdeClient.logo_url ? (
            <div className="flex flex-col items-start gap-3">
              <img
                src={jdeClient.logo_url}
                alt="Votre logo"
                className="h-20 w-auto object-contain border border-slate-100 rounded-lg p-2 bg-slate-50"
              />
              <p className="text-xs text-slate-400">{jdeClient.logo_name}</p>
              <Link
                href="/jde/compte"
                className="text-xs text-[#E8271A] font-semibold hover:underline"
              >
                Modifier le logo
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <div className="h-20 w-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                <span className="text-slate-400 text-xs text-center px-2">Aucun logo</span>
              </div>
              <Link
                href="/jde/compte"
                className="inline-flex items-center gap-1.5 bg-[#E8271A] hover:bg-red-600 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
              >
                Ajouter mon logo
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { href: '/jde/catalogue', label: 'Catalogue', icon: '🛍️' },
          { href: '/jde/panier', label: 'Mon panier', icon: '🛒' },
          { href: '/jde/commandes', label: 'Mes commandes', icon: '📦' },
          { href: '/jde/compte', label: 'Mon compte', icon: '👤' },
        ].map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center gap-2 hover:border-[#F5C200] hover:shadow-sm transition-all text-center"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-semibold text-slate-700">{label}</span>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      {recentOrders && recentOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Commandes récentes</h2>
            <Link href="/jde/commandes" className="text-xs text-[#E8271A] font-semibold hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{order.order_number}</p>
                  <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString('fr-BE')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#E8271A]">{order.total_points} pts</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status === 'completed' ? 'Terminé' :
                     order.status === 'processing' ? 'En cours' : 'En attente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {transactions && transactions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 mb-4">Historique des points</h2>
          <div className="space-y-2">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm text-slate-700">{tx.description || tx.type}</p>
                  <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString('fr-BE')}</p>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-[#E8271A]'}`}>
                  {tx.type === 'credit' ? '+' : '-'}{Math.abs(tx.amount)} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
