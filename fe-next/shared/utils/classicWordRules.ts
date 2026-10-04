/**
 * Classic grid rules that must agree across the live round, bots, and results.
 * Japanese keeps 2-letter words. Every other language's classic floor is 3.
 * Do not zero BASE_SCORES[2]: other modes still pay 5 for a real 2-letter word.
 */
export function classicMinWordLength(language: string | null | undefined): number {
  return language === 'ja' ? 2 : 3;
}
