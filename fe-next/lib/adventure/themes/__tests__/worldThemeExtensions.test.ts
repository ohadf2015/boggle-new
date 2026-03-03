/**
 * Tests for HUD, Timer, and BossFight theme extensions on worlds 1-10.
 * Validates that every world has properly typed theme data for
 * in-game HUD, timer urgency, and boss fight UI.
 */

import { WORLD_1_THEME } from '../world1';
import { WORLD_2_THEME } from '../world2';
import { WORLD_3_THEME } from '../world3';
import { WORLD_4_THEME } from '../world4';
import { WORLD_5_THEME } from '../world5';
import type { WorldTheme, HUDTheme, TimerUrgencyTheme, BossFightTheme } from '../types';

const WORLDS_1_5: WorldTheme[] = [
  WORLD_1_THEME,
  WORLD_2_THEME,
  WORLD_3_THEME,
  WORLD_4_THEME,
  WORLD_5_THEME,
];

describe('Worlds 1-5: HUD/Timer/Boss Theme Extensions', () => {
  describe.each(WORLDS_1_5.map((w) => [w.id, w]))('World %i', (_id, theme) => {
    const world = theme as WorldTheme;

    describe('HUD Theme', () => {
      it('has hud property defined', () => {
        expect(world.hud).toBeDefined();
      });

      it('has all required HUD fields', () => {
        const hud = world.hud as HUDTheme;
        expect(hud.headerBg).toBeDefined();
        expect(hud.headerBorder).toBeDefined();
        expect(hud.sidebarBg).toBeDefined();
        expect(hud.scoreAccent).toBeDefined();
        expect(hud.levelBadgeColor).toBeDefined();
        expect(hud.levelBadgeText).toBeDefined();
        expect(hud.objectiveAccent).toBeDefined();
        expect(hud.hintActiveColor).toBeDefined();
        expect(hud.hintActiveText).toBeDefined();
      });

      it('headerBg contains bg- prefix', () => {
        expect(world.hud!.headerBg).toMatch(/^bg-/);
      });

      it('headerBorder contains border- prefix', () => {
        expect(world.hud!.headerBorder).toMatch(/^border-/);
      });
    });

    describe('Timer Urgency Theme', () => {
      it('has timerTheme property defined', () => {
        expect(world.timerTheme).toBeDefined();
      });

      it('has all 4 urgency levels', () => {
        const timer = world.timerTheme as TimerUrgencyTheme;
        expect(timer.normal).toBeDefined();
        expect(timer.warning).toBeDefined();
        expect(timer.danger).toBeDefined();
        expect(timer.critical).toBeDefined();
      });

      it('each urgency level has bg, text, shadow', () => {
        const timer = world.timerTheme as TimerUrgencyTheme;
        for (const level of [timer.normal, timer.warning, timer.danger, timer.critical]) {
          expect(level.bg).toBeDefined();
          expect(level.text).toBeDefined();
          expect(typeof level.shadow).toBe('string');
        }
      });
    });

    describe('Boss Fight Theme', () => {
      it('has bossFight property defined', () => {
        expect(world.bossFight).toBeDefined();
      });

      it('has all required boss fight fields', () => {
        const boss = world.bossFight as BossFightTheme;
        expect(boss.dialogueBg).toBeDefined();
        expect(boss.dialogueBorder).toBeDefined();
        expect(boss.bossNameColor).toBeDefined();
        expect(boss.hpSegmentColors).toHaveLength(3);
        expect(boss.telegraphColor).toBeDefined();
        expect(boss.telegraphProgressColor).toBeDefined();
        expect(boss.playerHealthNormal).toBeDefined();
        expect(boss.playerHealthLow).toBeDefined();
        expect(boss.phaseColors).toBeDefined();
        expect(boss.avatarGlow).toMatch(/^rgba\(/);
        expect(boss.victoryGlow).toMatch(/^rgba\(/);
        expect(boss.arenaEffect).toBeDefined();
      });

      it('has all 3 phase color sets', () => {
        const boss = world.bossFight as BossFightTheme;
        expect(boss.phaseColors.phase1).toBeDefined();
        expect(boss.phaseColors.phase2).toBeDefined();
        expect(boss.phaseColors.enraged).toBeDefined();
      });
    });
  });

  // World-specific arena effects
  it('W1 has chalkboard arena effect', () => {
    expect(WORLD_1_THEME.bossFight!.arenaEffect).toBe('chalkboard');
  });

  it('W2 has honeycomb arena effect', () => {
    expect(WORLD_2_THEME.bossFight!.arenaEffect).toBe('honeycomb');
  });

  it('W3 has crystal-cavern arena effect', () => {
    expect(WORLD_3_THEME.bossFight!.arenaEffect).toBe('crystal-cavern');
  });

  it('W4 has ocean-deck arena effect', () => {
    expect(WORLD_4_THEME.bossFight!.arenaEffect).toBe('ocean-deck');
  });

  it('W5 has gear-factory arena effect', () => {
    expect(WORLD_5_THEME.bossFight!.arenaEffect).toBe('gear-factory');
  });

  // World-specific HUD color identities
  it('W1 Meadows has emerald HUD bg', () => {
    expect(WORLD_1_THEME.hud!.headerBg).toContain('emerald');
  });

  it('W2 Springs has teal HUD bg', () => {
    expect(WORLD_2_THEME.hud!.headerBg).toContain('teal');
  });

  it('W3 Caverns has purple HUD bg', () => {
    expect(WORLD_3_THEME.hud!.headerBg).toContain('purple');
  });

  it('W4 Archipelago has amber HUD bg', () => {
    expect(WORLD_4_THEME.hud!.headerBg).toContain('amber');
  });

  it('W5 Canyon has red HUD bg', () => {
    expect(WORLD_5_THEME.hud!.headerBg).toContain('red');
  });

  // Each world has unique HUD
  it('all 5 worlds have distinct HUD headerBg values', () => {
    const headerBgs = WORLDS_1_5.map((w) => w.hud!.headerBg);
    const unique = new Set(headerBgs);
    expect(unique.size).toBe(5);
  });

  // Each world has unique arena effect
  it('all 5 worlds have distinct arena effects', () => {
    const effects = WORLDS_1_5.map((w) => w.bossFight!.arenaEffect);
    const unique = new Set(effects);
    expect(unique.size).toBe(5);
  });
});
