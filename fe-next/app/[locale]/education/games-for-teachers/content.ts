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
  useCases: Array<{ tag: string; title: string; desc: string }>;
  features: Array<{ icon: string; text: string }>;
  sections: {
    howYouUse: string;
    ctaHeading: string;
    ctaSubtitle: string;
    ctaPrimaryButtonLabel: string;
    ctaSecondaryButtonLabel: string;
  };
  heroCtaStartGame: string;
  heroCtaTeacherHub: string;
  heroCtaTeacherHubSub: string;
  whatYouGetTitle: string;
  relatedResourcesAriaLabel: string;
  relatedVocabLink: string;
  relatedEslLink: string;
  relatedEducationLink: string;
  relatedForSchoolsLink: string;
};

export const EDUCATION_LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
export type EducationLocale = typeof EDUCATION_LOCALES[number];

const contentMap: Record<EducationLocale, LocaleContent> = {
  en: {
    metaTitle: 'Free Word Games for Teachers — Zero Prep, Class Analytics | LexiClash',
    metaDescription:
      'Free browser-based word games built for real classrooms: zero prep, custom vocabulary lists, per-student progress tracking. Use as 5-min warm-up, brain break, or sub-day activity. Free to start.',
    ogTitle: 'Free Word Games for Teachers',
    ogDescription: 'Built for the teacher with 5 minutes left in class and a whole class who need to move.',
    twitterDescription:
      'Free word games for classrooms. Pick a list, students log in, play. Dashboard tracks progress. Zero prep.',
    heroTag: '★ For Teachers ★ Zero Prep ★',
    heroH1: {
      part1: 'Word Games.',
      highlight: 'For Teachers.',
      part2: 'No prep.',
    },
    heroSubtitle:
      'Built for the teacher who has 5 minutes left in class and a whole class who need to move. Pick a list, students log in, play. The dashboard does the rest.',
    ctaSubLabel: 'Free account required • No credit card',
    faqTitle: 'Questions about classroom word games?',
    useCases: [
      { tag: '5-MIN', title: 'Lesson warm-up', desc: 'Open class with a quick Word Wheel from yesterday\'s vocab — wakes the room up.' },
      { tag: 'REVIEW', title: 'End-of-unit recap', desc: 'Boggle round on the unit\'s 30 target words; dashboard surfaces gaps for review.' },
      { tag: 'SUB-DAY', title: 'Substitute teacher', desc: 'Sub picks a saved list, projects code, students play. Zero permissions needed.' },
      { tag: 'BREAK', title: 'Mid-lesson brain break', desc: '3-minute vocabulary duel between desk partners — energizes without losing focus.' },
      { tag: 'ESL', title: 'Target-language drill', desc: 'Switch dictionaries (EN/ES/HE/SV/JA) per round for bilingual or ESL practice.' },
      { tag: 'CLUB', title: 'After-school club', desc: 'Word-game club runs itself — daily challenges + leaderboard create natural engagement.' },
    ],
    features: [
      { icon: '⏱️', text: 'Setup in under 60 seconds — pick list, share code, play' },
      { icon: '✅', text: 'Free student accounts — one-time setup, tracks XP and progress across sessions' },
      { icon: '📚', text: 'Upload custom curriculum word lists — any subject, any grade' },
      { icon: '📊', text: 'Per-student accuracy + class-wide missed-word patterns' },
      { icon: '👥', text: 'Live multiplayer a whole class; 1v1 duels for paired practice' },
      { icon: '🌍', text: 'Six languages: English, Hebrew (RTL), Spanish, Swedish, Japanese, Russian' },
      { icon: '💸', text: 'Free tier: 3 classes, 10 students each — Teacher Pro ($9/mo) lifts the cap' },
      { icon: '🔒', text: 'Student-safe: no chat, no DMs, no external links during play' },
    ],
    sections: {
      howYouUse: 'How you use it.',
      ctaHeading: '5 minutes left in class?',
      ctaSubtitle: 'Pick a list, share the code, students play.',
      ctaPrimaryButtonLabel: '▶ Start a Word Game',
      ctaSecondaryButtonLabel: 'See Education Hub',
    },
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
    heroCtaStartGame: '▶ Start a Class Game',
    heroCtaTeacherHub: '⚙ Teacher Hub',
    heroCtaTeacherHubSub: 'Word lists · Dashboard',
    whatYouGetTitle: 'What you get.',
    relatedResourcesAriaLabel: 'Related education resources',
    relatedVocabLink: '→ Classroom Vocabulary Games',
    relatedEslLink: '→ ESL Word Games',
    relatedEducationLink: '→ Education Hub',
    relatedForSchoolsLink: '→ For Schools & Districts',
  },
  he: {
    metaTitle: 'משחקי מילים חינמיים למורים — בלי הכנה, עם אנליטיקה | LexiClash',
    metaDescription:
      'משחקי מילים בחינם לכיתה. בלי הכנה, עם הרשימות שלכם ומעקב התקדמות. ל-5 דקות, להפסקה או ליום מילוי מקום. חינם להתחלה.',
    ogTitle: 'משחקי מילים חינמיים למורים',
    ogDescription: 'למורה שנשארו לו 5 דקות ו-כל הכיתה שצריך להעסיק.',
    twitterDescription:
      'משחקי מילים חינמיים. בוחרים רשימה, התלמידים משחקים, לוח המורה עוקב. בלי הכנה.',
    heroTag: '★ למורים ★ בלי הכנה ★',
    heroH1: {
      part1: 'משחקי מילים.',
      highlight: 'לכיתה.',
      part2: 'בלי הכנה.',
    },
    heroSubtitle:
      'למורה שנשארו לו 5 דקות בשיעור ו-כל הכיתה שצריך להעסיק. בוחרים רשימה, התלמידים משחקים, ולוח המורה עושה את כל השאר.',
    ctaSubLabel: 'חשבון חינם • בלי כרטיס אשראי',
    faqTitle: 'שאלות על משחקי מילים בכיתה?',
    useCases: [
      { tag: '5 דקות', title: 'חימום', desc: 'Word Wheel מהיר על מילות אתמול — מעיר את הכיתה.' },
      { tag: 'חזרה', title: 'סוף נושא', desc: 'Boggle על 30 המילים; לוח המורה מציג את הפערים.' },
      { tag: 'מילוי מקום', title: 'מורה מחליף', desc: 'בוחר רשימה שמורה, משדר קוד. בלי שום הגדרות.' },
      { tag: 'הפסקה', title: 'הפסקת מוח', desc: 'דו־קרב של 3 דקות בין השולחנות — מעיר בלי לפזר את הריכוז.' },
      { tag: 'אנגלית', title: 'שפת היעד', desc: 'מחליפים מילון (EN/ES/HE/SV/JA) — לכיתות דו-לשוניות ו-ESL.' },
      { tag: 'מועדון', title: 'אחרי הלימודים', desc: 'המשחקים רצים לבד — אתגר יומי + טבלת מובילים = עניין טבעי.' },
    ],
    features: [
      { icon: '⏱️', text: 'הגדרה בפחות מ-60 שניות — בוחרים, משתפים קוד, משחקים' },
      { icon: '✅', text: 'חשבונות חינמיים — הגדרה חד-פעמית, מעקב קבוע' },
      { icon: '📚', text: 'הרשימות שלכם — כל נושא, כל כיתה' },
      { icon: '📊', text: 'דיוק לכל תלמיד + מילים קשות לכיתה' },
      { icon: '👥', text: 'ריבוי משתתפים חי — כל הכיתה; דו־קרבות בזוגות' },
      { icon: '🌍', text: '6 שפות: אנגלית, עברית (RTL), ספרדית, שוודית, יפנית' },
      { icon: '💸', text: 'הכל חינם — בלי פרימיום' },
      { icon: '🔒', text: 'בטוח: בלי צ\'אט, בלי הודעות פרטיות ובלי קישורים חיצוניים בזמן המשחק' },
    ],
    sections: {
      howYouUse: 'ככה משתמשים בזה.',
      ctaHeading: 'נשארו 5 דקות בשיעור?',
      ctaSubtitle: 'בוחרים רשימה, משתפים קוד, התלמידים משחקים.',
      ctaPrimaryButtonLabel: '▶ התחילו משחק מילים',
      ctaSecondaryButtonLabel: 'למרכז החינוך',
    },
    faqs: [
      {
        q: 'אילו משחקי מילים יש?',
        a: 'Boggle (חיפוש בלוח), Word Wheel (בנייה מגלגל), Word Hunt (מציאת מטרה). כל משחק מאמן משהו אחר: איות, דפוסים, מהירות.',
      },
      {
        q: 'כמה הכנה צריך?',
        a: 'אפס. פותחים חשבון חינם, בוחרים או מעלים רשימה, משתפים קוד ומשחקים. בלי תוכנית שיעור ובלי דפי עבודה. עובד על כל מכשיר.',
      },
      {
        q: 'אפשר להשתמש ברשימות שלי?',
        a: 'כן. מעלים CSV או בוחרים רשימה מובנית. אפשר לנעול לנושאים מסוימים ולעשות שימוש חוזר בכל כיתה ובכל שנה.',
      },
      {
        q: 'איך עוקבים אחר ההתקדמות?',
        a: 'לוח המורה מציג ניקוד, דיוק ומהירות בזמן אמת, ואפשר להוריד דוחות. בלי לבדוק ולנקד ביד.',
      },
      {
        q: 'מתאים למורה מחליף?',
        a: 'בהחלט. משתפים קוד, התלמידים משחקים, והכול נרשם בלוח המורה. אפס הכנה ליום שאין בו מורה קבוע.',
      },
      {
        q: 'צריך Chromebook או ציוד מיוחד?',
        a: 'לא. כל דפדפן מספיק: טלפונים, טאבלטים ומחשבים. עובד אפילו עם WiFi חלש.',
      },
    ],
    heroCtaStartGame: '▶ התחל משחק כיתה',
    heroCtaTeacherHub: '⚙ ממשק מורה',
    heroCtaTeacherHubSub: 'רשימות מילים · לוח בקרה',
    whatYouGetTitle: 'מה אתה מקבל.',
    relatedResourcesAriaLabel: 'משאבי חינוך קשורים',
    relatedVocabLink: '→ משחקי אוצר מילים לכיתה',
    relatedEslLink: '→ משחקי מילים ESL',
    relatedEducationLink: '→ מרכז החינוך',
    relatedForSchoolsLink: '→ לבתי ספר ומחוזות',
  },
  es: {
    metaTitle: 'Juegos gratis para maestros — Sin preparación, análisis | LexiClash',
    metaDescription:
      'Juegos de palabras gratis para aulas. Sin preparación, tus listas, sigue el progreso. 5 minutos, descanso o día de sustituto. Gratis siempre.',
    ogTitle: 'Juegos de palabras gratis para maestros',
    ogDescription: 'Para el maestro con 5 minutos y toda la clase que necesitan moverse.',
    twitterDescription:
      'Juegos gratis. Elige lista, estudiantes juegan. Panel rastrea. Sin preparación.',
    heroTag: '★ Para Maestros ★ Sin Preparación ★',
    heroH1: {
      part1: 'Juegos de palabras.',
      highlight: 'Para la clase.',
      part2: 'Sin esfuerzo.',
    },
    heroSubtitle:
      'Para el maestro con 5 minutos y toda la clase que necesitan moverse. Elige una lista, estudiantes juegan. El panel hace el resto.',
    ctaSubLabel: 'Cuenta gratis • Sin tarjeta de crédito',
    faqTitle: '¿Preguntas sobre juegos?',
    useCases: [
      { tag: '5-MIN', title: 'Calentamiento de lección', desc: 'Abre la clase con un rápido Word Wheel del vocabulario de ayer - despierta la sala.' },
      { tag: 'REVIEW', title: 'Recapitulación de fin de unidad', desc: 'Ronda Boggle en las 30 palabras objetivo de la unidad; el panel de control muestra brechas para revisar.' },
      { tag: 'DÍA-SUB', title: 'Maestro sustituto', desc: 'Sub elige una lista guardada, proyecta código, estudiantes juegan. Cero permisos necesarios.' },
      { tag: 'DESCANSO', title: 'Descanso cerebral a mitad de lección', desc: 'Duelo de vocabulario de 3 minutos entre compañeros de escritorio - energiza sin perder el enfoque.' },
      { tag: 'ESL', title: 'Práctica en idioma objetivo', desc: 'Cambia diccionarios (EN/ES/HE/SV/JA) por ronda para práctica bilingüe o ESL.' },
      { tag: 'CLUB', title: 'Club después de la escuela', desc: 'El club de juegos de palabras se ejecuta solo - desafíos diarios + clasificación crean compromiso natural.' },
    ],
    features: [
      { icon: '⏱️', text: 'Setup en menos de 60 segundos — elige, comparte, juega' },
      { icon: '✅', text: 'Cuentas gratis — una vez, luego siempre' },
      { icon: '📚', text: 'Tus listas — cualquier materia, cualquier grado' },
      { icon: '📊', text: 'Precisión por alumno + palabras difíciles' },
      { icon: '👥', text: 'Multijugador — hasta 30; duelos de parejas' },
      { icon: '🌍', text: '6 idiomas: inglés, hebreo (RTL), español, sueco, japonés, ruso' },
      { icon: '💸', text: 'Gratis siempre — sin premium' },
      { icon: '🔒', text: 'Seguro: sin chat, sin DM, sin enlaces externos' },
    ],
    sections: {
      howYouUse: 'Cómo lo usas.',
      ctaHeading: '¿5 minutos quedan en clase?',
      ctaSubtitle: 'Elige una lista, comparte el código, estudiantes juegan.',
      ctaPrimaryButtonLabel: '▶ Iniciar un juego de palabras',
      ctaSecondaryButtonLabel: 'Ver centro de educación',
    },
    faqs: [
      {
        q: '¿Qué juegos hay?',
        a: 'Boggle (busca en rejilla), Rueda (forma de rueda), Caza (encuentra ocultas). Todos: vocabulario, patrones, ortografía en tiempo real.',
      },
      {
        q: '¿Cuánta preparación?',
        a: 'Cero. Cuenta gratis, elige o carga lista, comparte código, juega. Sin planes ni hojas. Funciona en todo.',
      },
      {
        q: '¿Mis listas?',
        a: 'Sí. CSV o incorporadas o ambas. Bloquea por tema, reutiliza años.',
      },
      {
        q: '¿Sigo progreso?',
        a: 'Sí. Panel en tiempo real: puntuaciones, precisión, velocidad. Descargas reportes. Sin calificar manual.',
      },
      {
        q: '¿Maestro sustituto?',
        a: 'Claro. Comparte código, ellos juegan, ves todo en tu panel. Cero preparación esos días.',
      },
      {
        q: '¿Chromebook o hardware?',
        a: 'No. Cualquier dispositivo. Funciona hasta con WiFi deficiente.',
      },
    ],
    heroCtaStartGame: '▶ Iniciar un juego de clase',
    heroCtaTeacherHub: '⚙ Panel del maestro',
    heroCtaTeacherHubSub: 'Listas de palabras · Panel de control',
    whatYouGetTitle: 'Lo que obtienes.',
    relatedResourcesAriaLabel: 'Recursos de educación relacionados',
    relatedVocabLink: '→ Juegos de vocabulario en el aula',
    relatedEslLink: '→ Juegos de palabras ESL',
    relatedEducationLink: '→ Centro de educación',
    relatedForSchoolsLink: '→ Para escuelas y distritos',
  },
  sv: {
    metaTitle: 'Gratis ordspel för lärare — Ingen förberedelse, analys | LexiClash',
    metaDescription:
      'Gratis ordspel för klassrummet. Ingen förberedelse, dina listor, spår framsteg. 5 minuter, paus eller vikariedag. Gratis alltid.',
    ogTitle: 'Gratis ordspel för lärare',
    ogDescription: 'För läraren med 5 minuter och hela klassen som behöver röra sig.',
    twitterDescription:
      'Gratis ordspel. Välj lista, elever spelar. Panel spårar. Ingen förberedelse.',
    heroTag: '★ För Lärare ★ Ingen Förberedelse ★',
    heroH1: {
      part1: 'Ordspel.',
      highlight: 'För klassen.',
      part2: 'Utan ansträngning.',
    },
    heroSubtitle:
      'För läraren med 5 minuter och hela klassen som behöver röra sig. Välj lista, elever spelar. Panelen gör resten.',
    ctaSubLabel: 'Gratis konto • Inget kreditkort',
    faqTitle: 'Frågor om ordspel?',
    useCases: [
      { tag: '5-MIN', title: 'Lektionsuppvärmning', desc: 'Öppna lektionen med ett snabbt Word Wheel från gårdagens vokabulär - väcker upp klassrummet.' },
      { tag: 'REVIEW', title: 'Sammanfattning vid enhetens slut', desc: 'Boggle-runda på enhetens 30 målord; instrumentpanelen visar luckor för granskning.' },
      { tag: 'VIKAR-DAG', title: 'Vikarierande lärare', desc: 'Vikarie väljer en sparad lista, projicerar kod, elever spelar. Noll behörigheter behövs.' },
      { tag: 'PAUS', title: 'Hjärnpaus mitt i lektionen', desc: '3-minuters ordförrådsduell mellan skrivbordskompisar - energiserar utan att tappa fokus.' },
      { tag: 'SPRÅK', title: 'Målspråksövning', desc: 'Byt ordböcker (EN/ES/HE/SV/JA) per rond för tvåspråkig eller ESL-övning.' },
      { tag: 'KLUBB', title: 'Efterskoleclub', desc: 'Ordspelsklubben kör sig själv - dagliga utmaningar + rankingslista skapar naturligt engagemang.' },
    ],
    features: [
      { icon: '⏱️', text: 'Inställning på under 60 sekunder - välj lista, dela kod, spela' },
      { icon: '✅', text: 'Gratis elevkonton - engångsinställning, spårar XP och framsteg under alla sessioner' },
      { icon: '📚', text: 'Ladda upp anpassade läroplanordslistor - vilken ämne, vilken årskurs som helst' },
      { icon: '📊', text: 'Noggrannhet per elev + klassomfattande mönster för förlorade ord' },
      { icon: '👥', text: 'Liveflerspelar hela klassen; 1v1-dueller för parövning' },
      { icon: '🌍', text: 'Sex språk: engelska, hebreiska (RTL), spanska, svenska, japanska, ryska' },
      { icon: '💸', text: 'Gratis att börja - ingen premiumtier, ingen kostnad per säte' },
      { icon: '🔒', text: 'Elevssäker: ingen chatt, inga DM, inga externa länkar under spel' },
    ],
    sections: {
      howYouUse: 'Hur du använder det.',
      ctaHeading: '5 minuter kvar i lektionen?',
      ctaSubtitle: 'Välj en lista, dela koden, elever spelar.',
      ctaPrimaryButtonLabel: '▶ Starta ett ordspel',
      ctaSecondaryButtonLabel: 'Se utbildningshub',
    },
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
    heroCtaStartGame: '▶ Starta ett klassrumsspel',
    heroCtaTeacherHub: '⚙ Lärarpanel',
    heroCtaTeacherHubSub: 'Ordlistor · Kontrollpanel',
    whatYouGetTitle: 'Vad du får.',
    relatedResourcesAriaLabel: 'Relaterade utbildningsresurser',
    relatedVocabLink: '→ Ordförrådsord för klassrum',
    relatedEslLink: '→ ESL-ordspel',
    relatedEducationLink: '→ Utbildningscentral',
    relatedForSchoolsLink: '→ För skolor och kommuner',
  },
  ja: {
    metaTitle: '無料単語ゲーム — 先生向け、準備なし | LexiClash',
    metaDescription:
      '教室向けの無料ゲーム。準備なし、あなたのリスト、進度追跡。5分、休憩、代講。ずっと無料。',
    ogTitle: '無料単語ゲーム',
    ogDescription: '5分残った先生と、30人が必要な先生向け。',
    twitterDescription:
      '無料ゲーム。リスト選んで、生徒がプレイ。ダッシュボード追跡。準備なし。',
    heroTag: '★先生向け ★ 準備なし ★',
    heroH1: {
      part1: '単語ゲーム。',
      highlight: 'クラス向け。',
      part2: '簡単。',
    },
    heroSubtitle:
      '5分残った先生と、30人が動く必要があります。リスト選んで、生徒がプレイ。ダッシュボードが残りをやる。',
    ctaSubLabel: '無料アカウント • クレジットカード不要',
    faqTitle: 'ゲームについて？',
    useCases: [
      { tag: '5-MIN', title: 'レッスン開始', desc: '昨日の語彙から素早いワードホイールでクラスを開きます — 教室を起こしてくれます。' },
      { tag: 'レビュー', title: 'ユニット終了時のまとめ', desc: 'ユニットの30の目標単語に対するボグルラウンド; ダッシュボードはレビューのためのギャップを表示します。' },
      { tag: '代講', title: '代替教師', desc: '代講が保存されたリストを選択し、コードを表示し、生徒がプレイします。権限ゼロが必要。' },
      { tag: '休憩', title: 'レッスン中の脳休憩', desc: 'デスクパートナー間の3分間の語彙デュエル — フォーカスを失わないで活力を与えます。' },
      { tag: 'ESL', title: 'ターゲット言語ドリル', desc: 'ラウンドごとに辞書（EN/ES/HE/SV/JA）を切り替えるか、バイリンガルまたはESL練習用。' },
      { tag: 'クラブ', title: '放課後クラブ', desc: '単語ゲームクラブは自分で実行します — 毎日のチャレンジ +ランキングが自然なエンゲージメントを作成します。' },
    ],
    features: [
      { icon: '⏱️', text: '60秒以内にセットアップ — リストを選択、コードを共有、プレイ' },
      { icon: '✅', text: '無料学生アカウント — 1回限りのセットアップ、すべてのセッション全体でXPと進度を追跡' },
      { icon: '📚', text: 'カスタムカリキュラム語彙リストをアップロード — 任意の科目、任意のグレード' },
      { icon: '📊', text: '学生ごとの精度 + クラス全体の単語ミスパターン' },
      { icon: '👥', text: 'クラス全員のリアルタイムマルチプレイヤー; ペア練習用の1v1デュエル' },
      { icon: '🌍', text: '6つの言語：英語、ヘブライ語（RTL）、スペイン語、スウェーデン語、日本語、ロシア語' },
      { icon: '💸', text: '永遠に無料 — プレミアム層なし、座席当たりのコストなし' },
      { icon: '🔒', text: '生徒向け安全：チャットなし、DM なし、プレイ中の外部リンクなし' },
    ],
    sections: {
      howYouUse: 'それを使う方法。',
      ctaHeading: '授業に5分残っていますか？',
      ctaSubtitle: 'リストを選択し、コードを共有し、生徒がプレイします。',
      ctaPrimaryButtonLabel: '▶ 単語ゲームを開始',
      ctaSecondaryButtonLabel: '教育ハブを見る',
    },
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
    heroCtaStartGame: '▶ クラスゲームを開始',
    heroCtaTeacherHub: '⚙ 先生向けハブ',
    heroCtaTeacherHubSub: '単語リスト · ダッシュボード',
    whatYouGetTitle: '何が得られるか。',
    relatedResourcesAriaLabel: '関連の教育リソース',
    relatedVocabLink: '→ クラスルーム語彙ゲーム',
    relatedEslLink: '→ ESL単語ゲーム',
    relatedEducationLink: '→ 教育ハブ',
    relatedForSchoolsLink: '→ 学校・教育委員会向け',
  },
  ru: {
    metaTitle: 'Бесплатные словесные игры для учителей — Без подготовки, аналитика | LexiClash',
    metaDescription:
      'Словесные игры для класса. Без подготовки, ваши списки, отслеживание успеха. 5 минут, перерыв или день замены. Бесплатный старт.',
    ogTitle: 'Бесплатные словесные игры для учителей',
    ogDescription: 'Для учителя с 5 минутами в классе и 30 учениками, которых нужно развлечь.',
    twitterDescription:
      'Бесплатные игры. Выбери список, ученики играют. Панель отслеживает. Без подготовки.',
    heroTag: '★ Для Учителей ★ Без Подготовки ★',
    heroH1: {
      part1: 'Словесные игры.',
      highlight: 'Для класса.',
      part2: 'Без хлопот.',
    },
    heroSubtitle:
      'Для учителя с 5 минутами в классе и 30 учениками, которых нужно развлечь. Выбираешь список, ученики играют, панель делает остальное.',
    ctaSubLabel: 'Бесплатный аккаунт • Без кредитной карты',
    faqTitle: 'Вопросы об играх в классе?',
    useCases: [
      { tag: '5 МИНУТ', title: 'Разминка', desc: 'Откройте урок быстрой игрой Word Wheel на вчерашних словах — пробудит класс.' },
      { tag: 'ПОВТОР', title: 'Конец темы', desc: 'Boggle на 30 ключевых слов темы; панель покажет пробелы для повторения.' },
      { tag: 'ЗАМЕНА', title: 'Учитель-заместитель', desc: 'Заместитель выбирает список, делится кодом, ученики играют. Никаких разрешений не требуется.' },
      { tag: 'ПЕРЕРЫВ', title: 'Мозговая разминка', desc: '3-минутный поединок между соседями по парте — заряжает без потери концентрации.' },
      { tag: 'ЯЗЫК', title: 'Тренировка целевого языка', desc: 'Переключайте словари (EN/ES/HE/SV/JA/RU) за раунд для двуязычной или ESL практики.' },
      { tag: 'КЛУБ', title: 'Клуб после школы', desc: 'Клуб словесных игр работает сам — ежедневные вызовы + рейтинг создают естественное увлечение.' },
    ],
    features: [
      { icon: '⏱️', text: 'Настройка менее чем за 60 секунд — выбери список, поделись кодом, играй' },
      { icon: '✅', text: 'Бесплатные аккаунты учеников — одноразовая настройка, отслеживание прогресса во всех сессиях' },
      { icon: '📚', text: 'Загружай свои списки слов — любой предмет, любой класс' },
      { icon: '📊', text: 'Точность по каждому ученику + общие пробелы по словам для класса' },
      { icon: '👥', text: 'Живая игра весь класс; дуэли в парах для практики' },
      { icon: '🌍', text: 'Шесть языков: английский, иврит (RTL), испанский, шведский, японский, русский' },
      { icon: '💸', text: 'Бесплатный тариф: 3 класса по 10 учеников — Teacher Pro ($9/мес) снимает лимит' },
      { icon: '🔒', text: 'Безопасно: без чата, без личных сообщений, без внешних ссылок во время игры' },
    ],
    sections: {
      howYouUse: 'Как это использовать.',
      ctaHeading: '5 минут до конца урока?',
      ctaSubtitle: 'Выбери список, поделись кодом, ученики играют.',
      ctaPrimaryButtonLabel: '▶ Начать игру',
      ctaSecondaryButtonLabel: 'Центр образования',
    },
    faqs: [
      {
        q: 'Какие словесные игры можно использовать с классом?',
        a: 'LexiClash предлагает многопользовательские словесные игры: Boggle (поиск слов в сетке букв), Word Wheel (составление слов из вращающегося колеса) и Word Hunt (поиск скрытых слов). Все игры тренируют словарный запас, распознавание паттернов и орфографию в реальном времени.',
      },
      {
        q: 'Сколько требуется подготовки?',
        a: 'Никакой. Создай бесплатный аккаунт, выбери или загрузи список слов, поделись ссылкой или кодом с учениками и начни играть. Не нужны планы уроков, рабочие листы или подготовка материалов. Игры работают на Chromebook, планшетах и телефонах.',
      },
      {
        q: 'Можно использовать свои списки слов?',
        a: 'Да. Загружай CSV-файлы, используй встроенные списки или комбинируй оба варианта. Учителя могут закрепить словарь за конкретными темами (разделы, тематики, языки) и переиспользовать списки между классами и годами.',
      },
      {
        q: 'Как отслеживать прогресс учеников?',
        a: 'Панель управления класса показывает баллы по каждому ученику, точность, скорость и метрики участия в реальном времени. Скачивай отчеты по классу, диапазону дат или типу игры. Ручное оценивание не требуется.',
      },
      {
        q: 'Может ли учитель-заместитель это использовать?',
        a: 'Конечно. Поделись кодом урока с заместителем. Ученики входят, играют, и все результаты видны в твоей панели. Идеально для дня замены — никакой подготовки.',
      },
      {
        q: 'Нужен Chromebook или специальное оборудование?',
        a: 'Нет. Работает на любом устройстве с браузером: Chromebook, iPad, ноутбуках или телефонах учеников. Функционирует даже в классах с нестабильным WiFi благодаря кэшированным ресурсам.',
      },
    ],
    heroCtaStartGame: '▶ Начать игру для класса',
    heroCtaTeacherHub: '⚙ Кабинет учителя',
    heroCtaTeacherHubSub: 'Списки слов · Панель управления',
    whatYouGetTitle: 'Что ты получаешь.',
    relatedResourcesAriaLabel: 'Связанные образовательные ресурсы',
    relatedVocabLink: '→ Игры на словарный запас в классе',
    relatedEslLink: '→ Игры на английском языке',
    relatedEducationLink: '→ Образовательный центр',
    relatedForSchoolsLink: '→ Для школ и округов',
  },
};

export function getGamesForTeachersContent(locale: string): LocaleContent {
  const normalizedLocale = locale.toLowerCase().split('-')[0];

  if (normalizedLocale in contentMap) {
    return contentMap[normalizedLocale as EducationLocale];
  }

  return contentMap.en;
}
