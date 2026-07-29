import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { loadTranslation } from '@/translations/loadTranslation';
import {
  buildTeacherProProductJsonLd,
  buildTeacherUpgradeFaqJsonLd,
} from '@/lib/seo/teacherUpgradeJsonLd';
import UpgradePricingPageClient from './PageClient';

export const dynamic = 'force-dynamic';

const SUPPORTED_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'teacherUpgrade', path: '/teacher/upgrade', locale });
}

// Server component wrapper: emits Product + Offer ($9/month) and FAQPage
// JSON-LD for the pricing page — the site's only revenue surface previously
// had zero structured data. FAQ items come from the SAME translation keys the
// client renders, so structured data always matches visible content.
export default async function UpgradePricingPage({ params }: { params: Promise<{ locale: string }> }) {
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

  // Safe: schemas built from static translation bundles + locale enum, not
  // user input. Same pattern as app/[locale]/education/page.tsx.
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
