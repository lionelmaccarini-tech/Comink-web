'use client'

import React, { useEffect, useState } from 'react'
import QuoteEditor from './QuoteEditor'

export default function QuoteEditorLoader({ quoteId }: { quoteId: string }) {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/crm/quotes/${quoteId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [quoteId])

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <QuoteEditor initialData={data} />
}
