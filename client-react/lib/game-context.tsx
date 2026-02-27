'use client'

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import type {
  GameState,
  GameAction,
  RiskZone,
  Role,
  Choice,
  EventData,
  RoundResult,
  ForeshadowResult,
  ForeshadowItem,
  EndingData,
  ReceivedNote,
  Player,
} from './game-types'

// ── Initial State ──

const initialState: GameState = {
  screen: 'join',
  roomCode: '',
  playerName: '',
  playerId: null,
  playerCount: 0,
  socialFear: 0,
  thoughtFlow: 0,
  myRisk: 0,
  riskZone: 'safe',
  fearLevel: 0,
  currentEvent: 0,
  role: null,
  eventData: null,
  choices: [],
  voted: false,
  votedChoice: null,
  voteSeconds: 30,
  publicVoting: false,
  publicVotes: [],
  discussionSeconds: 120,
  roundResult: null,
  foreshadowResult: null,
  foreshadowCount: 0,
  showSilence: false,
  silenceSeconds: 30,
  silenceAtmosphere: '',
  showCoinFlip: false,
  coinFlipResult: 'tails',
  showTakenAway: false,
  takenAwayText: '',
  isTakenAway: false,
  isObserver: false,
  showEnding: false,
  endingData: null,
  reflectionSeconds: 60,
  showNoteReceived: false,
  receivedNote: null,
  noteRemaining: 3,
  players: [],
  showTargetModal: false,
  targetModalMode: null,
  toastMessage: '',
  toastVisible: false,
}

// ── Reducer ──

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen }
    case 'SET_ROOM_CODE':
      return { ...state, roomCode: action.code }
    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.name }
    case 'SET_PLAYER_ID':
      return { ...state, playerId: action.id }
    case 'SET_PLAYER_COUNT':
      return { ...state, playerCount: action.count }
    case 'SET_STATS':
      return {
        ...state,
        socialFear: action.socialFear,
        thoughtFlow: action.thoughtFlow,
        myRisk: action.myRisk,
        fearLevel: Math.min(action.socialFear, 6),
      }
    case 'SET_RISK_ZONE':
      return { ...state, riskZone: action.zone }
    case 'SET_FEAR_LEVEL':
      return { ...state, fearLevel: action.level }
    case 'SET_CURRENT_EVENT':
      return { ...state, currentEvent: action.event }
    case 'SET_ROLE':
      return { ...state, role: action.role }
    case 'SET_EVENT_DATA':
      return {
        ...state,
        eventData: action.data,
        choices: action.choices,
        voted: false,
        votedChoice: null,
        publicVotes: [],
      }
    case 'VOTE':
      return { ...state, voted: true, votedChoice: action.choice }
    case 'AUTO_VOTED':
      return { ...state, voted: true, votedChoice: action.choice }
    case 'SET_VOTE_SECONDS':
      return { ...state, voteSeconds: action.seconds }
    case 'TICK_VOTE':
      return { ...state, voteSeconds: Math.max(0, state.voteSeconds - 1) }
    case 'SET_PUBLIC_VOTING':
      return { ...state, publicVoting: action.enabled }
    case 'ADD_PUBLIC_VOTE':
      return { ...state, publicVotes: [...state.publicVotes, action.vote] }
    case 'RESET_VOTING':
      return {
        ...state,
        voted: false,
        votedChoice: null,
        voteSeconds: 30,
        publicVoting: false,
        publicVotes: [],
      }
    case 'SET_DISCUSSION_SECONDS':
      return { ...state, discussionSeconds: action.seconds }
    case 'TICK_DISCUSSION':
      return { ...state, discussionSeconds: Math.max(0, state.discussionSeconds - 1) }
    case 'SET_ROUND_RESULT':
      return { ...state, roundResult: action.result }
    case 'SET_FORESHADOW_RESULT':
      return { ...state, foreshadowResult: action.result }
    case 'ADD_FORESHADOW':
      return { ...state, foreshadowCount: state.foreshadowCount + 1 }
    case 'SHOW_SILENCE':
      return {
        ...state,
        showSilence: true,
        silenceSeconds: action.seconds,
        silenceAtmosphere: action.atmosphere,
      }
    case 'TICK_SILENCE': {
      const next = state.silenceSeconds - 1
      if (next <= 0) {
        return { ...state, showSilence: false, silenceSeconds: 0 }
      }
      return { ...state, silenceSeconds: next }
    }
    case 'HIDE_SILENCE':
      return { ...state, showSilence: false }
    case 'SHOW_COIN_FLIP':
      return { ...state, showCoinFlip: true, coinFlipResult: action.result }
    case 'HIDE_COIN_FLIP':
      return { ...state, showCoinFlip: false }
    case 'SHOW_TAKEN_AWAY':
      return { ...state, showTakenAway: true, takenAwayText: action.text }
    case 'SET_YOU_TAKEN':
      return { ...state, isTakenAway: true, showTakenAway: true, takenAwayText: '你被帶走了。一切結束了。' }
    case 'SET_OBSERVER':
      return { ...state, isObserver: true, showTakenAway: false }
    case 'SHOW_ENDING':
      return { ...state, showEnding: true, endingData: action.data, reflectionSeconds: 60 }
    case 'TICK_REFLECTION':
      return { ...state, reflectionSeconds: Math.max(0, state.reflectionSeconds - 1) }
    case 'SHOW_NOTE_RECEIVED':
      return { ...state, showNoteReceived: true, receivedNote: action.note }
    case 'DISMISS_NOTE':
      return { ...state, showNoteReceived: false, receivedNote: null }
    case 'USE_NOTE':
      return { ...state, noteRemaining: Math.max(0, state.noteRemaining - 1) }
    case 'SET_NOTE_REMAINING':
      return { ...state, noteRemaining: action.count }
    case 'USE_ABILITY':
      return state // handled by WS send
    case 'ABILITY_USED':
      return { ...state, role: state.role ? { ...state.role, abilityUsed: true } : null }
    case 'SET_PLAYERS':
      return { ...state, players: action.players }
    case 'SHOW_TARGET_MODAL':
      return { ...state, showTargetModal: true, targetModalMode: action.mode }
    case 'HIDE_TARGET_MODAL':
      return { ...state, showTargetModal: false, targetModalMode: null }
    case 'SHOW_TOAST':
      return { ...state, toastMessage: action.message, toastVisible: true }
    case 'HIDE_TOAST':
      return { ...state, toastVisible: false }
    default:
      return state
  }
}

