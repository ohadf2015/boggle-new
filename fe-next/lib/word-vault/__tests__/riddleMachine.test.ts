import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { wordRiddleMachine } from '../machines/wordRiddleMachine';
import { cipherRiddleMachine } from '../machines/cipherRiddleMachine';
import { logicRiddleMachine } from '../machines/logicRiddleMachine';

const startActor = (machine: typeof wordRiddleMachine) => {
  const actor = createActor(machine);
  actor.start();
  return actor;
};

describe('riddleMachine — shared transitions', () => {
  it('starts in ready and moves to active on START', () => {
    const a = startActor(wordRiddleMachine);
    expect(a.getSnapshot().value).toBe('ready');
    a.send({ type: 'START' });
    expect(a.getSnapshot().value).toBe('active');
  });

  it('SUBMIT enters validating, then VALIDATE_SUCCESS goes to solved', () => {
    const a = startActor(wordRiddleMachine);
    a.send({ type: 'START' });
    a.send({ type: 'SUBMIT', payload: 'אש' });
    expect(a.getSnapshot().value).toBe('validating');
    a.send({ type: 'VALIDATE_SUCCESS' });
    expect(a.getSnapshot().value).toBe('solved');
  });

  it('VALIDATE_FAIL from validating goes to failed', () => {
    const a = startActor(cipherRiddleMachine);
    a.send({ type: 'START' });
    a.send({ type: 'SUBMIT', payload: 'wrong' });
    a.send({ type: 'VALIDATE_FAIL' });
    expect(a.getSnapshot().value).toBe('failed');
  });

  it('failed → active on RETRY', () => {
    const a = startActor(wordRiddleMachine);
    a.send({ type: 'START' });
    a.send({ type: 'SUBMIT' });
    a.send({ type: 'VALIDATE_FAIL' });
    a.send({ type: 'RETRY' });
    expect(a.getSnapshot().value).toBe('active');
  });

  it('USE_HINT from active enters hint-active', () => {
    const a = startActor(logicRiddleMachine);
    a.send({ type: 'START' });
    a.send({ type: 'USE_HINT' });
    expect(a.getSnapshot().value).toBe('hint-active');
  });

  it('hint-active returns to active on HINT_DISMISS', () => {
    const a = startActor(wordRiddleMachine);
    a.send({ type: 'START' });
    a.send({ type: 'USE_HINT' });
    a.send({ type: 'HINT_DISMISS' });
    expect(a.getSnapshot().value).toBe('active');
  });

  it('ABANDON from active goes to abandoned (final-ish)', () => {
    const a = startActor(cipherRiddleMachine);
    a.send({ type: 'START' });
    a.send({ type: 'ABANDON' });
    expect(a.getSnapshot().value).toBe('abandoned');
  });

  it('solved is final — further events do not regress state', () => {
    const a = startActor(logicRiddleMachine);
    a.send({ type: 'START' });
    a.send({ type: 'SUBMIT' });
    a.send({ type: 'VALIDATE_SUCCESS' });
    a.send({ type: 'RETRY' });
    expect(a.getSnapshot().value).toBe('solved');
  });
});

describe('riddleMachine — context tracks attempts and hints', () => {
  it('increments attemptsMade on each VALIDATE_FAIL', () => {
    const a = startActor(wordRiddleMachine);
    a.send({ type: 'START' });
    a.send({ type: 'SUBMIT' });
    a.send({ type: 'VALIDATE_FAIL' });
    a.send({ type: 'RETRY' });
    a.send({ type: 'SUBMIT' });
    a.send({ type: 'VALIDATE_FAIL' });
    expect(a.getSnapshot().context.attemptsMade).toBe(2);
  });

  it('increments hintsUsed on USE_HINT', () => {
    const a = startActor(cipherRiddleMachine);
    a.send({ type: 'START' });
    a.send({ type: 'USE_HINT' });
    a.send({ type: 'HINT_DISMISS' });
    a.send({ type: 'USE_HINT' });
    expect(a.getSnapshot().context.hintsUsed).toBe(2);
  });
});
