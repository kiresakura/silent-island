'use client'

import { motion } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { useEffect, useState } from 'react'

function TypewriterText({ text, className }: { text: string; className?: string }) {
  const [visibleChars, setVisibleChars] = useState(0)

  useEffect(() => {
    setVisibleChars(0)
    const timer = setInterval(() => {
      setVisibleChars((prev) => {
        if (prev >= text.length) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, 30)
    return () => clearInterval(timer)
  }, [text])

  return (
    <span className={className} aria-label={text}>
      {text.split('').map((char, i) => (
        <motion.span
          key={`${i}-${char}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: i < visibleChars ? 1 : 0 }}
          transition={{ duration: 0.05 }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  )
}

export function EventScreen() {
  const { state } = useGame()
  const { eventData, fearLevel } = state

  if (!eventData) return null

  const descLines = eventData.description.split('\n').filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', duration: 0.4 }}
      className="flex flex-col flex-1 px-5 pt-4 pb-6 overflow-hidden"
    >
      {/* Event badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center mb-6"
      >
        <span className="px-3 py-1 text-xs font-medium bg-crimson/20 text-crimson-light rounded-full border border-crimson/30">
          事件 {eventData.number}/6
        </span>
      </motion.div>

      {/* Title - typewriter */}
      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold text-foreground ${fearLevel >= 6 ? 'fear-flicker' : ''}`}>
          <TypewriterText text={eventData.title} />
        </h2>
      </div>

      {/* Description - staggered line fade-in */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-3">
          {descLines.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.15, duration: 0.4 }}
              className="text-sm leading-relaxed text-text-secondary"
            >
              {line}
            </motion.p>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
