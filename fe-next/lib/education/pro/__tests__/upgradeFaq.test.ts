import { describe, it, expect } from 'vitest';
import { buildUpgradeFaqEntries, fillParams, UPGRADE_FAQ_KEYS } from '../upgradeFaq';

describe('fillParams', () => {
  it('fills {x} and {{x}} placeholders and leaves unknown ones', () => {
    expect(fillParams('{days} days, {{price}}/mo, {nope}', { days: 14, price: '$9' })).toBe('14 days, $9/mo, {nope}');
  });
});

describe('buildUpgradeFaqEntries — FAQ JSON-LD matches the visible FAQ', () => {
  it('builds one filled entry per visible question, skipping missing copy', () => {
    const dict = {
      eg2Pro: {
        faq: {
          trialQ: 'Trial?', trialA: '{days} days free',
          cancelQ: 'Cancel?', cancelA: 'Yes',
        },
      },
    };
    const entries = buildUpgradeFaqEntries(dict);
    expect(entries).toEqual([
      { question: 'Trial?', answer: '14 days free' },
      { question: 'Cancel?', answer: 'Yes' },
    ]);
    expect(UPGRADE_FAQ_KEYS[0]).toBe('trial');
  });
});
