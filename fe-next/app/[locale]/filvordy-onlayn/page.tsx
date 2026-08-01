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
const PAGE_PATH = '/filvordy-onlayn';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isRussian = locale === 'ru';
  const pageUrl = `${BASE_URL}/ru${PAGE_PATH}`;

  return {
    title: 'Филворды онлайн — найди слова из букв бесплатно | LexiClash',
    description: 'Филворды онлайн бесплатно: ищи слова из букв на поле и соревнуйся в реальном времени. Ничего не всплывает посреди раунда и не закрывает игровое поле. Без регистрации, с ботами и друзьями. Играй прямо в браузере.',
    keywords: 'филворды, филворды онлайн, филворды бесплатно, найди слова из букв, поиск слов, игра в слова из букв, венгерский кроссворд, филворды играть онлайн, филворды с друзьями',
    openGraph: {
      title: 'Филворды онлайн — бесплатно, реклама не прерывает раунд',
      description: 'Ищи слова из букв на общем поле в реальном времени. Бесплатно, без регистрации, прямо в браузере.',
      locale: 'ru_RU',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'Филворды онлайн — LexiClash' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Филворды онлайн — бесплатно',
      description: 'Ищи слова из букв на поле в реальном времени. Реклама не прерывает раунд.',
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
  {
    q: 'Что такое филворды и чем они отличаются от кроссворда?',
    a: 'Филворды (их ещё называют венгерским кроссвордом) — это поле из букв, в котором нужно находить слова, соединяя соседние буквы. В отличие от обычного кроссворда, подсказок-определений нет: вы сами ищете слова среди букв. В LexiClash поле общее для всех игроков, и все ищут слова одновременно.',
  },
  {
    q: 'Филворды бесплатные?',
    a: 'Да, полностью. Без регистрации и без скачивания — открыли сайт в браузере и играете. Аккаунт нужен только если хотите сохранять прогресс и попадать в таблицы лидеров.',
  },
  {
    q: 'А реклама будет прерывать игру?',
    a: 'Нет. Посреди раунда ничего не всплывает, и ничто не закрывает игровое поле: реклама может показаться только после завершения раунда, на экране результатов. Это принципиальное отличие от многих мобильных филвордов, где баннер перекрывает часть поля, а между ходами открывается полноэкранная реклама.',
  },
  {
    q: 'Боты не жульничают? В других играх соперник пишет несуществующие слова.',
    a: 'Боты играют по тому же словарю, что и вы, — у них нет доступа к словам, которых нет у игрока. Если игра не приняла ваше слово, а вы уверены, что оно существует, на экране результатов есть кнопка «Апелляция»: слово попадает на проверку и может быть добавлено в словарь.',
  },
  {
    q: 'Что делать, если игра не знает обычное слово?',
    a: 'Нажмите «Апелляция» рядом с этим словом на экране результатов. Мы регулярно пополняем русский словарь — в нём уже более миллиона словоформ, и апелляции игроков напрямую влияют на то, что в него попадёт.',
  },
  {
    q: 'Можно играть с друзьями или только одному?',
    a: 'И так, и так. Создайте закрытую комнату и отправьте код друзьям, играйте против случайных соперников или тренируйтесь в одиночку против ботов разной сложности.',
  },
  {
    q: 'Мне мешают мигающие анимации. Их можно отключить?',
    a: 'Да. Игра уважает системную настройку «Уменьшить движение» (Reduce Motion) на iOS, Android и в браузере — при её включении анимации и вспышки отключаются автоматически.',
  },
  {
    q: 'Нужно ли что-то устанавливать?',
    a: 'Нет. Филворды в LexiClash работают прямо в браузере на телефоне, планшете и компьютере. Приложение скачивать не нужно.',
  },
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
      { '@type': 'ListItem', position: 2, name: 'Филворды онлайн', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-filvordy-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-filvordy-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Филворды онлайн — ищи слова из букв в реальном времени
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          LexiClash — это <strong>филворды онлайн бесплатно и без регистрации</strong>. Находите слова из букв на общем
          поле, соединяя соседние буквы, и соревнуйтесь с друзьями, случайными соперниками или ботами. Все ищут слова
          одновременно, счёт обновляется в прямом эфире. <strong>Реклама не прерывает раунд</strong> — посреди игры
          ничего не всплывает и ничто не закрывает игровое поле. Играйте прямо в браузере на телефоне или компьютере.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Играть в филворды бесплатно
          </Link>
          <Link href={`/${locale}/daily`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Слово дня
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Чем отличается от других филвордов</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { t: 'Реклама не прерывает раунд', d: 'Ничто не закрывает игровое поле и не всплывает посреди игры. Раунд идёт до конца.' },
              { t: 'Боты играют честно', d: 'У ботов тот же словарь, что и у вас. Никаких «несуществующих» слов от соперника.' },
              { t: 'Не приняло слово? Оспорьте', d: 'Кнопка «Апелляция» на экране результатов отправляет слово на проверку и пополнение словаря.' },
              { t: 'Вход за секунду', d: 'Без регистрации и без скачивания. Открыли браузер — играете.' },
              { t: 'Больше миллиона словоформ', d: 'Русский словарь регулярно пополняется, в том числе по апелляциям игроков.' },
              { t: 'Щадящий режим анимаций', d: 'Системная настройка «Уменьшить движение» отключает вспышки и анимации автоматически.' },
            ].map((item) => (
              <div key={item.t} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.t}</h3>
                <p className="text-sm text-neo-gray-200">{item.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Как играть в филворды</h2>
          <ol className="space-y-3 text-neo-gray-200">
            {[
              'Откройте поле — это сетка из букв, общая для всех игроков раунда.',
              'Соединяйте соседние буквы, чтобы составить слово. Буквы могут идти в любом направлении.',
              'Чем длиннее и реже слово, тем больше очков. Серия быстрых слов даёт комбо-множитель.',
              'В конце раунда смотрите разбор: какие слова вы нашли, какие пропустили и какие можно оспорить.',
            ].map((step, idx) => (
              <li key={step} className="flex gap-3 rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard">
                <span className="font-neo-display font-bold text-neo-lime">{idx + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
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

        <RuLandingLinks locale={locale} current="filvordy-onlayn" />

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Начни искать слова прямо сейчас</h2>
          <p className="mt-4 text-neo-gray-200">
            Открой LexiClash в браузере и начни находить слова из букв за пару секунд. Без установки, без регистрации,
            и без рекламы, прерывающей раунд.
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/multiplayer`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Играть в филворды бесплатно
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
