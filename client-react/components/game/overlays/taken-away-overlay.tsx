'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { useState, useEffect } from 'react'

export function TakenAwayOverlay() {
  const { state, dispatch, vibrate } = useGame()
  const { showTakenAway } = state
  const [phase, setPhase] = useState<'shake' | 'vignette' | 'fade' | 'done'>('shake')

  useEffect(() => {
    if (!showTakenAway) {
      setPhase('shake')
      return
    }
    vibrate([200, 100, 200, 100, 500])

    const t1 = setTimeout(() => setPhase('vignette'), 800)
    const t2 = setTimeout(() => setPhase('fade'), 2500)
    const t3 = setTimeout(() => {
      setPhase('done')
      dispatch({ type: 'SET_OBSERVER' })
    }, 4000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [showTakenAway, vibrate, dispatch])

  return (
    <AnimatePresence>
      {showTakenAway && phase !== 'done' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[45] flex items-center justify-center"
          role="alert"
          aria-label="你被帶走了"
        >
          {/* Background */}
          <motion.div
            className="absolute inset-0 bg-black"
            animate={
              phase === 'shake'
                ? { x: [0, -5, 5, -5, 5, -3, 0] }
                : {}
            }
            transition={{ duration: 0.5 }}
          />

          {/* Red vignette */}
          <motion.div
            className="absolute inset-0 vignette-red pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'vignette' || phase === 'fade' ? 0.9 : 0 }}
            transition={{ duration: 0.8 }}
          />

          {/* Text */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-4"
            animate={
              phase === 'fade'
                ? { opacity: 0 }
                : phase === 'vignette'
                  ? { opacity: [1, 0.5, 1, 0.3, 1] }
                  : { opacity: 0 }
            }
            transition={{ duration: phase === 'fade' ? 1.5 : 2 }}
          >
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'vignette' ? 1 : 0 }}
              className="text-2xl font-bold text-destructive"
            >
              你被帶走了
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'vignette' ? 0.6 : 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-dim"
            >
              從此，你只能旁觀。
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
