import ReactDOM from 'react-dom';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import MultiplayerPageClient from './PageClient';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'multiplayer', path: '/multiplayer', locale });
}

const seoContent: Record<string, {
  title: string;
  description: string;
}> = {
  en: {
    title: 'Multiplayer Word Game — Real-Time Word Battles With Friends',
    description:
      'LexiClash Multiplayer is a real-time competitive word game where you race against friends and rivals to find words on a shared grid. Host private rooms for game nights, join public lobbies to test your skills against the world, or challenge the AI bot when nobody is online. Every match is live, timed, and scored — no waiting for turns. Four distinct multiplayer modes mean every match feels different: Classic Boggle-style word racing, Wheel Rush rotating-tile sprints, Word Hunt directed-search puzzles, and Blast Mode tile-clearing combo chains. Match-making works across devices: someone on a phone in Tel Aviv can play head-to-head with a friend on a laptop in Stockholm with sub-100ms latency on the same shared grid. No download. No signup unless you want a persistent profile. Open the link, pick a mode, and you are in.',
  },
  he: {
    title: 'משחק מילים מרובה משתתפים — קרבות מילים בזמן אמת עם חברים',
    description:
      'LexiClash מרובה משתתפים הוא משחק מילים תחרותי בזמן אמת שבו אתם מתחרים נגד חברים ויריבים למצוא מילים על לוח משותף. ארחו חדרים פרטיים לערבי משחקים, הצטרפו ללובי ציבורי כדי לבדוק את הכישורים שלכם מול העולם, או אתגרו את הבוט כשאף אחד לא מחובר.',
  },
  sv: {
    title: 'Multiplayer-ordspel — Ordstrider i realtid med vänner',
    description:
      'LexiClash Multiplayer är ett tävlingsinriktat ordspel i realtid där du tävlar mot vänner och rivaler om att hitta ord på ett gemensamt rutnät. Skapa privata rum för spelkvällar eller gå med i offentliga lobbyer för att testa dina färdigheter mot hela världen.',
  },
  ja: {
    title: 'マルチプレイヤーワードゲーム — 友達とリアルタイム対戦',
    description:
      'LexiClashマルチプレイヤーは、友達やライバルと共有グリッド上で単語を見つけ合うリアルタイム対戦型ワードゲームです。プライベートルームを作成してゲームナイトを楽しんだり、パブリックロビーで世界中のプレイヤーと対戦しましょう。',
  },
  es: {
    title: 'Juego de Palabras Multijugador — Batallas de Palabras en Tiempo Real',
    description:
      'LexiClash Multijugador es un juego de palabras competitivo en tiempo real donde compites contra amigos y rivales para encontrar palabras en un tablero compartido. Crea salas privadas para noches de juegos, únete a lobbies públicos o desafía al bot de IA.',
  },
  ru: {
    title: 'Мультиплеерная игра в слова — словесные битвы в реальном времени',
    description:
      'LexiClash Мультиплеер — это соревновательная игра в слова в реальном времени, где вы соревнуетесь с друзьями и соперниками, находя слова на общем поле. Создавайте приватные комнаты для вечеров игр, присоединяйтесь к публичным лобби, чтобы проверить себя против игроков со всего мира, или вызовите ИИ-бота, когда никого нет в сети. Четыре режима мультиплеера — Классика в стиле Боггл, Колесо, Охота за словами и Взрыв — каждый со своими правилами и темпом. Без скачивания и регистрации: откройте ссылку, выберите режим — и вы уже в игре.',
  },
};

export default async function MultiplayerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] ?? seoContent.en;
  const origin = 'https://www.lexiclash.live';

  // Preload the lobby LCP hero (RoomListView.tsx) from the FIRST server HTML, so the
  // browser fetches it while the dynamic(ssr:false) multiplayer JS downloads. Without
  // this the hero's own <Image priority> preload is absent from initial HTML (it lives
  // inside the ssr:false flow) and the image is discovered seconds late — worst on
  // mobile (field data: resourceLoadDelay ~4.8s). The previous static <link> here
  // pointed at the OLD hero (/mascot/play.webp) which the lobby no longer renders — a
  // high-priority preload of an unused asset that stole the connection from the real LCP.
  // ponytail: srcset widths/quality hardcoded to next.config deviceSizes (q=75); update if those change.
  const HERO = '%2Fimages%2Farena-hub-hero.jpg';
  ReactDOM.preload(`/_next/image?url=${HERO}&w=1920&q=75`, {
    as: 'image',
    fetchPriority: 'high',
    imageSrcSet: [640, 750, 828, 1080, 1200, 1920].map((w) => `/_next/image?url=${HERO}&w=${w}&q=75 ${w}w`).join(', '),
    imageSizes: '(min-width: 1024px) 720px, (min-width: 640px) 560px, 100vw',
  });

  return (
    <>
      <VideoGameJsonLd
        mode="multiplayer"
        locale={locale}
        name={content.title}
        description={content.description}
        playMode="MultiPlayer"
        numberOfPlayers={{ minValue: 2, maxValue: 8 }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'LexiClash', url: `${origin}/${locale}` },
          { name: content.title, url: `${origin}/${locale}/multiplayer` },
        ]}
      />
      <MultiplayerPageClient />
      {/* PageClient is client-only, so the SSR HTML was nav+footer chrome (36 visible
          words on /en/multiplayer, measured 2026-08-21). The authored per-locale copy
          below already existed here but only ever reached JSON-LD, never the page.
          Same remediation as /leaderboard; collapsible so the lobby stays above the fold. */}
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        collapsible
      />
    </>
  );
}
