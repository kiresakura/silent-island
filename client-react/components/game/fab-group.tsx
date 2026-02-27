'use client'

import { motion } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { User, FileText } from 'lucide-react'

interface FABGroupProps {
  onRoleOpen: () => void
  onNoteOpen: () => void
}

export function FABGroup({ onRoleOpen, onNoteOpen }: FABGroupProps) {
  const { state } = useGame()
  const { isObserver, screen, noteRemaining } = state

  if (isObserver || screen === 'join') return null

  return (
    <div className="fixed bottom-6 right-4 z-20 flex flex-col gap-3">
      {/* Role FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onRoleOpen}
        className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-lg hover:border-crimson/50 transition-colors"
        aria-label="角色資訊"
      >
        <User className="w-5 h-5" />
      </motion.button>

      {/* Note FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onNoteOpen}
        className="relative w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-lg hover:border-crimson/50 transition-colors"
        aria-label={`傳紙條 (剩餘 ${noteRemaining} 張)`}
      >
        <FileText className="w-5 h-5" />
        {noteRemaining > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-crimson-light text-[10px] font-bold flex items-center justify-center text-foreground">
            {noteRemaining}
          </span>
        )}
      </motion.button>
    </div>
  )
}
