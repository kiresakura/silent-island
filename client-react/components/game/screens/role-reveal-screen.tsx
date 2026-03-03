'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '@/lib/game-context'

export function RoleRevealScreen() {
  const { state, dispatch } = useGame()
  const role = state.role
  const [flipped, setFlipped] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Trigger flip after 1 second
  useEffect(() => {
    const flipTimer = setTimeout(() => setFlipped(true), 1000)
    return () => clearTimeout(flipTimer)
  }, [])

  // Show details after flip completes
  useEffect(() => {
    if (!flipped) return
    const detailTimer = setTimeout(() => setShowDetails(true), 800)
    return () => clearTimeout(detailTimer)
  }, [flipped])

  if (!role) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center flex-1 px-6 gap-8"
    >
      {/* Card with 3D flip */}
      <div className="w-[220px] h-[140px]" style={{ perspective: 800 }}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Card back */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-sm text-[var(--dim)] tracking-widest">
              你 的 身 份
            </span>
          </div>

          {/* Card front (role name) */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-[var(--crimson)] bg-[var(--card)]"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-2xl font-bold text-foreground tracking-wider">
              {role.name}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Role details — fade in after flip */}
      <div className="flex flex-col items-center gap-4 max-w-[300px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: showDetails ? 1 : 0,
            y: showDetails ? 0 : 10,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xs text-[var(--dim)]">被動特質</span>
          <p className="text-sm text-[var(--text-secondary)] text-center leading-relaxed">
            {role.passive}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: showDetails ? 1 : 0,
            y: showDetails ? 0 : 10,
          }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xs text-[var(--dim)]">主動能力</span>
          <p className="text-sm text-[var(--text-secondary)] text-center leading-relaxed">
            {role.ability}
          </p>
        </motion.div>
      </div>

      {/* Ready button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: showDetails ? 1 : 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'waiting' })}
        className="mt-2 px-8 py-3 rounded-lg bg-gradient-to-r from-[var(--crimson)] to-[var(--crimson-light)] text-foreground font-medium text-sm min-h-[44px]"
      >
        準備好了
      </motion.button>
    </motion.div>
  )
}
