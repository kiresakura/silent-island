'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/lib/game-context'
import { useState } from 'react'

export function NoteReceivedOverlay() {
  const { state, dispatch, send, vibrate } = useGame()
  const { showNoteReceived, receivedNote, noteRemaining, isTakenAway, isObserver } = state
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')

  const canReply = receivedNote?.senderId && noteRemaining > 0 && !isTakenAway && !isObserver

  const handleDismiss = () => {
    dispatch({ type: 'DISMISS_NOTE' })
    setShowReply(false)
    setReplyText('')
  }

  const handleReply = () => {
    if (!replyText.trim() || !receivedNote?.senderId) return
    send({
      type: 'reply_note',
      target_player_id: receivedNote.senderId,
      text: replyText.trim(),
    })
    vibrate(50)
    handleDismiss()
  }

  return (
    <AnimatePresence>
      {showNoteReceived && receivedNote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[35] flex items-center justify-center bg-black/80 px-6"
          role="dialog"
          aria-label="收到紙條"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotateZ: -3 }}
            animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-[280px] p-5 bg-[var(--card)] rounded-lg border border-[var(--border)]"
          >
            <div className="flex flex-col gap-3">
              <div className="text-center text-2xl">📜</div>
              <span className="text-xs text-[var(--dim)] text-center">
                {receivedNote.isReply ? '收到一則回覆：' : '你收到了一張匿名紙條：'}
              </span>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap text-center">
                {receivedNote.text}
              </p>

              {showReply && canReply && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="回覆（最多 100 字）"
                    maxLength={100}
                    className="w-full bg-transparent border border-[var(--border)] rounded-lg p-2 text-sm text-foreground placeholder:text-[var(--dim)] focus:outline-none focus:border-[var(--crimson-light)]"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                  />
                </motion.div>
              )}

              <div className="flex gap-2 mt-1">
                {canReply && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={showReply ? handleReply : () => setShowReply(true)}
                    className="flex-1 py-2 text-xs rounded-lg bg-[var(--crimson)]/20 border border-[var(--crimson)]/40 text-[var(--crimson-light)] min-h-[44px]"
                  >
                    {showReply ? '送出回覆' : '回覆'}
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDismiss}
                  className="flex-1 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--dim)] min-h-[44px]"
                >
                  收下
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
