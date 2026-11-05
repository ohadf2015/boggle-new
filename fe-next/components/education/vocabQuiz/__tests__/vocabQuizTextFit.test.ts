import { describe, it, expect } from 'vitest';
import { promptSizeClass, choiceSetSizeClass } from '../vocabQuizTextFit';

describe('vocabQuizTextFit', () => {
  it('Given a single word prompt, Then it is hero sized', () => {
    expect(promptSizeClass('brittle')).toContain('11vw,4rem');
  });

  it('Given a definition length prompt, Then it steps down so it is never cut off', () => {
    const long = 'a feeling of great happiness and excitement that lasts a long while';
    expect(promptSizeClass(long)).not.toContain('11vw');
    expect(promptSizeClass(long)).not.toBe(promptSizeClass('to leave behind'));
  });

  it('Given four word choices, Then every card gets one 28px phone (eased down on the narrowest phones) / 32px desktop size', () => {
    const cls = choiceSetSizeClass(['fragile', 'enormous', 'quiet', 'ancient']);
    expect(cls).toContain('text-[clamp(1.5rem,7.4vw,1.75rem)]');
    expect(cls).toContain('sm:text-[2rem]');
  });

  it('Given one phrase-length choice, Then the whole set steps down together so no card is smaller than its neighbour', () => {
    const words = choiceSetSizeClass(['fragile', 'enormous', 'quiet', 'ancient']);
    const mixed = choiceSetSizeClass(['fragile', 'hard but easily broken into pieces', 'quiet', 'ancient']);
    expect(mixed).not.toBe(words);
    expect(mixed).not.toContain('clamp(1.5rem,7.4vw,1.75rem)');
  });
});
