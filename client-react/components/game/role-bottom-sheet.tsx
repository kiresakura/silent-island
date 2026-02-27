'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'

interface RoleBottomSheetProps {
  open: boolean
  onClose: () => void
}

export function RoleBottomSheet({ open, onClose }: RoleBottomSheetProps) {
  const { state, dispatch } = useGame()
  const { role } = state

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-30 max-h-[50dvh] bg-card rounded-t-xl border-t border-border"
            role="dialog"
            aria-label="角色資訊"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-dim/40" />
            </div>

            <div className="px-5 pb-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(50dvh - 24px)' }}>
              {role ? (
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-bold text-crimson-light">{role.name}</h3>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-dim uppercase tracking-wider">被動能力</span>
                    <p className="text-sm text-text-secondary leading-relaxed">{role.passive}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-dim uppercase tracking-wider">主動能力</span>
                    <p className="text-sm text-text-secondary leading-relaxed">{role.ability}</p>
                    {!role.abilityUsed && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          dispatch({ type: 'USE_ABILITY' })
                          onClose()
                        }}
                        className="mt-1 py-2 px-4 rounded-lg bg-crimson/20 border border-crimson/40 text-crimson-light text-sm font-medium hover:bg-crimson/30 transition-colors min-h-[44px]"
                      >
                        使用能力
                      </motion.button>
                    )}
                    {role.abilityUsed && (
                      <span className="text-xs text-dim italic">能力已使用</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-dim text-center py-4">尚未分配角色</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
