import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { RuLandingLinks } from '@/components/landing/RuLandingLinks';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/sostav-slova-iz-bukv';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isRussian = locale === 'ru';
  const pageUrl = `${BASE_URL}/ru${PAGE_PATH}`;

  return {
    title: 'Составь слова из букв — игра онлайн бесплатно | LexiClash',
    description: 'Составляй слова из букв онлайн бесплатно: из набора букв собери как можно больше слов и набери очки. Игра в слова в реальном времени с друзьями и соперниками, ежедневное колесо слов. Без регистрации, играй в браузере.',
    keywords: 'составь слова из букв, слова из букв, собери слова из букв, составить слова из букв, игра слова из букв, составь слова из заданных букв, слова из набора букв, анаграммы из букв, найди слова из букв',
    openGraph: {
      title: 'Составь слова из букв — игра онлайн бесплатно',
      description: 'Из набора букв собери как можно больше слов и набери очки. Игра в слова в реальном времени. Бесплатно в браузере.',
      locale: 'ru_RU',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'Составь слова из букв — LexiClash' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Составь слова из букв — онлайн бесплатно',
      description: 'Из набора букв собери как можно больше слов. Игра в слова бесплатно в браузере.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en`,
        ru: pageUrl,
      },
    },
    robots: { index: isRussian, follow: true },
  };
}

const faqs = [
  { q: 'Как составлять слова из букв в LexiClash?', a: 'Вам даётся набор букв — на поле или в колесе. Соединяйте соседние буквы свайпом или печатайте на клавиатуре, чтобы собрать настоящие слова. Каждое найденное слово приносит очки: чем оно длиннее и реже, тем больше баллов. Цель — составить как можно больше слов до конца таймера.' },
  { q: 'Это бесплатно?', a: 'Да — полностью бесплатно, без регистрации и скачивания. Откройте сайт в браузере и сразу начинайте составлять слова из букв.' },
  { q: 'Слова проверяются по словарю?', a: 'Да. Каждое слово автоматически сверяется с русским словарём, так что засчитываются только настоящие слова. Это и тренировка словарного запаса, и честная игра.' },
  { q: 'Можно играть с друзьями?', a: 'Да. Создайте комнату и поделитесь кодом — соревнуйтесь, кто соберёт больше слов из одного и того же набора букв. Можно играть и против случайных соперников, и против ИИ в одиночку.' },
  { q: 'Чем это похоже на «Балду» и «Эрудит»?', a: 'Как в «Балде» и «Эрудите», суть в том, чтобы составлять слова из букв. Но в LexiClash все играют одновременно в реальном времени, со счётом в прямом эфире — это быстрее и азартнее, чем ход за ходом.' },
  { q: 'Есть ли помощник по составлению слов?', a: 'Да — в разделе «Решатель слов» можно ввести буквы и посмотреть, какие слова из них можно составить. Удобно для тренировки и проверки себя.' },
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
      { '@type': 'ListItem', position: 2, name: 'Составь слова из букв', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-sostav-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-sostav-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Составь слова из букв — собери как можно больше и набери очки
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          В LexiClash вам даётся набор букв — <strong>составляйте из них как можно больше слов</strong> и зарабатывайте
          очки. Бесплатно, без регистрации и скачивания: соединяйте буквы свайпом или печатайте на клавиатуре. Каждое
          слово проверяется по русскому словарю, а чем оно длиннее и реже — тем больше баллов. Играйте в реальном времени
          с друзьями, соперниками или против ИИ прямо в браузере.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Играть бесплатно
          </Link>
          <Link href={`/${locale}/tools/word-solver`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Решатель слов
          </Link>
          <Link href={`/${locale}/daily`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            Слово дня
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Как это работает</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'Получи буквы', d: 'На поле или в колесе появляется набор букв — одинаковый для всех игроков.' },
              { n: '2', t: 'Составляй слова', d: 'Соединяй буквы и собирай настоящие слова, пока не вышло время.' },
              { n: '3', t: 'Набирай очки', d: 'Длинные и редкие слова приносят больше баллов. Побеждает тот, кто собрал больше.' },
            ].map((s) => (
              <div key={s.n} className="rounded-neo border-3 border-neo-cyan/40 bg-neo-navy/50 p-5 shadow-hard">
                <div className="mb-2 grid h-9 w-9 place-items-center rounded-neo border-3 border-neo-black bg-neo-cyan font-bold text-neo-navy">{s.n}</div>
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

        <RuLandingLinks locale={locale} current="sostav-slova-iz-bukv" />

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Собери первое слово прямо сейчас</h2>
          <p className="mt-4 text-neo-gray-200">
            Открой LexiClash и начни составлять слова из букв за пару секунд. Без установки, без регистрации, бесплатно.
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/multiplayer`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Составить слова бесплатно
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
