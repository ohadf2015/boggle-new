// Native per-locale copy for the LexiClash vs Kahoot/Gimkit/Vocabulary.com comparison page.
// Page is English-slug + canonical /en + index:isEnglish by design.
// Translations preserve all factual claims exactly — no invention, no strengthening.
// Brand names stay in Latin script; keep numbers/facts identical across locales.

export type LocaleContent = {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  heroTitle: string;
  intro: string;
  ctaPlayClass: string;
  ctaForSchools: string;

  comparisonTitle: string;
  comparisonTableFeatureHeader: string;
  compareRows: Array<readonly [string, string, string, string, string]>;
  comparePricingFooter: string;

  whyTitle: string;
  whyCards: Array<{ title: string; desc: string }>;

  whenTitle: string;
  whenKahoots: string;
  whenGimkits: string;
  whenVocabularys: string;
  whenFinal: string;

  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;

  moreTitle: string;
  moreCards: Array<{ title: string; sub: string }>;

  finalTitle: string;
  finalBody: string;
  finalCtaPlay: string;
  finalCtaSchools: string;
};

export const COMPARISON_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type ComparisonLocale = typeof COMPARISON_LOCALES[number];

const contentMap: Record<ComparisonLocale, LocaleContent> = {
  en: {
    metaTitle: 'Best Free Classroom Vocabulary Game: LexiClash vs Kahoot, Gimkit & Vocabulary.com (2026) | LexiClash',
    metaDescription:
      'LexiClash vs Kahoot vs Gimkit vs Vocabulary.com for classrooms, compared honestly. See the free-tier caps (Kahoot 10-40 players, Gimkit gates Pro modes, Vocabulary.com $199/classroom) and why LexiClash is free for the whole class — no student logins, 6 languages, 1v1 duels.',
    ogTitle: 'LexiClash vs Kahoot, Gimkit & Vocabulary.com — for Classrooms',
    ogDescription: 'The honest free-tier comparison. No player caps, no per-student fee, 6 languages, no student logins.',
    twitterTitle: 'Best Free Classroom Vocabulary Game (2026)',
    twitterDescription: 'LexiClash vs Kahoot, Gimkit & Vocabulary.com — honest comparison.',
    heroTitle: 'The free classroom vocabulary game your whole class can use — no caps, no logins.',
    intro:
      'Kahoot, Gimkit and Vocabulary.com are all good tools — but each one caps or prices its free tier in a way that bites a real classroom. Kahoot limits live players, Gimkit gates its Pro modes and reports behind Gimkit Pro, and Vocabulary.com has no real free classroom tier at all. LexiClash takes a different stance: the classroom game is free for every teacher, with no player cap, no student logins, 1v1 duels, and native dictionaries in six languages. Here is the honest, side-by-side comparison.',
    ctaPlayClass: 'Play a Class Game Free',
    ctaForSchools: 'For Schools & Districts',

    comparisonTitle: 'Side-by-side, no spin',
    comparisonTableFeatureHeader: 'Feature',
    compareRows: [
      ['Free for a full class', '✓ No cap', '✗ 40-player cap', '✗ 5-student free cap', '✗ No free tier'],
      ['Paid tier (schools)', 'Free; optional add-ons', 'Kahoot+ per teacher', '~$650–$1,000/yr', '~$199/classroom/yr'],
      ['No student logins', '✓ Join by code', '✓ PIN', 'Account-based', 'Account-based'],
      ['Core format', 'Word-formation game', 'Quiz / multiple choice', 'Quiz + game economy', 'Adaptive vocabulary drills'],
      ['1v1 duels', '✓ Built-in', '✗', '✗', '✗'],
      ['Languages (native dict.)', '✓ EN/HE/SV/JA/ES', 'Text any lang; no dict.', 'English-first', 'English-first'],
      ['Hebrew RTL', '✓', '✗', '✗', '✗'],
      ['Best for', 'Vocabulary, spelling, ESL', 'Trivia / fact review', 'Review with game loop', 'Adaptive vocab mastery'],
      ['Setup time', 'Under 60 seconds', '2–5 min/quiz', '2–5 min/kit', 'Account + list setup'],
    ] as const,
    comparePricingFooter:
      'Pricing as of 2026, from public pricing pages: Kahoot free tier caps live players with Kahoot+ for advanced features; Gimkit Basic is free and unlimited on its rotating featured modes, but gates Pro modes and reports; Vocabulary.com from ~$199/classroom/yr with no free classroom tier. Always confirm current pricing on each vendor\'s site.',

    whyTitle: 'Why teachers reach for LexiClash',
    whyCards: [
      { title: 'Free for the whole class', desc: 'No 40-player ceiling, no 5-student wall, no $199 entry. Every teacher plays free with a full class — that does not change.' },
      { title: 'No student logins', desc: 'Students join with a code. Nothing to provision, no student data to manage — the easiest tool to roll out school-wide.' },
      { title: 'Word games, not quizzes', desc: 'For vocabulary, spelling and language practice, students find and build words instead of picking A/B/C/D. A better fit for the goal.' },
      { title: '6 languages incl. Hebrew RTL', desc: 'Native dictionaries for EN/HE/SV/JA/ES — built for ESL, bilingual and immersion classrooms the others don\'t serve.' },
      { title: '1v1 vocabulary duels', desc: 'Pair students for 2–3 minute head-to-head word battles — a mode none of these three offer.' },
      { title: 'Scales to your school', desc: 'Free for teachers, with optional district tooling (admin dashboard, analytics, content libraries, ad-free, SSO) on the For Schools page.' },
    ],

    whenTitle: 'When each tool still wins',
    whenKahoots: 'for trivia, fact recall and presentation-driven review quizzes, its quiz-show format is purpose-built and hard to beat.',
    whenGimkits: 'its money/upgrade game loop is genuinely motivating for review days when you want a game-economy hook.',
    whenVocabularys: 'for deep, adaptive, curriculum-aligned vocabulary mastery with per-student progression, it\'s a strong dedicated platform.',
    whenFinal: 'Many teachers use more than one. The point isn\'t that the others are bad — it\'s that for free, multiplayer, multilingual word-building with no logins, LexiClash is the one without a catch.',

    faqTitle: 'Frequently asked questions',
    faqs: [
      {
        q: 'What is the best free vocabulary game for the classroom?',
        a: 'For word and vocabulary practice specifically, LexiClash is free for the whole class with no player cap, no student logins, and native dictionaries in 6 languages (English, Hebrew RTL, Spanish, Swedish, Japanese). Kahoot, Gimkit and Vocabulary.com are strong tools but cap or price their free tiers: Kahoot limits live players, Gimkit gates its Pro modes and reports behind Gimkit Pro, and Vocabulary.com has no real free classroom tier ($199/classroom to start).',
      },
      {
        q: 'Is LexiClash a free alternative to Gimkit?',
        a: 'Yes. Gimkit Basic is free and unlimited on featured modes, with Pro modes and reports paid and its school plans run roughly $650–$1,000 per year. LexiClash places no student cap on a class game and is free for every teacher — so you can run a full 30-student class without hitting a paywall. Gimkit\'s game-economy mechanic is fun for review; LexiClash is purpose-built for word-formation and vocabulary.',
      },
      {
        q: 'Is LexiClash a free alternative to Vocabulary.com?',
        a: 'Vocabulary.com is a strong adaptive-vocabulary platform, but it has no real free classroom tier — pricing starts around $199 per classroom per year. LexiClash is free for every teacher and class, with multiplayer word games, 1v1 duels and 6 languages. For curriculum-aligned adaptive drilling Vocabulary.com is excellent; for free, fun, multiplayer vocabulary practice LexiClash fits better.',
      },
      {
        q: 'How does LexiClash compare to Kahoot for vocabulary?',
        a: 'Kahoot is a quiz-show platform — students answer multiple-choice questions on a timer. LexiClash is a word-formation game — students search for, build and recognize words. For vocabulary, spelling and language practice, word-building is a better fit than multiple-choice. LexiClash is also fully free (no Kahoot+), where Kahoot caps its free tier at 40 live players and gates advanced features behind Kahoot+.',
      },
      {
        q: 'Do students need accounts or logins?',
        a: 'No. Students join a LexiClash class game with a code — no accounts to provision and no student data to manage. That makes a school- or district-wide rollout far simpler than tools that require rostering or sign-in before play.',
      },
      {
        q: 'Which one is best for ESL or multilingual classrooms?',
        a: 'LexiClash, by a wide margin: it has native dictionaries for English, Hebrew (full RTL), Spanish, Swedish and Japanese, so word games work in the target language. Kahoot, Gimkit and Vocabulary.com are English-first and do not have language-game mechanics tied to per-language dictionaries.',
      },
      {
        q: 'Can a whole school or district use LexiClash?',
        a: 'Yes — it\'s free for every teacher, and there\'s a "For Schools" page where schools and districts can register interest in optional tooling layered on top (district admin dashboard, cross-class analytics, content libraries, ad-free mode, SSO). The teacher-facing game itself is never gated.',
      },
    ],

    moreTitle: 'More comparisons',
    moreCards: [
      { title: 'LexiClash vs Kahoot', sub: 'Word games vs quiz-show format.' },
      { title: 'LexiClash vs Quizlet', sub: 'Word games vs flashcards.' },
      { title: 'LexiClash for Schools', sub: 'Free for teachers; built to scale.' },
    ],

    finalTitle: 'Bringing it to your school?',
    finalBody:
      'Start free with your class today. If you\'re thinking about a wider rollout — or want to know what school and district options look like — tell us about your school and we\'ll bring you in early.',
    finalCtaPlay: 'Start a Class Game Free',
    finalCtaSchools: 'Tell Us About Your School',
  },

  sv: {
    metaTitle: 'Bästa gratisordspelet för klassrummet: LexiClash vs Kahoot, Gimkit & Vocabulary.com (2026) | LexiClash',
    metaDescription:
      'LexiClash vs Kahoot vs Gimkit vs Vocabulary.com för klassrum, jämfört ärligt. Se begränsningarna för gratisversioner (Kahoot 40 spelare, Gimkit 5 elever, Vocabulary.com $199/klassrum) och varför LexiClash är gratis för hela klassen — ingen elevloggning, 5 språk, 1v1-dueller.',
    ogTitle: 'LexiClash vs Kahoot, Gimkit & Vocabulary.com — för klassrum',
    ogDescription: 'Den ärliga jämförelsen av gratisversioner. Inga spelbegränsningar, ingen avgift per elev, 5 språk, ingen elevloggning.',
    twitterTitle: 'Bästa gratisordspelet för klassrummet (2026)',
    twitterDescription: 'LexiClash vs Kahoot, Gimkit & Vocabulary.com — ärlig jämförelse.',
    heroTitle: 'Det gratis ordspelet för klassrummet som hela klassen kan använda — utan begränsningar, utan loggning.',
    intro:
      'Kahoot, Gimkit och Vocabulary.com är alla bra verktyg — men var och en begränsar eller prissätter sin gratisversion på ett sätt som påverkar riktiga klassrum. Kahoot begränsar antalet direktspelare, Gimkit reducerar gratisversionen till 5 elever, och Vocabulary.com har ingen gratis klassrumsversion alls. LexiClash tar en annan ståndpunkt: klassrumsspelet är gratis för varje lärare, utan spelbegränsningar, utan elevloggning, med 1v1-dueller och ordböcker på sex språk. Här är den ärliga jämförelsen sida vid sida.',
    ctaPlayClass: 'Spela ett klassrumsspel gratis',
    ctaForSchools: 'För skolor och distrikt',

    comparisonTitle: 'Sida vid sida, utan vridning',
    comparisonTableFeatureHeader: 'Funktion',
    compareRows: [
      ['Gratis för en hel klass', '✓ Utan begränsning', '✗ 40-spelarbegränsning', '✗ 5-elevbegränsning i gratisversion', '✗ Ingen gratisversion'],
      ['Betald version (skolor)', 'Gratis; valfria tillägg', 'Kahoot+ per lärare', '~$650–$1,000/år', '~$199/klassrum/år'],
      ['Ingen elevloggning', '✓ Anslut med kod', '✓ PIN', 'Kontobaserad', 'Kontobaserad'],
      ['Kärnformat', 'Ordbindningsspel', 'Quiz / flervalssamling', 'Quiz + spelekonomisystem', 'Adaptiv ordöversiktsträning'],
      ['1v1-dueller', '✓ Inbyggt', '✗', '✗', '✗'],
      ['Språk (inbyggd ordbok)', '✓ EN/HE/SV/JA/ES', 'Text på vilket språk som helst; ingen ordbok', 'Engelskfokuserad', 'Engelskfokuserad'],
      ['Hebreiska RTL', '✓', '✗', '✗', '✗'],
      ['Bäst för', 'Ordförråd, stavning, ESL', 'Trivia / faktaåterkallelse', 'Granskning med spelloop', 'Adaptiv ordöversiktsmästerskap'],
      ['Installationstid', 'Under 60 sekunder', '2–5 min/frågesport', '2–5 min/kit', 'Konto + listinstallation'],
    ] as const,
    comparePricingFooter:
      'Prissättning från 2026, från offentliga prissidor: Kahoots gratisversion begränsar direktspelarna med Kahoot+ för avancerade funktioner; Gimkits gratisversion är begränsad till 5 elever, skolplaner ~$650–$1,000/år; Vocabulary.com från ~$199/klassrum/år utan gratis klassrumsversion. Bekräfta alltid aktuell prissättning på varje leverantörs webbplats.',

    whyTitle: 'Varför lärare väljer LexiClash',
    whyCards: [
      { title: 'Gratis för hela klassen', desc: 'Ingen 40-spelartak, ingen 5-elevsgräns, inget $199-inträde. Varje lärare spelar gratis med en hel klass — det förändras inte.' },
      { title: 'Ingen elevloggning', desc: 'Elever ansluter med en kod. Ingenting att etablera, ingen elevdata att hantera — det enklaste verktyget för utbyggnad på skolnivå.' },
      { title: 'Ordspel, inte quiz', desc: 'För ordförråd, stavning och språkträning hittar och bygger eleverna ord istället för att välja A/B/C/D. En bättre passning för målet.' },
      { title: '5 språk inkl. hebreiska RTL', desc: 'Inbyggda ordböcker för EN/HE/SV/JA/ES — designade för ESL, tvåspråkiga och nedsänkningsklassrum som de andra inte tjänar.' },
      { title: '1v1 ordöversikt-dueller', desc: 'Para elever för 2–3 minuters rakt motsatt ordbataljer — ett läge som ingen av dessa tre erbjuder.' },
      { title: 'Skalbar för din skola', desc: 'Gratis för lärare, med valfri distriktisering (admin-panel, analyser, innehållsbibliotek, annonsfritt, SSO) på sidan För skolor.' },
    ],

    whenTitle: 'När varje verktyg fortfarande vinner',
    whenKahoots: 'för trivia, faktaåterkallelse och presentationsdrivna granskningstester, dess quiz-show-format är specialbyggt och svårt att slå.',
    whenGimkits: 'dess pengar/uppgraderingsspelloop är genuint motiverande för granskningsdagar när du vill ha en spelekonomikrok.',
    whenVocabularys: 'för djup, adaptiv, läroplansjusterad ordöversiktsmästerskap med elevspecifik progression, det är en stark dedikerad plattform.',
    whenFinal: 'Många lärare använder mer än en. Poängen är inte att de andra är dåliga — det är att för gratis, flerspelar, flerspråkig ordbindning utan loggning är LexiClash den utan fallgropar.',

    faqTitle: 'Vanliga frågor',
    faqs: [
      {
        q: 'Vilket är det bästa gratis ordspelet för klassrummet?',
        a: 'För ordförråds- och ordöversiktsträning specifikt är LexiClash gratis för hela klassen utan spelbegränsningar, utan elevloggning och med inbyggda ordböcker på 5 språk (engelska, hebreiska RTL, spanska, svenska, japanska). Kahoot, Gimkit och Vocabulary.com är starka verktyg men begränsar eller prissätter sina gratisversioner: Kahoot begränsar direktspelarna, Gimkit begränsar gratisversionen till 5 elever, och Vocabulary.com har ingen gratis klassrumsversion ($199/klassrum för att börja).',
      },
      {
        q: 'Är LexiClash ett gratis alternativ till Gimkit?',
        a: 'Ja. Gimkits gratisversion är begränsad till 5 elever per spel och dess skolplaner kostar ungefär $650–$1,000 per år. LexiClash placerar ingen elevbegränsning på ett klassrumsspel och är gratis för varje lärare — så du kan köra en hel 30-eleverklass utan att träffa en betalvägg. Gimkits spelekonomimekanik är rolig för granskning; LexiClash är designat för ordbindning och ordförråd.',
      },
      {
        q: 'Är LexiClash ett gratis alternativ till Vocabulary.com?',
        a: 'Vocabulary.com är en stark adaptiv ordöversiktsplattform, men den har ingen gratis klassrumsversion — prissättningen börjar omkring $199 per klassrum per år. LexiClash är gratis för varje lärare och klass, med flerspelares ordspel, 1v1-dueller och 5 språk. För läroplansjusterad adaptiv träning är Vocabulary.com utmärkt; för gratis, roligt, flerspelares ordöversiktsträning passar LexiClash bättre.',
      },
      {
        q: 'Hur jämförs LexiClash med Kahoot för ordförråd?',
        a: 'Kahoot är en quiz-show-plattform — elever svarar på flervalssamlingar på en timer. LexiClash är ett ordbindningsspel — elever söker efter, bygger och känner igen ord. För ordförråd, stavning och språkträning är ordbindning en bättre passning än flervalssamling. LexiClash är också helt gratis (inget Kahoot+), där Kahoot begränsar sin gratisversion till 40 direktspelaren och gränssnitt avancerade funktioner bakom Kahoot+.',
      },
      {
        q: 'Behöver elever konton eller loggning?',
        a: 'Nej. Elever ansluter till ett LexiClash klassrumsspel med en kod — inga konton att etablera och ingen elevdata att hantera. Det gör utbyggnad på skol- eller distriktnivå mycket enklare än verktyg som kräver samling eller inloggning före spel.',
      },
      {
        q: 'Vilken är bäst för ESL eller flerspråkiga klassrum?',
        a: 'LexiClash, utan tvekan: den har inbyggda ordböcker för engelska, hebreiska (full RTL), spanska, svenska och japanska, så ordspel fungerar på målspråket. Kahoot, Gimkit och Vocabulary.com är engelskfokuserade och har inte språkspelmekanik knutna till per-språkordböcker.',
      },
      {
        q: 'Kan en hel skola eller ett helt distrikt använda LexiClash?',
        a: 'Ja — det är gratis för varje lärare, och det finns en sida "För skolor" där skolor och distrikt kan registrera intresse för valfri verktygshantering lager på toppen (district admin-panel, tvärklassanalytik, innehållsbibliotek, annonsfritt läge, SSO). Själva lärar-vändning-spelet är aldrig grindvakt.',
      },
    ],

    moreTitle: 'Fler jämförelser',
    moreCards: [
      { title: 'LexiClash vs Kahoot', sub: 'Ordspel vs quiz-show-format.' },
      { title: 'LexiClash vs Quizlet', sub: 'Ordspel vs flashkort.' },
      { title: 'LexiClash för skolor', sub: 'Gratis för lärare; designat för skalning.' },
    ],

    finalTitle: 'Får du in det på din skola?',
    finalBody:
      'Börja gratis med din klass idag. Om du tänker på en bredare utbyggnad — eller vill veta hur skol- och distriktsalternativ ser ut — berätta om din skola och vi tar in dig tidigt.',
    finalCtaPlay: 'Starta ett klassrumsspel gratis',
    finalCtaSchools: 'Berätta om din skola',
  },

  ja: {
    metaTitle: 'クラス向けの最高の無料単語ゲーム：LexiClash vs Kahoot、Gimkit、Vocabulary.com（2026）| LexiClash',
    metaDescription:
      'LexiClash vs Kahoot vs Gimkit vs Vocabulary.com を正直に比較。無料版の制限を確認（Kahoot 40プレイヤー、Gimkit 5名の学生、Vocabulary.com $199/教室）し、LexiClash がクラス全体で無料の理由 — 生徒ログインなし、5言語、1v1デュエル。',
    ogTitle: 'LexiClash vs Kahoot、Gimkit、Vocabulary.com — クラス向け',
    ogDescription: '正直な無料版比較。プレイ人数制限なし、学生ごとの手数料なし、5言語、生徒ログインなし。',
    twitterTitle: 'クラス向けの最高の無料単語ゲーム（2026）',
    twitterDescription: 'LexiClash vs Kahoot、Gimkit、Vocabulary.com — 正直な比較。',
    heroTitle: 'クラス全体が使用できる無料のクラス向け単語ゲーム — 制限なし、ログインなし。',
    intro:
      'Kahoot、Gimkit、Vocabulary.com はすべて優れたツールですが、それぞれ無料版をを実際のクラスルームに影響を与える方法で制限または価格設定しています。Kahoot は直接プレイ数を制限し、Gimkit は無料版を5名の学生に制限し、Vocabulary.com は実質的な無料教室版がまったくありません。LexiClash は別のアプローチを取っています：教室ゲームはすべての教師に無料で、プレイ人数制限なし、生徒ログインなし、1v1デュエル、5言語のネイティブ辞書を備えています。正直な、横並びの比較をご紹介します。',
    ctaPlayClass: '無料でクラスゲームをプレイ',
    ctaForSchools: '学校と地区向け',

    comparisonTitle: '横並び、偏りなし',
    comparisonTableFeatureHeader: '機能',
    compareRows: [
      ['クラス全体で無料', '✓ 制限なし', '✗ 40プレイ人数制限', '✗ 5名学生の無料制限', '✗ 無料版なし'],
      ['有料版（学校）', '無料、オプションのアドオン', 'Kahoot+ (教師ごと)', '~$650–$1,000/年', '~$199/教室/年'],
      ['生徒ログインなし', '✓ コードで参加', '✓ PIN', 'アカウントベース', 'アカウントベース'],
      ['コア形式', '単語形成ゲーム', 'クイズ/多肢選択', 'クイズ + ゲーム経済', '適応型語彙ドリル'],
      ['1v1デュエル', '✓ 組み込み済み', '✗', '✗', '✗'],
      ['言語（ネイティブ辞書）', '✓ EN/HE/SV/JA/ES', 'テキストは任意の言語; 辞書なし', '英語が中心', '英語が中心'],
      ['ヘブライ語RTL', '✓', '✗', '✗', '✗'],
      ['最適な用途', '語彙、綴り、ESL', '雑学/事実のリコール', 'ゲーム経済ループによるレビュー', '適応型語彙習得'],
      ['セットアップ時間', '60秒以内', '2–5分/クイズ', '2–5分/キット', 'アカウント + リストセットアップ'],
    ] as const,
    comparePricingFooter:
      '2026年の価格は公開の価格ページから：Kahoot の無料版はプレイ人数を制限し、Kahoot+ で高度な機能をゲート；Gimkit の無料版は5名の学生に限定され、学校プランは約 $650–$1,000/年；Vocabulary.com は約 $199/教室/年から始まり、無料の教室版がありません。常に各ベンダーのサイトで現在の価格を確認してください。',

    whyTitle: '教師が LexiClash を選ぶ理由',
    whyCards: [
      { title: 'クラス全体で無料', desc: '40プレイヤーの上限なし、5名学生の壁なし、$199の入場料なし。すべての教師がクラス全体で無料でプレイします — これは変わりません。' },
      { title: '生徒ログインなし', desc: '生徒はコードで参加します。セットアップするものはなく、生徒データを管理する必要がありません — 学校全体にロールアウトするための最も簡単なツール。' },
      { title: '単語ゲーム、クイズではない', desc: '語彙、綴り、言語練習の場合、生徒は A/B/C/D を選ぶ代わりに単語を見つけて構築します。目標により適合しています。' },
      { title: 'ヘブライ語 RTL を含む 5言語', desc: 'EN/HE/SV/JA/ES 用のネイティブ辞書 — ESL、二言語、没入型教室用に設計された、他のツールがサポートしていません。' },
      { title: '1v1 語彙デュエル', desc: '学生を2～3分のヘッド・トゥ・ヘッドの単語対戦でペアにします — これら3つのどれもが提供していないモード。' },
      { title: 'あなたの学校にスケール', desc: '教師向けは無料。「学校向け」ページでオプションの地区ツール（admin ダッシュボード、分析、コンテンツライブラリ、広告なし、SSO）に登録できます。' },
    ],

    whenTitle: '各ツールがまだ勝つ場合',
    whenKahoots: '雑学、事実のリコール、プレゼンテーション駆動型のレビュークイズの場合、そのクイズショー形式は特別に作られており、打ち破るのは困難です。',
    whenGimkits: 'お金/アップグレードゲームループは、レビュー日にゲーム経済フックが欲しい時に本当に動機付けられます。',
    whenVocabularys: '深く、適応型で、カリキュラム調整された語彙習得に学生別の進捗で、強力な専用プラットフォームです。',
    whenFinal: '多くの教師は複数を使用しています。ポイントは他のツールが悪いということではなく、無料で、マルチプレイヤー、多言語の単語構築でログインなし、LexiClash が欠点のないツールだということです。',

    faqTitle: 'よくある質問',
    faqs: [
      {
        q: 'クラス向けの最高の無料単語ゲームは何ですか？',
        a: '単語と語彙練習の場合、LexiClash はプレイ人数制限なし、生徒ログインなし、5言語（英語、ヘブライ語 RTL、スペイン語、スウェーデン語、日本語）のネイティブ辞書でクラス全体で無料です。Kahoot、Gimkit、Vocabulary.com は強力なツールですが、無料版を制限または価格設定しています：Kahoot は直接プレイを制限し、Gimkit は無料版を5名の学生に制限し、Vocabulary.com は無料の教室版がありません（開始するには $199/教室）。',
      },
      {
        q: 'LexiClash は Gimkit の無料代替品ですか？',
        a: 'はい。Gimkit の無料版はゲームあたり5名の学生に制限されており、その学校プランは年間約 $650–$1,000 です。LexiClash はクラスゲームに学生の上限を設定せず、すべての教師に無料です — したがって、支払壁にぶつかることなく、30名の学生クラス全体を実行できます。Gimkit のゲーム経済メカニズムはレビューに楽しいです；LexiClash は単語形成と語彙向けに特別に設計されています。',
      },
      {
        q: 'LexiClash は Vocabulary.com の無料代替品ですか？',
        a: 'Vocabulary.com は強力な適応型語彙プラットフォームですが、実質的な無料教室版がなく — 価格は年間約 $199 クラスあたり $199 から始まります。LexiClash はすべての教師とクラスに無料で、マルチプレイヤー単語ゲーム、1v1デュエル、5言語があります。カリキュラム調整された適応型ドリルの場合、Vocabulary.com は優れています；無料で楽しいマルチプレイヤー語彙練習の場合、LexiClash がより適しています。',
      },
      {
        q: 'LexiClash は語彙の面で Kahoot とどのように比較されますか？',
        a: 'Kahoot はクイズショープラットフォームです — 学生はタイマー上の多肢選択問題に答えます。LexiClash は単語形成ゲームです — 学生は単語を検索、構築、認識します。語彙、綴り、言語練習の場合、単語構築は多肢選択よりも適切です。LexiClash は完全に無料です（Kahoot+ なし）。Kahoot は無料版を40直接プレイに制限し、高度な機能を Kahoot+ の背後にゲート化します。',
      },
      {
        q: '生徒はアカウントまたはログインが必要ですか？',
        a: 'いいえ。生徒は LexiClash クラスゲームにコードで参加します — アカウント プロビジョニング不要、生徒データ管理不要。これにより、ロースター化またはプレイ前のサインインが必要なツールよりも、学校または地区全体のロールアウトがはるかに簡単になります。',
      },
      {
        q: 'ESL またはマルチリンガルクラス向けはどれが最適ですか？',
        a: 'LexiClash、圧倒的に：英語、ヘブライ語（完全 RTL）、スペイン語、スウェーデン語、日本語のネイティブ辞書があり、単語ゲームは対象言語で機能します。Kahoot、Gimkit、Vocabulary.com は英語が中心で、言語別辞書に関連する言語ゲームメカニクスがありません。',
      },
      {
        q: '学校全体または地区全体が LexiClash を使用できますか？',
        a: 'はい — すべての教師に無料で、学校と地区が任意のツール層の上にレジスター することができます（地区管理ダッシュボード、クロスクラス分析、コンテンツライブラリ、広告なしモード、SSO）。教師向けゲーム自体はゲートウェイされません。',
      },
    ],

    moreTitle: 'その他の比較',
    moreCards: [
      { title: 'LexiClash vs Kahoot', sub: '単語ゲーム vs クイズショー形式。' },
      { title: 'LexiClash vs Quizlet', sub: '単語ゲーム vs フラッシュカード。' },
      { title: '学校向け LexiClash', sub: '教師向けは無料；スケール用に設計。' },
    ],

    finalTitle: '学校に導入しようとしていますか？',
    finalBody:
      '今日からクラスで無料で始めましょう。より広いロールアウトを検討している場合、または学校と地区のオプションがどのように見えるかを知りたい場合は、学校について教えていただければ、早期にお連れします。',
    finalCtaPlay: '無料でクラスゲームを開始',
    finalCtaSchools: 'あなたの学校について教えてください',
  },

  es: {
    metaTitle: 'Mejor juego de vocabulario gratuito para el aula: LexiClash vs Kahoot, Gimkit y Vocabulary.com (2026) | LexiClash',
    metaDescription:
      'LexiClash vs Kahoot vs Gimkit vs Vocabulary.com para aulas, comparación honesta. Consulta los límites de versión gratuita (Kahoot 40 jugadores, Gimkit 5 estudiantes, Vocabulary.com $199/aula) y por qué LexiClash es gratuito para toda la clase — sin inicio de sesión de estudiantes, 6 idiomas, duelos 1v1.',
    ogTitle: 'LexiClash vs Kahoot, Gimkit y Vocabulary.com — para aulas',
    ogDescription: 'La comparación honesta de versiones gratuitas. Sin límites de jugadores, sin cuotas por estudiante, 6 idiomas, sin inicio de sesión de estudiantes.',
    twitterTitle: 'Mejor juego de vocabulario gratuito para el aula (2026)',
    twitterDescription: 'LexiClash vs Kahoot, Gimkit y Vocabulary.com — comparación honesta.',
    heroTitle: 'El juego de palabras gratuito para el aula que puede usar toda la clase — sin límites, sin inicio de sesión.',
    intro:
      'Kahoot, Gimkit y Vocabulary.com son herramientas valiosas — pero cada una limita o fija el precio de su versión gratuita de una manera que afecta a las aulas reales. Kahoot limita los jugadores en vivo, Gimkit reduce la versión gratuita a 5 estudiantes, y Vocabulary.com no tiene una versión de aula verdaderamente gratuita. LexiClash adopta una posición diferente: el juego del aula es gratuito para todos los maestros, sin límite de jugadores, sin inicio de sesión de estudiantes, duelos 1v1 y diccionarios nativos en seis idiomas. Aquí está la comparación honesta lado a lado.',
    ctaPlayClass: 'Juega un juego de clase gratis',
    ctaForSchools: 'Para escuelas y distritos',

    comparisonTitle: 'Lado a lado, sin sesgo',
    comparisonTableFeatureHeader: 'Función',
    compareRows: [
      ['Gratuito para una clase completa', '✓ Sin límite', '✗ Límite de 40 jugadores', '✗ Límite de 5 estudiantes en versión gratuita', '✗ Sin versión gratuita'],
      ['Nivel de pago (escuelas)', 'Gratuito; complementos opcionales', 'Kahoot+ por maestro', '~$650–$1,000/año', '~$199/aula/año'],
      ['Sin inicio de sesión de estudiantes', '✓ Únete por código', '✓ PIN', 'Basado en cuenta', 'Basado en cuenta'],
      ['Formato principal', 'Juego de formación de palabras', 'Quiz / opción múltiple', 'Quiz + economía de juego', 'Ejercicios de vocabulario adaptativos'],
      ['Duelos 1v1', '✓ Integrado', '✗', '✗', '✗'],
      ['Idiomas (diccionario nativo)', '✓ EN/HE/SV/JA/ES', 'Texto en cualquier idioma; sin diccionario', 'Centrado en inglés', 'Centrado en inglés'],
      ['Hebreo RTL', '✓', '✗', '✗', '✗'],
      ['Mejor para', 'Vocabulario, ortografía, ESL', 'Trivias / recuperación de hechos', 'Revisión con bucle de juego', 'Dominio de vocabulario adaptativo'],
      ['Tiempo de configuración', 'Menos de 60 segundos', '2–5 min/quiz', '2–5 min/kit', 'Cuenta + configuración de lista'],
    ] as const,
    comparePricingFooter:
      'Precios a partir de 2026, desde páginas de precios públicas: la versión gratuita de Kahoot limita los jugadores en vivo con Kahoot+ para funciones avanzadas; la versión gratuita de Gimkit está limitada a 5 estudiantes, planes escolares ~$650–$1,000/año; Vocabulary.com desde ~$199/aula/año sin versión de aula gratuita. Siempre confirma los precios actuales en el sitio de cada proveedor.',

    whyTitle: 'Por qué los maestros eligen LexiClash',
    whyCards: [
      { title: 'Gratuito para toda la clase', desc: 'Sin techo de 40 jugadores, sin pared de 5 estudiantes, sin entrada de $199. Todo maestro juega gratis con una clase completa — eso no cambia.' },
      { title: 'Sin inicio de sesión de estudiantes', desc: 'Los estudiantes se unen con un código. Nada que configurar, sin datos de estudiantes que administrar — la herramienta más fácil para implementar en toda la escuela.' },
      { title: 'Juegos de palabras, no cuestionarios', desc: 'Para vocabulario, ortografía y práctica del idioma, los estudiantes encuentran y construyen palabras en lugar de elegir A/B/C/D. Mejor adaptación al objetivo.' },
      { title: '6 idiomas incl. hebreo RTL', desc: 'Diccionarios nativos para EN/HE/SV/JA/ES — diseñados para aulas de ESL, bilingües e inmersión que los otros no atienden.' },
      { title: 'Duelos de vocabulario 1v1', desc: 'Empareja estudiantes para batallas de palabras cara a cara de 2–3 minutos — un modo que ninguno de estos tres ofrece.' },
      { title: 'Se escala a tu escuela', desc: 'Gratuito para maestros, con herramientas de distrito opcionales (panel de administrador, análisis, bibliotecas de contenido, sin anuncios, SSO) en la página Para escuelas.' },
    ],

    whenTitle: 'Cuándo cada herramienta aún gana',
    whenKahoots: 'para trivias, recuperación de hechos y cuestionarios de revisión dirigidos por presentación, su formato de concurso está diseñado especialmente y es difícil de superar.',
    whenGimkits: 'su bucle de dinero/mejora es genuinamente motivador para días de revisión cuando quieres un gancho de economía de juego.',
    whenVocabularys: 'para dominio de vocabulario profundo, adaptativo y alineado con el currículo con progresión por estudiante, es una plataforma dedicada fuerte.',
    whenFinal: 'Muchos maestros usan más de una. El punto no es que los otros sean malos — es que para construcción de palabras gratuita, multijugador, multilingüe sin inicios de sesión, LexiClash es la única sin trampa.',

    faqTitle: 'Preguntas frecuentes',
    faqs: [
      {
        q: '¿Cuál es el mejor juego de vocabulario gratuito para el aula?',
        a: 'Para práctica de palabras y vocabulario específicamente, LexiClash es gratuito para toda la clase sin límite de jugadores, sin inicio de sesión de estudiantes, y con diccionarios nativos en 6 idiomas (inglés, hebreo RTL, español, sueco, japonés). Kahoot, Gimkit y Vocabulary.com son herramientas sólidas pero limitan o fijan el precio de sus versiones gratuitas: Kahoot limita los jugadores en vivo, Gimkit limita la versión gratuita a 5 estudiantes, y Vocabulary.com no tiene una versión de aula verdaderamente gratuita ($199/aula para comenzar).',
      },
      {
        q: '¿Es LexiClash una alternativa gratuita a Gimkit?',
        a: 'Sí. La versión gratuita de Gimkit está limitada a 5 estudiantes por juego y sus planes escolares cuestan aproximadamente $650–$1,000 por año. LexiClash no coloca un límite de estudiantes en un juego de clase y es gratuito para todos los maestros — para que puedas ejecutar una clase completa de 30 estudiantes sin golpear un muro de pago. La mecánica de economía de juego de Gimkit es divertida para revisar; LexiClash está diseñado específicamente para formación de palabras y vocabulario.',
      },
      {
        q: '¿Es LexiClash una alternativa gratuita a Vocabulary.com?',
        a: 'Vocabulary.com es una plataforma de vocabulario adaptativa sólida, pero no tiene una versión de aula verdaderamente gratuita — la fijación de precios comienza alrededor de $199 por aula por año. LexiClash es gratuito para todos los maestros y clases, con juegos de palabras multijugador, duelos 1v1 e idiomas en 6 idiomas. Para ejercicios adaptativos alineados con el currículo, Vocabulary.com es excelente; para práctica de vocabulario gratuita, divertida y multijugador, LexiClash encaja mejor.',
      },
      {
        q: '¿Cómo compara LexiClash con Kahoot para vocabulario?',
        a: 'Kahoot es una plataforma de concurso — los estudiantes responden preguntas de opción múltiple en un temporizador. LexiClash es un juego de formación de palabras — los estudiantes buscan, construyen y reconocen palabras. Para vocabulario, ortografía y práctica del idioma, la formación de palabras es mejor que la opción múltiple. LexiClash también es completamente gratuito (sin Kahoot+), donde Kahoot limita su versión gratuita a 40 jugadores en vivo y cierra funciones avanzadas detrás de Kahoot+.',
      },
      {
        q: '¿Los estudiantes necesitan cuentas o inicios de sesión?',
        a: 'No. Los estudiantes se unen a un juego de clase LexiClash con un código — sin cuentas que configurar, sin datos de estudiantes que administrar. Eso hace que un despliegue en toda la escuela o distrito sea mucho más simple que las herramientas que requieren nómina o inicio de sesión antes de jugar.',
      },
      {
        q: '¿Cuál es mejor para aulas ESL o multilingües?',
        a: 'LexiClash, por mucho: tiene diccionarios nativos para inglés, hebreo (RTL completo), español, sueco y japonés, para que los juegos de palabras funcionen en el idioma de destino. Kahoot, Gimkit y Vocabulary.com están centrados en inglés y no tienen mecánicas de juego de idioma vinculadas a diccionarios por idioma.',
      },
      {
        q: '¿Puede una escuela o distrito completo usar LexiClash?',
        a: 'Sí — es gratuito para todos los maestros, y hay una página "Para escuelas" donde las escuelas y distritos pueden registrar interés en herramientas opcionales en capas (panel de administrador del distrito, análisis entre clases, bibliotecas de contenido, modo sin anuncios, SSO). El juego mismo orientado al maestro nunca está limitado.',
      },
    ],

    moreTitle: 'Más comparaciones',
    moreCards: [
      { title: 'LexiClash vs Kahoot', sub: 'Juegos de palabras vs formato de concurso.' },
      { title: 'LexiClash vs Quizlet', sub: 'Juegos de palabras vs tarjetas de memoria.' },
      { title: 'LexiClash para escuelas', sub: 'Gratuito para maestros; diseñado para escalar.' },
    ],

    finalTitle: '¿Lo llevas a tu escuela?',
    finalBody:
      'Comienza gratis con tu clase hoy. Si estás pensando en un despliegue más amplio — o quieres saber cómo se ven las opciones de escuela y distrito — cuéntanos sobre tu escuela y te llevaremos temprano.',
    finalCtaPlay: 'Inicia un juego de clase gratis',
    finalCtaSchools: 'Cuéntanos sobre tu escuela',
  },

  he: {
    metaTitle: 'משחק אוצר מילים בחינם הטוב ביותר בכיתה: LexiClash vs Kahoot, Gimkit & Vocabulary.com (2026) | LexiClash',
    metaDescription:
      'LexiClash vs Kahoot vs Gimkit vs Vocabulary.com לכיתות, השוואה כנה. ראו את המגבלות בגרסה החינם (Kahoot 40 משחקים, Gimkit 5 תלמידים, Vocabulary.com $199 לכיתה) ולמה LexiClash בחינם לכל הכיתה — ללא כניסה לתלמידים, 6 שפות, דו קרבות 1v1.',
    ogTitle: 'LexiClash vs Kahoot, Gimkit & Vocabulary.com — לכיתות',
    ogDescription: 'ההשוואה החינם כנה. ללא מגבלות משחקים, ללא עלות לכל תלמיד, 6 שפות, ללא כניסה לתלמידים.',
    twitterTitle: 'משחק אוצר מילים בחינם הטוב ביותר בכיתה (2026)',
    twitterDescription: 'LexiClash vs Kahoot, Gimkit & Vocabulary.com — השוואה כנה.',
    heroTitle: 'משחק אוצר מילים בכיתה חינם שכל הכיתה יכולה להשתמש — ללא מגבלות, ללא כניסה.',
    intro:
      'Kahoot, Gimkit ו-Vocabulary.com הם כלים טובים — אבל כל אחד מגביל או מתמחר את הגרסה החינם בדרך שפוגעת בכיתה אמיתית. Kahoot מגביל משחקים חי, Gimkit מצמצם את הגרסה החינם ל-5 תלמידים, ו-Vocabulary.com אין לה בכלל גרסת כיתה חינם. LexiClash לוקחת עמדה אחרת: משחק הכיתה בחינם לכל מורה, ללא הגבלת משחקים, ללא כניסה לתלמידים, דו קרבות 1v1, ומילונים מובנים בשש שפות. הנה ההשוואה הכנה זו לצד זו.',
    ctaPlayClass: 'שחק משחק בכיתה בחינם',
    ctaForSchools: 'לבתי ספר ומחוזות',

    comparisonTitle: 'זה לצד זה, ללא טרנדים',
    comparisonTableFeatureHeader: 'תכונה',
    compareRows: [
      ['חינם לכיתה מלאה', '✓ ללא הגבלה', '✗ הגבלה של 40 משחקים', '✗ הגבלה חינם של 5 תלמידים', '✗ ללא גרסה חינם'],
      ['רמה בתשלום (בתי ספר)', 'חינם; תוספים אופציונליים', 'Kahoot+ לכל מורה', '~$650–$1,000/שנה', '~$199/כיתה/שנה'],
      ['ללא כניסה לתלמידים', '✓ הצטרף לפי קוד', '✓ PIN', 'מבוסס חשבון', 'מבוסס חשבון'],
      ['פורמט ליבה', 'משחק יצירת מילים', 'חידון / בחירה מרובה', 'חידון + כלכלת משחק', 'תרגילי אוצר מילים אדפטיביים'],
      ['דו קרבות 1v1', '✓ מובנה', '✗', '✗', '✗'],
      ['שפות (מילון נטיבי)', '✓ EN/HE/SV/JA/ES/RU', 'טקסט בכל שפה; ללא מילון', 'ממוקדת באנגלית', 'ממוקדת באנגלית'],
      ['עברית (מימין לשמאל)', '✓', '✗', '✗', '✗'],
      ['הטוב ביותר ל', 'אוצר מילים, איות, ESL', 'טריוויה / ציטוט עובדות', 'סקירה עם לולאת משחק', 'שליטה באוצר מילים אדפטיבית'],
      ['זמן הגדרה', 'פחות מ-60 שניות', '2-5 דקות/חידון', '2-5 דקות/ערכה', 'חשבון + הגדרת רשימה'],
    ] as const,
    comparePricingFooter:
      'תמחור מ-2026, מעמודי תמחור ציבוריים: גרסה חינם של Kahoot מגבילה משחקים חי עם Kahoot+ לתכונות מתקדמות; גרסה חינם של Gimkit מוגבלת ל-5 תלמידים, תוכניות בתי ספר ~$650–$1,000/שנה; Vocabulary.com מ-~$199/כיתה/שנה ללא גרסת כיתה חינם. תמיד אמת את התמחור הנוכחי בעמוד של כל ספק.',

    whyTitle: 'למה מורים בוחרים ב-LexiClash',
    whyCards: [
      { title: 'חינם לכל הכיתה', desc: 'ללא תקרה של 40 משחקים, ללא קיר של 5 תלמידים, ללא כניסה של $199. כל מורה משחק בחינם עם כיתה מלאה — זה לא משתנה.' },
      { title: 'ללא כניסה לתלמידים', desc: 'תלמידים מצטרפים עם קוד. לא צריך להגדיר, ללא נתוני תלמידים לניהול — הכלי הקל ביותר להרמה ברמה בית הספר.' },
      { title: 'משחקי מילים, לא חידונים', desc: 'עבור אוצר מילים, איות ותרגול שפה, תלמידים מוצאים ובונים מילים במקום לבחור A/B/C/D. התאמה טובה יותר לתכלית.' },
      { title: '6 שפות כולל עברית (מימין לשמאל)', desc: 'מילונים מובנים עבור EN/HE/SV/JA/ES/RU — בנוי לכיתות ESL, דו-לשוניות וטבילה שאחרים לא משרתים.' },
      { title: 'דו קרבות אוצר מילים 1v1', desc: 'זווג תלמידים לקרבות מילים פנים אל פנים של 2-3 דקות — מצב שאחד מהשלושה לא מציע.' },
      { title: 'מתרחב לבית הספר שלך', desc: 'חינם למורים, עם כלים מחוז אופציונליים (לוח בקרה ניהול, אנליטיקה, ספריות תוכן, ללא פרסומות, SSO) בעמוד לבתי ספר.' },
    ],

    whenTitle: 'כאשר כל כלי עדיין מנצח',
    whenKahoots: 'לטריוויה, ציטוט עובדות וחידונים סקירה מונעים הצגה, פורמט המשחק שלו בנוי למטרה וקשה להשמיט.',
    whenGimkits: 'לולאת המשחק שלה של כסף/שדרוג היא באמת מוטיבציה לימי סקירה כשאתה רוצה קולב כלכלת משחק.',
    whenVocabularys: 'לשליטה עמוקה, אדפטיבית ומיושרת בתוכנית לימודים בהתקדמות לתלמיד, היא פלטפורמה ייעודית חזקה.',
    whenFinal: 'מורים רבים משתמשים ביותר מאחד. העניין אינו שאחרים רעים — זה ש-LexiClash היא היחידה ללא תפס לבניית מילים חינם, ריבוי משחקים ורב-לשוני ללא כניסות.',

    faqTitle: 'שאלות נפוצות',
    faqs: [
      {
        q: 'מהו משחק אוצר המילים החינמי הטוב ביותר בכיתה?',
        a: 'עבור תרגול מילים ואוצר מילים ספציפיים, LexiClash בחינם לכל הכיתה ללא הגבלת משחקים, ללא כניסה לתלמידים, ומילונים מובנים בשש שפות (אנגלית, עברית (מימין לשמאל), ספרדית, שוודית, יפנית, רוסית). Kahoot, Gimkit ו-Vocabulary.com הם כלים חזקים אבל מגבילים או מתמחרים גרסאות חינם: Kahoot מגביל משחקים חי, Gimkit מגביל גרסה חינם ל-5 תלמידים, ו-Vocabulary.com אין גרסת כיתה חינם אמיתית ($199/כיתה להתחיל).',
      },
      {
        q: 'האם LexiClash חלופה חינם ל-Gimkit?',
        a: 'כן. גרסה חינם של Gimkit מוגבלת ל-5 תלמידים לכל משחק ותוכניותיה בבתי ספר עולות בערך $650–$1,000 בשנה. LexiClash לא מציבה הגבלה לתלמידים במשחק כיתה וחינם לכל מורה — אז אתה יכול להפעיל כיתה מלאה של 30 תלמידים ללא מכשול תשלום. מכניקת כלכלת המשחק של Gimkit היא מהנה לסקירה; LexiClash בנוי במטרה ליצירת מילים ואוצר מילים.',
      },
      {
        q: 'האם LexiClash חלופה חינם ל-Vocabulary.com?',
        a: 'Vocabulary.com היא פלטפורמה חזקה של אוצר מילים אדפטיבי, אבל אין לה גרסת כיתה חינם אמיתית — התמחור מתחיל בסביבות $199 לכיתה בשנה. LexiClash בחינם לכל מורה וכיתה, עם משחקי מילים ריבוי משחקים, דו קרבות 1v1 ו-6 שפות. לתרגילים אדפטיביים מיושרים בתוכנית לימודים Vocabulary.com מעולה; לתרגול אוצר מילים חינם, כיף וריבוי משחקים LexiClash מתאימה טוב יותר.',
      },
      {
        q: 'כיצד LexiClash משווה ל-Kahoot עבור אוצר מילים?',
        a: 'Kahoot היא פלטפורמת משחק חידון — תלמידים עונים לשאלות בחירה מרובה בטיימר. LexiClash היא משחק יצירת מילים — תלמידים חיפושים, בונים ומזהים מילים. עבור אוצר מילים, איות ותרגול שפה, יצירת מילים היא התאמה טובה יותר מבחירה מרובה. LexiClash גם לחלוטין בחינם (ללא Kahoot+), כאשר Kahoot מגבילה גרסה חינם ל-40 משחקים חי וסוגרת תכונות מתקדמות מאחורי Kahoot+.',
      },
      {
        q: 'תלמידים צריכים חשבונות או כניסות?',
        a: 'לא. תלמידים מצטרפים למשחק כיתה LexiClash עם קוד — ללא חשבונות לאספקה ללא נתוני תלמידים לניהול. זה הופך התפשטות ברחבי בית הספר או מחוז לפשוטה הרבה יותר מאשר כלים הדורשים רישום או כניסה לפני משחק.',
      },
      {
        q: 'איזה הטוב ביותר לכיתות ESL או רב-לשוניות?',
        a: 'LexiClash, בשולי רחוקים: יש לה מילונים מובנים לאנגלית, עברית (RTL מלא), ספרדית, שוודית, יפנית ורוסית, אז משחקי מילים עובדים בשפת המטרה. Kahoot, Gimkit ו-Vocabulary.com ממוקדות באנגלית ואין להן מכניקות משחק שפה הקשורות למילונים לכל שפה.',
      },
      {
        q: 'האם בית ספר או מחוז שלם יכול להשתמש ב-LexiClash?',
        a: 'כן — בחינם לכל מורה, ויש עמוד "לבתי ספר" כאשר בתי ספר ומחוזות יכולים להירשם לעניין בכלים אופציונליים שכבה על הגבי (לוח בקרה ניהול מחוז, אנליטיקה חוצה כיתה, ספריות תוכן, מצב ללא פרסומות, SSO). המשחק עצמו המכוון למורה אינו סגור לעולם.',
      },
    ],

    moreTitle: 'עוד השוואות',
    moreCards: [
      { title: 'LexiClash vs Kahoot', sub: 'משחקי מילים vs פורמט משחק חידון.' },
      { title: 'LexiClash vs Quizlet', sub: 'משחקי מילים vs כרטיסי הבזק.' },
      { title: 'LexiClash לבתי ספר', sub: 'חינם למורים; בנוי להתרחבות.' },
    ],

    finalTitle: 'מביא את זה לבית הספר שלך?',
    finalBody:
      'התחל בחינם עם הכיתה שלך היום. אם אתה חושב על התפשטות רחבה יותר — או רוצה לדעת איך נראות אפשרויות בית ספר ומחוז — ספר לנו על בית הספר שלך ואנחנו נביא אותך בזמן מוקדם.',
    finalCtaPlay: 'התחל משחק בכיתה בחינם',
    finalCtaSchools: 'ספר לנו על בית הספר שלך',
  },

  ru: {
    metaTitle: 'Лучшая бесплатная игра для обучения лексике в классе: LexiClash vs Kahoot, Gimkit и Vocabulary.com (2026) | LexiClash',
    metaDescription:
      'LexiClash vs Kahoot vs Gimkit vs Vocabulary.com для классов, честное сравнение. Смотрите ограничения бесплатных версий (Kahoot 40 игроков, Gimkit 5 учеников, Vocabulary.com $199/класс) и почему LexiClash бесплатна для всего класса — без входа учеников, 6 языков, 1v1 дуэли.',
    ogTitle: 'LexiClash vs Kahoot, Gimkit & Vocabulary.com — для классов',
    ogDescription: 'Честное сравнение бесплатных версий. Без ограничений по количеству игроков, без платы за каждого ученика, 6 языков, без входа учеников.',
    twitterTitle: 'Лучшая бесплатная игра для обучения лексике в классе (2026)',
    twitterDescription: 'LexiClash vs Kahoot, Gimkit & Vocabulary.com — честное сравнение.',
    heroTitle: 'Бесплатная игра для обучения лексике, которую может использовать весь класс — без ограничений, без входа.',
    intro:
      'Kahoot, Gimkit и Vocabulary.com — все хорошие инструменты — но каждый ограничивает или устанавливает цену на свою бесплатную версию так, что влияет на реальный класс. Kahoot ограничивает количество активных игроков, Gimkit урезает бесплатную версию до 5 учеников, а Vocabulary.com вообще не имеет бесплатной версии для класса. LexiClash занимает другую позицию: игра для класса бесплатна для каждого учителя, без ограничения количества игроков, без входа учеников, с 1v1 дуэлями и нативными словарями на шести языках. Вот честное сравнение этих решений.',
    ctaPlayClass: 'Играть в игру класса бесплатно',
    ctaForSchools: 'Для школ и округов',

    comparisonTitle: 'Рядом, без уловок',
    comparisonTableFeatureHeader: 'Функция',
    compareRows: [
      ['Бесплатно для полного класса', '✓ Без ограничений', '✗ Ограничение 40 игроков', '✗ Ограничение бесплатной версии 5 учеников', '✗ Нет бесплатной версии'],
      ['Платная версия (школы)', 'Бесплатно; дополнительные опции', 'Kahoot+ на учителя', '~$650–$1,000/год', '~$199/класс/год'],
      ['Без входа учеников', '✓ Присоединиться по коду', '✓ PIN', 'На основе аккаунта', 'На основе аккаунта'],
      ['Основной формат', 'Игра на составление слов', 'Викторина / множественный выбор', 'Викторина + игровая экономика', 'Адаптивные упражнения по лексике'],
      ['1v1 дуэли', '✓ Встроено', '✗', '✗', '✗'],
      ['Языки (нативные словари)', '✓ EN/HE/SV/JA/ES/RU', 'Текст на любом языке; нет словаря', 'Ориентирована на английский', 'Ориентирована на английский'],
      ['Еврейский RTL', '✓', '✗', '✗', '✗'],
      ['Лучше всего для', 'Лексика, орфография, ESL', 'Викторина / вспоминание фактов', 'Повторение с игровым циклом', 'Адаптивное овладение лексикой'],
      ['Время настройки', 'Менее 60 секунд', '2-5 мин/викторина', '2-5 мин/набор', 'Аккаунт + настройка списка'],
    ] as const,
    comparePricingFooter:
      'Цены по состоянию на 2026 год, с официальных страниц цен: бесплатная версия Kahoot ограничивает активных игроков, Kahoot+ для расширенных функций; бесплатная версия Gimkit ограничена 5 учениками, школьные планы ~$650–$1,000/год; Vocabulary.com начиная с ~$199/класс/год без бесплатной версии для класса. Всегда проверяйте текущие цены на сайте каждого поставщика.',

    whyTitle: 'Почему учителя выбирают LexiClash',
    whyCards: [
      { title: 'Бесплатно для всего класса', desc: 'Без потолка 40 игроков, без стены 5 учеников, без вступительного взноса $199. Каждый учитель играет бесплатно с полным классом — это не меняется.' },
      { title: 'Без входа учеников', desc: 'Студенты присоединяются по коду. Ничего не нужно настраивать, нет данных учеников для управления — самый простой инструмент для развертывания по всей школе.' },
      { title: 'Словесные игры, не викторины', desc: 'Для обучения лексике, орфографии и практики языка ученики ищут и составляют слова вместо выбора A/B/C/D. Лучше всего соответствует цели.' },
      { title: '6 языков включая иврит (RTL)', desc: 'Нативные словари для EN/HE/SV/JA/ES/RU — разработано для ESL, двуязычных и погружающих классов, которых другие не обслуживают.' },
      { title: '1v1 лексические дуэли', desc: 'Спарьте учеников на 2-3 минутные словесные поединки лицом к лицу — режим, который ни один из этих трех не предлагает.' },
      { title: 'Масштабируется для вашей школы', desc: 'Бесплатно для учителей, с дополнительными округными инструментами (административная панель, аналитика, библиотеки контента, без объявлений, SSO) на странице "Для школ".' },
    ],

    whenTitle: 'Когда каждый инструмент по-прежнему побеждает',
    whenKahoots: 'для викторин, вспоминания фактов и викторин на основе презентаций, его формат викторины специально разработан и трудно превзойти.',
    whenGimkits: 'его игровой цикл денег/улучшений действительно мотивирует в дни повторения, когда вам нужен крючок игровой экономики.',
    whenVocabularys: 'для глубокого, адаптивного овладения лексикой, согласованного с учебной программой, с прогрессом на ученика, это мощная специализированная платформа.',
    whenFinal: 'Многие учителя используют более одного. Суть не в том, что другие плохи — это то, что для бесплатного, многопользовательского, многоязычного составления слов без входа, LexiClash — единственная без подвохов.',

    faqTitle: 'Часто задаваемые вопросы',
    faqs: [
      {
        q: 'Какая лучшая бесплатная игра для обучения лексике в классе?',
        a: 'Для практики слов и лексики в частности, LexiClash бесплатна для всего класса без ограничения количества игроков, без входа учеников и с нативными словарями на 6 языках (английский, иврит (RTL), испанский, шведский, японский, русский). Kahoot, Gimkit и Vocabulary.com — мощные инструменты, но ограничивают или устанавливают цену на свои бесплатные версии: Kahoot ограничивает активных игроков, Gimkit ограничивает бесплатную версию 5 учениками, а Vocabulary.com не имеет реальной бесплатной версии для класса ($199/класс для начала).',
      },
      {
        q: 'Является ли LexiClash бесплатной альтернативой Gimkit?',
        a: 'Да. Бесплатная версия Gimkit ограничена 5 учениками на игру, а школьные планы стоят примерно $650–$1,000 в год. LexiClash не устанавливает ограничение учеников для игры класса и бесплатна для каждого учителя — так что вы можете запустить полный класс из 30 учеников без преграды платежа. Механика игровой экономики Gimkit забавна для повторения; LexiClash специально разработана для составления слов и лексики.',
      },
      {
        q: 'Является ли LexiClash бесплатной альтернативой Vocabulary.com?',
        a: 'Vocabulary.com — это мощная адаптивная платформа лексики, но у нее нет реальной бесплатной версии для класса — цены начинаются около $199 за класс в год. LexiClash бесплатна для каждого учителя и класса, с многопользовательскими словесными играми, 1v1 дуэлями и 6 языками. Для адаптивных упражнений, согласованных с учебной программой, Vocabulary.com отличная; для бесплатной, веселой, многопользовательской практики лексики LexiClash подходит лучше.',
      },
      {
        q: 'Как LexiClash сравнивается с Kahoot по лексике?',
        a: 'Kahoot — это платформа викторины — ученики отвечают на вопросы с множественным выбором по таймеру. LexiClash — это игра на составление слов — ученики ищут, составляют и узнают слова. Для лексики, орфографии и практики языка составление слов лучше соответствует задаче, чем множественный выбор. LexiClash также полностью бесплатна (без Kahoot+), в то время как Kahoot ограничивает бесплатную версию 40 активными игроками и закрывает расширенные функции за Kahoot+.',
      },
      {
        q: 'Нужны ли ученикам аккаунты или входы?',
        a: 'Нет. Ученики присоединяются к игре класса LexiClash по коду — нет аккаунтов для подготовки и нет данных учеников для управления. Это делает развертывание по всей школе или округу намного проще, чем инструменты, требующие регистрации или входа до игры.',
      },
      {
        q: 'Какой лучше всего для ESL или многоязычных классов?',
        a: 'LexiClash, и это не близко: у нее есть нативные словари для английского, иврита (полный RTL), испанского, шведского, японского и русского языков, поэтому словесные игры работают на целевом языке. Kahoot, Gimkit и Vocabulary.com ориентированы на английский и не имеют механики словесных игр, связанной со словарями для каждого языка.',
      },
      {
        q: 'Может ли вся школа или округ использовать LexiClash?',
        a: 'Да — она бесплатна для каждого учителя, и есть страница "Для школ", где школы и округа могут зарегистрировать интерес к дополнительным инструментам сверху (административная панель округа, аналитика между классами, библиотеки контента, режим без объявлений, SSO). Сама игра, ориентированная на учителя, никогда не закрывается.',
      },
    ],

    moreTitle: 'Больше сравнений',
    moreCards: [
      { title: 'LexiClash vs Kahoot', sub: 'Словесные игры vs формат викторины.' },
      { title: 'LexiClash vs Quizlet', sub: 'Словесные игры vs карточки.' },
      { title: 'LexiClash для школ', sub: 'Бесплатно для учителей; разработано для масштабирования.' },
    ],

    finalTitle: 'Приносите это в вашу школу?',
    finalBody:
      'Начните бесплатно с вашим классом сегодня. Если вы думаете о более широком развертывании — или хотите узнать, как выглядят варианты школы и округа — расскажите нам о вашей школе, и мы привлечем вас рано.',
    finalCtaPlay: 'Начать игру класса бесплатно',
    finalCtaSchools: 'Расскажите нам о вашей школе',
  },
};

export function getComparisonContent(locale: string): LocaleContent {
  return contentMap[(locale as ComparisonLocale) || 'en'] || contentMap.en;
}
