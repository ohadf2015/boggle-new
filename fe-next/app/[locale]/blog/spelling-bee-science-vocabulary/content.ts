// Blog: "Why Spelling Bees Work: The Memory Science Behind Elite Vocabulary"
// Culturally adapted per locale — NOT a literal translation
// HE/SV/JA/ES: needs native review

export type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  sections: Array<{ title?: string; content: string }>;
  backToBlog: string;
  tryDaily: string;
  practice: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: 'Why Spelling Bees Work: The Memory Science Behind Elite Vocabulary',
    subtitle: 'A 14-year-old just won $50,000 by memorizing words most adults can\'t even define. Here\'s what their training reveals about how memory actually works — and how you can use it.',
    category: 'Education',
    readTime: '7 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Software engineer, word game obsessive, and someone who would have spelled "chrysanthemum" wrong on national television. Still would.',
    sections: [
      {
        content: `Bruhat Soma was 14 years old when he won the 2024 Scripps National Spelling Bee, correctly spelling "absorptivity," "wunderkind," and a string of other words that most adults have never encountered outside a crossword puzzle. He\'d been preparing for years — a methodical, research-backed training regimen that looked nothing like the rote memorization most people imagine.

The interesting part isn\'t the trophy. It\'s that the methods elite spellers use to lock words into memory are the same methods cognitive scientists have been publishing papers about for decades. The science has just been slow to reach actual classrooms. So let\'s fix that.`,
      },
      {
        title: 'Orthographic mapping: why some words never forget',
        content: `Dr. Linnea Ehri, a cognitive psychologist who spent forty years studying reading acquisition, identified a process she called "orthographic mapping" — the mechanism by which a word gets permanently fused into long-term memory.

In practice, it works like this: when you encounter a new word, your brain maps its sounds (phonemes) onto its spelling (graphemes). The richer that mapping — the more connections between sound, letter pattern, and meaning — the faster the word becomes automatic. Fluent readers don\'t decode words. They recognize them instantly, the way you recognize a face. The spelling is fused to the sound to the meaning in one compact memory unit.

Elite spellers are elite orthographic mappers. When a spelling bee contestant encounters "sertraline" for the first time, they\'re not memorizing a random string of characters. They\'re connecting the Latin root "serta" (chain), the suffix "-ine" (indicating a compound), the sound pattern, and the original language of entry. The word becomes a multi-layered memory structure, not a flat list of letters to recite in order.

This is also why rote flashcard drilling fails for long-term vocabulary. It creates one shallow connection — letter sequence to sound — with nothing else anchoring it. One week later, the word is gone.`,
      },
      {
        title: 'Testing yourself beats studying. Every time.',
        content: `The most counterintuitive finding in educational psychology: being tested on information improves retention more than re-studying the same information. This is the "testing effect" or "retrieval practice effect," and it\'s one of the most replicated findings in all of cognitive science.

Roediger and Karpicke (2006) ran a clean experiment: one group studied a text four times. Another group studied once and was tested three times. One week later, the tested group retained 50 percent more. Not marginally more. Fifty percent.

Spelling bees are, at their core, a retrieval practice engine. You don\'t study "chrysanthemum" and then study it again. You get asked for it. You either produce it or you don\'t. That act of attempted retrieval — whether you succeed or fail — does more for long-term retention than another hour of passive review. The bee forces active recall, which is exactly what the brain needs to consolidate memory.

This is also why word games work better than vocabulary lists for language acquisition. When you\'re racing to find words on a grid under time pressure, you\'re running retrieval practice continuously — you\'re just too engaged to notice you\'re studying.`,
      },
      {
        title: 'The pressure paradox',
        content: `Competitive spelling seems almost deliberately cruel. You stand at a microphone in front of hundreds of strangers and have to spell "Ursprache" correctly, or sit down in public. The stakes feel absurd for a word game.

But the stress is actually part of what makes it work. The Yerkes-Dodson law — now over a century old and still holding up — shows that moderate arousal improves both performance and memory formation. A small amount of performance anxiety primes the brain to pay close attention. It signals: this matters, encode this.

The students who benefit most from spelling bees aren\'t necessarily the ones who win. They\'re the ones who felt genuine uncertainty before answering — that electric pause before committing to a spelling — and either succeeded or failed in front of their peers. The emotional charge makes the memory stickier. Research on emotional arousal and memory consolidation confirms what teachers have observed for years: students remember the week of the spelling bee better than almost any other week of the school year.

Not because the teacher covered more material. Because the emotional context made everything more memorable.`,
      },
      {
        title: 'What this means if you\'ll never be on a stage',
        content: `Most people reading this are not preparing for a national spelling competition. That\'s fine. The principles transfer completely.

If you want to build vocabulary that actually sticks — not words you\'ve "seen before" but words you genuinely own and use — you need three things that spelling bees happen to provide: multi-layered encoding (connect sound, spelling, and meaning at the same time), retrieval practice (get tested, don\'t just review), and enough emotional engagement to tell your brain this is worth keeping.

Word games accomplish all three. When you\'re hunting for an eight-letter word under time pressure, you\'re not passively reading a definition. You\'re retrieving, under mild stress, from a multi-sensory context that makes the memory durable.

A practical suggestion for teachers: try a timed word game with students instead of a Friday vocabulary quiz. It creates the same conditions — retrieval under mild pressure, immediate feedback, words in context — with a fraction of the anxiety. The evidence says that combination works better than flashcards. The students probably already know this. They just don\'t know the research backs them up.`,
      },
    ],
    backToBlog: '← Back to Blog',
    tryDaily: 'Try the Daily Challenge',
    practice: 'Spelling Practice for Students',
  },
  he: {
    title: 'למה חידוני איות עובדים: מדע הזיכרון מאחורי אוצר מילים ברמה עילית',
    subtitle: 'ילד בן 14 זכה ב-50,000 דולר על ידי שינון מילים שרוב המבוגרים לא מכירים. מה זה מלמד אותנו על אופן פעולת הזיכרון?',
    category: 'חינוך',
    readTime: '7 דקות קריאה',
    authorName: 'אוהד פישר',
    authorBio: 'מפתח תוכנה, משוגע למשחקי מילים, ומי שהיה מאיית "כריזנתמום" לא נכון בטלוויזיה הלאומית.',
    sections: [
      {
        content: `ברוהאת סומה היה בן 14 כשניצח בתחרות Scripps National Spelling Bee 2024 — אחת מתחרויות האיות היוקרתיות בעולם. ההכנות שלו לא כללו שינון מכני. הן כללו את אותן שיטות שמדעני הקוגניציה ממליצים עליהן כבר עשורים.`,
      },
      {
        title: 'מיפוי אורתוגרפי: איך מילים נשמרות לתמיד',
        content: `ד"ר לינאה אהרי זיהתה תהליך שנקרא "מיפוי אורתוגרפי" — המנגנון שבו מילה נשרשת בזיכרון לטווח ארוך. כשפוגשים מילה חדשה, המוח מקשר את הצלילים שלה לאותיות ולמשמעות בבת אחת. ככל שהקשר עמוק יותר — עם שורות, סיומות, שפת המקור — כך המילה נשמרת טוב יותר.

זו הסיבה שכרטיסי פלאש לא עובדים לאורך זמן: הם יוצרים קשר שטחי אחד בלבד בין איות לצליל, ללא עומק.`,
      },
      {
        title: 'בחינה עדיפה על לימוד — תמיד',
        content: `מחקר קלאסי של Roediger & Karpicke (2006) הראה: קבוצה שלמדה חומר פעם אחת ונבחנה שלוש פעמים, שמרה 50% יותר מידע לאחר שבוע מאשר קבוצה שלמדה ארבע פעמים ולא נבחנה. חידון האיות הוא מנוע של "תרגול אחזור" — כשנדרשים להפיק מילה מתוך הזיכרון, המוח מחזק את השמירה.

משחקי מילים עושים בדיוק את אותו הדבר — רק שהמשתתפים עסוקים מכדי להבחין שהם לומדים.`,
      },
      {
        title: 'מה זה אומר לכולנו',
        content: `לא חייבים לעמוד על במה כדי ליהנות מהיתרונות. משחקי מילים בלחץ זמן מספקים: קידוד רב-שכבתי, תרגול אחזור, ומעורבות רגשית — שלוש המרכיבים שהופכים מילים לזיכרון קבוע.

המלצה מעשית למורים: נסו משחק מילים תחת לחץ זמן במקום חידון אוצר מילים ביום שישי. המחקר אומר שזה עובד טוב יותר. התלמידים כבר יודעים זאת — הם רק לא יודעים שהמדע מגבה אותם.`,
      },
    ],
    backToBlog: '← חזרה לבלוג',
    tryDaily: 'נסה את האתגר היומי',
    practice: 'תרגול איות לתלמידים',
  },
  sv: {
    title: 'Varför stavningstävlingar fungerar: Minnesforskning om ordförråd på elitnivå',
    subtitle: 'En 14-åring vann nyligen 50 000 dollar på att stava ord som de flesta vuxna aldrig hört. Vad avslöjar det om hur minnet faktiskt fungerar?',
    category: 'Utbildning',
    readTime: '7 min läsning',
    authorName: 'Ohad Fisher',
    authorBio: 'Mjukvaruingenjör, ordspelsnörd och någon som med säkerhet hade stavat "krysantemum" fel på nationell television.',
    sections: [
      {
        content: `Bruhat Soma var 14 år gammal när han vann Scripps National Spelling Bee 2024 — en av världens mest prestigefyllda stavningstävlingar. Hans träningsmetod liknade inte alls den utantillärning folk föreställer sig. Den byggde på samma principer som kognitionsforskare rekommenderat i decennier.`,
      },
      {
        title: 'Ortografisk kartläggning: varför ord sitter kvar',
        content: `Dr. Linnea Ehri identifierade processen "ortografisk kartläggning" — hur ett ord permanent lagras i långtidsminnet. När du möter ett nytt ord kartlägger hjärnan dess ljud mot bokstäverna och betydelsen samtidigt. Ju fler kopplingar — till ordets ursprungsspråk, prefix, suffix — desto mer hållbart minnet.

Det förklarar varför flashcards inte fungerar långsiktigt: de skapar bara en ytlig länk, utan djup.`,
      },
      {
        title: 'Testning slår pluggning — varje gång',
        content: `Roediger och Karpicke (2006) visade att en grupp som pluggade en gång och testades tre gånger kom ihåg 50 % mer efter en vecka än en grupp som pluggade fyra gånger utan test. Stavningstävlingar är "återhämtningsträning" i maskerad form.

Ordspel fungerar på samma sätt. När du söker ett åttabokstavsord under tidspress tränar du aktivt återhämtning — du är bara för engagerad för att märka det.`,
      },
      {
        title: 'Vad det innebär för alla andra',
        content: `Tre faktorer gör ord minnesvärda: flerskiktad kodning (ljud + stavning + betydelse), återhämtningsträning (testa dig själv, inte bara läsa), och känslomässigt engagemang. Ordspel under tidspress ger alla tre.

Tips till lärare: prova ett ordspel istället för fredagsglosan. Forskningen säger att det fungerar bättre. Eleverna vet nog redan om det — de vet bara inte att vetenskapen håller med.`,
      },
    ],
    backToBlog: '← Tillbaka till bloggen',
    tryDaily: 'Prova den dagliga utmaningen',
    practice: 'Stavningsövning för elever',
  },
  ja: {
    title: 'スペリングビーはなぜ効果的か：エリート語彙力の背後にある記憶科学',
    subtitle: '14歳の少年が、ほとんどの大人が知らない単語を暗記して5万ドルを獲得しました。彼のトレーニングから、記憶の仕組みについて何が分かるでしょうか？',
    category: '教育',
    readTime: '7分で読める',
    authorName: 'Ohad Fisher',
    authorBio: 'ソフトウェアエンジニア、ワードゲームマニア、そして「chrysanthemum（キク）」を国民的テレビで間違いなくスペルミスしていたであろう人物。',
    sections: [
      {
        content: `ブルハット・ソマは14歳のとき、2024年スクリップス全国スペリングビーで優勝しました。彼の準備方法は機械的な暗記とは程遠く、認知科学者が何十年も推奨してきた手法に基づいていました。`,
      },
      {
        title: '正書法マッピング：単語が記憶に定着する仕組み',
        content: `認知心理学者リネア・エーリ博士は「正書法マッピング」というプロセスを特定しました。これは単語が長期記憶に永久に保存される仕組みです。新しい単語に出会うと、脳はその音と文字パターン、意味を同時に結びつけます。語源、接頭辞、接尾辞との繋がりが多いほど、記憶は強固になります。

フラッシュカードが長期的に機能しない理由がここにあります：表面的な一つの繋がりしか作らないからです。`,
      },
      {
        title: 'テストは勉強より効果的——常に',
        content: `Roediger と Karpicke（2006年）の研究：一度勉強して三回テストされたグループは、四回勉強してテストなしのグループより一週間後に50%多く覚えていました。スペリングビーは「検索練習エンジン」です。単語を記憶から引き出す行為そのものが、記憶を強化します。

ワードゲームも同じ原理で機能します。時間制限の下で単語を探す行為は、気づかないうちに継続的な検索練習になっています。`,
      },
      {
        title: '私たちへの応用',
        content: `語彙を持続的に記憶するには三つの要素が必要です：多層的なコーディング（音と綴りと意味を同時に）、検索練習（テストすること）、そして適度な感情的関与。時間制限のあるワードゲームはその三つ全てを提供します。

教育者へのヒント：金曜日の単語テストの代わりに、時間制限付きのワードゲームを試してみてください。研究はそれがより効果的だと示しています。`,
      },
    ],
    backToBlog: '← ブログに戻る',
    tryDaily: 'デイリーチャレンジを試す',
    practice: '生徒向けスペリング練習',
  },
  es: {
    title: 'Por Qué Funcionan los Concursos de Ortografía: La Ciencia del Vocabulario de Élite',
    subtitle: 'Un joven de 14 años ganó 50.000 dólares memorizando palabras que la mayoría de adultos no conocen. ¿Qué revela su entrenamiento sobre cómo funciona realmente la memoria?',
    category: 'Educación',
    readTime: '7 min de lectura',
    authorName: 'Ohad Fisher',
    authorBio: 'Ingeniero de software, fanático de los juegos de palabras, y alguien que sin duda habría deletreado "crisantemo" mal en la televisión nacional.',
    sections: [
      {
        content: `Bruhat Soma tenía 14 años cuando ganó el Scripps National Spelling Bee 2024, deletreando correctamente palabras que la mayoría de adultos nunca ha encontrado fuera de un crucigrama. Su método de preparación no era la memorización mecánica que la gente imagina — se basaba en los mismos principios que los científicos cognitivos han recomendado durante décadas.`,
      },
      {
        title: 'Mapeo ortográfico: por qué algunas palabras nunca se olvidan',
        content: `La Dra. Linnea Ehri identificó un proceso llamado "mapeo ortográfico": el mecanismo por el que una palabra queda permanentemente almacenada en la memoria a largo plazo. Cuando encuentras una palabra nueva, tu cerebro conecta sus sonidos con las letras y el significado simultáneamente. Cuanto más rica sea esa conexión —con la etimología, prefijos, sufijos, idioma de origen— más duradera será la memoria.

Por eso las tarjetas de vocabulario no funcionan a largo plazo: crean una conexión superficial sin profundidad.`,
      },
      {
        title: 'Examinarse supera al estudio — siempre',
        content: `Roediger y Karpicke (2006) demostraron que un grupo que estudió una vez y se examinó tres veces recordaba un 50% más después de una semana que uno que estudió cuatro veces sin examen. Los concursos de ortografía son un motor de "práctica de recuperación": el acto de intentar recuperar una palabra de la memoria consolida ese recuerdo.

Los juegos de palabras funcionan exactamente igual. Cuando buscas una palabra de ocho letras contra el reloj, estás haciendo práctica de recuperación continua — solo que estás demasiado enganchado para notarlo.`,
      },
      {
        title: 'Qué significa para el resto de nosotros',
        content: `Para que el vocabulario se quede, necesitas tres cosas: codificación múltiple (conectar sonido, grafía y significado a la vez), práctica de recuperación (examinarse, no solo repasar), y suficiente implicación emocional para que el cerebro lo considere valioso.

Los juegos de palabras bajo presión de tiempo proporcionan las tres. Sugerencia para docentes: prueba un juego de palabras cronometrado en lugar del clásico examen de vocabulario del viernes. La evidencia dice que funciona mejor. Los alumnos probablemente ya lo saben — solo que no saben que la ciencia les da la razón.`,
      },
    ],
    backToBlog: '← Volver al Blog',
    tryDaily: 'Prueba el Desafío Diario',
    practice: 'Práctica de Ortografía para Estudiantes',
  },
};
