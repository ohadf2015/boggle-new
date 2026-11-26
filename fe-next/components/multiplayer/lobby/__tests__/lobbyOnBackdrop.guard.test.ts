/**
 * The waiting room sits on the lobby's AmbientBackdrop (HostLobbyScreen /
 * PlayerLobbyScreen): its sections carry no panel chrome and no solid navy
 * band covers the backdrop. jsdom cannot see paint, so the source is pinned.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(__dirname, '../../../..', p), 'utf8');
const host = read('host/components/HostPreGameView.tsx');
const guest = read('player/components/PlayerWaitingView.tsx');
const solo = read('host/components/pre-game/SoloPlayPrompt.tsx');

const cardOf = (src: string) => src.split('\n').find((l) => l.startsWith('const CARD ='))!;
const CHROME = /\b(bg-neo-[a-z-]+|border-3|shadow-hard)\b/;

describe('waiting room on the backdrop', () => {
  it.each([['host', host], ['guest', guest]])('%s sections have no panel chrome', (_n, src) => {
    expect(cardOf(src)).toBeDefined();
    expect(cardOf(src)).not.toMatch(CHROME);
  });

  it.each([['host', host], ['guest', guest]])('%s root, header and footers paint no navy band', (_n, src) => {
    for (const line of src.split('\n')) {
      if (/(lobby-(wide|phone)-footer|<header|h-full flex flex-col w-full|flex-1 flex flex-col min-h-0 w-full)/.test(line)) {
        expect(line).not.toMatch(/\bbg-neo-navy\b|border-t-3/);
      }
    }
  });

  it('the solo "no one here yet" note is a line in the SQUAD section, not its own banner', () => {
    expect(solo.split('\n').find((l) => l.includes('data-testid="solo-play-prompt"') || l.includes("cn('flex items-center gap-2 min-w-0"))).not.toMatch(CHROME);
    expect(host).toContain('roster(undefined, statusLane)');
  });

  it('the guest mascot breathes with the idle rig motion', () => {
    expect(guest).toMatch(/neo-mascot-idle">\s*<DJMascot/);
  });
});
