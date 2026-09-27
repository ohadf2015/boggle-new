/**
 * Structural / wiring check — solo Word Tower path still composes the tower
 * scene, drop/crane path, tray HUD, and the framing + land-feedback pure
 * modules. Asserts real exports and drives the real manager accept/reject path.
 */
import { describe, it, expect } from 'vitest';
import { playChromeFrame } from '../playChromeFrame';
import { landFeedback } from '../landFeedback';
import { evaluatePlacement, alignmentBand } from '../cranePlacement';
import { WORD_TOWER_BUILD_LINE_FRACTION } from '../towerLayout';
import { craneShadowOffsetFromOuterTop } from '../craneGeometry';
import {
  initWordTowerState,
  validateTowerWord,
  applyTowerWord,
} from '../wordTowerManager';

// Component module graph — importing confirms the solo surfaces still exist
// and are not left unimported/dead after the polish.
import { WordTowerScene } from '@/components/wordTower/WordTowerScene';
import WordTowerCrane from '@/components/wordTower/WordTowerCrane';
import { WordTowerHud } from '@/components/wordTower/WordTowerHud';
import { WordTowerNoticeColumn } from '@/components/wordTower/WordTowerNoticeColumn';

const DICT = new Set(['CAT', 'RAT']);
const isInDict = (w: string) => DICT.has(w);

describe('solo Word Tower wiring + core loop', () => {
  it('exposes the play surfaces the solo path mounts', () => {
    expect(typeof WordTowerScene).toBe('function');
    // forwardRef components are objects with $$typeof / render
    expect(WordTowerCrane).toBeTruthy();
    expect(typeof WordTowerHud).toBe('function');
    expect(typeof WordTowerNoticeColumn).toBe('function');
  });

  it('accepting a valid word advances tower state; rejecting does not corrupt it', () => {
    const s = initWordTowerState({ gameCode: 'G', playerId: 'p1', language: 'en' });
    s.tray = ['C', 'A', 'T', 'R', 'E', 'S', 'N'];
    const height0 = s.heightM;
    const floors0 = s.floors.length;

    // Reject invalid — state unchanged when we never apply
    const rej = validateTowerWord(s, 'zz', isInDict);
    expect(rej.accepted).toBe(false);
    expect(s.heightM).toBe(height0);
    expect(s.floors).toHaveLength(floors0);

    // Accept + apply advances floors / height
    const ok = validateTowerWord(s, 'cat', isInDict);
    expect(ok.accepted).toBe(true);
    const { state, result } = applyTowerWord(s, 'cat');
    expect(state.floors.length).toBe(floors0 + 1);
    expect(state.heightM).toBeGreaterThan(height0);
    expect(result.meters).toBeGreaterThan(0);
    // Original state object not mutated into a desync (apply returns a new state)
    expect(s.floors).toHaveLength(floors0);
  });

  it('drop placement + shared framing + land feedback pure path still agree', () => {
    const perfect = evaluatePlacement(0, 0);
    expect(perfect.quality).toBe('perfect');
    expect(perfect.heightMultiplier).toBeGreaterThan(1);
    expect(alignmentBand(0)).toBe('perfect');
    expect(alignmentBand(0.9)).toBe('miss');

    const frame = playChromeFrame({ viewportH: 800, deckHeightPx: 220, meterHPx: 32 });
    expect(frame.buildLineY).toBeCloseTo(800 * WORD_TOWER_BUILD_LINE_FRACTION);
    expect(frame.noticeMaxHeightPx).toBeGreaterThanOrEqual(48);
    // Real DOM path: outer + meter + gap-3 + trolley + shadow ≈ build line
    expect(frame.craneTopPx + craneShadowOffsetFromOuterTop(32)).toBeCloseTo(frame.buildLineY, 0);

    const land = landFeedback('perfect');
    expect(land.celebrate).toBe(true);
    expect(land.punchIntensity).toBeGreaterThan(0.7);
    expect(landFeedback('perfect', { reducedMotion: true }).impactIntensity).toBe(0);
    expect(landFeedback('miss').celebrate).toBe(false);
  });
});
