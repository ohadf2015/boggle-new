import type { Application, Container, Texture } from 'pixi.js';
import type { ParticleConfig } from '@/lib/gameEngine/types';
import type { TweenManager } from '@/lib/gameEngine/Tween';
import type { PointerSample } from '@/lib/holidays/arcade/kit/gesture';
import type { KitSfx } from './useKitSfx';

export const ART_W = 768;
export const ART_H = 1344;

export type FloatTone = 'gold' | 'good' | 'bad';

export interface KitCtx {
  pixi: typeof import('pixi.js');
  app: Application;
  world: Container;
  fx: Container;
  reduced: boolean;
  tex: (name: string) => Texture;
  tweens: TweenManager;
  shake: (intensity: number, seconds?: number) => void;
  hitStop: (ms: number) => void;
  burst: (preset: ParticleConfig, x: number, y: number, count?: number) => void;
  float: (x: number, y: number, text: string, tone?: FloatTone) => void;
  sfx: KitSfx;
}

export interface Scene {
  update: (dt: number) => void;
  pointerDown?: (p: PointerSample) => void;
  pointerMove?: (p: PointerSample) => void;
  pointerUp?: (p: PointerSample) => void;
  action?: () => void;
  destroy?: () => void;
}

export const artUrl = (name: string) => (name.startsWith('/') ? name : `/holidays/arcade/${name}.webp`);
