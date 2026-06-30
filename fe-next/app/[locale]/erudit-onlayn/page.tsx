import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/erudit-onlayn';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isRussian = locale === 'ru';
  const pageUrl = `${BASE_URL}/ru${PAGE_PATH}`;

  return {
    title: 'Эрудит онлайн — игра в слова бесплатно с другими | LexiClash',
    description: 'Эрудит онлайн бесплатно — составляй слова из букв и набирай очки за длинные и редкие слова. Как «Эрудит», только в реальном времени и многопользовательский: играй с друзьями, соперниками или против ИИ. Без регистрации, в браузере.',
    keywords: 'эрудит онлайн, игра эрудит, эрудит играть, эрудит бесплатно, эрудит на двоих, эрудит с друзьями, игра в слова эрудит, скрабл онлайн, составь слова из букв, словесная игра эрудит',
    openGraph: {
      title: 'Эрудит онлайн — бесплатно, без регистрации',
      description: '«Эрудит» в реальном времени и многопользовательский. Составляй слова, набирай очки за редкие слова. Играй бесплатно в браузере.',
      locale: 'ru_RU',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'Эрудит онлайн — LexiClash' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Эрудит онлайн — бесплатно',
      description: '«Эрудит» в реальном времени. Играй бесплатно в браузере.',
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
  { q: 'Что такое «Эрудит» и можно ли играть онлайн?', a: '«Эрудит» — классическая настольная игра в слова, где из букв составляют слова и получают очки в зависимости от их длины и редкости букв. LexiClash — это онлайн-игра в том же духе: вы составляете как можно больше слов из букв на поле, а очки зависят от длины и редкости слова. Главное отличие — все играют одновременно в реальном времени, а не по очереди.' },
  { q: 'Эрудит онлайн бесплатный?', a: 'Да — LexiClash полностью бесплатный, без регистрации и скачивания. Заходите в браузере и сразу начинайте играть.' },
  { q: 'Можно играть в эрудит на двоих или с друзьями?', a: 'Да. Создайте закрытую комнату и поделитесь кодом — соревнуйтесь вдвоём или компанией. Можно играть и против случайных соперников со всего мира.' },
  { q: 'Как начисляются очки?', a: 'Чем длиннее слово и чем реже встречаются его буквы, тем больше очков. Длинные слова и редкие буквы вознаграждаются — как в классическом «Эрудите».' },
  { q: 'Чем LexiClash отличается от настольного эрудита?', a: 'Слова проверяются по словарю автоматически, очки считаются мгновенно, не нужно ждать хода соперника. Плюс есть ежедневные испытания, таблицы лидеров и другие режимы — «Колесо слов», «Бласт», «Приключение».' },
  { q: 'Нужно ли скачивать приложение?', a: 'Нет. Эрудит онлайн в LexiClash работает прямо в браузере на телефоне, планшете или компьютере.' },
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
      { '@type': 'ListItem', position: 2, name: 'Эрудит онлайн', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-erudit-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-erudit-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Эрудит онлайн — составляй слова и набирай очки за редкие буквы
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          LexiClash — это <strong>«Эрудит» онлайн, бесплатно и без регистрации</strong>. Составляйте слова из букв,
          получайте больше очков за длинные слова и редкие буквы и поднимайтесь в таблице лидеров. В отличие от
          настольного эрудита по очереди, здесь все играют одновременно в реальном времени — со счётом в прямом эфире и
          цепочками комбо. Играйте с друзьями, соперниками или против ИИ прямо в браузере.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Играть в эрудит бесплатно
          </Link>
          <Link href={`/${locale}/daily`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Слово дня
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Почему стоит играть онлайн</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { t: 'Очки за длину и редкость', d: 'Длинные слова и редкие буквы приносят больше баллов — как в классике.' },
              { t: 'В реальном времени', d: 'Все играют одновременно — не нужно ждать хода соперника.' },
              { t: 'Автопроверка по словарю', d: 'Засчитываются только настоящие слова. Никаких споров.' },
              { t: 'С друзьями или против ИИ', d: 'Закрытая комната, случайные соперники или боты разной сложности.' },
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

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Начни играть в эрудит прямо сейчас</h2>
          <p className="mt-4 text-neo-gray-200">
            Открой LexiClash в браузере и начни составлять слова за пару секунд. Без установки, без регистрации,
            бесплатно навсегда.
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/multiplayer`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Играть в эрудит бесплатно
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
