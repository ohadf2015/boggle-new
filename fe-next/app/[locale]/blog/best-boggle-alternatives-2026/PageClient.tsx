'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { InlineBannerAd } from '@/components/ads';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { contentByLocale } from './content';
import { faqByLocale, faqHeadingByLocale } from './faq';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { BlogPostLayout } from '@/components/blog/BlogPostLayout';

export default function BoggleAlternativesPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const params = useParams();
  const locale = (params.locale as string) || language;

  const content = contentByLocale[locale] || contentByLocale.en;
  const faqs = faqByLocale[locale] || faqByLocale.en;
  const faqHeading = faqHeadingByLocale[locale] || faqHeadingByLocale.en;

  const tocSections = content.sections.filter((s) => s.title && s.slug && s.slug !== 'intro');

  const tocLabel: Record<string, string> = {
    en: 'In this article',
    he: 'במאמר הזה',
    sv: 'I den här artikeln',
    ja: 'この記事の内容',
    es: 'En este artículo',
  };

  const comparisonHeadingByLocale: Record<string, string> = {
    en: 'Quick Comparison',
    he: 'השוואה מהירה',
    sv: 'Snabb jämförelse',
    ja: '比較一覧',
    es: 'Comparación rápida',
  };

  const comparisonHeaders: Record<string, { game: string; realtime: string; payToWin: string; modes: string; free: string }> = {
    en: { game: 'Game', realtime: 'Real-time', payToWin: 'Pay-to-Win', modes: 'Modes', free: 'Free' },
    he: { game: 'משחק', realtime: 'זמן אמת', payToWin: 'Pay-to-Win', modes: 'מצבים', free: 'חינמי' },
    sv: { game: 'Spel', realtime: 'Realtid', payToWin: 'Pay-to-Win', modes: 'Lägen', free: 'Gratis' },
    ja: { game: 'ゲーム', realtime: 'リアルタイム', payToWin: '課金勝利', modes: 'モード', free: '無料' },
    es: { game: 'Juego', realtime: 'Tiempo real', payToWin: 'Pay-to-Win', modes: 'Modos', free: 'Gratis' },
  };

  const headers = comparisonHeaders[locale] || comparisonHeaders.en;

  const comparisonRows = [
    { name: 'Wordle', realtime: false, p2w: false, modes: '1', free: true },
    { name: 'Words With Friends 2', realtime: false, p2w: true, modes: '2', free: true },
    { name: 'Wordscapes', realtime: false, p2w: false, modes: '1', free: true },
    { name: 'Boggle With Friends', realtime: true, p2w: true, modes: '2', free: true },
    { name: 'Word Blitz', realtime: true, p2w: false, modes: '1', free: true },
    { name: 'LexiClash', realtime: true, p2w: false, modes: '6+', free: true },
  ];

  const tryCtaByLocale: Record<string, string> = {
    en: 'Try LexiClash free — no download, no pay-to-win',
    he: 'נסו LexiClash בחינם — ללא הורדה, ללא תשלום לניצחון',
    sv: 'Prova LexiClash gratis — ingen nedladdning, inget pay-to-win',
    ja: 'LexiClashを無料で試す — ダウンロード不要、ペイ・トゥ・ウィンなし',
    es: 'Prueba LexiClash gratis — sin descarga, sin pagar para ganar',
  };

  const relatedHeadingByLocale: Record<string, string> = {
    en: 'You Might Also Like',
    he: 'אולי יעניין אותך גם',
    sv: 'Du kanske också gillar',
    ja: 'こちらもおすすめ',
    es: 'También te puede interesar',
  };
  const relatedHeading = relatedHeadingByLocale[locale] || relatedHeadingByLocale.en;
  const relatedArticlesData = [
    { slug: '10-surprising-benefits-word-games', title: '10 Surprising Benefits of Playing Word Games Daily', excerpt: '', readTime: '5 min read', category: 'Research', image: '' },
    { slug: 'science-behind-word-games', title: 'The Science Behind Word Games', excerpt: '', readTime: '6 min read', category: 'Science', image: '' },
    { slug: 'daily-challenge-strategies', title: '7 Proven Daily Challenge Strategies', excerpt: '', readTime: '7 min read', category: 'Strategy', image: '' },
    { slug: 'multilingual-word-learning', title: 'Multilingual Word Learning Through Games', excerpt: '', readTime: '8 min read', category: 'Language', image: '' },
    { slug: 'top-player-secrets', title: '7 Secrets Top Players Don\'t Want You to Know', excerpt: '', readTime: '9 min read', category: 'Secrets', image: '' },
    { slug: 'improve-word-game-skills', title: 'How to Improve Your Word Game Skills', excerpt: '', readTime: '8 min read', category: 'Strategy', image: '' },
    { slug: 'why-word-games-are-addictive', title: 'Why You Can\'t Stop Playing Word Games', excerpt: '', readTime: '11 min read', category: 'Psychology', image: '' },
    { slug: 'best-boggle-alternatives-2026', title: 'Best Boggle Alternatives in 2026', excerpt: '', readTime: '10 min read', category: 'Reviews', image: '' },
    { slug: 'word-games-for-brain-training', title: 'Word Games for Brain Training: The Research', excerpt: '', readTime: '12 min read', category: 'Brain Health', image: '' },
  ];

  return (
    <BlogPostLayout
      locale={locale}
      backLabel={content.backToBlog}
      category={content.category}
      categoryTone="pink"
      title={content.title}
      subtitle={content.subtitle}
      date="2025-12-01"
      readTime={content.readTime}
      image={{ src: "/images/blog/boggle-alternatives.jpg", alt: "Various word games on a wooden table with a phone showing a modern word game app" }}
      ctas={[
        { href: `/${locale}/daily`, label: content.playDaily },
        { href: `/${locale}/quick-play`, label: content.startPracticing },
        { href: `/${locale}/play-boggle-online-free`, label: content.playBoggle },
      ]}
      after={
        <>
          <AuthorBioCard />
          <RelatedArticles
            currentSlug="best-boggle-alternatives-2026"
            locale={locale}
            heading={relatedHeading}
            articles={relatedArticlesData}
          />
        </>
      }
    >
      <nav aria-label="Table of Contents" className="rounded-neo-lg border-3 border-neo-black bg-neo-yellow p-4">
        <p className="mb-2 text-sm font-bold">{tocLabel[locale] || tocLabel.en}</p>
        <ol className="space-y-1 text-sm">
          {tocSections.map((s) => (
            <li key={s.slug}>
              <a href={`#${s.slug}`}>{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>
      {content.sections.map((section, index) => (
        <div key={section.slug || index} className="mb-6">
          {section.title && (
            <h2
              id={section.slug}
              className="text-xl font-bold mb-3 mt-8 scroll-mt-20 text-neo-black"
            >
              {section.title}
            </h2>
          )}
          {section.content.split('\n\n').map((paragraph, pIndex) => (
            <p
              key={`${section.slug || index}-p-${pIndex}`}
              className="mb-4 leading-relaxed"
            >
              {paragraph}
            </p>
          ))}

          {/* Inline CTA after LexiClash section */}
          {section.slug === 'lexiclash' && (
            <div className="my-6 p-4 rounded-neo border-3 border-neo-black text-center bg-neo-lime/20">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg text-base px-6 py-3">
                  {tryCtaByLocale[locale] || tryCtaByLocale.en}
                </Button>
              </Link>
              {locale === 'en' && (
                <p className="mt-3 text-sm">
                  Or{' '}
                  <Link href="/en/play-boggle-online-free" className="font-bold underline">
                    play Boggle with friends online
                  </Link>
                  : create a room, share the code or QR, no download.
                </p>
              )}
            </div>
          )}

          {/* Comparison table after comparison section */}
          {section.slug === 'comparison' && (
            <div className="my-6 overflow-x-auto">
              <h3 className="text-lg font-bold mb-3 text-neo-black">
                {comparisonHeadingByLocale[locale] || comparisonHeadingByLocale.en}
              </h3>
              <table className="w-full text-sm border-3 border-neo-black rounded-neo overflow-hidden bg-neo-white">
                <thead>
                  <tr className="border-b-2 border-neo-black bg-neo-cream">
                    <th className="px-3 py-2 text-start font-bold">{headers.game}</th>
                    <th className="px-3 py-2 text-center font-bold">{headers.realtime}</th>
                    <th className="px-3 py-2 text-center font-bold">{headers.payToWin}</th>
                    <th className="px-3 py-2 text-center font-bold">{headers.modes}</th>
                    <th className="px-3 py-2 text-center font-bold">{headers.free}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr
                      key={row.name}
                      className={cn(
                        'border-b border-neo-black/20',
                        row.name === 'LexiClash' && ('bg-neo-lime/15')
                      )}
                    >
                      <td className="px-3 py-2 font-semibold text-neo-black">
                        {row.name}
                      </td>
                      <td className="px-3 py-2 text-center">{row.realtime ? '\u2705' : '\u274c'}</td>
                      <td className="px-3 py-2 text-center">{row.p2w ? '\u274c' : '\u2705'}</td>
                      <td className="px-3 py-2 text-center">{row.modes}</td>
                      <td className="px-3 py-2 text-center">{row.free ? '\u2705' : '\u274c'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      <InlineBannerAd webZone="content-page" className="my-6" />

      {/* FAQ Section */}
      <section className="mt-12" id="faq">
        <h2 className="text-xl font-bold mb-6 scroll-mt-20 text-neo-black">
          {faqHeading}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={`faq-${i}-${faq.question}`}
              className="group rounded-neo border-3 border-neo-black overflow-hidden bg-neo-white"
            >
              <summary className="cursor-pointer px-4 py-3 font-semibold text-sm list-none flex items-center justify-between text-neo-black hover:bg-neo-cream">
                {faq.question}
                <span className="ms-2 text-xs transition-transform group-open:rotate-180">&#9660;</span>
              </summary>
              <div className="px-4 pb-3 text-sm leading-relaxed border-t border-neo-black/20">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </section>
    </BlogPostLayout>
  );
}
