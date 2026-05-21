import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import MultiplayerPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'multiplayer', path: '/multiplayer', locale });
}

const seoContent: Record<string, {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}> = {
  en: {
    title: 'Multiplayer Word Game — Real-Time Word Battles With Friends',
    description:
      'LexiClash Multiplayer is a real-time competitive word game where you race against friends and rivals to find words on a shared grid. Host private rooms for game nights, join public lobbies to test your skills against the world, or challenge the AI bot when nobody is online. Every match is live, timed, and scored — no waiting for turns. Four distinct multiplayer modes mean every match feels different: Classic Boggle-style word racing, Wheel Rush rotating-tile sprints, Word Hunt directed-search puzzles, and Blast Mode tile-clearing combo chains. Match-making works across devices: someone on a phone in Tel Aviv can play head-to-head with a friend on a laptop in Stockholm with sub-100ms latency on the same shared grid. No download. No signup unless you want a persistent profile. Open the link, pick a mode, and you are in.',
    features: [
      'Host private rooms with custom settings — invite friends via link or room code',
      'Public matchmaking lobbies — get matched with opponents of similar skill in seconds',
      'Real-time scoring with live opponent word feeds — see what they find as they find it',
      'Adjustable round timers, grid sizes, and scoring rules for casual or competitive play',
      'Spectator mode — watch top players compete and learn advanced word-finding strategies',
      'Four multiplayer modes: Classic, Wheel Rush, Word Hunt, Blast — each with distinct scoring and pacing',
      'Cross-device matchmaking — phones, tablets, laptops, and TV screens all join the same match',
      'Sub-100ms latency on Socket.IO infrastructure — opponent moves appear before you finish typing yours',
      'Anti-cheat dictionary validation — every submitted word checked against the same competitive list',
      'Optional rematch system — replay the same opponents on a fresh grid in one tap',
    ],
    faq: [
      {
        question: 'How do I start a multiplayer word game with friends?',
        answer:
          'Tap "Create Room" on the multiplayer page, customize your settings (timer, grid size, rounds, mode), then share the room link or code with friends. They join instantly — no account required. You can also set a room password for private matches. Rooms stay open for 24 hours so you can come back to the same lobby after a break.',
      },
      {
        question: 'Is LexiClash multiplayer free to play?',
        answer:
          'Yes — LexiClash multiplayer is completely free with no download required. Play directly in your browser on any device. There are no paywalls, ads-to-unlock, or premium-only features. Optional rewarded ads exist for cosmetic boosts but never gate competitive play.',
      },
      {
        question: 'How many players can join a multiplayer room?',
        answer:
          'Multiplayer rooms support up to 8 players competing simultaneously on the same grid. For larger groups, try Party Mode which supports even more players on a shared TV screen with phones as controllers. Classroom mode supports up to 32 players for educator use.',
      },
      {
        question: 'What makes LexiClash different from Scrabble, Wordle, or Words With Friends?',
        answer:
          'Unlike turn-based games like Scrabble or Words With Friends — where you wait minutes or hours between moves — LexiClash is fully real-time. Everyone plays the same board simultaneously under time pressure. Unlike solo puzzles like Wordle, you compete directly against other players with live score feeds and combo chains. The result is the strategic depth of a tile-letter game combined with the intensity of a fighting game.',
      },
      {
        question: 'What are the four multiplayer modes and which is most popular?',
        answer:
          'Classic is a Boggle-style 4x4 or 5x5 grid where you race to find words within a 2-minute timer — most popular for new players. Wheel Rush rotates the letter pool every 15 seconds, rewarding fast pattern recognition. Word Hunt gives a target word count to find within a constrained letter set — best for puzzle lovers. Blast Mode clears tiles as you spell, building combo multipliers for longer chains — most popular for competitive players chasing high scores.',
      },
      {
        question: 'How does matchmaking work? Will I always be matched against strong players?',
        answer:
          'Public lobbies use ELO-style skill rating to match you against opponents of similar level. New players start in the rookie pool against other newcomers and the AI bot. As you win matches, your rating climbs and you face progressively stronger opponents. Private rooms have no matchmaking — you choose your opponents directly.',
      },
      {
        question: 'Can I play multiplayer when nobody else is online?',
        answer:
          'Yes. LexiClash includes an AI bot opponent with three difficulty levels — Easy, Medium, and Hard. The bot plays at human-realistic speeds (not instant-perfect) and is a useful warm-up before facing humans. It is also the default opponent when public lobbies are empty.',
      },
      {
        question: 'Are LexiClash multiplayer matches fair? How do you prevent cheating?',
        answer:
          'Every submitted word is validated server-side against the same competitive dictionary used in Scrabble tournaments. Anagram solvers and external dictionaries do not give an edge because all valid words are equally scored — the only differentiator is how fast you find them. We also detect and block coordinated boost-rings via behavioral analysis.',
      },
    ],
  },
  he: {
    title: 'משחק מילים מרובה משתתפים — קרבות מילים בזמן אמת עם חברים',
    description:
      'LexiClash מרובה משתתפים הוא משחק מילים תחרותי בזמן אמת שבו אתם מתחרים נגד חברים ויריבים למצוא מילים על לוח משותף. ארחו חדרים פרטיים לערבי משחקים, הצטרפו ללובי ציבורי כדי לבדוק את הכישורים שלכם מול העולם, או אתגרו את הבוט כשאף אחד לא מחובר.',
    features: [
      'חדרים פרטיים עם הגדרות מותאמות אישית — הזמינו חברים באמצעות קישור או קוד חדר',
      'לובי ציבורי לשיבוץ — התאמה עם יריבים ברמה דומה תוך שניות',
      'ניקוד בזמן אמת עם פיד מילים חי של היריב — ראו מה הם מוצאים בזמן שהם מוצאים',
      'טיימרים, גדלי לוח וכללי ניקוד מתכווננים למשחק קז\'ואלי או תחרותי',
    ],
    faq: [
      {
        question: 'איך מתחילים משחק מרובה משתתפים עם חברים?',
        answer:
          'לחצו על "צור חדר", התאימו את ההגדרות (טיימר, גודל לוח, סבבים), ושתפו את הקישור או הקוד עם חברים. הם מצטרפים מיד — ללא צורך בחשבון.',
      },
      {
        question: 'האם LexiClash מרובה משתתפים חינמי?',
        answer:
          'כן — LexiClash מרובה משתתפים חינמי לחלוטין ללא צורך בהורדה. שחקו ישירות בדפדפן בכל מכשיר.',
      },
    ],
  },
  sv: {
    title: 'Multiplayer-ordspel — Ordstrider i realtid med vänner',
    description:
      'LexiClash Multiplayer är ett tävlingsinriktat ordspel i realtid där du tävlar mot vänner och rivaler om att hitta ord på ett gemensamt rutnät. Skapa privata rum för spelkvällar eller gå med i offentliga lobbyer för att testa dina färdigheter mot hela världen.',
    features: [
      'Privata rum med anpassade inställningar — bjud in vänner via länk eller rumskod',
      'Offentlig matchning — matchas med motståndare på liknande nivå på sekunder',
      'Poängsättning i realtid med live-feed av motståndarens ord',
      'Justerbara rundtimer, rutnätsstorlekar och poängregler',
    ],
    faq: [
      {
        question: 'Hur startar jag ett multiplayer-ordspel med vänner?',
        answer:
          'Tryck på "Skapa rum" på multiplayer-sidan, anpassa inställningarna och dela rumslänken eller koden med vänner. De ansluter direkt — inget konto krävs.',
      },
      {
        question: 'Är LexiClash multiplayer gratis?',
        answer:
          'Ja — LexiClash multiplayer är helt gratis utan nedladdning. Spela direkt i webbläsaren på valfri enhet.',
      },
    ],
  },
  ja: {
    title: 'マルチプレイヤーワードゲーム — 友達とリアルタイム対戦',
    description:
      'LexiClashマルチプレイヤーは、友達やライバルと共有グリッド上で単語を見つけ合うリアルタイム対戦型ワードゲームです。プライベートルームを作成してゲームナイトを楽しんだり、パブリックロビーで世界中のプレイヤーと対戦しましょう。',
    features: [
      'カスタム設定のプライベートルーム — リンクやルームコードで友達を招待',
      'パブリックマッチメイキング — 同レベルの相手と数秒でマッチング',
      'リアルタイムスコアリングとライブ対戦フィード',
      '調整可能なラウンドタイマー、グリッドサイズ、スコアルール',
    ],
    faq: [
      {
        question: '友達とマルチプレイヤーワードゲームを始めるには？',
        answer:
          'マルチプレイヤーページで「ルーム作成」をタップし、設定をカスタマイズしてリンクやコードを友達に共有します。アカウント不要で即座に参加できます。',
      },
      {
        question: 'LexiClashマルチプレイヤーは無料ですか？',
        answer:
          'はい — LexiClashマルチプレイヤーはダウンロード不要で完全無料です。あらゆるデバイスのブラウザで直接プレイできます。',
      },
    ],
  },
  es: {
    title: 'Juego de Palabras Multijugador — Batallas de Palabras en Tiempo Real',
    description:
      'LexiClash Multijugador es un juego de palabras competitivo en tiempo real donde compites contra amigos y rivales para encontrar palabras en un tablero compartido. Crea salas privadas para noches de juegos, únete a lobbies públicos o desafía al bot de IA.',
    features: [
      'Salas privadas con configuración personalizada — invita amigos por enlace o código de sala',
      'Emparejamiento público — encuentra oponentes de nivel similar en segundos',
      'Puntuación en tiempo real con feed en vivo de palabras del oponente',
      'Temporizadores, tamaños de tablero y reglas de puntuación ajustables',
      'Modo espectador — observa a los mejores jugadores y aprende estrategias avanzadas',
    ],
    faq: [
      {
        question: '¿Cómo inicio un juego de palabras multijugador con amigos?',
        answer:
          'Toca "Crear Sala" en la página multijugador, personaliza la configuración y comparte el enlace o código con amigos. Se unen al instante — sin necesidad de cuenta.',
      },
      {
        question: '¿Es gratis LexiClash multijugador?',
        answer:
          'Sí — LexiClash multijugador es completamente gratis sin descarga. Juega directamente en el navegador en cualquier dispositivo.',
      },
      {
        question: '¿Cuántos jugadores pueden unirse a una sala?',
        answer:
          'Las salas multijugador admiten hasta 8 jugadores compitiendo simultáneamente en el mismo tablero. Para grupos más grandes, prueba el Modo Fiesta.',
      },
    ],
  },
};

export default async function MultiplayerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] ?? seoContent.en;
  const origin = 'https://www.lexiclash.live';
  return (
    <>
      {/* Preload the lobby hero mascot from the FIRST server HTML response so the
          browser fetches it while the (ssr:false) multiplayer JS downloads — the
          mascot is the LCP element once the lobby mounts. first-timer variant is
          the cold-visit case; returning users have it cached. React hoists this
          rel=preload link into <head>. */}
      <link rel="preload" as="image" href="/mascot/play.webp" type="image/webp" fetchPriority="high" />
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
      <GamePageSeoContent
        asH1
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
      />
    </>
  );
}
