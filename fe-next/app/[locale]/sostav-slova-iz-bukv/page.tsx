import type { Metadata } from 'next';
import { RuLanding } from '@/components/landing/ru/RuLanding';
import { Section, Steps } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

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
    <RuLanding
      locale={locale}
      slug="sostav-slova-iz-bukv"
      jsonLd={[
        { id: 'ld-sostav-faq', data: faqJsonLd },
        { id: 'ld-sostav-breadcrumb', data: breadcrumbJsonLd },
      ]}
      hero={{
        title: 'Составь слова из букв — собери как можно больше и набери очки',
        lead: (
          <>
            В LexiClash вам даётся набор букв — <strong>составляйте из них как можно больше слов</strong> и зарабатывайте
            очки.
          </>
        ),
        more: (
          <p>
            Бесплатно, без регистрации и скачивания: соединяйте буквы свайпом или печатайте на клавиатуре. Каждое слово
            проверяется по русскому словарю, а чем оно длиннее и реже — тем больше баллов. Играйте в реальном времени с
            друзьями, соперниками или против ИИ прямо в браузере.
          </p>
        ),
        art: LANDING_ART.reading('Маскот LexiClash читает книгу'),
        artTone: 'pink',
        cta: { href: `/${locale}/multiplayer`, label: 'Играть бесплатно' },
        secondary: { href: `/${locale}/tools/word-solver`, label: 'Решатель слов' },
        extra: [{ href: `/${locale}/daily`, label: 'Слово дня' }],
      }}
      faqs={faqs}
      final={{
        title: 'Собери первое слово прямо сейчас',
        body: 'Открой LexiClash и начни составлять слова из букв за пару секунд. Без установки, без регистрации, бесплатно.',
        cta: { href: `/${locale}/multiplayer`, label: 'Составить слова бесплатно' },
      }}
    >
      <Section title="Как это работает">
        <Steps
          items={[
            { title: 'Получи буквы', body: 'На поле или в колесе появляется набор букв — одинаковый для всех игроков.' },
            { title: 'Составляй слова', body: 'Соединяй буквы и собирай настоящие слова, пока не вышло время.' },
            { title: 'Набирай очки', body: 'Длинные и редкие слова приносят больше баллов. Побеждает тот, кто собрал больше.' },
          ]}
        />
      </Section>
    </RuLanding>
  );
}
