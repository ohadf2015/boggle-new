import { describe, it, expect } from 'vitest';
import { nextHarderPresetId, buildNextGameOptions } from '../nextGame';

describe('nextHarderPresetId — the bots ladder', () => {
  it('escalates EASY → competitive, MEDIUM → battle, and caps at battle', () => {
    expect(nextHarderPresetId('EASY')).toBe('competitive');
    expect(nextHarderPresetId('MEDIUM')).toBe('battle');
    expect(nextHarderPresetId('HARD')).toBe('battle');
  });
});

describe('buildNextGameOptions — a way to choose the next game inside single player', () => {
  it('Given a solo-bots win on EASY, When built, Then rematch-harder leads and links point at practice + daily', () => {
    const opts = buildNextGameOptions({ mode: 'solo-bots', difficulty: 'EASY', isWinner: true, language: 'he' });
    expect(opts.map((o) => o.id)).toEqual(['rematch-harder', 'rematch-same', 'practice', 'daily']);
    const harder = opts[0];
    expect(harder).toMatchObject({ kind: 'action', presetId: 'competitive' });
    expect(opts.find((o) => o.id === 'practice')).toMatchObject({ kind: 'link', href: '/he/singleplayer?autoStart=practice' });
    expect(opts.find((o) => o.id === 'daily')).toMatchObject({ kind: 'link', href: '/he/daily' });
  });

  it('Given a solo-bots loss, When built, Then "same again" leads (revenge first) and harder still exists', () => {
    const opts = buildNextGameOptions({ mode: 'solo-bots', difficulty: 'EASY', isWinner: false, language: 'en' });
    expect(opts[0].id).toBe('rematch-same');
    expect(opts.some((o) => o.id === 'rematch-harder')).toBe(true);
  });

  it('Given HARD already, When built, Then the harder option is labelled as the max ladder rung', () => {
    const opts = buildNextGameOptions({ mode: 'solo-bots', difficulty: 'HARD', isWinner: true, language: 'en' });
    const harder = opts.find((o) => o.id === 'rematch-harder');
    expect(harder).toMatchObject({ labelKey: 'singlePlayer.nextGame.rematchMax', presetId: 'battle' });
  });

  it('Given practice or challenge mode, When built, Then the bots ladder is offered as "fight bots" instead of rematch', () => {
    const opts = buildNextGameOptions({ mode: 'practice', difficulty: 'EASY', isWinner: true, language: 'en' });
    expect(opts.map((o) => o.id)).toEqual(['rematch-same', 'bots', 'daily']);
    expect(opts.find((o) => o.id === 'bots')).toMatchObject({ kind: 'action', presetId: 'friendly' });
  });
});
