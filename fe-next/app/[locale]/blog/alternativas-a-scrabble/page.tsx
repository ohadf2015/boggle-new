import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { extractFaqFromSections } from '@/utils/seo/parseFaqProse';
import AlternativasAScrabblePageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'alternativas-a-scrabble';
const DATE_PUBLISHED = '2026-05-11';
const DATE_MODIFIED = '2026-05-11';

const metaTitles: Record<string, string> = {
  es: 'Alternativas a Scrabble: 4 Juegos de Palabras que Realmente Valen la Pena (2026)',
};

const metaDescriptions: Record<string, string> = {
  es: 'Cuatro alternativas modernas al clásico juego de letras en tablero: velocidad pura, caza objetivo, duelos online y agrupación tipo Connections. Para cada momento, una elección.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.es;
  const description = metaDescriptions[locale] || metaDescriptions.es;

  return generateBlogMetadata({
    slug: SLUG,
    locale,
    title,
    description,
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    hasTranslation: locale === 'es',
  });
}

export default async function AlternativasAScrabblePage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.es;

  const siteUrl = 'https://www.lexiclash.live';
  const faqItems = extractFaqFromSections(content.sections);
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Inicio', url: `${siteUrl}/${locale}` },
        { name: 'Blog', url: `${siteUrl}/${locale}/blog` },
        { name: content.title, url: `${siteUrl}/${locale}/blog/${SLUG}` },
      ]} />
      <BlogPostingJsonLd
        title={content.title}
        description={metaDescriptions[locale] || metaDescriptions.es}
        slug={SLUG}
        locale={locale}
        datePublished={DATE_PUBLISHED}
        dateModified={DATE_MODIFIED}
        faqItems={faqItems}
        keywords="alternativas a scrabble, alternativa scrabble, juegos de palabras, juego de palabras online, juegos como scrabble, juegos de letras, juegos de palabras gratis, multijugador de palabras, juegos de palabras en español"
        articleSection="Comparativa"
      />
      <AlternativasAScrabblePageClient />
    </>
  );
}
