/**
 * Party Game Type Definitions
 * Shared between frontend, backend, and TV/phone views
 */

import type { Avatar } from './game';

// ==================== Core Party Types ====================

export type PartyGameId = 'caption-clash' | 'pixel-clash' | 'shadow-clash';

export type PartyGameCategory = 'party';

export type PartyPhase =
  | 'lobby'
  | 'playing'
  | 'voting'
  | 'reveal'
  | 'results';

export type PartyViewMode = 'tv' | 'phone' | 'spectator';

// ==================== Player Types ====================

export interface PartyPlayer {
  socketId: string;
  username: string;
  avatar: Avatar;
  authUserId?: string | null;
  score: number;
  isHost: boolean;
  isSpectator: boolean;
  connected: boolean;
}

// ==================== Room Types ====================

export interface PartyRoom {
  roomCode: string;
  roomName: string;
  gameId: PartyGameId;
  hostSocketId: string;
  players: Record<string, PartyPlayer>;
  spectators: Record<string, PartyPlayer>;
  phase: PartyPhase;
  round: number;
  totalRounds: number;
  settings: PartyGameSettings;
  gameState: PartyGameState;
  createdAt: number;
  lastActivity: number;
}

export interface PartyGameSettings {
  maxPlayers: number;
  roundTimeSeconds: number;
  /** Game-specific settings */
  custom: Record<string, unknown>;
}

/** Union of all game-specific state — narrowed by gameId */
export type PartyGameState =
  | CaptionClashState
  | PixelClashState
  | ShadowClashState
  | null;

// ==================== Caption Clash ====================

export type CaptionClashPhase =
  | 'show-image'
  | 'writing'
  | 'lineup'
  | 'voting'
  | 'crown'
  | 'speed-round'
  | 'roast';

export interface CaptionClashState {
  type: 'caption-clash';
  phase: CaptionClashPhase;
  currentImageUrl: string;
  currentImageId: string;
  submissions: Record<string, CaptionSubmission>;
  votes: Record<string, string>; // voterId -> submissionId
  laughMeter: Record<string, number>; // submissionId -> laugh count
  /** Roast target (player username) for roast round */
  roastTarget?: string;
  /** Common words from submissions for the live word cloud */
  wordCloud: Array<{ word: string; count: number }>;
  revealIndex: number;
}

export interface CaptionSubmission {
  id: string;
  playerId: string;
  username: string;
  text: string;
  submittedAt: number;
}

// ==================== Pixel Clash ====================

export type PixelClashMode = 'telephone' | 'showdown' | 'relay';

export type PixelClashPhase =
  | 'write-prompt'
  | 'drawing'
  | 'guessing'
  | 'gallery-reveal'
  | 'showdown-draw'
  | 'showdown-vote'
  | 'relay-artist'
  | 'relay-flash'
  | 'relay-build'
  | 'relay-merge'
  | 'voting';

export type PixelColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** 2D array of color indices (0 = empty) */
export type PixelGrid = PixelColor[][];

export interface PixelClashState {
  type: 'pixel-clash';
  mode: PixelClashMode;
  phase: PixelClashPhase;
  gridSize: number; // 8, 10, or 12
  colorPalette: string[]; // hex colors for each PixelColor index
  prompt?: string;
  /** Telephone mode: chains of alternating draw/guess */
  chains?: TelephoneChain[];
  /** Showdown mode: all player canvases for same prompt */
  canvases?: Record<string, PixelGrid>;
  /** Relay mode state */
  relay?: PixelRelayState;
  /** Which chain/canvas is being revealed */
  revealIndex: number;
  votes: Record<string, string>; // voterId -> targetId
}

export interface TelephoneChain {
  id: string;
  originPlayer: string;
  steps: TelephoneStep[];
}

export interface TelephoneStep {
  playerId: string;
  type: 'write' | 'draw';
  content: string | PixelGrid; // text for write, grid for draw
  timestamp: number;
}

export interface PixelRelayState {
  artistId: string;
  originalCanvas: PixelGrid;
  prompt: string;
  /** Bands assigned to builders: top, middle, bottom */
  bands: Array<{
    builderId: string;
    startRow: number;
    endRow: number;
    canvas: PixelGrid;
  }>;
  /** Pixelation level for TV (0=max blur, 3=clear) */
  pixelationLevel: number;
  mergedCanvas?: PixelGrid;
  similarityScore?: number;
}

