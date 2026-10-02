import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BadgeCheck, Clock } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import type { HelpArticleMeta, HelpArticleText } from './helpTypes';
import {
  HELP_CATEGORY_STYLE,
  HELP_PATH,
  HELP_UPDATED,
  getHelpArticleMeta,
  helpArticleHref,
} from './helpRegistry';
import { getHelpContent } from './content';
import { helpDate, helpT } from './helpI18n';
import { HELP_ACCENT, HELP_ACCENT_INK } from './helpAccent';
import { HelpBlocks } from './HelpBlocks';
import { HelpRichText } from './HelpRichText';
import { HelpNextStep } from './HelpNextStep';
import { HelpFeedback } from './HelpFeedback';

export function HelpArticleView({
  locale,
  meta,
  article,
}: {
  locale: string;
  meta: HelpArticleMeta;
  article: HelpArticleText;
}) {
  const t = helpT(locale);
  const content = getHelpContent(locale);
  const style = HELP_CATEGORY_STYLE[meta.category];
  const steps = article.blocks.flatMap((b) => (b.t === 'steps' ? b.items : []));
  const related = meta.related
    .map((slug) => getHelpArticleMeta(slug))
    .filter((m): m is HelpArticleMeta => Boolean(m));

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <nav aria-label={t('eg2Help.article.breadcrumb')} className="text-sm font-bold">
          <ol className="flex flex-wrap items-center gap-2 text-neo-gray-300">
            <li>
              <Link href={`/${locale}${HELP_PATH}`} className="inline-flex items-center gap-1 text-neo-cyan hover:text-neo-lime">
                <DirectionalIcon icon={ArrowLeft} className="size-4" />
                {t('eg2Help.article.breadcrumb')}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/${locale}${HELP_PATH}#${meta.category}`} className="hover:text-neo-lime">
                {t(`eg2Help.categories.${meta.category}.title`)}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-12">
          <article className="min-w-0 lg:col-span-8">
            <header className="border-b-4 border-neo-black pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-[6px] border-2 border-neo-black px-2 py-0.5 font-neo-display text-xs font-black uppercase tracking-wider shadow-hard-sm ${HELP_ACCENT[style.accent].bg} ${HELP_ACCENT_INK[style.accent]}`}
                >
                  {meta.kind === 'tutorial' ? t('eg2Help.article.tutorial') : t('eg2Help.article.guide')}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-neo-gray-300">
                  <Clock aria-hidden="true" className="size-4" />
                  {t('eg2Help.article.minRead', { count: meta.minutes })}
                </span>
              </div>
              <h1 className="mt-4 font-neo-display text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                {article.title}
              </h1>
              <p className="mt-4 text-xl leading-relaxed text-neo-gray-200">
                <HelpRichText text={article.summary} locale={locale} />
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-neo-lime">
                <BadgeCheck aria-hidden="true" className="size-4" />
                {t('eg2Help.article.tested')} · {t('eg2Help.article.updated', { date: helpDate(locale, HELP_UPDATED) })}
              </p>
            </header>

            <div className="mt-8">
              <HelpBlocks blocks={article.blocks} locale={locale} t={t} />
            </div>

            <HelpNextStep locale={locale} next={meta.next} />
            <HelpFeedback
              slug={meta.slug}
              question={t('eg2Help.article.helpfulQ')}
              yes={t('eg2Help.article.yes')}
              no={t('eg2Help.article.no')}
              thanks={t('eg2Help.article.thanks')}
              thanksNo={t('eg2Help.article.thanksNo')}
            />
          </article>

          <aside className="lg:col-span-4">
            <div className="space-y-6 lg:sticky lg:top-24">
              {steps.length > 0 ? (
                <nav aria-labelledby="help-toc" className="hidden rounded-neo border-3 border-neo-gray-600 bg-neo-navy-light p-5 lg:block">
                  <p id="help-toc" className="text-xs font-black uppercase tracking-widest text-neo-gray-300">
                    {t('eg2Help.article.onThisPage')}
                  </p>
                  <ol className="mt-3 space-y-2">
                    {steps.map((s, i) => (
                      <li key={i}>
                        <a href={`#step-${i + 1}`} className="flex gap-2 text-sm font-semibold text-neo-gray-100 hover:text-neo-lime">
                          <span className="font-neo-display font-black text-neo-cyan">{i + 1}</span>
                          <span>{s.title}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}

              <nav aria-labelledby="help-related" className="rounded-neo border-4 border-neo-cream/50 bg-neo-navy-light p-5 shadow-hard-lg">
                <div className="flex items-center gap-3">
                  <Image src={style.badge} alt="" width={48} height={48} sizes="48px" className="size-12" />
                  <p id="help-related" className="font-neo-display text-lg font-black">
                    {t('eg2Help.article.related')}
                  </p>
                </div>
                <ul className="mt-3 space-y-1">
                  {related.map((m) => (
                    <li key={m.slug}>
                      <Link
                        href={helpArticleHref(locale, m.slug)}
                        className="group flex items-start gap-2 rounded-[6px] px-2 py-2 font-semibold text-neo-gray-100 hover:bg-neo-navy hover:text-neo-lime"
                      >
                        <DirectionalIcon icon={ArrowRight} className="mt-1 size-4 shrink-0 text-neo-cyan" />
                        <span>{content.articles[m.slug].title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={`/${locale}${HELP_PATH}`} className="mt-3 inline-block px-2 text-sm font-bold text-neo-cyan hover:text-neo-lime">
                  {t('eg2Help.article.back')}
                </Link>
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
