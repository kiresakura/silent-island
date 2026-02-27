'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { useEffect, useState } from 'react'

export function SilenceOverlay() {
  const { state, dispatch } = useGame()
  const { showSilence, silenceSeconds, silenceAtmosphere } = state
  const [showAtmosphere, setShowAtmosphere] = useState(false)

  useEffect(() => {
    if (!showSilence || silenceSeconds <= 0) return
    const t = setInterval(() => dispatch({ type: 'TICK_SILENCE' }), 1000)
    return () => clearInterval(t)
  }, [showSilence, silenceSeconds, dispatch])

  useEffect(() => {
    if (!showSilence) {
      setShowAtmosphere(false)
      return
    }
    const t = setTimeout(() => setShowAtmosphere(true), 5000)
    return () => clearTimeout(t)
  }, [showSilence])

  const getColor = () => {
    if (silenceSeconds <= 10) return '#c0392b'
    if (silenceSeconds <= 20) return '#d4a017'
    return '#e0e0e0'
  }

  const getPulseDuration = () => {
    if (silenceSeconds <= 10) return 0.8
    if (silenceSeconds <= 20) return 1.5
    return 2.5
  }

  return (
    <AnimatePresence>
      {showSilence && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ backgroundColor: '#000' }}
          role="alert"
          aria-live="assertive"
          aria-label={`沉默倒數 ${silenceSeconds} 秒`}
        >
          {/* Breathing background */}
          <motion.div
            animate={{ backgroundColor: ['#000000', '#030303', '#000000'] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0"
          />

          {/* Countdown */}
          <motion.span
            key={silenceSeconds}
            initial={{ scale: 1.1, opacity: 0.8 }}
            animate={{
              scale: [1, 1.03, 1],
              opacity: 1,
            }}
            transition={{
              scale: { duration: getPulseDuration(), repeat: Infinity },
            }}
            className="relative z-10 font-mono font-bold tabular-nums"
            style={{ fontSize: '8rem', lineHeight: 1, color: getColor() }}
          >
            {silenceSeconds}
          </motion.span>

          {/* Label */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.5 }}
            className="relative z-10 mt-6 text-sm text-[var(--dim)] tracking-[0.15em]"
          >
            請保持沉默
          </motion.p>

          {/* Atmospheric text from server */}
          <AnimatePresence>
            {showAtmosphere && silenceAtmosphere && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-16 text-xs text-[var(--dim)] text-center px-8 italic"
              >
                {silenceAtmosphere}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
