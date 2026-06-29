import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/slovo-dnya';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isRussian = locale === 'ru';
  const pageUrl = `${BASE_URL}/ru${PAGE_PATH}`;

  return {
    title: 'Слово дня — ежедневная игра в слова онлайн | LexiClash',
    description: 'Слово дня бесплатно: новая ежедневная головоломка со словами. Составляй слова из букв колеса, поддерживай серию и соревнуйся в таблице лидеров. Без регистрации, играй в браузере каждый день.',
    keywords: 'слово дня, слово дня онлайн, ежедневная игра в слова, колесо слов, составь слова из букв, словесная головоломка, игра слово дня, ежедневное слово, слова из букв каждый день',
    openGraph: {
      title: 'Слово дня — ежедневная игра в слова',
      description: 'Новая головоломка со словами каждый день. Составляй слова, держи серию, соревнуйся. Бесплатно в браузере.',
      locale: 'ru_RU',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'Слово дня — LexiClash' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Слово дня — ежедневная игра в слова',
      description: 'Новая головоломка со словами каждый день. Бесплатно в браузере.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/daily`,
        ru: pageUrl,
      },
    },
    robots: { index: isRussian, follow: true },
  };
}

const faqs = [
  { q: 'Что такое «слово дня» в LexiClash?', a: 'Это ежедневная головоломка со словами: каждый день появляется новое колесо букв, из которых нужно составить как можно больше слов. Одна головоломка в день — одинаковая для всех игроков, так что можно честно сравнивать результаты в таблице лидеров.' },
  { q: 'Сколько стоит играть в слово дня?', a: 'Ничего — это бесплатно, без регистрации и скачивания. Заходите в браузере и решайте сегодняшнюю головоломку за пару секунд.' },
  { q: 'Что такое серия (стрик)?', a: 'Серия — это количество дней подряд, когда вы решали слово дня. Возвращайтесь каждый день, чтобы не прерывать серию и подниматься в рейтинге постоянных игроков.' },
  { q: 'Чем слово дня отличается от Wordle?', a: 'В Wordle вы угадываете одно загаданное слово. В «слове дня» LexiClash вы составляете как можно больше разных слов из набора букв колеса — больше слов и больше длинных слов означает больше очков. Это ближе к «Балде» и «Эрудиту», чем к угадайке.' },
  { q: 'Можно ли играть на телефоне?', a: 'Да. Слово дня работает прямо в браузере на телефоне, планшете и компьютере — ничего устанавливать не нужно. Составляйте слова свайпом на сенсорном экране или печатайте на клавиатуре.' },
  { q: 'Есть ли архив прошлых головоломок?', a: 'Да — можно вернуться к предыдущим ежедневным головоломкам и наверстать пропущенные дни, а также посмотреть свою статистику и лучшие результаты.' },
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/ru${PAGE_PATH}#faq`,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Слово дня', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-slovodnya-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-slovodnya-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Слово дня — новая игра в слова каждый день
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Каждый день — новое <strong>колесо слов</strong>: составляйте как можно больше слов из заданных букв, держите
          серию и соревнуйтесь в таблице лидеров. Одна головоломка в день, одинаковая для всех — честное сравнение
          результатов. Бесплатно, без регистрации и скачивания: решайте сегодняшнее слово дня прямо в браузере.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/daily`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Играть в слово дня
          </Link>
          <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Игры в слова
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Почему стоит играть каждый день</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { t: 'Новая головоломка ежедневно', d: 'Каждый день свежее колесо букв — одинаковое для всех игроков.' },
              { t: 'Держи серию', d: 'Возвращайся каждый день, чтобы не прервать серию и расти в рейтинге.' },
              { t: 'Развивай словарный запас', d: 'Регулярная игра в слова тренирует память и скорость мышления.' },
            ].map((s) => (
              <div key={s.t} className="rounded-neo border-3 border-neo-cyan/40 bg-neo-navy/50 p-5 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-cyan">{s.t}</h3>
                <p className="text-sm text-neo-gray-200">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Частые вопросы</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={`faq-${idx}`} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-lime transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Реши слово дня прямо сейчас</h2>
          <p className="mt-4 text-neo-gray-200">
            Сегодняшняя головоломка уже ждёт. Открой колесо слов, составь слова из букв и начни свою серию — бесплатно,
            без установки.
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/daily`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Играть в слово дня бесплатно
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
