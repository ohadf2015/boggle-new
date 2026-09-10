import { educationCourseJsonLd } from '@/lib/seo/educationStructuredData';

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/english-games-elementary';

type Node = Record<string, unknown> & { '@type': string };

export function elementaryExtraJsonLd(locale: string, name: string, description: string): Node[] {
  return [
    educationCourseJsonLd({
      name,
      description,
      url: `${BASE_URL}/${locale}${PAGE_PATH}`,
      locale,
    }) as Node,
  ];
}
