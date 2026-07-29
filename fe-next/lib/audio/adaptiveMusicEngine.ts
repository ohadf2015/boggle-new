/**
 * AdaptiveMusicEngine — Tone.js-powered music system that responds to game state.
 *
 * Unlike the Howler-based MusicContext (which crossfades between fixed tracks),
 * this engine manipulates a single audio graph in real-time: filter sweeps,
 * BPM changes, and layer volume envelopes react to intensity/phase changes.
 *
 * Tone.js is lazy-loaded (~400KB) — import cost is zero until `start()` is called.
 *
 * @example
 * ```ts
 * const engine = new AdaptiveMusicEngine();
 * await engine.start();
 * engine.setIntensity('building');
 * engine.setGamePhase('lastSeconds');
 * engine.stop();
 * ```
 */

import logger from '@/utils/logger';

// ─── Types ──────────────────────────────────────────────────────────────

export type MusicIntensity = 'calm' | 'building' | 'intense' | 'climax';
export type GamePhase = 'lobby' | 'playing' | 'lastSeconds' | 'results';

interface LayerConfig {
  /** URL to audio file */
  url: string;
  /** Base volume 0–1 */
  baseVolume: number;
  /** Which intensities this layer is audible at */
  activeAt: MusicIntensity[];
}

export interface AdaptiveMusicConfig {
  /** Audio layers that can be mixed independently */
  layers: Record<string, LayerConfig>;
  /** Base BPM (Tone.js Transport tempo) */
  baseBpm: number;
  /** Filter cutoff ranges per intensity level (Hz) */
  filterCutoffs: Record<MusicIntensity, number>;
  /** BPM multipliers per game phase */
  phaseTempoScale: Record<GamePhase, number>;
}

// ─── Default Config ─────────────────────────────────────────────────────

const DEFAULT_CONFIG: AdaptiveMusicConfig = {
  layers: {
    base: {
      url: '/music/in_game.mp3',
      baseVolume: 0.6,
      activeAt: ['calm', 'building', 'intense', 'climax'],
    },
    percussion: {
      url: '/music/bossa-arcade.mp3',
      baseVolume: 0.4,
      activeAt: ['building', 'intense', 'climax'],
    },
    intensity: {
      url: '/music/almost_out_of_time.mp3',
      baseVolume: 0.5,
      activeAt: ['intense', 'climax'],
    },
  },
  baseBpm: 120,
  filterCutoffs: {
    calm: 800,
    building: 2000,
    intense: 8000,
    climax: 20000,
  },
  phaseTempoScale: {
    lobby: 0.8,
    playing: 1.0,
    lastSeconds: 1.15,
    results: 0.7,
  },
};

// ─── Lazy Tone.js import ────────────────────────────────────────────────

type ToneModule = typeof import('tone');
let _toneModule: ToneModule | null = null;
let _tonePromise: Promise<ToneModule> | null = null;

async function loadTone(): Promise<ToneModule> {
  if (_toneModule) return _toneModule;
  if (!_tonePromise) {
    _tonePromise = import('tone').then((mod) => {
      _toneModule = mod;
      return mod;
    });
  }
  return _tonePromise;
}

// ─── Engine Class ───────────────────────────────────────────────────────

export class AdaptiveMusicEngine {
  private config: AdaptiveMusicConfig;
  private tone: ToneModule | null = null;
  private players: Map<string, InstanceType<ToneModule['Player']>> = new Map();
  private filter: InstanceType<ToneModule['Filter']> | null = null;
  private masterGain: InstanceType<ToneModule['Gain']> | null = null;
  private intensity: MusicIntensity = 'calm';
  private phase: GamePhase = 'lobby';
  private started = false;
  private disposed = false;

