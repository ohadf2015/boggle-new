import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { HelpArticleView } from '@/components/education/help/HelpArticleView';
import { HELP_LOCALES, isHelpLocale } from '@/components/education/help/helpTypes';
import { HELP_PATH, HELP_SLUGS, getHelpArticleMeta } from '@/components/education/help/helpRegistry';
import { getHelpContent } from '@/components/education/help/content';
import { helpT } from '@/components/education/help/helpI18n';
import { helpPlainText } from '@/components/education/help/helpText';
import {
  buildHelpMetadata,
  helpArticleJsonLd,
  helpBreadcrumbJsonLd,
  helpHowToJsonLd,
  helpLabel,
} from '@/components/education/help/helpSeo';

export const revalidate = 86400;
export const dynamicParams = false;

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  return HELP_LOCALES.flatMap((locale) => HELP_SLUGS.map((slug) => ({ locale, slug })));
}

function load(locale: string, slug: string) {
  const meta = getHelpArticleMeta(slug);
  if (!meta || !isHelpLocale(locale)) return null;
  return { meta, article: getHelpContent(locale).articles[slug] };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const found = load(locale, slug);
  if (!found) return {};
  const t = helpT(locale);
  return buildHelpMetadata({
    locale,
    path: `${HELP_PATH}/${slug}`,
    title: `${found.article.title} | ${t('eg2Help.meta.articleSuffix')}`,
    description: helpPlainText(found.article.summary, helpLabel(locale)),
  });
}

export default async function HelpArticlePage({ params }: PageProps) {
  const { locale, slug } = await params;
  const found = load(locale, slug);
  if (!found) notFound();
  const { meta, article } = found;
  const t = helpT(locale);
  return (
    <>
      <JsonLd data={helpArticleJsonLd({ locale, slug, article })} />
      {meta.howTo ? <JsonLd data={helpHowToJsonLd({ locale, slug, article, minutes: meta.minutes })} /> : null}
      <JsonLd
        data={helpBreadcrumbJsonLd({
          locale,
          trail: [
            { name: t('eg2Help.article.breadcrumb'), path: HELP_PATH },
            { name: article.title, path: `${HELP_PATH}/${slug}` },
          ],
        })}
      />
      <HelpArticleView locale={locale} meta={meta} article={article} />
    </>
  );
}
