import { describe, it, expect } from 'vitest';
import { getRandomDefaultNameWithAvatar } from '../defaultNames';

describe('getRandomDefaultNameWithAvatar', () => {
  it('returns Hebrew name when language=he', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 50; i++) samples.add(getRandomDefaultNameWithAvatar('he').name);
    const joined = Array.from(samples).join(' ');
    expect(joined).toMatch(/[֐-׿]/);
  });

  it('returns Spanish name when language=es (was falling back to English)', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 50; i++) samples.add(getRandomDefaultNameWithAvatar('es').name);
    expect(samples.size).toBeGreaterThan(2);
    const joined = Array.from(samples).join(' ');
    // Spanish pool has accented chars or distinctive ES words.
    expect(joined).toMatch(/[áéíóúñü¡¿]|Astuta|Pingüino|Llama|Banana|Pepinillo/i);
  });

  it('returns Japanese name when language=ja', () => {
    for (let i = 0; i < 30; i++) {
      const { name } = getRandomDefaultNameWithAvatar('ja');
      expect(name).toMatch(/[぀-ヿ一-鿿]/);
    }
  });

  it('returns Swedish name when language=sv', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 50; i++) samples.add(getRandomDefaultNameWithAvatar('sv').name);
    expect(samples.size).toBeGreaterThan(2);
  });

  it('falls back to English for unknown language', () => {
    const { name } = getRandomDefaultNameWithAvatar('xx');
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('attaches an avatar with emoji + color + avatarImage', () => {
    const { avatar } = getRandomDefaultNameWithAvatar('en');
    expect(avatar).toEqual(
      expect.objectContaining({
        emoji: expect.any(String),
        color: expect.any(String),
        avatarImage: expect.any(String),
      }),
    );
  });
});
