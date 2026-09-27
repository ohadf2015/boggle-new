import { describe, it, expect } from 'vitest';
import { hpSegments, heartStates, enemyArt, statusFor, projectileArt, ruleKey, moveKey, fxSounds } from '../combatView';

describe('combatView — HP', () => {
  it('given enemy HP, when split into segments, then each segment is a 0..1 fill, full ones first', () => {
    expect(hpSegments(50, 100, 4)).toEqual([1, 1, 0, 0]);
    expect(hpSegments(60, 100, 4)).toEqual([1, 1, 0.4, 0]);
    expect(hpSegments(0, 100, 3)).toEqual([0, 0, 0]);
    expect(hpSegments(100, 0, 2)).toEqual([0, 0]);
  });

  it('given player hp, when drawn as hearts, then hearts are full up to hp and empty after', () => {
    expect(heartStates(3, 5)).toEqual(['full', 'full', 'full', 'empty', 'empty']);
    expect(heartStates(0, 2)).toEqual(['empty', 'empty']);
    expect(heartStates(9, 2)).toEqual(['full', 'full']);
  });
});

describe('combatView — art', () => {
  it('given a boss, when a state is asked, then the boss sheet for that state is used', () => {
    expect(enemyArt(1, true, 'enraged')).toMatch(/boss-ms-grammar-enraged\.png$/);
    expect(enemyArt(1, true, 'idle')).toMatch(/boss-ms-grammar\.png$/);
  });

  it('given an elite, when enraged/defeated are asked, then it falls back to its three frames', () => {
    expect(enemyArt(3, false, 'attack')).toBe('/images/adventure/enemies/w3-attack.webp');
    expect(enemyArt(3, false, 'enraged')).toBe('/images/adventure/enemies/w3-idle.webp');
    expect(enemyArt(3, false, 'defeated')).toBe('/images/adventure/enemies/w3-hurt.webp');
  });

  it('given a world, when a projectile is drawn, then freeze worlds throw ice and the rest fire', () => {
    expect(projectileArt(6)).toMatch(/ice-shard/);
    expect(projectileArt(2)).toMatch(/fireball/);
  });
});

describe('combatView — words on screen', () => {
  it('given fx from one step, when a banner is picked, then the most important one wins', () => {
    expect(statusFor(['damage', 'interrupt', 'shield'])).toBe('interrupt');
    expect(statusFor(['hit', 'death'])).toBe('death');
    expect(statusFor(['telegraph'])).toBeNull();
    expect(statusFor(['freeze'])).toBe('freeze');
    expect(statusFor(['blocked'])).toBe('blocked');
  });

  it('given a fight, when the rule and move names are keyed, then keys are stable i18n paths', () => {
    expect(ruleKey(4, true)).toBe('adventurePlay.combat.rule.w4');
    expect(ruleKey(4, false)).toBe('adventurePlay.combat.eliteRule.shuffle');
    expect(moveKey('hit-heavy')).toBe('adventurePlay.combat.move.hit-heavy');
  });

  it('given fx, when sounds are picked, then each distinct cue plays once', () => {
    expect(fxSounds(['hit', 'damage'])).toEqual(['playComboBreakSound']);
    expect(fxSounds(['defeated', 'damage'])).toEqual(['playBossDefeatSound']);
    expect(fxSounds(['thaw'])).toEqual([]);
  });
});
