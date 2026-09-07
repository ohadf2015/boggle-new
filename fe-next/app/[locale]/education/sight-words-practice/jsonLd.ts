import { educationProviderNode } from '@/lib/seo/educationLanding';

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/sight-words-practice';

type Node = Record<string, unknown> & { '@type': string };

/**
 * JSON-LD this page emitted before it moved onto the shared landing template.
 * Carried over verbatim so the migration does not drop rich-result eligibility.
 */
export function sightWordsExtraJsonLd(locale: string): Node[] {
  const nodes: Node[] = [{
    '@context': 'https://schema.org',
    ...educationProviderNode(locale),
    description:
      'Multiplayer vocabulary games for schools — 6 languages including Hebrew RTL, no student logins, 1v1 duels and whole-class play. Free tier for teachers: 3 classes of up to 50 students. Teacher Pro $9/month; school plans from $149/year.',
    audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
    areaServed: ['US', 'IL', 'SE', 'JP', 'ES'],
    offers: [
      // The free tier is a tier, not a trial: lib/education/freeTierLimits.ts enforces
      // 3 classes of 50 students with no expiry. Advertising a 30-day trial in schema
      // understated the free plan and contradicted every other surface.
      { '@type': 'Offer', name: 'Teacher Free', price: 0, priceCurrency: 'USD', category: 'free', description: 'Free tier for individual teachers, with no expiry: 3 classrooms of up to 50 students, custom word lists, live classroom games', availability: 'https://schema.org/InStock' },
      { '@type': 'Offer', name: 'Teacher Pro', price: 9, priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: 9, priceCurrency: 'USD', unitText: 'month' }, category: 'paid', description: 'Unlimited classrooms plus progress analytics and printable reports', availability: 'https://schema.org/InStock' },
      { '@type': 'Offer', name: 'School Plan', price: 149, priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: 149, priceCurrency: 'USD', unitText: 'year' }, category: 'paid', description: 'School plan: admin dashboard, analytics, curriculum libraries, ad-free environment, SSO', availability: 'https://schema.org/InStock' },
    ],
  } as Node];
  // Hardcoded English steps, emitted on the EN build only — the same gate the
  // page applied before the migration.
  if (locale === 'en') {
    nodes.push({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${BASE_URL}/${locale}${PAGE_PATH}#howto`,
    name: 'How to Practice Sight Words with LexiClash',
    description: 'A 10-minute daily routine that turns any Dolch or Fry sight-word list into games.',
    totalTime: 'PT10M',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Load this week\'s list', text: 'Paste 5-15 Dolch or Fry words into a custom word list in the LexiClash teacher dashboard. Bulk import takes under a minute.' },
      { '@type': 'HowToStep', position: 2, name: 'Flashcard warm-up', text: 'Run one 3-minute flashcard round over the list. Students see each word and hear it with the built-in pronunciation.' },
      { '@type': 'HowToStep', position: 3, name: 'Game round', text: 'Play a 5-minute word-matching or spelling-challenge round on the same list, or open the daily Word Hunt grid and race to spot familiar words.' },
      { '@type': 'HowToStep', position: 4, name: 'Make it social', text: 'Pair two students for a 1v1 word duel, or run the list as a whole-class game with a 6-character join code.' },
    ],
  } as Node);
  }
  return nodes;
}
