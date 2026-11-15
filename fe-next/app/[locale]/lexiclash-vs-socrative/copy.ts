/**
 * Visible page text for /[locale]/lexiclash-vs-socrative, in every locale.
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
    h1: "LexiClash vs Socrative Free — 5 Quizzes / 1 Room / 50 honesty",
    lede: "Socrative Free publishes **5 Quizzes**, **1 Room**, and **50 student per activity** on the pricing page (plus 30-day report history). Distinct from Wayground Basic **20 max** activity storage. LexiClash foils with whole-class free (50) + miss→reteach Live — no 5-quiz / 1-room Free library ceiling. Cite [socrative.com/pricing](https://www.socrative.com/pricing) and [Socrative Help (choosing the right plan)](https://help.socrative.com/en/articles/8228775-choosing-the-right-socrative-plan).",
    thCompetitor: "Socrative Free",
    rows: [
      ['Free quiz / activity library', '✓ Free classroom vocab loop (no 5-quiz ceiling)', 'Free: 5 Quizzes'],
      ['Free rooms / sessions', '✓ Whole-class Live + miss→reteach', 'Free: 1 Room'],
      ['Free student / seat model', '✓ Up to 50 students free per class', 'Free: 50 student per activity'],
      ['Report history (Free)', '—', '30-day report history'],
      ['Vs Wayground storage foil', '—', 'Distinct from Wayground Basic 20 max activity storage'],
      ['Miss → reteach Live', '✓ Free miss-gap → Live deep-link', 'Quiz reports / rooms (plan-gated features vary)'],
      ['No student signup', '✓ 6-character join code', 'Students join Socrative rooms'],
      ['Game / lesson type', 'Word-formation (Boggle/Wheel/Anagram)', 'Formative quizzes / Space Race / Exit Tickets'],
      [
        'Evidence',
        '—',
        'socrative.com/pricing (Free: 5 Quizzes · 1 Room · 50) + Help choosing-the-right-plan',
      ],
    ],
    footnote: '',
    faqs: [
      {
          q: "What is Socrative Free's published cap?",
          a: 'Socrative pricing (socrative.com/pricing, lastChecked September 29, 2026) lists Free: 5 Quizzes, 1 Room, 50 student per activity, plus 30-day report history. Help (choosing the right Socrative plan) notes Free keeps access to the last 5 modified quizzes and one room on downgrade. Distinct from Wayground Basic 20 max activity storage.',
      },
      {
          q: "How does LexiClash foil Socrative Free's 5 Quizzes / 1 Room / 50 cap?",
          a: 'LexiClash free classroom vocab runs a whole class (up to 50 students) with miss-gap → reteach Live — one published free seat cap per class, not a 5-quiz / 1-room Free library ceiling. Distinct from Wayground Basic 20 max, Mentimeter Free 50/month, Wooclap Starter 5 active, Nearpod Silver 40-join, Blooket Starter ≤60, and Gimkit Pro-Exclusive 5.',
      },
      {
          q: 'Is LexiClash a quiz-response tool like Socrative?',
          a: 'Different category. Socrative is formative assessment / quizzes / rooms with a Free quiz+room library ceiling. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats on the classroom loop.',
      },
      {
          q: 'Do students need accounts on LexiClash?',
          a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games.',
      },
    ],
    ctaStart: "Start a classroom game",
    related: [
      { label: "vs Wayground" },
      { label: "vs Mentimeter" },
      { label: "vs Kahoot" },
    ],
  },
  he: {
    eyebrow: 'השוואה כנה',
    h1: 'LexiClash מול Socrative Free — 5 חידונים / חדר אחד / 50 תלמידים, בכנות',
    lede: 'Socrative Free מפרסם בעמוד התמחור **5 חידונים**, **חדר אחד** ו-**50 תלמידים לפעילות** (ובנוסף היסטוריית דוחות של 30 יום). שונה מ-Wayground Basic עם אחסון פעילויות של **20 לכל היותר**. LexiClash עונה על כך עם כל הכיתה בחינם (50) וחזרה חיה על הטעויות — בלי תקרה חינמית של 5 חידונים וחדר אחד. מקורות: [socrative.com/pricing](https://www.socrative.com/pricing) ו-[מרכז העזרה של Socrative (בחירת התוכנית המתאימה)](https://help.socrative.com/en/articles/8228775-choosing-the-right-socrative-plan).',
    thCompetitor: 'Socrative Free',
    rows: [
      ['ספריית חידונים / פעילויות בחינם', '✓ מעגל אוצר מילים כיתתי חינמי (בלי תקרה של 5 חידונים)', 'Free: 5 חידונים'],
      ['חדרים / מפגשים בחינם', '✓ משחק חי לכל הכיתה + חזרה על הטעויות', 'Free: חדר אחד'],
      ['מודל תלמידים / מקומות בחינם', '✓ עד 50 תלמידים בכיתה בחינם', 'Free: 50 תלמידים לפעילות'],
      ['היסטוריית דוחות (Free)', '—', 'היסטוריית דוחות של 30 יום'],
      ['הבדל מאחסון ב-Wayground', '—', 'שונה מאחסון הפעילויות של Wayground Basic (20 לכל היותר)'],
      ['מטעויות לחזרה חיה', '✓ מילים שהוחמצו מובילות בקישור ישיר למשחק חי, בחינם', 'דוחות חידונים / חדרים (היקף התכונות משתנה לפי התוכנית)'],
      ['בלי הרשמת תלמידים', '✓ קוד הצטרפות של 6 תווים', 'התלמידים מצטרפים לחדרי Socrative'],
      ['סוג המשחק / השיעור', 'יצירת מילים (Boggle / גלגל / אנגרמות)', 'חידונים מעצבים / Space Race / כרטיסי יציאה'],
      ['מקור', '—', 'socrative.com/pricing (Free: 5 חידונים · חדר אחד · 50) + מרכז העזרה: בחירת התוכנית המתאימה'],
    ],
    footnote: '',
    faqs: [
      { q: 'מהי המגבלה שמפרסם Socrative Free?', a: 'התמחור של Socrative (socrative.com/pricing, נבדק לאחרונה ב-29 בספטמבר 2026) מציג ב-Free: 5 חידונים, חדר אחד, 50 תלמידים לפעילות, ובנוסף היסטוריית דוחות של 30 יום. מרכז העזרה (בחירת התוכנית המתאימה) מציין שאחרי מעבר לתוכנית נמוכה יותר נשארת גישה ל-5 החידונים האחרונים שעודכנו ולחדר אחד. שונה מאחסון הפעילויות של Wayground Basic (20 לכל היותר).' },
      { q: 'איך LexiClash מתמודד עם מגבלת 5 החידונים / חדר אחד / 50 ב-Socrative Free?', a: 'אוצר המילים החינמי של LexiClash לכיתה מפעיל כיתה שלמה (עד 50 תלמידים) עם חזרה חיה על הטעויות — תקרת מקומות חינמית אחת ומפורסמת לכל כיתה, ולא תקרה של ספריית Free עם 5 חידונים וחדר אחד. שונה מ-Wayground Basic (20 לכל היותר), Mentimeter Free (50 לחודש), Wooclap Starter (5 פעילים), Nearpod Silver (40 הצטרפויות), Blooket Starter (עד 60) ו-Gimkit במצבי Pro בלבד (5).' },
      { q: 'האם LexiClash הוא כלי לשאלות ותשובות כמו Socrative?', a: 'זו קטגוריה אחרת. Socrative הוא הערכה מעצבת, חידונים וחדרים, עם תקרת ספרייה וחדרים בתוכנית החינמית. LexiClash הוא יצירת מילים (רשתות בסגנון Boggle, אנגרמות, גלגלי מילים) לתרגול אוצר מילים — מקומות חינמיים לכל הכיתה במעגל הכיתתי.' },
      { q: 'האם תלמידים צריכים חשבון ב-LexiClash?', a: 'לא. התלמידים מצטרפים עם קוד של 6 תווים. Teacher Pro מוסיף כיתות ללא הגבלה ודוחות להדפסה; המסלול החינמי כבר מכסה כיתה שלמה של עד 50 תלמידים במשחקי מילים לאוצר מילים.' },
    ],
    ctaStart: 'התחילו משחק כיתתי',
    related: [{ label: 'מול Wayground' }, { label: 'מול Mentimeter' }, { label: 'מול Kahoot' }],
  },

  es: {
    eyebrow: 'Comparativa honesta',
    h1: 'LexiClash vs Socrative Free: 5 cuestionarios / 1 sala / 50 estudiantes, con honestidad',
    lede: 'Socrative Free publica en su página de precios **5 cuestionarios**, **1 sala** y **50 estudiantes por actividad** (más 30 días de historial de informes). No es lo mismo que el almacenamiento de **20 como máximo** de Wayground Basic. LexiClash responde con toda la clase gratis (50) y repaso en vivo de los fallos, sin el techo gratuito de 5 cuestionarios y 1 sala. Fuentes: [socrative.com/pricing](https://www.socrative.com/pricing) y [Ayuda de Socrative (elegir el plan adecuado)](https://help.socrative.com/en/articles/8228775-choosing-the-right-socrative-plan).',
    thCompetitor: 'Socrative Free',
    rows: [
      ['Biblioteca de cuestionarios / actividades gratis', '✓ Bucle de vocabulario de aula gratuito (sin techo de 5 cuestionarios)', 'Free: 5 cuestionarios'],
      ['Salas / sesiones gratis', '✓ Partida en vivo para toda la clase + repaso de fallos', 'Free: 1 sala'],
      ['Modelo de alumnado / plazas gratis', '✓ Hasta 50 estudiantes por clase gratis', 'Free: 50 estudiantes por actividad'],
      ['Historial de informes (Free)', '—', 'Historial de informes de 30 días'],
      ['Diferencia con el almacenamiento de Wayground', '—', 'No es lo mismo que el almacenamiento de actividades de Wayground Basic (20 como máximo)'],
      ['De los fallos al repaso en vivo', '✓ Los fallos llevan directamente a una partida en vivo, gratis', 'Informes de cuestionarios / salas (las funciones varían según el plan)'],
      ['Sin registro del alumnado', '✓ Código de acceso de 6 caracteres', 'El alumnado se une a las salas de Socrative'],
      ['Tipo de juego / lección', 'Formación de palabras (Boggle/Rueda/Anagramas)', 'Cuestionarios formativos / Space Race / tickets de salida'],
      ['Fuente', '—', 'socrative.com/pricing (Free: 5 cuestionarios · 1 sala · 50) + Ayuda: elegir el plan adecuado'],
    ],
    footnote: '',
    faqs: [
      { q: '¿Cuál es el límite que publica Socrative Free?', a: 'Los precios de Socrative (socrative.com/pricing, última comprobación el 29 de septiembre de 2026) indican para Free: 5 cuestionarios, 1 sala, 50 estudiantes por actividad, además de 30 días de historial de informes. La ayuda (elegir el plan adecuado) señala que, al pasar a un plan inferior, se conserva el acceso a los últimos 5 cuestionarios modificados y a una sala. No es lo mismo que el almacenamiento de actividades de Wayground Basic (20 como máximo).' },
      { q: '¿Cómo responde LexiClash al límite de 5 cuestionarios / 1 sala / 50 de Socrative Free?', a: 'El vocabulario de aula gratuito de LexiClash reúne a una clase entera (hasta 50 estudiantes) con repaso en vivo de los fallos: un único límite gratuito publicado por clase, no un techo de biblioteca Free de 5 cuestionarios y 1 sala. No es lo mismo que Wayground Basic (20 como máximo), Mentimeter Free (50 al mes), Wooclap Starter (5 activos), Nearpod Silver (40 accesos), Blooket Starter (hasta 60) o Gimkit con modos solo Pro (5).' },
      { q: '¿Es LexiClash una herramienta de preguntas y respuestas como Socrative?', a: 'Es otra categoría. Socrative es evaluación formativa con cuestionarios y salas, con un techo de biblioteca y salas en el plan gratuito. LexiClash es un juego de formar palabras (cuadrículas estilo Boggle, anagramas, ruedas de palabras) para practicar vocabulario: plazas gratuitas para toda la clase en el bucle de aula.' },
      { q: '¿Necesita el alumnado cuentas en LexiClash?', a: 'No. El alumnado se une con un código de 6 caracteres. Teacher Pro añade clases ilimitadas e informes imprimibles; el plan gratuito ya cubre una clase completa de hasta 50 estudiantes en los juegos de palabras de vocabulario.' },
    ],
    ctaStart: 'Empezar una partida de clase',
    related: [{ label: 'vs Wayground' }, { label: 'vs Mentimeter' }, { label: 'vs Kahoot' }],
  },

  sv: {
    eyebrow: 'Ärlig jämförelse',
    h1: 'LexiClash vs Socrative Free — 5 quiz / 1 rum / 50 elever, ärligt talat',
    lede: 'Socrative Free publicerar på prissidan **5 quiz**, **1 rum** och **50 elever per aktivitet** (plus 30 dagars rapporthistorik). Skiljer sig från Wayground Basic med lagring på **högst 20** aktiviteter. LexiClash svarar med hela klassen gratis (50) och live-repetition av missar — inget gratistak på 5 quiz och 1 rum. Källor: [socrative.com/pricing](https://www.socrative.com/pricing) och [Socratives hjälpcenter (välj rätt plan)](https://help.socrative.com/en/articles/8228775-choosing-the-right-socrative-plan).',
    thCompetitor: 'Socrative Free',
    rows: [
      ['Gratis quiz- / aktivitetsbibliotek', '✓ Gratis ordförrådsloop för klassrummet (inget tak på 5 quiz)', 'Free: 5 quiz'],
      ['Gratis rum / sessioner', '✓ Live-spel för hela klassen + repetition av missar', 'Free: 1 rum'],
      ['Gratis elev- / platsmodell', '✓ Upp till 50 elever per klass gratis', 'Free: 50 elever per aktivitet'],
      ['Rapporthistorik (Free)', '—', '30 dagars rapporthistorik'],
      ['Skillnad mot Wayground-lagring', '—', 'Skiljer sig från Wayground Basics aktivitetslagring på högst 20'],
      ['Från miss till live-repetition', '✓ Missade ord leder direkt till ett live-spel, gratis', 'Quizrapporter / rum (funktionerna varierar mellan planerna)'],
      ['Ingen elevregistrering', '✓ Anslutningskod med 6 tecken', 'Eleverna går med i Socrative-rum'],
      ['Spel- / lektionstyp', 'Ordbildning (Boggle/Hjul/Anagram)', 'Formativa quiz / Space Race / exit tickets'],
      ['Källa', '—', 'socrative.com/pricing (Free: 5 quiz · 1 rum · 50) + hjälpartikeln om att välja rätt plan'],
    ],
    footnote: '',
    faqs: [
      { q: 'Vilken gräns publicerar Socrative Free?', a: 'Socratives prissida (socrative.com/pricing, senast kontrollerad 29 september 2026) anger för Free: 5 quiz, 1 rum, 50 elever per aktivitet, plus 30 dagars rapporthistorik. Hjälpartikeln (välj rätt plan) noterar att man vid nedgradering behåller åtkomst till de 5 senast ändrade quizen och ett rum. Skiljer sig från Wayground Basics aktivitetslagring på högst 20.' },
      { q: 'Hur svarar LexiClash på gränsen 5 quiz / 1 rum / 50 i Socrative Free?', a: 'LexiClashs gratis klassrumsordförråd kör en hel klass (upp till 50 elever) med live-repetition av missar — en enda publicerad gratisgräns per klass, inte ett Free-bibliotekstak på 5 quiz och 1 rum. Skiljer sig från Wayground Basic (högst 20), Mentimeter Free (50 per månad), Wooclap Starter (5 aktiva), Nearpod Silver (40 anslutningar), Blooket Starter (upp till 60) och Gimkit med enbart Pro-lägen (5).' },
      { q: 'Är LexiClash ett verktyg för frågor och svar som Socrative?', a: 'Det är en annan kategori. Socrative är formativ bedömning med quiz och rum, med ett tak för bibliotek och rum i gratisplanen. LexiClash är ordbildning (Boggle-liknande rutnät, anagram, ordhjul) för ordförrådsträning — gratisplatser för hela klassen i klassrumsloopen.' },
      { q: 'Behöver eleverna konton på LexiClash?', a: 'Nej. Eleverna går med med en kod på 6 tecken. Teacher Pro lägger till obegränsat antal klasser och utskrivbara rapporter; gratisnivån täcker redan en hel klass på upp till 50 elever i ordspel för ordförråd.' },
    ],
    ctaStart: 'Starta ett klassrumsspel',
    related: [{ label: 'vs Wayground' }, { label: 'vs Mentimeter' }, { label: 'vs Kahoot' }],
  },

  ja: {
    eyebrow: '正直な比較',
    h1: 'LexiClash vs Socrative Free — 5クイズ・1ルーム・50人の上限を正直に比較',
    lede: 'Socrative Free は料金ページで **5クイズ**、**1ルーム**、**1アクティビティあたり50人**を公開しています(30日間のレポート履歴付き)。Wayground Basic の**最大20件**というアクティビティ保存数とは別の制限です。LexiClash は、クラス全員(50人)を無料で受け入れ、ミスの単語をライブで復習できます。5クイズ・1ルームという無料の上限はありません。出典: [socrative.com/pricing](https://www.socrative.com/pricing)、[Socrative ヘルプ(適切なプランの選び方)](https://help.socrative.com/en/articles/8228775-choosing-the-right-socrative-plan)。',
    thCompetitor: 'Socrative Free',
    rows: [
      ['無料のクイズ/アクティビティ数', '✓ 無料の教室向け語彙ループ(5クイズの上限なし)', 'Free: 5クイズ'],
      ['無料のルーム/セッション', '✓ クラス全員でのライブ + ミスの復習', 'Free: 1ルーム'],
      ['無料の生徒数/席モデル', '✓ 1クラス最大50人まで無料', 'Free: 1アクティビティあたり50人'],
      ['レポート履歴(Free)', '—', '30日間のレポート履歴'],
      ['Wayground の保存数との違い', '—', 'Wayground Basic のアクティビティ保存数(最大20件)とは別の制限'],
      ['ミスからライブ復習へ', '✓ ミスした単語から無料のライブゲームへ直接リンク', 'クイズレポート/ルーム(機能はプランにより異なる)'],
      ['生徒の登録不要', '✓ 6文字の参加コード', '生徒は Socrative のルームに参加'],
      ['ゲーム/授業のタイプ', '単語づくり(Boggle/ホイール/アナグラム)', '形成的クイズ / Space Race / エグジットチケット'],
      ['出典', '—', 'socrative.com/pricing(Free: 5クイズ・1ルーム・50人)+ ヘルプ「適切なプランの選び方」'],
    ],
    footnote: '',
    faqs: [
      { q: 'Socrative Free が公開している上限は?', a: 'Socrative の料金ページ(socrative.com/pricing、2026年9月29日確認)では、Free は 5クイズ、1ルーム、1アクティビティあたり50人、さらに30日間のレポート履歴とされています。ヘルプ(適切なプランの選び方)には、ダウングレード後も直近に更新した5つのクイズと1つのルームは使えると記載されています。Wayground Basic のアクティビティ保存数(最大20件)とは別の制限です。' },
      { q: 'LexiClash は Socrative Free の「5クイズ・1ルーム・50人」の上限にどう対応しますか?', a: 'LexiClash の無料の教室向け語彙ゲームは、クラス全体(最大50人)で遊べ、ミスした単語をライブで復習できます。公開している無料の上限はクラスあたり1つだけで、5クイズ・1ルームという Free ライブラリの上限はありません。Wayground Basic(最大20件)、Mentimeter Free(月50)、Wooclap Starter(同時5)、Nearpod Silver(参加40)、Blooket Starter(最大60)、Gimkit の Pro 限定モード(5)とは別の仕組みです。' },
      { q: 'LexiClash は Socrative のような出題・回答ツールですか?', a: 'カテゴリが異なります。Socrative は形成的評価のためのクイズとルームのツールで、無料プランにはライブラリとルームの上限があります。LexiClash は語彙練習のための単語づくりゲーム(Boggle 風のグリッド、アナグラム、ワードホイール)で、教室ループではクラス全員が無料で参加できます。' },
      { q: '生徒は LexiClash のアカウントが必要ですか?', a: '不要です。生徒は6文字のコードで参加します。Teacher Pro ではクラス数が無制限になり、印刷用レポートも使えます。無料プランでも、語彙の単語ゲームなら最大50人のクラス全体をすでにカバーできます。' },
    ],
    ctaStart: 'クラスゲームを始める',
    related: [{ label: 'vs Wayground' }, { label: 'vs Mentimeter' }, { label: 'vs Kahoot' }],
  },

  ru: {
    eyebrow: 'Честное сравнение',
    h1: 'LexiClash vs Socrative Free — 5 тестов / 1 комната / 50 учеников: честно',
    lede: 'На странице цен Socrative Free указано **5 тестов**, **1 комната** и **50 учеников на одно задание** (плюс история отчётов за 30 дней). Это отличается от хранилища Wayground Basic — **не более 20** заданий. LexiClash отвечает бесплатным входом для всего класса (50 человек) и живым повторением ошибок — без бесплатного потолка в 5 тестов и 1 комнату. Источники: [socrative.com/pricing](https://www.socrative.com/pricing) и [справка Socrative (как выбрать подходящий тариф)](https://help.socrative.com/en/articles/8228775-choosing-the-right-socrative-plan).',
    thCompetitor: 'Socrative Free',
    rows: [
      ['Бесплатная библиотека тестов / заданий', '✓ Бесплатный классный цикл по лексике (без потолка в 5 тестов)', 'Free: 5 тестов'],
      ['Бесплатные комнаты / сессии', '✓ Живая игра для всего класса + повторение ошибок', 'Free: 1 комната'],
      ['Бесплатные места для учеников', '✓ До 50 учеников в классе бесплатно', 'Free: 50 учеников на задание'],
      ['История отчётов (Free)', '—', 'История отчётов за 30 дней'],
      ['Отличие от хранилища Wayground', '—', 'Не то же самое, что хранилище заданий Wayground Basic (не более 20)'],
      ['От ошибки к живому повторению', '✓ Пропущенные слова ведут прямой ссылкой в живую игру, бесплатно', 'Отчёты по тестам / комнаты (набор функций зависит от тарифа)'],
      ['Без регистрации учеников', '✓ Код входа из 6 символов', 'Ученики входят в комнаты Socrative'],
      ['Тип игры / урока', 'Составление слов (Boggle/Колесо/Анаграммы)', 'Формирующие тесты / Space Race / выходные билеты'],
      ['Источник', '—', 'socrative.com/pricing (Free: 5 тестов · 1 комната · 50) + справка «Как выбрать подходящий тариф»'],
    ],
    footnote: '',
    faqs: [
      { q: 'Какой лимит указывает Socrative Free?', a: 'На странице цен Socrative (socrative.com/pricing, проверено 29 сентября 2026 года) для Free указано: 5 тестов, 1 комната, 50 учеников на задание, а также история отчётов за 30 дней. В справке (как выбрать подходящий тариф) сказано, что при переходе на более низкий тариф сохраняется доступ к 5 последним изменённым тестам и одной комнате. Это отличается от хранилища заданий Wayground Basic (не более 20).' },
      { q: 'Как LexiClash отвечает на лимит Socrative Free — 5 тестов / 1 комната / 50?', a: 'Бесплатная классная игра LexiClash по лексике вмещает весь класс (до 50 учеников) и повторяет ошибки вживую: один опубликованный бесплатный лимит на класс, а не потолок библиотеки Free в 5 тестов и 1 комнату. Это отличается от Wayground Basic (не более 20), Mentimeter Free (50 в месяц), Wooclap Starter (5 активных), Nearpod Silver (40 подключений), Blooket Starter (до 60) и Gimkit с режимами только для Pro (5).' },
      { q: 'LexiClash — это инструмент вопросов и ответов, как Socrative?', a: 'Это другая категория. Socrative — формирующее оценивание: тесты и комнаты, с потолком библиотеки и комнат в бесплатном тарифе. LexiClash — игра в составление слов (сетки в стиле Boggle, анаграммы, колёса слов) для тренировки лексики: бесплатные места для всего класса в классном цикле.' },
      { q: 'Нужны ли ученикам аккаунты в LexiClash?', a: 'Нет. Ученики входят по коду из 6 символов. Teacher Pro добавляет неограниченное число классов и печатные отчёты; бесплатный тариф уже покрывает целый класс до 50 человек в словесных играх для лексики.' },
    ],
    ctaStart: 'Начать игру для класса',
    related: [{ label: 'vs Wayground' }, { label: 'vs Mentimeter' }, { label: 'vs Kahoot' }],
  },
};

export const copies: Record<Locale, VsFoilCopy> = Object.fromEntries(
  (Object.keys(pageCopy) as Locale[]).map((l) => [l, { ...common[l], ...pageCopy[l] }]),
) as Record<Locale, VsFoilCopy>;

export { resolveVsLocale };
