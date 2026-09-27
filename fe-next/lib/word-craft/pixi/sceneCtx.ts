import type { Application, Container } from 'pixi.js';
import type { BoardCoords } from '@/components/word-craft/hooks/useBoardCoords';

export interface SceneCtx {
  app: Application;
  ambientLayer: Container;
  eventLayer: Container;
  coords: BoardCoords;
  reducedMotion: boolean;
}

export interface Scene {
  play(): Promise<void>;
}
