import type { Metadata } from 'next';
import { WHEEL_EXAMPLE } from './wheelExample';
import { RuLanding } from '@/components/landing/ru/RuLanding';
import { Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

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
    title: 'Слово дня — угадай сегодняшнее слово онлайн | LexiClash',
    description: 'Угадай сегодняшнее Слово дня онлайн! Новая головоломка каждый день — составляй слова из букв колеса, держи серию побед, соревнуйся в таблице лидеров. Бесплатно, без регистрации.',
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
  { q: 'Какое сегодня слово дня?', a: 'Одного загаданного слова здесь нет. Каждый день открывается новое колесо из семи букв, и из него нужно собрать как можно больше слов. Сегодняшнее колесо уже ждёт: оно одно для всех игроков, а на следующий день его сменяет новое.' },
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
    <RuLanding
      locale={locale}
      slug="slovo-dnya"
      jsonLd={[
        { id: 'ld-slovodnya-faq', data: faqJsonLd },
        { id: 'ld-slovodnya-breadcrumb', data: breadcrumbJsonLd },
      ]}
      hero={{
        title: 'Слово дня — новая игра в слова каждый день',
        lead: (
          <>
            Каждый день — новое <strong>колесо слов</strong>: составляйте как можно больше слов из заданных букв, держите
            серию и соревнуйтесь в таблице лидеров.
          </>
        ),
        more: (
          <p>
            Одна головоломка в день, одинаковая для всех — честное сравнение результатов. Бесплатно, без регистрации и
            скачивания: решайте сегодняшнее слово дня прямо в браузере.
          </p>
        ),
        art: LANDING_ART.wheel('Маскот LexiClash крутит колесо букв'),
        artTone: 'lime',
        cta: { href: `/${locale}/daily`, label: 'Играть в слово дня' },
        secondary: { href: `/${locale}/multiplayer`, label: 'Игры в слова' },
      }}
      faqs={faqs}
      final={{
        title: 'Реши слово дня прямо сейчас',
        body: 'Сегодняшняя головоломка уже ждёт. Открой колесо слов, составь слова из букв и начни свою серию — бесплатно, без установки.',
        cta: { href: `/${locale}/daily`, label: 'Играть в слово дня бесплатно' },
      }}
    >
      <Section title="Как устроена игра">
        <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Prose>
            <p>
              На колесе семь букв, одна из них стоит в центре. Слово засчитывается, если в нём есть центральная буква и не
              меньше трёх букв. Каждую букву колеса можно взять в слове только один раз. На раунд даётся две минуты, а
              длинные слова стоят намного дороже: слово из трёх букв приносит 12 очков, из семи букв — 144.
            </p>
          </Prose>
          <div className="rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl">
            <h3 className="font-neo-display text-xl font-bold">Пример: колесо за 2 ноября</h3>
            <div aria-hidden className="my-4 flex flex-wrap gap-2">
              {[WHEEL_EXAMPLE.center, ...WHEEL_EXAMPLE.outer].map((letter, i) => (
                <span
                  key={i}
                  className={`flex h-11 w-11 items-center justify-center rounded-neo border-3 border-neo-black font-neo-display text-xl font-bold uppercase shadow-hard-sm ${i === 0 ? 'bg-neo-lime' : 'bg-neo-white'}`}
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="text-[15px] leading-relaxed">
              В центре буква <strong>{WHEEL_EXAMPLE.center}</strong>, вокруг неё {WHEEL_EXAMPLE.outer.join(', ')}. По нашему
              словарю из этих букв получается {WHEEL_EXAMPLE.total} слово, например: {WHEEL_EXAMPLE.picks.join(', ')}. Самая
              дорогая находка в этом колесе — «{WHEEL_EXAMPLE.longest}»: в ней заняты все семь букв.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Если вы искали Вордли или другую игру, где надо угадать слово">
        <Prose paper>
          <p>
            Во многих играх со словом дня, как в Вордли (русском аналоге Wordle), нужно за шесть попыток угадать одно слово из
            пяти букв. Здесь всё
            иначе: загаданного слова нет, ошибки не заканчивают игру, а результат зависит от того, сколько слов вы успели
            найти за две минуты. Цветных подсказок тоже нет, зато вы сразу видите все буквы, которые можно использовать.
          </p>
        </Prose>
      </Section>

      <Section title="Почему стоит играть каждый день">
        <TileGrid
          items={[
            { t: 'Новая головоломка ежедневно', d: 'Каждый день свежее колесо букв — одинаковое для всех игроков.' },
            { t: 'Держи серию', d: 'Возвращайся каждый день, чтобы не прервать серию и расти в рейтинге.' },
            { t: 'Развивай словарный запас', d: 'Регулярная игра в слова тренирует память и скорость мышления.' },
          ].map((s) => ({ title: s.t, body: s.d }))}
        />
      </Section>
    </RuLanding>
  );
}
