'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'

export function Toast() {
  const { state } = useGame()

  return (
    <AnimatePresence>
      {state.toastVisible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs text-foreground shadow-lg"
          role="status"
          aria-live="polite"
        >
          {state.toastMessage}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
