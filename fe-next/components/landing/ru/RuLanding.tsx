import React from 'react';
import {
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  LinkPills,
  Section,
  type LandingArt,
  type LandingTone,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { RuLandingLinks } from '@/components/landing/RuLandingLinks';

interface Cta {
  href: string;
  label: string;
}

export interface RuLandingProps {
  locale: string;
  slug: string;
  jsonLd: { id: string; data: object }[];
  hero: {
    title: React.ReactNode;
    lead: React.ReactNode;
    more?: React.ReactNode;
    art: LandingArt;
    artTone?: LandingTone;
    cta: Cta;
    secondary?: Cta;
    extra?: Cta[];
  };
  faqs: { q: string; a: string }[];
  final: { title: React.ReactNode; body: React.ReactNode; cta: Cta };
  children: React.ReactNode;
}

const TOP_BAR_MAX = 20;

/** Shell shared by the Russian keyword pages: hero, page sections, FAQ, cluster links, final CTA. */
export function RuLanding({ locale, slug, jsonLd, hero, faqs, final, children }: RuLandingProps) {
  return (
    <LandingPage locale={locale} play={hero.cta.label.length <= TOP_BAR_MAX ? hero.cta : undefined}>
      {jsonLd.map((s) => (
        <script key={s.id} id={s.id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s.data) }} />
      ))}

      <LandingHero
        title={hero.title}
        lead={hero.lead}
        actions={
          <>
            <LandingButton href={hero.cta.href}>{hero.cta.label}</LandingButton>
            {hero.secondary && (
              <LandingButton href={hero.secondary.href} variant="secondary">
                {hero.secondary.label}
              </LandingButton>
            )}
          </>
        }
        art={hero.art}
        artTone={hero.artTone}
        more={hero.more}
      >
        {hero.extra && <LinkPills items={hero.extra} />}
      </LandingHero>

      {children}

      <Section title="Частые вопросы">
        <FaqList items={faqs} />
      </Section>

      <RuLandingLinks locale={locale} current={slug} className="" />

      <CtaBand
        tone="cyan"
        title={final.title}
        body={final.body}
        actions={<LandingButton href={final.cta.href}>{final.cta.label}</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
