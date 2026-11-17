import { describe, expect, it } from 'vitest';
import { EDUCATION_LOCALES, getForSchoolsContent } from '../content';
import { PRO_COPY_PARAMS as P } from '@/lib/education/proFeatures';

// The Teacher Pro trial needs a card since PR 1905. The page must not promise a cardless trial.
const NO_CARD = /no credit card|без кредитной карты|בלי כרטיס אשראי|inget kreditkort|クレジットカード不要|sin tarjeta de crédito/i;

describe('/education/for-schools: the trial copy matches the card-required trial', () => {
  for (const locale of EDUCATION_LOCALES) {
    it(`${locale}: hero and trial FAQ say a card is needed and name the price`, () => {
      const c = getForSchoolsContent(locale);
      expect(c.heroSubtitle).not.toMatch(NO_CARD);
      expect(c.heroSubtitle).toContain(P.price);
      const trialFaq = c.faqs[0].a;
      expect(trialFaq).not.toMatch(NO_CARD);
      expect(trialFaq).toContain(P.price);
      for (const f of c.faqs) expect(f.a).not.toMatch(NO_CARD);
    });
  }
});
