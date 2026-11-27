import { describe, expect, it } from 'vitest';
import { splitLead } from '../splitLead';

describe('splitLead', () => {
  it('keeps every character across lead and rest', () => {
    const text = 'גלגל מילים חדש כל יום. מצאו מילים. חינם, ללא הורדה.';
    const [lead, rest] = splitLead(text);
    expect(lead).toBe('גלגל מילים חדש כל יום.');
    expect(`${lead} ${rest}`).toBe(text);
  });

  it('splits on the Japanese full stop', () => {
    expect(splitLead('毎日新しい。無料です。')).toEqual(['毎日新しい。', '無料です。']);
  });

  it('does not split inside a domain name', () => {
    expect(splitLead('Kahoot and Vocabulary.com are tools. More here.')).toEqual([
      'Kahoot and Vocabulary.com are tools.',
      'More here.',
    ]);
  });

  it('returns the whole text when there is one sentence', () => {
    expect(splitLead('One sentence only')).toEqual(['One sentence only', '']);
  });
});
