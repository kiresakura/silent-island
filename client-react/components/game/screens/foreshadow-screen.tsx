'use client'

import { motion } from 'framer-motion'
import { useGame } from '@/lib/game-context'

export function ForeshadowScreen() {
  const { state } = useGame()
  const { foreshadowResult } = state

  if (!foreshadowResult) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', duration: 0.4 }}
      className="flex flex-col flex-1 px-5 pt-4 pb-6 gap-5 overflow-y-auto custom-scrollbar"
    >
      {/* Warning title */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 1, 0.5, 1] }}
        transition={{ duration: 2, times: [0, 0.3, 0.6, 1] }}
        className="text-center text-lg font-bold text-destructive"
      >
        舊事被翻出
      </motion.h2>

      {/* Warning alert */}
      {foreshadowResult.hasForeshadows && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-center"
        >
          <p className="text-sm text-destructive font-medium">{foreshadowResult.warningText}</p>
        </motion.div>
      )}

      {/* Foreshadow items */}
      <div className="flex flex-col gap-4 mt-2">
        {foreshadowResult.items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.2 }}
            className="p-3 rounded-lg bg-card border border-border fear-border"
          >
            <p className="text-sm text-text-secondary leading-relaxed">{item.narrative}</p>
            {item.coinFlip && (
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-amber">{'🪙'}</span>
                <span className="text-dim">
                  {item.coinFlip.result === 'heads' ? '正面' : '反面'}
                </span>
                <span
                  className={`font-mono font-bold ${
                    item.coinFlip.riskChange > 0 ? 'text-destructive' : 'text-teal'
                  }`}
                >
                  風險 {item.coinFlip.riskChange > 0 ? `+${item.coinFlip.riskChange}` : item.coinFlip.riskChange}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Risk delta summary */}
      {foreshadowResult.totalRiskDelta !== 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-2"
        >
          <span className="text-xs text-dim">本輪伏筆風險變化：</span>
          <span
            className={`text-lg font-bold font-mono ml-2 ${
              foreshadowResult.totalRiskDelta > 0 ? 'text-destructive' : 'text-teal'
            }`}
          >
            {foreshadowResult.totalRiskDelta > 0 ? `+${foreshadowResult.totalRiskDelta}` : foreshadowResult.totalRiskDelta}
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}
