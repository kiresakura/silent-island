'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '@/lib/game-context'

const INTRO_LINES = [
  '這座島嶼，曾經是自由的。',
  '直到有一天，沉默成為了生存的方式。',
  '說錯話的人會消失。不說話的人得以苟活。',
  '你是島上的居民之一。\n你有自己的信念，也有自己的恐懼。',
  '在接下來的六輪事件中，\n你必須在服從、迴避與抵抗之間做出選擇。',
  '每一次選擇都有代價。沒有人能全身而退。',
  '遊戲開始。',
]

const LINE_INTERVAL = 1.5 // seconds between each line appearing

export function IntroScreen() {
  const { dispatch } = useGame()
  const [visibleCount, setVisibleCount] = useState(0)

  // Reveal lines one by one
  useEffect(() => {
    if (visibleCount >= INTRO_LINES.length) {
      // All lines shown, wait 2s then transition
      const timer = setTimeout(() => {
        dispatch({ type: 'SET_SCREEN', screen: 'role-reveal' })
      }, 2000)
      return () => clearTimeout(timer)
    }

    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1)
    }, visibleCount === 0 ? 800 : LINE_INTERVAL * 1000)

    return () => clearTimeout(timer)
  }, [visibleCount, dispatch])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center flex-1 px-8 gap-6"
    >
      <div className="flex flex-col items-center gap-5 max-w-[320px]">
        {INTRO_LINES.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: i < visibleCount ? 1 : 0,
              y: i < visibleCount ? 0 : 8,
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`text-sm leading-relaxed text-center whitespace-pre-line ${
              i === INTRO_LINES.length - 1
                ? 'text-foreground font-medium mt-4'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            {line}
          </motion.p>
        ))}
      </div>
    </motion.div>
  )
}
