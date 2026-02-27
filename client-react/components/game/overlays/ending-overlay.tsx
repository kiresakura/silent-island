'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { useEffect, useState } from 'react'

function TypewriterTitle({ text }: { text: string }) {
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    setVisible(0)
    const t = setInterval(() => {
      setVisible((p) => {
        if (p >= text.length) { clearInterval(t); return p }
        return p + 1
      })
    }, 50)
    return () => clearInterval(t)
  }, [text])

  return (
    <span>
      {text.split('').map((c, i) => (
        <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: i < visible ? 1 : 0 }}>
          {c}
        </motion.span>
      ))}
    </span>
  )
}

export function EndingOverlay() {
  const { state, dispatch } = useGame()
  const { showEnding, endingData, reflectionSeconds } = state
  const [phase, setPhase] = useState(0) // 0=title, 1=social, 2=personal, 3=closure, 4=stats, 5=reflection

  useEffect(() => {
    if (!showEnding) { setPhase(0); return }
    const delays = [2000, 5000, 8000, 11000, 13000]
    const timers = delays.map((d, i) => setTimeout(() => setPhase(i + 1), d))
    return () => timers.forEach(clearTimeout)
  }, [showEnding])

  useEffect(() => {
    if (phase < 5 || reflectionSeconds <= 0) return
    const t = setInterval(() => dispatch({ type: 'TICK_REFLECTION' }), 1000)
    return () => clearInterval(t)
  }, [phase, reflectionSeconds, dispatch])

  if (!endingData) return null

  const sentences = endingData.socialText.split('。').filter(Boolean).map((s) => s + '。')

  return (
    <AnimatePresence>
      {showEnding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black overflow-y-auto custom-scrollbar"
        >
          <div className="flex flex-col items-center gap-6 px-6 py-10 max-w-sm">
            {/* Social ending title */}
            <h2 className="text-2xl font-bold text-crimson-light text-center">
              <TypewriterTitle text={endingData.socialTitle} />
            </h2>

            {/* Social ending text - sentence by sentence */}
            {phase >= 1 && (
              <div className="flex flex-col gap-2">
                {sentences.map((s, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.4 }}
                    className="text-sm text-text-secondary text-center leading-relaxed"
                  >
                    {s}
                  </motion.p>
                ))}
              </div>
            )}

            {/* Personal ending */}
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2 mt-4 p-4 rounded-lg bg-card/50 border border-border w-full"
              >
                <span className="text-2xl">{endingData.personalIcon}</span>
                <span className="text-sm font-medium text-foreground">{endingData.personalLabel}</span>
                <p className="text-xs text-dim text-center leading-relaxed">{endingData.personalText}</p>
              </motion.div>
            )}

            {/* Closure */}
            {phase >= 3 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                className="text-xs italic text-dim text-center mt-4"
              >
                {endingData.closureText}
              </motion.p>
            )}

            {/* Final stats */}
            {phase >= 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-6 text-xs mt-4"
              >
                <span>
                  <span className="text-crimson-light">恐懼</span>{' '}
                  <span className="text-foreground font-mono">{endingData.finalStats.socialFear}</span>
                </span>
                <span>
                  <span className="text-teal">流通</span>{' '}
                  <span className="text-foreground font-mono">{endingData.finalStats.thoughtFlow}</span>
                </span>
                <span>
                  <span className="text-amber">風險</span>{' '}
                  <span className="text-foreground font-mono">{endingData.finalStats.myRisk}</span>
                </span>
              </motion.div>
            )}

            {/* Reflection countdown */}
            {phase >= 5 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-1 mt-6"
              >
                <span className="text-xs text-dim">靜默反思</span>
                <span className="text-lg font-mono text-dim tabular-nums">{reflectionSeconds}s</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
