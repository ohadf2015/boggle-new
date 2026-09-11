import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  IDLE_ROUND_STATE,
  reduceRoundSignal,
  isRoundLive,
  shouldShowTeacherStrip,
} from '../teacherStripVisibility';

/**
 * Why this module exists at all.
 *
 * The multiplayer shell used to gate the teacher strip on the Zustand store's
 * `gameActive`. That flag is only ever written on the PLAYER socket path
 * (`usePlayerGameEvents`); the host derives "a round is running" locally inside
 * `HostView` and never writes the store. So for the one person the strip is for
 * — the teacher, who is always the host — the flag was false for the whole
 * round and the strip never mounted. Recurring-pitfall Class 3: two paths that
 * should behave identically, and only the untested one diverges.
 *
 * The replacement reads the server's own round traffic, which both roles get.
 */
describe('teacherStripVisibility', () => {
  describe('round signal', () => {
    it('starts with no round live — the lobby gets no mid-round controls', () => {
      expect(isRoundLive(IDLE_ROUND_STATE)).toBe(false);
    });

    it('goes live on startGame and back down on endGame', () => {
      const started = reduceRoundSignal(IDLE_ROUND_STATE, { type: 'boardStart' });
      expect(isRoundLive(started)).toBe(true);
      expect(isRoundLive(reduceRoundSignal(started, { type: 'boardEnd' }))).toBe(false);
    });

    it('self-heals from a running clock alone, so a host reload mid-round still gets the strip', () => {
      const ticked = reduceRoundSignal(IDLE_ROUND_STATE, { type: 'boardTick', remainingTime: 42 });
      expect(isRoundLive(ticked)).toBe(true);
    });

    it('ignores a zero/absent clock tick — the timer also reports 0 as the round dies', () => {
      expect(isRoundLive(reduceRoundSignal(IDLE_ROUND_STATE, { type: 'boardTick', remainingTime: 0 }))).toBe(false);
      expect(isRoundLive(reduceRoundSignal(IDLE_ROUND_STATE, { type: 'boardTick' }))).toBe(false);
    });

    it('drops the round on resetGame so the next lobby is clean (Class 2)', () => {
      const started = reduceRoundSignal(IDLE_ROUND_STATE, { type: 'boardStart' });
      expect(isRoundLive(reduceRoundSignal(started, { type: 'boardReset' }))).toBe(false);
    });

    it('goes live on a quiz question and reports the round as a quiz', () => {
      const quiz = reduceRoundSignal(IDLE_ROUND_STATE, { type: 'quizQuestion' });
      expect(isRoundLive(quiz)).toBe(true);
      expect(quiz.quizRound).toBe(true);
    });

    it('a quiz snapshot that says the quiz is OVER does not open the strip', () => {
      const snapshot = reduceRoundSignal(IDLE_ROUND_STATE, {
        type: 'quizSnapshot', phase: 'ended', paused: false,
      });
      expect(isRoundLive(snapshot)).toBe(false);
    });

    it('a live quiz snapshot restores the round after a reconnect', () => {
      const snapshot = reduceRoundSignal(IDLE_ROUND_STATE, {
        type: 'quizSnapshot', phase: 'question', paused: false,
      });
      expect(isRoundLive(snapshot)).toBe(true);
      expect(snapshot.quizRound).toBe(true);
    });

    it('keeps the strip up through the between-questions reveal beat', () => {
      const snapshot = reduceRoundSignal(IDLE_ROUND_STATE, {
        type: 'quizSnapshot', phase: 'reveal', paused: false,
      });
      expect(isRoundLive(snapshot)).toBe(true);
    });

    it('closes on vocabQuiz:ended', () => {
      const quiz = reduceRoundSignal(IDLE_ROUND_STATE, { type: 'quizQuestion' });
      expect(isRoundLive(reduceRoundSignal(quiz, { type: 'quizEnded' }))).toBe(false);
    });
  });

  describe('paused state in a quiz round', () => {
    /**
     * The board's pause writes `useTeacherPause` from the `gamePaused` event.
     * A quiz pause broadcasts `vocabQuiz:paused` instead and touches nothing
     * else — so without this the teacher taps Pause, the quiz freezes, and the
     * button still says "Pause": there is no way back to Resume.
     */
    it('tracks the quiz pause broadcast', () => {
      const live = reduceRoundSignal(IDLE_ROUND_STATE, { type: 'quizQuestion' });
      expect(live.quizPaused).toBe(false);
      const paused = reduceRoundSignal(live, { type: 'quizPaused', paused: true });
      expect(paused.quizPaused).toBe(true);
      expect(reduceRoundSignal(paused, { type: 'quizPaused', paused: false }).quizPaused).toBe(false);
    });

    it('restores the paused flag from a reconnect snapshot', () => {
      const snapshot = reduceRoundSignal(IDLE_ROUND_STATE, {
        type: 'quizSnapshot', phase: 'question', paused: true,
      });
      expect(snapshot.quizPaused).toBe(true);
    });

    it('forgets the pause when the quiz ends', () => {
      const paused = reduceRoundSignal(
        reduceRoundSignal(IDLE_ROUND_STATE, { type: 'quizQuestion' }),
        { type: 'quizPaused', paused: true },
      );
      expect(reduceRoundSignal(paused, { type: 'quizEnded' }).quizPaused).toBe(false);
    });
  });

  describe('shouldShowTeacherStrip', () => {
    const live = {
      isActive: true, isHost: true, isClassroomMode: true, showResults: false, roundLive: true,
    };

    it('shows for a classroom host in a live round', () => {
      expect(shouldShowTeacherStrip(live)).toBe(true);
    });

    it('never shows to a student, outside a classroom room, on results, or out of a round', () => {
      expect(shouldShowTeacherStrip({ ...live, isHost: false })).toBe(false);
      expect(shouldShowTeacherStrip({ ...live, isClassroomMode: false })).toBe(false);
      expect(shouldShowTeacherStrip({ ...live, showResults: true })).toBe(false);
      expect(shouldShowTeacherStrip({ ...live, roundLive: false })).toBe(false);
      expect(shouldShowTeacherStrip({ ...live, isActive: false })).toBe(false);
    });
  });

  /**
   * Regression net for the exact failure a blind critic measured: it queried
   * the live DOM mid-round and found seven buttons, all nav chrome — no strip.
   * The cause was one conjunct in this mount expression. If anyone reinstates
   * the store flag as the gate, this fails before it reaches a projector.
   */
  describe('the multiplayer shell mounts it on the round signal, not the store flag', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../../app/[locale]/multiplayer/PageClient.tsx'),
      'utf-8',
    );

    it('gates <TeacherLiveControls> on useTeacherStripState', () => {
      expect(source).toContain('useTeacherStripState');
      const mount = source.slice(0, source.indexOf('<TeacherLiveControls'));
      const gate = mount.slice(mount.lastIndexOf('{'));
      expect(gate).toContain('visible');
      expect(gate).not.toMatch(/\bgameActive\b/);
    });
  });
});
