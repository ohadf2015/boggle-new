import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { loadTranslation } from '@/translations/loadTranslation';
import {
  buildTeacherProProductJsonLd,
  buildTeacherUpgradeFaqJsonLd,
} from '@/lib/seo/teacherUpgradeJsonLd';
import UpgradePricingPageClient from '../teacher/upgrade/PageClient';

export const dynamic = 'force-dynamic';

const SUPPORTED_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'teacherUpgrade', path: '/pricing', locale });
}

/**
 * Public Teacher Pro pricing URL. /en/pricing used to 404, so anyone hunting
 * a price never reached checkout. Same Polar checkout client as /teacher/upgrade
 * — do not invent a processor. JSON-LD still identifies the product at
 * /teacher/upgrade (canonical offer URL).
 */
export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale: SupportedLocale = (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? (locale as SupportedLocale)
    : 'en';
  const t = (await loadTranslation(validLocale)) as Record<string, any>;
  const sub = (t?.teacher?.subscription ?? {}) as Record<string, string>;
  const seo = (t?.seo?.teacherUpgrade ?? {}) as Record<string, string>;

  const faq = ['faqCancel', 'faqAutoRenew', 'faqDataLoss']
    .map((key) => ({ question: sub[key], answer: sub[`${key}Answer`] }))
    .filter((item): item is { question: string; answer: string } =>
      Boolean(item.question && item.answer),
    );

  const productSchema = buildTeacherProProductJsonLd(validLocale, {
    name: sub.proPlanName || 'Teacher Pro',
    description:
      seo.description ||
      'Upgrade to Teacher Pro for unlimited classrooms and unlimited students per class. $9/month.',
  });
  const faqSchema = buildTeacherUpgradeFaqJsonLd(validLocale, faq);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <UpgradePricingPageClient />
    </>
  );
}
