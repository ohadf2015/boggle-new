import { describe, it, expect } from 'vitest';
import { lobbyRoster } from '../lobbyPresence';

describe('lobbyRoster practice seat', () => {
  it('Given the teacher\'s practice seat in the room, When the projector roster is built, Then the seat keeps its practice flag', () => {
    const roster = lobbyRoster([{ username: 'Host', isHost: true }, { username: 'Ms Lee', isPractice: true }], {}, 0, 'Host');
    expect(roster).toEqual([expect.objectContaining({ username: 'Ms Lee', isPractice: true })]);
  });
});
