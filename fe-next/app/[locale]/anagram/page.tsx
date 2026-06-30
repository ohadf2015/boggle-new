import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { EsScrabbleCrossLink } from '@/components/seo/EsScrabbleCrossLink';
import { SvScrabbleCrossLink } from '@/components/seo/SvScrabbleCrossLink';
import { HeScrabbleCrossLink } from '@/components/seo/HeScrabbleCrossLink';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { enOnlyAlternates } from '@/lib/seo/enOnlyAlternates';

const anagramSeoContent: Record<string, {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}> = {
  en: {
    title: 'Free Anagram Solver — Find Every Word From Any Letters',
    description:
      'The LexiClash anagram solver finds every valid word you can spell from a pool of letters. Type in 2-10 letters and instantly get a grouped, alphabetized list of every legal English word — sorted by length, scored for Scrabble and Words With Friends compatibility, and linked to definitions. The solver runs on the same competitive dictionary that powers LexiClash multiplayer matches, so the words it returns are the words that count in real tournament play. No signup, no install, no ad-wall — just paste your letters into the URL and read the result.',
    features: [
      'Finds every valid word from any 2-10 letter pool in under 100ms — no waiting, no ads to skip',
      'Groups results by length so you can scan long, high-scoring plays first',
      'Same competitive dictionary as LexiClash multiplayer — words returned are tournament-legal',
      'Tap any word to see its definition, etymology, and Scrabble / Words With Friends point value',
      'Works for crossword help, Scrabble racks, Words With Friends bingo finder, and Boggle path planning',
      'Mobile-friendly URL-driven interface — bookmark frequent rack patterns for one-tap reuse',
      'Free forever, no signup, runs entirely in your browser with zero data sent to third parties',
    ],
    faq: [
      {
        question: 'How does the anagram solver work?',
        answer:
          'You enter a letter pool (e.g. "listen") into the URL — /anagram/listen — and the solver returns every valid English word that can be spelled using those exact letters or a subset of them. It checks against a 280,000-word competitive dictionary, then groups results by length so long, high-scoring words appear first. The whole process runs locally in your browser in under 100ms.',
      },
      {
        question: 'Is this a Scrabble word finder or a Words With Friends solver?',
        answer:
          'Both. LexiClash uses a competitive dictionary that matches the TWL (Tournament Word List) used by official Scrabble play in North America, with SOWPODS additions for international rules. Every word returned is legal in both Scrabble and Words With Friends, and tap-through reveals the point value under each game\'s scoring system.',
      },
      {
        question: 'How is this different from other free anagram tools online?',
        answer:
          'Most free anagram solvers either bury results behind ad clicks, limit you to short letter pools, or use thin word lists that miss the 7- and 8-letter bingos that win games. LexiClash is ad-free for the solver itself, supports up to 10 letters, returns every valid word in one pass, and links each word to its full dictionary entry. The solver is also the same one used to validate words in LexiClash multiplayer matches — so what you find here is what scores in a real game.',
      },
      {
        question: 'Can the anagram solver help with crossword puzzles?',
        answer:
          'Yes. If you have a partial clue like "5-letter word with letters A, E, R, S, T" — enter "aerst" into the solver and it returns every 5-letter combination (rates, stare, tares, tears, aster, resat). For pattern matching (e.g. "S?A?E"), use the Word Solver tool linked below, which supports wildcards in addition to letter pool matching.',
      },
      {
        question: 'Why are some words missing from the results?',
        answer:
          'The solver uses a competitive tournament dictionary, which is stricter than a regular reading dictionary. Proper nouns (names, places, brands), abbreviations, hyphenated words, and most very recent slang are excluded because they\'re not legal in tournament play. If you see a word you expect missing, it\'s usually because it falls into one of those categories.',
      },
      {
        question: 'What are the best 7-letter words for Scrabble bingos?',
        answer:
          'The most valuable 7-letter bingos in competitive Scrabble include RETINAS, STAINER, NASTIER, RETSINA, ANESTRI, ANTSIER, and RATINES — all anagrams of the same letter set. High-volume bingo letters are A, E, I, N, R, S, T because they form the most flexible stems. The solver groups all of these together when you enter the 7-letter rack — try /anagram/aeinrst.',
      },
    ],
  },
  he: {
    title: 'פותר אנגרמות חינם — מצאו כל מילה מכל אותיות',
    description:
      'פותר האנגרמות של LexiClash מוצא כל מילה תקפה שאפשר לאיית מאוסף אותיות. הקלידו 2-10 אותיות וקבלו מיד רשימה אלפביתית מקובצת של כל מילה אנגלית חוקית — ממוינת לפי אורך, ומקושרת להגדרות. הפותר רץ על אותו מילון תחרותי שמפעיל את משחקי LexiClash, כך שהמילים שמתקבלות הן המילים שסופרות במשחק אמיתי. ללא הרשמה, ללא הורדה.',
    features: [
      'מוצא כל מילה תקפה מ-2-10 אותיות תוך פחות מ-100ms',
      'מקבץ תוצאות לפי אורך — מילים ארוכות ובעלות ניקוד גבוה מוצגות ראשונות',
      'אותו מילון תחרותי כמו LexiClash מרובה משתתפים',
      'לחצו על כל מילה לראות הגדרה, אטימולוגיה וניקוד Scrabble',
      'מתאים לעזרה בתשבצים, לוחות Scrabble ופאזלים של מילים',
    ],
    faq: [
      {
        question: 'איך פותר האנגרמות עובד?',
        answer:
          'הזינו אוסף אותיות (למשל "listen") ב-URL — /anagram/listen — והפותר מחזיר כל מילה אנגלית תקפה שאפשר לאיית באותן אותיות או בתת-קבוצה שלהן. הוא בודק מול מילון תחרותי של 280,000 מילים ומקבץ את התוצאות לפי אורך.',
      },
      {
        question: 'האם זה כלי Scrabble או Words With Friends?',
        answer:
          'שניהם. LexiClash משתמש במילון תחרותי שתואם ל-TWL (רשימת מילים לטורנירים) המשמשת במשחק Scrabble רשמי. כל מילה שמוחזרת חוקית בשני המשחקים.',
      },
      {
        question: 'מה ההבדל בין הכלי הזה לכלי אנגרמה אחרים?',
        answer:
          'רוב הכלים החינמיים מסתירים תוצאות מאחורי פרסומות, מגבילים אותיות, או משתמשים ברשימות מילים דקות. LexiClash ללא פרסומות בפותר עצמו, תומך עד 10 אותיות, ומחזיר כל מילה תקפה במעבר אחד.',
      },
    ],
  },
  sv: {
    title: 'Gratis Anagramlösare — Hitta Varje Ord Från Vilka Bokstäver Som Helst',
    description:
      'LexiClash anagramlösare hittar varje giltigt ord du kan stava från en pool av bokstäver. Skriv in 2-10 bokstäver och få omedelbart en grupperad, alfabetisk lista över varje lagligt engelskt ord. Anagramlösaren körs på samma tävlingsordbok som driver LexiClash multiplayer-matcher. Ingen registrering, ingen installation.',
    features: [
      'Hittar varje giltigt ord från 2-10 bokstäver på under 100ms',
      'Grupperar resultat efter längd så långa, högpoängande ord visas först',
      'Samma tävlingsordbok som LexiClash multiplayer',
      'Klicka på valfritt ord för definition och Scrabble-poäng',
      'Fungerar för korsordsord, Scrabble-ställ och Words With Friends bingo',
    ],
    faq: [
      {
        question: 'Hur fungerar anagramlösaren?',
        answer:
          'Ange en bokstavspool i URL:en — /anagram/listen — och lösaren returnerar varje giltigt engelskt ord som kan stavas med dessa bokstäver eller en delmängd.',
      },
      {
        question: 'Är detta ett Scrabble-ordfinnare eller Words With Friends-lösare?',
        answer:
          'Båda. LexiClash använder en tävlingsordbok som matchar TWL (Tournament Word List) som används i officiellt Scrabble-spel.',
      },
    ],
  },
  ja: {
    title: '無料アナグラムソルバー — どんな文字からでもすべての単語を見つける',
    description:
      'LexiClashアナグラムソルバーは、文字プールから綴れるすべての有効な単語を見つけます。2〜10文字を入力すると、長さでグループ化されアルファベット順に並べられたすべての英単語のリストが即座に表示されます。LexiClashマルチプレイヤーマッチを支える同じ競技辞書で動作します。登録不要、インストール不要。',
    features: [
      '2〜10文字のプールから100ms以内にすべての有効な単語を検索',
      '長さでグループ化 — 長く高得点な単語を先頭に表示',
      'LexiClashマルチプレイヤーと同じ競技辞書',
      '単語をタップして定義、語源、Scrabbleポイントを表示',
      'クロスワード、Scrabble、Words With Friendsに対応',
    ],
    faq: [
      {
        question: 'アナグラムソルバーはどう動作しますか？',
        answer:
          '文字プール（例：「listen」）をURLに入力すると — /anagram/listen — ソルバーはそれらの文字または部分集合で綴れるすべての有効な英単語を返します。280,000語の競技辞書と照合します。',
      },
      {
        question: 'これはScrabbleやWords With Friendsのツールですか？',
        answer:
          '両方です。LexiClashは公式Scrabbleプレイで使用されるTWL（トーナメントワードリスト）に一致する競技辞書を使用します。',
      },
    ],
  },
  es: {
    title: 'Solucionador de Anagramas Gratis — Encuentra Cada Palabra de Cualquier Letras',
    description:
      'El solucionador de anagramas de LexiClash encuentra cada palabra válida que puedes escribir con un conjunto de letras. Escribe 2-10 letras y obtén instantáneamente una lista agrupada y alfabetizada de cada palabra inglesa legal — ordenada por longitud, puntuada para compatibilidad con Scrabble y Words With Friends, y enlazada a definiciones. El solucionador funciona con el mismo diccionario competitivo que potencia las partidas multijugador de LexiClash. Sin registro, sin instalación, sin muros publicitarios.',
    features: [
      'Encuentra cada palabra válida de 2-10 letras en menos de 100ms',
      'Agrupa resultados por longitud — palabras largas y de alta puntuación primero',
      'Mismo diccionario competitivo que LexiClash multijugador',
      'Toca cualquier palabra para ver definición, etimología y puntuación Scrabble',
      'Útil para crucigramas, atriles de Scrabble y bingos de Words With Friends',
      'Gratis para siempre, sin registro, funciona completamente en tu navegador',
    ],
    faq: [
      {
        question: '¿Cómo funciona el solucionador de anagramas?',
        answer:
          'Introduces un conjunto de letras (ej. "listen") en la URL — /anagram/listen — y el solucionador devuelve cada palabra inglesa válida que puede escribirse con esas letras exactas o un subconjunto. Verifica contra un diccionario competitivo de 280,000 palabras.',
      },
      {
        question: '¿Es un buscador de palabras Scrabble o un solucionador de Words With Friends?',
        answer:
          'Ambos. LexiClash usa un diccionario competitivo que coincide con la TWL (Tournament Word List) usada en el juego Scrabble oficial en Norteamérica.',
      },
      {
        question: '¿Cómo es diferente este solucionador de otros gratuitos?',
        answer:
          'La mayoría de los solucionadores gratuitos esconden resultados detrás de clics en anuncios, limitan a letras cortas o usan listas de palabras delgadas. LexiClash no tiene anuncios en el solucionador, admite hasta 10 letras y devuelve cada palabra válida en una sola pasada.',
      },
    ],
  },
  ru: {
    title: 'Бесплатный решатель анаграмм — найдите каждое слово из любых букв',
    description:
      'Решатель анаграмм LexiClash находит каждое допустимое слово, которое можно составить из набора букв. Введите 2-10 букв и получите мгновенно сгруппированный и отсортированный список каждого допустимого английского слова — отсортированного по длине, оценено для совместимости Scrabble и Words With Friends и связано с определениями. Решатель работает на том же конкурентном словаре, который питает матчи LexiClash мультиплеер. Без регистрации, без установки, без стены объявлений.',
    features: [
      'Находит каждое допустимое слово из 2-10 букв менее чем за 100ms — без ожидания, без объявлений для пропуска',
      'Группирует результаты по длине, чтобы вы могли сначала сканировать длинные, высокооценённые ходы',
      'Тот же конкурентный словарь, что и мультиплеер LexiClash — слова, которые возвращаются, являются допустимыми в турнирах',
      'Нажмите на любое слово, чтобы увидеть его определение, этимологию и стоимость Scrabble / Words With Friends',
      'Работает для помощи в кроссворде, стеллажей Scrabble, поиска бинго Words With Friends и планирования пути Boggle',
      'Удобный интерфейс, управляемый URL — добавьте в закладки частые комбинации букв для повторного использования в один клик',
      'Бесплатно навсегда, без регистрации, работает полностью в вашем браузере без отправки данных третьим лицам',
    ],
    faq: [
      {
        question: 'Как работает решатель анаграмм?',
        answer:
          'Вы вводите набор букв (например "listen") в URL — /anagram/listen — и решатель возвращает каждое допустимое английское слово, которое можно составить, используя эти точные буквы или их подмножество. Он проверяет по конкурентному словарю из 280,000 слов, а затем группирует результаты по длине, так что длинные, высокооценённые слова появляются первыми. Весь процесс работает локально в вашем браузере менее чем за 100ms.',
      },
      {
        question: 'Это поиск слов Scrabble или решатель Words With Friends?',
        answer:
          'И то, и другое. LexiClash использует конкурентный словарь, который совпадает с TWL (Tournament Word List), используемым в официальной игре Scrabble в Северной Америке, с добавлениями SOWPODS для международных правил. Каждое возвращаемое слово допустимо как в Scrabble, так и в Words With Friends.',
      },
      {
        question: 'Чем этот решатель отличается от других бесплатных инструментов в интернете?',
        answer:
          'Большинство бесплатных решателей анаграмм либо скрывают результаты за клики на объявления, ограничивают вас короткими наборами букв, либо используют тонкие списки слов, которые упускают 7- и 8-буквенные бинго, которые выигрывают игры. LexiClash не имеет объявлений в самом решателе, поддерживает до 10 букв и возвращает каждое допустимое слово за один проход.',
      },
      {
        question: 'Может ли решатель анаграмм помочь с кроссвордами?',
        answer:
          'Да. Если у вас есть частный намек, например "5-буквенное слово с буквами A, E, R, S, T" — введите "aerst" в решатель и он вернет каждую 5-буквенную комбинацию (rates, stare, tares, tears, aster, resat).',
      },
      {
        question: 'Почему в результатах отсутствуют некоторые слова?',
        answer:
          'Решатель использует конкурентный турнирный словарь, который строже обычного словаря для чтения. Собственные имена (имена, места, бренды), сокращения, дефисные слова и большинство очень свежего сленга исключены, потому что они не допустимы в турнирной игре.',
      },
      {
        question: 'Какие лучшие 7-буквенные слова для бинго Scrabble?',
        answer:
          'Наиболее ценные 7-буквенные бинго в конкурентном Scrabble включают RETINAS, STAINER, NASTIER, RETSINA, ANESTRI, ANTSIER и RATINES — все анаграммы одного и того же набора букв. Буквы с высоким объемом бинго — A, E, I, N, R, S, T, потому что они образуют наиболее гибкие основы.',
      },
    ],
  },
};

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.lexiclash.live';

