'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '@/lib/game-context'

export function IdentityConfirmScreen() {
  const { state, dispatch } = useGame()
  const role = state.role
  const [confirmed, setConfirmed] = useState(false)

  if (!role) return null

  const handleConfirm = () => {
    if (confirmed) return
    setConfirmed(true)
    dispatch({ type: 'CONFIRM_IDENTITY' })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center flex-1 px-6 gap-6"
    >
      <p className="text-xs text-[var(--dim)] tracking-wider">
        請確認你的身份
      </p>

      {/* Role name card */}
      <div className="w-[220px] py-6 flex flex-col items-center justify-center rounded-xl border border-[var(--crimson)] bg-[var(--card)]">
        <span className="text-2xl font-bold text-foreground tracking-wider">
          {role.name}
        </span>
      </div>

      {/* Role details */}
      <div className="flex flex-col items-center gap-4 max-w-[300px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xs text-[var(--dim)]">被動特質</span>
          <p className="text-sm text-[var(--text-secondary)] text-center leading-relaxed">
            {role.passive}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xs text-[var(--dim)]">主動能力</span>
          <p className="text-sm text-[var(--text-secondary)] text-center leading-relaxed">
            {role.ability}
          </p>
        </motion.div>
      </div>

      {/* Confirm button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleConfirm}
        disabled={confirmed}
        className={`mt-2 px-8 py-3 rounded-lg font-medium text-sm min-h-[44px] ${
          confirmed
            ? 'bg-[var(--card)] text-[var(--dim)] border border-[var(--border)]'
            : 'bg-gradient-to-r from-[var(--crimson)] to-[var(--crimson-light)] text-foreground'
        }`}
      >
        {confirmed ? '等待其他玩家確認...' : '我已確認身份'}
      </motion.button>
    </motion.div>
  )
}
