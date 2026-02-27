'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { useState, useEffect } from 'react'
import { X, Send } from 'lucide-react'

interface NoteModalProps {
  open: boolean
  onClose: () => void
}

export function NoteModal({ open, onClose }: NoteModalProps) {
  const { state, send, dispatch } = useGame()
  const { noteRemaining, players } = state
  const [content, setContent] = useState('')
  const [targetId, setTargetId] = useState<string | null>(null)

  // Request player list on open
  useEffect(() => {
    if (open) {
      send({ type: 'get_players' })
      setContent('')
      setTargetId(null)
    }
  }, [open, send])

  const handleSend = () => {
    if (!content.trim() || !targetId || noteRemaining <= 0) return
    send({
      type: 'send_note',
      target_player_id: targetId,
      text: content.trim(),
    })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-30 bg-[var(--card)] rounded-xl border border-[var(--border)] p-5 max-w-sm mx-auto"
            role="dialog"
            aria-label="傳送紙條"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">
                📜 傳紙條
                <span className="ml-2 text-xs text-[var(--dim)]">剩餘 {noteRemaining} 張</span>
              </h3>
              <button
                onClick={onClose}
                className="text-[var(--dim)] hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
                aria-label="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {noteRemaining > 0 ? (
              <div className="flex flex-col gap-3">
                {/* Target player selection */}
                <div>
                  <span className="text-xs text-[var(--dim)] mb-1 block">傳給誰？</span>
                  <div className="flex flex-wrap gap-1.5">
                    {players.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setTargetId(p.id)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors min-h-[36px] ${
                          targetId === p.id
                            ? 'bg-[var(--crimson)]/20 border-[var(--crimson-light)] text-foreground'
                            : 'bg-transparent border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--crimson)]/50'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                    {players.length === 0 && (
                      <span className="text-xs text-[var(--dim)]">載入中...</span>
                    )}
                  </div>
                </div>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="寫下你想說的..."
                  rows={3}
                  maxLength={100}
                  className="bg-transparent border border-[var(--border)] rounded-lg p-3 text-sm text-foreground placeholder:text-[var(--dim)] focus:outline-none focus:border-[var(--crimson-light)] transition-colors resize-none"
                  aria-label="紙條內容"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--dim)]">{content.length}/100</span>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!content.trim() || !targetId}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-[var(--crimson)]/20 border border-[var(--crimson)]/40 text-[var(--crimson-light)] text-sm disabled:opacity-40 min-h-[44px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>送出</span>
                  </motion.button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--dim)] text-center py-4">你已經用完所有紙條了。</p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
