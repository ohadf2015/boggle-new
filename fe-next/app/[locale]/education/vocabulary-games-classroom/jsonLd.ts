import { educationCourseJsonLd } from '@/lib/seo/educationStructuredData';

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/vocabulary-games-classroom';

type Node = Record<string, unknown> & { '@type': string };

/**
 * JSON-LD this page emitted before it moved onto the shared landing template.
 * Carried over verbatim so the migration does not drop rich-result eligibility.
 */
export function vocabExtraJsonLd(locale: string, name: string, description: string): Node[] {
  const nodes: Node[] = [];
  // Hardcoded English steps, so they are emitted on the EN build only — attaching
  // English instructions to a localized page is the same defect class as the
  // `inLanguage` bug the shared builder fixes.
  if (locale === 'en') {
    nodes.push({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${BASE_URL}/${locale}${PAGE_PATH}#howto`,
    name: 'How to Run a Vocabulary Game in Your Classroom',
    description: 'Three steps to a live classroom vocabulary game — under 60 seconds setup once students have their free accounts.',
    totalTime: 'PT1M',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Pick a word list', text: 'Open the teacher dashboard, choose a curriculum list (yours or one of ours), and pick game mode + time limit.' },
      { '@type': 'HowToStep', position: 2, name: 'Students join', text: 'Students log in with their free LexiClash account on any device. The teacher\'s session appears in their dashboard.' },
      { '@type': 'HowToStep', position: 3, name: 'Play and review', text: 'Students play live for 5–10 minutes. Live leaderboard during play; per-student accuracy + class-wide gaps after.' },
    ],
  } as Node);
  }
  nodes.push(
    educationCourseJsonLd({
      name,
      description,
      url: `${BASE_URL}/${locale}${PAGE_PATH}`,
      locale,
    }) as Node,
  );
  return nodes;
}
