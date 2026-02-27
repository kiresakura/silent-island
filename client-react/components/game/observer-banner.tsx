'use client'

import { motion } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { Eye } from 'lucide-react'

export function ObserverBanner() {
  const { state } = useGame()

  if (!state.isObserver) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 0.7, y: 0 }}
      className="flex items-center justify-center gap-2 py-1.5 bg-card/80 text-dim text-xs shrink-0"
      role="status"
    >
      <Eye className="w-3.5 h-3.5" />
      <span>觀察者模式</span>
    </motion.div>
  )
}
