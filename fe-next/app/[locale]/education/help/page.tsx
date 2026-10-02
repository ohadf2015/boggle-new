import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { HelpHome } from '@/components/education/help/HelpHome';
import { isHelpLocale } from '@/components/education/help/helpTypes';
import { HELP_PATH } from '@/components/education/help/helpRegistry';
import { getHelpContent } from '@/components/education/help/content';
import { helpT } from '@/components/education/help/helpI18n';
import {
  buildHelpMetadata,
  helpBreadcrumbJsonLd,
  helpFaqJsonLd,
} from '@/components/education/help/helpSeo';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = helpT(locale);
  return buildHelpMetadata({
    locale,
    path: HELP_PATH,
    title: t('eg2Help.meta.homeTitle'),
    description: t('eg2Help.meta.homeDescription'),
  });
}

export default async function HelpHomePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isHelpLocale(locale)) notFound();
  const t = helpT(locale);
  return (
    <>
      <JsonLd data={helpFaqJsonLd({ locale, quick: getHelpContent(locale).quick })} />
      <JsonLd
        data={helpBreadcrumbJsonLd({ locale, trail: [{ name: t('eg2Help.article.breadcrumb'), path: HELP_PATH }] })}
      />
      <HelpHome locale={locale} />
    </>
  );
}
