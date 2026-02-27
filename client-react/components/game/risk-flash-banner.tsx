'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { useEffect, useState, useRef } from 'react'
import type { RiskZone } from '@/lib/game-types'

const riskMessages: Record<RiskZone, string> = {
  safe: '',
  caution: '注意 — 你引起了注意',
  danger: '危險 — 你已被監視',
  taken: '你被帶走了',
}

export function RiskFlashBanner() {
  const { state, vibrate } = useGame()
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState('')
  const prevZone = useRef(state.riskZone)

  useEffect(() => {
    if (state.riskZone !== prevZone.current && state.riskZone !== 'safe') {
      setMessage(riskMessages[state.riskZone])
      setShow(true)
      vibrate([100, 50, 100, 50, 300])
      const t = setTimeout(() => setShow(false), 2500)
      prevZone.current = state.riskZone
      return () => clearTimeout(t)
    }
    prevZone.current = state.riskZone
  }, [state.riskZone, vibrate])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: 1,
            y: 0,
            x: [0, -3, 3, -3, 0],
          }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="fixed top-12 left-0 right-0 z-[25] flex justify-center pointer-events-none"
          role="alert"
        >
          <span className="px-4 py-2 text-xs font-bold text-destructive bg-destructive/10 border border-destructive/30 rounded-full">
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
