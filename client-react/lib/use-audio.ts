'use client'

import { useRef, useCallback, useEffect } from 'react'

const BGM_URL = '/audio/開場主題曲.mp3'
const EVENT_REVEAL_URL = '/audio/事件揭露.mp3'
const ENDING_URL = '/audio/結尾.mp3'

const BGM_VOLUME = 0.3
const FADE_DURATION = 1500 // ms
const FADE_INTERVAL = 50 // ms

export function useAudio() {
  // ── MP3 refs ──
  const bgmRef = useRef<HTMLAudioElement | null>(null)
  const eventRef = useRef<HTMLAudioElement | null>(null)
  const endingRef = useRef<HTMLAudioElement | null>(null)
  const unlockedRef = useRef(false)
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Web Audio API refs ──
  const audioCtxRef = useRef<AudioContext | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatGainRef = useRef<GainNode | null>(null)
  const ambientOscRef = useRef<OscillatorNode | null>(null)
  const ambientLfoRef = useRef<OscillatorNode | null>(null)
  const ambientGainRef = useRef<GainNode | null>(null)
  const endingAmbientGainRef = useRef<GainNode | null>(null)
  const endingAmbientOscsRef = useRef<OscillatorNode[]>([])

  // ── AudioContext helpers ──

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
    }
    return ctx
  }, [])

  const vibrate = useCallback((pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern)
  }, [])

  // ── MP3 lazy creators ──

  const getBgm = useCallback(() => {
    if (!bgmRef.current && typeof window !== 'undefined') {
      const audio = new Audio(BGM_URL)
      audio.loop = true
      audio.volume = BGM_VOLUME
      audio.preload = 'auto'
      bgmRef.current = audio
    }
    return bgmRef.current
  }, [])

  const getEventReveal = useCallback(() => {
    if (!eventRef.current && typeof window !== 'undefined') {
      const audio = new Audio(EVENT_REVEAL_URL)
      audio.loop = false
      audio.volume = 0.6
      audio.preload = 'auto'
      eventRef.current = audio
    }
    return eventRef.current
  }, [])

  const getEnding = useCallback(() => {
    if (!endingRef.current && typeof window !== 'undefined') {
      const audio = new Audio(ENDING_URL)
      audio.loop = false
      audio.volume = 0.5
      audio.preload = 'auto'
      endingRef.current = audio
    }
    return endingRef.current
  }, [])

  // ── Unlock ──

  const unlock = useCallback(() => {
    if (unlockedRef.current) return
    unlockedRef.current = true

    const bgm = getBgm()
    const ev = getEventReveal()
    const end = getEnding()
    if (bgm) {
      bgm.play().then(() => bgm.pause()).catch(() => {})
    }
    if (ev) ev.load()
    if (end) end.load()

    // Also init AudioContext on user gesture
    getAudioContext()
  }, [getBgm, getEventReveal, getEnding, getAudioContext])

  // ── MP3 controls ──

  const playBgm = useCallback(() => {
    const bgm = getBgm()
    if (!bgm) return
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current)
      fadeTimerRef.current = null
    }
    bgm.volume = BGM_VOLUME
    bgm.play().catch(() => {})
  }, [getBgm])

  const stopBgm = useCallback(() => {
    const bgm = getBgm()
    if (!bgm) return
    bgm.pause()
    bgm.currentTime = 0
  }, [getBgm])

  const fadeOutBgm = useCallback(() => {
    const bgm = getBgm()
    if (!bgm || bgm.paused) return
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current)

    const steps = FADE_DURATION / FADE_INTERVAL
    const volumeStep = bgm.volume / steps

    fadeTimerRef.current = setInterval(() => {
      if (!bgm || bgm.volume <= volumeStep) {
        bgm.volume = 0
        bgm.pause()
        bgm.currentTime = 0
        bgm.volume = BGM_VOLUME
        if (fadeTimerRef.current) {
          clearInterval(fadeTimerRef.current)
          fadeTimerRef.current = null
        }
      } else {
        bgm.volume -= volumeStep
      }
    }, FADE_INTERVAL)
  }, [getBgm])

  const playEventReveal = useCallback(() => {
    const audio = getEventReveal()
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [getEventReveal])

  const playEnding = useCallback(() => {
    const audio = getEnding()
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [getEnding])

  // ══════════════════════════════════════════════════════
  // Web Audio API synthesized effects
  // ══════════════════════════════════════════════════════

  // ── Heartbeat ──

  const startHeartbeat = useCallback((totalSeconds: number) => {
    const ctx = getAudioContext()
    if (!ctx) return

    // Clean up any existing heartbeat
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
    if (heartbeatGainRef.current) {
      heartbeatGainRef.current.disconnect()
      heartbeatGainRef.current = null
    }

    const gain = ctx.createGain()
    gain.gain.value = 0.15
    gain.connect(ctx.destination)
    heartbeatGainRef.current = gain

    let elapsed = 0
    const playBeat = (freq: number, duration: number) => {
      if (!heartbeatGainRef.current) return
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      env.gain.setValueAtTime(0.6, ctx.currentTime)
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.connect(env)
      env.connect(heartbeatGainRef.current)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    }

    const beat = () => {
      if (!heartbeatGainRef.current) return
      const progress = Math.min(elapsed / totalSeconds, 1)
      const interval = 1000 - 700 * progress
      heartbeatGainRef.current.gain.value = 0.15 + 0.25 * progress

      playBeat(60, 0.08)  // lub
      setTimeout(() => playBeat(50, 0.06), 120) // dub

      elapsed += interval / 1000
      heartbeatTimerRef.current = setTimeout(beat, interval)
    }
    beat()
  }, [getAudioContext])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
    if (heartbeatGainRef.current) {
      heartbeatGainRef.current.disconnect()
      heartbeatGainRef.current = null
    }
  }, [])

  // ── Ambient fear drone ──

  const startAmbient = useCallback((fearLevel: number) => {
    const ctx = getAudioContext()
    if (!ctx) return

    // Stop existing ambient first
    try { ambientOscRef.current?.stop() } catch {}
    try { ambientLfoRef.current?.stop() } catch {}
    if (ambientGainRef.current) ambientGainRef.current.disconnect()

    const gain = ctx.createGain()
    gain.gain.value = 0.03 + fearLevel * 0.015
    gain.connect(ctx.destination)
    ambientGainRef.current = gain

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 40 + fearLevel * 8
    ambientOscRef.current = osc

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.3 + fearLevel * 0.1
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 5 + fearLevel * 3
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    ambientLfoRef.current = lfo

    osc.connect(gain)
    osc.start()
    lfo.start()
  }, [getAudioContext])

  const updateAmbientFear = useCallback((fearLevel: number) => {
    if (!ambientOscRef.current || !ambientGainRef.current) return
    ambientOscRef.current.frequency.value = 40 + fearLevel * 8
    ambientGainRef.current.gain.value = 0.03 + fearLevel * 0.015
  }, [])

  const stopAmbient = useCallback(() => {
    try { ambientOscRef.current?.stop() } catch {}
    try { ambientLfoRef.current?.stop() } catch {}
    ambientOscRef.current = null
    ambientLfoRef.current = null
    if (ambientGainRef.current) {
      ambientGainRef.current.disconnect()
      ambientGainRef.current = null
    }
  }, [])

  // ── Vote click ──

  const playVoteClick = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 800
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.05)
    vibrate(50)
  }, [getAudioContext, vibrate])

  // ── Taken away ──

  const playTakenAway = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.3, now)
    master.gain.exponentialRampToValueAtTime(0.001, now + 2.5)
    master.connect(ctx.destination)

    ;[110, 117, 123].forEach(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now)
      osc.frequency.linearRampToValueAtTime(freq * 0.5, now + 2.5)
      osc.connect(master)
      osc.start(now)
      osc.stop(now + 2.5)
    })

    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(30, now)
    const subGain = ctx.createGain()
    subGain.gain.setValueAtTime(0.5, now)
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1)
    sub.connect(subGain)
    subGain.connect(ctx.destination)
    sub.start(now)
    sub.stop(now + 1)

    vibrate([200, 100, 200, 100, 500])
  }, [getAudioContext, vibrate])

  // ── Foreshadow chord ──

  const playForeshadowChord = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.15, now)
    master.gain.exponentialRampToValueAtTime(0.001, now + 3)
    master.connect(ctx.destination)

    ;[261.6, 277.2, 293.7, 311.1].forEach(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      osc.connect(master)
      osc.start(now)
      osc.stop(now + 3)
    })

    vibrate([100, 50, 100, 50, 300])
  }, [getAudioContext, vibrate])

  // ── Coin flip ──

  const playCoinFlip = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(2000, now)
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.8)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.8)
  }, [getAudioContext])

  // ── Note received ──

  const playNoteReceived = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    ;[0, 0.12].forEach(offset => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 600
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.2, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.1)
    })
    vibrate([50, 30, 50])
  }, [getAudioContext, vibrate])

  // ── Ending ambient pad ──

  const playEndingAmbient = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Stop any existing ending ambient
    endingAmbientOscsRef.current.forEach(o => { try { o.stop() } catch {} })
    endingAmbientOscsRef.current = []
    if (endingAmbientGainRef.current) {
      endingAmbientGainRef.current.disconnect()
    }

    const master = ctx.createGain()
    master.gain.setValueAtTime(0.1, now)
    master.gain.linearRampToValueAtTime(0.08, now + 30)
    master.gain.linearRampToValueAtTime(0.001, now + 60)
    master.connect(ctx.destination)
    endingAmbientGainRef.current = master

    const oscs: OscillatorNode[] = []
    ;[261.6, 329.6, 392.0].forEach(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(master)
      osc.start(now)
      osc.stop(now + 60)
      oscs.push(osc)
    })
    endingAmbientOscsRef.current = oscs
  }, [getAudioContext])

  // ══════════════════════════════════════════════════════
  // New phase sound effects
  // ══════════════════════════════════════════════════════

  // ── Identity confirm tone ──

  const playIdentityConfirmTone = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // A minor triad
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.12, now)
    master.gain.exponentialRampToValueAtTime(0.001, now + 2.5)
    master.connect(ctx.destination)

    ;[220, 261.6, 329.6].forEach(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(master)
      osc.start(now)
      osc.stop(now + 2.5)
    })

    // Sub bass impact
    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 55
    const subGain = ctx.createGain()
    subGain.gain.setValueAtTime(0.3, now)
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    sub.connect(subGain)
    subGain.connect(ctx.destination)
    sub.start(now)
    sub.stop(now + 0.5)

    vibrate([80, 40, 80])
  }, [getAudioContext, vibrate])

  // ── Discussion ambient ──

  const playDiscussionAmbient = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Low drone
    const drone = ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 65
    const droneGain = ctx.createGain()
    droneGain.gain.setValueAtTime(0.04, now)
    droneGain.gain.exponentialRampToValueAtTime(0.001, now + 3)
    drone.connect(droneGain)
    droneGain.connect(ctx.destination)
    drone.start(now)
    drone.stop(now + 3)

    // High tick
    const tick = ctx.createOscillator()
    tick.type = 'sine'
    tick.frequency.value = 1200
    const tickGain = ctx.createGain()
    tickGain.gain.setValueAtTime(0.08, now)
    tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02)
    tick.connect(tickGain)
    tickGain.connect(ctx.destination)
    tick.start(now)
    tick.stop(now + 0.02)
  }, [getAudioContext])

  // ── Result reveal ──

  const playResultReveal = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Impact boom
    const boom = ctx.createOscillator()
    boom.type = 'sine'
    boom.frequency.value = 80
    const boomGain = ctx.createGain()
    boomGain.gain.setValueAtTime(0.3, now)
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    boom.connect(boomGain)
    boomGain.connect(ctx.destination)
    boom.start(now)
    boom.stop(now + 0.3)

    // Triangle shimmer
    const shimmer = ctx.createOscillator()
    shimmer.type = 'triangle'
    shimmer.frequency.value = 440
    const shimmerGain = ctx.createGain()
    shimmerGain.gain.setValueAtTime(0.1, now + 0.1)
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6)
    shimmer.connect(shimmerGain)
    shimmerGain.connect(ctx.destination)
    shimmer.start(now + 0.1)
    shimmer.stop(now + 1.6)

    // Sub rumble
    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 40
    const subGain = ctx.createGain()
    subGain.gain.setValueAtTime(0.2, now + 0.05)
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85)
    sub.connect(subGain)
    subGain.connect(ctx.destination)
    sub.start(now + 0.05)
    sub.stop(now + 0.85)

    vibrate(100)
  }, [getAudioContext, vibrate])

  // ── Waiting pulse ──

  const playWaitingPulse = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 50
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.015, now)
    gain.gain.linearRampToValueAtTime(0.015, now + 0.75)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 1.5)
  }, [getAudioContext])

  // ══════════════════════════════════════════════════════
  // Stop all & cleanup
  // ══════════════════════════════════════════════════════

  const stopAll = useCallback(() => {
    // MP3
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current)
      fadeTimerRef.current = null
    }
    const bgm = bgmRef.current
    if (bgm) { bgm.pause(); bgm.currentTime = 0; bgm.volume = BGM_VOLUME }
    const ev = eventRef.current
    if (ev) { ev.pause(); ev.currentTime = 0 }
    const end = endingRef.current
    if (end) { end.pause(); end.currentTime = 0 }

    // Web Audio
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
    if (heartbeatGainRef.current) {
      heartbeatGainRef.current.disconnect()
      heartbeatGainRef.current = null
    }
    try { ambientOscRef.current?.stop() } catch {}
    try { ambientLfoRef.current?.stop() } catch {}
    ambientOscRef.current = null
    ambientLfoRef.current = null
    if (ambientGainRef.current) {
      ambientGainRef.current.disconnect()
      ambientGainRef.current = null
    }
    endingAmbientOscsRef.current.forEach(o => { try { o.stop() } catch {} })
    endingAmbientOscsRef.current = []
    if (endingAmbientGainRef.current) {
      endingAmbientGainRef.current.disconnect()
      endingAmbientGainRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current)
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current)
      bgmRef.current?.pause()
      eventRef.current?.pause()
      endingRef.current?.pause()
      try { ambientOscRef.current?.stop() } catch {}
      try { ambientLfoRef.current?.stop() } catch {}
      endingAmbientOscsRef.current.forEach(o => { try { o.stop() } catch {} })
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
    }
  }, [])

  return {
    unlock,
    playBgm,
    stopBgm,
    fadeOutBgm,
    playEventReveal,
    playEnding,
    stopAll,
    // Web Audio synthesized
    startHeartbeat,
    stopHeartbeat,
    startAmbient,
    updateAmbientFear,
    stopAmbient,
    playVoteClick,
    playTakenAway,
    playForeshadowChord,
    playCoinFlip,
    playNoteReceived,
    playEndingAmbient,
    // New phase effects
    playIdentityConfirmTone,
    playDiscussionAmbient,
    playResultReveal,
    playWaitingPulse,
  }
}