export const revalidate = 86400;

interface PageParams {
  params: Promise<{ locale: string }>;
}

const POPULAR_SEEDS = [
  'listen', 'stared', 'heart', 'stone', 'rates', 'learn', 'smart', 'great',
  'earth', 'words', 'friend', 'master', 'planet', 'action', 'dragon',
];

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en/anagram`;

  return {
    title: 'Free Anagram Solver — Find Every Word From Any Letters | LexiClash',
    description:
      'Free online anagram solver. Enter any letters and instantly see every valid English word you can make. Perfect for Scrabble, Boggle, Words With Friends, and crossword help.',
    openGraph: {
      type: 'website',
      url: pageUrl,
      title: 'Free Anagram Solver — Find Every Word From Any Letters',
      description:
        'Enter any letters and find every word you can make. Free, instant, no signup. Built into LexiClash, the multiplayer word game with 30+ modes.',
      siteName: 'LexiClash',
    },
    // EN-only indexed hub — self-referencing EN hreflang (no noindexed siblings).
    alternates: enOnlyAlternates('/anagram'),
    robots: { index: isEnglish, follow: true },
  };
}

export default async function AnagramHubPage({ params }: PageParams) {
  const { locale } = await params;
  const seoData = anagramSeoContent[locale] ?? anagramSeoContent.en;

  return (
    <div className="min-h-screen bg-neo-navy text-neo-white">
      <BreadcrumbJsonLd
        items={[
          { name: 'LexiClash', url: `${BASE_URL}/${locale}` },
          { name: 'Anagram Solver', url: `${BASE_URL}/en/anagram` },
        ]}
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="mb-6 text-sm text-slate-400">
          <Link href={`/${locale}`} className="hover:text-neo-cyan transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-neo-white">Anagram Solver</span>
        </nav>

        <h1 className="text-4xl font-neo-display font-black text-neo-pink tracking-wider mb-4">
          Anagram Solver
        </h1>
        <p className="text-slate-300 text-lg mb-8 leading-relaxed">
          Enter any letters in the URL and instantly see every valid English word you can make.
          Free, no signup, no download. Powered by the same dictionary that runs the LexiClash
          multiplayer word game.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-neo-display font-bold text-neo-cyan uppercase tracking-wider mb-4">
            Popular Anagram Lookups
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Tap any seed to see every word you can make from those letters.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {POPULAR_SEEDS.map((letters) => (
              <Link
                key={letters}
                href={`/${locale}/anagram/${letters}`}
                className="bg-neo-navy border-2 border-neo-black rounded-neo px-3 py-2 shadow-hard-sm hover:shadow-hard hover:border-neo-pink transition-all text-center"
              >
                <span className="text-sm font-neo-display font-bold text-neo-white uppercase">
                  {letters}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-neo-display font-bold text-neo-cyan uppercase tracking-wider mb-4">
            How It Works
          </h2>
          <ol className="text-slate-300 space-y-2 list-decimal list-inside">
            <li>Visit <code className="text-neo-lime">/anagram/yourletters</code> — replace yourletters with 2-10 a-z characters.</li>
            <li>Every valid word that fits within your letter pool appears, grouped by length.</li>
            <li>Tap any word to see its score and definition page.</li>
          </ol>
        </section>

        <EsScrabbleCrossLink locale={locale} anchorVariant="anagram" />
        <SvScrabbleCrossLink locale={locale} anchorVariant="anagram" />
        <HeScrabbleCrossLink locale={locale} anchorVariant="anagram" />

        <section className="mb-10">
          <h2 className="text-xl font-neo-display font-bold text-neo-cyan uppercase tracking-wider mb-4">
            Related Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href={`/${locale}/tools/word-solver`}
              className="bg-neo-navy border-2 border-neo-black rounded-neo p-4 shadow-hard hover:border-neo-cyan transition-all"
            >
              <div className="font-neo-display font-bold text-neo-white">Word Solver</div>
              <div className="text-xs text-slate-400 mt-1">Interactive UI version</div>
            </Link>
            <Link
              href={`/${locale}/words`}
              className="bg-neo-navy border-2 border-neo-black rounded-neo p-4 shadow-hard hover:border-neo-cyan transition-all"
            >
              <div className="font-neo-display font-bold text-neo-white">Words Dictionary</div>
              <div className="text-xs text-slate-400 mt-1">Browse by length or letter</div>
            </Link>
            <Link
              href={`/${locale}/multiplayer`}
              className="bg-neo-navy border-2 border-neo-black rounded-neo p-4 shadow-hard hover:border-neo-lime transition-all"
            >
              <div className="font-neo-display font-bold text-neo-white">Play LexiClash</div>
              <div className="text-xs text-slate-400 mt-1">Real-time word game</div>
            </Link>
          </div>
        </section>
      </div>
      <GamePageSeoContent
        title={seoData.title}
        description={seoData.description}
        features={seoData.features}
        faq={seoData.faq}
      />
    </div>
  );
}
