"use client";

// Web Audio sound synthesizer for coin toss and game feedback.
// Zero external assets; works offline and respects user preference / mute.

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function setMuted(muted: boolean) {
  isMuted = muted;
}

export function getMuted(): boolean {
  return isMuted;
}

/** Satisfying metallic coin toss whoosh + spin sound. */
export function playCoinTossSound() {
  if (isMuted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Whoosh / spin modulation
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(450, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.35);

  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.4);

  // Metallic ring at peak
  setTimeout(() => {
    if (!ctx || isMuted) return;
    const ringOsc = ctx.createOscillator();
    const ringGain = ctx.createGain();

    ringOsc.type = "triangle";
    ringOsc.frequency.setValueAtTime(1400, ctx.currentTime);
    ringOsc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);

    ringGain.gain.setValueAtTime(0.12, ctx.currentTime);
    ringGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    ringOsc.connect(ringGain);
    ringGain.connect(ctx.destination);

    ringOsc.start();
    ringOsc.stop(ctx.currentTime + 0.5);
  }, 120);
}

/** Cheerful success / chime sound for positive tosses or completed goals. */
export function playSuccessChime() {
  if (isMuted) return;
  const ctx = getContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, index) => {
    const now = ctx.currentTime + index * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  });
}

/** Gentle thud / alert sound for storm tosses or unexpected expenses. */
export function playAlertSound() {
  if (isMuted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}
