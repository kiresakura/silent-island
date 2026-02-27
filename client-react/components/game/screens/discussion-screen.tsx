'use client'

import { motion } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { useEffect } from 'react'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function DiscussionScreen() {
  const { state, dispatch } = useGame()
  const { discussionSeconds } = state

  useEffect(() => {
    if (discussionSeconds <= 0) return
    const t = setInterval(() => {
      dispatch({ type: 'TICK_DISCUSSION' })
    }, 1000)
    return () => clearInterval(t)
  }, [discussionSeconds, dispatch])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', duration: 0.4 }}
      className="flex flex-col items-center justify-center flex-1 px-6 gap-8"
    >
      <span className="text-2xl" role="img" aria-label="討論">
        {'🗣️'}
      </span>

      <div className="flex flex-col items-center gap-2">
        <h2 className="text-lg font-medium text-foreground">討論時間</h2>
        <motion.span
          key={discussionSeconds}
          className={`text-5xl font-mono font-bold tabular-nums ${
            discussionSeconds <= 10 ? 'text-destructive' : 'text-foreground'
          }`}
          animate={discussionSeconds <= 10 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.5, repeat: discussionSeconds <= 10 ? Infinity : 0 }}
        >
          {formatTime(discussionSeconds)}
        </motion.span>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-dim text-center"
      >
        放下手機，面對面交談
      </motion.p>
    </motion.div>
  )
}
