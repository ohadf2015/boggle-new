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
const PAGE_PATH = '/igra-v-assotsiatsii-onlayn';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isRussian = locale === 'ru';
  const pageUrl = `${BASE_URL}/ru${PAGE_PATH}`;

  return {
    title: 'Игра в ассоциации онлайн — найди связующее слово | LexiClash',
    description:
      'Игра в ассоциации онлайн бесплатно: два слова, нужно найти третье, которое их связывает. МЁРТВАЯ … ЗРЕНИЯ → ТОЧКА. Без регистрации, реклама не прерывает загадку, играй прямо в браузере.',
    keywords:
      'игра в ассоциации, ассоциации онлайн, игра в ассоциации онлайн, словесные ассоциации, угадай слово, мост слов, игра в слова онлайн, головоломка со словами, устойчивые словосочетания игра',
    openGraph: {
      title: 'Игра в ассоциации онлайн — два слова, одно связующее',
      description:
        'Найди слово, которое соединяет пару. Бесплатно, без регистрации, реклама не прерывает загадку.',
      locale: 'ru_RU',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'Игра в ассоциации онлайн — LexiClash',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Игра в ассоциации онлайн — бесплатно',
      description: 'Два слова, одно связующее. Найди мост между ними.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/connections`,
        ru: pageUrl,
      },
    },
    robots: { index: isRussian, follow: true },
  };
}

// Реальные загадки из русского пула (lib/connections/puzzles/generated/ru.generated.ts).
const examples: { left: string; bridge: string; right: string; note: string }[] = [
  {
    left: 'МЁРТВАЯ',
    bridge: 'ТОЧКА',
    right: 'ЗРЕНИЯ',
    note: 'Переговоры зашли в мёртвую точку — и у каждого своя точка зрения.',
  },
  {
    left: 'ЛЬВИНАЯ',
    bridge: 'ДОЛЯ',
    right: 'ПРАВДЫ',
    note: 'Львиная доля — это «бо́льшая часть», доля правды — «некоторая часть». Одно слово, два масштаба.',
  },
  {
    left: 'ВОЗДУШНЫЙ',
    bridge: 'ЗАМОК',
    right: 'ЗАЖИГАНИЯ',
    note: 'Здесь решает ударение: за́мок строят в облаках, замо́к поворачивают ключом. В ответе ударение ставить не нужно.',
  },
  {
    left: 'АДАМОВО',
    bridge: 'ЯБЛОКО',
    right: 'РАЗДОРА',
    note: 'Два разных мифа — библейский и греческий — сходятся в одном фрукте.',
  },
  {
    left: 'ТРОЯНСКИЙ',
    bridge: 'КОНЬ',
    right: 'В ПАЛЬТО',
    note: 'Античность и дворовая шутка в одной загадке. Такие переходы — самое весёлое в игре.',
  },
];

