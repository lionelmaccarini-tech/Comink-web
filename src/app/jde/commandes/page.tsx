import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function JDECommandesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/jde/login')

  const service = await createServiceClient()
  const { data: jdeClient } = await service
    .from('jde_clients')
    .select('id, full_name')
    .eq('user_id', user.id)
    .single()

  if (!jdeClient) redirect('/jde/login')

  const { data: orders } = await service
    .from('jde_orders')
    .select('*, jde_order_items(*)')
    .eq('client_id', jdeClient.id)
    .order('created_at', { ascending: false })

  const statusLabel = (s: string) => {
    if (s === 'completed') return { label: 'Terminé', cls: 'bg-green-100 text-green-700' }
    if (s === 'processing') return { label: 'En cours', cls: 'bg-blue-100 text-blue-700' }
    if (s === 'cancelled') return { label: 'Annulé', cls: 'bg-slate-100 text-slate-500' }
    return { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Mes commandes</h1>
        <Link
          href="/jde/catalogue"
          className="bg-[#F5C200] hover:bg-yellow-400 text-slate-900 font-bold text-sm px-4 py-2 rounded-xl transition-colors"
        >
          Nouveau produit
        </Link>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-4">📦</p>
          <h2 className="font-bold text-slate-700 mb-2">Aucune commande</h2>
          <p className="text-slate-400 text-sm mb-6">Vous n'avez pas encore passé de commande.</p>
          <Link
            href="/jde/catalogue"
            className="inline-flex bg-[#E8271A] hover:bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Voir le catalogue
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const { label, cls } = statusLabel(order.status)
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-extrabold text-slate-900">{order.order_number}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(order.created_at).toLocaleDateString('fr-BE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#E8271A]">{order.total_points} pts</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cls}`}>{label}</span>
                  </div>
                </div>

                {order.jde_order_items && order.jde_order_items.length > 0 && (
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    {order.jde_order_items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">
                          {item.product_name}
                          <span className="text-slate-400 ml-1">x{item.quantity}</span>
                        </span>
                        <span className="text-slate-500">{item.point_cost_each * item.quantity} pts</span>
                      </div>
                    ))}
                  </div>
                )}

                {order.notes && (
                  <p className="text-xs text-slate-400 mt-3 border-t border-slate-100 pt-3">{order.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
