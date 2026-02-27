'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { useEffect, useState, useCallback } from 'react'
import { Check } from 'lucide-react'

export function VotingScreen() {
  const { state, dispatch, vibrate } = useGame()
  const { choices, voted, votedChoice, voteSeconds, publicVoting, publicVotes, isObserver } = state
  const [ripple, setRipple] = useState<{ key: string; x: number; y: number } | null>(null)

  useEffect(() => {
    if (voteSeconds <= 0) return
    const t = setInterval(() => dispatch({ type: 'TICK_VOTE' }), 1000)
    return () => clearInterval(t)
  }, [voteSeconds, dispatch])

  const handleVote = useCallback(
    (key: string, e: React.MouseEvent<HTMLButtonElement>) => {
      if (voted || isObserver) return
      const rect = e.currentTarget.getBoundingClientRect()
      setRipple({ key, x: e.clientX - rect.left, y: e.clientY - rect.top })
      vibrate(50)
      setTimeout(() => {
        dispatch({ type: 'VOTE', choice: key })
        setRipple(null)
      }, 300)
    },
    [voted, isObserver, dispatch, vibrate]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', duration: 0.4 }}
      className="flex flex-col flex-1 px-5 pt-2 pb-6 gap-4 overflow-hidden"
    >
      {/* Timer */}
      <div className="flex items-center justify-center gap-2">
        <span
          className={`text-sm font-mono tabular-nums ${
            voteSeconds <= 5 ? 'text-destructive animate-pulse font-bold' : 'text-text-secondary'
          }`}
        >
          剩餘 {voteSeconds} 秒
        </span>
      </div>

      {/* Public voting badge */}
      {publicVoting && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <span className="px-3 py-1 text-xs bg-amber/20 text-amber rounded-full border border-amber/30">
            公開投票
          </span>
        </motion.div>
      )}

      {/* Voted message */}
      <AnimatePresence>
        {voted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-sm text-dim"
          >
            你的選擇已鎖定
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vote buttons */}
      <div className="flex flex-col gap-3 flex-1 justify-center">
        {choices.map((choice) => {
          const isSelected = votedChoice === choice.key
          const isDisabledByVote = voted && !isSelected

          return (
            <motion.button
              key={choice.key}
              whileTap={!voted && !isObserver ? { scale: 0.95 } : {}}
              animate={
                isSelected
                  ? { scale: [0.95, 1.02, 1] }
                  : isDisabledByVote
                    ? { opacity: 0.4 }
                    : { opacity: 1 }
              }
              transition={{ duration: 0.3 }}
              onClick={(e) => handleVote(choice.key, e)}
              disabled={voted || choice.disabled || isObserver}
              className={`relative overflow-hidden text-left p-4 rounded-lg border transition-all min-h-[44px] ${
                isSelected
                  ? 'bg-crimson/20 border-crimson-light text-foreground'
                  : 'bg-card border-border text-foreground hover:border-crimson/50'
              } ${(voted && !isSelected) || isObserver ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} fear-border`}
              aria-label={choice.label}
              aria-pressed={isSelected}
            >
              {/* Ripple */}
              {ripple?.key === choice.key && (
                <motion.span
                  initial={{ scale: 0, opacity: 0.4 }}
                  animate={{ scale: 4, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute w-12 h-12 rounded-full bg-crimson-light/30 pointer-events-none"
                  style={{ left: ripple.x - 24, top: ripple.y - 24 }}
                />
              )}

              <div className="flex items-start gap-3 relative z-[1]">
                <div className="flex-1">
                  <span className="text-sm font-medium block">{choice.label}</span>
                  <span className="text-xs text-dim mt-1 block leading-relaxed">{choice.description}</span>
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="shrink-0 w-5 h-5 rounded-full bg-crimson-light flex items-center justify-center mt-0.5"
                  >
                    <Check className="w-3 h-3 text-foreground" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Public votes display */}
      {publicVoting && publicVotes.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {publicVotes.map((v, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-2 py-0.5 text-[10px] bg-card border border-border rounded-full text-dim"
            >
              {v.playerName}: {choices.find((c) => c.key === v.choice)?.label?.slice(0, 4) || v.choice}
            </motion.span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
