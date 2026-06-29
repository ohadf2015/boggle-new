'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { BookOpen, Zap, Target } from 'lucide-react';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from '@/components/ads';

const guidesContent: Record<string, {
  title: string;
  subtitle: string;
  quickStart: string;
  generalTips: string;
  guides: Array<{ slug: string; title: string; description: string; icon: 'classic' | 'blast' | 'wordHunt' }>;
  faq: Array<{ question: string; answer: string }>;
  faqHeading: string;
  educationCta: { heading: string; body: string; links: Array<{ label: string; path: string }> };
}> = {
  en: {
    title: 'LexiClash Strategy Guides',
    subtitle: 'Master every game mode with expert strategies, tips, and techniques.',
    quickStart: 'New to LexiClash? Start with Classic mode. It\'s the quickest way to pick up grid scanning, and the time pressure builds good habits fast. Blast makes more sense after a few Classic games — the combo system clicks once you already know how to find words. Word Hunt runs on different logic; it rewards patience over speed. Each guide covers specific scoring patterns for that mode.',
    generalTips: 'Across every mode, the letters S, R, T, L, N, and E appear most often — train your eye to spot them first. Quick -ING and -ED endings are easy points off any root word. If you\'re stuck after 30 seconds, check the center of the grid. Most players scan the edges first and miss words hiding in the middle. Two more patterns worth learning: short words with Q and X (QI, OX, AX) score higher than most players expect and are easy to miss. Plurals are free points — if you found CAT, immediately look for CATS. Before time runs out, a fast scan for two-letter words (AM, IS, BE, DO, GO, HI, UP) can squeeze out 10–20 bonus points. These small habits compound fast, especially in Blast where every second between words feeds the combo.',
    guides: [
      { slug: 'classic-strategy', title: 'Classic Mode Strategy', description: 'Learn scanning patterns, time management, and scoring strategies to find more words and score higher.', icon: 'classic' },
      { slug: 'blast-strategy', title: 'Blast Mode Mastery', description: 'Unlock the combo system, master tile effects, and chain your way to massive scores.', icon: 'blast' },
      { slug: 'word-hunt-strategy', title: 'Word Hunt Strategy', description: 'Master elimination strategy, vowel placement, and clue interpretation to solve puzzles faster.', icon: 'wordHunt' },
    ],
    faqHeading: 'Common Questions',
    faq: [
      { question: 'What is the best strategy for Classic mode?', answer: 'Scan the grid systematically — start from corners and edges where longer words tend to hide. Look for common prefixes (UN-, RE-, PRE-) and suffixes (-ING, -TION, -ED) to quickly spot longer words.' },
      { question: 'How do combos work in Blast mode?', answer: 'Finding words in quick succession builds a combo multiplier. The faster you chain words, the higher the multiplier climbs. Focus on short 3-4 letter words to keep the combo going, then hit a long word for maximum points.' },
      { question: 'Are there guides for beginners?', answer: 'Yes — our guides cover basics to advanced. Start with the Classic mode guide to learn grid scanning, then progress to Blast and Word Hunt strategies as you improve.' },
      { question: 'Which LexiClash mode has the best scoring potential?', answer: 'Blast mode has the highest scoring ceiling thanks to its combo multiplier. A sustained combo of 10+ words capped with a long finishing word can score several times more than the same words played in Classic. That said, Classic rewards vocabulary depth — words of 7+ letters score disproportionately well, so strong-vocabulary players are fully competitive there.' },
      { question: 'How long does it take to get good at LexiClash?', answer: 'Most players notice clear improvement within 5–10 games. The pattern that clicks first: scanning for -ING and -ED endings. After around 20 games, players start anticipating common letter clusters and can survey a full board in under five seconds. Reaching the top 25% on the leaderboard takes most players roughly 50 games — short daily sessions build word recognition faster than longer infrequent ones.' },
    ],
    educationCta: {
      heading: 'Using LexiClash in the Classroom?',
      body: 'Teachers run live vocabulary competitions and spelling practice across five languages. Students at every level compete in real time — no setup needed.',
      links: [
        { label: 'Education Hub', path: 'education' },
        { label: 'LexiClash for Schools', path: 'education/for-schools' },
        { label: 'ESL Word Games', path: 'education/esl-word-games' },
      ],
    },
  },
  he: {
    title: 'מדריכי אסטרטגיה של לקסיקלאש',
    subtitle: 'שלטו בכל מצב משחק עם אסטרטגיות מומחים, טיפים וטכניקות.',
    quickStart: 'חדשים ב-LexiClash? התחילו במצב קלאסי. הוא הדרך המהירה ביותר ללמוד סריקת לוח תחת לחץ זמן. בלאסט כדאי לקרוא שנייה — מערכת הקומבו מובנת הרבה יותר לאחר כמה משחקי קלאסי. ציד מילים פועל לפי היגיון שונה לגמרי ומתגמל סבלנות על פני מהירות. כל מדריך מכסה תבניות ניקוד ספציפיות למצב המשחק שלו.',
    generalTips: 'בכל מצב משחק, האותיות הנפוצות ביותר בלוח הן מ, ל, ו, ב, ה, ש — אמנו את העין לאתרן ראשונות. סיומות נפוצות הן נקודות מהירות. אם נתקעתם אחרי 30 שניות, בדקו את מרכז הלוח — רוב השחקנים מתרכזים בקצוות ומפספסים מילים במרכז. שתי תבניות נוספות שכדאי ללמוד: מילים קצרות עם ק וצ מניבות יותר נקודות ממה שרוב השחקנים מצפים. רבים הם נקודות חינמיות — אם מצאתם חתול, חפשו מיד חתולים. לפני שנגמר הזמן, סריקה מהירה של מילים בנות שתי אותיות יכולה לסחוט עוד 10–20 נקודות. ההרגלים הקטנים האלה מצטברים מהר, במיוחד בבלאסט שבו כל שנייה בין מילה למילה מזינה את הקומבו.',
    guides: [
      { slug: 'classic-strategy', title: 'אסטרטגיית מצב קלאסי', description: 'למדו תבניות סריקה, ניהול זמן ואסטרטגיות ניקוד למציאת יותר מילים וניקוד גבוה יותר.', icon: 'classic' },
      { slug: 'blast-strategy', title: 'שליטה במצב בלאסט', description: 'פענחו את מערכת הקומבו, שלטו באפקטי אריחים ושרשרו לניקוד מסיבי.', icon: 'blast' },
      { slug: 'word-hunt-strategy', title: 'אסטרטגיית ציד מילים', description: 'שלטו באסטרטגיית אלימינציה, מיקום תנועות ופירוש רמזים לפתרון מהיר יותר.', icon: 'wordHunt' },
    ],
    faqHeading: 'שאלות נפוצות',
    faq: [
      { question: 'מה האסטרטגיה הטובה ביותר למצב קלאסי?', answer: 'סרקו את הלוח בשיטתיות — התחילו מפינות וקצוות. חפשו תחיליות וסיומות נפוצות למציאת מילים ארוכות.' },
      { question: 'איך עובדים הקומבו במצב בלאסט?', answer: 'מציאת מילים ברצף מהיר בונה מכפיל קומבו. ככל שמשרשרים מהר יותר, המכפיל עולה. התמקדו במילים קצרות של 3-4 אותיות ואז הכו במילה ארוכה לניקוד מקסימלי.' },
      { question: 'האם יש מדריכים למתחילים?', answer: 'כן — המדריכים מכסים מהבסיסי ועד המתקדם. התחילו עם מדריך מצב קלאסי ואז התקדמו לאסטרטגיות בלאסט וציד מילים.' },
      { question: 'איזה מצב משחק מציע את פוטנציאל הניקוד הגבוה ביותר?', answer: 'מצב בלאסט מציע את תקרת הניקוד הגבוהה ביותר הודות למכפיל הקומבו שלו. קומבו מתמשך עם מילה ארוכה בסוף יכול להניב כמה פעמים יותר ממה שניתן להרוויח מאותן מילים במצב קלאסי. עם זאת, קלאסי מתגמל ידע לשוני — מילים של 7 אותיות ומעלה צוברות ניקוד גבוה במיוחד.' },
      { question: 'כמה זמן לוקח להשתפר ב-LexiClash?', answer: 'רוב השחקנים שמים לב לשיפור ניכר תוך 5–10 משחקים. הדפוס שמתחיל לעבוד ראשון: סריקה אחר סיומות נפוצות. אחרי כ-20 משחקים מתחילים לאתר צברי אותיות ולסרוק לוח שלם תוך פחות מ-5 שניות. להגיע לרבע העליון בטבלה לוקח בממוצע כ-50 משחקים — משחק יומי קצר בונה זיהוי מילים מהר יותר ממפגשים ארוכים ולא תכופים.' },
    ],
    educationCta: {
      heading: 'משתמשים ב-LexiClash בכיתה?',
      body: 'מורים מנהלים תחרויות אוצר מילים חיות ותרגול כתיב בחמש שפות. תלמידים בכל הרמות מתחרים בזמן אמת — ללא הגדרה מוקדמת.',
      links: [
        { label: 'מרכז חינוך', path: 'education' },
        { label: 'LexiClash למוסדות חינוך', path: 'education/for-schools' },
        { label: 'משחקי מילים לאנגלית כשפה זרה', path: 'education/esl-word-games' },
      ],
    },
  },
  sv: {
    title: 'LexiClash Strategiguider',
    subtitle: 'Bemestra varje spelmod med expertstrategier, tips och tekniker.',
    quickStart: 'Ny på LexiClash? Börja med Klassiskt. Det är det snabbaste sättet att lära sig rutnätsskanning under tidspress. Blast är mer meningsfullt efter några Klassiska spel — kombosystemet faller på plats när du redan vet hur man hittar ord. Word Hunt följer en annan logik; det belönar tålamod framför hastighet. Varje guide täcker specifika poängmönster för det läget.',
    generalTips: 'I alla lägen förekommer bokstäverna E, A, R, S, T och N oftast — träna ögat att hitta dem snabbt. Vanliga -ING och -ER ändelser ger snabba poäng. Kör du fast efter 30 sekunder, kolla mitten av rutnätet. De flesta spelare skannar kanterna och missar ord som gömmer sig i mitten. Två mönster värda att lära sig: korta ord med Q och X ger högre poäng än de flesta förväntar sig. Pluralformer är gratispoäng — hittade du KATT, leta genast efter KATTER. Innan tiden tar slut kan en snabb genomsökning efter tvåbokstavsord (ÄR, OM, NU, HÄR, ÅT) pressa ut 10–20 bonuspoäng. Dessa små vanor ger stor effekt, särskilt i Blast där varje sekund mellan ord driver kombomultiplikatorn.',
    guides: [
      { slug: 'classic-strategy', title: 'Klassisk Strategi', description: 'Lar dig skanningsmonster, tidshantering och poangstrategier for att hitta fler ord.', icon: 'classic' },
      { slug: 'blast-strategy', title: 'Blast-lage Mesterskap', description: 'Las upp kombosystemet, bemestra platteffekter och kedja till massiva poang.', icon: 'blast' },
      { slug: 'word-hunt-strategy', title: 'Word Hunt Strategi', description: 'Bemestra eliminering, vokalplacering och ledtradstolkning for snabbare losning.', icon: 'wordHunt' },
    ],
    faqHeading: 'Vanliga frågor',
    faq: [
      { question: 'Vad är den bästa strategin för Klassiskt läge?', answer: 'Skanna rutnätet systematiskt — börja från hörn och kanter. Leta efter vanliga prefix och suffix för att snabbt hitta långa ord.' },
      { question: 'Hur fungerar kombos i Blast-läge?', answer: 'Att hitta ord i snabb följd bygger en kombomultiplikator. Ju snabbare du kedjar ord, desto högre stiger multiplikatorn. Fokusera på korta 3-4 bokstavsord och slå sedan ett långt ord för maxpoäng.' },
      { question: 'Finns det guider för nybörjare?', answer: 'Ja — guiderna täcker allt från grunderna till avancerat. Börja med Klassiskt läge för att lära dig rutnätsskanning, gå sedan vidare till Blast och Word Hunt.' },
      { question: 'Vilket spelläge har bäst poängpotential?', answer: 'Blast-läge har det högsta poängtaket tack vare sitt kombomultiplikatorsystem. En ihållande kombo med ett långt avslutningsord kan ge flera gånger mer poäng än samma ord spelade i Klassiskt. Klassiskt belönar ordförrådsdjup — ord på 7+ bokstäver poängsätts oproportionerligt bra.' },
      { question: 'Hur lång tid tar det att bli bra på LexiClash?', answer: 'De flesta spelare märker tydlig förbättring inom 5–10 spel. Mönstret som brukar klicka in först: att skanna efter vanliga ändelser. Efter ~20 spel börjar man förutse vanliga bokstavskombinationer och kan skanna ett bräde på under fem sekunder. Att nå topp 25% på topplistan tar ungefär 50 spel — korta dagliga sessioner bygger ordigenkänning snabbare än långa ovanliga.' },
    ],
    educationCta: {
      heading: 'Använder du LexiClash i klassrummet?',
      body: 'Lärare kör live-ordtävlingar och stavningsövningar på fem språk. Elever på alla nivåer tävlar i realtid — ingen förberedelse krävs.',
      links: [
        { label: 'Utbildningshub', path: 'education' },
        { label: 'LexiClash för skolor', path: 'education/for-schools' },
        { label: 'Engelska som andraspråk', path: 'education/esl-word-games' },
      ],
    },
  },
  ja: {
    title: 'LexiClash 攻略ガイド',
    subtitle: 'エキスパートの戦略、ヒント、テクニックですべてのゲームモードをマスター。',
    quickStart: 'LexiClashが初めて？クラシックモードから始めましょう。タイムプレッシャーの中でグリッドスキャンをすばやく身につけられます。ブラストはクラシックを数回プレイした後に読むと理解しやすい — 単語の見つけ方がわかると、コンボシステムがすっと入ってきます。ワードハントはまた別のロジックで動いていて、速さより粘り強さが大事です。各ガイドはそのモード固有のスコアパターンをカバーしています。',
    generalTips: 'どのモードでも使えるコツ: 短い単語(3〜4文字)でコンボをつなぎながら、長い単語を探しましょう。30秒後も詰まっているなら、グリッドの中央付近を確認してください。端から探すことに慣れると、中央を見落としがちです。さらに覚えておきたいパターン: 2文字の単語（に、は、が、で、を）は見落としがちですが確実なポイントになります。複数形や活用形も狙い目で、一つの語根から複数の単語が作れます。時間切れ前の最後の10秒で、短い単語を素早くスキャンするだけで10〜20ポイント上乗せできます。こうした細かい積み重ねが、特にブラストのコンボ中に大きな差を生み出します。',
    guides: [
      { slug: 'classic-strategy', title: 'クラシックモード攻略', description: 'スキャンパターン、時間管理、スコアリング戦略を学んでもっと単語を見つけよう。', icon: 'classic' },
      { slug: 'blast-strategy', title: 'ブラストモード攻略', description: 'コンボシステムを解き明かし、タイルエフェクトをマスターしてハイスコアを狙おう。', icon: 'blast' },
      { slug: 'word-hunt-strategy', title: 'ワードハント攻略', description: '消去法、母音配置、ヒントの解釈をマスターしてパズルを速く解こう。', icon: 'wordHunt' },
    ],
    faqHeading: 'よくある質問',
    faq: [
      { question: 'クラシックモードの最良の戦略は？', answer: 'グリッドを体系的にスキャン — 角と端から始めましょう。一般的な接頭辞と接尾辞を探して長い単語を見つけましょう。' },
      { question: 'ブラストモードのコンボはどう機能しますか？', answer: '素早く連続して単語を見つけることでコンボマルチプライヤーが積み上がります。3〜4文字の短い単語でコンボをつなぎ、長い単語でポイントを最大化しましょう。' },
      { question: '初心者向けのガイドはありますか？', answer: 'はい — 初心者から上級者まで対応しています。まずクラシックモードのガイドでグリッドスキャンを学び、次にブラストとワードハントの戦略へ進みましょう。' },
      { question: 'どのゲームモードが一番得点を稼ぎやすいですか？', answer: 'ブラストモードはコンボマルチプライヤーシステムのおかげで最も高いスコアを狙えます。10単語以上のコンボを維持して長い単語で締めくくると、クラシックモードの何倍もの得点になることがあります。ただし、クラシックは語彙力が直接報われ、7文字以上の単語は特に高得点です。' },
      { question: 'LexiClashが上手くなるまでどのくらいかかりますか？', answer: 'ほとんどのプレイヤーは5〜10ゲームで明確な上達を感じます。最初に身につくパターンは、よく出る接尾辞への素早い反応です。約20ゲーム後には一般的な文字の組み合わせを予測し、5秒以内にグリッド全体をスキャンできるようになります。上位25%に入るには多くのプレイヤーで約50ゲームかかります — 毎日の短いセッションの方が効果的です。' },
    ],
    educationCta: {
      heading: 'LexiClashを教室で活用していますか？',
      body: '教師は5言語でライブ語彙コンテストや綴り練習を実施しています。あらゆるレベルの生徒がリアルタイムで競えます。',
      links: [
        { label: '教育ハブ', path: 'education' },
        { label: '学校向けLexiClash', path: 'education/for-schools' },
        { label: 'ESL単語ゲーム', path: 'education/esl-word-games' },
      ],
    },
  },
  es: {
    title: 'Guias de Estrategia LexiClash',
    subtitle: 'Domina cada modo de juego con estrategias expertas, consejos y tecnicas.',
    quickStart: '¿Nuevo en LexiClash? Empieza con el modo Clásico. Es la forma más rápida de aprender el escaneo de cuadrícula bajo presión de tiempo. Blast tiene más sentido después de algunas partidas Clásicas — el sistema de combos encaja en cuanto ya sabes encontrar palabras. Word Hunt funciona con una lógica distinta; recompensa la paciencia sobre la velocidad. Cada guía cubre patrones de puntuación específicos para ese modo.',
    generalTips: 'En todos los modos, las letras E, A, O, S, R y N son las más frecuentes — entrena el ojo para detectarlas primero. Los sufijos -AR, -ER, -ANDO y -CIÓN son puntos rápidos sobre cualquier raíz. Si te quedas bloqueado después de 30 segundos, revisa el centro del tablero. La mayoría de jugadores escanea los bordes primero y pierde palabras en el medio. Dos patrones más que vale la pena aprender: los plurales son puntos gratis — si encontraste GATO, busca GATOS de inmediato. Antes de que se acabe el tiempo, un rápido vistazo a palabras cortas (ES, UN, SI, YA, VA) puede sumar 10–20 puntos extra. Estos pequeños hábitos se acumulan rápido, especialmente en Blast donde cada segundo entre palabras alimenta el multiplicador de combo.',
    guides: [
      { slug: 'classic-strategy', title: 'Estrategia Modo Clasico', description: 'Aprende patrones de escaneo, gestion del tiempo y estrategias de puntuacion.', icon: 'classic' },
      { slug: 'blast-strategy', title: 'Dominio Modo Blast', description: 'Desbloquea el sistema de combos, domina efectos de fichas y encadena puntajes masivos.', icon: 'blast' },
      { slug: 'word-hunt-strategy', title: 'Estrategia Word Hunt', description: 'Domina la eliminacion, colocacion de vocales e interpretacion de pistas.', icon: 'wordHunt' },
    ],
    faqHeading: 'Preguntas frecuentes',
    faq: [
      { question: '¿Cuál es la mejor estrategia para el modo Clásico?', answer: 'Escanea la cuadrícula sistemáticamente — comienza por esquinas y bordes. Busca prefijos y sufijos comunes para encontrar palabras largas rápidamente.' },
      { question: '¿Cómo funcionan los combos en el modo Blast?', answer: 'Encontrar palabras en rápida sucesión construye un multiplicador de combo. Enfócate en palabras cortas de 3-4 letras para mantener el combo activo, luego golpea con una palabra larga para máximos puntos.' },
      { question: '¿Hay guías para principiantes?', answer: 'Sí — nuestras guías cubren desde lo básico hasta lo avanzado. Comienza con el modo Clásico para aprender a escanear la cuadrícula, luego avanza a Blast y Word Hunt.' },
      { question: '¿Qué modo de juego tiene mayor potencial de puntuación?', answer: 'El modo Blast tiene el mayor techo de puntuación gracias a su sistema de multiplicador de combo. Un combo sostenido con una palabra larga al final puede dar varias veces más puntos que las mismas palabras jugadas en Clásico. Dicho esto, Clásico recompensa el vocabulario — las palabras largas (7+ letras) puntúan especialmente bien.' },
      { question: '¿Cuánto tiempo tarda uno en mejorar en LexiClash?', answer: 'La mayoría nota una mejora clara en 5–10 partidas. El patrón que suele encajar primero: buscar sufijos comunes como -AR, -ANDO y -CIÓN. Después de ~20 partidas se anticipan combinaciones frecuentes y se puede escanear un tablero en menos de cinco segundos. Llegar al 25% superior del marcador tarda unas 50 partidas — sesiones cortas diarias son más efectivas que sesiones largas ocasionales.' },
    ],
    educationCta: {
      heading: '¿Usas LexiClash en el aula?',
      body: 'Los profesores organizan competiciones de vocabulario en vivo y práctica de ortografía en cinco idiomas. Alumnos de todos los niveles compiten en tiempo real.',
      links: [
        { label: 'Centro educativo', path: 'education' },
        { label: 'LexiClash para instituciones', path: 'education/for-schools' },
        { label: 'Juegos de palabras en inglés', path: 'education/esl-word-games' },
      ],
    },
  },
};

