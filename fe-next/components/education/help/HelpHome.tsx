import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock, MessageCircle } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { HELP_CATEGORY_IDS } from './helpTypes';
import {
  HELP_ARTICLES,
  HELP_CATEGORY_STYLE,
  HELP_POPULAR,
  HELP_TUTORIALS,
  helpArticleHref,
  helpArticlesIn,
  helpNextStepHref,
} from './helpRegistry';
import { getHelpContent } from './content';
import { helpT } from './helpI18n';
import { helpLabel } from './helpSeo';
import { helpPlainText } from './helpText';
import { HELP_ACCENT, HELP_ACCENT_INK } from './helpAccent';
import { HelpSearch, type HelpSearchItem } from './HelpSearch';
import { HelpRichText } from './HelpRichText';

const TUTORIAL_ACCENTS = ['pink', 'cyan', 'lime', 'purple'] as const;

export function HelpHome({ locale }: { locale: string }) {
  const t = helpT(locale);
  const content = getHelpContent(locale);
  const plain = (s: string) => helpPlainText(s, helpLabel(locale)).replace(/\*\*/g, '');
  const index: HelpSearchItem[] = HELP_ARTICLES.map((m) => {
    const a = content.articles[m.slug];
    return {
      slug: m.slug,
      href: helpArticleHref(locale, m.slug),
      title: a.title,
      summary: plain(a.summary),
      keywords: a.keywords,
      category: t(`eg2Help.categories.${m.category}.title`),
      kind: m.kind,
    };
  });

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white">
      <section className="border-b-4 border-neo-cream/50 bg-neo-navy-light texture-halftone">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-12 lg:px-8 lg:pb-20 lg:pt-14">
          <div className="lg:col-span-8">
            <span className="inline-block -rotate-2 rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              {t('eg2Help.home.eyebrow')}
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
              {t('eg2Help.home.title')}{' '}
              <span className="inline-block -rotate-2 bg-neo-lime px-3 text-neo-navy shadow-hard-lg">
                {t('eg2Help.home.titleHighlight')}
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">{t('eg2Help.home.lead')}</p>
            <div className="mt-8 max-w-2xl">
              <HelpSearch
                index={index}
                label={t('eg2Help.home.searchLabel')}
                placeholder={t('eg2Help.home.searchPlaceholder')}
                noResults={t('eg2Help.home.searchNoResults')}
                resultsTemplate={t('eg2Help.home.searchResults')}
              />
            </div>
            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-widest text-neo-gray-300">{t('eg2Help.home.popular')}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {HELP_POPULAR.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={helpArticleHref(locale, slug)}
                      className="inline-block rounded-full border-3 border-neo-cream/50 bg-neo-navy px-4 py-2 text-sm font-bold text-neo-white shadow-hard transition-transform hover:-translate-y-0.5 hover:bg-neo-cyan hover:text-neo-navy"
                    >
                      {content.articles[slug].title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="hidden lg:col-span-4 lg:block">
            <Image
              src="/mascot/teacher/teacher-hero.webp"
              alt=""
              width={420}
              height={420}
              priority
              sizes="380px"
              className="mx-auto h-auto w-full max-w-[380px] rotate-3 drop-shadow-[6px_6px_0_rgba(0,0,0,0.9)]"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <section className="mt-14" aria-labelledby="help-tutorials">
          <h2 id="help-tutorials" className="font-neo-display text-3xl font-black sm:text-4xl">
            {t('eg2Help.home.tutorialsTitle')}
          </h2>
          <p className="mt-2 max-w-2xl text-neo-gray-200">{t('eg2Help.home.tutorialsLead')}</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HELP_TUTORIALS.map((m, i) => {
              const accent = TUTORIAL_ACCENTS[i % TUTORIAL_ACCENTS.length];
              const a = content.articles[m.slug];
              return (
                <li key={m.slug}>
                  <Link
                    href={helpArticleHref(locale, m.slug)}
                    className={`group flex h-full flex-col rounded-neo border-4 border-neo-black p-5 shadow-hard-lg transition-transform hover:-translate-y-1 ${HELP_ACCENT[accent].bg} ${HELP_ACCENT_INK[accent]}`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-neo-display text-4xl font-black leading-none">{i + 1}</span>
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-cream px-2 py-0.5 text-xs font-black text-neo-navy">
                        <Clock aria-hidden="true" className="size-3.5" />
                        {t('eg2Help.article.minutes', { count: m.minutes })}
                      </span>
                    </span>
                    <span className="mt-4 font-neo-display text-xl font-black leading-tight">{a.title}</span>
                    <span className="mt-2 text-sm font-medium opacity-90">{plain(a.summary)}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mt-16" aria-labelledby="help-topics">
          <h2 id="help-topics" className="font-neo-display text-3xl font-black sm:text-4xl">
            {t('eg2Help.home.categoriesTitle')}
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {HELP_CATEGORY_IDS.map((cat, i) => {
              const style = HELP_CATEGORY_STYLE[cat];
              const items = helpArticlesIn(cat);
              const wide = i === HELP_CATEGORY_IDS.length - 1;
              return (
                <section
                  key={cat}
                  id={cat}
                  aria-labelledby={`cat-${cat}`}
                  className={`scroll-mt-24 rounded-neo border-4 border-neo-cream/50 bg-neo-navy-light p-5 shadow-hard-lg border-t-[10px] ${HELP_ACCENT[style.accent].border} ${wide ? 'md:col-span-2 lg:col-span-3' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Image src={style.badge} alt="" width={64} height={64} sizes="64px" loading="eager" className="size-16 shrink-0" />
                    <div className="min-w-0">
                      <h3 id={`cat-${cat}`} className="font-neo-display text-xl font-black text-neo-white">
                        {t(`eg2Help.categories.${cat}.title`)}
                      </h3>
                      <p className="text-sm text-neo-gray-300">{t(`eg2Help.categories.${cat}.blurb`)}</p>
                    </div>
                  </div>
                  <ul className={`mt-4 gap-x-6 gap-y-1 ${wide ? 'grid md:grid-cols-3' : 'space-y-1'}`}>
                    {items.map((m) => (
                      <li key={m.slug}>
                        <Link
                          href={helpArticleHref(locale, m.slug)}
                          className="group flex items-center gap-2 rounded-[6px] px-2 py-2 font-semibold text-neo-gray-100 hover:bg-neo-navy hover:text-neo-lime"
                        >
                          <DirectionalIcon icon={ArrowRight} className={`size-4 shrink-0 ${HELP_ACCENT[style.accent].text}`} />
                          <span>{content.articles[m.slug].title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </section>

        <section className="mt-16" aria-labelledby="help-faq" data-help-faq>
          <h2 id="help-faq" className="font-neo-display text-3xl font-black sm:text-4xl">
            {t('eg2Help.home.faqTitle')}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {content.quick.map((q) => (
              <article key={q.q} className="rounded-neo border-3 border-neo-gray-600 bg-neo-navy-light p-5">
                <h3 className="font-neo-display text-lg font-black text-neo-white">{q.q}</h3>
                <p className="mt-2 text-neo-gray-200">
                  <HelpRichText text={q.a} locale={locale} />{' '}
                  <Link href={helpArticleHref(locale, q.slug)} className="inline-flex items-center gap-1 font-bold text-neo-cyan hover:text-neo-lime">
                    <span className="sr-only">{content.articles[q.slug].title}</span>
                    <DirectionalIcon icon={ArrowRight} className="size-4" />
                  </Link>
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="my-16 grid gap-6 rounded-neo border-4 border-neo-black bg-neo-pink p-6 text-neo-white shadow-hard-xl sm:p-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <h2 className="font-neo-display text-3xl font-black sm:text-4xl">{t('eg2Help.home.ctaTitle')}</h2>
            <p className="mt-3 text-lg font-medium">{t('eg2Help.home.ctaBody')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:justify-end">
            <Link
              href={helpNextStepHref(locale, 'startClass')}
              data-ph-capture-attribute-cta="help_home_start_class"
              className="rounded-neo border-4 border-neo-black bg-neo-lime px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-transform hover:-translate-y-1"
            >
              {t('eg2Help.home.ctaPrimary')}
            </Link>
            <Link
              href={helpNextStepHref(locale, 'liveGame')}
              data-ph-capture-attribute-cta="help_home_live_game"
              className="rounded-neo border-4 border-neo-cream/50 bg-neo-navy px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-transform hover:-translate-y-1"
            >
              {t('eg2Help.home.ctaSecondary')}
            </Link>
          </div>
        </section>

        <aside className="mb-16 flex flex-col items-start gap-3 rounded-neo border-3 border-dashed border-neo-gray-500 p-5 sm:flex-row sm:items-center">
          <MessageCircle aria-hidden="true" className="size-8 shrink-0 text-neo-cyan" />
          <div className="flex-1">
            <p className="font-neo-display text-lg font-black">{t('eg2Help.home.stuckTitle')}</p>
            <p className="text-neo-gray-300">{t('eg2Help.home.stuckBody')}</p>
          </div>
          <Link href={`/${locale}/contact`} className="rounded-neo border-3 border-neo-black bg-neo-cream px-4 py-2 font-bold text-neo-navy shadow-hard">
            {t('eg2Help.home.stuckCta')}
          </Link>
        </aside>
      </div>
    </main>
  );
}
