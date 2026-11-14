import { classroomLobbyRoster, type ClassroomRosterWire } from '../lobbyPresence';

/**
 * The server push names the JOINED class (it survives socket drops); the lobby
 * overlays live connection from the socket roster it already receives. These
 * tests pin that merge — the 2026-11-13 REMAFZ audit was "4 connected vs 21
 * joined" on the teacher's wall.
 */

const wire = (students: ClassroomRosterWire['students'], gameCode = 'REMAFZ'): ClassroomRosterWire => ({ gameCode, students });

describe('classroomLobbyRoster', () => {
  it('keeps joined students listed as reconnecting when their socket drops, instead of dropping them', () => {
    const roster = classroomLobbyRoster(
      [{ username: 'Ada' }],
      wire([
        { username: 'Ada', connected: true },
        { username: 'Ben', connected: false }, // phone dropped mid-lesson
      ]),
      'Teach'
    );
    expect(roster).toEqual([{ username: 'Ada' }, { username: 'Ben', reconnecting: true }]);
  });

  it('reads connection live: a student the wire calls connected but the socket roster shows dropped is reconnecting', () => {
    const roster = classroomLobbyRoster(
      [{ username: 'Ada', disconnected: true }],
      wire([{ username: 'Ada', connected: true }]),
      'Teach'
    );
    expect(roster).toEqual([{ username: 'Ada', reconnecting: true }]);
  });

  it('marks a student connected again once the socket roster shows them back', () => {
    const roster = classroomLobbyRoster(
      [{ username: 'Ada' }, { username: 'Ben', disconnected: true }],
      wire([
        { username: 'Ada', connected: false },
        { username: 'Ben', connected: false },
      ]),
      'Teach'
    );
    expect(roster).toEqual([{ username: 'Ada' }, { username: 'Ben', reconnecting: true }]);
  });

  it('merges socket-only seats (bots, practice seat, a connected seat racing the push) without double-listing', () => {
    const roster = classroomLobbyRoster(
      [
        { username: 'Ada' },
        { username: 'Bot', isBot: true },
        { username: 'Ms Lee', isPractice: true },
        { username: 'NewKid' }, // joined a beat before the next push
      ],
      wire([{ username: 'Ada', connected: true }]),
      'Teach'
    );
    expect(roster).toEqual([
      { username: 'Ada' },
      { username: 'Bot', isBot: true },
      { username: 'Ms Lee', isPractice: true },
      { username: 'NewKid' },
    ]);
  });

  it('a disconnected seat the roster never named was never joined: it stays off the wall', () => {
    const roster = classroomLobbyRoster(
      [{ username: 'Ada' }, { username: 'Ghost', disconnected: true }],
      wire([{ username: 'Ada', connected: true }]),
      'Teach'
    );
    expect(roster).toEqual([{ username: 'Ada' }]);
  });

  it('never lists the host/teacher, even if the wire carries the name', () => {
    const roster = classroomLobbyRoster(
      [{ username: 'Teach', isHost: true }],
      wire([{ username: 'Teach', connected: true }]),
      'Teach'
    );
    expect(roster).toEqual([]);
  });
});