const iconMap = {
  classic: BookOpen,
  blast: Zap,
  wordHunt: Target,
};

const colorMap = {
  classic: 'bg-neo-lime',
  blast: 'bg-neo-orange',
  wordHunt: 'bg-neo-cyan',
};

export default function GuidesIndexPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = (params.locale as string) || language;
  const isDarkMode = theme === 'dark';
  const content = guidesContent[locale] || guidesContent.en;

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <main className="max-w-4xl mx-auto px-4 py-8 page-content-safe">
        <header className="mb-10 text-center">
          <h1 className={cn(
            'text-3xl md:text-4xl font-black mb-4',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {content.title}
          </h1>
          <p className={cn('text-lg', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {content.subtitle}
          </p>
          <p className={cn('text-sm mt-4 max-w-2xl mx-auto leading-relaxed', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
            {content.quickStart}
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {content.guides.map((guide) => {
            const Icon = iconMap[guide.icon];
            const bgColor = colorMap[guide.icon];
            return (
              <Link key={guide.slug} href={`/${locale}/guides/${guide.slug}`}>
                <div className={cn(
                  'h-full p-6 rounded-neo border-3 border-neo-black shadow-hard transition-transform hover:-translate-y-1 hover:shadow-hard-lg',
                  isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
                )}>
                  <div className={cn(
                    'w-12 h-12 rounded-neo border-2 border-neo-black flex items-center justify-center mb-4',
                    bgColor
                  )}>
                    <Icon className="w-6 h-6 text-neo-black" />
                  </div>
                  <h2 className={cn(
                    'text-lg font-bold mb-2',
                    isDarkMode ? 'text-white' : 'text-neo-black'
                  )}>
                    {guide.title}
                  </h2>
                  <p className={cn(
                    'text-sm leading-relaxed',
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    {guide.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <p className={cn(
          'mt-8 text-sm leading-relaxed max-w-2xl mx-auto text-center',
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        )}>
          {content.generalTips}
        </p>

        <section className="mt-10 max-w-2xl mx-auto">
          <h2 className={cn(
            'text-xl font-bold mb-5',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {content.faqHeading}
          </h2>
          <dl className="space-y-4">
            {content.faq.map((item) => (
              <div key={item.question} className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
              )}>
                <dt className={cn('font-semibold mb-1', isDarkMode ? 'text-neo-cream' : 'text-neo-black')}>
                  {item.question}
                </dt>
                <dd className={cn('text-sm leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={cn(
          'mt-10 max-w-2xl mx-auto p-6 rounded-neo border-2 border-neo-black',
          isDarkMode ? 'bg-neo-navy-light' : 'bg-neo-lime/10'
        )}>
          <h2 className={cn('text-lg font-bold mb-2', isDarkMode ? 'text-neo-lime' : 'text-neo-black')}>
            {content.educationCta.heading}
          </h2>
          <p className={cn('text-sm leading-relaxed mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {content.educationCta.body}
          </p>
          <ul className="flex flex-wrap gap-3">
            {content.educationCta.links.map((link) => (
              <li key={link.path}>
                <Link
                  href={`/${locale}/${link.path}`}
                  className={cn(
                    'text-sm font-semibold underline underline-offset-2',
                    isDarkMode ? 'text-neo-cyan hover:text-neo-cyan/80' : 'text-neo-black hover:opacity-70'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <InlineBannerAd webZone="content-page" className="mt-8" />
      </main>
    </div>
  );
}
