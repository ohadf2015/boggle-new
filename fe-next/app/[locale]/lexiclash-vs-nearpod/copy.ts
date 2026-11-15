/**
 * Visible page text for /[locale]/lexiclash-vs-nearpod, in every locale.
 * Metadata (title, description, OG) is deliberately NOT here: it stays English
 * with a noindex on non-English locales (see page.tsx) and is SEO-frozen.
 */
import type { Locale } from '@/i18n/config';
import { resolveVsLocale } from '@/lib/seo/vsCommonCopy';
import type { VsFoilCopy } from '@/lib/seo/vsFoilCopy';

const common: Record<Locale, Pick<VsFoilCopy, 'sideHeading' | 'thFeature' | 'faqHeading'>> = {
  en: { sideHeading: 'Side-by-side', thFeature: 'Feature', faqHeading: 'FAQ' },
  he: { sideHeading: 'זה מול זה', thFeature: 'תכונה', faqHeading: 'שאלות נפוצות' },
  es: { sideHeading: 'Cara a cara', thFeature: 'Característica', faqHeading: 'Preguntas frecuentes' },
  sv: { sideHeading: 'Sida vid sida', thFeature: 'Funktion', faqHeading: 'Vanliga frågor' },
  ja: { sideHeading: '並べて比較', thFeature: '項目', faqHeading: 'よくある質問' },
  ru: { sideHeading: 'Сравнение', thFeature: 'Возможность', faqHeading: 'Частые вопросы' },
};

