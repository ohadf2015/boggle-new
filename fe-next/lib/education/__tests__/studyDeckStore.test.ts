import { beforeEach, describe, expect, it } from 'vitest';
import { useStudyDeck } from '../studyDeckStore';

const cards = [{ word: 'sun' }, { word: 'moon' }];

describe('studyDeckStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useStudyDeck.getState().clear();
  });

  it('starts a fresh deck unstudied', () => {
    useStudyDeck.getState().setDeck('ROOM1', cards);
    expect(useStudyDeck.getState()).toMatchObject({ gameCode: 'ROOM1', cards, studied: false });
  });

  it('remembers a finished deck for the same room across a reconnect', () => {
    useStudyDeck.getState().setDeck('ROOM1', cards);
    useStudyDeck.getState().markStudied();
    useStudyDeck.getState().clear();
    useStudyDeck.getState().setDeck('ROOM1', cards);
    expect(useStudyDeck.getState().studied).toBe(true);
  });

  it('does not carry a finished deck into another room', () => {
    useStudyDeck.getState().setDeck('ROOM1', cards);
    useStudyDeck.getState().markStudied();
    useStudyDeck.getState().setDeck('ROOM2', cards);
    expect(useStudyDeck.getState().studied).toBe(false);
  });

  it('clear empties the deck', () => {
    useStudyDeck.getState().setDeck('ROOM1', cards);
    useStudyDeck.getState().clear();
    expect(useStudyDeck.getState()).toMatchObject({ gameCode: null, cards: [], studied: false });
  });
});