// ==================== Shadow Clash ====================

export type ShadowClashPhase =
  | 'dealing'
  | 'night'
  | 'dawn'
  | 'discussion'
  | 'trial'
  | 'verdict'
  | 'game-over';

export type ShadowRole = 'shadow' | 'seer' | 'medic' | 'citizen';

export type ShadowTeam = 'evil' | 'good';

export type ShadowClashVariant = 'standard' | 'one-night';

export interface ShadowClashState {
  type: 'shadow-clash';
  variant: ShadowClashVariant;
  phase: ShadowClashPhase;
  round: number;
  maxRounds: number;
  /** Role assignments — ONLY sent to individual players via private events */
  roles: Record<string, ShadowRole>;
  /** Public info: who is alive */
  alivePlayers: string[];
  /** Public info: eliminated players with revealed roles */
  eliminated: Array<{
    username: string;
    role: ShadowRole;
    eliminatedBy: 'night' | 'vote';
    round: number;
  }>;
  /** Night actions (server-side only, never broadcast) */
  nightActions?: {
    shadowTarget?: string;
    seerTarget?: string;
    seerResult?: ShadowTeam;
    medicTarget?: string;
  };
  /** Vote state */
  votes: Record<string, string | 'skip'>; // voterId -> targetUsername or 'skip'
  /** Who was saved by medic this round (public after dawn) */
  savedThisRound?: boolean;
  /** Winner (set when game ends) */
  winner?: ShadowTeam;
  /** Discussion timer started at */
  discussionStartedAt?: number;
}

// ==================== Socket Events ====================

/** Events emitted by the server to clients */
export interface PartyServerEvents {
  'party:joined': (data: { room: PartyRoomPublic; playerId: string }) => void;
  'party:playerJoined': (data: { player: PartyPlayer }) => void;
  'party:playerLeft': (data: { socketId: string; username: string }) => void;
  'party:phaseChange': (data: { phase: PartyPhase; gameState: PartyGameStatePublic }) => void;
  'party:gameUpdate': (data: PartyGameStatePublic) => void;
  'party:roundResults': (data: PartyRoundResults) => void;
  'party:gameResults': (data: PartyGameResults) => void;
  'party:error': (data: { error: string; message: string }) => void;
  // Caption Clash specific
  'party:caption:imageReady': (data: { imageUrl: string; imageId: string }) => void;
  'party:caption:submissionCount': (data: { count: number; total: number }) => void;
  'party:caption:revealCaption': (data: { submission: CaptionSubmission; index: number }) => void;
  'party:caption:laughUpdate': (data: { submissionId: string; count: number }) => void;
  'party:caption:wordCloud': (data: { words: Array<{ word: string; count: number }> }) => void;
  'party:caption:voteResults': (data: { results: Array<{ submission: CaptionSubmission; votes: number; percentage: number }> }) => void;
  // Pixel Clash specific
  'party:pixel:canvasUpdate': (data: { playerId: string; canvas: PixelGrid }) => void;
  'party:pixel:chainReveal': (data: { chain: TelephoneChain; index: number }) => void;
  'party:pixel:pixelationLevel': (data: { level: number; canvas?: PixelGrid }) => void;
  'party:pixel:relayBands': (data: { bands: PixelRelayState['bands'] }) => void;
  'party:pixel:mergeReveal': (data: { merged: PixelGrid; original: PixelGrid; prompt: string; score: number }) => void;
  // Shadow Clash specific
  'party:shadow:roleAssigned': (data: { role: ShadowRole; team: ShadowTeam; partnerUsername?: string }) => void;
  'party:shadow:nightAction': (data: { action: string }) => void;
  'party:shadow:dawn': (data: { eliminated?: string; role?: ShadowRole; saved: boolean }) => void;
  'party:shadow:voteReveal': (data: { votes: Record<string, string>; eliminated?: string; role?: ShadowRole }) => void;
  'party:shadow:gameOver': (data: { winner: ShadowTeam; roles: Record<string, ShadowRole> }) => void;
}

