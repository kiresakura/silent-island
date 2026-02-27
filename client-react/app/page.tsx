'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { GameProvider, useGame } from '@/lib/game-context'
import { PersistentHeader } from '@/components/game/persistent-header'
import { JoinScreen } from '@/components/game/screens/join-screen'
import { LobbyScreen } from '@/components/game/screens/lobby-screen'
import { EventScreen } from '@/components/game/screens/event-screen'
import { DiscussionScreen } from '@/components/game/screens/discussion-screen'
import { VotingScreen } from '@/components/game/screens/voting-screen'
import { ResultScreen } from '@/components/game/screens/result-screen'
import { ForeshadowScreen } from '@/components/game/screens/foreshadow-screen'
import { WaitingScreen } from '@/components/game/screens/waiting-screen'
import { SilenceOverlay } from '@/components/game/overlays/silence-overlay'
import { CoinFlipOverlay } from '@/components/game/overlays/coin-flip-overlay'
import { TakenAwayOverlay } from '@/components/game/overlays/taken-away-overlay'
import { EndingOverlay } from '@/components/game/overlays/ending-overlay'
import { NoteReceivedOverlay } from '@/components/game/overlays/note-received-overlay'
import { FABGroup } from '@/components/game/fab-group'
import { RoleBottomSheet } from '@/components/game/role-bottom-sheet'
import { NoteModal } from '@/components/game/note-modal'
import { TargetModal } from '@/components/game/target-modal'
import { ObserverBanner } from '@/components/game/observer-banner'
import { ForeshadowIndicator } from '@/components/game/foreshadow-indicator'
import { RiskFlashBanner } from '@/components/game/risk-flash-banner'
import { Toast } from '@/components/game/toast'

function GameUI() {
  const { state } = useGame()
  const [roleOpen, setRoleOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  const screenComponent = () => {
    switch (state.screen) {
      case 'join':
        return <JoinScreen key="join" />
      case 'lobby':
        return <LobbyScreen key="lobby" />
      case 'event':
        return <EventScreen key="event" />
      case 'discussion':
        return <DiscussionScreen key="discussion" />
      case 'voting':
        return <VotingScreen key="voting" />
      case 'result':
        return <ResultScreen key="result" />
      case 'foreshadow':
        return <ForeshadowScreen key="foreshadow" />
      case 'waiting':
        return <WaitingScreen key="waiting" />
      default:
        return null
    }
  }

  return (
    <div
      className={`noise-bg fear-${state.fearLevel} flex flex-col h-[100dvh] w-full overflow-hidden relative`}
      style={{ minWidth: 375 }}
    >
      {/* Observer banner */}
      <ObserverBanner />

      {/* Persistent header */}
      <PersistentHeader />

      {/* Main screen content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-[1]">
        <AnimatePresence mode="wait">
          {screenComponent()}
        </AnimatePresence>
      </main>

      {/* Foreshadow ghost icons */}
      <ForeshadowIndicator />

      {/* Risk zone flash */}
      <RiskFlashBanner />

      {/* Overlays */}
      <SilenceOverlay />
      <CoinFlipOverlay />
      <TakenAwayOverlay />
      <EndingOverlay />
      <NoteReceivedOverlay />

      {/* FABs */}
      <FABGroup onRoleOpen={() => setRoleOpen(true)} onNoteOpen={() => setNoteOpen(true)} />

      {/* Bottom sheet & modals */}
      <RoleBottomSheet open={roleOpen} onClose={() => setRoleOpen(false)} />
      <NoteModal open={noteOpen} onClose={() => setNoteOpen(false)} />
      <TargetModal />
      <Toast />
    </div>
  )
}

export default function Page() {
  return (
    <GameProvider>
      <GameUI />
    </GameProvider>
  )
}
