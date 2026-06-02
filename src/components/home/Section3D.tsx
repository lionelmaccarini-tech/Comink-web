'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface Section3DProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export default function Section3D({ children, delay = 0, className = '' }: Section3DProps) {
  return (
    <div style={{ perspective: '1200px' }} className={className}>
      <motion.div
        initial={{ opacity: 1, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  )
}
