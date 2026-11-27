import type { Metadata } from 'next';
import Link from 'next/link';
import { RuLanding } from '@/components/landing/ru/RuLanding';
import { CheckList, Prose, Section } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

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
    title: 'Балда онлайн — играть бесплатно, без регистрации | LexiClash',
    description: 'Игра в слова в духе «Балды»: ищи слова на общем поле вдвоём, с друзьями или против компьютера. Все ходят одновременно. Бесплатно и без регистрации →',
    keywords: 'балда онлайн, игра балда, балда играть, балда бесплатно, балда на двоих, балда с компьютером, балда с друзьями, игра в слова балда, составь слова из букв, словесная игра балда',
    openGraph: {
      title: 'Балда онлайн — бесплатно, без регистрации',
      description: 'Игра в слова в духе «Балды», только в реальном времени: все ищут слова на одном поле одновременно. Играй бесплатно в браузере.',
      locale: 'ru_RU',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'Балда онлайн — LexiClash' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Балда онлайн — бесплатно',
      description: 'Игра в слова в духе «Балды» в реальном времени. Играй бесплатно в браузере.',
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
  { q: 'Что такое «Балда» и как в неё играть онлайн?', a: 'В классической «Балде» в середине поля 5×5 написано слово, а игроки по очереди ставят по одной букве рядом с уже открытыми так, чтобы получилось новое слово. В LexiClash буквы не добавляют: поле уже заполнено, и все участники одновременно ищут на нём слова, соединяя соседние буквы. Чем длиннее и реже слово, тем больше очков. Попробовать можно сразу на lexiclash.live: первая партия начинается через несколько секунд, без регистрации и скачивания.' },
  { q: 'В балду можно играть бесплатно?', a: 'Да — LexiClash полностью бесплатный, без регистрации и без скачивания. Откройте сайт в браузере и сразу начинайте составлять слова.' },
  { q: 'Можно играть в балду вдвоём или с друзьями?', a: 'Да. Создайте закрытую комнату и поделитесь кодом — друзья присоединятся за секунды. Можно играть на двоих, компанией или против случайных соперников со всего мира.' },
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
    <RuLanding
      locale={locale}
      slug="balda-onlayn"
      jsonLd={[
        { id: 'ld-balda-faq', data: faqJsonLd },
        { id: 'ld-balda-breadcrumb', data: breadcrumbJsonLd },
      ]}
      hero={{
        title: 'Балда онлайн — составляй слова и побеждай в реальном времени',
        lead: (
          <>
            LexiClash — игра в слова, похожая на «Балду»: <strong>онлайн, бесплатно и без регистрации</strong>.
          </>
        ),
        more: (
          <p>
            Составляйте слова из букв на общем поле, соревнуйтесь с друзьями, случайными соперниками или против ИИ. В
            отличие от классической балды по очереди, здесь все играют одновременно — со счётом в прямом эфире, цепочками
            комбо и таблицами лидеров. Играйте прямо в браузере на телефоне или компьютере: нажмите «Играть в балду
            бесплатно» ниже, и первая партия начнётся через несколько секунд.
          </p>
        ),
        art: LANDING_ART.duel('Два маскота LexiClash сражаются в словесной дуэли'),
        artTone: 'pink',
        cta: { href: `/${locale}/multiplayer`, label: 'Играть в балду бесплатно' },
        secondary: { href: `/${locale}/daily`, label: 'Слово дня' },
      }}
      faqs={faqs}
      final={{
        title: 'Начни играть в балду прямо сейчас',
        body: 'Открой LexiClash в браузере и начни составлять слова из букв за пару секунд. Без установки, без регистрации, бесплатно навсегда.',
        cta: { href: `/${locale}/multiplayer`, label: 'Играть в балду бесплатно' },
      }}
    >
      <Section title="Почему это лучше балды на бумаге">
        <CheckList
          items={[
            { t: 'Автопроверка по словарю', d: 'Слова проверяются мгновенно — никаких споров, засчитано слово или нет.' },
            { t: 'В реальном времени', d: 'Все играют одновременно — не нужно ждать хода соперника.' },
            { t: 'На двоих, компанией или с ИИ', d: 'Закрытая комната для друзей, случайные соперники или боты разной сложности.' },
            { t: 'Очки, серии, таблицы лидеров', d: 'Длинные и редкие слова приносят больше очков. Поднимайтесь в рейтинге.' },
          ].map((item) => (
            <div key={item.t}>
              <h3 className="font-neo-display text-lg font-bold">{item.t}</h3>
              <span className="font-normal">{item.d}</span>
            </div>
          ))}
        />
      </Section>
      <Section title="Помощник для Балды">
        <Prose>
          <p>
            Ищете помощника для Балды? Введите буквы в{' '}
            <Link href={`/${locale}/tools/word-solver`} className="underline decoration-neo-pink decoration-2">
              решатель слов
            </Link>
            , и он покажет, какие слова из них складываются. Расположение букв на поле Балды он не учитывает, поэтому
            проверяйте, что слово можно провести по клеткам.
          </p>
        </Prose>
      </Section>
    </RuLanding>
  );
}
