import type { Metadata } from 'next';
import GlossaryPageClient from './PageClient';
import { contentByLocale } from './content';
import { GuidesCalloutLink } from '@/components/seo/GuidesCalloutLink';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SITE_URL = 'https://www.lexiclash.live';

const metaTitles: Record<string, string> = {
  en: 'LexiClash Glossary: Game Terms A-Z | LexiClash',
  he: 'מילון מונחים של לקסיקלאש: מונחי משחק א-ת | לקסיקלאש',
  sv: 'LexiClash Ordlista: Speltermer A-O | LexiClash',
  ja: 'LexiClash 用語集：ゲーム用語 A-Z | LexiClash',
  es: 'Glosario de LexiClash: Terminos del Juego A-Z | LexiClash',
};

const metaDescriptions: Record<string, string> = {
  en: 'Complete glossary of LexiClash game terms. Learn about combos, tile effects, game modes, scoring mechanics, and more. 30+ terms explained.',
  he: 'מילון מונחים מלא של לקסיקלאש. למדו על קומבו, אפקטי אריחים, מצבי משחק, מכניקות ניקוד ועוד.',
  sv: 'Komplett ordlista for LexiClash-speltermer. Lar dig om kombos, platteffekter, spellage och mer.',
  ja: 'LexiClashゲーム用語の完全な用語集。コンボ、タイルエフェクト、ゲームモード、スコアリングメカニクスなど。',
  es: 'Glosario completo de terminos del juego LexiClash. Aprende sobre combos, efectos de fichas, modos de juego y mas.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return {
    title, description,
    openGraph: { type: 'website', title, description, url: `${SITE_URL}/${locale}/glossary`, siteName: 'LexiClash' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `${SITE_URL}/${locale}/glossary`,
      languages: {
        'x-default': `${SITE_URL}/en/glossary`, he: `${SITE_URL}/he/glossary`,
        en: `${SITE_URL}/en/glossary`, sv: `${SITE_URL}/sv/glossary`,
        ja: `${SITE_URL}/ja/glossary`, es: `${SITE_URL}/es/glossary`,
        'en-IL': `${SITE_URL}/en/glossary`, 'he-IL': `${SITE_URL}/he/glossary`,
        'en-US': `${SITE_URL}/en/glossary`, 'es-US': `${SITE_URL}/es/glossary`,
        'en-GB': `${SITE_URL}/en/glossary`, 'en-SE': `${SITE_URL}/en/glossary`,
        'sv-SE': `${SITE_URL}/sv/glossary`, 'en-JP': `${SITE_URL}/en/glossary`,
        'ja-JP': `${SITE_URL}/ja/glossary`, 'en-ES': `${SITE_URL}/en/glossary`,
        'es-ES': `${SITE_URL}/es/glossary`, 'en-MX': `${SITE_URL}/en/glossary`,
        'es-MX': `${SITE_URL}/es/glossary`, 'en-AU': `${SITE_URL}/en/glossary`,
        'es-AR': `${SITE_URL}/es/glossary`, 'es-CO': `${SITE_URL}/es/glossary`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function GlossaryPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;

  const definedTermSetSchema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: content.title,
    description: content.subtitle,
    url: `${SITE_URL}/${locale}/glossary`,
    inLanguage: locale,
    hasDefinedTerm: content.terms.map(t => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.definition,
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Glossary', item: `${SITE_URL}/${locale}/glossary` },
    ],
  };

  // Safe: all JSON-LD content sourced from static constants in content.ts, not user input
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSetSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <GlossaryPageClient />
      <GuidesCalloutLink locale={locale} />

      {/* Server-rendered glossary terms for crawlers — visually hidden, not aria-hidden */}
      <section className="sr-only">
        <h1>{content.title}</h1>
        <p>{content.subtitle}</p>
        <dl>
          {content.terms.map(term => (
            <div key={term.term}>
              <dt>{term.term}</dt>
              <dd>{term.definition}</dd>
              {term.related && term.related.length > 0 && (
                <dd>Related: {term.related.join(', ')}</dd>
              )}
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
