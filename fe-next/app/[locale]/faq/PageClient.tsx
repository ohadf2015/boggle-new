'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Section } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from "@/components/ads";
import { contentByLocale, type FAQContent } from './content';

export default function FAQPageClient({ children }: { children?: React.ReactNode }): React.ReactElement {
  const params = useParams();
  const locale = params.locale as string;
  const c: FAQContent = contentByLocale[locale] || contentByLocale.en;
  const { t } = useLanguage();

  const categoryOrder = ['gettingStarted', 'gameplay', 'technical', 'account', 'privacy'] as const;

  return (
    <div className="flex min-h-screen flex-col bg-neo-navy">
      <AutoHideHeader />

      <LandingPage locale={locale} topBar={false}>
        <div className="flex flex-col gap-6">
          <Link
            href={`/${locale}`}
            className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border-2 border-neo-white/25 px-4 text-sm font-bold text-neo-white/85 hover:border-neo-white/60 hover:text-neo-white"
          >
            <DirectionalIcon icon={ArrowLeft} className="h-4 w-4" />
            {c.back}
          </Link>
          <LandingHero
            title={c.title}
            lead={c.subtitle}
            actions={<LandingButton href={`/${locale}/contact`}>{c.contactUs}</LandingButton>}
            art={LANDING_ART.brain('')}
            artTone="cyan"
          />
        </div>

        {categoryOrder.map((catKey, catIdx) => {
          const categoryItems = c.items.filter((item) => item.category === catKey);
          if (categoryItems.length === 0) return null;

          return (
            <Fragment key={catKey}>
              {catIdx === 2 && <InlineBannerAd webZone="content-page" />}
              <Section title={c.categories[catKey]}>
                <FaqList items={categoryItems.map((item) => ({ q: item.question, a: item.answer }))} />
              </Section>
            </Fragment>
          );
        })}

        <Section title={c.learnMore} intro={c.blogCta}>
          <LinkPills
            items={[
              { href: `/${locale}/blog/science-behind-word-games`, label: c.blogScienceTitle },
              { href: `/${locale}/blog/daily-challenge-strategies`, label: c.blogStrategiesTitle },
              { href: `/${locale}/blog`, label: c.blogViewAll },
              {
                href: `/${locale}/education`,
                label: (
                  <>
                    <GraduationCap aria-hidden className="me-1 h-4 w-4" />
                    {t('footer.educationHub')}
                  </>
                ),
              },
            ]}
          />
        </Section>

        {children}

        <CtaBand
          tone="lime"
          title={c.stillHaveQuestions}
          body={c.hereToHelp}
          actions={<LandingButton href={`/${locale}/contact`} variant="dark">{c.contactUs}</LandingButton>}
          art={LANDING_ART.friends('')}
        />
      </LandingPage>
    </div>
  );
}
