import { educationCourseJsonLd } from '@/lib/seo/educationStructuredData';

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/esl-word-games';

type Node = Record<string, unknown> & { '@type': string };

/**
 * JSON-LD this page emitted before it moved onto the shared landing template.
 * Carried over verbatim so the migration does not drop rich-result eligibility.
 */
export function eslExtraJsonLd(locale: string, name: string, description: string): Node[] {
  return [
    educationCourseJsonLd({
      name,
      description,
      url: `${BASE_URL}/${locale}${PAGE_PATH}`,
      locale,
    }) as Node,
  ];
}
