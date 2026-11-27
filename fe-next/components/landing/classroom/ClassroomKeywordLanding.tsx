import React from 'react';
import {
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  LinkPills,
  Section,
  Steps,
  TileGrid,
  type LandingArt,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { splitLead } from '@/components/landing/splitLead';

interface Cta {
  href: string;
  label: string;
}

export interface ClassroomKeywordCopy {
  heroTitle: string;
  intro: string;
  fitsTitle: string;
  fits: Array<{ title: string; desc: string }>;
  stepsTitle: string;
  steps: Array<{ t: string; d: string }>;
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  moreTitle: string;
  moreCards: Array<{ title: string; sub: string }>;
  finalTitle: string;
  finalBody: string;
  finalCta: string;
}

const TOP_BAR_MAX = 22;

/** Shared layout of the teacher keyword pages (bell ringers, sub days, middle school). */
export function ClassroomKeywordLanding({
  locale,
  c,
  jsonLd,
  strip,
  primary,
  secondary,
  extra = [],
  moreHrefs,
  art = LANDING_ART.reading(''),
  afterSteps,
}: {
  locale: string;
  c: ClassroomKeywordCopy;
  jsonLd: { id: string; data: object }[];
  strip: React.ReactNode;
  primary: Cta;
  secondary?: Cta;
  extra?: Cta[];
  moreHrefs: string[];
  art?: LandingArt;
  afterSteps?: React.ReactNode;
}) {
  const [lead, rest] = splitLead(c.intro);

  return (
    <LandingPage locale={locale} play={primary.label.length <= TOP_BAR_MAX ? primary : undefined}>
      {jsonLd.map((s) => (
        <script key={s.id} id={s.id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s.data) }} />
      ))}

      <LandingHero
        title={c.heroTitle}
        lead={lead}
        actions={
          <>
            <LandingButton href={primary.href}>{primary.label}</LandingButton>
            {secondary && (
              <LandingButton href={secondary.href} variant="secondary">
                {secondary.label}
              </LandingButton>
            )}
          </>
        }
        art={art}
        artTone="yellow"
        more={rest ? <p>{rest}</p> : undefined}
      >
        {extra.length > 0 && <LinkPills items={extra} />}
      </LandingHero>

      <div className="min-w-0">{strip}</div>

      <Section title={c.fitsTitle}>
        <TileGrid variant="paper" columns={c.fits.length % 3 === 0 ? 3 : 2} items={c.fits.map((f) => ({ title: f.title, body: f.desc }))} />
      </Section>

      <Section title={c.stepsTitle}>
        <Steps items={c.steps.map((s) => ({ title: s.t, body: s.d }))} />
      </Section>

      {afterSteps}

      <Section title={c.faqTitle}>
        <FaqList items={c.faqs} />
      </Section>

      <Section title={c.moreTitle}>
        <TileGrid items={c.moreCards.map((card, i) => ({ href: moreHrefs[i], title: card.title, body: card.sub }))} />
      </Section>

      <CtaBand
        tone="cyan"
        title={c.finalTitle}
        body={c.finalBody}
        actions={<LandingButton href={primary.href}>{c.finalCta}</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
