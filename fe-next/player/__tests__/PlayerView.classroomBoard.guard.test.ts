import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readClassroomLiveFlags } from '@/lib/education/classroomLivePath';

// The board skin rides on PlayerView's isClassroomMode, which the page derives from the URL on
// every mount: a fresh join and a reconnect land on the same address, so both get the same skin.
describe('PlayerView hands the classroom flag to the round', () => {
  it('passes isClassroomMode into PlayerInGameView as its classroom skin flag', () => {
    const src = readFileSync(resolve(__dirname, '..', 'PlayerView.tsx'), 'utf8');
    const inGame = src.slice(src.indexOf('<PlayerInGameView'), src.indexOf('/>', src.indexOf('<PlayerInGameView')));
    expect(inGame).toContain('classroom={isClassroomMode}');
  });

  it.each([
    ['/en/education/live', 'room=ABC123'],
    ['/en/multiplayer', 'classroom=true&room=ABC123'],
  ])('reads %s as a classroom room the same way on a fresh join and a reconnect', (path, query) => {
    const params = new URLSearchParams(query ?? '');
    expect(readClassroomLiveFlags(path, params).isClassroomMode).toBe(true);
  });
});
