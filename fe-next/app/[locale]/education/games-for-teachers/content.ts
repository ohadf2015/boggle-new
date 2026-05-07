export type LocaleContent = {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterDescription: string;
  heroTag: string;
  heroH1: {
    part1: string;
    highlight: string;
    part2: string;
  };
  heroSubtitle: string;
  ctaSubLabel: string;
  faqTitle: string;
  faqs: Array<{
    q: string;
    a: string;
  }>;
};

export const EDUCATION_LOCALES = ['en', 'he', 'es', 'sv', 'ja'] as const;
export type EducationLocale = typeof EDUCATION_LOCALES[number];

const contentMap: Record<EducationLocale, LocaleContent> = {
  en: {
    metaTitle: 'Free Word Games for Teachers — Zero Prep, Class Analytics | LexiClash',
    metaDescription:
      'Free browser-based word games built for real classrooms: zero prep, custom vocabulary lists, per-student progress tracking. Use as 5-min warm-up, brain break, or sub-day activity. Free forever.',
    ogTitle: 'Free Word Games for Teachers',
    ogDescription: 'Built for the teacher with 5 minutes left in class and 30 students who need to move.',
    twitterDescription:
      'Free word games for classrooms. Pick a list, students log in, play. Dashboard tracks progress. Zero prep.',
    heroTag: '★ For Teachers ★ Zero Prep ★',
    heroH1: {
      part1: 'Word Games.',
      highlight: 'For Teachers.',
      part2: 'No prep.',
    },
    heroSubtitle:
      'Built for the teacher who has 5 minutes left in class and 30 students who need to move. Pick a list, students log in, play. The dashboard does the rest.',
    ctaSubLabel: 'Free account required • No credit card',
    faqTitle: 'Questions about classroom word games?',
    faqs: [
      {
        q: 'What word games can I use with my class?',
        a: 'LexiClash offers multiplayer word games like Boggle (find words in letter grids), Word Wheel (form words from spinning wheels), and Word Hunt (race to find hidden words). All games train vocabulary, pattern recognition, and spelling in real time.',
      },
      {
        q: 'How much prep time is required?',
        a: 'Zero. Create a free account, pick or upload a vocabulary list, share a link or code with students, and start playing. No lesson plans, worksheets, or material prep needed. Games work on Chromebooks, tablets, and phones.',
      },
      {
        q: 'Can I use my own vocabulary lists?',
        a: 'Yes. Upload CSV lists, use built-in curriculum lists, or mix both. Teachers can lock vocabulary to specific topics (units, themes, languages) and reuse lists across classes and years.',
      },
      {
        q: 'How do I track student progress?',
        a: 'The classroom dashboard shows per-student scores, word accuracy, speed, and engagement metrics in real time. Download reports by class, date range, or game type. No manual grading needed.',
      },
      {
        q: 'Can a substitute teacher run this?',
        a: 'Absolutely. Share a lesson code with the substitute. Students log in, play, and you see all results in your dashboard. Perfect for sub days — no prep needed.',
      },
      {
        q: 'Do I need a Chromebook cart or special hardware?',
        a: 'No. Any device with a browser works: Chromebooks, iPads, laptops, or student phones. Works offline in classrooms with patchy WiFi via cached assets.',
      },
    ],
  },
  he: {
    metaTitle: 'משחקי מילים חינמיים למורים — ללא הכנה, ניתוח כיתתי | לקסיקלאש',
    metaDescription:
      'משחקי מילים ברישת אינטרנט חינמיים מעוצבים לכיתות אמתיות: ללא הכנה, רשימות אוצר מילים מותאמות, ניתוח התקדמות לתלמיד. שימוש כתרגול 5 דקות, הפסקת מוח או יום חלופי. לתמיד חינם.',
    ogTitle: 'משחקי מילים חינמיים למורים',
    ogDescription: 'מעוצב למורה עם 5 דקות שנותרו בשיעור ו-30 תלמידים שצריכים לזוז.',
    twitterDescription:
      'משחקי מילים חינמיים לכיתות. בחר רשימה, התלמידים נכנסים, משחקים. לוח המחוונים עוקב אחר התקדמות. ללא הכנה.',
    heroTag: '★ למורים ★ ללא הכנה ★',
    heroH1: {
      part1: 'משחקי מילים.',
      highlight: 'לכיתה.',
      part2: 'בקליק אחד.',
    },
    heroSubtitle:
      'מעוצב למורה שיש לו 5 דקות בסוף השיעור ו-30 תלמידים שצריכים הנעה. בחר רשימה, התלמידים נכנסים, משחקים. לוח המחוונים עושה את השאר.',
    ctaSubLabel: 'חשבון חינם נדרש • אין כרטיס אשראי',
    faqTitle: 'שאלות על משחקי מילים בכיתה?',
    faqs: [
      {
        q: 'אילו משחקי מילים אוכל להשתמש עם הכיתה?',
        a: 'לקסיקלאש מציע משחקי מילים רבי משתתפים כמו בוגל (חפש מילים בחידות אותיות), גלגל מילים (צור מילים מגלגלים סובבים), וציד מילים (מירוץ למציאת מילים מוסתרות. כל משחק מאמן אוצר מילים, הכרת דפוסים וכתיב בזמן אמת.',
      },
      {
        q: 'כמה זמן הכנה נדרש?',
        a: 'אפס. יצור חשבון חינם, בחר או העלה רשימת אוצר מילים, שתף קישור או קוד עם התלמידים, והתחל לשחק. אין תוכניות שיעור, גיליונות עבודה או הכנת חומרים נדרשים. משחקים עובדים על כרומבוקים, טאבלטים וטלפונים.',
      },
      {
        q: 'האם אוכל להשתמש ברשימות אוצר מילים משלי?',
        a: 'כן. העלה רשימות CSV, השתמש ברשימות תוכנית לימודים מובנות, או עזוב שתיהן. מורים יכולים לנעול אוצר מילים לנושאים מסוימים (יחידות, ערכות נושא, שפות) ולהשתמש שוב ברשימות בכיתות ובשנים.',
      },
      {
        q: 'איך אני עוקב אחר התקדמות התלמיד?',
        a: 'לוח המחוונים של הכיתה מציג ניקוד לכל תלמיד, דיוק מילים, מהירות ומדדי מעורבות בזמן אמת. הורד דוחות לפי כיתה, טווח תאריכים או סוג משחק. לא נדרש ציון ידני.',
      },
      {
        q: 'האם מורה חלופי יכול להשתמש בזה?',
        a: 'בהחלט. שתף קוד שיעור עם המורה החלופי. התלמידים נכנסים, משחקים, וכל התוצאות מופיעות בלוח המחוונים שלך. מושלם ליום ללא מורה — לא נדרשת הכנה.',
      },
      {
        q: 'האם אני צריך עגלת כרומבוק או חומרה מיוחדת?',
        a: 'לא. כל מכשיר עם דפדפן עובד: כרומבוקים, iPad-ים, מחשבים ניידים או טלפונים של תלמידים. עובד גם בכיתות עם WiFi לקוי דרך נכסים שמור במטמון.',
      },
    ],
  },
  es: {
    metaTitle: 'Juegos de palabras gratuitos para maestros — Sin preparación, análisis de clase | LexiClash',
    metaDescription:
      'Juegos de palabras basados en navegador gratuitos diseñados para aulas reales: sin preparación, listas de vocabulario personalizadas, seguimiento del progreso por estudiante. Úsalos como calentamiento de 5 minutos, descanso mental o actividad de día de sustituto. Gratis para siempre.',
    ogTitle: 'Juegos de palabras gratuitos para maestros',
    ogDescription: 'Diseñado para el maestro con 5 minutos al final de clase y 30 estudiantes que necesitan moverse.',
    twitterDescription:
      'Juegos de palabras gratuitos para aulas. Elige una lista, los estudiantes inician sesión, juegan. El panel de control rastrea el progreso. Sin preparación.',
    heroTag: '★ Para Maestros ★ Sin Preparación ★',
    heroH1: {
      part1: 'Juegos de palabras.',
      highlight: 'Para la clase.',
      part2: 'Sin esfuerzo.',
    },
    heroSubtitle:
      'Diseñado para el maestro que tiene 5 minutos al final de clase y 30 estudiantes que necesitan moverse. Elige una lista, los estudiantes inician sesión, juegan. El panel de control hace el resto.',
    ctaSubLabel: 'Se requiere cuenta gratuita • Sin tarjeta de crédito',
    faqTitle: '¿Preguntas sobre juegos de palabras en el aula?',
    faqs: [
      {
        q: '¿Qué juegos de palabras puedo usar con mi clase?',
        a: 'LexiClash ofrece juegos de palabras multijugador como Bogglé (encuentra palabras en cuadrículas de letras), Rueda de palabras (forma palabras a partir de ruedas giratorias) y Caza de palabras (carrera para encontrar palabras ocultas). Todos los juegos entrenan vocabulario, reconocimiento de patrones y ortografía en tiempo real.',
      },
      {
        q: '¿Cuánto tiempo de preparación se requiere?',
        a: 'Cero. Crea una cuenta gratuita, elige o carga una lista de vocabulario, comparte un enlace o código con los estudiantes y comienza a jugar. No se necesitan planes de lección, hojas de trabajo ni preparación de materiales. Los juegos funcionan en Chromebooks, tablets y teléfonos.',
      },
      {
        q: '¿Puedo usar mis propias listas de vocabulario?',
        a: 'Sí. Carga listas CSV, usa listas de plan de estudios incorporadas o mezcla ambas. Los maestros pueden bloquear vocabulario a temas específicos (unidades, temas, idiomas) y reutilizar listas entre clases y años.',
      },
      {
        q: '¿Cómo hago un seguimiento del progreso de los estudiantes?',
        a: 'El panel de control de la clase muestra puntuaciones por estudiante, precisión de palabras, velocidad y métricas de participación en tiempo real. Descarga informes por clase, rango de fechas o tipo de juego. No se requiere calificación manual.',
      },
      {
        q: '¿Puede un maestro sustituto ejecutar esto?',
        a: 'Absolutamente. Comparte un código de lección con el maestro sustituto. Los estudiantes inician sesión, juegan y ves todos los resultados en tu panel de control. Perfecto para días de sustituto — sin preparación necesaria.',
      },
      {
        q: '¿Necesito un carrito de Chromebook o hardware especial?',
        a: 'No. Funciona cualquier dispositivo con un navegador: Chromebooks, iPads, laptops o teléfonos de estudiantes. Funciona en aulas con WiFi deficiente mediante activos en caché.',
      },
    ],
  },
  sv: {
    metaTitle: 'Gratis ordspel för lärare — Ingen förberedelse, klassanalys | LexiClash',
    metaDescription:
      'Gratis webbaserade ordspel designade för verkliga klassrum: ingen förberedelse, anpassade vokabulärlistor, spårning av elevens framsteg. Använd som 5-minuters uppvärmning, hjärnpaus eller vikarielektion. Gratis för alltid.',
    ogTitle: 'Gratis ordspel för lärare',
    ogDescription: 'Designat för läraren med 5 minuter kvar i lektionen och 30 elever som behöver röra sig.',
    twitterDescription:
      'Gratis ordspel för klassrum. Välj en lista, eleverna loggar in och spelar. Instrumentpanelen spårar framsteg. Ingen förberedelse.',
    heroTag: '★ För Lärare ★ Ingen Förberedelse ★',
    heroH1: {
      part1: 'Ordspel.',
      highlight: 'För klassen.',
      part2: 'Utan ansträngning.',
    },
    heroSubtitle:
      'Designat för läraren som har 5 minuter kvar i lektionen och 30 elever som behöver röra sig. Välj en lista, eleverna loggar in och spelar. Instrumentpanelen gör resten.',
    ctaSubLabel: 'Gratis konto krävs • Inget kreditkort',
    faqTitle: 'Frågor om ordspel i klassrummet?',
    faqs: [
      {
        q: 'Vilka ordspel kan jag använda med min klass?',
        a: 'LexiClash erbjuder flerspelar-ordspel som Boggle (hitta ord i bokstavsnät), Ordhjul (forma ord från roterande hjul) och Ordjakt (tävla om att hitta dolda ord). Alla spel tränar vokabulär, mönsterigenkänning och stavning i realtid.',
      },
      {
        q: 'Hur mycket förberedelsetid krävs?',
        a: 'Noll. Skapa ett gratis konto, välj eller ladda upp en vokabulärlista, dela en länk eller kod med eleverna och börja spela. Inga lektionsplaner, arbetsblad eller materialförberedelse krävs. Spelen fungerar på Chromebooks, surfplattor och telefoner.',
      },
      {
        q: 'Kan jag använda mina egna vokabulärlistor?',
        a: 'Ja. Ladda upp CSV-listor, använd inbyggda läroplanlistor eller blanda båda. Lärare kan låsa vokabulär till specifika ämnen (enheter, teman, språk) och återanvända listor mellan klasser och år.',
      },
      {
        q: 'Hur spårar jag elevernas framsteg?',
        a: 'Klassrummets instrumentpanel visar poäng per elev, ordnoggrannhet, hastighet och engagemangsmätvärden i realtid. Ladda ned rapporter efter klass, datumintervall eller speltyp. Ingen manuell betygsättning krävs.',
      },
      {
        q: 'Kan en vikarierande lärare köra detta?',
        a: 'Absolut. Dela en lektionskod med vikaren. Eleverna loggar in, spelar och du ser alla resultat i din instrumentpanel. Perfekt för vikariedagar — ingen förberedelse krävs.',
      },
      {
        q: 'Behöver jag en Chromebook-vagn eller speciell hårdvara?',
        a: 'Nej. Alla enheter med en webbläsare fungerar: Chromebooks, iPad-skivor, bärbara datorer eller elevtelefoner. Fungerar i klassrum med instabil WiFi via cachade tillgångar.',
      },
    ],
  },
  ja: {
    metaTitle: ' teachers-free word games — No preparation, class analytics | LexiClash',
    metaDescription:
      '本当の教室のために設計された無料のウェブベースの単語ゲーム：準備不要、カスタマイズされた語彙リスト、生徒ごとの進度追跡。5分間のウォームアップ、脳休憩、または代替授業の活動として使用。永遠に無料。',
    ogTitle:' teachers向けの無料単語ゲーム',
    ogDescription: '授業の最後に5分残った先生と、移動が必要な30人の生徒のために設計されました。',
    twitterDescription:
      '教室向けの無料単語ゲーム。リストを選択し、生徒がログインしてプレイします。ダッシュボードが進度を追跡します。準備不要。',
    heroTag: '★教師向け ★ 準備不要 ★',
    heroH1: {
      part1: '単語ゲーム。',
      highlight: 'クラス向け。',
      part2: '簡単。',
    },
    heroSubtitle:
      '授業の最後に5分残った先生と、移動が必要な30人の生徒のために設計されました。リストを選択し、生徒がログインしてプレイします。ダッシュボードが残りを行います。',
    ctaSubLabel: '無料アカウント必須 • クレジットカード不要',
    faqTitle: '教室での単語ゲームに関するご質問？',
    faqs: [
      {
        q: 'クラスでどんな単語ゲームが使えますか？',
        a: 'LexiClashはボグル（文字グリッドから単語を見つける）、ワードホイール（回転するホイールから単語を形成）、ワードハント（隠れた単語を見つけるレース）などのマルチプレイヤー単語ゲームを提供します。すべてのゲームはリアルタイムで語彙、パターン認識、綴りをトレーニングします。',
      },
      {
        q: '準備時間はどのくらい必要ですか？',
        a: 'ゼロです。無料アカウントを作成し、語彙リストを選択またはアップロードし、生徒とリンクまたはコードを共有してプレイを開始します。レッスン計画、ワークシート、または教材の準備は不要です。ゲームはChromebook、タブレット、携帯電話で動作します。',
      },
      {
        q: '自分の語彙リストを使用できますか？',
        a: 'はい。CSVリストをアップロードするか、組み込みカリキュラムリストを使用するか、両方を混ぜます。教師は語彙を特定のトピック（ユニット、テーマ、言語）にロックでき、クラスや年を通じてリストを再利用できます。',
      },
      {
        q: '生徒の進捗をどのように追跡しますか？',
        a: 'クラスダッシュボードは、生徒ごとのスコア、単語の正確さ、速度、エンゲージメント指標をリアルタイムで表示します。クラス、日付範囲、またはゲームタイプ別にレポートをダウンロードします。手動採点は不要です。',
      },
      {
        q: '代替教師がこれを実行できますか？',
        a: 'もちろんです。代替教師とレッスンコードを共有します。生徒がログインしてプレイし、すべての結果があなたのダッシュボードに表示されます。代替授業に最適です—準備は不要です。',
      },
      {
        q: 'Chromebook カートまたは特別なハードウェアが必要ですか？',
        a: 'いいえ。ブラウザを備えたすべてのデバイスが機能します：Chromebook、iPad、ラップトップ、または生徒の携帯電話。WiFiが不安定な教室でもキャッシュされたアセットを通じて機能します。',
      },
    ],
  },
};

export function getGamesForTeachersContent(locale: string): LocaleContent {
  const normalizedLocale = locale.toLowerCase().split('-')[0];

  if (normalizedLocale in contentMap) {
    return contentMap[normalizedLocale as EducationLocale];
  }

  return contentMap.en;
}
