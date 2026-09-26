/**
 * With ENTRY_HIDES_GLOBAL_CHROME the global header never shows on
 * /multiplayer, but AutoHideHeader leaves its CLS flow spacer (a 60–124px band)
 * whenever `isInGame` flipped without a user tap (a cold load). The entry marks
 * the document for the whole MP session so the spacer stays hidden in EVERY MP
 * phase (countdown overlays, TV views…), not only under an MpScreen; leaving
 * /multiplayer clears it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { markMpChromeSession, syncMpChromeSession, MP_SESSION_ATTR } from '../mpChromeSession';

const root = () => document.documentElement;

describe('mpChromeSession', () => {
  beforeEach(() => root().removeAttribute(MP_SESSION_ATTR));

  it('marks the document when the MP entry mounts', () => {
    markMpChromeSession();
    expect(root().hasAttribute(MP_SESSION_ATTR)).toBe(true);
  });

  it('stays marked across MP routes (language switch, room params)', () => {
    markMpChromeSession();
    syncMpChromeSession('/he/multiplayer');
    syncMpChromeSession('/en/multiplayer?room=ABC123');
    expect(root().hasAttribute(MP_SESSION_ATTR)).toBe(true);
  });

  it('clears when the player leaves multiplayer', () => {
    markMpChromeSession();
    syncMpChromeSession('/en/daily');
    expect(root().hasAttribute(MP_SESSION_ATTR)).toBe(false);
  });
});
