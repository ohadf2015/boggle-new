import { describe, it, expect } from 'vitest';
import { cleanChatProfanity, isChatProfane } from '../chatProfanity';

describe('chat profanity filter', () => {
  it.each([
    ['en', 'you are a fuck!'],
    ['en stretched', 'fuuuuck'],
    ['he', 'יא זונה'],
    ['he prefix', 'וזונה'],
    ['es', 'eres un pendejo'],
    ['sv', 'din jävla'],
    ['ru exact', 'сука'],
    ['ru root', 'пиздец'],
    ['ja', 'お前死ね'],
  ])('flags %s', (_lang, text) => {
    expect(isChatProfane(text)).toBe(true);
  });

  it.each([
    ['en', 'good game, rematch?'],
    ['he', 'משחק טוב! עוד סיבוב?'],
    ['he word containing a slur letters', 'כוסות'],
    ['es', 'buen juego amigo'],
    ['sv', 'bra spelat, en gång till?'],
    ['ru inner bla', 'они употребляют слова'],
    ['ru worse', 'хуже не бывает'],
    ['ja promise', 'やくそくだよ'],
    ['ja', 'いいゲーム！'],
  ])('leaves clean %s alone', (_lang, text) => {
    expect(isChatProfane(text)).toBe(false);
    expect(cleanChatProfanity(text)).toBe(text);
  });

  it('stars out only the bad token and keeps spacing', () => {
    expect(cleanChatProfanity('hey  pendejo, gg')).toBe('hey  *******, gg');
  });

  it('stars out Japanese substrings', () => {
    expect(cleanChatProfanity('お前死ね')).toBe('お前**');
  });
});
