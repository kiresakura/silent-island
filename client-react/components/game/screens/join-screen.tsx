'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGame, useGameJoin } from '@/lib/game-context'

export function JoinScreen() {
  const { state } = useGame()
  const joinGame = useGameJoin()
  const [name, setName] = useState('')
  const [code, setCode] = useState(state.roomCode || '')

  const handleJoin = () => {
    const trimName = name.trim()
    const trimCode = code.trim().toUpperCase() || state.roomCode
    if (!trimName || !trimCode) return
    joinGame(trimCode, trimName)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', duration: 0.4 }}
      className="flex flex-col items-center justify-center flex-1 px-6 gap-10"
    >
      {/* Title */}
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          靜默之島
        </h1>
        <p className="text-sm text-[var(--text-secondary)] tracking-[0.2em] font-light">
          選擇與代價
        </p>
      </div>

      {/* Room code display (from URL) */}
      {state.roomCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-4 py-2 bg-[var(--card)] rounded-lg border border-[var(--border)]"
        >
          <span className="text-[var(--dim)] text-xs">房間</span>
          <span className="ml-2 font-mono text-foreground tracking-wider">{state.roomCode}</span>
        </motion.div>
      )}

      {/* Input fields */}
      <div className="flex flex-col gap-4 w-full max-w-[280px]">
        {!state.roomCode && (
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="房間代碼"
              className="w-full bg-transparent border-b border-[var(--border)] py-3 px-1 text-foreground text-center font-mono tracking-wider placeholder:text-[var(--dim)] focus:outline-none focus:border-[var(--crimson-light)] transition-colors"
              aria-label="房間代碼"
            />
          </div>
        )}
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的名字"
            maxLength={10}
            className="w-full bg-transparent border-b border-[var(--border)] py-3 px-1 text-foreground text-center placeholder:text-[var(--dim)] focus:outline-none focus:border-[var(--crimson-light)] transition-colors"
            aria-label="你的名字"
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleJoin}
          disabled={!name.trim()}
          className="mt-4 w-full py-3 rounded-lg bg-gradient-to-r from-[var(--crimson)] to-[var(--crimson-light)] text-foreground font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity min-h-[44px]"
          aria-label="加入遊戲"
        >
          加入遊戲
        </motion.button>
      </div>
    </motion.div>
  )
}