  constructor(config?: Partial<AdaptiveMusicConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Lazy-load Tone.js, create audio graph, start playback */
  async start(): Promise<void> {
    if (this.started || this.disposed) return;

    try {
      this.tone = await loadTone();

      // Resume AudioContext (required after user gesture)
      await this.tone.start();

      // Create master filter → gain chain
      this.filter = new this.tone.Filter({
        frequency: this.config.filterCutoffs[this.intensity],
        type: 'lowpass',
        rolloff: -12,
      }).toDestination();

      this.masterGain = new this.tone.Gain(0.7).connect(this.filter);

      // Create players for each layer
      const loadPromises: Promise<void>[] = [];
      for (const [name, layerConfig] of Object.entries(this.config.layers)) {
        const player = new this.tone.Player({
          url: layerConfig.url,
          loop: true,
          volume: this.getLayerVolume(name, layerConfig),
        }).connect(this.masterGain);

        this.players.set(name, player);
        loadPromises.push(
          new Promise<void>((resolve) => {
            player.loaded ? resolve() : player.buffer.onload = () => resolve();
          }),
        );
      }

      await Promise.all(loadPromises);

      // Set tempo
      this.tone.getTransport().bpm.value =
        this.config.baseBpm * this.config.phaseTempoScale[this.phase];

      // Start all players
      for (const player of this.players.values()) {
        player.start();
      }

      this.started = true;
      logger.info('[AdaptiveMusicEngine] Started');
    } catch (err) {
      logger.error('[AdaptiveMusicEngine] Failed to start:', err);
    }
  }

  /** Change intensity level — adjusts filter cutoff + layer volumes */
  setIntensity(level: MusicIntensity): void {
    if (this.intensity === level || !this.tone) return;
    this.intensity = level;

    // Ramp filter cutoff
    if (this.filter) {
      this.filter.frequency.rampTo(this.config.filterCutoffs[level], 0.8);
    }

    // Fade layers in/out based on intensity
    for (const [name, layerConfig] of Object.entries(this.config.layers)) {
      const player = this.players.get(name);
      if (!player) continue;
      const targetDb = this.getLayerVolume(name, layerConfig);
      player.volume.rampTo(targetDb, 0.5);
    }
  }

  /** Change game phase — adjusts tempo and macro feel */
  setGamePhase(phase: GamePhase): void {
    if (this.phase === phase || !this.tone) return;
    this.phase = phase;

    const targetBpm = this.config.baseBpm * this.config.phaseTempoScale[phase];
    this.tone.getTransport().bpm.rampTo(targetBpm, 1);
  }

  /** Set master volume (0–1) */
  setVolume(vol: number): void {
    if (this.masterGain && this.tone) {
      this.masterGain.gain.rampTo(Math.max(0, Math.min(1, vol)), 0.2);
    }
  }

  /** Pause playback */
  pause(): void {
    if (!this.started) return;
    for (const player of this.players.values()) {
      player.stop();
    }
  }

  /** Resume playback */
  resume(): void {
    if (!this.started) return;
    for (const player of this.players.values()) {
      player.start();
    }
  }

  /** Stop and clean up */
  stop(): void {
    if (!this.started) return;
    for (const player of this.players.values()) {
      player.stop();
      player.dispose();
    }
    this.players.clear();
    this.filter?.dispose();
    this.masterGain?.dispose();
    this.filter = null;
    this.masterGain = null;
    this.started = false;
    logger.info('[AdaptiveMusicEngine] Stopped');
  }

  /** Permanently dispose — cannot be restarted */
  dispose(): void {
    this.stop();
    this.disposed = true;
  }

  get isPlaying(): boolean {
    return this.started;
  }

  get currentIntensity(): MusicIntensity {
    return this.intensity;
  }

  get currentPhase(): GamePhase {
    return this.phase;
  }

  // ─── Private helpers ────────────────────────────────────────────────

  private getLayerVolume(_name: string, config: LayerConfig): number {
    const active = config.activeAt.includes(this.intensity);
    // Convert 0–1 to decibels; muted layers go to -Infinity
    return active ? 20 * Math.log10(Math.max(config.baseVolume, 0.001)) : -60;
  }
}
