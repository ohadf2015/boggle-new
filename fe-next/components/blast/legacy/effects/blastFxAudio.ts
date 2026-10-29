/**
 * Synthesized sfx layers that ride on top of the Howler sounds: coin-stack
 * chimes, diamond payoff, bomb sub-thump, big-word riser and the chain-ladder
 * release. WebAudio only (no samples). One lazily created context per page.
 */
import { coinChimeFreq, chainFxStep } from './blastFxIntensity';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let volume = 0.7;

export function setFxAudio(opts: { muted: boolean; volume: number }): void {
  muted = opts.muted;
  volume = Math.max(0, Math.min(1, opts.volume));
  if (master) master.gain.value = volume;
}

function getCtx(): AudioContext | null {
  if (muted || typeof window === 'undefined' || document.hidden) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

interface Voice {
  freq: number;
  wave?: OscillatorType;
  at?: number;
  dur: number;
  vol: number;
  attack?: number;
  /** Glide to this frequency over the voice. */
  to?: number;
}

function play(voices: Voice[]): void {
  const c = getCtx();
  if (!c || !master) return;
  const now = c.currentTime;
  for (const v of voices) {
    const t0 = now + (v.at ?? 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = v.wave ?? 'sine';
    osc.frequency.setValueAtTime(v.freq, t0);
    if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, t0 + v.dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v.vol, t0 + (v.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + v.dur + 0.02);
  }
}

/** Coin `i` of a stack: bell + octave sparkle, staggered so the stack climbs. */
export function playCoinChime(stackIndex: number): void {
  const f = coinChimeFreq(stackIndex);
  const at = stackIndex * 0.075;
  play([
    { freq: f, wave: 'triangle', at, dur: 0.22, vol: 0.07 },
    { freq: f * 2, at: at + 0.012, dur: 0.16, vol: 0.03 },
  ]);
}

export function playDiamondPayoff(): void {
  const notes = [1318.5, 1760, 2217.5, 2637];
  play([
    { freq: 220, wave: 'sine', dur: 0.35, vol: 0.09, to: 110 },
    ...notes.map((freq, i) => ({ freq, wave: 'sine' as const, at: 0.09 + i * 0.045, dur: 0.5 - i * 0.05, vol: 0.05 })),
    { freq: 3520, at: 0.28, dur: 0.4, vol: 0.015 },
  ]);
}

export function playBombThump(power: number): void {
  play([
    { freq: 120, wave: 'sine', dur: 0.32 + 0.12 * power, vol: 0.14 + 0.06 * power, to: 38 },
    { freq: 60, wave: 'triangle', at: 0.01, dur: 0.25, vol: 0.06 * power, to: 30 },
  ]);
}

export function playBigWordRiser(pitch: number): void {
  play([
    { freq: 330 * pitch, wave: 'sawtooth', dur: 0.32, vol: 0.025, attack: 0.2, to: 990 * pitch },
    { freq: 659 * pitch, wave: 'triangle', at: 0.3, dur: 0.45, vol: 0.06 },
    { freq: 830 * pitch, wave: 'triangle', at: 0.3, dur: 0.45, vol: 0.045 },
    { freq: 988 * pitch, wave: 'triangle', at: 0.3, dur: 0.5, vol: 0.045 },
  ]);
}

/** Fast arpeggio up every chain level reached, landing on a two-note chord. */
export function playChainLadder(peak: number): void {
  const steps = Math.min(Math.max(peak, 2), 6);
  const voices: Voice[] = [];
  for (let l = 1; l <= steps; l++) {
    voices.push({ freq: chainFxStep(l).freq, wave: 'triangle', at: (l - 1) * 0.06, dur: 0.18, vol: 0.06 });
  }
  const top = chainFxStep(steps + 1).freq;
  voices.push({ freq: top, wave: 'sine', at: steps * 0.06, dur: 0.55, vol: 0.07 });
  voices.push({ freq: top * 1.5, wave: 'sine', at: steps * 0.06, dur: 0.5, vol: 0.035 });
  play(voices);
}
