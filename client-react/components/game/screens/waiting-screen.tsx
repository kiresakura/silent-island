'use client'

import { motion } from 'framer-motion'

export function WaitingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', duration: 0.4 }}
      className="flex flex-col items-center justify-center flex-1 px-6 gap-4"
    >
      <motion.div
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="w-8 h-8 rounded-full border-2 border-dim"
      />
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="text-sm text-dim"
      >
        等待其他玩家...
      </motion.p>
    </motion.div>
  )
}
