import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/igry-v-slova-onlayn';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isRussian = locale === 'ru';
  const pageUrl = `${BASE_URL}/ru${PAGE_PATH}`;

  return {
    title: 'Игры в слова онлайн — играй бесплатно с другими | LexiClash',
    description: 'Бесплатные игры в слова онлайн — без регистрации и скачивания. Составляй слова из букв на общем поле, соревнуйся в реальном времени, как «Балда» и «Эрудит», только быстрее. 6 режимов, ежедневное слово дня. Играй в браузере.',
    keywords: 'игры в слова, игра в слова онлайн, игры со словами, составь слова из букв, найди слова, словесные игры, балда онлайн, эрудит онлайн, анаграммы онлайн, игра в слова с друзьями, слова из букв, игра буквы',
    openGraph: {
      title: 'Игры в слова онлайн — бесплатно, без регистрации',
      description: 'Составляй слова из букв и соревнуйся в реальном времени. Как «Балда», только многопользовательская и быстрая. Играй бесплатно в браузере.',
      locale: 'ru_RU',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'Игры в слова онлайн — LexiClash' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Игры в слова онлайн — бесплатно',
      description: 'Составляй слова из букв и соревнуйся в реальном времени. Играй бесплатно в браузере.',
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
  { q: 'Что такое игра в слова онлайн?', a: 'Это игра, где вы составляете слова из букв на поле и зарабатываете очки за каждое найденное слово. В LexiClash буквы расположены на общей сетке, а вы соединяете соседние буквы свайпом или клавиатурой, чтобы собрать как можно больше слов до конца таймера. Чем длиннее и реже слово — тем больше очков.' },
  { q: 'В игры в слова можно играть бесплатно?', a: 'Да — LexiClash полностью бесплатный, без скачивания и регистрации. Откройте сайт в браузере и сразу начинайте играть. Нет платных стен и режимов только по подписке.' },
  { q: 'Чем это похоже на «Балду» и «Эрудит»?', a: 'Как в «Балде», вы ищете и составляете слова из букв; как в «Эрудите», за редкие и длинные слова дают больше очков. Но в LexiClash все игроки играют одновременно в реальном времени, со счётом в прямом эфире и цепочками комбо — это быстрее и азартнее, чем ход за ходом.' },
  { q: 'Можно играть с друзьями?', a: 'Да. Создайте закрытую комнату и поделитесь кодом — друзья присоединятся за секунды без регистрации. Можно играть и со случайными соперниками со всего мира, и против ИИ в одиночку.' },
  { q: 'Нужно ли что-то скачивать?', a: 'Нет. LexiClash работает прямо в браузере на телефоне, планшете или компьютере. Это веб-приложение — ничего устанавливать не нужно.' },
  { q: 'Какие есть режимы игры?', a: 'Шесть режимов: «Классический» поиск слов, «Охота за словами», динамичный «Бласт», «Колесо слов» (ежедневное слово дня), «Приключение» со 100 уровнями и «Тренировка мозга» для развития словарного запаса и памяти.' },
];

const modes = [
  { title: 'Классический', desc: 'Ищите как можно больше слов на буквенном поле до конца таймера. Чистая игра в слова.' },
  { title: 'Колесо слов', desc: 'Ежедневное слово дня: составляйте слова из заданных букв и поднимайтесь в таблице лидеров.' },
  { title: 'Охота за словами', desc: 'Найдите спрятанные слова по подсказкам — азартный поиск на скорость.' },
  { title: 'Бласт', desc: 'Взрывная аркада: собирайте слова, чтобы расчищать поле и набирать комбо.' },
  { title: 'Приключение', desc: '100 уровней в 10 тематических мирах с боссами и растущей сложностью.' },
  { title: 'Тренировка мозга', desc: 'Короткие упражнения для словарного запаса, памяти и скорости мышления.' },
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
      { '@type': 'ListItem', position: 2, name: 'Игры в слова онлайн', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-igryslova-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-igryslova-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Игры в слова онлайн — составляй слова и побеждай в реальном времени
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          LexiClash — это <strong>бесплатные игры в слова онлайн без регистрации и скачивания</strong>. Составляйте слова из
          букв на общем поле, соревнуйтесь с друзьями или соперниками со всего мира и поднимайтесь в таблице лидеров. Как
          «Балда» и «Эрудит», только все играют одновременно, со счётом в прямом эфире и цепочками комбо. Шесть режимов,
          ежедневное слово дня — играйте прямо в браузере на телефоне или компьютере.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Играть бесплатно
          </Link>
          <Link href={`/${locale}/daily`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Слово дня
          </Link>
          <Link href={`/${locale}/adventure`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            Приключение
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Шесть режимов игры в слова</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {modes.map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Как играть</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'Открой игру', d: 'Зайди в браузере — без скачивания и регистрации, играй сразу.' },
              { n: '2', t: 'Составляй слова', d: 'Соединяй соседние буквы свайпом или клавиатурой, собирай слова до конца таймера.' },
              { n: '3', t: 'Побеждай', d: 'Чем длиннее и реже слово, тем больше очков. Поднимайся в таблице лидеров.' },
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

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Начни играть прямо сейчас</h2>
          <p className="mt-4 text-neo-gray-200">
            Открой LexiClash в браузере и начни составлять слова из букв за пару секунд. Без установки, без регистрации,
            бесплатно навсегда.
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/multiplayer`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Играть в слова бесплатно
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
