/**
 * Visible page text for /[locale]/lexiclash-vs-padlet, in every locale.
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
    h1: "LexiClash vs Padlet Neon Free — 3 padlets + 20MB honesty",
    lede: "Padlet **Neon Free** publishes **3 fully customizable / active padlets** and a **20MB upload limit per file** (plus 1 user, 2-minute video / 5-minute audio recordings). **Platinum** unlocks unlimited padlets and 500MB uploads. LexiClash foils with whole-class free (50) for word-formation vocab — **no 3-active-padlet Neon Free gate**. Cite [padlet.help …/is-it-free](https://padlet.help/l/en/article/d7d009lugq-is-it-free) and [padlet.com/site/subscriptions](https://padlet.com/site/subscriptions).",
    thCompetitor: "Padlet Neon Free",
    rows: [
      [
        'Free active boards / classes',
        '✓ Whole-class free (up to 50)',
        'Neon Free: 3 active padlets',
      ],
      [
        'Upload / attachment size (Free)',
        '— (live word-formation play; no board-upload gate)',
        'Neon Free: 20MB upload/file',
      ],
      [
        'Users on Free',
        '✓ Teacher host + students via join code',
        'Neon Free: 1 user',
      ],
      [
        'Video / audio recording caps (Free)',
        '— (vocab game modes)',
        'Neon Free: 2-min video / 5-min audio',
      ],
      [
        'Unlimited boards / higher uploads',
        'Teacher Pro: unlimited classes + reports',
        'Platinum: unlimited padlets + 500MB uploads',
      ],
      [
        'Miss → reteach Live',
        '✓ Free miss-gap → Live deep-link',
        'Canvas boards / paid Classroom-School plans',
      ],
      ['No student signup', '✓ 6-character join code', 'Padlet account / free student seats on Classroom'],
      [
        'Game / lesson type',
        'Word-formation (Boggle/Wheel/Anagram)',
        'Digital canvas / boards + Sandbox + Slideshow',
      ],
      [
        'Evidence',
        '—',
        'padlet.help …/is-it-free + padlet.com/site/subscriptions',
      ],
    ],
    footnote: '',
    faqs: [
      {
          q: 'What does Padlet Neon Free publish for active boards and uploads?',
          a: 'Padlet help (padlet.help …/is-it-free, lastChecked September 30, 2026) and subscriptions (padlet.com/site/subscriptions) list Neon / Free with 3 fully customizable / active padlets, a 20MB upload limit per file/attachment, 1 user, 2-minute video recordings, and 5-minute audio recordings. Unlimited posts are allowed under those upload limits. Platinum unlocks unlimited padlets and 500MB file uploads.',
      },
      {
          q: 'How does LexiClash foil Padlet Neon Free honesty?',
          a: 'LexiClash free classroom vocab runs a whole class (up to 50) for word-formation games with miss-gap → reteach Live — no Neon Free 3-active-padlet or 20MB board-upload gate for classroom play. Distinct from Pear Deck Teacher Free named-response, Nearpod Silver, Mentimeter Free 50/month, Wayground Starter, Kahoot Go, Socrative Free, and ClassPoint Basic Free.',
      },
      {
          q: 'Is LexiClash a digital canvas / board tool like Padlet?',
          a: 'Different category. Padlet is a digital canvas for visual collaboration with Neon Free capped at 3 active padlets + 20MB uploads. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats without a 3-board Neon Free gate.',
      },
      {
          q: 'Do students need accounts on LexiClash?',
          a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games.',
      },
    ],
    ctaStart: "Start a classroom game",
    related: [
      { label: "vs Pear Deck" },
      { label: "vs Nearpod" },
      { label: "vs Kahoot" },
    ],
  },
  he: {
    eyebrow: 'השוואה כנה',
    h1: 'LexiClash מול Padlet Neon Free — 3 פדלטים ו-20MB, בכנות',
    lede: 'Padlet **Neon Free** מפרסם **3 פדלטים פעילים הניתנים להתאמה מלאה** ומגבלת העלאה של **20MB לקובץ** (בנוסף למשתמש אחד, הקלטות וידאו של עד 2 דקות והקלטות שמע של עד 5 דקות). **Platinum** פותח פדלטים ללא הגבלה והעלאות של 500MB. LexiClash עונה על כך עם כל הכיתה בחינם (50) למשחקי יצירת מילים — **בלי חסם של 3 פדלטים פעילים כמו ב-Neon Free**. מקורות: [padlet.help …/is-it-free](https://padlet.help/l/en/article/d7d009lugq-is-it-free) ו-[padlet.com/site/subscriptions](https://padlet.com/site/subscriptions).',
    thCompetitor: 'Padlet Neon Free',
    rows: [
      ['לוחות / כיתות פעילים בחינם', '✓ כל הכיתה בחינם (עד 50)', 'Neon Free: 3 פדלטים פעילים'],
      ['גודל העלאה / קובץ מצורף (Free)', '— (משחק חי ליצירת מילים; בלי מגבלת העלאה ללוח)', 'Neon Free: 20MB להעלאה לקובץ'],
      ['משתמשים ב-Free', '✓ מורה מנחה + תלמידים בקוד הצטרפות', 'Neon Free: משתמש אחד'],
      ['מגבלות הקלטת וידאו / שמע (Free)', '— (מצבי משחק לאוצר מילים)', 'Neon Free: וידאו עד 2 דקות / שמע עד 5 דקות'],
      ['לוחות ללא הגבלה / העלאות גדולות יותר', 'Teacher Pro: כיתות ללא הגבלה + דוחות', 'Platinum: פדלטים ללא הגבלה + העלאות של 500MB'],
      ['מטעויות לחזרה חיה', '✓ מילים שהוחמצו מובילות בקישור ישיר למשחק חי, בחינם', 'לוחות קנבס / תוכניות כיתה ובית ספר בתשלום'],
      ['בלי הרשמת תלמידים', '✓ קוד הצטרפות של 6 תווים', 'חשבון Padlet / מקומות תלמידים בחינם ב-Classroom'],
      ['סוג המשחק / השיעור', 'יצירת מילים (Boggle / גלגל / אנגרמות)', 'קנבס דיגיטלי / לוחות + Sandbox + מצגת'],
      ['מקור', '—', 'padlet.help …/is-it-free + padlet.com/site/subscriptions'],
    ],
    footnote: '',
    faqs: [
      { q: 'מה Padlet Neon Free מפרסם לגבי לוחות פעילים והעלאות?', a: 'מרכז העזרה של Padlet (padlet.help …/is-it-free, נבדק לאחרונה ב-30 בספטמבר 2026) ועמוד המנויים (padlet.com/site/subscriptions) מציגים ב-Neon / Free: 3 פדלטים פעילים הניתנים להתאמה מלאה, מגבלת העלאה של 20MB לקובץ או לקובץ מצורף, משתמש אחד, הקלטות וידאו של עד 2 דקות והקלטות שמע של עד 5 דקות. מותר לפרסם פוסטים ללא הגבלה במסגרת מגבלות ההעלאה האלה. Platinum פותח פדלטים ללא הגבלה והעלאות קבצים של 500MB.' },
      { q: 'איך LexiClash מתמודד עם המגבלות של Padlet Neon Free?', a: 'אוצר המילים החינמי של LexiClash לכיתה מפעיל כיתה שלמה (עד 50) במשחקי יצירת מילים עם חזרה חיה על הטעויות — בלי חסם של 3 פדלטים פעילים או 20MB להעלאה ללוח כמו ב-Neon Free, למשחק בכיתה. שונה מ-Pear Deck Teacher Free עם תשובות בשם, Nearpod Silver, Mentimeter Free (50 בחודש), Wayground Starter, Kahoot Go, Socrative Free ו-ClassPoint Basic Free.' },
      { q: 'האם LexiClash הוא כלי קנבס ולוחות דיגיטליים כמו Padlet?', a: 'זו קטגוריה אחרת. Padlet הוא קנבס דיגיטלי לשיתוף פעולה חזותי, ו-Neon Free מוגבל ל-3 פדלטים פעילים ו-20MB להעלאה. LexiClash הוא יצירת מילים (רשתות בסגנון Boggle, אנגרמות, גלגלי מילים) לתרגול אוצר מילים — מקומות חינמיים לכל הכיתה בלי חסם של 3 לוחות כמו ב-Neon Free.' },
      { q: 'האם תלמידים צריכים חשבון ב-LexiClash?', a: 'לא. התלמידים מצטרפים עם קוד של 6 תווים. Teacher Pro מוסיף כיתות ללא הגבלה ודוחות להדפסה; המסלול החינמי כבר מכסה כיתה שלמה של עד 50 תלמידים במשחקי מילים לאוצר מילים.' },
    ],
    ctaStart: 'התחילו משחק כיתתי',
    related: [{ label: 'מול Pear Deck' }, { label: 'מול Nearpod' }, { label: 'מול Kahoot' }],
  },

  es: {
    eyebrow: 'Comparativa honesta',
    h1: 'LexiClash vs Padlet Neon Free: 3 padlets y 20 MB, con honestidad',
    lede: 'Padlet **Neon Free** publica **3 padlets activos totalmente personalizables** y un límite de subida de **20 MB por archivo** (además de 1 usuario y grabaciones de vídeo de 2 minutos y de audio de 5 minutos). **Platinum** desbloquea padlets ilimitados y subidas de 500 MB. LexiClash responde con toda la clase gratis (50) para juegos de formar palabras: **sin el tope de 3 padlets activos de Neon Free**. Fuentes: [padlet.help …/is-it-free](https://padlet.help/l/en/article/d7d009lugq-is-it-free) y [padlet.com/site/subscriptions](https://padlet.com/site/subscriptions).',
    thCompetitor: 'Padlet Neon Free',
    rows: [
      ['Tableros / clases activos gratis', '✓ Toda la clase gratis (hasta 50)', 'Neon Free: 3 padlets activos'],
      ['Tamaño de subida / adjunto (Free)', '— (juego en vivo de formar palabras; sin límite de subida a tableros)', 'Neon Free: 20 MB de subida por archivo'],
      ['Usuarios en Free', '✓ Docente anfitrión + alumnado con código de acceso', 'Neon Free: 1 usuario'],
      ['Límites de grabación de vídeo / audio (Free)', '— (modos de juego de vocabulario)', 'Neon Free: vídeo de 2 min / audio de 5 min'],
      ['Tableros ilimitados / subidas mayores', 'Teacher Pro: clases ilimitadas + informes', 'Platinum: padlets ilimitados + subidas de 500 MB'],
      ['De los fallos al repaso en vivo', '✓ Los fallos llevan directamente a una partida en vivo, gratis', 'Tableros de lienzo / planes de pago para aula y escuela'],
      ['Sin registro del alumnado', '✓ Código de acceso de 6 caracteres', 'Cuenta de Padlet / plazas gratuitas para el alumnado en Classroom'],
      ['Tipo de juego / lección', 'Formación de palabras (Boggle/Rueda/Anagramas)', 'Lienzo digital / tableros + Sandbox + presentación'],
      ['Fuente', '—', 'padlet.help …/is-it-free + padlet.com/site/subscriptions'],
    ],
    footnote: '',
    faqs: [
      { q: '¿Qué publica Padlet Neon Free sobre tableros activos y subidas?', a: 'La ayuda de Padlet (padlet.help …/is-it-free, última comprobación el 30 de septiembre de 2026) y la página de suscripciones (padlet.com/site/subscriptions) indican para Neon / Free: 3 padlets activos totalmente personalizables, un límite de subida de 20 MB por archivo o adjunto, 1 usuario, grabaciones de vídeo de 2 minutos y de audio de 5 minutos. Se permiten publicaciones ilimitadas dentro de esos límites de subida. Platinum desbloquea padlets ilimitados y subidas de archivos de 500 MB.' },
      { q: '¿Cómo responde LexiClash a los límites de Padlet Neon Free?', a: 'El vocabulario de aula gratuito de LexiClash reúne a una clase entera (hasta 50) en juegos de formar palabras con repaso en vivo de los fallos: sin el tope de 3 padlets activos ni de 20 MB de subida a tableros de Neon Free para jugar en clase. No es lo mismo que Pear Deck Teacher Free con respuestas con nombre, Nearpod Silver, Mentimeter Free (50 al mes), Wayground Starter, Kahoot Go, Socrative Free ni ClassPoint Basic Free.' },
      { q: '¿Es LexiClash una herramienta de lienzo y tableros digitales como Padlet?', a: 'Es otra categoría. Padlet es un lienzo digital para la colaboración visual, y Neon Free está limitado a 3 padlets activos y 20 MB de subida. LexiClash es un juego de formar palabras (cuadrículas estilo Boggle, anagramas, ruedas de palabras) para practicar vocabulario: plazas gratuitas para toda la clase sin el tope de 3 tableros de Neon Free.' },
      { q: '¿Necesita el alumnado cuentas en LexiClash?', a: 'No. El alumnado se une con un código de 6 caracteres. Teacher Pro añade clases ilimitadas e informes imprimibles; el plan gratuito ya cubre una clase completa de hasta 50 estudiantes en los juegos de palabras de vocabulario.' },
    ],
    ctaStart: 'Empezar una partida de clase',
    related: [{ label: 'vs Pear Deck' }, { label: 'vs Nearpod' }, { label: 'vs Kahoot' }],
  },

  sv: {
    eyebrow: 'Ärlig jämförelse',
    h1: 'LexiClash vs Padlet Neon Free — 3 padlets och 20 MB, ärligt talat',
    lede: 'Padlet **Neon Free** publicerar **3 fullt anpassningsbara, aktiva padlets** och en uppladdningsgräns på **20 MB per fil** (plus 1 användare, videoinspelningar på 2 minuter och ljudinspelningar på 5 minuter). **Platinum** låser upp obegränsat antal padlets och uppladdningar på 500 MB. LexiClash svarar med hela klassen gratis (50) för ordbildningsspel — **ingen Neon Free-spärr på 3 aktiva padlets**. Källor: [padlet.help …/is-it-free](https://padlet.help/l/en/article/d7d009lugq-is-it-free) och [padlet.com/site/subscriptions](https://padlet.com/site/subscriptions).',
    thCompetitor: 'Padlet Neon Free',
    rows: [
      ['Gratis aktiva tavlor / klasser', '✓ Hela klassen gratis (upp till 50)', 'Neon Free: 3 aktiva padlets'],
      ['Uppladdnings- / bilagestorlek (Free)', '— (live-ordbildning; ingen uppladdningsspärr för tavlor)', 'Neon Free: 20 MB uppladdning per fil'],
      ['Användare i Free', '✓ Lärare som värd + elever via anslutningskod', 'Neon Free: 1 användare'],
      ['Gränser för video- / ljudinspelning (Free)', '— (spellägen för ordförråd)', 'Neon Free: video på 2 min / ljud på 5 min'],
      ['Obegränsat antal tavlor / större uppladdningar', 'Teacher Pro: obegränsat antal klasser + rapporter', 'Platinum: obegränsat antal padlets + uppladdningar på 500 MB'],
      ['Från miss till live-repetition', '✓ Missade ord leder direkt till ett live-spel, gratis', 'Canvas-tavlor / betalplaner för klassrum och skola'],
      ['Ingen elevregistrering', '✓ Anslutningskod med 6 tecken', 'Padlet-konto / gratis elevplatser i Classroom'],
      ['Spel- / lektionstyp', 'Ordbildning (Boggle/Hjul/Anagram)', 'Digital arbetsyta / tavlor + Sandbox + bildspel'],
      ['Källa', '—', 'padlet.help …/is-it-free + padlet.com/site/subscriptions'],
    ],
    footnote: '',
    faqs: [
      { q: 'Vad publicerar Padlet Neon Free om aktiva tavlor och uppladdningar?', a: 'Padlets hjälp (padlet.help …/is-it-free, senast kontrollerad 30 september 2026) och prenumerationssidan (padlet.com/site/subscriptions) anger för Neon / Free: 3 fullt anpassningsbara, aktiva padlets, en uppladdningsgräns på 20 MB per fil eller bilaga, 1 användare, videoinspelningar på 2 minuter och ljudinspelningar på 5 minuter. Obegränsat antal inlägg är tillåtet inom dessa uppladdningsgränser. Platinum låser upp obegränsat antal padlets och filuppladdningar på 500 MB.' },
      { q: 'Hur svarar LexiClash på Padlet Neon Frees gränser?', a: 'LexiClashs gratis klassrumsordförråd kör en hel klass (upp till 50) i ordbildningsspel med live-repetition av missar — utan Neon Frees spärr på 3 aktiva padlets eller 20 MB uppladdning till tavlor för spel i klassrummet. Skiljer sig från Pear Deck Teacher Free med namngivna svar, Nearpod Silver, Mentimeter Free (50 per månad), Wayground Starter, Kahoot Go, Socrative Free och ClassPoint Basic Free.' },
      { q: 'Är LexiClash ett verktyg för digitala arbetsytor och tavlor som Padlet?', a: 'Det är en annan kategori. Padlet är en digital arbetsyta för visuellt samarbete, där Neon Free är begränsat till 3 aktiva padlets och 20 MB uppladdning. LexiClash är ordbildning (Boggle-liknande rutnät, anagram, ordhjul) för ordförrådsträning — gratisplatser för hela klassen utan Neon Frees spärr på 3 tavlor.' },
      { q: 'Behöver eleverna konton på LexiClash?', a: 'Nej. Eleverna går med med en kod på 6 tecken. Teacher Pro lägger till obegränsat antal klasser och utskrivbara rapporter; gratisnivån täcker redan en hel klass på upp till 50 elever i ordspel för ordförråd.' },
    ],
    ctaStart: 'Starta ett klassrumsspel',
    related: [{ label: 'vs Pear Deck' }, { label: 'vs Nearpod' }, { label: 'vs Kahoot' }],
  },

  ja: {
    eyebrow: '正直な比較',
    h1: 'LexiClash vs Padlet Neon Free — 3つのパドレットと20MBの上限を正直に比較',
    lede: 'Padlet の **Neon Free** は、**完全にカスタマイズできるアクティブなパドレット3つ**と、**1ファイルあたり20MB**のアップロード上限を公開しています(ほかにユーザー1人、動画2分・音声5分までの録画)。**Platinum** ではパドレット数が無制限になり、500MBまでアップロードできます。LexiClash は、単語づくりゲームにクラス全員(50人)を無料で受け入れます。**Neon Free のようなアクティブ3パドレットの壁はありません**。出典: [padlet.help …/is-it-free](https://padlet.help/l/en/article/d7d009lugq-is-it-free)、[padlet.com/site/subscriptions](https://padlet.com/site/subscriptions)。',
    thCompetitor: 'Padlet Neon Free',
    rows: [
      ['無料のアクティブなボード/クラス数', '✓ クラス全員が無料(最大50人)', 'Neon Free: アクティブなパドレット3つ'],
      ['アップロード/添付サイズ(Free)', '—(単語づくりのライブプレイ。ボードへのアップロード制限なし)', 'Neon Free: 1ファイル20MB'],
      ['Free のユーザー数', '✓ 先生がホスト + 生徒は参加コードで参加', 'Neon Free: ユーザー1人'],
      ['動画/音声の録画上限(Free)', '—(語彙ゲームのモード)', 'Neon Free: 動画2分 / 音声5分'],
      ['無制限のボード/大きなアップロード', 'Teacher Pro: クラス無制限 + レポート', 'Platinum: パドレット無制限 + 500MBのアップロード'],
      ['ミスからライブ復習へ', '✓ ミスした単語から無料のライブゲームへ直接リンク', 'キャンバスボード/有料のクラスルーム・学校向けプラン'],
      ['生徒の登録不要', '✓ 6文字の参加コード', 'Padlet アカウント / Classroom の無料の生徒枠'],
      ['ゲーム/授業のタイプ', '単語づくり(Boggle/ホイール/アナグラム)', 'デジタルキャンバス / ボード + Sandbox + スライドショー'],
      ['出典', '—', 'padlet.help …/is-it-free + padlet.com/site/subscriptions'],
    ],
    footnote: '',
    faqs: [
      { q: 'Padlet Neon Free はアクティブなボード数とアップロードについてどう公開していますか?', a: 'Padlet のヘルプ(padlet.help …/is-it-free、2026年9月30日確認)とサブスクリプションのページ(padlet.com/site/subscriptions)では、Neon / Free は、完全にカスタマイズできるアクティブなパドレット3つ、1ファイルまたは添付ファイルあたり20MBのアップロード上限、ユーザー1人、動画2分・音声5分までの録画とされています。この上限の範囲内であれば投稿数は無制限です。Platinum ではパドレット数が無制限になり、500MBまでのファイルをアップロードできます。' },
      { q: 'LexiClash は Padlet Neon Free の上限にどう対応しますか?', a: 'LexiClash の無料の教室向け語彙ゲームは、クラス全体(最大50人)で単語づくりゲームを遊べ、ミスした単語をライブで復習できます。教室でのプレイに、Neon Free のようなアクティブ3パドレットや、ボードへの20MBアップロードの壁はありません。Pear Deck Teacher Free の名前付き回答、Nearpod Silver、Mentimeter Free(月50)、Wayground Starter、Kahoot Go、Socrative Free、ClassPoint Basic Free とは別の仕組みです。' },
      { q: 'LexiClash は Padlet のようなデジタルキャンバス/ボードツールですか?', a: 'カテゴリが異なります。Padlet は視覚的に共同作業するためのデジタルキャンバスで、Neon Free はアクティブなパドレット3つとアップロード20MBに制限されます。LexiClash は語彙練習のための単語づくりゲーム(Boggle 風のグリッド、アナグラム、ワードホイール)で、Neon Free のような3ボードの壁なしにクラス全員が無料で参加できます。' },
      { q: '生徒は LexiClash のアカウントが必要ですか?', a: '不要です。生徒は6文字のコードで参加します。Teacher Pro ではクラス数が無制限になり、印刷用レポートも使えます。無料プランでも、語彙の単語ゲームなら最大50人のクラス全体をすでにカバーできます。' },
    ],
    ctaStart: 'クラスゲームを始める',
    related: [{ label: 'vs Pear Deck' }, { label: 'vs Nearpod' }, { label: 'vs Kahoot' }],
  },

  ru: {
    eyebrow: 'Честное сравнение',
    h1: 'LexiClash vs Padlet Neon Free — 3 падлета и 20 МБ: честно',
    lede: 'Padlet **Neon Free** указывает **3 полностью настраиваемых активных падлета** и лимит загрузки **20 МБ на файл** (плюс 1 пользователь, видеозаписи до 2 минут и аудиозаписи до 5 минут). **Platinum** открывает неограниченное число падлетов и загрузки до 500 МБ. LexiClash отвечает бесплатным входом для всего класса (50 человек) в играх по составлению слов — **без барьера Neon Free в 3 активных падлета**. Источники: [padlet.help …/is-it-free](https://padlet.help/l/en/article/d7d009lugq-is-it-free) и [padlet.com/site/subscriptions](https://padlet.com/site/subscriptions).',
    thCompetitor: 'Padlet Neon Free',
    rows: [
      ['Бесплатные активные доски / классы', '✓ Весь класс бесплатно (до 50)', 'Neon Free: 3 активных падлета'],
      ['Размер загрузки / вложения (Free)', '— (живая игра в составление слов; без лимита загрузки на доски)', 'Neon Free: 20 МБ на файл'],
      ['Пользователи на Free', '✓ Учитель-ведущий + ученики по коду входа', 'Neon Free: 1 пользователь'],
      ['Лимиты видео- и аудиозаписи (Free)', '— (режимы игры по лексике)', 'Neon Free: видео до 2 мин / аудио до 5 мин'],
      ['Неограниченные доски / большие загрузки', 'Teacher Pro: неограниченное число классов + отчёты', 'Platinum: неограниченное число падлетов + загрузки до 500 МБ'],
      ['От ошибки к живому повторению', '✓ Пропущенные слова ведут прямой ссылкой в живую игру, бесплатно', 'Доски-холсты / платные тарифы для класса и школы'],
      ['Без регистрации учеников', '✓ Код входа из 6 символов', 'Аккаунт Padlet / бесплатные места для учеников в Classroom'],
      ['Тип игры / урока', 'Составление слов (Boggle/Колесо/Анаграммы)', 'Цифровой холст / доски + Sandbox + слайд-шоу'],
      ['Источник', '—', 'padlet.help …/is-it-free + padlet.com/site/subscriptions'],
    ],
    footnote: '',
    faqs: [
      { q: 'Что Padlet Neon Free указывает про активные доски и загрузки?', a: 'Справка Padlet (padlet.help …/is-it-free, проверено 30 сентября 2026 года) и страница подписок (padlet.com/site/subscriptions) указывают для Neon / Free: 3 полностью настраиваемых активных падлета, лимит загрузки 20 МБ на файл или вложение, 1 пользователь, видеозаписи до 2 минут и аудиозаписи до 5 минут. В рамках этих лимитов загрузки число публикаций не ограничено. Platinum открывает неограниченное число падлетов и загрузку файлов до 500 МБ.' },
      { q: 'Как LexiClash отвечает на лимиты Padlet Neon Free?', a: 'Бесплатная классная игра LexiClash по лексике вмещает весь класс (до 50 человек) в играх по составлению слов с живым повторением ошибок — без барьера Neon Free в 3 активных падлета и 20 МБ загрузки на доски для игры в классе. Это отличается от Pear Deck Teacher Free с именными ответами, Nearpod Silver, Mentimeter Free (50 в месяц), Wayground Starter, Kahoot Go, Socrative Free и ClassPoint Basic Free.' },
      { q: 'LexiClash — это инструмент цифровых холстов и досок, как Padlet?', a: 'Это другая категория. Padlet — цифровой холст для визуального сотрудничества, а Neon Free ограничен 3 активными падлетами и загрузкой 20 МБ. LexiClash — игра в составление слов (сетки в стиле Boggle, анаграммы, колёса слов) для тренировки лексики: бесплатные места для всего класса без барьера Neon Free в 3 доски.' },
      { q: 'Нужны ли ученикам аккаунты в LexiClash?', a: 'Нет. Ученики входят по коду из 6 символов. Teacher Pro добавляет неограниченное число классов и печатные отчёты; бесплатный тариф уже покрывает целый класс до 50 человек в словесных играх для лексики.' },
    ],
    ctaStart: 'Начать игру для класса',
    related: [{ label: 'vs Pear Deck' }, { label: 'vs Nearpod' }, { label: 'vs Kahoot' }],
  },
};

export const copies: Record<Locale, VsFoilCopy> = Object.fromEntries(
  (Object.keys(pageCopy) as Locale[]).map((l) => [l, { ...common[l], ...pageCopy[l] }]),
) as Record<Locale, VsFoilCopy>;

export { resolveVsLocale };
