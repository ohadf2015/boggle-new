import type { VaultGridConfig } from '../grid/types';

export type RoomId = 'r1.1' | 'r1.2' | 'r1.3' | 'r1.4' | 'r1.5' | 'r1.6';
export type BeatId = string;
export type SceneObjectId = string;
export type ClueFragmentId = string;

export type ClueLine =
  | { kind: 'whisper'; text: string }
  | { kind: 'sense'; icon: 'cold' | 'dark' | 'empty' | 'name' | 'echo' }
  | { kind: 'memory'; text: string }
  | { kind: 'glyph'; glyph: string };

export type ClueFragment = ClueLine & { id: ClueFragmentId; roomId: RoomId };

export type ClueSet = {
  ambient: string;
  objects: Array<{
    sceneObjectId: SceneObjectId;
    onTap: ClueLine;
    fragmentId: ClueFragmentId;
  }>;
  notebookHint?: string;
};

export type SceneTransform = {
  cue?: 'ember-bloom' | 'ice-crack' | 'glyph-flare';
  storyBeats?: string[];
  unlocksDoor?: boolean;
};

export type RoomBeat = {
  id: BeatId;
  hint: ClueSet;
  grid: VaultGridConfig;
  onSolve: SceneTransform;
  unlocks?: BeatId[];
};

export type Room = {
  id: RoomId;
  beats: RoomBeat[];
  beatOrder: 'sequential' | 'free' | 'graph';
  exitCondition: 'all-beats' | 'final-beat-only';
};