/** Events emitted by clients to the server */
export interface PartyClientEvents {
  'party:create': (data: { gameId: PartyGameId; roomName: string; username: string; avatar: Avatar }) => void;
  'party:join': (data: { roomCode: string; username: string; avatar: Avatar; asSpectator?: boolean }) => void;
  'party:leave': () => void;
  'party:startGame': () => void;
  'party:input': (data: PartyInput) => void;
}

/** All possible player inputs, discriminated by game */
export type PartyInput =
  | { gameId: 'caption-clash'; action: 'submit-caption'; text: string }
  | { gameId: 'caption-clash'; action: 'vote'; submissionId: string }
  | { gameId: 'caption-clash'; action: 'laugh'; submissionId: string }
  | { gameId: 'pixel-clash'; action: 'submit-prompt'; text: string }
  | { gameId: 'pixel-clash'; action: 'draw'; canvas: PixelGrid }
  | { gameId: 'pixel-clash'; action: 'guess'; text: string }
  | { gameId: 'pixel-clash'; action: 'vote'; targetId: string }
  | { gameId: 'pixel-clash'; action: 'emoji-hint'; emoji: string; targetPlayerId: string }
  | { gameId: 'shadow-clash'; action: 'night-action'; targetUsername: string }
  | { gameId: 'shadow-clash'; action: 'vote'; targetUsername: string | 'skip' }
  | { gameId: 'shadow-clash'; action: 'call-vote' };

// ==================== Public State (safe for broadcast) ====================

/** Room info safe to send to all clients (no secret game state) */
export type PartyRoomPublic = Omit<PartyRoom, 'gameState'> & {
  gameState: PartyGameStatePublic;
};

/** Game state with secrets stripped */
export type PartyGameStatePublic =
  | Omit<CaptionClashState, never> // captions are public after submission
  | Omit<PixelClashState, never> // canvases are public during reveal
  | Omit<ShadowClashState, 'roles' | 'nightActions'> // roles and night actions are private
  | null;

// ==================== Results ====================

export interface PartyRoundResults {
  round: number;
  winnerId?: string;
  winnerUsername?: string;
  scores: Record<string, number>;
  /** Game-specific round data */
  data?: Record<string, unknown>;
}

export interface PartyGameResults {
  gameId: PartyGameId;
  finalScores: Array<{
    username: string;
    avatar: Avatar;
    score: number;
    rank: number;
  }>;
  roundResults: PartyRoundResults[];
  mvp?: string;
  xpEarned?: Record<string, number>;
  goldEarned?: Record<string, number>;
}

// ==================== Game Registry ====================

export interface PartyGameDefinition {
  id: PartyGameId;
  nameKey: string; // i18n key
  descriptionKey: string; // i18n key
  category: PartyGameCategory;
  minPlayers: number;
  maxPlayers: number;
  defaultRounds: number;
  defaultRoundTime: number;
  accentColor: string; // tailwind color class
  icon: string; // emoji
}

export const PARTY_GAMES: Record<PartyGameId, PartyGameDefinition> = {
  'caption-clash': {
    id: 'caption-clash',
    nameKey: 'party.captionClash.name',
    descriptionKey: 'party.captionClash.description',
    category: 'party',
    minPlayers: 3,
    maxPlayers: 10,
    defaultRounds: 7,
    defaultRoundTime: 45,
    accentColor: 'neo-pink',
    icon: '\uD83D\uDDBC\uFE0F',
  },
  'pixel-clash': {
    id: 'pixel-clash',
    nameKey: 'party.pixelClash.name',
    descriptionKey: 'party.pixelClash.description',
    category: 'party',
    minPlayers: 3,
    maxPlayers: 10,
    defaultRounds: 5,
    defaultRoundTime: 60,
    accentColor: 'neo-cyan',
    icon: '\uD83C\uDFA8',
  },
  'shadow-clash': {
    id: 'shadow-clash',
    nameKey: 'party.shadowClash.name',
    descriptionKey: 'party.shadowClash.description',
    category: 'party',
    minPlayers: 5,
    maxPlayers: 10,
    defaultRounds: 4,
    defaultRoundTime: 180,
    accentColor: 'neo-purple',
    icon: '\uD83D\uDC3A',
  },
};
