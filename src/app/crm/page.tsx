'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import CrmDashboard from '@/components/crm/CrmDashboard'
import NewOrderModal from '@/components/production/NewOrderModal'

export default function CrmPage() {
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [successMsg,   setSuccessMsg]   = useState('')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
          <p className="text-slate-500 text-sm mt-0.5">Vue d'ensemble du pipeline commercial</p>
        </div>
        <button
          onClick={() => setShowNewOrder(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouvelle commande
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
          ✅ Commande <strong>#{successMsg}</strong> créée — lignes envoyées en production.
          <button onClick={() => setSuccessMsg('')} className="ml-auto text-emerald-400 hover:text-emerald-600">✕</button>
        </div>
      )}

      <CrmDashboard />

      {showNewOrder && (
        <NewOrderModal
          onClose={() => setShowNewOrder(false)}
          onCreated={(orderNumber) => {
            setShowNewOrder(false)
            setSuccessMsg(orderNumber)
          }}
        />
      )}
    </div>
  )
}
