import { JsonLd } from '@/components/seo/JsonLd';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import {
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Mark,
  Section,
  type LandingTone,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { splitLead } from '@/components/landing/splitLead';
import { buildEducationLandingJsonLd, type EducationCta, type EducationLandingContent } from '@/lib/seo/educationLanding';
import { EducationKitSection } from './EducationKitSections';
import { EducationKitRelated } from './EducationKitRelated';
import { EducationTeacherCtas } from './EducationTeacherCtas';
import { NoAccountCard } from '@/components/landing/education/NoAccountCard';

const ART: Record<string, keyof typeof LANDING_ART> = {
  'boggle-for-kids': 'blast',
  'boggle-for-the-classroom': 'friends',
  'brain-breaks-word-games': 'brain',
  'early-finishers-activities': 'reading',
  'end-of-year-classroom-activities': 'trophy',
  'english-games-adults': 'languages',
  'english-games-elementary': 'reading',
  'english-games-middle-school': 'duel',
  'english-vocabulary-topics': 'languages',
  'esl-word-games': 'languages',
  'first-day-of-school-icebreakers': 'friends',
  'games-for-teachers': 'wheel',
  'indoor-recess-games': 'blast',
  'irregular-verbs-games': 'solver',
  'middle-school-word-games': 'duel',
  'sight-words-practice': 'reading',
  'spelling-bee-practice': 'trophy',
  'vocabulary-games-classroom': 'brain',
};

const TOP_BAR_MAX = 18;

function CtaLabel({ cta }: { cta: EducationCta }) {
  return (
    <span className="flex flex-col items-center">
      <span>{cta.label}</span>
      {cta.sublabel && <span className="text-xs font-bold opacity-70">{cta.sublabel}</span>}
    </span>
  );
}

/** Education article landings on the shared landing kit. Server-rendered so the answer and FAQ ship as HTML. */
export function EducationKitLanding({
  locale,
  path,
  content,
}: {
  locale: string;
  /** Locale-less route, e.g. `/education/brain-breaks-word-games`. */
  path: string;
  content: EducationLandingContent;
}) {
  const slug = path.replace('/education/', '');
  const { hero, answer, heroBanner, footerCta } = content;
  const tone: LandingTone = content.accent === 'lime' ? 'yellow' : content.accent;
  const [lead, rest] = splitLead(hero.subtitle);
  const showBanner = heroBanner?.subtitle && heroBanner.subtitle !== hero.subtitle;
  const primary = { href: `/${locale}${hero.primaryCta.href}`, label: hero.primaryCta.label };

  const footer = footerCta ? (
    <CtaBand
      tone={tone}
      title={
        <>
          {footerCta.heading}
          {footerCta.highlight && (
            <>
              <br />
              <Mark tone="paper">{footerCta.highlight}</Mark>
            </>
          )}
        </>
      }
      body={footerCta.body}
      actions={footerCta.ctas.map((cta, i) => (
        <LandingButton key={cta.href} href={`/${locale}${cta.href}`} variant={i === 0 ? 'primary' : 'secondary'}>
          {cta.label}
        </LandingButton>
      ))}
    />
  ) : null;

  return (
    <LandingPage locale={locale} play={primary.label.length <= TOP_BAR_MAX ? primary : undefined}>
      {buildEducationLandingJsonLd({ locale, path, content }).map((node) => (
        <JsonLd key={node['@id']} data={node} />
      ))}

      <LandingHero
        eyebrow={hero.tag}
        title={
          <>
            {hero.h1.part1} <Mark tone={content.accent}>{hero.h1.highlight}</Mark>
            {/^[\s,.;:!?]/.test(hero.h1.part2) ? null : <br />}
            {hero.h1.part2}
          </>
        }
        lead={lead}
        actions={
          <>
            <LandingButton href={primary.href} data-hero-primary>
              <CtaLabel cta={hero.primaryCta} />
            </LandingButton>
            {hero.secondaryCta && (
              <LandingButton href={`/${locale}${hero.secondaryCta.href}`} variant="secondary">
                <CtaLabel cta={hero.secondaryCta} />
              </LandingButton>
            )}
          </>
        }
        art={LANDING_ART[ART[slug] ?? 'reading']('')}
        artTone={tone}
        more={
          rest || showBanner ? (
            <>
              {rest && <p>{rest}</p>}
              {showBanner && (
                <>
                  <h2>{heroBanner.title}</h2>
                  <p>{heroBanner.subtitle}</p>
                </>
              )}
            </>
          ) : undefined
        }
      >
        {hero.facts.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-neo-white/70">
            {hero.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
      </LandingHero>

      <NoAccountCard locale={locale} copy={content.noAccountCopy} />

      {answer && (
        <section data-answer className="flex max-w-4xl flex-col gap-3 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl sm:p-8">
          <h2 className="font-neo-display text-2xl font-bold leading-tight sm:text-3xl">{answer.question}</h2>
          <p className="text-base leading-relaxed sm:text-lg">{answer.answer}</p>
        </section>
      )}

      {content.sections.map((section, i) => (
        <EducationKitSection key={`${section.kind}-${i}`} section={section} locale={locale} />
      ))}

      {content.faqs.length > 0 && (
        <div data-geo-faq>
          <Section title={content.labels.faqTitle}>
            <FaqList headingLevel={3} items={content.faqs} />
          </Section>
        </div>
      )}

      {footerCta?.position === 'beforeRelated' && footer}

      <EducationKitRelated
        locale={locale}
        slug={slug}
        extra={content.related.map((r) => ({ href: r.href, label: r.label }))}
        count={Math.max(3, content.related.length + 3)}
      />

      {footerCta?.position !== 'beforeRelated' && footer}

      <TeacherProCompareCheckoutStrip locale={locale} className="my-0!" />
      <EducationTeacherCtas
        showTeacherCta={content.showTeacherAccessCta ?? true}
        showUpsell={content.showDistrictUpsell ?? true}
        hideTeacherLead={content.districtUpsellHideTeacherCta ?? true}
      />
    </LandingPage>
  );
}
