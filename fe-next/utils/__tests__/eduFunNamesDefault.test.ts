import { describe, it, expect } from 'vitest';
import { isDefaultPlayerName, isGeneratedName } from '../defaultPlayerNames';

describe('edu join fun names are generated names', () => {
  it('Given a fun name, Then a returning student can still keep it (it is not a default name)', () => {
    expect(isDefaultPlayerName('Disco Llama')).toBe(false);
  });

  it.each(['Disco Llama', 'לאמה בדיסקו', 'Disco-Lama', 'ディスコアルパカ', 'Llama Disco', 'Диско-Лама'])(
    'Given the join screen suggested %s, Then it is not a chosen name',
    (name) => expect(isGeneratedName(name)).toBe(true),
  );

  it('Given a name a player typed, Then it is still a chosen name', () => {
    expect(isGeneratedName('Hot Potato')).toBe(false);
  });
});

describe('handles built from a generated name', () => {
  it.each(['disco_llama-8erqwm', 'Disco-Llama_x7k2p9', 'sneaky_potato-ab12cd'])(
    'Given the username %s made from a generated name, Then it is generated too',
    (name) => expect(isGeneratedName(name)).toBe(true),
  );

  it.each(['tali_w', 'hot_potato', 'Yoyev boyev'])('Given a handle a player typed (%s), Then it stays a chosen name', (name) => {
    expect(isGeneratedName(name)).toBe(false);
  });
});
