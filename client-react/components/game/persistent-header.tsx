'use client'

import { useGame } from '@/lib/game-context'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const [display, setDisplay] = useState(value)
  const [delta, setDelta] = useState<number | null>(null)
  const prevRef = useRef(value)

  useEffect(() => {
    if (value !== prevRef.current) {
      setDelta(value - prevRef.current)
      prevRef.current = value
      setDisplay(value)
      const t = setTimeout(() => setDelta(null), 2000)
      return () => clearTimeout(t)
    }
  }, [value])

  return (
    <span className="relative inline-flex items-center">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ color }}
          className="font-medium tabular-nums"
        >
          {value}
        </motion.span>
      </AnimatePresence>
      <AnimatePresence>
        {delta !== null && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.8 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="absolute -top-1 -right-5 text-[10px] font-bold"
            style={{ color: delta > 0 ? '#c0392b' : '#44aa99' }}
          >
            {delta > 0 ? `+${delta}` : delta}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

export function PersistentHeader() {
  const { state } = useGame()
  const { currentEvent, socialFear, thoughtFlow, myRisk, riskZone, screen } = state

  if (screen === 'join') return null

  const dots = Array.from({ length: 6 }, (_, i) => {
    const eventNum = i + 1
    if (eventNum < currentEvent) return 'completed'
    if (eventNum === currentEvent) return 'current'
    return 'future'
  })

  return (
    <header className="flex items-center justify-between px-3 h-10 shrink-0 relative z-10" role="banner">
      {/* Progress dots */}
      <div className="flex items-center gap-1" aria-label={`進度：事件 ${currentEvent}/6`}>
        {dots.map((status, i) => (
          <div key={i} className="relative flex items-center">
            {i > 0 && <div className="w-2 h-px bg-[#333] -ml-1 mr-0" />}
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                status === 'completed'
                  ? 'bg-crimson'
                  : status === 'current'
                    ? 'border border-foreground animate-pulse bg-transparent'
                    : 'border border-dim bg-transparent'
              }`}
              aria-label={
                status === 'completed' ? `事件 ${i + 1} 已完成` :
                status === 'current' ? `事件 ${i + 1} 進行中` :
                `事件 ${i + 1} 未開始`
              }
            />
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-xs" role="status" aria-live="polite">
        <span className="flex items-center gap-1">
          <span className="text-crimson-light">恐懼</span>
          <AnimatedNumber value={socialFear} color="#c0392b" />
        </span>
        <span className="text-dim">|</span>
        <span className="flex items-center gap-1">
          <span className="text-teal">流通</span>
          <AnimatedNumber value={thoughtFlow} color="#44aa99" />
        </span>
        <span className="text-dim">|</span>
        <span className="flex items-center gap-1">
          <span className={riskZone === 'danger' ? 'text-destructive animate-pulse' : 'text-amber'}>
            風險
          </span>
          <AnimatedNumber value={myRisk} color={riskZone === 'danger' ? '#c0392b' : '#d4a017'} />
        </span>
      </div>
    </header>
  )
}
