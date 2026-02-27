'use client'

import { motion } from 'framer-motion'
import { useGame } from '@/lib/game-context'

function VoteBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-right text-dim shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="w-5 text-dim tabular-nums">{count}</span>
    </div>
  )
}

export function ResultScreen() {
  const { state } = useGame()
  const { roundResult, riskZone } = state

  if (!roundResult) return null

  const total = roundResult.voteSummary.comply + roundResult.voteSummary.evade + roundResult.voteSummary.resist

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', duration: 0.4 }}
      className="flex flex-col flex-1 px-5 pt-4 pb-6 gap-5 overflow-y-auto custom-scrollbar"
    >
      {/* Narrative */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="border-l-2 border-crimson pl-4 py-2"
      >
        <p className="text-sm italic text-text-secondary leading-relaxed">{roundResult.narrative}</p>
      </motion.div>

      {/* Risk delta */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: 'spring' }}
        className="flex justify-center"
      >
        <span
          className={`text-3xl font-bold font-mono ${
            roundResult.riskDelta > 0 ? 'text-destructive' : roundResult.riskDelta < 0 ? 'text-teal' : 'text-dim'
          }`}
        >
          {roundResult.riskDelta > 0 ? `+${roundResult.riskDelta}` : roundResult.riskDelta === 0 ? '0' : roundResult.riskDelta}
        </span>
      </motion.div>

      {/* Social narrative */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-xs italic text-dim"
      >
        {roundResult.socialNarrative}
      </motion.p>

      {/* Risk warning */}
      {riskZone === 'danger' && roundResult.riskWarning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="p-3 rounded-lg border border-destructive/50 bg-destructive/10"
        >
          <p className="text-xs text-destructive text-center font-medium">{roundResult.riskWarning}</p>
        </motion.div>
      )}

      {/* Vote summary bar chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex flex-col gap-2 mt-2"
      >
        <span className="text-xs text-dim text-center mb-1">投票結果</span>
        <VoteBar label="服從" count={roundResult.voteSummary.comply} total={total} color="#4a90d9" />
        <VoteBar label="迴避" count={roundResult.voteSummary.evade} total={total} color="#666" />
        <VoteBar label="抵抗" count={roundResult.voteSummary.resist} total={total} color="#c0392b" />
      </motion.div>
    </motion.div>
  )
}
