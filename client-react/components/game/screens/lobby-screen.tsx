'use client'

import { motion } from 'framer-motion'
import { useGame } from '@/lib/game-context'

export function LobbyScreen() {
  const { state } = useGame()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', duration: 0.4 }}
      className="flex flex-col items-center justify-center flex-1 px-6 gap-8"
    >
      {/* Room code */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-dim font-light">房間代碼</span>
        <span className="text-3xl font-mono tracking-[0.15em] text-foreground font-bold">
          {state.roomCode || '----'}
        </span>
      </div>

      {/* Player confirmed */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm text-text-secondary">你的名字</span>
        <span className="text-lg text-foreground font-medium">{state.playerName}</span>
      </div>

      {/* Waiting */}
      <div className="flex flex-col items-center gap-3">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm text-dim"
        >
          等待關主開始遊戲...
        </motion.div>

        {/* Player count */}
        {state.playerCount > 0 && (
          <motion.div
            key={state.playerCount}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 text-xs text-text-secondary"
          >
            <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            <span>{state.playerCount} 位玩家已加入</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
