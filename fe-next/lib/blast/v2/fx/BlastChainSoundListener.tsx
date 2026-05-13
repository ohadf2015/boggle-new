'use client';
import { useEffect, useRef } from 'react';
import { BLAST_CHAIN_OVATION_EVENT, type ChainOvationDetail } from './useChainEventBus';
import { chordForTier } from './chain-chord';

type AudioCtorWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as AudioCtorWindow;
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function isMuted(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('sfx-muted') === 'true';
}

function scheduleChord(ctx: AudioContext, notes: number[], noteDurationMs: number) {
  const noteDur = noteDurationMs / 1000;
  const peakGain = 0.06; // gentle, never harsh
  let t = ctx.currentTime;
  for (const freq of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peakGain, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + noteDur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + noteDur + 0.01);
    t += noteDur;
  }
}

export function BlastChainSoundListener() {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;

    const handler = (e: Event) => {
      if (isMuted()) return;
      const detail = (e as CustomEvent<ChainOvationDetail>).detail;
      const chord = chordForTier(detail.tier);
      if (chord.notes.length === 0) return;
      if (!ctxRef.current) {
        try {
          ctxRef.current = new Ctor();
        } catch {
          return;
        }
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      try {
        scheduleChord(ctx, chord.notes, chord.noteDurationMs);
      } catch {
        // AudioContext misuse — fail silent.
      }
    };

    window.addEventListener(BLAST_CHAIN_OVATION_EVENT, handler);
    return () => {
      window.removeEventListener(BLAST_CHAIN_OVATION_EVENT, handler);
      try {
        ctxRef.current?.close();
      } catch {
        // safe under fast unmount
      }
      ctxRef.current = null;
    };
  }, []);

  return null;
}
