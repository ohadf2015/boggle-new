import { describe, expect, it } from 'vitest';
import { readHostViewSource } from './hostViewSource';

const source = readHostViewSource();

describe('HostView — classroom exit wiring', () => {
  it('Given a classroom lobby with no students, When the host presses exit, Then both lobbies leave without the confirm', () => {
    expect(source).toMatch(/const lobbyExit = isClassroomMode && countClassStudents\(players\.playersReady, username\) === 0\s*\?\s*actions\.confirmExitRoom\s*:\s*actions\.handleExitRoom/);
    expect(source.match(/onExitRoom=\{lobbyExit\}/g)).toHaveLength(2);
  });

  it('Given no round has started, When the exit confirm opens, Then it gets the lobby phase', () => {
    expect(source).toMatch(/const inLobby = !runtime\.gameStarted && !hasActiveGameData && !tournament\.finalScores/);
    expect(source).toMatch(/<ExitConfirmDialog[\s\S]*?phase=\{inLobby \? 'lobby' : 'game'\}[\s\S]*?\/>/);
  });

  it('Given a round or results are on screen, When the host presses exit, Then the confirm still opens', () => {
    expect(source.match(/onExitRoom=\{isClassroomMode \? actions\.handleExitRoom : undefined\}/g)).toHaveLength(2);
  });
});
