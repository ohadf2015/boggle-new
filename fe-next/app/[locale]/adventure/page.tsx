import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import AdventurePageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // BETA-gated (PageClient redirects non-beta users) — noindexed 2026-07-02
  // so search/AdSense reviewers don't land on a wall. Restore index (here,
  // in layout.tsx and in app/sitemap.ts) when Adventure goes GA.
  return generatePageMetadata({ seoKey: 'adventure', path: '/adventure', locale, noIndex: true });
}

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Word Adventure Game – RPG Word Puzzle with 100 Levels & Boss Battles',
    description:
      'Embark on an epic RPG word adventure game with 100 levels across 10 themed worlds. Battle word bosses, unlock skill trees, and master special tiles like fire, ice, bomb, and lightning in this free word puzzle RPG. Level up your character, collect power-ups, and conquer every world in the ultimate word game with levels and bosses.',
    features: [
      '100 hand-crafted levels across 10 themed worlds (forest, volcano, ice, dungeon, and more)',
      'Epic boss battles where you defeat enemies by solving word puzzles',
      'Special tiles: fire, ice, bomb, lightning, poison, and heal — each with unique effects',
      'Full skill tree and character progression system with unlockable power-ups',
      'Earn XP, level up, and customize your hero as you advance through the adventure',
    ],
    faq: [
      {
        question: 'What is this RPG word puzzle game?',
        answer:
          'LexiClash Adventure is a free RPG word puzzle game where you progress through 100 levels across 10 themed worlds, solving word puzzles to defeat enemies and bosses while unlocking skills and power-ups.',
      },
      {
        question: 'Is the word adventure game free to play?',
        answer:
          'Yes — the word adventure game is completely free. You can play all 100 levels, unlock skills, and experience boss battles without any cost.',
      },
      {
        question: 'How does the word game with levels and bosses work?',
        answer:
          'Each world contains 10 levels culminating in a boss battle. Spell words on the board to deal damage, use special tiles for bonus effects, and build your skill tree to strengthen your character.',
      },
      {
        question: 'What are special tiles in the word puzzle RPG?',
        answer:
          'Special tiles appear on the board and trigger effects when used in a word: fire deals burn damage, ice freezes enemies, bomb clears tiles, lightning chains to adjacent tiles, poison adds damage over time, and heal restores your HP.',
      },
      {
        question: 'How do skill trees and character progression work?',
        answer:
          'As you complete levels you earn XP and level up, unlocking skill tree nodes that boost word power, tile effects, HP, and special abilities — letting you customize your playstyle for each world.',
      },
    ],
  },
  he: {
    title: 'משחק מילים הרפתקני – RPG מילים עם 100 שלבים וקרבות בוסים',
    description:
      'צאו להרפתקה אפית של משחק מילים בסגנון RPG עם 100 שלבים ב-10 עולמות ייחודיים. הילחמו בבוסים, פתחו עצי מיומנויות ושלטו באריחים מיוחדים כמו אש, קרח ופצצה. שדרגו את הדמות שלכם וכבשו כל עולם בחינם.',
    features: [
      '100 שלבים עיצוביים ב-10 עולמות בעלי נושאים שונים: יער, הר געש, קרח, מבוך ועוד',
      'קרבות בוסים אפיים בהם תנצחו אויבים על ידי פתרון חידות מילים',
      'אריחים מיוחדים: אש, קרח, פצצה, ברק, רעל וריפוי – כל אחד עם אפקטים ייחודיים',
      'עץ מיומנויות מלא ומערכת התקדמות דמות עם שדרוגים לפתיחה',
      'צברו ניסיון, עלו ברמה והתאמה אישית של הגיבור בהתאם לסגנון המשחק שלכם',
    ],
    faq: [
      {
        question: 'מה זה משחק מילים RPG?',
        answer:
          'LexiClash Adventure הוא משחק מילים בחינם בסגנון RPG בו עוברים 100 שלבים ב-10 עולמות, פותרים חידות מילים כדי להביס אויבים ובוסים תוך פתיחת מיומנויות וכוחות.',
      },
      {
        question: 'האם המשחק בחינם?',
        answer: 'כן, המשחק חינמי לחלוטין. ניתן לשחק בכל 100 השלבים, לפתוח מיומנויות ולחוות קרבות בוסים ללא עלות.',
      },
      {
        question: 'כיצד פועלים אריחים מיוחדים?',
        answer:
          'אריחים מיוחדים מופיעים על הלוח ומפעילים אפקטים כאשר משתמשים בהם במילה: אש גורמת נזק שריפה, קרח מקפיא אויבים, פצצה מנקה אריחים, ברק מתפשט לאריחים סמוכים, רעל מוסיף נזק מתמשך, וריפוי משחזר נקודות חיים.',
      },
    ],
  },
  sv: {
    title: 'Ordäventyrsspel – RPG-ordpussel med 100 nivåer och bosstrider',
    description:
      'Ge dig ut på ett episkt RPG-ordäventyr med 100 nivåer fördelade på 10 tematiska världar. Kämpa mot ordbossar, lås upp färdighetsträd och bemästra specialbrickor som eld, is och blixt i detta gratis ordpusselspel med RPG-progression. Levla upp din karaktär och erövra varje värld.',
    features: [
      '100 noggrant designade nivåer i 10 tematiska världar: skog, vulkan, is, dungeon och mer',
      'Episka bosstrider där du besegrar fiender genom att lösa ordpussel',
      'Specialbrickor: eld, is, bomb, blixt, gift och läkning – var och en med unika effekter',
      'Fullt färdighetsträd och karaktärsprogression med upplåsbara förmågor',
      'Samla XP, levla upp och anpassa din hjälte allteftersom du avancerar',
    ],
    faq: [
      {
        question: 'Vad är ett RPG-ordpusselspel?',
        answer:
          'LexiClash Adventure är ett gratis RPG-ordspel där du tar dig igenom 100 nivåer i 10 världar, löser ordpussel för att besegra fiender och bossar medan du låser upp färdigheter och förmågor.',
      },
      {
        question: 'Är ordäventyrsspelet gratis?',
        answer: 'Ja, spelet är helt gratis. Du kan spela alla 100 nivåer, låsa upp färdigheter och uppleva bosstrider utan kostnad.',
      },
      {
        question: 'Hur fungerar specialbrickor?',
        answer:
          'Specialbrickor dyker upp på brädet och utlöser effekter när de används i ett ord: eld ger brinnande skada, is fryser fiender, bomb rensar brickor, blixt kedjar till angränsande brickor, gift ger skada över tid och läkning återställer HP.',
      },
    ],
  },
  ja: {
    title: 'ワードアドベンチャーゲーム – 100ステージ＆ボス戦のRPGワードパズル',
    description:
      '10のテーマワールド・100ステージを舞台にした本格RPGワードアドベンチャーに挑戦しよう。ワードボスを倒し、スキルツリーを解放し、炎・氷・爆弾・雷などの特殊タイルを駆使するキャラクター成長型ワードパズルゲームを無料でプレイ。レベルアップして最強のヒーローへ進化しよう。',
    features: [
      '森・火山・氷・ダンジョンなど10のテーマワールドに広がる100の手作りステージ',
      'ワードパズルを解いて敵を倒す本格ボスバトル',
      '炎・氷・爆弾・雷・毒・回復の6種類の特殊タイル（それぞれ固有の効果あり）',
      'スキルツリーとキャラクター成長システムで自分だけのビルドを構築',
      'XP獲得・レベルアップでヒーローをカスタマイズしながらアドベンチャーを進める',
    ],
    faq: [
      {
        question: 'RPGワードパズルゲームとは何ですか？',
        answer:
          'LexiClash Adventureは無料のRPGワードゲームです。10のテーマワールドに広がる100ステージを舞台に、ワードパズルで敵やボスを倒しながらスキルや能力を解放していきます。',
      },
      {
        question: 'ワードアドベンチャーゲームは無料ですか？',
        answer: 'はい、完全無料でプレイできます。100ステージすべて、スキル解放、ボスバトルをコストなしで楽しめます。',
      },
      {
        question: '特殊タイルはどのように機能しますか？',
        answer:
          '特殊タイルはボード上に出現し、単語に使うと効果が発動します。炎は燃焼ダメージ、氷は敵を凍結、爆弾はタイルを消去、雷は隣接タイルに連鎖、毒は継続ダメージ、回復はHPを回復します。',
      },
      {
        question: 'スキルツリーとキャラクター成長はどう機能しますか？',
        answer:
          'ステージをクリアするとXPと経験値を獲得してレベルアップし、ワード威力・タイル効果・HP・特殊能力を強化するスキルツリーノードを解放できます。各ワールドに合わせたビルドで攻略しましょう。',
      },
    ],
  },
  es: {
    title: 'Juego de Palabras de Aventura – RPG con 100 Niveles y Jefes Finales',
    description:
      'Embárcate en una épica aventura RPG de palabras con 100 niveles distribuidos en 10 mundos temáticos. Vence a los jefes de palabras, desbloquea árboles de habilidades y domina casillas especiales como fuego, hielo, bomba y rayo en este juego de puzzles de palabras gratuito con progresión de personaje. Sube de nivel y conquista cada mundo.',
    features: [
      '100 niveles artesanales en 10 mundos temáticos: bosque, volcán, hielo, mazmorra y más',
      'Épicas batallas contra jefes donde derrotas enemigos resolviendo puzzles de palabras',
      'Casillas especiales: fuego, hielo, bomba, rayo, veneno y curación, cada una con efectos únicos',
      'Árbol de habilidades completo y sistema de progresión de personaje con mejoras desbloqueables',
      'Gana XP, sube de nivel y personaliza tu héroe mientras avanzas por la aventura',
    ],
    faq: [
      {
        question: '¿Qué es un juego de puzzles de palabras RPG?',
        answer:
          'LexiClash Adventure es un juego de palabras RPG gratuito donde progresas por 100 niveles en 10 mundos, resolviendo puzzles de palabras para derrotar enemigos y jefes mientras desbloqueas habilidades y poderes.',
      },
      {
        question: '¿El juego de aventura de palabras es gratis?',
        answer: 'Sí, el juego es completamente gratuito. Puedes jugar los 100 niveles, desbloquear habilidades y vivir las batallas contra jefes sin ningún coste.',
      },
      {
        question: '¿Cómo funcionan las casillas especiales?',
        answer:
          'Las casillas especiales aparecen en el tablero y activan efectos al usarlas en una palabra: el fuego causa daño de quemadura, el hielo congela enemigos, la bomba elimina casillas, el rayo se encadena a casillas adyacentes, el veneno añade daño continuo y la curación restaura puntos de vida.',
      },
      {
        question: '¿Cómo funcionan el árbol de habilidades y la progresión del personaje?',
        answer:
          'Al completar niveles ganas XP y subes de nivel, desbloqueando nodos del árbol de habilidades que mejoran el poder de palabras, efectos de casillas, HP y habilidades especiales, permitiéndote personalizar tu estilo de juego para cada mundo.',
      },
    ],
  },
  ru: {
    title: 'Игра в слова-приключение — RPG-головоломка со 100 уровнями и боссами',
    description:
      'Отправляйтесь в эпическое приключение RPG в мире слов. Сражайтесь с боссами, проходите 100 уровней в 10 тематических мирах и осваивайте особые плитки — огонь, лёд, бомбу и молнию — в этой бесплатной игре-головоломке с прокачкой персонажа. Повышайте уровень и покоряйте каждый мир!',
    features: [
      '100 ручных уровней в 10 тематических мирах: лес, вулкан, лёд, подземелье и другие',
      'Эпические битвы с боссами, где вы побеждаете врагов, решая словесные головоломки',
      'Особые плитки: огонь, лёд, бомба, молния, яд и лечение — у каждой уникальный эффект',
      'Полное дерево навыков и система прогрессии персонажа с открываемыми усилениями',
      'Зарабатывайте опыт, повышайте уровень и настраивайте героя по мере прохождения',
    ],
    faq: [
      {
        question: 'Что такое RPG-головоломка со словами?',
        answer:
          'LexiClash Adventure — это бесплатная RPG-игра со словами, в которой вы проходите 100 уровней в 10 тематических мирах, решая словесные головоломки, чтобы побеждать врагов и боссов, открывая навыки и усиления.',
      },
      {
        question: 'Бесплатна ли игра в слова-приключение?',
        answer: 'Да, игра полностью бесплатна. Вы можете пройти все 100 уровней, открыть навыки и сразиться с боссами без каких-либо затрат.',
      },
      {
        question: 'Как работают особые плитки?',
        answer:
          'Особые плитки появляются на поле и активируют эффекты, когда используются в слове: огонь наносит урон ожогом, лёд замораживает врагов, бомба убирает плитки, молния поражает соседние плитки, яд добавляет урон со временем, а лечение восстанавливает здоровье.',
      },
      {
        question: 'Как работают дерево навыков и прогрессия персонажа?',
        answer:
          'Проходя уровни, вы получаете опыт и повышаете уровень, открывая узлы дерева навыков, которые усиливают силу слов, эффекты плиток, здоровье и особые способности — чтобы адаптировать стиль игры под каждый мир.',
      },
    ],
  },
};

export default async function AdventurePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] || seoContent.en;
  const origin = 'https://www.lexiclash.live';
  return (
    <>
      <VideoGameJsonLd
        mode="adventure"
        locale={locale}
        name={content.title}
        description={content.description}
        playMode="SinglePlayer"
        numberOfPlayers={{ minValue: 1, maxValue: 1 }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'LexiClash', url: `${origin}/${locale}` },
          { name: content.title, url: `${origin}/${locale}/adventure` },
        ]}
      />
      <AdventurePageClient />
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
