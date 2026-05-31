import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * "improve the sounds in mp and wire them well": useMultiplayerSounds exposes
 * onPlayerJoined/onPlayerLeft but PageClient wired only onMatchStart/onVictory/
 * onDefeat — roster-change audio (the party-lobby "someone joined" feel) was dead.
 * Wire them to a playersInRoom diff (discrete, low-spam events).
 *
 * Source-contract style (matches PageClient.gameStartConsumed.test).
 */
const source = readFileSync(resolve(__dirname, '../PageClient.tsx'), 'utf8');

describe('PageClient — roster-change sounds', () => {
  it('plays a join sound when the roster grows', () => {
    expect(source).toMatch(/mpSounds\.onPlayerJoined\(\)/);
  });
  it('plays a leave sound when the roster shrinks', () => {
    expect(source).toMatch(/mpSounds\.onPlayerLeft\(\)/);
  });
  it('drives roster sounds off playersInRoom (not a spammy per-update emit)', () => {
    // The wiring must reference playersInRoom and a remembered previous set so it
    // fires once per change, not on the initial population or focus/presence pings.
    expect(source).toMatch(/playersInRoom/);
    expect(source).toMatch(/prevRosterRef|previousRoster|prevPlayers/);
  });
});
