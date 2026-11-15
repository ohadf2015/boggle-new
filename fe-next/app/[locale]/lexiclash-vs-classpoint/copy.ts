/**
 * Visible page text for /[locale]/lexiclash-vs-classpoint, in every locale.
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
    h1: "LexiClash vs ClassPoint Basic Free — Max 25 / 5 Questions honesty",
    lede: "ClassPoint Basic Free publishes **Max 25 class size**, **5 Questions per PPT**, **5 Question types**, **3 Draggable objects**, and **3 saved classes** on the pricing page. Distinct from Socrative Free **5 Quizzes / 1 Room / 50**. LexiClash foils with whole-class free (50) + miss→reteach Live — no Max-25 / 5-Q-per-PPT Free ceiling. Cite [classpoint.io/pricing](https://www.classpoint.io/pricing) and [ClassPoint schools & districts](https://www.classpoint.io/schools-districts).",
    thCompetitor: "ClassPoint Basic Free",
    rows: [
      ['Free class / seat size', '✓ Up to 50 students free per class', 'Basic Free: Max 25 class size'],
      ['Free questions / activities', '✓ Free classroom vocab loop (no 5-Q/PPT ceiling)', 'Basic Free: 5 Questions per PPT'],
      ['Question / activity types', '✓ Word-formation modes (Boggle/Wheel/Anagram)', 'Basic Free: 5 Question types'],
      ['Saved classes / library', '✓ Free classroom loop + Live', 'Basic Free: 3 saved classes'],
      ['Draggable / interactive objects', '—', 'Basic Free: 3 Draggable objects'],
      ['Vs Socrative Free foil', '—', 'Distinct from Socrative Free 5 Quizzes / 1 Room / 50'],
      ['Miss → reteach Live', '✓ Free miss-gap → Live deep-link', 'In-PPT questions / reports (plan-gated)'],
      ['No student signup', '✓ 6-character join code', 'Students join ClassPoint sessions'],
      ['Game / lesson type', 'Word-formation (Boggle/Wheel/Anagram)', 'PowerPoint interactive questions / gamification'],
      [
        'Evidence',
        '—',
        'classpoint.io/pricing (Basic Free: Max 25 · 5 Q/PPT · 5 types · 3 drag · 3 saved)',
      ],
    ],
    footnote: '',
    faqs: [
      {
          q: "What is ClassPoint Basic Free's published cap?",
          a: 'ClassPoint pricing (classpoint.io/pricing, lastChecked September 30, 2026) lists Basic Free: Max 25 class size, 5 Questions per PPT, 5 Question types, 3 Draggable objects, 3 saved classes (plus 20 free AI quiz credits and Basic gamification). Distinct from Socrative Free 5 Quizzes / 1 Room / 50.',
      },
      {
          q: "How does LexiClash foil ClassPoint Basic Free's Max 25 / 5 Q cap?",
          a: 'LexiClash free classroom vocab runs a whole class (up to 50 students) with miss-gap → reteach Live — one published free seat cap per class, not a Max-25 PowerPoint class-size / 5-questions-per-PPT Free ceiling. Distinct from Socrative Free 5/1/50, Wayground Basic 20 max, Mentimeter Free 50/month, Wooclap Starter 5 active, Nearpod Silver 40-join, Blooket Starter ≤60, and Gimkit Pro-Exclusive 5.',
      },
      {
          q: 'Is LexiClash a PowerPoint add-in like ClassPoint?',
          a: 'Different category. ClassPoint is interactive questions / gamification inside PowerPoint with a Basic Free class-size and questions-per-PPT ceiling. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats on the classroom loop, no PowerPoint install required.',
      },
      {
          q: 'Do students need accounts on LexiClash?',
          a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games.',
      },
    ],
    ctaStart: "Start a classroom game",
    related: [
      { label: "vs Socrative" },
      { label: "vs Wayground" },
      { label: "vs Kahoot" },
    ],
  },
  he: {
    eyebrow: 'השוואה כנה',
    h1: 'LexiClash מול ClassPoint Basic Free — מגבלת 25 תלמידים ו-5 שאלות, בכנות',
    lede: 'ClassPoint Basic Free מפרסם בעמוד התמחור **גודל כיתה מרבי של 25**, **5 שאלות לכל מצגת PPT**, **5 סוגי שאלות**, **3 אובייקטים הניתנים לגרירה** ו-**3 כיתות שמורות**. שונה מ-Socrative Free עם **5 חידונים / חדר אחד / 50**. LexiClash עונה על כך עם כל הכיתה בחינם (50) וחזרה חיה על הטעויות — בלי תקרה חינמית של 25 תלמידים או 5 שאלות למצגת. מקורות: [classpoint.io/pricing](https://www.classpoint.io/pricing) ו-[ClassPoint לבתי ספר ומחוזות](https://www.classpoint.io/schools-districts).',
    thCompetitor: 'ClassPoint Basic Free',
    rows: [
      ['גודל כיתה / מקומות בחינם', '✓ עד 50 תלמידים בכיתה בחינם', 'Basic Free: גודל כיתה מרבי של 25'],
      ['שאלות / פעילויות בחינם', '✓ מעגל אוצר מילים כיתתי חינמי (בלי תקרה של 5 שאלות למצגת)', 'Basic Free: 5 שאלות לכל מצגת PPT'],
      ['סוגי שאלות / פעילויות', '✓ מצבי יצירת מילים (Boggle / גלגל / אנגרמות)', 'Basic Free: 5 סוגי שאלות'],
      ['כיתות שמורות / ספרייה', '✓ מעגל כיתתי חינמי + משחק חי', 'Basic Free: 3 כיתות שמורות'],
      ['אובייקטים הניתנים לגרירה / אינטראקטיביים', '—', 'Basic Free: 3 אובייקטים הניתנים לגרירה'],
      ['הבדל מ-Socrative Free', '—', 'שונה מ-Socrative Free עם 5 חידונים / חדר אחד / 50'],
      ['מטעויות לחזרה חיה', '✓ מילים שהוחמצו מובילות בקישור ישיר למשחק חי, בחינם', 'שאלות בתוך המצגת / דוחות (לפי התוכנית)'],
      ['בלי הרשמת תלמידים', '✓ קוד הצטרפות של 6 תווים', 'התלמידים מצטרפים למפגשי ClassPoint'],
      ['סוג המשחק / השיעור', 'יצירת מילים (Boggle / גלגל / אנגרמות)', 'שאלות אינטראקטיביות / משחוק בתוך PowerPoint'],
      ['מקור', '—', 'classpoint.io/pricing (Basic Free: 25 תלמידים · 5 שאלות למצגת · 5 סוגים · 3 לגרירה · 3 שמורות)'],
    ],
    footnote: '',
    faqs: [
      { q: 'מהי המגבלה שמפרסם ClassPoint Basic Free?', a: 'התמחור של ClassPoint (classpoint.io/pricing, נבדק לאחרונה ב-30 בספטמבר 2026) מציג ב-Basic Free: גודל כיתה מרבי של 25, 5 שאלות לכל מצגת PPT, 5 סוגי שאלות, 3 אובייקטים הניתנים לגרירה, 3 כיתות שמורות (וגם 20 קרדיטים חינמיים לחידוני AI ומשחוק בסיסי). שונה מ-Socrative Free עם 5 חידונים / חדר אחד / 50.' },
      { q: 'איך LexiClash מתמודד עם המגבלה של 25 תלמידים / 5 שאלות ב-ClassPoint Basic Free?', a: 'אוצר המילים החינמי של LexiClash לכיתה מפעיל כיתה שלמה (עד 50 תלמידים) עם חזרה חיה על הטעויות — תקרת מקומות חינמית אחת ומפורסמת לכל כיתה, ולא תקרה חינמית של 25 תלמידים וחמש שאלות למצגת PowerPoint. שונה מ-Socrative Free (5 / 1 / 50), Wayground Basic (20 מקסימום), Mentimeter Free (50 לחודש), Wooclap Starter (5 פעילים), Nearpod Silver (40 הצטרפויות), Blooket Starter (עד 60) ו-Gimkit במצבי Pro בלבד (5).' },
      { q: 'האם LexiClash הוא תוסף ל-PowerPoint כמו ClassPoint?', a: 'זו קטגוריה אחרת. ClassPoint הוא שאלות אינטראקטיביות ומשחוק בתוך PowerPoint, עם תקרה חינמית של גודל כיתה ושל שאלות למצגת. LexiClash הוא יצירת מילים (רשתות בסגנון Boggle, אנגרמות, גלגלי מילים) לתרגול אוצר מילים — מקומות חינמיים לכל הכיתה במעגל הכיתתי, בלי להתקין PowerPoint.' },
      { q: 'האם תלמידים צריכים חשבון ב-LexiClash?', a: 'לא. התלמידים מצטרפים עם קוד של 6 תווים. Teacher Pro מוסיף כיתות ללא הגבלה ודוחות להדפסה; המסלול החינמי כבר מכסה כיתה שלמה של עד 50 תלמידים במשחקי מילים לאוצר מילים.' },
    ],
    ctaStart: 'התחילו משחק כיתתי',
    related: [{ label: 'מול Socrative' }, { label: 'מול Wayground' }, { label: 'מול Kahoot' }],
  },

  es: {
    eyebrow: 'Comparativa honesta',
    h1: 'LexiClash vs ClassPoint Basic Free: el límite de 25 estudiantes y 5 preguntas, con honestidad',
    lede: 'ClassPoint Basic Free publica en su página de precios **25 estudiantes como máximo por clase**, **5 preguntas por PPT**, **5 tipos de pregunta**, **3 objetos arrastrables** y **3 clases guardadas**. No es lo mismo que Socrative Free, con **5 cuestionarios / 1 sala / 50**. LexiClash responde con toda la clase gratis (50) y repaso en vivo de los fallos, sin el techo gratuito de 25 estudiantes ni de 5 preguntas por PPT. Fuentes: [classpoint.io/pricing](https://www.classpoint.io/pricing) y [ClassPoint para escuelas y distritos](https://www.classpoint.io/schools-districts).',
    thCompetitor: 'ClassPoint Basic Free',
    rows: [
      ['Tamaño de clase / plazas gratis', '✓ Hasta 50 estudiantes por clase gratis', 'Basic Free: máximo 25 estudiantes por clase'],
      ['Preguntas / actividades gratis', '✓ Bucle de vocabulario de aula gratuito (sin techo de 5 preguntas por PPT)', 'Basic Free: 5 preguntas por PPT'],
      ['Tipos de pregunta / actividad', '✓ Modos de formar palabras (Boggle/Rueda/Anagramas)', 'Basic Free: 5 tipos de pregunta'],
      ['Clases guardadas / biblioteca', '✓ Bucle de aula gratuito + partida en vivo', 'Basic Free: 3 clases guardadas'],
      ['Objetos arrastrables / interactivos', '—', 'Basic Free: 3 objetos arrastrables'],
      ['Diferencia con Socrative Free', '—', 'No es lo mismo que Socrative Free: 5 cuestionarios / 1 sala / 50'],
      ['De los fallos al repaso en vivo', '✓ Los fallos llevan directamente a una partida en vivo, gratis', 'Preguntas dentro del PPT / informes (según el plan)'],
      ['Sin registro del alumnado', '✓ Código de acceso de 6 caracteres', 'El alumnado se une a las sesiones de ClassPoint'],
      ['Tipo de juego / lección', 'Formación de palabras (Boggle/Rueda/Anagramas)', 'Preguntas interactivas / gamificación dentro de PowerPoint'],
      ['Fuente', '—', 'classpoint.io/pricing (Basic Free: 25 estudiantes · 5 preguntas por PPT · 5 tipos · 3 arrastrables · 3 guardadas)'],
    ],
    footnote: '',
    faqs: [
      { q: '¿Cuál es el límite que publica ClassPoint Basic Free?', a: 'Los precios de ClassPoint (classpoint.io/pricing, última comprobación el 30 de septiembre de 2026) indican para Basic Free: máximo 25 estudiantes por clase, 5 preguntas por PPT, 5 tipos de pregunta, 3 objetos arrastrables, 3 clases guardadas (más 20 créditos gratuitos de cuestionarios con IA y gamificación básica). No es lo mismo que Socrative Free, con 5 cuestionarios / 1 sala / 50.' },
      { q: '¿Cómo responde LexiClash al límite de 25 estudiantes / 5 preguntas de ClassPoint Basic Free?', a: 'El vocabulario de aula gratuito de LexiClash reúne a una clase entera (hasta 50 estudiantes) con repaso en vivo de los fallos: un único límite gratuito publicado por clase, no un techo gratuito de 25 estudiantes y 5 preguntas por presentación de PowerPoint. No es lo mismo que Socrative Free (5 / 1 / 50), Wayground Basic (20 como máximo), Mentimeter Free (50 al mes), Wooclap Starter (5 activos), Nearpod Silver (40 accesos), Blooket Starter (hasta 60) o Gimkit con modos solo Pro (5).' },
      { q: '¿Es LexiClash un complemento de PowerPoint como ClassPoint?', a: 'Es otra categoría. ClassPoint es preguntas interactivas y gamificación dentro de PowerPoint, con un techo gratuito de tamaño de clase y de preguntas por PPT. LexiClash es un juego de formar palabras (cuadrículas estilo Boggle, anagramas, ruedas de palabras) para practicar vocabulario: plazas gratuitas para toda la clase en el bucle de aula, sin instalar PowerPoint.' },
      { q: '¿Necesita el alumnado cuentas en LexiClash?', a: 'No. El alumnado se une con un código de 6 caracteres. Teacher Pro añade clases ilimitadas e informes imprimibles; el plan gratuito ya cubre una clase completa de hasta 50 estudiantes en los juegos de palabras de vocabulario.' },
    ],
    ctaStart: 'Empezar una partida de clase',
    related: [{ label: 'vs Socrative' }, { label: 'vs Wayground' }, { label: 'vs Kahoot' }],
  },

  sv: {
    eyebrow: 'Ärlig jämförelse',
    h1: 'LexiClash vs ClassPoint Basic Free — gränsen på 25 elever och 5 frågor, ärligt talat',
    lede: 'ClassPoint Basic Free publicerar på prissidan **högst 25 elever per klass**, **5 frågor per PPT**, **5 frågetyper**, **3 dragbara objekt** och **3 sparade klasser**. Skiljer sig från Socrative Free med **5 quiz / 1 rum / 50**. LexiClash svarar med hela klassen gratis (50) och live-repetition av missar — inget gratistak på 25 elever eller 5 frågor per PPT. Källor: [classpoint.io/pricing](https://www.classpoint.io/pricing) och [ClassPoint för skolor och distrikt](https://www.classpoint.io/schools-districts).',
    thCompetitor: 'ClassPoint Basic Free',
    rows: [
      ['Klassstorlek / platser gratis', '✓ Upp till 50 elever per klass gratis', 'Basic Free: högst 25 elever per klass'],
      ['Frågor / aktiviteter gratis', '✓ Gratis klassrumsslinga för ordförråd (inget tak på 5 frågor per PPT)', 'Basic Free: 5 frågor per PPT'],
      ['Fråge- / aktivitetstyper', '✓ Ordbildningslägen (Boggle/Hjul/Anagram)', 'Basic Free: 5 frågetyper'],
      ['Sparade klasser / bibliotek', '✓ Gratis klassrumsslinga + liveläge', 'Basic Free: 3 sparade klasser'],
      ['Dragbara / interaktiva objekt', '—', 'Basic Free: 3 dragbara objekt'],
      ['Skillnad mot Socrative Free', '—', 'Skiljer sig från Socrative Free med 5 quiz / 1 rum / 50'],
      ['Från missar till live-repetition', '✓ Missar leder direkt till ett liveläge, gratis', 'Frågor i PPT / rapporter (beroende på plan)'],
      ['Ingen elevregistrering', '✓ Anslutningskod med 6 tecken', 'Eleverna går med i ClassPoint-sessioner'],
      ['Speltyp / lektionstyp', 'Ordbildning (Boggle/Hjul/Anagram)', 'Interaktiva frågor / spelifiering i PowerPoint'],
      ['Källa', '—', 'classpoint.io/pricing (Basic Free: 25 elever · 5 frågor per PPT · 5 typer · 3 dragbara · 3 sparade)'],
    ],
    footnote: '',
    faqs: [
      { q: 'Vilken gräns publicerar ClassPoint Basic Free?', a: 'ClassPoints priser (classpoint.io/pricing, senast kontrollerat 30 september 2026) anger för Basic Free: högst 25 elever per klass, 5 frågor per PPT, 5 frågetyper, 3 dragbara objekt, 3 sparade klasser (plus 20 gratis AI-quizkrediter och grundläggande spelifiering). Skiljer sig från Socrative Free med 5 quiz / 1 rum / 50.' },
      { q: 'Hur svarar LexiClash på gränsen på 25 elever / 5 frågor i ClassPoint Basic Free?', a: 'LexiClashs gratis klassrumsordförråd kör en hel klass (upp till 50 elever) med live-repetition av missar — ett enda publicerat gratistak per klass, inte ett gratistak på 25 elever och 5 frågor per PowerPoint. Skiljer sig från Socrative Free (5 / 1 / 50), Wayground Basic (högst 20), Mentimeter Free (50 per månad), Wooclap Starter (5 aktiva), Nearpod Silver (40 anslutningar), Blooket Starter (upp till 60) och Gimkit med lägen enbart för Pro (5).' },
      { q: 'Är LexiClash ett PowerPoint-tillägg som ClassPoint?', a: 'Det är en annan kategori. ClassPoint är interaktiva frågor och spelifiering i PowerPoint, med ett gratistak för klassstorlek och frågor per PPT. LexiClash är ordbildning (rutnät i Boggle-stil, anagram, ordhjul) för ordförrådsträning — gratisplatser för hela klassen i klassrumsslingan, utan PowerPoint-installation.' },
      { q: 'Behöver eleverna konton i LexiClash?', a: 'Nej. Eleverna går med med en kod på 6 tecken. Teacher Pro ger obegränsat antal klasser och utskrivbara rapporter; gratisnivån täcker redan en hel klass med upp till 50 elever i ordspelen för ordförråd.' },
    ],
    ctaStart: 'Starta ett klassrumsspel',
    related: [{ label: 'vs Socrative' }, { label: 'vs Wayground' }, { label: 'vs Kahoot' }],
  },

  ja: {
    eyebrow: '正直な比較',
    h1: 'LexiClash と ClassPoint Basic Free の比較：25人・5問の上限を正直に',
    lede: 'ClassPoint Basic Freeは、料金ページで**1クラス最大25人**、**PPT1つにつき5問**、**5種類の問題形式**、**ドラッグできるオブジェクト3つ**、**保存できるクラス3つ**と公表しています。**5クイズ／1ルーム／50人**のSocrative Freeとは異なります。LexiClashは、クラス全員が無料（50人）で、ミスをそのままライブ復習につなげます。25人や、PPT1つにつき5問という無料の上限はありません。出典：[classpoint.io/pricing](https://www.classpoint.io/pricing)、[学校・学区向けClassPoint](https://www.classpoint.io/schools-districts)',
    thCompetitor: 'ClassPoint Basic Free',
    rows: [
      ['無料のクラス人数', '✓ 1クラス最大50人まで無料', 'Basic Free：1クラス最大25人'],
      ['無料の問題数・活動数', '✓ 無料の教室用語彙ループ（PPT1つにつき5問の上限なし）', 'Basic Free：PPT1つにつき5問'],
      ['問題・活動の種類', '✓ 単語づくりモード（Boggle／ホイール／アナグラム）', 'Basic Free：問題形式5種類'],
      ['保存できるクラス・ライブラリ', '✓ 無料の教室ループ＋ライブ対戦', 'Basic Free：保存できるクラス3つ'],
      ['ドラッグできる・インタラクティブなオブジェクト', '—', 'Basic Free：ドラッグできるオブジェクト3つ'],
      ['Socrative Freeとの違い', '—', '5クイズ／1ルーム／50人のSocrative Freeとは異なる'],
      ['ミスからライブ復習へ', '✓ ミスから直接ライブ対戦へ、無料', 'PPT内の問題・レポート（プランによる）'],
      ['生徒の登録不要', '✓ 6文字の参加コード', '生徒はClassPointのセッションに参加'],
      ['ゲーム・授業の種類', '単語づくり（Boggle／ホイール／アナグラム）', 'PowerPoint内のインタラクティブな問題・ゲーム要素'],
      ['出典', '—', 'classpoint.io/pricing（Basic Free：25人・PPT1つにつき5問・5種類・ドラッグ3つ・保存3つ）'],
    ],
    footnote: '',
    faqs: [
      { q: 'ClassPoint Basic Freeが公表している上限は何ですか？', a: 'ClassPointの料金（classpoint.io/pricing、2026年9月30日に最終確認）では、Basic Freeは、1クラス最大25人、PPT1つにつき5問、問題形式5種類、ドラッグできるオブジェクト3つ、保存できるクラス3つ（加えて、無料のAIクイズクレジット20と基本的なゲーム要素）とされています。5クイズ／1ルーム／50人のSocrative Freeとは異なります。' },
      { q: 'ClassPoint Basic Freeの25人・5問の上限に、LexiClashはどう対応しますか？', a: 'LexiClashの無料の教室用語彙は、クラス全体（最大50人）をミスのライブ復習つきで動かします。公表されている無料の上限はクラスごとに1つだけで、PowerPointごとの25人・5問という無料の上限ではありません。Socrative Free（5／1／50）、Wayground Basic（最大20）、Mentimeter Free（月50人）、Wooclap Starter（有効5つ）、Nearpod Silver（40人まで参加）、Blooket Starter（60人まで）、Pro限定モードのGimkit（5）とは異なります。' },
      { q: 'LexiClashは、ClassPointのようなPowerPointのアドインですか？', a: '種類が違います。ClassPointはPowerPoint内のインタラクティブな問題とゲーム要素で、クラス人数とPPTごとの問題数に無料の上限があります。LexiClashは語彙練習のための単語づくりゲーム（Boggle風のマス目、アナグラム、ワードホイール）で、教室ループではクラス全員が無料で参加でき、PowerPointのインストールも不要です。' },
      { q: 'LexiClashで生徒はアカウントが必要ですか？', a: 'いいえ。生徒は6文字のコードで参加します。Teacher Proではクラス数が無制限になり、印刷できるレポートも使えます。無料プランでも、語彙の単語ゲームなら最大50人のクラス全員をすでにカバーしています。' },
    ],
    ctaStart: 'クラス用ゲームを始める',
    related: [{ label: 'Socrativeとの比較' }, { label: 'Waygroundとの比較' }, { label: 'Kahootとの比較' }],
  },

  ru: {
    eyebrow: 'Честное сравнение',
    h1: 'LexiClash и ClassPoint Basic Free: честно о лимите в 25 учеников и 5 вопросов',
    lede: 'ClassPoint Basic Free на странице цен заявляет **не более 25 учеников в классе**, **5 вопросов на презентацию PPT**, **5 типов вопросов**, **3 перетаскиваемых объекта** и **3 сохранённых класса**. Это не то же самое, что Socrative Free: **5 викторин / 1 комната / 50**. LexiClash отвечает так: весь класс бесплатно (50) и живое повторение ошибок — без бесплатного потолка в 25 учеников или 5 вопросов на презентацию. Источники: [classpoint.io/pricing](https://www.classpoint.io/pricing) и [ClassPoint для школ и округов](https://www.classpoint.io/schools-districts).',
    thCompetitor: 'ClassPoint Basic Free',
    rows: [
      ['Размер класса / бесплатные места', '✓ До 50 учеников в классе бесплатно', 'Basic Free: не более 25 учеников в классе'],
      ['Бесплатные вопросы / активности', '✓ Бесплатный классный цикл для словарного запаса (без потолка в 5 вопросов на PPT)', 'Basic Free: 5 вопросов на PPT'],
      ['Типы вопросов / активностей', '✓ Режимы составления слов (Boggle / колесо / анаграммы)', 'Basic Free: 5 типов вопросов'],
      ['Сохранённые классы / библиотека', '✓ Бесплатный классный цикл + живая игра', 'Basic Free: 3 сохранённых класса'],
      ['Перетаскиваемые / интерактивные объекты', '—', 'Basic Free: 3 перетаскиваемых объекта'],
      ['Отличие от Socrative Free', '—', 'Не то же самое, что Socrative Free: 5 викторин / 1 комната / 50'],
      ['От ошибок к живому повторению', '✓ Ошибки напрямую ведут в живую игру, бесплатно', 'Вопросы внутри PPT / отчёты (зависит от плана)'],
      ['Без регистрации учеников', '✓ Код входа из 6 символов', 'Ученики присоединяются к сессиям ClassPoint'],
      ['Тип игры / урока', 'Составление слов (Boggle / колесо / анаграммы)', 'Интерактивные вопросы / геймификация внутри PowerPoint'],
      ['Источник', '—', 'classpoint.io/pricing (Basic Free: 25 учеников · 5 вопросов на PPT · 5 типов · 3 перетаскиваемых · 3 сохранённых)'],
    ],
    footnote: '',
    faqs: [
      { q: 'Какой лимит заявляет ClassPoint Basic Free?', a: 'Цены ClassPoint (classpoint.io/pricing, последняя проверка 30 сентября 2026 года) для Basic Free указывают: не более 25 учеников в классе, 5 вопросов на PPT, 5 типов вопросов, 3 перетаскиваемых объекта, 3 сохранённых класса (плюс 20 бесплатных кредитов на ИИ-викторины и базовая геймификация). Это не то же самое, что Socrative Free: 5 викторин / 1 комната / 50.' },
      { q: 'Как LexiClash отвечает на лимит в 25 учеников / 5 вопросов в ClassPoint Basic Free?', a: 'Бесплатный классный словарный запас в LexiClash запускает целый класс (до 50 учеников) с живым повторением ошибок — один опубликованный бесплатный лимит на класс, а не бесплатный потолок в 25 учеников и 5 вопросов на презентацию PowerPoint. Это не то же самое, что Socrative Free (5 / 1 / 50), Wayground Basic (максимум 20), Mentimeter Free (50 в месяц), Wooclap Starter (5 активных), Nearpod Silver (40 подключений), Blooket Starter (до 60) и Gimkit с режимами только для Pro (5).' },
      { q: 'Является ли LexiClash дополнением к PowerPoint, как ClassPoint?', a: 'Это другая категория. ClassPoint — интерактивные вопросы и геймификация внутри PowerPoint, с бесплатным потолком по размеру класса и числу вопросов на PPT. LexiClash — игра на составление слов (сетки в стиле Boggle, анаграммы, колёса слов) для практики словарного запаса: бесплатные места для всего класса в классном цикле, без установки PowerPoint.' },
      { q: 'Нужны ли ученикам аккаунты в LexiClash?', a: 'Нет. Ученики подключаются по коду из 6 символов. Teacher Pro добавляет неограниченное число классов и отчёты для печати; бесплатный тариф уже покрывает целый класс до 50 учеников в словесных играх на словарный запас.' },
    ],
    ctaStart: 'Начать игру для класса',
    related: [{ label: 'и Socrative' }, { label: 'и Wayground' }, { label: 'и Kahoot' }],
  },
};

export const copies: Record<Locale, VsFoilCopy> = Object.fromEntries(
  (Object.keys(pageCopy) as Locale[]).map((l) => [l, { ...common[l], ...pageCopy[l] }]),
) as Record<Locale, VsFoilCopy>;

export { resolveVsLocale };
