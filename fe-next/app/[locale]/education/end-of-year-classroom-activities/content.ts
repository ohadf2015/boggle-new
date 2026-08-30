import type { EducationLandingContent } from '@/lib/seo/educationLanding';

const EN: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'End of Year Classroom Activities — Word Games',
    description: 'Keep students engaged in the final week of term with LexiClash word games. No marking required. Free to start.',
    keywords: [
      'end of year classroom activities',
      'last day of school games',
      'final week of school activities',
      'end of term classroom games',
      'post-testing activities for students',
      'engagement games for last week',
      'word games final week school',
    ],
  },
  hero: {
    facts: ['Free to start', 'No grading needed', 'Works on any device', 'Five-day ready plan'],
    h1: { part1: 'Five days left, thirty kids who', highlight: 'will not sit down', part2: '.' },
    subtitle: 'A real plan for the final week of term. Academic but no marking. Students play together; you monitor.',
    primaryCta: { label: 'Create a classroom', href: '/education/classroom-game' },
    secondaryCta: { label: 'See it in action', href: '/multiplayer' },
  },
  answer: {
    question: 'What can I do with my class on the last days of school?',
    answer: 'Use LexiClash word games—no prep, no grading. Create a classroom, give students a join code, and run your choice of live Boggle, Word Wheel, Connections puzzles, or 1v1 vocabulary duels. Grades are done; students play together while you watch their progress. Free to start.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'Your Five-Day Plan',
      intro: 'The final week of term. Testing is over, grades are in, and the room is humming with low-level chaos. Here is a real day-by-day roadmap—thirty minutes of legitimate academic play, zero prep on your end.',
      items: [
        {
          step: 'Day 1: Reflection',
          focus: 'Warm re-entry; students reflect aloud on the year',
          activity: 'Play "Custom Word Hunt." Students call out words that mattered to them this year (names of friends, subjects they loved, favorite moments). Create a word list in LexiClash from their suggestions; play a single live game of Boggle-style word hunt from that list. No scoring. Just: "Did you find your word?"',
        },
        {
          step: 'Day 2: Speed & Celebration',
          focus: 'High energy, celebrate who is fastest',
          activity: 'Play three live rounds of Word Wheel. Same rules every round. No customization—just speed and vocabulary. Scoreboard shows live—students see who is on a streak. Takes 20 minutes, keeps them talking.',
        },
        {
          step: 'Day 3: Teams & Collaboration',
          focus: 'Shift to teamwork; celebrate working together',
          activity: 'Pairs play 1v1 vocabulary duels. Rotate partners each round. No whole-class winner—the goal is "did we all get through a round?"  Keeps energy high; no student waits long between turns. 25 minutes.',
        },
        {
          step: 'Day 4: Creative & Personal',
          focus: 'Students own the content',
          activity: 'Create a second custom word list: words students nominate that make them laugh, belong to an inside joke, or are just weird. Play Connections (the grouping puzzle) on theme words: animals, foods, places, silly words. Frees students from "right answer" thinking.',
        },
        {
          step: 'Day 5: Reflection & Goodbye',
          focus: 'Closure; celebrate the room',
          activity: 'Final game: play a live Boggle round on words hand-nominated from the whole year. While it plays, students call out their favorite memories of the class. Afterward: teacher shares one thing they noticed about the year. Takes 15 minutes.',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: 'End-of-Year Vocabulary',
      intro: 'Use these word groups to seed custom word lists in LexiClash. Students will recognize themselves in these themes.',
      groups: [
        {
          label: 'Looking Back',
          words: ['achievement', 'growth', 'memory', 'learned', 'challenge', 'friendship', 'moment', 'progress'],
        },
        {
          label: 'Summer & Next',
          words: ['adventure', 'freedom', 'rest', 'summer', 'excited', 'explore', 'family', 'new'],
        },
        {
          label: 'School & Us',
          words: ['classroom', 'friends', 'teacher', 'lesson', 'reading', 'math', 'courage', 'together'],
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Questions Teachers Ask',
      items: [
        {
          title: 'Can I customize the word list?',
          desc: 'Yes. Create a classroom, then upload any word list you want—your students\' names, topics they studied, inside jokes. Any subject, any grade.',
        },
        {
          title: 'Do I have to grade anything?',
          desc: 'No. Play for engagement only. You can see which students played and which words they found, but it does not feed into any grade.',
        },
        {
          title: 'How much tech do I need?',
          desc: 'A classroom projector or smartboard, and students with phones or tablets. Chromebooks work. No app to install—it is all in the browser.',
        },
        {
          title: 'Can I use this every day?',
          desc: 'Yes. Rotate the modes (Boggle on Monday, Word Wheel on Tuesday, Connections on Wednesday). The plan above covers one week; copy it weekly.',
        },
        {
          title: 'What if we are still testing?',
          desc: 'Word games do not conflict with testing. Run them at recess, during lunch, or on a separate period. Students who test in the morning still play in the afternoon.',
        },
        {
          title: 'How do I set up a classroom?',
          desc: 'Go to LexiClash, click "Create Classroom," choose a name, and get a join code. Tell your students the code, and they join. You are ready to play.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'What is the best game for the last week of school?',
      a: 'Boggle-style word hunts and Connections puzzles work best: fast-paced, no winners or losers (just "did you find the words?"), and every student plays at once. Word Wheel is great for speed and light competition.',
    },
    {
      q: 'Can my students play from home?',
      a: 'Yes. If students have devices, they can join any game you host by entering the join code. They do not need an email or account—they just type their name.',
    },
    {
      q: 'How many students can play at once?',
      a: 'The whole class. Any number of students can join a game and play live together.',
    },
    {
      q: 'What if a student finishes early?',
      a: 'In LexiClash, all students play the same game at the same time, so there is no "finishing early." Everyone sees the same board and plays until time runs out.',
    },
    {
      q: 'Can I track which students played?',
      a: 'Yes. Your classroom dashboard shows participation: who played, how many games, which words they found, and class-wide word patterns.',
    },
    {
      q: 'Do the games teach reading or vocabulary?',
      a: 'Yes. Word hunts build pattern recognition and spelling. Connections teach categorization and relationships. Both reinforce active word knowledge without worksheets.',
    },
    {
      q: 'What if my students have different reading levels?',
      a: 'Custom word lists solve this. Use easier words (three to five letters) for younger students or lower readers; use harder words for advanced students. All students play the same game, but with words matched to their level.',
    },
  ],
  labels: {
    faqTitle: 'Questions Teachers Ask',
    relatedTitle: 'More for Engaging Your Class',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'Brain Break Word Games', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: 'Vocabulary Games for Any Subject', accent: 'cyan' },
    { href: '/education/games-for-teachers', label: 'Games for Teachers', accent: 'purple' },
    { href: '/education', label: 'All Classroom Resources', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'Home',
    hub: 'Education',
    current: 'End of Year Activities',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: 'vocabulary, spelling, word patterns, categorization, collaborative play',
    timeRequired: 'PT30M',
  },
};

const HE: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'פעילויות סוף שנה בכיתה — משחקי מילים',
    description: 'שמור על תלמידים מעורבים בימים האחרונים של שנת הלימודים. משחקי מילים לא דורשים בדיקה. בחינם להתחיל.',
    keywords: [
      'פעילויות סוף שנה',
      'משחקי כיתה לסוף השנה',
      'פעילויות יום אחרון בבית ספר',
      'משחקי מילים כיתה',
      'פעילויות לימודיות סוף שנה',
      'משחקים לסוף זמן הלימודים',
    ],
  },
  hero: {
    facts: ['בחינם להתחיל', 'בלי בדיקות', 'עובד בכל מכשיר', 'תוכנית לחמישה ימים'],
    h1: { part1: 'חמישה ימים נשארו, שלושים תלמידים', highlight: 'שלא יכולים להישאר שקטים', part2: '.' },
    subtitle: 'תוכנית אמיתית לשבוע האחרון של שנת הלימודים. אקדמי אך ללא בדיקות. התלמידים משחקים ביחד; אתה צופה.',
    primaryCta: { label: 'צור כיתה', href: '/education/classroom-game' },
    secondaryCta: { label: 'ראה זאת בפעולה', href: '/multiplayer' },
  },
  answer: {
    question: 'מה אני יכול לעשות עם הכיתה שלי בימים האחרונים של בית הספר?',
    answer: 'השתמש במשחקי מילים של LexiClash—בלי הכנה, בלי בדיקות. צור כיתה, תן לתלמידים קוד הצטרפות, והפעל Boggle, Word Wheel, משחקי Connections או דואלים. בחינם להתחיל.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'תוכנית חמישה הימים שלך',
      intro: 'השבוע האחרון של שנת הלימודים. הבדיקות נגמרו, הציונים כתובים, והכיתה מזמזמת בכאוס שקט. הנה מפה אמיתית יום אחר יום—שלושים דקות של משחק אקדמי אמיתי, אפס הכנה שלך.',
      items: [
        {
          step: 'יום 1: השתקפות',
          focus: 'כניסה חמה; תלמידים משתקפים בקול על השנה',
          activity: 'משחק "ציד מילים בהתאמה אישית." התלמידים קוראים מילים שהיו חשובות להם השנה. צור רשימת מילים ב-LexiClash מההצעות שלהם; משחק Boggle ישיר מרשימה זו. בלי ניקוד—רק: "מצאת את המילה שלך?"',
        },
        {
          step: 'יום 2: מהירות וחגיגה',
          focus: 'אנרגיה גבוהה, חגוג את מי שהכי מהיר',
          activity: 'שלושה סיבובים של Word Wheel. אותו כללים בכל סיבוב. בלי התאמות אישיות—רק מהירות ואוצר מילים. לוח הקלפים מציג חי—תלמידים רואים מי על רצף. 20 דקות.',
        },
        {
          step: 'יום 3: קבוצות ושיתוף פעולה',
          focus: 'שינוי לעבודת קבוצה; חגוג עבודה ביחד',
          activity: 'זוגות משחקים תחרויות אוצר מילים 1 על 1. סובב בני זוג בכל סיבוב. בלי מנצח לכל כיתה—המטרה היא "האם סיימנו סיבוב?" 25 דקות.',
        },
        {
          step: 'יום 4: יצירתי וגלוי פנים',
          focus: 'תלמידים שולטים בתוכן',
          activity: 'צור רשימת מילים שניה: מילים שתלמידים מצביעים עליהן שמעשיקות, שייכות לבדיחה פנימית, או פשוט מוזרות. משחק Connections בקבוצות: בעלי חיים, אוכל, מקומות, מילים מוזרות. משחרר תלמידים מחשיבה "תשובה נכונה".',
        },
        {
          step: 'יום 5: השתקפות וללכת',
          focus: 'סגירה; חגוג את הכיתה',
          activity: 'משחק סופי: משחק Boggle ישיר על מילים שתלמידים הציעו כל השנה. בזמן המשחק, תלמידים קוראים את זכרונותיהם האהובים של הכיתה. אחרי: המורה משתף משהו שלמד על השנה. 15 דקות.',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: 'אוצר מילים סוף שנה',
      intro: 'השתמש בקבוצות מילים אלה כדי ליצור רשימות מילים בהתאמה אישית ב-LexiClash. תלמידים יכירו את עצמם בנושאים אלה.',
      groups: [
        {
          label: 'נחזור אחורה',
          words: ['הישג', 'גדילה', 'זיכרון', 'למדנו', 'אתגר', 'חברות', 'רגע', 'התקדמות'],
        },
        {
          label: 'קיץ והמשך',
          words: ['הרפתקה', 'חופש', 'מנוחה', 'קיץ', 'נרגש', 'חקור', 'משפחה', 'חדש'],
        },
        {
          label: 'בית ספר ואנחנו',
          words: ['כיתה', 'חברים', 'מורה', 'שיעור', 'קריאה', 'מתמטיקה', 'אומץ', 'ביחד'],
        },
      ],
    },
    {
      kind: 'cards',
      title: 'שאלות שמורים שואלים',
      items: [
        {
          title: 'האם אני יכול להתאים את רשימת המילים?',
          desc: 'כן. צור כיתה, ואז העלה כל רשימת מילים שאתה רוצה—שמות של התלמידים שלך, נושאים שהם למדו, בדיחות פנימיות. כל נושא, כל כיתה.',
        },
        {
          title: 'האם צריך לתן ניקוד לכום דבר?',
          desc: 'לא. משחק להשקעה בלבד. אתה יכול לראות אילו תלמידים משחקים ואילו מילים הם מצאו, אבל זה לא נכנס לשום ציון.',
        },
        {
          title: 'כמה טכנולוגיה אני צריך?',
          desc: 'מקרן כיתה או לוח חכם, וסטודנטים עם טלפונים או טבלטים. Chromebooks עובדים. אין אפליקציה להתקנה—הכל בדפדפן.',
        },
        {
          title: 'האם אני יכול להשתמש בזה כל יום?',
          desc: 'כן. סובב את המצבים (Boggle ביום שני, Word Wheel ביום שלישי, Connections ביום רביעי). התוכנית לעיל מכסה שבוע אחד; העתק אותה שבועית.',
        },
        {
          title: 'מה אם אנחנו עדיין בבדיקות?',
          desc: 'משחקי מילים לא מתנגשים עם בדיקות. הרץ אותם בהפסקה, בהצהריים, או בתקופה נפרדת. תלמידים שמבדקים בבוקר עדיין משחקים אחר הצהריים.',
        },
        {
          title: 'איך אני מקים כיתה?',
          desc: 'לך ל-LexiClash, לחץ על "צור כיתה," בחר שם, וקבל קוד הצטרפות. ספור לתלמידים שלך את הקוד, והם צופים. אתה מוכן למשחק.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'מה המשחק הטוב ביותר לשבוע האחרון של בית הספר?',
      a: 'Boggle וחידות Connections עובדות הכי טוב: בקצב מהיר, בלי מנצחים או מפסידים (רק "מצאת את המילים?"), וכל תלמיד משחק בו זמנית.',
    },
    {
      q: 'האם התלמידים שלי יכולים למשחק מהבית?',
      a: 'כן. אם לתלמידים יש מכשירים, הם יכולים להצטרף לכל משחק שאתה מארח על ידי הזנת קוד ההצטרפות. הם לא צריכים דוא"ל או חשבון.',
    },
    {
      q: 'כמה תלמידים יכולים למשחק בו זמנית?',
      a: 'כל הכיתה. כל מספר של תלמידים יכול להצטרף למשחק ולמשחק ישיר ביחד.',
    },
    {
      q: 'מה אם תלמיד מסיים מוקדם?',
      a: 'ב-LexiClash, כל התלמידים משחקים את אותו המשחק בו זמנית, אז אין "סיום מוקדם." הכולם רואים את אותו הלוח ומשחקים עד שהזמן נגמר.',
    },
    {
      q: 'האם אני יכול לעקוב אחר אילו תלמידים משחקים?',
      a: 'כן. לוח הבקרה של הכיתה שלך מציג השתתפות: מי משחק, כמה משחקים, אילו מילים הם מצאו, וחוקיות המילים בכיתה.',
    },
    {
      q: 'האם המשחקים מלמדים קריאה או אוצר מילים?',
      a: 'כן. ציד מילים בונה זיהוי דפוסים ואיות. Connections מלמד קטגוריה וקשרים. שניהם מחזקים ידע מילים פעיל ללא דפים.',
    },
    {
      q: 'מה אם לתלמידים שלי יש רמות קריאה שונות?',
      a: 'רשימות מילים בהתאמה אישית פותרות זאת. השתמש במילים קלות יותר (שלוש עד חמש אותיות) לתלמידים צעירים יותר או קוראים נמוכים יותר; השתמש במילים קשות יותר לתלמידים מתקדמים. כל התלמידים משחקים את אותו המשחק, אך עם מילים מותאמות לרמתם.',
    },
  ],
  labels: {
    faqTitle: 'שאלות שמורים שואלים',
    relatedTitle: 'עוד כדי להחזיק את הכיתה שלך מעורבת',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'משחקי הפסקה במוח', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: 'משחקי אוצר מילים', accent: 'cyan' },
    { href: '/education/games-for-teachers', label: 'משחקים למורים', accent: 'purple' },
    { href: '/education', label: 'כל משאבי החינוך', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'בית',
    hub: 'חינוך',
    current: 'פעילויות סוף שנה',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: 'אוצר מילים, איות, דפוסי מילים, קטגוריזציה, משחק שיתופי',
    timeRequired: 'PT30M',
  },
};

const SV: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'Aktiviteter sista veckan — Ordspel',
    description: 'Håll eleverna engagerade under skolavslutningen. Ordspel utan rättning. Gratis att börja.',
    keywords: [
      'aktiviteter sista veckan',
      'skolavslutning spel',
      'klassrumsspel sista dagen',
      'ordspel för klassrum',
      'verksamhet sista veckan skola',
      'engagerande spel slutet av året',
    ],
  },
  hero: {
    facts: ['Gratis att börja', 'Ingen rättning', 'Fungerar på alla enheter', 'Fem-dagarsplan klar'],
    h1: { part1: 'Fem dagar kvar och trettio elever som', highlight: 'inte orkar sitta stilla', part2: '.' },
    subtitle: 'En helt verklig veckoplan för de sista dagarna. Akademisk men utan rättning. Eleverna spelar tillsammans; du övervakar.',
    primaryCta: { label: 'Skapa ett klassrum', href: '/education/classroom-game' },
    secondaryCta: { label: 'Se det i aktion', href: '/multiplayer' },
  },
  answer: {
    question: 'Vad kan jag göra med min klass under slutet av skolåret?',
    answer: 'Använd ordspel som varken kräver förberedelse eller rättning. Skapa ett klassrum i LexiClash, dela klasskoden på tavlan och kör Boggle, Ordhjul, Connections-pussel eller orddueller. Eleverna tävlar, du hinner andas, och terminens sista dagar räknas fortfarande som undervisning. Gratis att komma igång.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'Din Fem-Dagarsplan',
      intro: 'Sista veckan av skolan. Proven är slut, betygen är satta, och klassrummet snummar av låg-nivå-kaos. Här är en verklig dag-för-dag-plan—trettio minuter av faktisk akademisk lek, noll förberedelse från din sida.',
      items: [
        {
          step: 'Dag 1: Eftertanke',
          focus: 'Varm inträde; eleverna reflekterar högt över året',
          activity: 'Spela "Eget Ordletande." Elever namnger ord som betydde mycket för dem under året (namn på vänner, ämnen de älskade, favoritminnen). Skapa en ordlista i LexiClash från deras förslag; spela en direkt Boggle-omgång från listan. Ingen poäng—bara: "Hittade du ditt ord?"',
        },
        {
          step: 'Dag 2: Hastighet & Firande',
          focus: 'Hög energi, fira vem som är snabbast',
          activity: 'Tre omgångar av Ordhjul. Samma regler varje gång. Ingen anpassning—bara hastighet och ordkunskap. Poängtavlan är live—elever ser vem som är på en segersvit. Tar 20 minuter.',
        },
        {
          step: 'Dag 3: Lag & Samarbete',
          focus: 'Skifta till lagarbete; fira att arbeta tillsammans',
          activity: 'Par spelar 1v1-orddueller. Rotera partners varje omgång. Ingen klassövergripande vinnare—målet är "fick vi alla igenom en omgång?" Håller energin uppe; ingen elev väntar länge mellan rundor. 25 minuter.',
        },
        {
          step: 'Dag 4: Kreativ & Personlig',
          focus: 'Eleverna äger innehållet',
          activity: 'Skapa en andra anpassad ordlista: ord som eleverna nominerar som gör dem skratta, tillhör ett gruppskämt, eller bara är konstiga. Spela Connections (grupperings-pussel) på temord: djur, mat, platser, konstiga ord. Befria eleverna från "rätt svar"-tänkande.',
        },
        {
          step: 'Dag 5: Eftertanke & Avslutning',
          focus: 'Avslutning; fira klassrummet',
          activity: 'Sista spel: en direkt Boggle-omgång på ord som eleverna nominerade från hela året. Medan det spelas ropar elever sina favoritminnen från året. Efteråt: läraren delar något de märkte om året. 15 minuter.',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: 'Slutord för året',
      intro: 'Använd dessa ordgrupper för att skapa anpassade ordlistor i LexiClash. Eleverna kommer att känna igen sig själva i dessa teman.',
      groups: [
        {
          label: 'Se Tillbaka',
          words: ['framgång', 'tillväxt', 'minne', 'lärde', 'utmaning', 'vänskap', 'stund', 'framsteg'],
        },
        {
          label: 'Sommar & Nästa',
          words: ['äventyr', 'frihet', 'vila', 'sommar', 'spänning', 'utforska', 'familj', 'nytt'],
        },
        {
          label: 'Skola & Vi',
          words: ['klassrum', 'vänner', 'lärare', 'lektion', 'läsning', 'matematik', 'mod', 'tillsammans'],
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Frågor Lärare Ställer',
      items: [
        {
          title: 'Kan jag anpassa ordlistan?',
          desc: 'Ja. Skapa ett klassrum och ladda sedan upp en vilken ordlista du vill—dina elevers namn, ämnen de läste, gruppskämt. Vilket ämne som helst, vilken årskurs som helst.',
        },
        {
          title: 'Behöver jag rätta något?',
          desc: 'Nej. Spela bara för engagemang. Du kan se vilka elever som spelade och vilka ord de hittade, men det läggs inte på något betyg.',
        },
        {
          title: 'Hur mycket teknik behöver jag?',
          desc: 'En klassrumsprojektör eller smartboard och elever med telefoner eller surfplattor. Chromebooks fungerar. Ingen app att installera—allt är i webben.',
        },
        {
          title: 'Kan jag använda detta varje dag?',
          desc: 'Ja. Rotera mellan spelen (Boggle på måndag, Ordhjul på tisdag, Connections på onsdag). Planen ovan täcker en vecka; kopiera den varje vecka.',
        },
        {
          title: 'Vad om vi fortfarande gör prov?',
          desc: 'Ordspel krockar inte med prov. Kör dem på rast, lunch eller en annan lektion. Elever som provar på morgonen spelar fortfarande på eftermiddagen.',
        },
        {
          title: 'Hur skapar jag ett klassrum?',
          desc: 'Gå till LexiClash, klicka på "Skapa klassrum", välj ett namn och få en klasskod. Läs upp koden för eleverna så ansluter de. Sedan är ni igång.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Vilket spel är bäst för sista veckan av skolan?',
      a: 'Boggle och Connections-pussel fungerar bäst: snabbt tempo, ingen vinnare eller förlorare (bara "hittade du orden?") och varje elev spelar samtidigt. Ordhjul är utmärkt för snabbhet och lätt tävling.',
    },
    {
      q: 'Kan mina elever spela hemifrån?',
      a: 'Ja. Har eleverna varsin enhet ansluter de till vilket spel du än startar genom att ange klasskoden. De behöver varken mejladress eller konto—de skriver bara sitt namn.',
    },
    {
      q: 'Hur många elever kan spela samtidigt?',
      a: 'Hela klassrummet. Vilket antal elever som helst kan ansluta till ett spel och spela live tillsammans.',
    },
    {
      q: 'Vad händer om en elev är klar innan andra?',
      a: 'I LexiClash spelar alla elever samma spel samtidigt, så det finns ingen "tidigt klar." Alla ser samma bräde och spelar tills tiden tar slut.',
    },
    {
      q: 'Kan jag spåra vilka elever som spelade?',
      a: 'Ja. Din klassrumskontrollpanel visar deltagande: vem som spelade, hur många spel, vilka ord de hittade och klassövergripande ordmönster.',
    },
    {
      q: 'Lär spelen läsning eller ordkunskap?',
      a: 'Ja. Ordletande bygger mönsterigenkänning och stavning. Connections lär kategorisering och samband. Båda förstärker aktiv ordkunskap utan arbetsblad.',
    },
    {
      q: 'Vad om mina elever har olika läsnivåer?',
      a: 'Anpassade ordlistor löser detta. Använd enklare ord (tre till fem bokstäver) för yngre elever eller svagare läsare; använd svårare ord för avancerade elever. Alla elever spelar samma spel, men med ord matchade till deras nivå.',
    },
  ],
  labels: {
    faqTitle: 'Frågor Lärare Ställer',
    relatedTitle: 'Mer för Engagemanget i Din Klass',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'Hjärnpausordspel', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: 'Ordspel för Klassrummet', accent: 'cyan' },
    { href: '/education/games-for-teachers', label: 'Spel för Lärare', accent: 'purple' },
    { href: '/education', label: 'Alla Utbildningsresurser', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'Hem',
    hub: 'Utbildning',
    current: 'Aktiviteter Sista Veckan',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: 'ordkunskap, stavning, ordmönster, kategorisering, samspelat spel',
    timeRequired: 'PT30M',
  },
};

const JA: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: '学年末活動 — 単語ゲーム',
    description: '学年末の授業で生徒を楽しませましょう。採点不要の単語ゲーム。無料で始められます。',
    keywords: [
      '学年末活動',
      '修了式ゲーム',
      '最後の授業アイデア',
      '学級活動ゲーム',
      '単語ゲーム教室',
      '年末の楽しい活動',
    ],
  },
  hero: {
    facts: ['無料で始める', '採点不要', 'どのデバイスでも動作', '5日間の計画'],
    h1: { part1: 'あと5日間、クラス全員が', highlight: '座っていられない。', part2: '' },
    subtitle: '学年末の本当の計画。学習的だが、採点なし。生徒が一緒に遊ぶ。あなたは監督するだけ。',
    primaryCta: { label: 'クラスを作成', href: '/education/classroom-game' },
    secondaryCta: { label: '実際に見る', href: '/multiplayer' },
  },
  answer: {
    question: '学年末の授業で生徒と何をできますか？',
    answer: 'LexiClashの単語ゲームを使用してください。準備なし、採点なし。クラスを作成し、生徒に参加コードを与え、Boggle、Word Wheel、Connections、または単語の決闘をプレイしてください。無料で始められます。',
  },
  sections: [
    {
      kind: 'steps',
      title: 'あなたの5日間の計画',
      intro: '学年末。テストは終わり、成績は決まり、教室は静かな混乱でざわめいています。ここは本当の日ごとの計画—30分の本当の学習的な遊び、あなたの準備はゼロ。',
      items: [
        {
          step: '1日目：振り返り',
          focus: '温かい導入；生徒が今年について声に出して考える',
          activity: '「カスタム単語探し」をプレイします。生徒が今年自分たちにとって意味のあった単語を言います（友達の名前、好きな教科、好きな思い出）。彼らの提案からLexiClashで単語リストを作成します。そのリストから1回のBoggleを直接プレイします。スコアなし—ただ「あなたの単語を見つけた？」',
        },
        {
          step: '2日目：スピードと祝い',
          focus: 'エネルギーが高い；誰が最速かを祝う',
          activity: 'Word Wheelの3ラウンド。毎回同じ規則。カスタマイズなし—スピードと単語力だけ。スコアボードはライブ—生徒は誰がストリークを持っているか見ます。20分。',
        },
        {
          step: '3日目：チームと協力',
          focus: 'チームワークにシフト；一緒に働くことを祝う',
          activity: 'ペアが1対1の単語決闘をプレイします。各ラウンドでパートナーを交換します。クラス全体の勝者なし—目標は「全員1ラウンド通した？」です。エネルギーを保ちます。生徒は順番を長く待ちません。25分。',
        },
        {
          step: '4日目：創造的かつ個人的',
          focus: '生徒がコンテンツを所有',
          activity: '2番目のカスタム単語リストを作成します：生徒が提案する笑える単語、クラス内ジョークに属する単語、または単に奇妙な単語。テーマ単語でConnectionsをプレイします：動物、食べ物、場所、奇妙な言葉。生徒を「正しい答え」の考えから解放します。',
        },
        {
          step: '5日目：振り返りとさようなら',
          focus: 'クロージング；クラスを祝う',
          activity: '最後のゲーム：今年を通して生徒が提案した単語でBoggleを1ラウンド直接プレイします。ゲーム中、生徒はクラスの好きな思い出を叫びます。その後：先生は今年について気づいたことを1つ共有します。15分。',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: '学年末の単語',
      intro: 'これらの単語グループを使用して、LexiClashでカスタム単語リストを作成します。生徒はこれらのテーマで自分たちを認識するでしょう。',
      groups: [
        {
          label: '振り返る',
          words: ['達成', '成長', '思い出', '学んだ', '挑戦', '友情', '瞬間', '進歩'],
        },
        {
          label: '夏と次',
          words: ['冒険', '自由', '休息', '夏', '興奮', '探索', '家族', '新しい'],
        },
        {
          label: '学校と私たち',
          words: ['教室', '友達', '先生', '授業', '読書', '算数', '勇気', '一緒に'],
        },
      ],
    },
    {
      kind: 'cards',
      title: '先生がよく聞く質問',
      items: [
        {
          title: '単語リストをカスタマイズできますか？',
          desc: 'はい。クラスを作成してから、好きな単語リストをアップロードしてください—生徒の名前、勉強した科目、クラス内ジョーク。どの教科でも、どの学年でも。',
        },
        {
          title: 'なにか採点する必要がありますか？',
          desc: 'いいえ。楽しさのためだけにプレイします。生徒がプレイしたこと、見つけた単語を見ることはできますが、それはどの成績にも入りません。',
        },
        {
          title: 'どのくらいのテクノロジーが必要ですか？',
          desc: '教室のプロジェクターまたはスマートボード、生徒のスマートフォンまたはタブレット。Chromebookも動きます。インストールするアプリはありません—ウェブブラウザで全て動作します。',
        },
        {
          title: '毎日これを使用できますか？',
          desc: 'はい。ゲームを交換してください（月曜日Boggle、火曜日Word Wheel、水曜日Connections）。上記の計画は1週間を対象としています。毎週それをコピーしてください。',
        },
        {
          title: 'まだテスト中の場合はどうしますか？',
          desc: '単語ゲームはテストと矛盾しません。休み時間、昼食時、または別の授業時間に実行してください。午前中にテストする生徒も午後には遊びます。',
        },
        {
          title: 'クラスをセットアップするにはどうすればよいですか？',
          desc: 'LexiClashにアクセスし、「クラスを作成」をクリックして、名前を選択し、参加コードを取得してください。生徒にコードを伝えます。すぐにプレイできます。',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '学年末で最高のゲームは何ですか？',
      a: 'Boggleスタイルの単語探しとConnectionsパズルが最適です。テンポが速く、勝者も敗者もありません（「単語を見つけた？」だけ）、全ての生徒が同時にプレイします。',
    },
    {
      q: '生徒は自宅からプレイできますか？',
      a: 'はい。生徒がデバイスを持っていれば、参加コードを入力して、あなたがホストするゲームに参加できます。メールアドレスやアカウントは必要ありません。',
    },
    {
      q: '同時に何人の生徒がプレイできますか？',
      a: 'クラス全体です。任意の数の生徒がゲームに参加して一緒にプレイできます。',
    },
    {
      q: '生徒が早く終わったらどうしますか？',
      a: 'LexiClashでは全ての生徒が同じゲームを同時にプレイするため、「早く終わる」ことはありません。全員が同じボードを見て、時間切れまでプレイします。',
    },
    {
      q: 'どの生徒がプレイしたか追跡できますか？',
      a: 'はい。クラスダッシュボードは参加状況を表示します：誰がプレイしたか、何ゲーム、見つけた単語、クラス全体の単語パターン。',
    },
    {
      q: 'ゲームは読解や単語力を教えていますか？',
      a: 'はい。単語探しはパターン認識とスペルを構築します。Connectionsはカテゴリー化と関係を教えます。どちらも能動的な単語知識を強化します。',
    },
    {
      q: '生徒の読解レベルが異なる場合はどうしますか？',
      a: 'カスタム単語リストがこれを解決します。若い生徒または読解が苦手な生徒には簡単な単語（3～5文字）を使用してください。全ての生徒が同じゲームをプレイしますが、単語は彼らのレベルに合わせられます。',
    },
  ],
  labels: {
    faqTitle: '先生がよく聞く質問',
    relatedTitle: 'クラスを楽しませるためにもっと',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: '脳トレーニング単語ゲーム', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: '教室の単語力ゲーム', accent: 'cyan' },
    { href: '/education/games-for-teachers', label: '先生向けゲーム', accent: 'purple' },
    { href: '/education', label: 'すべての教育リソース', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'ホーム',
    hub: '教育',
    current: '学年末の活動',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: '単語力、スペル、単語パターン、カテゴリー化、協力的な遊び',
    timeRequired: 'PT30M',
  },
};

const ES: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'Actividades de fin de año — Juegos de Palabras',
    description: 'Mantén a los estudiantes comprometidos en los últimos días. Juegos de palabras sin calificación. Gratis para empezar.',
    keywords: [
      'actividades fin de año',
      'juegos últimos días escuela',
      'actividades fin de curso',
      'juegos palabra aula',
      'actividades educativas fin de año',
      'juegos comprometimiento última semana',
    ],
  },
  hero: {
    facts: ['Gratis para empezar', 'Sin calificación', 'Funciona en cualquier dispositivo', 'Plan de cinco días'],
    h1: { part1: 'Cinco días quedan, treinta estudiantes que', highlight: 'no pueden estar sentados', part2: '.' },
    subtitle: 'Un plan real para la última semana de clases. Académico pero sin calificación. Los estudiantes juegan juntos; tú supervísas.',
    primaryCta: { label: 'Crear un aula', href: '/education/classroom-game' },
    secondaryCta: { label: 'Ver en acción', href: '/multiplayer' },
  },
  answer: {
    question: '¿Qué puedo hacer con mi clase en los últimos días del año escolar?',
    answer: 'Usa juegos de palabras que no requieren preparación ni corrección. Crea un aula en LexiClash, proyecta el código de clase y juega una ronda de Boggle, Word Wheel, Connections o duelos de vocabulario. El grupo compite, tú recuperas el aliento, y los últimos días del curso siguen contando como aprendizaje. Gratis para empezar.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'Tu Plan de Cinco Días',
      intro: 'La última semana de clases. Las pruebas terminaron, las calificaciones están asignadas, y el aula zumba con caos de bajo nivel. Aquí hay un plan real día a día—treinta minutos de juego académico legítimo, cero preparación de tu parte.',
      items: [
        {
          step: 'Día 1: Reflexión',
          focus: 'Entrada cálida; los estudiantes reflexionan en voz alta sobre el año',
          activity: 'Juega "Búsqueda de palabras personalizada." Los estudiantes nombran palabras que fueron significativas para ellos este año (nombres de amigos, materias que amaron, momentos favoritos). Crea una lista de palabras en LexiClash desde sus sugerencias; juega una ronda de Boggle directa desde esa lista. Sin puntuación—solo: "¿Encontraste tu palabra?"',
        },
        {
          step: 'Día 2: Velocidad y Celebración',
          focus: 'Alta energía, celebra quién es más rápido',
          activity: 'Tres rondas de Word Wheel. Las mismas reglas cada vez. Sin personalización—solo velocidad y vocabulario. El marcador se muestra en vivo—los estudiantes ven quién está en racha. Toma 20 minutos.',
        },
        {
          step: 'Día 3: Equipos y Colaboración',
          focus: 'Cambio al trabajo en equipo; celebra trabajar juntos',
          activity: 'Parejas juegan duelos de vocabulario 1v1. Rota parejas cada ronda. Sin ganador en toda la clase—el objetivo es "¿todos completamos una ronda?" Mantiene la energía alta; ningún estudiante espera mucho entre turnos. 25 minutos.',
        },
        {
          step: 'Día 4: Creativo y Personal',
          focus: 'Los estudiantes dueños del contenido',
          activity: 'Crea una segunda lista de palabras personalizada: palabras que los estudiantes nominan que los hacen reír, pertenecen a una broma interna, o son simplemente extrañas. Juega Connections (el rompecabezas de agrupación) en palabras temáticas: animales, comidas, lugares, palabras tontas. Libera a los estudiantes del pensamiento de "respuesta correcta".',
        },
        {
          step: 'Día 5: Reflexión y Despedida',
          focus: 'Cierre; celebra el aula',
          activity: 'Juego final: una ronda de Boggle directa en palabras nominadas por estudiantes desde todo el año. Mientras se juega, los estudiantes gritan sus recuerdos favoritos de la clase. Después: el maestro comparte algo que notó sobre el año. 15 minutos.',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: 'Vocabulario de Fin de Año',
      intro: 'Usa estos grupos de palabras para crear listas de palabras personalizadas en LexiClash. Los estudiantes se reconocerán en estos temas.',
      groups: [
        {
          label: 'Mirando Atrás',
          words: ['logro', 'crecimiento', 'recuerdo', 'aprendimos', 'desafío', 'amistad', 'momento', 'progreso'],
        },
        {
          label: 'Verano y Después',
          words: ['aventura', 'libertad', 'descanso', 'verano', 'emoción', 'explorar', 'familia', 'nuevo'],
        },
        {
          label: 'Escuela y Nosotros',
          words: ['aula', 'amigos', 'maestro', 'lección', 'lectura', 'matemáticas', 'valor', 'juntos'],
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Preguntas que Hacen los Maestros',
      items: [
        {
          title: '¿Puedo personalizar la lista de palabras?',
          desc: 'Sí. Crea un aula y luego sube cualquier lista de palabras que desees—nombres de tus estudiantes, temas que estudiaron, bromas internas. Cualquier materia, cualquier grado.',
        },
        {
          title: '¿Tengo que calificar algo?',
          desc: 'No. Juega solo por diversión. Puedes ver qué estudiantes jugaron y qué palabras encontraron, pero no se ingresa en ninguna calificación.',
        },
        {
          title: '¿Cuánta tecnología necesito?',
          desc: 'Un proyector de aula o pizarra inteligente, y estudiantes con teléfonos o tabletas. Los Chromebooks funcionan. No hay aplicación para instalar—todo está en el navegador.',
        },
        {
          title: '¿Puedo usar esto cada día?',
          desc: 'Sí. Rota los modos (Boggle el lunes, Word Wheel el martes, Connections el miércoles). El plan anterior cubre una semana; cópialo semanalmente.',
        },
        {
          title: '¿Qué si aún estamos haciendo pruebas?',
          desc: 'Los juegos de palabras no entran en conflicto con las pruebas. Ejecutalos en el recreo, durante el almuerzo, o en un período separado. Los estudiantes que toman pruebas por la mañana todavía juegan por la tarde.',
        },
        {
          title: '¿Cómo configuro un aula?',
          desc: 'Ve a LexiClash, haz clic en "Crear aula," elige un nombre y obtén un código de acceso. Dile a tus estudiantes el código y se unen. Estás listo para jugar.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '¿Cuál es el mejor juego para la última semana de escuela?',
      a: 'Las búsquedas de palabras estilo Boggle y los rompecabezas Connections funcionan mejor: ritmo rápido, sin ganadores ni perdedores (solo "¿encontraste las palabras?"), y todos los estudiantes juegan simultáneamente. Word Wheel es excelente para la velocidad y la competencia ligera.',
    },
    {
      q: '¿Pueden mis estudiantes jugar desde casa?',
      a: 'Sí. Si los estudiantes tienen dispositivos, pueden unirse a cualquier juego que hospedes ingresando el código de acceso. No necesitan correo electrónico ni cuenta—solo escriben su nombre.',
    },
    {
      q: '¿Cuántos estudiantes pueden jugar a la vez?',
      a: 'Toda la clase. Cualquier número de estudiantes puede unirse a un juego y jugar juntos en vivo.',
    },
    {
      q: '¿Qué pasa si un estudiante termina temprano?',
      a: 'En LexiClash, todos los estudiantes juegan el mismo juego al mismo tiempo, así que no hay "terminar temprano." Todos ven el mismo tablero y juegan hasta que se acaba el tiempo.',
    },
    {
      q: '¿Puedo rastrear qué estudiantes jugaron?',
      a: 'Sí. Tu panel de control de clase muestra participación: quién jugó, cuántos juegos, qué palabras encontraron, y patrones de palabras en toda la clase.',
    },
    {
      q: '¿Estos juegos enseñan lectura o vocabulario?',
      a: 'Sí. Las búsquedas de palabras construyen reconocimiento de patrones y ortografía. Connections enseña categorización y relaciones. Ambos refuerzan el conocimiento activo de palabras sin hojas de trabajo.',
    },
    {
      q: '¿Qué si mis estudiantes tienen diferentes niveles de lectura?',
      a: 'Las listas de palabras personalizadas resuelven esto. Usa palabras más fáciles (tres a cinco letras) para estudiantes más jóvenes o lectores más bajos; usa palabras más difíciles para estudiantes avanzados. Todos los estudiantes juegan el mismo juego, pero con palabras adaptadas a su nivel.',
    },
  ],
  labels: {
    faqTitle: 'Preguntas que Hacen los Maestros',
    relatedTitle: 'Más para Mantener tu Clase Comprometida',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'Juegos de Palabras para Pausas Cerebrales', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: 'Juegos de Vocabulario', accent: 'cyan' },
    { href: '/education/games-for-teachers', label: 'Juegos para Maestros', accent: 'purple' },
    { href: '/education', label: 'Todos los Recursos Educativos', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'Inicio',
    hub: 'Educación',
    current: 'Actividades de Fin de Año',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: 'vocabulario, ortografía, patrones de palabras, categorización, juego colaborativo',
    timeRequired: 'PT30M',
  },
};

const RU: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'Мероприятия конца года — Словесные игры',
    description: 'Поддержите интерес учащихся в последние дни учебного года. Словесные игры без проверки. Бесплатно начать.',
    keywords: [
      'мероприятия конца года',
      'игры конца учебного года',
      'последний день школы',
      'словесные игры класс',
      'учебные мероприятия конец года',
      'игры для последней недели',
    ],
  },
  hero: {
    facts: ['Бесплатно начать', 'Без проверки', 'Работает на всех устройствах', 'План на пять дней'],
    h1: { part1: 'Осталось пять дней, тридцать учеников которые', highlight: 'не могут сидеть на месте', part2: '.' },
    subtitle: 'Реальный план на последнюю неделю учебного года. Образовательный, но без проверки. Учащиеся играют вместе; вы наблюдаете.',
    primaryCta: { label: 'Создать класс', href: '/education/classroom-game' },
    secondaryCta: { label: 'Смотреть в действии', href: '/multiplayer' },
  },
  answer: {
    question: 'Что я могу делать с классом в последние дни учебного года?',
    answer: 'Возьмите словесные игры, которые не требуют ни подготовки, ни проверки. Создайте класс в LexiClash, покажите код на доске и запустите раунд Boggle, «Колеса слов», Connections или словарных дуэлей. Класс соревнуется, вы переводите дух, а последние дни учебного года всё ещё считаются учёбой. Начать можно бесплатно.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'Ваш План на Пять Дней',
      intro: 'Последняя неделя учебного года. Тесты закончены, оценки выставлены, и класс жужжит спокойным хаосом. Вот реальный день за днём план—тридцать минут подлинного образовательного развлечения, ноль подготовки с вашей стороны.',
      items: [
        {
          step: 'День 1: Размышление',
          focus: 'Теплый старт; учащиеся размышляют вслух о годе',
          activity: 'Играйте в "Поиск слов под заказ." Учащиеся называют слова, которые были для них важны в этом году (имена друзей, предметы, которые им нравились, любимые моменты). Создайте список слов в LexiClash из их предложений; играйте раунд Boggle из этого списка. Без подсчёта очков—просто: "Нашли ли вы своё слово?"',
        },
        {
          step: 'День 2: Скорость и Праздник',
          focus: 'Высокая энергия, праздничная атмосфера',
          activity: 'Три раунда Word Wheel. Одни и те же правила каждый раз. Без настроек—просто скорость и словарный запас. Таблица очков показывает в реальном времени—учащиеся видят, кто в лидерах. Занимает 20 минут.',
        },
        {
          step: 'День 3: Команды и Сотрудничество',
          focus: 'Переход к командной работе; праздник совместной работы',
          activity: 'Пары играют в дуэли словарного запаса 1 на 1. Чередуйте партнёров в каждом раунде. Без победителя всего класса—цель "все ли мы прошли раунд?" Поддерживает высокую энергию; ни один учащийся не ждёт долго между ходами. 25 минут.',
        },
        {
          step: 'День 4: Творческий и Личный',
          focus: 'Учащиеся владеют контентом',
          activity: 'Создайте второй список слов под заказ: слова, которые учащиеся предлагают, которые их смешат, относятся к внутреннему юмору или просто странные. Играйте в Connections (головоломку по группировке) на тематических словах: животные, еда, места, странные слова. Освобождает учащихся от мышления "правильный ответ".',
        },
        {
          step: 'День 5: Размышление и Прощание',
          focus: 'Заключение; праздничный класс',
          activity: 'Финальная игра: прямой раунд Boggle со словами, предложенными учащимися за весь год. Пока играется, учащиеся выкрикивают свои любимые воспоминания о классе. После: учитель делится тем, что заметил о годе. 15 минут.',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: 'Словарь Конца Года',
      intro: 'Используйте эти группы слов для создания настраиваемых списков слов в LexiClash. Учащиеся узнают себя в этих темах.',
      groups: [
        {
          label: 'Оглядываемся Назад',
          words: ['достижение', 'рост', 'воспоминание', 'учились', 'вызов', 'дружба', 'момент', 'прогресс'],
        },
        {
          label: 'Лето и После',
          words: ['приключение', 'свобода', 'отдых', 'лето', 'волнение', 'исследовать', 'семья', 'новый'],
        },
        {
          label: 'Школа и Мы',
          words: ['класс', 'друзья', 'учитель', 'урок', 'чтение', 'математика', 'мужество', 'вместе'],
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Вопросы, Которые Задают Учителя',
      items: [
        {
          title: 'Могу ли я настроить список слов?',
          desc: 'Да. Создайте класс, а затем загрузите любой список слов, который вы хотите—имена ваших учащихся, темы, которые они изучали, внутренние шутки. Любой предмет, любой класс.',
        },
        {
          title: 'Нужно ли мне проверять что-то?',
          desc: 'Нет. Играйте просто для развлечения. Вы можете видеть, какие учащиеся играли и какие слова они нашли, но это не входит ни в какие оценки.',
        },
        {
          title: 'Сколько технологии мне нужно?',
          desc: "Проектор класса или интерактивная доска и учащиеся с телефонами или планшетами. Chromebook'и работают. Нет приложения для установки—всё в браузере.",
        },
        {
          title: 'Могу ли я использовать это каждый день?',
          desc: 'Да. Чередуйте режимы (Boggle в понедельник, Word Wheel во вторник, Connections в среду). План выше охватывает одну неделю; копируйте его еженедельно.',
        },
        {
          title: 'Что если мы всё ещё проводим тесты?',
          desc: 'Словесные игры не конфликтуют с тестами. Проводите их на перемене, во время обеда или в отдельный период. Учащиеся, которые тестируются утром, всё ещё играют днём.',
        },
        {
          title: 'Как мне создать класс?',
          desc: 'Перейдите на LexiClash, нажмите "Создать класс," выберите имя и получите код доступа. Скажите своим учащимся код, и они присоединяются. Вы готовы к игре.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Какая лучшая игра для последней недели школы?',
      a: 'Поиск слов в стиле Boggle и головоломки Connections работают лучше всего: быстрый темп, нет побеждённых или потеряющих (только "нашли ли вы слова?"), и все учащиеся играют одновременно.',
    },
    {
      q: 'Могут ли мои учащиеся играть дома?',
      a: 'Да. Если учащиеся имеют устройства, они могут присоединиться к любой игре, которую вы проводите, введя код доступа. Им не нужна электронная почта или учётная запись.',
    },
    {
      q: 'Сколько учащихся могут играть одновременно?',
      a: 'Весь класс. Любое количество учащихся может присоединиться к игре и играть вместе в реальном времени.',
    },
    {
      q: 'Что если учащийся закончит раньше?',
      a: 'В LexiClash все учащиеся играют в одну и ту же игру одновременно, поэтому нет "закончить раньше". Все видят один и тот же доск и играют до конца времени.',
    },
    {
      q: 'Могу ли я отслеживать, какие учащиеся играли?',
      a: 'Да. Панель управления вашего класса показывает участие: кто играл, сколько игр, какие слова они нашли, и шаблоны слов по всему классу.',
    },
    {
      q: 'Эти игры обучают чтению или словарному запасу?',
      a: 'Да. Поиск слов развивает распознавание паттернов и орфографию. Connections учат категоризации и отношениям. Оба усиливают активное словарное знание без рабочих листов.',
    },
    {
      q: 'Что если мои учащиеся имеют разные уровни чтения?',
      a: 'Настраиваемые списки слов решают эту проблему. Используйте более лёгкие слова (три-пять букв) для более молодых учащихся или слабых читателей; используйте более сложные слова для продвинутых учащихся. Все учащиеся играют в одну игру, но со словами, адаптированными к их уровню.',
    },
  ],
  labels: {
    faqTitle: 'Вопросы, Которые Задают Учителя',
    relatedTitle: 'Больше Способов Вовлечь Ваш Класс',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'Словесные Игры для Перемен', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: 'Игры Словарного Запаса', accent: 'cyan' },
    { href: '/education/games-for-teachers', label: 'Игры для Учителей', accent: 'purple' },
    { href: '/education', label: 'Все Образовательные Ресурсы', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'Дом',
    hub: 'Образование',
    current: 'Мероприятия Конца Года',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: 'словарный запас, орфография, паттерны слов, категоризация, совместная игра',
    timeRequired: 'PT30M',
  },
};

const MAP: Record<string, EducationLandingContent> = {
  en: EN,
  he: HE,
  es: ES,
  sv: SV,
  ja: JA,
  ru: RU,
};

export function getEndOfYearContent(locale: string): EducationLandingContent {
  return MAP[locale] ?? EN;
}
