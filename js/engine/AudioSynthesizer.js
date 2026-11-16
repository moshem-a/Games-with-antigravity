/**
 * Procedural Web Audio Synthesizer for Monster Rush: The Lost Island.
 * Produces crystal gem chimes, coin pickups, jump whooshes, dash bursts,
 * obstacle impacts, portal awakening chords, and victory fanfares with zero external audio dependencies.
 * Zero-GC design: pre-allocated typed frequency tables and automatic AudioNode disconnection on end.
 */

const PENTATONIC_SCALE = new Float64Array([523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51]);
const COIN_FREQS = new Float64Array([987.77, 1318.51]);
const CHEST_NOTES = new Float64Array([523.25, 659.25, 783.99, 1046.5, 1318.51]);
const PORTAL_CHORD = new Float64Array([440, 554.37, 659.25, 880, 1108.73]);
const VICTORY_FANFARE = new Float64Array([523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5, 1318.51]);
const VICTORY_OFFSETS = new Float64Array([0, 0.1, 0.2, 0.32, 0.46, 0.58, 0.72]);
const GAMEOVER_NOTES = new Float64Array([392.0, 349.23, 329.63, 261.63]);

export class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.unlocked = false;
    this.pentatonicScale = PENTATONIC_SCALE;
  }

  ensureContext() {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.75;
      this.masterGain.gain.value = this.muted ? 0 : 0.85;
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;
    return true;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime);
    }
    return this.muted;
  }

  _scheduleTone(type, startFreq, endFreq, startTime, stopDelay, peakGain, freqRampDelay = stopDelay) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    if (endFreq > 0 && endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + freqRampDelay);
    }
    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + stopDelay);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.onended = () => {
      osc.onended = null;
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(startTime);
    osc.stop(startTime + stopDelay);
  }

  playCoin() {
    if (this.muted || !this.ensureContext()) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < COIN_FREQS.length; i++) {
      this._scheduleTone('sine', COIN_FREQS[i], 0, now + i * 0.055, 0.26, 0.22);
    }
  }

  playGem(comboCount = 1) {
    if (this.muted || !this.ensureContext()) return;
    const now = this.ctx.currentTime;
    const idx = Math.min(this.pentatonicScale.length - 1, Math.max(0, comboCount - 1));
    const baseFreq = this.pentatonicScale[idx];

    this._scheduleTone('triangle', baseFreq, baseFreq * 1.06, now, 0.32, 0.26, 0.28);
    const harmFreq = baseFreq * 1.5;
    this._scheduleTone('sine', harmFreq, harmFreq * 1.06, now + 0.04, 0.32, 0.26, 0.28);
  }

  playLaneSwitch() {
    if (this.muted || !this.ensureContext()) return;
    const now = this.ctx.currentTime;
    this._scheduleTone('sine', 290, 520, now, 0.075, 0.14, 0.07);
  }

  playJump() {
    if (this.muted || !this.ensureContext()) return;
    const now = this.ctx.currentTime;
    this._scheduleTone('sine', 260, 680, now, 0.18, 0.24, 0.16);
  }

  playDash() {
    if (this.muted || !this.ensureContext()) return;
    const now = this.ctx.currentTime;
    this._scheduleTone('sawtooth', 540, 180, now, 0.22, 0.18, 0.22);
  }

  playChestOpen() {
    if (this.muted || !this.ensureContext()) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < CHEST_NOTES.length; i++) {
      this._scheduleTone('triangle', CHEST_NOTES[i], 0, now + i * 0.055, 0.35, 0.25);
    }
  }

  playHit() {
    if (this.muted || !this.ensureContext()) return;
    const now = this.ctx.currentTime;
    this._scheduleTone('sawtooth', 160, 48, now, 0.3, 0.32, 0.28);
  }

  playPortalSpawn() {
    if (this.muted || !this.ensureContext()) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < PORTAL_CHORD.length; i++) {
      this._scheduleTone('sine', PORTAL_CHORD[i], 0, now + i * 0.07, 0.75, 0.2);
    }
  }

  playVictory() {
    if (this.muted || !this.ensureContext()) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < VICTORY_FANFARE.length; i++) {
      this._scheduleTone('triangle', VICTORY_FANFARE[i], 0, now + VICTORY_OFFSETS[i], 0.55, 0.28);
    }
  }

  playGameOver() {
    if (this.muted || !this.ensureContext()) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < GAMEOVER_NOTES.length; i++) {
      this._scheduleTone('triangle', GAMEOVER_NOTES[i], 0, now + i * 0.14, 0.38, 0.22);
    }
  }
}