// ── Context ──

interface GameContextValue {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  send: (data: Record<string, unknown>) => void
  vibrate: (pattern: number | number[]) => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}

// ── Provider ──

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state

  // Toast auto-hide
  useEffect(() => {
    if (!state.toastVisible) return
    const t = setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 3000)
    return () => clearTimeout(t)
  }, [state.toastVisible, state.toastMessage])

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }, [])

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  // ── WebSocket message handler ──
  const handleMessage = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any) => {
      const s = stateRef.current
      switch (data.type) {
        case 'joined':
          dispatch({ type: 'SET_PLAYER_ID', id: data.player_id })
          dispatch({ type: 'SET_ROOM_CODE', code: data.room_code })
          dispatch({ type: 'SET_PLAYER_NAME', name: data.player_name })
          if (data.player_count) dispatch({ type: 'SET_PLAYER_COUNT', count: data.player_count })
          dispatch({ type: 'SET_SCREEN', screen: 'lobby' })
          break

        case 'player_joined':
          dispatch({ type: 'SET_PLAYER_COUNT', count: data.player_count })
          break

        case 'game_started': {
          const r = data.role
          const role: Role = {
            role_id: r.role_id,
            name: r.name,
            passive: r.passive,
            ability: r.ability,
            abilityUsed: false,
          }
          dispatch({ type: 'SET_ROLE', role })
          dispatch({ type: 'SET_SCREEN', screen: 'waiting' })
          break
        }

        case 'event':
        case 'event_observer': {
          if (s.isTakenAway && data.type === 'event') break
          const choices: Choice[] = (data.choices || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => ({
              key: c.key || c.id,
              label: c.label,
              description: c.description || '',
              disabled: c.disabled || false,
            })
          )
          const eventData: EventData = {
            number: data.event_number,
            title: data.title,
            description: data.description,
            isAutoSettle: data.is_auto_settle,
          }
          dispatch({ type: 'SET_CURRENT_EVENT', event: data.event_number })
          dispatch({ type: 'SET_EVENT_DATA', data: eventData, choices })
          dispatch({ type: 'SET_SCREEN', screen: 'event' })

          if (data.is_auto_settle) {
            setTimeout(() => {
              dispatch({ type: 'SET_SCREEN', screen: 'waiting' })
            }, 3000)
          }
          break
        }

        case 'silence_countdown':
          dispatch({
            type: 'SHOW_SILENCE',
            seconds: data.seconds,
            atmosphere: data.atmosphere || '',
          })
          break

        case 'discussion_start':
          dispatch({ type: 'HIDE_SILENCE' })
          dispatch({ type: 'SET_DISCUSSION_SECONDS', seconds: data.seconds || 120 })
          dispatch({ type: 'SET_SCREEN', screen: 'discussion' })
          break

        case 'voting_open':
          if (s.isTakenAway || s.isObserver) break
          dispatch({ type: 'RESET_VOTING' })
          dispatch({ type: 'SET_VOTE_SECONDS', seconds: data.seconds || 30 })
          if (data.public_voting) {
            dispatch({ type: 'SET_PUBLIC_VOTING', enabled: true })
          }
          dispatch({ type: 'SET_SCREEN', screen: 'voting' })
          break

        case 'vote_confirmed':
          dispatch({ type: 'SHOW_TOAST', message: '投票已確認' })
          break

        case 'auto_voted':
          dispatch({ type: 'AUTO_VOTED', choice: data.choice })
          dispatch({ type: 'SHOW_TOAST', message: data.message || '投票超時，自動選擇迴避' })
          break

        case 'public_vote':
          dispatch({
            type: 'ADD_PUBLIC_VOTE',
            vote: { playerName: data.player_name, choice: data.choice },
          })
          break

        case 'public_vote_announced':
          dispatch({ type: 'SET_PUBLIC_VOTING', enabled: true })
          dispatch({ type: 'SHOW_TOAST', message: data.message })
          break

        case 'round_result': {
          dispatch({
            type: 'SET_STATS',
            socialFear: data.social_fear,
            thoughtFlow: data.thought_flow,
            myRisk: data.your_risk,
          })
          dispatch({ type: 'SET_RISK_ZONE', zone: data.risk_zone || 'safe' })

          const result: RoundResult = {
            narrative: data.narrative || '',
            riskDelta: data.your_risk_delta || 0,
            socialNarrative: data.social_narrative || '',
            riskWarning: data.risk_warning || '',
            voteSummary: data.vote_summary || { comply: 0, evade: 0, resist: 0 },
            messages: data.messages || [],
            atmosphereText: data.atmosphere_text,
            majorityTriggered: data.majority_triggered,
          }
          dispatch({ type: 'SET_ROUND_RESULT', result })
          dispatch({ type: 'SET_SCREEN', screen: 'result' })

          // Taken away
          if (data.you_taken_away) {
            setTimeout(() => dispatch({ type: 'SET_YOU_TAKEN' }), 1000)
          } else if (data.taken_away?.length > 0) {
            const names = data.taken_away.map((t: { player_name: string }) => t.player_name).join('、')
            dispatch({ type: 'SHOW_TAKEN_AWAY', text: `${names} 被帶走了。沒有人敢問去了哪裡。` })
            setTimeout(() => dispatch({ type: 'SHOW_TAKEN_AWAY', text: '' }), 3000)
          }
          break
        }

        case 'foreshadow_settlement': {
          dispatch({
            type: 'SET_STATS',
            socialFear: data.social_fear,
            thoughtFlow: data.thought_flow,
            myRisk: data.risk,
          })
          dispatch({ type: 'SET_RISK_ZONE', zone: data.risk_zone || 'safe' })

          // Show coin flip animation first if applicable
          if (data.coin_flips?.length > 0) {
            const flip = data.coin_flips[0]
            dispatch({ type: 'SHOW_COIN_FLIP', result: flip.result })
            vibrate([100, 50, 100, 50, 300])
          }

          const items: ForeshadowItem[] = (data.foreshadows || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (fs: any, i: number) => {
              const narrativeText = data.narratives?.[i] || `事件${fs.event}的「${fs.type === 'silence' ? '沉默' : '模糊'}」`
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const matchingFlip = data.coin_flips?.find((f: any) => f.event === fs.event)
              return {
                id: `fs-${i}`,
                narrative: narrativeText,
                coinFlip: matchingFlip
                  ? {
                      result: matchingFlip.result,
                      riskChange: matchingFlip.result === 'heads' ? 10 : 5,
                      event: matchingFlip.event,
                    }
                  : undefined,
              }
            }
          )

          const foreshadowResult: ForeshadowResult = {
            hasForeshadows: data.has_foreshadow || false,
            warningText: data.has_foreshadow ? '你的過去被翻出了。' : '你沒有被翻出的伏筆。',
            items,
            totalRiskDelta: data.risk_delta || 0,
            messages: data.messages || [],
          }

          dispatch({ type: 'SET_FORESHADOW_RESULT', result: foreshadowResult })
          dispatch({ type: 'SET_SCREEN', screen: 'foreshadow' })

          // Taken away
          if (data.you_taken_away) {
            setTimeout(() => dispatch({ type: 'SET_YOU_TAKEN' }), 2500)
          } else if (data.taken_away?.length > 0) {
            const names = data.taken_away.map((t: { player_name: string }) => t.player_name).join('、')
            setTimeout(() => {
              dispatch({ type: 'SHOW_TAKEN_AWAY', text: `${names} 被帶走了。` })
              setTimeout(() => dispatch({ type: 'SHOW_TAKEN_AWAY', text: '' }), 3000)
            }, 2500)
          }
          break
        }

        case 'ability_result':
          if (data.success) {
            dispatch({ type: 'ABILITY_USED' })
            dispatch({ type: 'SHOW_TOAST', message: data.message })
          } else {
            dispatch({ type: 'SHOW_TOAST', message: data.message })
          }
          break

        case 'ability_broadcast':
          dispatch({ type: 'SHOW_TOAST', message: data.message })
          break

        case 'observer_mode':
          dispatch({ type: 'SET_OBSERVER' })
          dispatch({ type: 'SHOW_TOAST', message: data.message })
          break

        case 'player_list':
          dispatch({
            type: 'SET_PLAYERS',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            players: data.players.map((p: any) => ({ id: p.id, name: p.name })),
          })
          break

        case 'note_sent':
          dispatch({ type: 'SET_NOTE_REMAINING', count: data.remaining })
          dispatch({ type: 'SHOW_TOAST', message: '紙條已送出' })
          break

        case 'note_received': {
          const note: ReceivedNote = {
            text: data.text,
            senderId: data.sender_id || null,
            isReply: data.is_reply || false,
          }
          dispatch({ type: 'SHOW_NOTE_RECEIVED', note })
          vibrate(100)
          break
        }

        case 'ending': {
          const pe = data.personal_ending
          const endingData: EndingData = {
            socialTitle: data.social_ending?.title || '',
            socialText: data.social_ending?.text || '',
            personalIcon: pe?.ending_icon || '',
            personalLabel: pe?.ending_label || '',
            personalText: pe?.ending_text || '',
            closureText: data.closure_text || '',
            reflectionText: data.reflection_text,
            finalStats: {
              socialFear: data.final_stats?.social_fear || 0,
              thoughtFlow: data.final_stats?.thought_flow || 0,
              myRisk: pe?.risk || 0,
            },
          }
          dispatch({ type: 'SHOW_ENDING', data: endingData })
          break
        }

        case 'host_disconnected':
          dispatch({ type: 'SHOW_TOAST', message: '關主已斷線' })
          break

        case 'error':
          dispatch({ type: 'SHOW_TOAST', message: data.message })
          break
      }
    },
    [vibrate]
  )

  // ── WebSocket connection ──
  const connectWs = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws`
    const ws = new WebSocket(url)

    ws.onopen = () => {
      reconnectRef.current = 0
      // Auto-join if we have room code and name from URL
      const params = new URLSearchParams(window.location.search)
      const room = params.get('room')
      const name = stateRef.current.playerName

      if (room && name) {
        ws.send(
          JSON.stringify({
            type: 'join_room',
            room_code: room,
            player_name: name,
          })
        )
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleMessage(data)
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      if (reconnectRef.current < 5) {
        reconnectRef.current++
        setTimeout(connectWs, 2000)
      }
    }

    wsRef.current = ws
  }, [handleMessage])

  // Connect on mount — only when we have credentials
  // (we'll trigger connection from JoinScreen)
  const hasConnected = useRef(false)

  const joinGame = useCallback(
    (roomCode: string, playerName: string) => {
      dispatch({ type: 'SET_ROOM_CODE', code: roomCode })
      dispatch({ type: 'SET_PLAYER_NAME', name: playerName })

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'join_room',
            room_code: roomCode,
            player_name: playerName,
          })
        )
      } else {
        // Set state first, then connect — onopen will auto-join
        stateRef.current = {
          ...stateRef.current,
          roomCode,
          playerName,
        }
        connectWs()
      }
    },
    [connectWs]
  )

  // Auto-connect if URL has room param
  useEffect(() => {
    if (hasConnected.current) return
    const params = new URLSearchParams(window.location.search)
    const room = params.get('room')
    if (room) {
      dispatch({ type: 'SET_ROOM_CODE', code: room })
      hasConnected.current = true
    }
    return () => {
      wsRef.current?.close()
    }
  }, [])

  // Wrap dispatch to intercept WS-sending actions
  const wrappedDispatch = useCallback(
    (action: GameAction) => {
      dispatch(action)

      // Side effects that send WebSocket messages
      switch (action.type) {
        case 'VOTE':
          send({ type: 'vote', choice: action.choice })
          vibrate(50)
          break
        case 'USE_ABILITY':
          if (stateRef.current.role) {
            const needsTarget = ['D', 'G'].includes(stateRef.current.role.role_id)
            if (needsTarget) {
              send({ type: 'get_players' })
              dispatch({ type: 'SHOW_TARGET_MODAL', mode: 'ability' })
            } else {
              send({ type: 'use_ability' })
            }
          }
          break
      }
    },
    [send, vibrate]
  )

  const value: GameContextValue & { joinGame: typeof joinGame } = {
    state,
    dispatch: wrappedDispatch,
    send,
    vibrate,
    joinGame,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

// Extended hook for join functionality
export function useGameJoin() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGameJoin must be used within GameProvider')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ctx as any).joinGame as (roomCode: string, playerName: string) => void
}
