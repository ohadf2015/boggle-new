import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { extractFaqFromSections } from '@/utils/seo/parseFaqProse';
import JuegosPalabrasGratisPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'juegos-palabras-gratis';
const DATE_PUBLISHED = '2026-05-11';
const DATE_MODIFIED = '2026-05-11';

const metaTitles: Record<string, string> = {
  es: 'Juegos de Palabras Gratis 2026: Cómo Detectar las Trampas en 30 Segundos',
};

const metaDescriptions: Record<string, string> = {
  es: 'Cinco señales de alerta para detectar juegos de palabras "gratis" que en realidad son trampas de pago. Guía honesta para hispanohablantes: acentos, eñe, multijugador real.',
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

export default async function JuegosPalabrasGratisPage({ params }: PageProps) {
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
        keywords="juego de palabras gratis, juegos de palabras gratis, juego de palabras online gratis, juegos de palabras sin descargar, juegos de palabras en español gratis, mejor juego de palabras gratis, palabras gratis sin pagar"
        articleSection="Guía"
      />
      <JuegosPalabrasGratisPageClient />
    </>
  );
}
