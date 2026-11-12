import { describe, expect, it } from 'vitest';
import { readHostViewSource } from './hostViewSource';

const source = readHostViewSource();

describe('HostView — classroom exit wiring', () => {
  it('Given a classroom lobby whose roster arrived empty, When the host presses exit, Then both lobbies leave without the confirm', () => {
    expect(source).toMatch(/const rosterKnown = useRosterReceived\(socket, gameCode, \(props\.initialPlayers\?\.length \?\? 0\) > 0\)/);
    expect(source).toMatch(/const lobbyExit = classroomLobbyExitSkipsConfirm\(\{ classroom: isClassroomMode, rosterKnown, players: players\.playersReady \}\)\s*\?\s*actions\.confirmExitRoom\s*:\s*actions\.handleExitRoom/);
    expect(source.match(/onExitRoom=\{lobbyExit\}/g)).toHaveLength(2);
  });

  it('Given no round has started, When the exit confirm opens, Then it gets the lobby phase', () => {
    expect(source).toMatch(/const inLobby = !runtime\.gameStarted && !hasActiveGameData && !tournament\.finalScores/);
    expect(source).toMatch(/<ExitConfirmDialog[\s\S]*?phase=\{classroomExitPhase\(\{ inLobby, roundRunning: !!roundRunning \|\| endRound\.status === 'pending' \}\)\}[\s\S]*?\/>/);
  });

  it('Given a round is running, When the classroom exit confirm opens, Then its primary ends the round through endRoundNow', () => {
    expect(source).toMatch(/const roundRunning = \(runtime\.gameStarted \|\| hasActiveGameData\) && !runtime\.waitingForResults && !tournament\.finalScores && !recapShown/);
    expect(source).toMatch(/const endRound = useEndRoundRequest\(\{ socket, roundRunning: !!roundRunning, onEnded: \(\) => state\.setShowExitConfirm\(false\), reconnect: manualReconnect \}\)/);
    expect(source).toMatch(/<ExitConfirmDialog[\s\S]*?endRound=\{endRound\}[\s\S]*?\/>/);
    expect(source).toMatch(/<ExitConfirmDialog[\s\S]*?onConfirm=\{actions\.confirmExitRoom\}[\s\S]*?\/>/);
  });

  it('Given a round or results are on screen, When the host presses exit, Then the confirm still opens', () => {
    expect(source.match(/onExitRoom=\{isClassroomMode \? actions\.handleExitRoom : undefined\}/g)).toHaveLength(2);
  });

  it('Given a classroom whose lesson words are not loaded, Then every Start path, the lobby auto-start included, goes through the guarded start', () => {
    expect(source).toMatch(/const startGame = useCallback\(\(\) => \{\s*if \(blocksStart\) return;\s*actions\.startGame\(\);/);
    expect(source).toMatch(/useLobbyAutoStart\(\{ socket, onFire: startGame \}\)/);
    expect(source).not.toMatch(/onStartGame=\{actions\.startGame\}/);
    expect(source).toMatch(/lessonWordsBlock=\{boardWords\.blocksStart \?/);
  });
});
