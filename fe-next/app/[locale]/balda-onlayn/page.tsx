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
const PAGE_PATH = '/balda-onlayn';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isRussian = locale === 'ru';
  const pageUrl = `${BASE_URL}/ru${PAGE_PATH}`;

  return {
    title: 'Балда онлайн — играй в слова бесплатно с другими | LexiClash',
    description: 'Балда онлайн бесплатно — составляй слова из букв на общем поле и соревнуйся в реальном времени. Как классическая «Балда», только многопользовательская: играй с друзьями, с соперниками или против ИИ. Без регистрации, прямо в браузере.',
    keywords: 'балда онлайн, игра балда, балда играть, балда бесплатно, балда на двоих, балда с компьютером, балда с друзьями, игра в слова балда, составь слова из букв, словесная игра балда',
    openGraph: {
      title: 'Балда онлайн — бесплатно, без регистрации',
      description: 'Классическая «Балда», только в реальном времени и многопользовательская. Составляй слова из букв и побеждай. Играй бесплатно в браузере.',
      locale: 'ru_RU',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'Балда онлайн — LexiClash' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Балда онлайн — бесплатно',
      description: 'Классическая «Балда» в реальном времени. Играй бесплатно в браузере.',
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
  { q: 'Что такое «Балда» и как в неё играть онлайн?', a: '«Балда» — классическая игра в слова: на поле есть буквы, а игроки по очереди добавляют буквы и составляют новые слова. В LexiClash вы играете в современную версию этой идеи — ищете и составляете как можно больше слов из букв на общем поле, но все участники играют одновременно в реальном времени, а не по очереди. Чем длиннее и реже слово, тем больше очков.' },
  { q: 'В балду можно играть бесплатно?', a: 'Да — LexiClash полностью бесплатный, без регистрации и без скачивания. Откройте сайт в браузере и сразу начинайте составлять слова.' },
  { q: 'Можно играть в балду на двоих или с друзьями?', a: 'Да. Создайте закрытую комнату и поделитесь кодом — друзья присоединятся за секунды. Можно играть вдвоём, компанией или против случайных соперников со всего мира.' },
  { q: 'А с компьютером (против ИИ) можно?', a: 'Да — если рядом нет соперника, играйте против ИИ-ботов разной сложности. Отличный способ потренироваться и разогреться перед игрой с людьми.' },
  { q: 'Чем LexiClash лучше обычной балды на бумаге?', a: 'Слова проверяются по словарю автоматически, очки считаются мгновенно, есть таблицы лидеров, ежедневные испытания и режимы вроде «Колеса слов» и «Бласта». И всё это в реальном времени, без ожидания хода соперника.' },
  { q: 'Нужно ли что-то устанавливать?', a: 'Нет. Балда онлайн в LexiClash работает прямо в браузере на телефоне, планшете или компьютере — приложение скачивать не нужно.' },
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
      { '@type': 'ListItem', position: 2, name: 'Балда онлайн', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-balda-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-balda-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Балда онлайн — составляй слова и побеждай в реальном времени
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          LexiClash — это <strong>современная «Балда» онлайн, бесплатно и без регистрации</strong>. Составляйте слова из
          букв на общем поле, соревнуйтесь с друзьями, случайными соперниками или против ИИ. В отличие от классической
          балды по очереди, здесь все играют одновременно — со счётом в прямом эфире, цепочками комбо и таблицами
          лидеров. Играйте прямо в браузере на телефоне или компьютере.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Играть в балду бесплатно
          </Link>
          <Link href={`/${locale}/daily`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Слово дня
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Почему это лучше балды на бумаге</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { t: 'Автопроверка по словарю', d: 'Слова проверяются мгновенно — никаких споров, засчитано слово или нет.' },
              { t: 'В реальном времени', d: 'Все играют одновременно — не нужно ждать хода соперника.' },
              { t: 'На двоих, компанией или с ИИ', d: 'Закрытая комната для друзей, случайные соперники или боты разной сложности.' },
              { t: 'Очки, серии, таблицы лидеров', d: 'Длинные и редкие слова приносят больше очков. Поднимайтесь в рейтинге.' },
            ].map((item) => (
              <div key={item.t} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.t}</h3>
                <p className="text-sm text-neo-gray-200">{item.d}</p>
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

        <RuLandingLinks locale={locale} current="balda-onlayn" />

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Начни играть в балду прямо сейчас</h2>
          <p className="mt-4 text-neo-gray-200">
            Открой LexiClash в браузере и начни составлять слова из букв за пару секунд. Без установки, без регистрации,
            бесплатно навсегда.
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/multiplayer`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Играть в балду бесплатно
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
