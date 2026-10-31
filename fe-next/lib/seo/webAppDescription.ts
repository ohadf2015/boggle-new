import { seoContent } from '@/app/[locale]/(home)/seoContent';

/**
 * Description for the sitewide `#webapp` WebApplication/VideoGame JSON-LD.
 *
 * It used to reuse the meta description (~22 words), which the Growth Radar
 * audit flagged as too thin for AI answers to say who the game is for and how
 * it differs (row 13188). The homepage About copy plus its first FAQ answer is
 * 50+ words in every locale and both are visible on the page, so the
 * structured data matches on-page text.
 */
export function getWebAppDescription(locale: string): string {
  const { description, faq } = seoContent[locale] ?? seoContent.en;
  return `${description} ${faq[0].answer}`;
}
