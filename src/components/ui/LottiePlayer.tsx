'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'

// Chargement dynamique pour éviter les erreurs SSR
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

interface Props {
  src: string           // chemin vers le JSON dans /public/animations/
  className?: string
  loop?: boolean
  autoplay?: boolean
  style?: React.CSSProperties
}

export default function LottiePlayer({ src, className, loop = true, autoplay = true, style }: Props) {
  const [data, setData] = React.useState<object | null>(null)

  React.useEffect(() => {
    fetch(src)
      .then(r => r.json())
      .then(setData)
      .catch(() => null)
  }, [src])

  if (!data) return null

  return (
    <Suspense fallback={null}>
      <Lottie
        animationData={data}
        loop={loop}
        autoplay={autoplay}
        className={className}
        style={style}
      />
    </Suspense>
  )
}
