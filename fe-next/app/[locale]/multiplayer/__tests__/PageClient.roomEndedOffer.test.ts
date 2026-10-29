import { describe, it, expect } from 'vitest';
import { readMpPageSource } from './mpPageSource';

/**
 * Wiring for the dead-room recovery. The decision and the toast are unit-tested
 * (`lib/multiplayer/__tests__/roomEndedRecovery.test.ts`,
 * `useMpRoomSocket.roomEndedRecovery.test.tsx`, `useRoomEndedOffer.test.tsx`);
 * the page is a provider-wrapped shell, so this pins that the socket's offer
 * reaches the entry screen, the same way the other PageClient.* contracts do.
 */
const source = readMpPageSource();

describe('PageClient — a dead arcade room reaches the entry as a Quick Play offer', () => {
  it('hands the room socket a recovery callback', () => {
    const call = source.match(/useMpRoomSocket\(\{[\s\S]*?\n {2}\}\);/);
    expect(call, 'useMpRoomSocket call not found').toBeTruthy();
    expect(call![0]).toMatch(/offerQuickPlayRecovery/);
  });

  it('passes the offer and its shown-callback to the entry screen', () => {
    const entry = source.match(/entry: \{[\s\S]*?\n {4}\},/);
    expect(entry, 'entry props not found').toBeTruthy();
    expect(entry![0]).toMatch(/roomEndedOffer/);
    expect(entry![0]).toMatch(/onRoomEndedOfferShown/);
  });

  it('drops a pending offer once the player is seated', () => {
    expect(source).toMatch(/if \(isActive\) setRoomEndedOffer\(null\)/);
  });
});
