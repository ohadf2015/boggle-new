
const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/spelling-bee-practice';

type Node = Record<string, unknown> & { '@type': string };

/**
 * JSON-LD this page emitted before it moved onto the shared landing template.
 * Carried over verbatim so the migration does not drop rich-result eligibility.
 */
export function spellingBeeExtraJsonLd(locale: string): Node[] {
  // Hardcoded English steps — EN build only.
  if (locale !== 'en') return [];
  return [{
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${BASE_URL}/${locale}${PAGE_PATH}#howto`,
    name: 'How to Practice for a Spelling Bee with LexiClash',
    description: 'Four-step routine for spelling-bee preparation using free word games.',
    totalTime: 'PT15M',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Warm up with Word Hunt', text: 'Play one 90-second Word Hunt round to warm up letter-scanning reflexes.' },
      { '@type': 'HowToStep', position: 2, name: 'Drill with Word Wheel', text: 'Play one Word Wheel round focused on long-word formation. Aim for at least one 7-letter word.' },
      { '@type': 'HowToStep', position: 3, name: '1v1 duel with a peer', text: 'Pair with another competitor and run a 2-3 minute Vocabulary Duel on a custom word list from your grade-level study guide.' },
      { '@type': 'HowToStep', position: 4, name: 'Review missed words', text: 'After each session, review the missed-word list. Add tough words to your custom drill list for tomorrow.' },
    ],
  } as Node];
}
