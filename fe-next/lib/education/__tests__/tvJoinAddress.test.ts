import { describe, it, expect } from 'vitest';
import { tvJoinAddress, roomJoinPath } from '../tvJoinAddress';

describe('roomJoinPath', () => {
  it('sends a classroom code through the class join page', () => {
    expect(roomJoinPath('he', 'TZCOQ7', true)).toBe('/he/join/TZCOQ7');
  });

  it('sends a friends room straight to the multiplayer room', () => {
    expect(roomJoinPath('en', 'B3Y98K', false)).toBe('/en/multiplayer?room=B3Y98K');
  });
});

describe('tvJoinAddress', () => {
  it('prints the room address for a friends room', () => {
    expect(tvJoinAddress('https://www.lexiclash.live', 'en', 'B3Y98K', false)).toBe('lexiclash.live/en/multiplayer?room=B3Y98K');
  });

  it('keeps the class join address by default', () => {
    expect(tvJoinAddress('https://www.lexiclash.live', 'en', 'TZCOQ7')).toBe('lexiclash.live/en/join/TZCOQ7');
  });
});
