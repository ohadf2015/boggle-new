/**
 * Visible page text for /[locale]/lexiclash-vs-peardeck, in every locale.
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
    h1: "LexiClash vs Pear Deck Teacher Free — named-response honesty",
    lede: "Pear Deck **Teacher Free** publishes **unlimited Sessions and participants** and projects student answers **anonymously**. Named student responses on Free are only via **export to spreadsheet** (Google) or **Flashcard Factory hover**. **Teacher Premium** unlocks the live named Teacher Dashboard (view/highlight by name, hide/block), Drawing/Draggable, Reflect & Review, and Teacher Feedback. LexiClash foils with whole-class free (50) + **classroom roster / named feedback** on the free path. Cite [peardeck.com/pricing](https://www.peardeck.com/pricing) and [Handling Inappropriate Responses](https://help.peardeck.com/migration/en/handling-inappropriate-responses).",
    thCompetitor: "Pear Deck Teacher Free",
    rows: [
      [
        'Free sessions / participants',
        '✓ Whole-class free (up to 50)',
        'Teacher Free: unlimited Sessions + participants',
      ],
      [
        'Projector / live answers',
        '✓ Classroom loop + live play',
        'Teacher Free: project answers anonymously',
      ],
      [
        'Named student responses (Free)',
        '✓ Classroom roster + named feedback on free',
        'Free: names only via spreadsheet export or Flashcard Factory hover',
      ],
      [
        'Live named Teacher Dashboard',
        '✓ Roster / named disclosure without Premium gate',
        'Teacher Premium: view/highlight by name, hide/block',
      ],
      [
        'Drawing / Draggable responses',
        '— (word-formation modes)',
        'Teacher Premium: Drawing + Draggable',
      ],
      [
        'Reflect & Review / Teacher Feedback',
        '✓ Miss-gap → reteach Live + named feedback path',
        'Teacher Premium: Reflect & Review + Teacher Feedback',
      ],
      [
        'Miss → reteach Live',
        '✓ Free miss-gap → Live deep-link',
        'Slide sessions / Premium dashboard (plan-gated names)',
      ],
      ['No student signup', '✓ 6-character join code', 'Email login recommended to identify names'],
      [
        'Game / lesson type',
        'Word-formation (Boggle/Wheel/Anagram)',
        'Interactive slides (Google / Microsoft) + Pear Deck Learning suite',
      ],
      [
        'Evidence',
        '—',
        'peardeck.com/pricing + help.peardeck.com …/handling-inappropriate-responses',
      ],
    ],
    footnote: "ClassPoint Basic Free Max 25 / 5 Q is #1202. Socrative Free 5/1/50 is #1196. Mentimeter Free 50/month is #1183. Wooclap Starter 5 active is #1186. Do NOT touch open #1204 audio PR.",
    faqs: [
      {
          q: "What does Pear Deck Teacher Free publish for named student responses?",
          a: 'Pear Deck pricing (peardeck.com/pricing, lastChecked September 30, 2026) lists Teacher Free with unlimited presentations, interactive questions, Sessions, and participants — and projects student answers anonymously. Help docs on handling inappropriate responses state Free plan options to identify who left a response are: export responses to a spreadsheet (Google only), or hover a Flashcard Factory card. Live named Teacher Dashboard (view/highlight by name, hide/block), Drawing/Draggable, Reflect & Review, and Teacher Feedback are Teacher Premium.',
      },
      {
          q: 'How does LexiClash foil Pear Deck Teacher Free named-response honesty?',
          a: 'LexiClash free classroom vocab runs a whole class (up to 50) with a classroom roster and named feedback disclosure on the free path — teachers see who submitted what without a Premium Teacher Dashboard or post-session spreadsheet export. Distinct from ClassPoint Basic Free Max 25 / 5 Q (#1202), Socrative Free 5/1/50 (#1196), Mentimeter Free 50/month (#1183), and Wooclap Starter 5 active (#1186).',
      },
      {
          q: 'Is LexiClash a Google Slides / PowerPoint add-in like Pear Deck?',
          a: 'Different category. Pear Deck is interactive slides (Google/Microsoft) with Free anonymous projector + Premium named Teacher Dashboard. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats and named roster feedback on the classroom loop, no slide add-in required.',
      },
      {
          q: 'Do students need accounts on LexiClash?',
          a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games with roster/named feedback.',
      },
    ],
    ctaStart: "Start a classroom game",
    related: [
      { label: "vs ClassPoint" },
      { label: "vs Socrative" },
      { label: "vs Kahoot" },
    ],
  },
  he: {
    eyebrow: 'השוואה כנה',
    h1: 'LexiClash מול Pear Deck Teacher Free — תשובות בשם התלמיד, בכנות',
    lede: 'Pear Deck **Teacher Free** מפרסם **מפגשים ומשתתפים ללא הגבלה** ומקרין את תשובות התלמידים **באופן אנונימי**. תשובות בשם התלמיד ב-Free זמינות רק דרך **ייצוא לגיליון אלקטרוני** (Google) או **ריחוף מעל כרטיס ב-Flashcard Factory**. **Teacher Premium** פותח את לוח המורה החי עם שמות (צפייה והדגשה לפי שם, הסתרה וחסימה), ציור וגרירה, Reflect & Review ומשוב מהמורה. LexiClash עונה על כך עם כל הכיתה בחינם (50) + **רשימת כיתה ומשוב בשם התלמיד** במסלול החינמי. מקורות: [peardeck.com/pricing](https://www.peardeck.com/pricing) ו-[טיפול בתשובות לא הולמות](https://help.peardeck.com/migration/en/handling-inappropriate-responses).',
    thCompetitor: 'Pear Deck Teacher Free',
    rows: [
      ['מפגשים / משתתפים בחינם', '✓ כל הכיתה בחינם (עד 50)', 'Teacher Free: מפגשים ומשתתפים ללא הגבלה'],
      ['הקרנה / תשובות חיות', '✓ מעגל כיתתי + משחק חי', 'Teacher Free: הקרנת תשובות באופן אנונימי'],
      ['תשובות בשם התלמיד (Free)', '✓ רשימת כיתה ומשוב בשם התלמיד בחינם', 'Free: שמות רק דרך ייצוא לגיליון או ריחוף ב-Flashcard Factory'],
      ['לוח מורה חי עם שמות', '✓ רשימה וגילוי שמות בלי חסם Premium', 'Teacher Premium: צפייה והדגשה לפי שם, הסתרה וחסימה'],
      ['תשובות בציור / בגרירה', '— (מצבי יצירת מילים)', 'Teacher Premium: ציור + גרירה'],
      ['Reflect & Review / משוב מהמורה', '✓ מטעויות לחזרה חיה + מסלול משוב בשם התלמיד', 'Teacher Premium: Reflect & Review + משוב מהמורה'],
      ['מטעויות לחזרה חיה', '✓ מילים שהוחמצו מובילות בקישור ישיר למשחק חי, בחינם', 'מפגשי מצגת / לוח Premium (שמות לפי התוכנית)'],
      ['בלי הרשמת תלמידים', '✓ קוד הצטרפות של 6 תווים', 'מומלץ להתחבר עם אימייל כדי לזהות שמות'],
      ['סוג המשחק / השיעור', 'יצירת מילים (Boggle / גלגל / אנגרמות)', 'מצגות אינטראקטיביות (Google / Microsoft) + חבילת Pear Deck Learning'],
      ['מקור', '—', 'peardeck.com/pricing + help.peardeck.com …/handling-inappropriate-responses'],
    ],
    footnote: '',
    faqs: [
      { q: 'מה Pear Deck Teacher Free מפרסם לגבי תשובות בשם התלמיד?', a: 'התמחור של Pear Deck (peardeck.com/pricing, נבדק לאחרונה ב-30 בספטמבר 2026) מציג ב-Teacher Free מצגות, שאלות אינטראקטיביות, מפגשים ומשתתפים ללא הגבלה — ומקרין את תשובות התלמידים באופן אנונימי. מסמכי העזרה על טיפול בתשובות לא הולמות מציינים שב-Free אפשר לזהות מי השאיר תשובה רק בייצוא התשובות לגיליון אלקטרוני (Google בלבד) או בריחוף מעל כרטיס ב-Flashcard Factory. לוח מורה חי עם שמות (צפייה והדגשה לפי שם, הסתרה וחסימה), ציור וגרירה, Reflect & Review ומשוב מהמורה זמינים רק ב-Teacher Premium.' },
      { q: 'איך LexiClash מתמודד עם התשובות האנונימיות ב-Pear Deck Teacher Free?', a: 'אוצר המילים החינמי של LexiClash לכיתה מפעיל כיתה שלמה (עד 50) עם רשימת כיתה וחשיפת משוב בשם התלמיד במסלול החינמי — המורה רואה מי שלח מה בלי לוח מורה של Premium ובלי ייצוא לגיליון אחרי המפגש. שונה מ-ClassPoint Basic Free (מקסימום 25 / 5 שאלות), Socrative Free (5 / 1 / 50), Mentimeter Free (50 בחודש) ו-Wooclap Starter (5 פעילים).' },
      { q: 'האם LexiClash הוא תוסף ל-Google Slides / PowerPoint כמו Pear Deck?', a: 'זו קטגוריה אחרת. Pear Deck הוא מצגות אינטראקטיביות (Google / Microsoft) עם הקרנה אנונימית ב-Free ולוח מורה עם שמות ב-Premium. LexiClash הוא יצירת מילים (רשתות בסגנון Boggle, אנגרמות, גלגלי מילים) לתרגול אוצר מילים — מקומות חינמיים לכל הכיתה ומשוב לפי רשימת כיתה במעגל הכיתתי, בלי תוסף למצגות.' },
      { q: 'האם תלמידים צריכים חשבון ב-LexiClash?', a: 'לא. התלמידים מצטרפים עם קוד של 6 תווים. Teacher Pro מוסיף כיתות ללא הגבלה ודוחות להדפסה; המסלול החינמי כבר מכסה כיתה שלמה של עד 50 תלמידים במשחקי מילים לאוצר מילים, עם משוב לפי רשימת הכיתה ובשם התלמיד.' },
    ],
    ctaStart: 'התחילו משחק כיתתי',
    related: [{ label: 'מול ClassPoint' }, { label: 'מול Socrative' }, { label: 'מול Kahoot' }],
  },

  es: {
    eyebrow: 'Comparativa honesta',
    h1: 'LexiClash vs Pear Deck Teacher Free: respuestas con nombre, con honestidad',
    lede: 'Pear Deck **Teacher Free** publica **sesiones y participantes ilimitados** y proyecta las respuestas del alumnado **de forma anónima**. En Free, las respuestas con nombre solo se obtienen **exportando a una hoja de cálculo** (Google) o **pasando el cursor por una tarjeta de Flashcard Factory**. **Teacher Premium** desbloquea el panel docente en vivo con nombres (ver y resaltar por nombre, ocultar y bloquear), Dibujo y Arrastrar, Reflect & Review y comentarios del docente. LexiClash responde con toda la clase gratis (50) más **lista de clase y comentarios con nombre** en el plan gratuito. Fuentes: [peardeck.com/pricing](https://www.peardeck.com/pricing) y [Gestión de respuestas inapropiadas](https://help.peardeck.com/migration/en/handling-inappropriate-responses).',
    thCompetitor: 'Pear Deck Teacher Free',
    rows: [
      ['Sesiones / participantes gratis', '✓ Toda la clase gratis (hasta 50)', 'Teacher Free: sesiones y participantes ilimitados'],
      ['Proyector / respuestas en vivo', '✓ Bucle de aula + partida en vivo', 'Teacher Free: proyecta las respuestas de forma anónima'],
      ['Respuestas con nombre (Free)', '✓ Lista de clase y comentarios con nombre gratis', 'Free: nombres solo con exportación a hoja de cálculo o cursor sobre Flashcard Factory'],
      ['Panel docente en vivo con nombres', '✓ Lista de clase y nombres sin límite de Premium', 'Teacher Premium: ver y resaltar por nombre, ocultar y bloquear'],
      ['Respuestas de dibujo / arrastre', '— (modos de formar palabras)', 'Teacher Premium: Dibujo + Arrastrar'],
      ['Reflect & Review / comentarios del docente', '✓ De los fallos al repaso en vivo + comentarios con nombre', 'Teacher Premium: Reflect & Review + comentarios del docente'],
      ['De los fallos al repaso en vivo', '✓ Los fallos llevan directamente a una partida en vivo, gratis', 'Sesiones de diapositivas / panel Premium (nombres según el plan)'],
      ['Sin registro del alumnado', '✓ Código de acceso de 6 caracteres', 'Se recomienda iniciar sesión con correo para identificar nombres'],
      ['Tipo de juego / lección', 'Formación de palabras (Boggle/Rueda/Anagramas)', 'Diapositivas interactivas (Google / Microsoft) + suite Pear Deck Learning'],
      ['Fuente', '—', 'peardeck.com/pricing + help.peardeck.com …/handling-inappropriate-responses'],
    ],
    footnote: '',
    faqs: [
      { q: '¿Qué publica Pear Deck Teacher Free sobre las respuestas con nombre?', a: 'Los precios de Pear Deck (peardeck.com/pricing, última comprobación el 30 de septiembre de 2026) indican para Teacher Free presentaciones, preguntas interactivas, sesiones y participantes ilimitados, y proyectan las respuestas del alumnado de forma anónima. La ayuda sobre respuestas inapropiadas señala que, en Free, las opciones para saber quién dejó una respuesta son exportarlas a una hoja de cálculo (solo Google) o pasar el cursor por una tarjeta de Flashcard Factory. El panel docente en vivo con nombres (ver y resaltar por nombre, ocultar y bloquear), Dibujo y Arrastrar, Reflect & Review y los comentarios del docente son de Teacher Premium.' },
      { q: '¿Cómo responde LexiClash a las respuestas anónimas de Pear Deck Teacher Free?', a: 'El vocabulario de aula gratuito de LexiClash reúne a una clase entera (hasta 50) con lista de clase y comentarios con nombre en el plan gratuito: el profesorado ve quién envió qué sin panel docente Premium ni exportación a hoja de cálculo tras la sesión. No es lo mismo que ClassPoint Basic Free (máximo 25 / 5 preguntas), Socrative Free (5 / 1 / 50), Mentimeter Free (50 al mes) ni Wooclap Starter (5 activos).' },
      { q: '¿Es LexiClash un complemento de Google Slides / PowerPoint como Pear Deck?', a: 'Es otra categoría. Pear Deck son diapositivas interactivas (Google / Microsoft) con proyección anónima en Free y panel docente con nombres en Premium. LexiClash es un juego de formar palabras (cuadrículas estilo Boggle, anagramas, ruedas de palabras) para practicar vocabulario: plazas gratuitas para toda la clase y comentarios por lista de clase en el bucle de aula, sin complemento para diapositivas.' },
      { q: '¿Necesita el alumnado cuentas en LexiClash?', a: 'No. El alumnado se une con un código de 6 caracteres. Teacher Pro añade clases ilimitadas e informes imprimibles; el plan gratuito ya cubre una clase completa de hasta 50 estudiantes en los juegos de palabras de vocabulario, con comentarios por lista de clase y con nombre.' },
    ],
    ctaStart: 'Empezar una partida de clase',
    related: [{ label: 'vs ClassPoint' }, { label: 'vs Socrative' }, { label: 'vs Kahoot' }],
  },

  sv: {
    eyebrow: 'Ärlig jämförelse',
    h1: 'LexiClash vs Pear Deck Teacher Free — namngivna svar, ärligt talat',
    lede: 'Pear Deck **Teacher Free** publicerar **obegränsat antal sessioner och deltagare** och visar elevernas svar **anonymt**. Namngivna elevsvar i Free finns bara via **export till kalkylblad** (Google) eller **hovring över ett Flashcard Factory-kort**. **Teacher Premium** låser upp den levande lärarpanelen med namn (visa och markera per namn, dölj och blockera), Ritning och Dra-och-släpp, Reflect & Review samt lärarfeedback. LexiClash svarar med hela klassen gratis (50) + **klasslista och feedback med namn** i den gratis vägen. Källor: [peardeck.com/pricing](https://www.peardeck.com/pricing) och [Hantera olämpliga svar](https://help.peardeck.com/migration/en/handling-inappropriate-responses).',
    thCompetitor: 'Pear Deck Teacher Free',
    rows: [
      ['Gratis sessioner / deltagare', '✓ Hela klassen gratis (upp till 50)', 'Teacher Free: obegränsat antal sessioner och deltagare'],
      ['Projektor / live-svar', '✓ Klassrumsloop + live-spel', 'Teacher Free: visar svar anonymt'],
      ['Namngivna elevsvar (Free)', '✓ Klasslista och feedback med namn gratis', 'Free: namn bara via kalkylbladsexport eller hovring i Flashcard Factory'],
      ['Levande lärarpanel med namn', '✓ Klasslista och namn utan Premium-spärr', 'Teacher Premium: visa och markera per namn, dölj och blockera'],
      ['Ritnings- / dra-och-släpp-svar', '— (ordbildningslägen)', 'Teacher Premium: Ritning + Dra-och-släpp'],
      ['Reflect & Review / lärarfeedback', '✓ Från miss till live-repetition + feedback med namn', 'Teacher Premium: Reflect & Review + lärarfeedback'],
      ['Från miss till live-repetition', '✓ Missade ord leder direkt till ett live-spel, gratis', 'Bildspelssessioner / Premium-panel (namn beroende på plan)'],
      ['Ingen elevregistrering', '✓ Anslutningskod med 6 tecken', 'Inloggning med e-post rekommenderas för att identifiera namn'],
      ['Spel- / lektionstyp', 'Ordbildning (Boggle/Hjul/Anagram)', 'Interaktiva bildspel (Google / Microsoft) + Pear Deck Learning-sviten'],
      ['Källa', '—', 'peardeck.com/pricing + help.peardeck.com …/handling-inappropriate-responses'],
    ],
    footnote: '',
    faqs: [
      { q: 'Vad publicerar Pear Deck Teacher Free om namngivna elevsvar?', a: 'Pear Decks prissida (peardeck.com/pricing, senast kontrollerad 30 september 2026) anger för Teacher Free obegränsat antal presentationer, interaktiva frågor, sessioner och deltagare — och visar elevernas svar anonymt. Hjälpen om olämpliga svar säger att alternativen i Free för att se vem som lämnat ett svar är att exportera svaren till ett kalkylblad (bara Google) eller hovra över ett Flashcard Factory-kort. Levande lärarpanel med namn (visa och markera per namn, dölj och blockera), Ritning och Dra-och-släpp, Reflect & Review och lärarfeedback ingår i Teacher Premium.' },
      { q: 'Hur svarar LexiClash på de anonyma svaren i Pear Deck Teacher Free?', a: 'LexiClashs gratis klassrumsordförråd kör en hel klass (upp till 50) med klasslista och feedback med namn i den gratis vägen — läraren ser vem som skickat vad utan Premium-lärarpanel eller kalkylbladsexport efter sessionen. Skiljer sig från ClassPoint Basic Free (högst 25 / 5 frågor), Socrative Free (5 / 1 / 50), Mentimeter Free (50 per månad) och Wooclap Starter (5 aktiva).' },
      { q: 'Är LexiClash ett tillägg till Google Slides / PowerPoint som Pear Deck?', a: 'Det är en annan kategori. Pear Deck är interaktiva bildspel (Google / Microsoft) med anonym projektion i Free och lärarpanel med namn i Premium. LexiClash är ordbildning (Boggle-liknande rutnät, anagram, ordhjul) för ordförrådsträning — gratisplatser för hela klassen och feedback via klasslistan i klassrumsloopen, utan tillägg för bildspel.' },
      { q: 'Behöver eleverna konton på LexiClash?', a: 'Nej. Eleverna går med med en kod på 6 tecken. Teacher Pro lägger till obegränsat antal klasser och utskrivbara rapporter; gratisnivån täcker redan en hel klass på upp till 50 elever i ordspel för ordförråd, med feedback via klasslistan och med namn.' },
    ],
    ctaStart: 'Starta ett klassrumsspel',
    related: [{ label: 'vs ClassPoint' }, { label: 'vs Socrative' }, { label: 'vs Kahoot' }],
  },

  ja: {
    eyebrow: '正直な比較',
    h1: 'LexiClash vs Pear Deck Teacher Free — 名前付き回答を正直に比較',
    lede: 'Pear Deck の **Teacher Free** は、**セッションと参加者が無制限**で、生徒の回答は**匿名**で投影されます。Free で名前付きの回答を見るには、**スプレッドシートへのエクスポート**(Google)か、**Flashcard Factory のカードにカーソルを合わせる**方法しかありません。**Teacher Premium** では、名前付きのライブ教師ダッシュボード(名前での表示・ハイライト、非表示・ブロック)、描画・ドラッグ回答、Reflect & Review、教師フィードバックが使えます。LexiClash は、クラス全員(50人)を無料で受け入れ、無料のまま**クラス名簿と名前付きフィードバック**も使えます。出典: [peardeck.com/pricing](https://www.peardeck.com/pricing)、[不適切な回答への対処](https://help.peardeck.com/migration/en/handling-inappropriate-responses)。',
    thCompetitor: 'Pear Deck Teacher Free',
    rows: [
      ['無料のセッション/参加者', '✓ クラス全員が無料(最大50人)', 'Teacher Free: セッションと参加者が無制限'],
      ['プロジェクター/ライブ回答', '✓ 教室ループ + ライブプレイ', 'Teacher Free: 回答を匿名で投影'],
      ['名前付きの生徒回答(Free)', '✓ クラス名簿と名前付きフィードバックが無料', 'Free: 名前はスプレッドシートのエクスポートか Flashcard Factory のホバーのみ'],
      ['名前付きのライブ教師ダッシュボード', '✓ Premium の壁なしで名簿・名前を表示', 'Teacher Premium: 名前で表示・ハイライト、非表示・ブロック'],
      ['描画/ドラッグ回答', '—(単語づくりのモード)', 'Teacher Premium: 描画 + ドラッグ'],
      ['Reflect & Review/教師フィードバック', '✓ ミスからライブ復習へ + 名前付きフィードバック', 'Teacher Premium: Reflect & Review + 教師フィードバック'],
      ['ミスからライブ復習へ', '✓ ミスした単語から無料のライブゲームへ直接リンク', 'スライドのセッション / Premium ダッシュボード(名前の表示はプランによる)'],
      ['生徒の登録不要', '✓ 6文字の参加コード', '名前を識別するにはメールでのログインを推奨'],
      ['ゲーム/授業のタイプ', '単語づくり(Boggle/ホイール/アナグラム)', 'インタラクティブなスライド(Google / Microsoft)+ Pear Deck Learning スイート'],
      ['出典', '—', 'peardeck.com/pricing + help.peardeck.com …/handling-inappropriate-responses'],
    ],
    footnote: '',
    faqs: [
      { q: 'Pear Deck Teacher Free は名前付きの生徒回答についてどう公開していますか?', a: 'Pear Deck の料金ページ(peardeck.com/pricing、2026年9月30日確認)では、Teacher Free はプレゼン、インタラクティブな質問、セッション、参加者がいずれも無制限で、生徒の回答は匿名で投影されます。不適切な回答への対処に関するヘルプには、Free で誰が回答したかを確認する方法は、回答をスプレッドシートにエクスポートする(Google のみ)か、Flashcard Factory のカードにカーソルを合わせることだと書かれています。名前付きのライブ教師ダッシュボード(名前での表示・ハイライト、非表示・ブロック)、描画・ドラッグ回答、Reflect & Review、教師フィードバックは Teacher Premium の機能です。' },
      { q: 'LexiClash は Pear Deck Teacher Free の匿名回答にどう対応しますか?', a: 'LexiClash の無料の教室向け語彙ゲームは、クラス全体(最大50人)で遊べ、無料のままクラス名簿と名前付きのフィードバックを表示できます。Premium の教師ダッシュボードやセッション後のスプレッドシートのエクスポートなしで、先生は誰が何を送ったかを確認できます。ClassPoint Basic Free(最大25人・5問)、Socrative Free(5・1・50)、Mentimeter Free(月50)、Wooclap Starter(同時5)とは別の仕組みです。' },
      { q: 'LexiClash は Pear Deck のような Google スライド / PowerPoint のアドインですか?', a: 'カテゴリが異なります。Pear Deck はインタラクティブなスライド(Google / Microsoft)で、Free は匿名の投影、Premium は名前付きの教師ダッシュボードです。LexiClash は語彙練習のための単語づくりゲーム(Boggle 風のグリッド、アナグラム、ワードホイール)で、教室ループではクラス全員が無料で参加でき、クラス名簿に基づくフィードバックも使えます。スライドのアドインは不要です。' },
      { q: '生徒は LexiClash のアカウントが必要ですか?', a: '不要です。生徒は6文字のコードで参加します。Teacher Pro ではクラス数が無制限になり、印刷用レポートも使えます。無料プランでも、語彙の単語ゲームなら最大50人のクラス全体をすでにカバーでき、名簿に基づく名前付きフィードバックも使えます。' },
    ],
    ctaStart: 'クラスゲームを始める',
    related: [{ label: 'vs ClassPoint' }, { label: 'vs Socrative' }, { label: 'vs Kahoot' }],
  },

  ru: {
    eyebrow: 'Честное сравнение',
    h1: 'LexiClash vs Pear Deck Teacher Free — именные ответы: честно',
    lede: 'Pear Deck **Teacher Free** указывает **неограниченное число сессий и участников** и выводит ответы учеников на экран **анонимно**. Именные ответы в Free доступны только через **экспорт в таблицу** (Google) или **наведение курсора на карточку Flashcard Factory**. **Teacher Premium** открывает живую панель учителя с именами (просмотр и выделение по имени, скрытие и блокировка), рисование и перетаскивание, Reflect & Review и обратную связь от учителя. LexiClash отвечает бесплатным входом для всего класса (50 человек) + **списком класса и именной обратной связью** на бесплатном пути. Источники: [peardeck.com/pricing](https://www.peardeck.com/pricing) и [Обработка неуместных ответов](https://help.peardeck.com/migration/en/handling-inappropriate-responses).',
    thCompetitor: 'Pear Deck Teacher Free',
    rows: [
      ['Бесплатные сессии / участники', '✓ Весь класс бесплатно (до 50)', 'Teacher Free: неограниченное число сессий и участников'],
      ['Проектор / живые ответы', '✓ Классный цикл + живая игра', 'Teacher Free: ответы на экране анонимно'],
      ['Именные ответы учеников (Free)', '✓ Список класса и именная обратная связь бесплатно', 'Free: имена только через экспорт в таблицу или наведение на Flashcard Factory'],
      ['Живая панель учителя с именами', '✓ Список класса и имена без барьера Premium', 'Teacher Premium: просмотр и выделение по имени, скрытие и блокировка'],
      ['Ответы-рисунки / перетаскивание', '— (режимы составления слов)', 'Teacher Premium: рисование + перетаскивание'],
      ['Reflect & Review / обратная связь учителя', '✓ От ошибки к живому повторению + именная обратная связь', 'Teacher Premium: Reflect & Review + обратная связь учителя'],
      ['От ошибки к живому повторению', '✓ Пропущенные слова ведут прямой ссылкой в живую игру, бесплатно', 'Сессии со слайдами / панель Premium (имена зависят от тарифа)'],
      ['Без регистрации учеников', '✓ Код входа из 6 символов', 'Для определения имён рекомендуется вход по e-mail'],
      ['Тип игры / урока', 'Составление слов (Boggle/Колесо/Анаграммы)', 'Интерактивные слайды (Google / Microsoft) + набор Pear Deck Learning'],
      ['Источник', '—', 'peardeck.com/pricing + help.peardeck.com …/handling-inappropriate-responses'],
    ],
    footnote: '',
    faqs: [
      { q: 'Что Pear Deck Teacher Free указывает про именные ответы учеников?', a: 'Цены Pear Deck (peardeck.com/pricing, проверено 30 сентября 2026 года) указывают для Teacher Free неограниченное число презентаций, интерактивных вопросов, сессий и участников — а ответы учеников выводятся на экран анонимно. В справке по обработке неуместных ответов сказано, что в Free узнать, кто оставил ответ, можно только экспортом ответов в таблицу (только Google) или наведением курсора на карточку Flashcard Factory. Живая панель учителя с именами (просмотр и выделение по имени, скрытие и блокировка), рисование и перетаскивание, Reflect & Review и обратная связь учителя входят в Teacher Premium.' },
      { q: 'Как LexiClash отвечает на анонимные ответы в Pear Deck Teacher Free?', a: 'Бесплатная классная игра LexiClash по лексике вмещает весь класс (до 50 человек) со списком класса и именной обратной связью на бесплатном пути — учитель видит, кто что отправил, без панели учителя Premium и без экспорта в таблицу после сессии. Это отличается от ClassPoint Basic Free (максимум 25 / 5 вопросов), Socrative Free (5 / 1 / 50), Mentimeter Free (50 в месяц) и Wooclap Starter (5 активных).' },
      { q: 'LexiClash — это надстройка для Google Slides / PowerPoint, как Pear Deck?', a: 'Это другая категория. Pear Deck — интерактивные слайды (Google / Microsoft) с анонимным показом в Free и панелью учителя с именами в Premium. LexiClash — игра в составление слов (сетки в стиле Boggle, анаграммы, колёса слов) для тренировки лексики: бесплатные места для всего класса и обратная связь по списку класса в классном цикле, надстройка для слайдов не нужна.' },
      { q: 'Нужны ли ученикам аккаунты в LexiClash?', a: 'Нет. Ученики входят по коду из 6 символов. Teacher Pro добавляет неограниченное число классов и печатные отчёты; бесплатный тариф уже покрывает целый класс до 50 человек в словесных играх для лексики, с обратной связью по списку класса и по именам.' },
    ],
    ctaStart: 'Начать игру для класса',
    related: [{ label: 'vs ClassPoint' }, { label: 'vs Socrative' }, { label: 'vs Kahoot' }],
  },
};

export const copies: Record<Locale, VsFoilCopy> = Object.fromEntries(
  (Object.keys(pageCopy) as Locale[]).map((l) => [l, { ...common[l], ...pageCopy[l] }]),
) as Record<Locale, VsFoilCopy>;

export { resolveVsLocale };
