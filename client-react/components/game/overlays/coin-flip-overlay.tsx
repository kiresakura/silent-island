'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { useState, useEffect } from 'react'

export function CoinFlipOverlay() {
  const { state, dispatch } = useGame()
  const { showCoinFlip, coinFlipResult } = state
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (!showCoinFlip) {
      setShowResult(false)
      return
    }
    const t = setTimeout(() => setShowResult(true), 1600)
    return () => clearTimeout(t)
  }, [showCoinFlip])

  useEffect(() => {
    if (!showResult) return
    const t = setTimeout(() => dispatch({ type: 'HIDE_COIN_FLIP' }), 2500)
    return () => clearTimeout(t)
  }, [showResult, dispatch])

  return (
    <AnimatePresence>
      {showCoinFlip && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/90"
          role="alert"
          aria-label={`擲硬幣結果：${coinFlipResult === 'heads' ? '正面' : '反面'}`}
        >
          {/* Coin */}
          <div className="relative">
            <motion.div
              className="w-24 h-24 rounded-full bg-gradient-to-br from-amber to-amber/60 flex items-center justify-center text-4xl shadow-lg"
              style={{ transformStyle: 'preserve-3d' }}
              animate={
                !showResult
                  ? {
                      rotateY: [0, 1080, 1440, 1620, 1800],
                      y: [0, -80, -20, 10, 0],
                    }
                  : {}
              }
              transition={{ duration: 1.5, ease: 'easeOut' }}
            >
              <span className="text-background font-bold text-2xl">
                {showResult ? (coinFlipResult === 'heads' ? '正' : '反') : '?'}
              </span>
            </motion.div>

            {/* Radial glow on reveal */}
            {showResult && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 2, opacity: [0, 0.4, 0] }}
                transition={{ duration: 1 }}
                className="absolute inset-0 rounded-full bg-amber/30 blur-xl"
              />
            )}
          </div>

          {/* Result text */}
          <AnimatePresence>
            {showResult && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-lg font-medium text-foreground"
              >
                {coinFlipResult === 'heads' ? '正面' : '反面'}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
