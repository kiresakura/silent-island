'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { X } from 'lucide-react'

export function TargetModal() {
  const { state, dispatch, send } = useGame()
  const { showTargetModal, targetModalMode, players } = state

  const handleSelect = (playerId: string) => {
    if (targetModalMode === 'ability') {
      send({ type: 'use_ability', target_player_id: playerId })
    }
    dispatch({ type: 'HIDE_TARGET_MODAL' })
  }

  const handleClose = () => {
    dispatch({ type: 'HIDE_TARGET_MODAL' })
  }

  return (
    <AnimatePresence>
      {showTargetModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-30 bg-[var(--card)] rounded-xl border border-[var(--border)] p-5 max-w-sm mx-auto"
            role="dialog"
            aria-label="選擇目標玩家"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">選擇目標玩家</h3>
              <button
                onClick={handleClose}
                className="text-[var(--dim)] hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
                aria-label="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {players.map((p) => (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelect(p.id)}
                  className="w-full py-3 text-sm text-foreground rounded-lg border border-[var(--border)] hover:border-[var(--crimson)]/50 transition-colors min-h-[44px]"
                >
                  {p.name}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
