/**
 * 靜默之島 — React 前端型別定義
 */

export type Screen =
  | 'join'
  | 'lobby'
  | 'event'
  | 'discussion'
  | 'voting'
  | 'result'
  | 'foreshadow'
  | 'waiting'

export type RiskZone = 'safe' | 'caution' | 'danger' | 'taken'

export interface Role {
  role_id: string
  name: string
  passive: string
  ability: string
  abilityUsed: boolean
}

export interface Choice {
  key: string
  label: string
  description: string
  disabled?: boolean
}

export interface EventData {
  number: number
  title: string
  description: string
  isAutoSettle?: boolean
}

export interface VoteSummary {
  comply: number
  evade: number
  resist: number
}

export interface RoundResult {
  narrative: string
  riskDelta: number
  socialNarrative: string
  riskWarning: string
  voteSummary: VoteSummary
  messages: string[]
  atmosphereText?: string
  majorityTriggered?: boolean
}

export interface ForeshadowItem {
  id: string
  narrative: string
  coinFlip?: {
    result: 'heads' | 'tails'
    riskChange: number
    event: number
  }
}

export interface ForeshadowResult {
  hasForeshadows: boolean
  warningText: string
  items: ForeshadowItem[]
  totalRiskDelta: number
  messages: string[]
}

export interface PublicVote {
  playerName: string
  choice: string
}

export interface ReceivedNote {
  text: string
  senderId: string | null
  isReply: boolean
}

export interface EndingData {
  socialTitle: string
  socialText: string
  personalIcon: string
  personalLabel: string
  personalText: string
  closureText: string
  reflectionText?: string
  finalStats: {
    socialFear: number
    thoughtFlow: number
    myRisk: number
  }
}

export interface Player {
  id: string
  name: string
}

export interface GameState {
  // Connection
  screen: Screen
  roomCode: string
  playerName: string
  playerId: string | null
  playerCount: number

  // Game stats
  socialFear: number
  thoughtFlow: number
  myRisk: number
  riskZone: RiskZone
  fearLevel: number
  currentEvent: number

  // Role
  role: Role | null

  // Event
  eventData: EventData | null
  choices: Choice[]

  // Voting
  voted: boolean
  votedChoice: string | null
  voteSeconds: number
  publicVoting: boolean
  publicVotes: PublicVote[]

  // Discussion
  discussionSeconds: number

  // Result
  roundResult: RoundResult | null

  // Foreshadow
  foreshadowResult: ForeshadowResult | null
  foreshadowCount: number

  // Overlays
  showSilence: boolean
  silenceSeconds: number
  silenceAtmosphere: string

  showCoinFlip: boolean
  coinFlipResult: 'heads' | 'tails'

  showTakenAway: boolean
  takenAwayText: string
  isTakenAway: boolean
  isObserver: boolean

  showEnding: boolean
  endingData: EndingData | null
  reflectionSeconds: number

  showNoteReceived: boolean
  receivedNote: ReceivedNote | null
  noteRemaining: number

  // Players list (for note/ability target)
  players: Player[]
  showTargetModal: boolean
  targetModalMode: 'ability' | 'note' | null

  // Toast
  toastMessage: string
  toastVisible: boolean
}

export type GameAction =
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'SET_ROOM_CODE'; code: string }
  | { type: 'SET_PLAYER_NAME'; name: string }
  | { type: 'SET_PLAYER_ID'; id: string }
  | { type: 'SET_PLAYER_COUNT'; count: number }
  | { type: 'SET_STATS'; socialFear: number; thoughtFlow: number; myRisk: number }
  | { type: 'SET_RISK_ZONE'; zone: RiskZone }
  | { type: 'SET_FEAR_LEVEL'; level: number }
  | { type: 'SET_CURRENT_EVENT'; event: number }
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'SET_EVENT_DATA'; data: EventData; choices: Choice[] }
  | { type: 'VOTE'; choice: string }
  | { type: 'AUTO_VOTED'; choice: string }
  | { type: 'SET_VOTE_SECONDS'; seconds: number }
  | { type: 'TICK_VOTE' }
  | { type: 'SET_PUBLIC_VOTING'; enabled: boolean }
  | { type: 'ADD_PUBLIC_VOTE'; vote: PublicVote }
  | { type: 'RESET_VOTING' }
  | { type: 'SET_DISCUSSION_SECONDS'; seconds: number }
  | { type: 'TICK_DISCUSSION' }
  | { type: 'SET_ROUND_RESULT'; result: RoundResult }
  | { type: 'SET_FORESHADOW_RESULT'; result: ForeshadowResult }
  | { type: 'ADD_FORESHADOW' }
  | { type: 'SHOW_SILENCE'; seconds: number; atmosphere: string }
  | { type: 'TICK_SILENCE' }
  | { type: 'HIDE_SILENCE' }
  | { type: 'SHOW_COIN_FLIP'; result: 'heads' | 'tails' }
  | { type: 'HIDE_COIN_FLIP' }
  | { type: 'SHOW_TAKEN_AWAY'; text: string }
  | { type: 'SET_YOU_TAKEN' }
  | { type: 'SET_OBSERVER' }
  | { type: 'SHOW_ENDING'; data: EndingData }
  | { type: 'TICK_REFLECTION' }
  | { type: 'SHOW_NOTE_RECEIVED'; note: ReceivedNote }
  | { type: 'DISMISS_NOTE' }
  | { type: 'USE_NOTE' }
  | { type: 'SET_NOTE_REMAINING'; count: number }
  | { type: 'USE_ABILITY' }
  | { type: 'ABILITY_USED' }
  | { type: 'SET_PLAYERS'; players: Player[] }
  | { type: 'SHOW_TARGET_MODAL'; mode: 'ability' | 'note' }
  | { type: 'HIDE_TARGET_MODAL' }
  | { type: 'SHOW_TOAST'; message: string }
  | { type: 'HIDE_TOAST' }
