'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { Ghost } from 'lucide-react'

export function ForeshadowIndicator() {
  const { state } = useGame()
  const { foreshadowCount, screen } = state

  if (foreshadowCount === 0 || screen === 'join') return null

  return (
    <div className="fixed left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5" aria-label={`${foreshadowCount} 個伏筆累積`}>
      <AnimatePresence>
        {Array.from({ length: foreshadowCount }, (_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10, scale: 0.5 }}
            animate={{ opacity: 0.4, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ delay: i * 0.1, type: 'spring' }}
          >
            <Ghost className="w-4 h-4 text-dim" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
