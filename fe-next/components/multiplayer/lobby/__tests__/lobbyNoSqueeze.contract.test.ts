/**
 * Contract: the host lobby can never squeeze its content into overlap.
 *
 * jsdom cannot compute flex layout, so this test pins the SOURCE PATTERNS that
 * guarantee it: every flex level between the MpScreen scroll body and the
 * mode tiles must keep its automatic content minimum (no `min-h-0` clamp) —
 * that is what lets a too-tall lobby extend the scroll region instead of
 * compressing the battle-mode grid's rows into each other (live bug on
 * production phones, 2026-09-27: tiles rendered on top of each other).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const hostView = readFileSync(join(__dirname, '../../../../host/components/HostPreGameView.tsx'), 'utf8');
const battleModeCard = readFileSync(join(__dirname, '../../../../host/components/pre-game/BattleModeCard.tsx'), 'utf8');

describe('host lobby no-squeeze contract', () => {
  it('view root sizes by h-full (fixed to the MpScreen body; the internal scroll lives in main)', () => {
    expect(hostView).toMatch(/className="h-full flex flex-col w-full/);
    expect(hostView).not.toMatch(/className="min-h-full/);
  });

  it('main is the single scroll region and must not clip with overflow-hidden', () => {
    const mainLine = hostView.split('\n').find((l) => l.includes('<main'));
    expect(mainLine).toBeDefined();
    expect(mainLine).toContain('overflow-y-auto');
    expect(mainLine).not.toContain('overflow-hidden');
  });

  it('phone CTA strip is pinned OUTSIDE the scroll region (after </main>) so it never scrolls', () => {
    const mainClose = hostView.indexOf('</main>');
    expect(mainClose).toBeGreaterThan(-1);
    expect(hostView.indexOf('data-testid="lobby-invite-button"')).toBeGreaterThan(mainClose);
    const stripLine = hostView.split('\n').find((l) => l.includes('lobby-invite-button'));
    expect(stripLine).toBeDefined();
  });

  it('phone column keeps its automatic minimum (no min-h-0 clamp above the mode grid)', () => {
    const phoneLine = hostView.split('\n').find((l) => l.includes('data-testid="lobby-phone"'));
    expect(phoneLine).toBeDefined();
    expect(phoneLine).not.toContain('min-h-0');
    const columnLine = hostView.split('\n').find((l) => l.includes('max-w-[600px] mx-auto'));
    expect(columnLine).toBeDefined();
    expect(columnLine).not.toContain('min-h-0');
  });

  it('mode picker card keeps its automatic minimum so the grid can never be squashed', () => {
    expect(hostView).toContain("cn(CARD, 'flex-1 flex flex-col')");
  });

  it('mode grid rows may stretch into free height but never compress below tile content', () => {
    expect(battleModeCard).toContain("fill && 'flex-1 auto-rows-fr'");
    // The overlap enabler: min-h-0 on the fr-row grid. Never reintroduce it.
    expect(battleModeCard).not.toContain("fill && 'flex-1 min-h-0 auto-rows-fr'");
    const gridLine = battleModeCard.split('\n').find((l) => l.includes('grid-cols-3'));
    expect(gridLine).toBeDefined();
    expect(gridLine).not.toContain('min-h-0');
  });
});
