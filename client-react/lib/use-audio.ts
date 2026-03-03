'use client'

import { useRef, useCallback, useEffect } from 'react'

const BGM_URL = '/audio/開場主題曲.mp3'
const EVENT_REVEAL_URL = '/audio/事件揭露.mp3'
const ENDING_URL = '/audio/結尾.mp3'

const BGM_VOLUME = 0.3
const FADE_DURATION = 1500 // ms
const FADE_INTERVAL = 50 // ms

export function useAudio() {
  const bgmRef = useRef<HTMLAudioElement | null>(null)
  const eventRef = useRef<HTMLAudioElement | null>(null)
  const endingRef = useRef<HTMLAudioElement | null>(null)
  const unlockedRef = useRef(false)
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Lazily create Audio elements (only in browser)
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

  // Unlock audio on first user interaction (handles autoplay restrictions)
  const unlock = useCallback(() => {
    if (unlockedRef.current) return
    unlockedRef.current = true

    // Create and immediately play/pause a silent context to unlock
    const bgm = getBgm()
    const ev = getEventReveal()
    const end = getEnding()
    if (bgm) {
      bgm.play().then(() => bgm.pause()).catch(() => {})
    }
    if (ev) {
      ev.load()
    }
    if (end) {
      end.load()
    }
  }, [getBgm, getEventReveal, getEnding])

  const playBgm = useCallback(() => {
    const bgm = getBgm()
    if (!bgm) return

    // Clear any ongoing fade
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current)
      fadeTimerRef.current = null
    }

    bgm.volume = BGM_VOLUME
    bgm.play().catch(() => {
      // Autoplay blocked — will retry after user interaction
    })
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

    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current)
    }

    const steps = FADE_DURATION / FADE_INTERVAL
    const volumeStep = bgm.volume / steps

    fadeTimerRef.current = setInterval(() => {
      if (!bgm || bgm.volume <= volumeStep) {
        bgm.volume = 0
        bgm.pause()
        bgm.currentTime = 0
        bgm.volume = BGM_VOLUME // reset for next play
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

  const stopAll = useCallback(() => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current)
      fadeTimerRef.current = null
    }
    const bgm = bgmRef.current
    if (bgm) {
      bgm.pause()
      bgm.currentTime = 0
      bgm.volume = BGM_VOLUME
    }
    const ev = eventRef.current
    if (ev) {
      ev.pause()
      ev.currentTime = 0
    }
    const end = endingRef.current
    if (end) {
      end.pause()
      end.currentTime = 0
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current)
      bgmRef.current?.pause()
      eventRef.current?.pause()
      endingRef.current?.pause()
    }
  }, [])

  return { unlock, playBgm, stopBgm, fadeOutBgm, playEventReveal, playEnding, stopAll }
}