const pageCopy: Record<Locale, Omit<VsFoilCopy, 'sideHeading' | 'thFeature' | 'faqHeading'>> = {
  en: {
    eyebrow: "Compare · honesty foil",
    h1: "LexiClash vs Nearpod Silver — free 40 joins / 300 MB foil",
    lede: "Nearpod Silver ($0) publishes **40 joins per lesson** and **300 MB** storage; Gold 75 / Platinum 90 / School·District 250. LexiClash foils with whole-class free (50) + miss→reteach Live. Cite [nearpod.com/pricing](https://nearpod.com/pricing).",
    thCompetitor: "Nearpod Silver",
    rows: [
      ['Free joins / seats', '✓ Up to 50 students free', 'Silver: 40 joins per lesson'],
      ['Free storage / lesson library gate', '✓ No 300 MB free storage cliff on reteach Live', 'Silver: 300 MB storage'],
      ['Paid join ladders', '—', 'Gold 75 · Platinum 90 · School/District 250'],
      ['Miss → reteach Live', '✓ Free miss-gap → Live deep-link', 'Lesson replay / reports (plan-gated features vary)'],
      ['No student signup', '✓ 6-character join code', 'Students join Nearpod lessons'],
      ['Game / lesson type', 'Word-formation (Boggle/Wheel/Anagram)', 'Interactive lessons / slides / assessments'],
      ['Evidence', '—', 'nearpod.com/pricing (Silver $0: 40 joins · 300 MB)'],
    ],
    footnote: "Blooket Starter ≤60 + homework 14d is #1166. Gimkit Pro-Exclusive 5 is #1137. Wayground Starter 20-activity is #1136. Kahoot Go 40 vs FAQ 10 is #1132.",
    faqs: [
      {
          q: 'What are Nearpod Silver free join and storage caps?',
          a: 'Nearpod pricing (nearpod.com/pricing, lastChecked September 28, 2026): Silver $0 includes 40 joins per lesson and 300 MB storage. Gold raises joins to 75 (1 GB); Platinum to 90 (5 GB); School/District licenses list 250 joins and unlimited storage.',
      },
      {
          q: 'How does LexiClash foil Nearpod Silver’s 40-join / 300 MB free caps?',
          a: 'LexiClash free classroom vocab runs a whole class (up to 50 students) with miss-gap → reteach Live — one published free seat cap, no separate 300 MB lesson-storage gate on the free reteach path. Distinct from Blooket Starter ≤60/#1166, Wayground Starter 20-activity/#1136, Gimkit Pro-Exclusive 5/#1137, Kahoot Go 40vs10/#1132, and Blooket Gaps/#1125.',
      },
      {
          q: 'Is LexiClash a slide/lesson platform like Nearpod?',
          a: 'Different category. Nearpod is interactive lessons / slides / formative assessments with storage and join caps by plan. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats on the classroom loop.',
      },
      {
          q: 'Do students need accounts on LexiClash?',
          a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games.',
      },
    ],
    ctaStart: "Start a classroom game",
    related: [
      { label: "vs Blooket" },
      { label: "vs Gimkit" },
      { label: "vs Kahoot" },
    ],
  },
  he: {
    eyebrow: 'השוואה כנה',
    h1: 'LexiClash מול Nearpod Silver — 40 הצטרפויות ו-300 MB בחינם, בכנות',
    lede: 'Nearpod Silver (0 $) מפרסם **40 הצטרפויות לכל שיעור** ואחסון של **300 MB**; ב-Gold 75, ב-Platinum 90 ובמסלולי בית ספר ומחוז 250. LexiClash עונה על כך עם כל הכיתה בחינם (50) וחזרה חיה על הטעויות. מקור: [nearpod.com/pricing](https://nearpod.com/pricing).',
    thCompetitor: 'Nearpod Silver',
    rows: [
      ['הצטרפויות / מקומות בחינם', '✓ עד 50 תלמידים בחינם', 'Silver: 40 הצטרפויות לכל שיעור'],
      ['אחסון בחינם / חסם ספריית השיעורים', '✓ בלי מגבלת אחסון של 300 MB בחזרה החיה על הטעויות', 'Silver: אחסון של 300 MB'],
      ['מדרגות הצטרפות בתשלום', '—', 'Gold 75 · Platinum 90 · בית ספר/מחוז 250'],
      ['מטעויות לחזרה חיה', '✓ מילים שהוחמצו מובילות בקישור ישיר למשחק חי, בחינם', 'הפעלה חוזרת של שיעורים / דוחות (היקף התכונות משתנה לפי התוכנית)'],
      ['בלי הרשמת תלמידים', '✓ קוד הצטרפות של 6 תווים', 'התלמידים מצטרפים לשיעורי Nearpod'],
      ['סוג המשחק / השיעור', 'יצירת מילים (Boggle / גלגל / אנגרמות)', 'שיעורים אינטראקטיביים / מצגות / הערכות'],
      ['מקור', '—', 'nearpod.com/pricing (Silver 0 $: 40 הצטרפויות · 300 MB)'],
    ],
    footnote: '',
    faqs: [
      { q: 'מהן מגבלות ההצטרפות והאחסון החינמיות של Nearpod Silver?', a: 'התמחור של Nearpod (nearpod.com/pricing, נבדק לאחרונה ב-28 בספטמבר 2026): Silver ב-0 $ כולל 40 הצטרפויות לכל שיעור ואחסון של 300 MB. Gold מעלה את ההצטרפויות ל-75 (1 GB); Platinum ל-90 (5 GB); ברישיונות בית ספר ומחוז מופיעות 250 הצטרפויות ואחסון ללא הגבלה.' },
      { q: 'איך LexiClash מתמודד עם מגבלות 40 ההצטרפויות ו-300 MB של Nearpod Silver?', a: 'אוצר המילים החינמי של LexiClash לכיתה מפעיל כיתה שלמה (עד 50 תלמידים) עם חזרה חיה על הטעויות — תקרת מקומות חינמית אחת ומפורסמת, בלי חסם נפרד של 300 MB אחסון שיעורים במסלול החזרה החינמי. שונה מ-Blooket Starter (עד 60), Wayground Starter (20 פעילויות), Gimkit במצבי Pro בלבד (5), Kahoot Go (40 מול 10) ופערי Blooket.' },
      { q: 'האם LexiClash הוא פלטפורמת מצגות ושיעורים כמו Nearpod?', a: 'זו קטגוריה אחרת. Nearpod הוא שיעורים אינטראקטיביים, מצגות והערכה מעצבת, עם מגבלות אחסון והצטרפות לפי תוכנית. LexiClash הוא יצירת מילים (רשתות בסגנון Boggle, אנגרמות, גלגלי מילים) לתרגול אוצר מילים — מקומות חינמיים לכל הכיתה במעגל הכיתתי.' },
      { q: 'האם תלמידים צריכים חשבון ב-LexiClash?', a: 'לא. התלמידים מצטרפים עם קוד של 6 תווים. Teacher Pro מוסיף כיתות ללא הגבלה ודוחות להדפסה; המסלול החינמי כבר מכסה כיתה שלמה של עד 50 תלמידים במשחקי מילים לאוצר מילים.' },
    ],
    ctaStart: 'התחילו משחק כיתתי',
    related: [{ label: 'מול Blooket' }, { label: 'מול Gimkit' }, { label: 'מול Kahoot' }],
  },

  es: {
    eyebrow: 'Comparativa honesta',
    h1: 'LexiClash vs Nearpod Silver: 40 accesos y 300 MB gratis, con honestidad',
    lede: 'Nearpod Silver (0 $) publica **40 accesos por lección** y **300 MB** de almacenamiento; Gold 75, Platinum 90 y escuela/distrito 250. LexiClash responde con toda la clase gratis (50) y repaso en vivo de los fallos. Fuente: [nearpod.com/pricing](https://nearpod.com/pricing).',
    thCompetitor: 'Nearpod Silver',
    rows: [
      ['Accesos / plazas gratis', '✓ Hasta 50 estudiantes gratis', 'Silver: 40 accesos por lección'],
      ['Almacenamiento gratis / límite de la biblioteca de lecciones', '✓ Sin el límite de 300 MB de almacenamiento en el repaso en vivo', 'Silver: 300 MB de almacenamiento'],
      ['Escalones de accesos de pago', '—', 'Gold 75 · Platinum 90 · Escuela/Distrito 250'],
      ['De los fallos al repaso en vivo', '✓ Los fallos llevan directamente a una partida en vivo, gratis', 'Reproducción de lecciones / informes (las funciones varían según el plan)'],
      ['Sin registro del alumnado', '✓ Código de acceso de 6 caracteres', 'El alumnado se une a las lecciones de Nearpod'],
      ['Tipo de juego / lección', 'Formación de palabras (Boggle/Rueda/Anagramas)', 'Lecciones interactivas / diapositivas / evaluaciones'],
      ['Fuente', '—', 'nearpod.com/pricing (Silver 0 $: 40 accesos · 300 MB)'],
    ],
    footnote: '',
    faqs: [
      { q: '¿Cuáles son los límites gratuitos de accesos y almacenamiento de Nearpod Silver?', a: 'Precios de Nearpod (nearpod.com/pricing, última comprobación el 28 de septiembre de 2026): Silver, a 0 $, incluye 40 accesos por lección y 300 MB de almacenamiento. Gold sube los accesos a 75 (1 GB); Platinum a 90 (5 GB); las licencias de escuela y distrito indican 250 accesos y almacenamiento ilimitado.' },
      { q: '¿Cómo responde LexiClash a los límites de 40 accesos y 300 MB de Nearpod Silver?', a: 'El vocabulario de aula gratuito de LexiClash reúne a una clase entera (hasta 50 estudiantes) con repaso en vivo de los fallos: un único límite gratuito publicado de plazas, sin un tope aparte de 300 MB de almacenamiento de lecciones en el repaso gratuito. No es lo mismo que Blooket Starter (hasta 60), Wayground Starter (20 actividades), Gimkit con modos solo Pro (5), Kahoot Go (40 frente a 10) ni los huecos de Blooket.' },
      { q: '¿Es LexiClash una plataforma de diapositivas y lecciones como Nearpod?', a: 'Es otra categoría. Nearpod son lecciones interactivas, diapositivas y evaluación formativa, con límites de almacenamiento y de accesos según el plan. LexiClash es un juego de formar palabras (cuadrículas estilo Boggle, anagramas, ruedas de palabras) para practicar vocabulario: plazas gratuitas para toda la clase en el bucle de aula.' },
      { q: '¿Necesita el alumnado cuentas en LexiClash?', a: 'No. El alumnado se une con un código de 6 caracteres. Teacher Pro añade clases ilimitadas e informes imprimibles; el plan gratuito ya cubre una clase completa de hasta 50 estudiantes en los juegos de palabras de vocabulario.' },
    ],
    ctaStart: 'Empezar una partida de clase',
    related: [{ label: 'vs Blooket' }, { label: 'vs Gimkit' }, { label: 'vs Kahoot' }],
  },

  sv: {
    eyebrow: 'Ärlig jämförelse',
    h1: 'LexiClash vs Nearpod Silver — 40 anslutningar och 300 MB gratis, ärligt talat',
    lede: 'Nearpod Silver (0 $) publicerar **40 anslutningar per lektion** och **300 MB** lagring; Gold 75, Platinum 90 och skol-/distriktslicens 250. LexiClash svarar med hela klassen gratis (50) och live-repetition av missar. Källa: [nearpod.com/pricing](https://nearpod.com/pricing).',
    thCompetitor: 'Nearpod Silver',
    rows: [
      ['Gratis anslutningar / platser', '✓ Upp till 50 elever gratis', 'Silver: 40 anslutningar per lektion'],
      ['Gratis lagring / spärr i lektionsbiblioteket', '✓ Ingen lagringsgräns på 300 MB i live-repetitionen', 'Silver: 300 MB lagring'],
      ['Betalda anslutningssteg', '—', 'Gold 75 · Platinum 90 · Skola/distrikt 250'],
      ['Från miss till live-repetition', '✓ Missade ord leder direkt till ett live-spel, gratis', 'Uppspelning av lektioner / rapporter (funktionerna varierar mellan planerna)'],
      ['Ingen elevregistrering', '✓ Anslutningskod med 6 tecken', 'Eleverna går med i Nearpod-lektioner'],
      ['Spel- / lektionstyp', 'Ordbildning (Boggle/Hjul/Anagram)', 'Interaktiva lektioner / bildspel / bedömningar'],
      ['Källa', '—', 'nearpod.com/pricing (Silver 0 $: 40 anslutningar · 300 MB)'],
    ],
    footnote: '',
    faqs: [
      { q: 'Vilka gratisgränser för anslutningar och lagring har Nearpod Silver?', a: 'Nearpods prissida (nearpod.com/pricing, senast kontrollerad 28 september 2026): Silver för 0 $ ger 40 anslutningar per lektion och 300 MB lagring. Gold höjer anslutningarna till 75 (1 GB); Platinum till 90 (5 GB); skol- och distriktslicenser anger 250 anslutningar och obegränsad lagring.' },
      { q: 'Hur svarar LexiClash på Nearpod Silvers gränser på 40 anslutningar och 300 MB?', a: 'LexiClashs gratis klassrumsordförråd kör en hel klass (upp till 50 elever) med live-repetition av missar — en enda publicerad gratisgräns för platser, utan separat lagringsspärr på 300 MB för lektioner i den gratis repetitionen. Skiljer sig från Blooket Starter (upp till 60), Wayground Starter (20 aktiviteter), Gimkit med enbart Pro-lägen (5), Kahoot Go (40 mot 10) och Blookets luckor.' },
      { q: 'Är LexiClash en plattform för bildspel och lektioner som Nearpod?', a: 'Det är en annan kategori. Nearpod är interaktiva lektioner, bildspel och formativ bedömning, med lagrings- och anslutningsgränser beroende på plan. LexiClash är ordbildning (Boggle-liknande rutnät, anagram, ordhjul) för ordförrådsträning — gratisplatser för hela klassen i klassrumsloopen.' },
      { q: 'Behöver eleverna konton på LexiClash?', a: 'Nej. Eleverna går med med en kod på 6 tecken. Teacher Pro lägger till obegränsat antal klasser och utskrivbara rapporter; gratisnivån täcker redan en hel klass på upp till 50 elever i ordspel för ordförråd.' },
    ],
    ctaStart: 'Starta ett klassrumsspel',
    related: [{ label: 'vs Blooket' }, { label: 'vs Gimkit' }, { label: 'vs Kahoot' }],
  },

  ja: {
    eyebrow: '正直な比較',
    h1: 'LexiClash vs Nearpod Silver — 無料の参加40人・300MBの上限を正直に比較',
    lede: 'Nearpod Silver(0ドル)は、**1レッスンあたり40人の参加**と**300MB**のストレージを公開しています。Gold は75人、Platinum は90人、学校・学区向けは250人です。LexiClash は、クラス全員(50人)を無料で受け入れ、ミスの単語をライブで復習できます。出典: [nearpod.com/pricing](https://nearpod.com/pricing)。',
    thCompetitor: 'Nearpod Silver',
    rows: [
      ['無料の参加人数/席', '✓ 最大50人まで無料', 'Silver: 1レッスンあたり40人の参加'],
      ['無料ストレージ/レッスンライブラリの壁', '✓ ライブ復習に300MBのストレージ制限なし', 'Silver: 300MBのストレージ'],
      ['有料プランの参加人数の段階', '—', 'Gold 75 · Platinum 90 · 学校/学区 250'],
      ['ミスからライブ復習へ', '✓ ミスした単語から無料のライブゲームへ直接リンク', 'レッスンの再生/レポート(機能はプランにより異なる)'],
      ['生徒の登録不要', '✓ 6文字の参加コード', '生徒は Nearpod のレッスンに参加'],
      ['ゲーム/授業のタイプ', '単語づくり(Boggle/ホイール/アナグラム)', 'インタラクティブな授業 / スライド / 評価'],
      ['出典', '—', 'nearpod.com/pricing(Silver 0ドル: 参加40人・300MB)'],
    ],
    footnote: '',
    faqs: [
      { q: 'Nearpod Silver の無料の参加人数とストレージの上限は?', a: 'Nearpod の料金ページ(nearpod.com/pricing、2026年9月28日確認)では、0ドルの Silver に1レッスンあたり40人の参加と300MBのストレージが含まれます。Gold は参加75人(1GB)、Platinum は90人(5GB)、学校・学区ライセンスは250人でストレージ無制限とされています。' },
      { q: 'LexiClash は Nearpod Silver の「参加40人・300MB」の上限にどう対応しますか?', a: 'LexiClash の無料の教室向け語彙ゲームは、クラス全体(最大50人)で遊べ、ミスした単語をライブで復習できます。公開している無料の席数の上限は1つだけで、無料の復習で別途300MBのレッスン保存の壁はありません。Blooket Starter(最大60)、Wayground Starter(20アクティビティ)、Gimkit の Pro 限定モード(5)、Kahoot Go(40と10)、Blooket のギャップとは別の仕組みです。' },
      { q: 'LexiClash は Nearpod のようなスライド・授業プラットフォームですか?', a: 'カテゴリが異なります。Nearpod はインタラクティブな授業、スライド、形成的評価のツールで、プランごとにストレージと参加人数の上限があります。LexiClash は語彙練習のための単語づくりゲーム(Boggle 風のグリッド、アナグラム、ワードホイール)で、教室ループではクラス全員が無料で参加できます。' },
      { q: '生徒は LexiClash のアカウントが必要ですか?', a: '不要です。生徒は6文字のコードで参加します。Teacher Pro ではクラス数が無制限になり、印刷用レポートも使えます。無料プランでも、語彙の単語ゲームなら最大50人のクラス全体をすでにカバーできます。' },
    ],
    ctaStart: 'クラスゲームを始める',
    related: [{ label: 'vs Blooket' }, { label: 'vs Gimkit' }, { label: 'vs Kahoot' }],
  },

  ru: {
    eyebrow: 'Честное сравнение',
    h1: 'LexiClash vs Nearpod Silver — бесплатные 40 подключений и 300 МБ: честно',
    lede: 'Nearpod Silver (0 $) указывает **40 подключений на урок** и **300 МБ** хранилища; у Gold — 75, у Platinum — 90, у школьных и районных лицензий — 250. LexiClash отвечает бесплатным входом для всего класса (50 человек) и живым повторением ошибок. Источник: [nearpod.com/pricing](https://nearpod.com/pricing).',
    thCompetitor: 'Nearpod Silver',
    rows: [
      ['Бесплатные подключения / места', '✓ До 50 учеников бесплатно', 'Silver: 40 подключений на урок'],
      ['Бесплатное хранилище / барьер библиотеки уроков', '✓ Без лимита хранилища в 300 МБ в живом повторении', 'Silver: 300 МБ хранилища'],
      ['Платные ступени подключений', '—', 'Gold 75 · Platinum 90 · Школа/район 250'],
      ['От ошибки к живому повторению', '✓ Пропущенные слова ведут прямой ссылкой в живую игру, бесплатно', 'Повтор уроков / отчёты (набор функций зависит от тарифа)'],
      ['Без регистрации учеников', '✓ Код входа из 6 символов', 'Ученики входят в уроки Nearpod'],
      ['Тип игры / урока', 'Составление слов (Boggle/Колесо/Анаграммы)', 'Интерактивные уроки / слайды / оценивание'],
      ['Источник', '—', 'nearpod.com/pricing (Silver 0 $: 40 подключений · 300 МБ)'],
    ],
    footnote: '',
    faqs: [
      { q: 'Каковы бесплатные лимиты подключений и хранилища у Nearpod Silver?', a: 'Цены Nearpod (nearpod.com/pricing, проверено 28 сентября 2026 года): Silver за 0 $ включает 40 подключений на урок и 300 МБ хранилища. Gold повышает число подключений до 75 (1 ГБ); Platinum — до 90 (5 ГБ); школьные и районные лицензии указывают 250 подключений и неограниченное хранилище.' },
      { q: 'Как LexiClash отвечает на лимиты Nearpod Silver — 40 подключений и 300 МБ?', a: 'Бесплатная классная игра LexiClash по лексике вмещает весь класс (до 50 учеников) и повторяет ошибки вживую: один опубликованный бесплатный лимит мест, без отдельного барьера в 300 МБ для хранения уроков на бесплатном пути повторения. Это отличается от Blooket Starter (до 60), Wayground Starter (20 заданий), Gimkit с режимами только для Pro (5), Kahoot Go (40 против 10) и пробелов Blooket.' },
      { q: 'LexiClash — это платформа слайдов и уроков, как Nearpod?', a: 'Это другая категория. Nearpod — интерактивные уроки, слайды и формирующее оценивание, с лимитами хранилища и подключений по тарифу. LexiClash — игра в составление слов (сетки в стиле Boggle, анаграммы, колёса слов) для тренировки лексики: бесплатные места для всего класса в классном цикле.' },
      { q: 'Нужны ли ученикам аккаунты в LexiClash?', a: 'Нет. Ученики входят по коду из 6 символов. Teacher Pro добавляет неограниченное число классов и печатные отчёты; бесплатный тариф уже покрывает целый класс до 50 человек в словесных играх для лексики.' },
    ],
    ctaStart: 'Начать игру для класса',
    related: [{ label: 'vs Blooket' }, { label: 'vs Gimkit' }, { label: 'vs Kahoot' }],
  },
};

export const copies: Record<Locale, VsFoilCopy> = Object.fromEntries(
  (Object.keys(pageCopy) as Locale[]).map((l) => [l, { ...common[l], ...pageCopy[l] }]),
) as Record<Locale, VsFoilCopy>;

export { resolveVsLocale };
