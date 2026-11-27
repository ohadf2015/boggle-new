import type { Metadata } from 'next';
import Link from 'next/link';
import { WORD_SCORES } from '@/shared/utils/scoring';
import { DEFAULT_TIMER } from '@/shared/constants/gameConstants';
import { RuLanding } from '@/components/landing/ru/RuLanding';
import { CompareTable, Section, Steps, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

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
    title: 'Эрудит Онлайн — В Прямом Эфире, С Друзьями | LexiClash',
    description: 'Играй в Эрудит онлайн в прямом эфире с друзьями — бесплатно, без регистрации и скачивания. Составляй слова, набирай очки за редкие буквы прямо в браузере.',
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
  { q: 'Что такое «Эрудит» и можно ли играть онлайн?', a: '«Эрудит» — классическая настольная игра в слова, где из букв составляют слова и получают очки в зависимости от их длины и редкости букв. LexiClash — это онлайн-игра в том же духе: вы составляете как можно больше слов из букв на поле, а очки зависят от длины и редкости слова. Главное отличие — все играют одновременно в реальном времени, а не по очереди. Чтобы сыграть, откройте lexiclash.live/ru/multiplayer и нажмите «Создать комнату».' },
  { q: 'Эрудит онлайн бесплатный?', a: 'Да — LexiClash полностью бесплатный, без регистрации и скачивания. Заходите в браузере и сразу начинайте играть.' },
  { q: 'Можно играть в эрудит на двоих или с друзьями?', a: 'Да. Создайте закрытую комнату и поделитесь кодом — соревнуйтесь вдвоём или компанией. Можно играть и против случайных соперников со всего мира.' },
  { q: 'Как начисляются очки?', a: 'В отличие от настольного «Эрудита», здесь у букв нет своей цены: очки зависят от длины слова. Слово из 4 букв даёт 20 очков, из 5 — 50, из 6 — 100, из 7 — 200, а из 8 и больше — 500. В комнате на несколько игроков слово, которое нашли не больше 5% участников, приносит в 1,5 раза больше, до 15% — в 1,3 раза, до 30% — в 1,15 раза. За серию слов подряд добавляется ещё и комбо-бонус.' },
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
    <RuLanding
      locale={locale}
      slug="erudit-onlayn"
      jsonLd={[
        { id: 'ld-erudit-faq', data: faqJsonLd },
        { id: 'ld-erudit-breadcrumb', data: breadcrumbJsonLd },
      ]}
      hero={{
        title: 'Эрудит онлайн — составляй слова и обгоняй соперников длинными словами',
        lead: (
          <>
            LexiClash — это <strong>«Эрудит» онлайн, бесплатно и без регистрации</strong>.
          </>
        ),
        more: (
          <p>
            Составляйте слова из букв, получайте больше очков за длинные слова и за те, что не нашли соперники, и
            поднимайтесь в таблице лидеров. В отличие от настольного эрудита по очереди, здесь все играют одновременно в
            реальном времени — со счётом в прямом эфире и цепочками комбо. Чтобы сыграть с другом, откройте
            lexiclash.live/ru/multiplayer, нажмите «Создать комнату» и отправьте ему ссылку или код комнаты — раунд по
            умолчанию длится {DEFAULT_TIMER} секунд.
          </p>
        ),
        art: LANDING_ART.trophy('Маскот LexiClash с кубком победителя'),
        artTone: 'yellow',
        cta: { href: `/${locale}/multiplayer`, label: 'Играть в эрудит бесплатно' },
        secondary: { href: `/${locale}/daily`, label: 'Слово дня' },
      }}
      faqs={faqs}
      final={{
        title: 'Начни играть в эрудит прямо сейчас',
        body: 'Открой LexiClash в браузере и начни составлять слова за пару секунд. Без установки, без регистрации, бесплатно навсегда.',
        cta: { href: `/${locale}/multiplayer`, label: 'Играть в эрудит бесплатно' },
      }}
    >
      <Section title="Почему стоит играть онлайн">
        <TileGrid
          columns={4}
          items={[
            { t: 'Очки за длину и редкость', d: 'Чем длиннее слово, тем больше очков, а за слово, которое больше никто не нашёл, начисляется надбавка.' },
            { t: 'В реальном времени', d: 'Все играют одновременно — не нужно ждать хода соперника.' },
            { t: 'Автопроверка по словарю', d: 'Засчитываются только настоящие слова. Никаких споров.' },
            { t: 'С друзьями или против ИИ', d: 'Закрытая комната, случайные соперники или боты разной сложности.' },
          ].map((item) => ({ title: item.t, body: item.d }))}
        />
      </Section>

      <Section title="Как играть в эрудит онлайн с друзьями">
        <Steps
          items={[
            {
              title: (
                <>
                  Откройте <Link href={`/${locale}/multiplayer`} className="underline decoration-neo-pink decoration-2">lexiclash.live/ru/multiplayer</Link> и
                  нажмите «Создать комнату».
                </>
              ),
            },
            { title: 'Отправьте друзьям ссылку или код комнаты. Скачивать ничего не нужно, игра открывается в браузере.' },
            { title: `Когда все зашли, запускайте раунд. По умолчанию он длится ${DEFAULT_TIMER} секунд, и все ищут слова одновременно, без очереди.` },
            { title: 'Если друзей рядом нет, сыграйте против ботов или случайных соперников, а комнату с друзьями соберите потом.' },
          ]}
        />
      </Section>

      <Section
        title="Сколько очков дают слова"
        intro="В настольном «Эрудите» у каждой буквы своя цена. В LexiClash считается длина слова, поэтому одно слово из восьми букв стоит больше, чем двадцать пять слов из трёх."
      >
        <div className="max-w-md">
          <CompareTable
            columns={['Букв в слове', 'Очки']}
            rows={Object.entries(WORD_SCORES).map(([len, pts]) => [Number(len) >= 8 ? '8 и больше' : len, pts])}
            caption="В комнате на несколько игроков слово, которое нашли не больше 5% участников, стоит в 1,5 раза больше, до 15% — в 1,3 раза, до 30% — в 1,15 раза."
          />
        </div>
      </Section>
    </RuLanding>
  );
}