const faqs = [
  {
    q: 'Что это за игра в ассоциации?',
    a: 'Вам показывают два слова — слева и справа. Нужно найти одно слово, которое встаёт между ними так, что обе пары превращаются в нормальные русские словосочетания. Пример: МЁРТВАЯ … ЗРЕНИЯ. Ответ — ТОЧКА: «мёртвая точка» и «точка зрения». Правило объясняется за десять секунд, но угадывается далеко не всё.',
  },
  {
    q: 'Чем это отличается от настольной игры «Ассоциации»?',
    a: 'В настольном варианте вы свободно называете любое слово, которое пришло в голову, и правильного ответа нет. Здесь ответ ровно один и он проверяется: обе получившиеся пары должны быть реальными устойчивыми сочетаниями. Свобода меньше, а вот момент озарения — сильнее.',
  },
  {
    q: 'Это то же самое, что Connections в New York Times?',
    a: 'Нет. В NYT Connections нужно разложить шестнадцать слов на четыре тематические группы. У нас — два слова и поиск одного связующего. Механика другая, хотя ощущение «ага!» похожее.',
  },
  {
    q: 'Игра бесплатная?',
    a: 'Полностью. Без регистрации, без платной подписки, без скачивания: открыли сайт в браузере — играете. Аккаунт нужен только чтобы сохранять прогресс, вести серию дней и попадать в таблицы лидеров.',
  },
  {
    q: 'Реклама будет прерывать загадку?',
    a: 'Нет. Посреди загадки ничего не всплывает и ничто не закрывает поле. Рекламный ролик можно посмотреть по собственному желанию — чтобы открыть подсказку. Это принципиальная разница с мобильными играми, где межстраничная реклама вылезает между ходами.',
  },
  {
    q: 'Загадки написаны на русском или это перевод с английского?',
    a: 'Написаны на русском и специально для русского. Английская версия строится на составных словах (fire truck, truck stop), а русская — на устойчивых словосочетаниях и фразеологизмах: «львиная доля», «яблоко раздора», «час пик». Перевести такое напрямую невозможно, поэтому пул для каждого языка собирается с нуля.',
  },
  {
    q: 'Сколько всего загадок?',
    a: 'Русский пул — сотня активных загадок трёх уровней сложности, и он регулярно пополняется. Решённые загадки запоминаются, так что повторы вам не выпадают, пока вы не пройдёте остальное.',
  },
  {
    q: 'Как работают подсказки?',
    a: 'Одна подсказка на загадку. Она не выдаёт ответ, а даёт направление: для слова СТОЛ подсказка звучит как «за ним сидят», для ЗУБ — «болит у стоматолога». Открыть её можно за короткий ролик или за игровые монеты.',
  },
  {
    q: 'Что будет, если я напишу «конек» вместо «конёк»?',
    a: 'Засчитается. Написание с «е» вместо «ё» принимается как верное, попытка не сгорает. То же касается регистра — можно писать хоть заглавными, хоть строчными.',
  },
  {
    q: 'Сколько попыток даётся на загадку?',
    a: 'Несколько попыток на каждую загадку, и они не общие на всю игру, а свои у каждой. Ошибка в одной загадке не лишает вас остальных — раньше это было именно так, и мы это исправили.',
  },
  {
    q: 'Есть ежедневный режим?',
    a: 'Да. Ежедневный вызов — пять мостов в день, одинаковых для всех игроков, с общей таблицей результатов и серией дней. Набор обновляется в полночь по UTC.',
  },
  {
    q: 'Нужно ли что-то устанавливать?',
    a: 'Нет. Игра работает прямо в браузере на телефоне, планшете и компьютере. Приложение скачивать не нужно, но сайт можно добавить на домашний экран — тогда он открывается как обычное приложение.',
  },
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/ru${PAGE_PATH}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${BASE_URL}/${locale}` },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Игра в ассоциации онлайн',
        item: `${BASE_URL}/${locale}${PAGE_PATH}`,
      },
    ],
  };

  const gameJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    '@id': `${BASE_URL}/ru${PAGE_PATH}#game`,
    name: 'Мост слов',
    alternateName: ['Игра в ассоциации', 'Word Bridge'],
    url: `${BASE_URL}/ru/connections`,
    description:
      'Бесплатная онлайн-головоломка на ассоциации: даются два слова, нужно найти одно связующее, с которым обе пары образуют устойчивые словосочетания.',
    image: `${BASE_URL}/og-image-en.webp`,
    genre: ['Word Game', 'Puzzle', 'Brain Training'],
    gamePlatform: ['Web Browser', 'iOS', 'Android', 'PWA'],
    playMode: ['SinglePlayer'],
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (Web Browser)',
    inLanguage: 'ru',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/ru/connections`,
    },
    publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-assotsiatsii-faq" type="application/ld+json">
        {JSON.stringify(faqJsonLd)}
      </Script>
      <Script id="ld-assotsiatsii-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbJsonLd)}
      </Script>
      <Script id="ld-assotsiatsii-game" type="application/ld+json">
        {JSON.stringify(gameJsonLd)}
      </Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Игра в ассоциации онлайн — найди слово, которое связывает
        </h1>

        <p className="mb-6 text-lg leading-relaxed text-neo-gray-200">
          «Мост слов» — это <strong>игра в ассоциации онлайн, бесплатно и без регистрации</strong>. Вам
          показывают два слова, слева и справа, а вы ищете третье — то, которое встаёт между ними и
          превращает обе половины в нормальные русские словосочетания. КРУГЛЫЙ … ПЕРЕГОВОРОВ? СТОЛ.
          АНГЛИЙСКИЙ … ЖЕСТОВ? ЯЗЫК. Одна загадка занимает около полуминуты.
        </p>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Загадки собраны не на редких словах, а на устойчивых сочетаниях, которые вы слышите каждый
          день и обычно не замечаете: «львиная доля», «час пик», «яблоко раздора». Поэтому играть можно
          без словаря — всё нужное вы уже знаете, вопрос только в том, как быстро это достанется из
          памяти. <strong>Реклама не прерывает загадку</strong>: посреди хода ничего не всплывает и ничто
          не закрывает поле.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/connections`}
            className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Играть в ассоциации бесплатно
          </Link>
          <Link
            href={`/${locale}/connections/daily`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            Ежедневный вызов
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl">
            Пять загадок с разбором
          </h2>
          <p className="mb-6 text-neo-gray-200">
            Это настоящие загадки из русского пула, а не придуманные для витрины. Посмотрите, как
            устроен ход мысли — дальше будет легче.
          </p>
          <div className="space-y-4">
            {examples.map((ex) => (
              <div
                key={ex.bridge}
                className="rounded-neo border-3 border-neo-cyan/40 bg-neo-navy/50 p-4 shadow-hard"
              >
                <p className="font-neo-display text-lg font-bold">
                  <span className="text-neo-gray-200">{ex.left}</span>{' '}
                  <span className="text-neo-lime">→ {ex.bridge} →</span>{' '}
                  <span className="text-neo-gray-200">{ex.right}</span>
                </p>
                <p className="mt-2 text-sm text-neo-gray-200">{ex.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Как играть</h2>
          <ol className="space-y-3 text-neo-gray-200">
            {[
              'Открывается загадка: два слова по краям и пустая клетка посередине.',
              'Введите слово, которое подходит к обоим. Проверяются обе пары сразу — если работает только одна, ответ не засчитается.',
              'Не получается — откройте подсказку. Она даёт направление, но не называет ответ.',
              'Ошиблись — ничего страшного: попытки свои у каждой загадки, промах в одной не закрывает остальные.',
              'В ежедневном вызове пять мостов подряд, одинаковых для всех, и общая таблица результатов.',
            ].map((step, idx) => (
              <li
                key={step}
                className="flex gap-3 rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard"
              >
                <span className="font-neo-display font-bold text-neo-lime">{idx + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            Чем отличается от других игр в слова
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                t: 'Реклама не прерывает загадку',
                d: 'Ничто не всплывает посреди хода и не закрывает поле. Ролик — только по вашему желанию, ради подсказки.',
              },
              {
                t: 'Загадки написаны на русском',
                d: 'Не перевод. Пул построен на русских устойчивых сочетаниях и фразеологизмах, которые в других языках просто не существуют.',
              },
              {
                t: 'Ответ один и он проверяется',
                d: 'В отличие от настольных «Ассоциаций», здесь есть точный ответ: обе пары должны быть реальными словосочетаниями.',
              },
              {
                t: '«Е» вместо «ё» засчитывается',
                d: 'Написали «конек» вместо «конёк» — ответ принят, попытка не сгорела. Игра не наказывает за раскладку клавиатуры.',
              },
              {
                t: 'Попытки свои у каждой загадки',
                d: 'Промах не обнуляет всю сессию. Раньше один общий запас жизней закрывал игру после первой ошибки — это исправлено.',
              },
              {
                t: 'Вход за секунду',
                d: 'Без регистрации и без скачивания. Открыли браузер на телефоне или компьютере — играете.',
              },
            ].map((item) => (
              <div
                key={item.t}
                className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard"
              >
                <h3 className="mb-1 font-bold text-neo-lime">{item.t}</h3>
                <p className="text-sm text-neo-gray-200">{item.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl">
            Три уровня сложности
          </h2>
          <p className="mb-6 text-neo-gray-200">
            Сложность здесь — это не длина слова, а расстояние между двумя смыслами связующего.
          </p>
          <div className="space-y-4 text-neo-gray-200">
            <div className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard">
              <h3 className="mb-1 font-bold text-neo-lime">Легко</h3>
              <p className="text-sm">
                Слово работает в прямом значении с обеих сторон. ВЫСШАЯ … ЖИЗНИ → ШКОЛА, ЗОЛОТОЙ …
                МУДРОСТИ → ЗУБ. Такие обычно берутся с первой попытки.
              </p>
            </div>
            <div className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard">
              <h3 className="mb-1 font-bold text-neo-lime">Средне</h3>
              <p className="text-sm">
                Одна сторона прямая, другая переносная. ЧЁРНЫЙ … ПАНДОРЫ → ЯЩИК: сначала прибор в
                самолёте, потом миф. Нужно переключить регистр мышления.
              </p>
            </div>
            <div className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard">
              <h3 className="mb-1 font-bold text-neo-lime">Сложно</h3>
              <p className="text-sm">
                Обе стороны переносные, или решает ударение. ВОЗДУШНЫЙ … ЗАЖИГАНИЯ → ЗАМОК, ЛЕБЕДИНАЯ …
                ГОДА → ПЕСНЯ. Здесь подсказка обычно себя окупает.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl">
            Чем полезна игра в ассоциации
          </h2>
          <p className="mb-4 text-neo-gray-200">
            Поиск связующего слова задействует сразу две вещи: припоминание и ассоциацию. Это тот же
            механизм, который выручает, когда слово вертится на языке и никак не даётся. Регулярная
            практика переводит пассивный словарь — то, что вы узнаёте, но сами не употребляете, — в
            активный.
          </p>
          <p className="mb-4 text-neo-gray-200">
            Второй эффект — гибкость. Первое слово, которое приходит в голову, в этой игре почти всегда
            неверное: оно подходит к левой половине и разваливает правую. Приходится перебирать
            варианты, отбрасывать и заходить с другой стороны. Именно это в психологии называют боковым
            мышлением, и тренируется оно только на задачах без единственного очевидного пути.
          </p>
          <p className="text-neo-gray-200">
            Третье — фразеология. Русские устойчивые сочетания обычно осваиваются пассивно, «на слух», и
            редко разбираются осознанно. Здесь вы каждый раз видите сочетание в разобранном виде: вот
            «мёртвая точка», вот «точка зрения», а вот общее слово между ними. Это заметно помогает тем,
            кто учит русский как иностранный, — и неожиданно многое объясняет носителям.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Частые вопросы</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details
                key={`faq-${idx}`}
                className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-lime transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <RuLandingLinks locale={locale} current="igra-v-assotsiatsii-onlayn" />

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">
            Попробуйте прямо сейчас
          </h2>
          <p className="mt-4 text-neo-gray-200">
            Первая загадка займёт полминуты, и этого обычно хватает, чтобы понять, ваше это или нет.
            Без установки, без регистрации и без рекламы, которая лезет посреди хода.
          </p>
          <div className="mt-6">
            <Link
              href={`/${locale}/connections`}
              className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
            >
              Играть в ассоциации бесплатно
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
