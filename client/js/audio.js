/**
 * 靜默之島 v3.0 — Web Audio API 音效引擎
 * 全部音效由 Web Audio API 合成，無需音檔。
 */
class SilentIslandAudio {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    // 心跳
    this._heartbeatInterval = null;
    this._heartbeatGain = null;
    // 環境音
    this._ambientOsc = null;
    this._ambientLfo = null;
    this._ambientGain = null;
    // MP3 背景音樂
    this._bgm = null;
    this._eventReveal = null;
    this._ending = null;
    this._bgmFadeTimer = null;
  }

  /** 初始化 AudioContext（需由使用者互動觸發） */
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API 不支援', e);
    }
  }

  _ensureCtx() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // ── 心跳音效 ──────────────────────────────────────

  /**
   * 開始心跳音效，隨倒數加速
   * @param {number} totalSeconds 倒數總秒數
   */
  startHeartbeat(totalSeconds) {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    this.stopHeartbeat();

    this._heartbeatGain = ctx.createGain();
    this._heartbeatGain.gain.value = 0.15;
    this._heartbeatGain.connect(ctx.destination);

    let elapsed = 0;
    const beat = () => {
      if (!this._heartbeatGain) return;
      const progress = Math.min(elapsed / totalSeconds, 1);
      // 間隔從 1000ms → 300ms
      const interval = 1000 - 700 * progress;
      // 音量隨進度提升
      this._heartbeatGain.gain.value = 0.15 + 0.25 * progress;

      this._playBeat(60, 0.08);  // lub
      setTimeout(() => this._playBeat(50, 0.06), 120); // dub

      elapsed += interval / 1000;
      this._heartbeatInterval = setTimeout(beat, interval);
    };
    beat();
  }

  _playBeat(freq, duration) {
    const ctx = this.ctx;
    if (!ctx || !this._heartbeatGain) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.6, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(env);
    env.connect(this._heartbeatGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearTimeout(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
    if (this._heartbeatGain) {
      this._heartbeatGain.disconnect();
      this._heartbeatGain = null;
    }
  }

  // ── 環境低頻嗡鳴 ──────────────────────────────────

  /**
   * 開始環境音，隨恐懼值調整
   * @param {number} fearLevel 0-6+
   */
  startAmbient(fearLevel) {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    this.stopAmbient();

    this._ambientGain = ctx.createGain();
    this._ambientGain.gain.value = 0.03 + fearLevel * 0.015;
    this._ambientGain.connect(ctx.destination);

    this._ambientOsc = ctx.createOscillator();
    this._ambientOsc.type = 'sine';
    this._ambientOsc.frequency.value = 40 + fearLevel * 8;

    // LFO 調變
    this._ambientLfo = ctx.createOscillator();
    this._ambientLfo.type = 'sine';
    this._ambientLfo.frequency.value = 0.3 + fearLevel * 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 5 + fearLevel * 3;
    this._ambientLfo.connect(lfoGain);
    lfoGain.connect(this._ambientOsc.frequency);

    this._ambientOsc.connect(this._ambientGain);
    this._ambientOsc.start();
    this._ambientLfo.start();
  }

  updateAmbientFear(fearLevel) {
    if (!this._ambientOsc || !this._ambientGain) return;
    this._ambientOsc.frequency.value = 40 + fearLevel * 8;
    this._ambientGain.gain.value = 0.03 + fearLevel * 0.015;
  }

  stopAmbient() {
    try { this._ambientOsc?.stop(); } catch {}
    try { this._ambientLfo?.stop(); } catch {}
    this._ambientOsc = null;
    this._ambientLfo = null;
    if (this._ambientGain) {
      this._ambientGain.disconnect();
      this._ambientGain = null;
    }
  }

  // ── 被帶走刺耳音效 ────────────────────────────────

  playTakenAway() {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.3, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    master.connect(ctx.destination);

    // 三個不和諧 sawtooth
    [110, 117, 123].forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.5, now + 2.5);
      osc.connect(master);
      osc.start(now);
      osc.stop(now + 2.5);
    });

    // sub-bass 撞擊
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(30, now);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 1);

    this.vibrateTakenAway();
  }

  // ── 擲幣金屬聲 ────────────────────────────────────

  playCoinFlip() {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.8);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  // ── 投票確認 click ─────────────────────────────────

  playVoteClick() {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);

    this.vibrateVoteConfirm();
  }

  // ── 伏筆不和諧和弦 ────────────────────────────────

  playForeshadowChord() {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.15, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 3);
    master.connect(ctx.destination);

    // 小二度 cluster (triangle)
    [261.6, 277.2, 293.7, 311.1].forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(master);
      osc.start(now);
      osc.stop(now + 3);
    });

    this.vibrateForeshadow();
  }

  // ── 結局柔和 ambient ──────────────────────────────

  playEndingAmbient() {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.1, now);
    master.gain.linearRampToValueAtTime(0.08, now + 30);
    master.gain.linearRampToValueAtTime(0.001, now + 60);
    master.connect(ctx.destination);

    // 柔和三和弦 pad
    [261.6, 329.6, 392.0].forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(master);
      osc.start(now);
      osc.stop(now + 60);
    });
  }

  // ── 收到紙條提示音 ────────────────────────────────

  playNoteReceived() {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    // 雙擊 sine
    [0, 0.12].forEach(offset => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 600;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.1);
    });

    this.vibrateNoteReceived();
  }

  // ── 震動回饋 ──────────────────────────────────────

  vibrateTakenAway() {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
  }

  vibrateVoteConfirm() {
    if (navigator.vibrate) navigator.vibrate(50);
  }

  vibrateForeshadow() {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
  }

  vibrateNoteReceived() {
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  }

  // ── MP3 背景音樂 ────────────────────────────────────

  _getBgm() {
    if (!this._bgm) {
      this._bgm = new Audio('/audio/開場主題曲.mp3');
      this._bgm.loop = true;
      this._bgm.volume = 0.3;
      this._bgm.preload = 'auto';
    }
    return this._bgm;
  }

  _getEventReveal() {
    if (!this._eventReveal) {
      this._eventReveal = new Audio('/audio/事件揭露.mp3');
      this._eventReveal.loop = false;
      this._eventReveal.volume = 0.6;
      this._eventReveal.preload = 'auto';
    }
    return this._eventReveal;
  }

  _getEnding() {
    if (!this._ending) {
      this._ending = new Audio('/audio/結尾.mp3');
      this._ending.loop = false;
      this._ending.volume = 0.5;
      this._ending.preload = 'auto';
    }
    return this._ending;
  }

  /** 解鎖音頻（瀏覽器 autoplay 限制） */
  unlockAudio() {
    const bgm = this._getBgm();
    bgm.play().then(() => bgm.pause()).catch(() => {});
    this._getEventReveal().load();
    this._getEnding().load();
  }

  playBgm() {
    const bgm = this._getBgm();
    if (this._bgmFadeTimer) {
      clearInterval(this._bgmFadeTimer);
      this._bgmFadeTimer = null;
    }
    bgm.volume = 0.3;
    bgm.play().catch(() => {});
  }

  stopBgm() {
    const bgm = this._getBgm();
    bgm.pause();
    bgm.currentTime = 0;
  }

  fadeOutBgm() {
    const bgm = this._getBgm();
    if (bgm.paused) return;
    if (this._bgmFadeTimer) clearInterval(this._bgmFadeTimer);
    const step = bgm.volume / 30; // 1.5s fade
    this._bgmFadeTimer = setInterval(() => {
      if (bgm.volume <= step) {
        bgm.volume = 0;
        bgm.pause();
        bgm.currentTime = 0;
        bgm.volume = 0.3;
        clearInterval(this._bgmFadeTimer);
        this._bgmFadeTimer = null;
      } else {
        bgm.volume -= step;
      }
    }, 50);
  }

  playEventReveal() {
    const audio = this._getEventReveal();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  playEndingMusic() {
    const audio = this._getEnding();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  stopAllMusic() {
    if (this._bgmFadeTimer) {
      clearInterval(this._bgmFadeTimer);
      this._bgmFadeTimer = null;
    }
    if (this._bgm) { this._bgm.pause(); this._bgm.currentTime = 0; this._bgm.volume = 0.3; }
    if (this._eventReveal) { this._eventReveal.pause(); this._eventReveal.currentTime = 0; }
    if (this._ending) { this._ending.pause(); this._ending.currentTime = 0; }
  }

  // ── 清理 ──────────────────────────────────────────

  destroy() {
    this.stopHeartbeat();
    this.stopAmbient();
    this.stopAllMusic();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}

// 全域實例
const silentAudio = new SilentIslandAudio();
