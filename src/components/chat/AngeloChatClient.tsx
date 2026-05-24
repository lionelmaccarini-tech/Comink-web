'use client'

import dynamic from 'next/dynamic'

const AngeloChat = dynamic(() => import('./AngeloChat'), { ssr: false })

export default function AngeloChatClient() {
  return <AngeloChat />
}
