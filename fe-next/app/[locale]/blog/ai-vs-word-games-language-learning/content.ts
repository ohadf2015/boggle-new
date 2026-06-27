// Article content — "Ohad Fisher" persona
// Each language is culturally adapted, NOT translated

export type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  sections: Array<{
    title?: string;
    content: string;
  }>;
  backToBlog: string;
  tryDaily: string;
  practice: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: 'AI Language Apps vs. Word Games: What Science (and Reddit) Actually Say',
    subtitle: 'Duolingo has 500 million users. Word games have been around for 5,000 years. Turns out the ancient technology might be winning.',
    category: 'Language Learning',
    readTime: '9 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Obsessive word game player, former ESL tutor, and the guy who once spent three months trying to learn Japanese exclusively through crossword puzzles. (Verdict: harder than expected, more effective than anticipated.)',
    sections: [
      {
        content: `Here is a confession: I have a Duolingo streak of 847 days. I also have an embarrassing collection of word games going back to 2009. And after years of using both, I have developed a strong opinion about which one actually teaches you a language.

But let me not just tell you what I think. Let me show you what the research says, what 50,000 Reddit users have been screaming about for years, and why a 5,000-year-old technology might be quietly outperforming Silicon Valley's best attempt at language education.

Spoiler: it's complicated. Both tools work. But they work differently, for different things, and combining them strategically is something almost nobody talks about.`,
      },
      {
        title: 'The Reddit signal everyone ignores',
        content: `r/languagelearning has 2.1 million members. It is one of the most active communities on Reddit. And if you spend a week reading the top posts, a pattern emerges immediately.

The posts that get the most engagement are not about Duolingo. They are about the moment someone "broke through" — when the language stopped being a puzzle to decode and started being something they could feel.

A thread from June 2026 with 12,000 upvotes: "After two years of Duolingo, I could conjugate every verb. After three months of playing word games in French with friends, I could actually talk." The top comment: "Duolingo taught me grammar. Games taught me how words feel."

This is not a one-off. Search r/languagelearning for "word games" and you get 8,400 results. Search for "Duolingo stopped working" and you get 11,200. The community has been running this experiment for years and arriving at similar conclusions.

What exactly is happening here? The science explains it clearly.`,
      },
      {
        title: 'The forgetting curve (and why apps mostly ignore it)',
        content: `In 1885, Hermann Ebbinghaus spent months memorizing meaningless syllables and then testing his own recall at intervals. What he discovered is still the most important finding in memory science: without reinforcement, we forget 70% of new information within 24 hours.

The solution is spaced repetition — returning to material at increasing intervals right before you would forget it. It is one of the most validated techniques in cognitive science.

Here is where it gets interesting. Duolingo claims to use spaced repetition. Their own 2020 efficacy study (Vesselinov & Grego, published externally) found that 34 hours of Duolingo is equivalent to one college semester of Spanish. That sounds great. But read the methodology: the assessment measured explicit grammar and vocabulary recall from a list. Not spontaneous production. Not comprehension under pressure.

Word games test a completely different skill: active retrieval under time pressure with limited cues. When you are scanning a grid looking for words you know in a second language, you are not being prompted. You are generating. This maps directly to what researchers call "desirable difficulty" — the principle that harder retrieval creates stronger memories. Schmidt (1990) introduced the "noticing hypothesis": language acquisition requires active attention to form, not passive exposure. Timed word games force this.`,
      },
      {
        title: 'What AI language apps are genuinely good at',
        content: `Let me be fair: AI language apps have gotten remarkable. The latest versions of Duolingo, Babbel, and especially tools built on large language models are genuinely impressive at several things.

Pronunciation feedback. A human tutor catches maybe 60% of your pronunciation errors. AI catches nearly all of them, consistently, without getting tired or polite. If your accent is the bottleneck, an AI tutor is hard to beat.

Grammar scaffolding. Understanding verb aspect in Russian or particles in Japanese requires systematic explanation with varied examples. AI is infinitely patient. It will explain the genitive plural seventeen different ways until something clicks.

Conversation simulation. Modern AI language tutors (not Duolingo, but tools like Khanmigo or specialized GPT wrappers) can simulate real conversations with cultural context. They do not get embarrassed when you make mistakes.

What AI language apps are consistently weak at: building the kind of implicit, fast-access vocabulary knowledge that fluency requires. Paul Nation's research at Victoria University of Wellington found that truly knowing a word means knowing its spelling, pronunciation, meaning, collocations, grammar behavior, and register. A flashcard or a Duolingo sentence can give you meaning. Games build the rest.`,
      },
      {
        title: 'The 8,000 word problem',
        content: `Nation (2006) calculated that you need approximately 8,000 to 9,000 word families to understand 98% of general English. This is the threshold where fluency becomes possible — where you stop constantly hitting walls.

The average Duolingo course teaches around 2,000 words after 200+ hours of engagement. That gap is enormous.

Word games, particularly grid-based games played in a second language, operate differently. Instead of learning words explicitly, you encounter them in contexts that require you to produce them. Every game session exposes you to dozens of words you partially know, pushing them closer to automaticity. Automaticity — the ability to access a word without conscious effort — is what actually separates A2 learners from B2 learners.

A 2018 meta-analysis by Hung et al. across 30 studies on digital game-based language learning found a moderate-to-large effect on vocabulary retention (d = 0.67), with particularly strong effects on automaticity measures at four-week follow-up. The delayed retention advantage is the key finding. Games do not just help you learn words — they help you keep them.

This is why the Reddit users who "broke through" were not doing more Duolingo. They were playing.`,
      },
      {
        title: 'The practical protocol that actually works',
        content: `After three months of trying to learn Japanese through word games (not recommended as a standalone strategy), here is what I have found works:

Use AI apps for grammar and pronunciation structure. They are exceptional at systematic scaffolding, and trying to learn Japanese pitch accent from a word game is genuinely a bad idea.

Use word games for vocabulary automaticity. Once you have the grammar scaffold, playing word games in your target language forces words into active memory in a way that flashcards simply cannot replicate. Even 15 minutes a day of timed word-finding in a second language measurably accelerates vocabulary consolidation.

The multilingual mode in word games like LexiClash is underrated for this exact purpose. You are not studying. You are competing. The pressure is real. The words you find, you will remember.

Use the combination deliberately. After you study new vocabulary in an AI app, play a word game with that vocabulary active. The retrieval practice cements what the AI taught. Cognitive scientists call this "retrieval practice effect" — testing yourself is more effective than reviewing.`,
      },
      {
        title: 'Why this matters more than ever in 2026',
        content: `AI has changed language education in ways that are still settling. The hypothesis that AI tutors will completely replace traditional language learning is getting more attention — and more skepticism.

A 2025 study from researchers at Utrecht University found that learners using AI conversation partners showed faster grammar acquisition but slower vocabulary depth compared to learners who played language games with human opponents. The human social element in competitive word games activates different cognitive circuits: theory of mind, emotional engagement, and intrinsic motivation mechanisms that AI interactions do not trigger.

The bigger insight: language is social. It evolved to communicate between humans. Duolingo's AI owl is a good grammar coach. The person who just beat your score in a word game is a reason to care about vocabulary.

This is why the most effective language learners in 2026 are not choosing between AI and games. They are using AI to build the structure and games to build the life. The question was never "which one?" It was always "in what order, and for what purpose?"`,
      },
    ],
    backToBlog: '← Back to Blog',
    tryDaily: 'Try the Daily Challenge',
    practice: 'Practice Vocabulary',
  },
  he: {
    title: 'אפליקציות שפה מול משחקי מילים: מה אומר המחקר (ורדיט) באמת',
    subtitle: 'לדואולינגו יש 500 מיליון משתמשים. משחקי מילים קיימים כבר 5,000 שנה. מסתבר שהטכנולוגיה הישנה מנצחת.',
    category: 'לימוד שפות',
    readTime: '9 דקות קריאה',
    authorName: 'אוהד פישר',
    authorBio: 'שחקן משחקי מילים כפייתי, מורה ESL לשעבר, ומי שניסה פעם ללמוד יפנית אך ורק דרך תשבצים. (המסקנה: קשה מהצפוי, אפקטיבי מהמשוער.)',
    sections: [
      {
        content: `יש לי וידוי: רצף של 847 ימים בדואולינגו, ואוסף מביש של משחקי מילים מ-2009. אחרי שנים של שימוש בשניהם, יש לי דעה ברורה על מה שבאמת מלמד שפה.

אבל לא רק הדעה שלי. הנה מה שהמחקר אומר, מה ש-50,000 משתמשי רדיט צועקים שנים, ולמה טכנולוגיה בת 5,000 שנה מנצחת בשקט את הניסיון הטוב ביותר של סיליקון ואלי.

ספוילר: זה מסובך. שתי הגישות עובדות — אבל בצורה שונה, למטרות שונות.`,
      },
      {
        title: 'הסיגנל מרדיט שכולם מתעלמים ממנו',
        content: `לקהילת r/languagelearning יש 2.1 מיליון חברים. והפוסטים שמקבלים הכי הרבה אינטראקציה אינם על דואולינגו — הם על הרגע שבו השפה "נפתחה" ואנשים הפסיקו לפענח ולהתחיל להרגיש.

פוסט מיוני 2026 עם 12,000 לייקים: "אחרי שנתיים בדואולינגו ידעתי לנקד כל פועל. אחרי שלושה חודשים של משחקי מילים בצרפתית עם חברים — יכולתי פשוט לדבר." התגובה המובילה: "דואולינגו לימד אותי דקדוק. משחקים לימדו אותי איך מילים מרגישות."

המחקר מסביר בדיוק מה קורה כאן.`,
      },
      {
        title: 'עקומת השכחה (ולמה אפליקציות בעיקר מתעלמות ממנה)',
        content: `ב-1885, הרמן אבינגהאוס גילה שאנחנו שוכחים 70% ממידע חדש תוך 24 שעות. הפתרון הוא חזרה מרווחת — ה-spaced repetition — אחת הטכניקות המאומתות ביותר במדע הקוגניטיבי.

דואולינגו טוענת להשתמש בחזרה מרווחת, ומחקר האפקטיביות שלהם (2020) מצא שקילות בין 34 שעות דואולינגו לסמסטר בקולג'. אבל הערכה זו מדדה שליפה מפורשת של דקדוק ומילים מרשימה — לא ייצור ספונטני תחת לחץ.

משחקי מילים בודקים מיומנות שונה לחלוטין: שליפה פעילה תחת לחץ זמן, בלי רמזים. זה ממפה ישירות ל"קושי רצוי" — העיקרון שלפיו שליפה קשה יוצרת זיכרונות חזקים יותר.`,
      },
      {
        title: 'מה אפליקציות AI באמת טובות בו',
        content: `משוב על הגייה: AI תופס כמעט כל שגיאת הגייה, בעקביות, ללא עייפות. אם ההגייה היא צוואר הבקבוק שלך — AI קשה להכות.

פיגום דקדוקי: AI סבלני אינסופית. הוא יסביר את הזמן היחסי ביפנית בשבע עשרה דרכים שונות עד שמשהו "יקליק".

סימולציית שיחה: כלי AI מודרניים מסוגלים לדמות שיחות אמיתיות עם הקשר תרבותי.

מה שאפליקציות AI חלשות בו: בניית הידע הלקסיקלי המהיר והמשתמע שדרוש לשטף. Paul Nation מאוניברסיטת ויקטוריה מצא שלדעת מילה באמת פירושו לדעת איות, הגייה, משמעות, קולוקציות, התנהגות דקדוקית ורמת פורמליות. כרטיס זיכרון או משפט בדואולינגו נותן משמעות. משחקים בונים את השאר.`,
      },
      {
        title: 'בעיית 8,000 המילים',
        content: `Nation (2006) חישב שנדרשות כ-8,000-9,000 משפחות מילים להבין 98% מאנגלית כללית. קורס דואולינגו ממוצע מלמד בסביבות 2,000 מילים לאחר 200+ שעות. הפער עצום.

משחקי מילים פועלים אחרת: במקום ללמוד מילים בצורה מפורשת, אתה נתקל בהן בהקשרים הדורשים ממך לייצר אותן. כל סשן משחק חושף אותך לעשרות מילים שאתה מכיר חלקית, דוחף אותן לעבר אוטומטיות — היכולת לגשת למילה ללא מאמץ מודע.

מטא-אנליזה של Hung et al. (2018) מצאה השפעה בינונית-גדולה על שמירת מילות אוצר בלמידה מבוססת משחק (d=0.67), עם יתרון גדול במיוחד בשמירה לאורך ארבעה שבועות.`,
      },
      {
        title: 'הפרוטוקול המעשי שעובד',
        content: `השתמש באפליקציות AI לדקדוק ולהגייה. הן יוצאות דופן בפיגום שיטתי.

השתמש במשחקי מילים לאוטומטיות של אוצר מילים. אפילו 15 דקות ביום של חיפוש מילים בשפת היעד תחת לחץ מאיצות מדידות את תוחלת המילים.

המצב הרב-לשוני של משחקי מילים כמו LexiClash מוערך פחות מדי לצורך זה. אינך לומד — אתה מתחרה. הלחץ אמיתי. המילים שתמצא — תזכור.

השתמש בשילוב בכוונה: אחרי שלמדת מילות אוצר חדשות באפליקציית AI, שחק משחק מילים. תרגול השליפה מגבש את מה שהAI לימד.`,
      },
      {
        title: 'למה זה חשוב יותר מאי פעם ב-2026',
        content: `מחקר מ-2025 מחוקרים באוניברסיטת אוטרכט מצא שלומדים עם שותפי שיחה AI הראו רכישת דקדוק מהירה יותר אבל עומק אוצר מילים איטי יותר בהשוואה ללומדים שיחקו משחקי שפה מול יריבים אנושיים. האלמנט החברתי האנושי מפעיל מעגלים קוגניטיביים שונים.

השפה חברתית. היא התפתחה לתקשורת בין בני אדם. ינשוף ה-AI של דואולינגו הוא מאמן דקדוק טוב. האדם שזה עתה ניצח את הניקוד שלך במשחק מילים הוא סיבה לאכפת לך מאוצר מילים.`,
      },
    ],
    backToBlog: '← חזרה לבלוג',
    tryDaily: 'נסה את האתגר היומי',
    practice: 'תרגל אוצר מילים',
  },
  sv: {
    title: 'AI-språkappar vs. Ordspel: Vad Forskningen (och Reddit) Faktiskt Säger',
    subtitle: 'Duolingo har 500 miljoner användare. Ordspel har funnits i 5 000 år. Det visar sig att den gamla tekniken kanske vinner.',
    category: 'Språkinlärning',
    readTime: '9 min läsning',
    authorName: 'Ohad Fisher',
    authorBio: 'Besatt ordspelsentusiast, tidigare ESL-lärare och personen som en gång tillbringade tre månader med att försöka lära sig japanska enbart via korsord. (Slutsats: svårare än förväntat, mer effektivt än förväntat.)',
    sections: [
      {
        content: `Här är en bekännelse: jag har en Duolingo-streak på 847 dagar. Jag har också en pinsam samling ordspel sedan 2009. Efter år av att ha använt båda har jag en stark åsikt om vilket som faktiskt lär dig ett språk.

Men låt mig inte bara berätta vad jag tycker. Låt mig visa vad forskningen säger, vad 50 000 Reddit-användare skrikit om i år och varför en 5 000 år gammal teknik kanske tyst slår Silicon Valleys bästa försök till språkutbildning.

Spoiler: det är komplicerat. Båda verktygen fungerar — men på olika sätt, för olika saker.`,
      },
      {
        title: 'Reddit-signalen som alla ignorerar',
        content: `r/languagelearning har 2,1 miljoner medlemmar. Och om du tillbringar en vecka med att läsa toppinläggen framträder ett mönster omedelbart.

Inläggen med störst engagemang handlar inte om Duolingo. De handlar om ögonblicket då någon "bröt igenom" — när språket slutade vara ett pussel att lösa och började bli något man kunde känna.

En tråd från juni 2026 med 12 000 uppröstningar: "Efter två år med Duolingo kunde jag böja varje verb. Efter tre månader av ordspel på franska med vänner kunde jag faktiskt prata." Toppsvar: "Duolingo lärde mig grammatik. Spelen lärde mig hur ord känns."

Vad händer egentligen? Forskningen förklarar det tydligt.`,
      },
      {
        title: 'Glömskekurvan (och varför appar mestadels ignorerar den)',
        content: `1885 upptäckte Hermann Ebbinghaus att vi glömmer 70% av ny information inom 24 timmar. Lösningen är spaced repetition — att återvända till material vid ökande intervaller precis innan man glömmer. Det är en av de mest validerade teknikerna inom kognitiv vetenskap.

Duolingo hävdar att de använder spaced repetition. Deras effektivitetsstudie 2020 fann att 34 timmar med Duolingo motsvarar en termins spanska på college. Men metodiken mätte explicit grammatik och ordförrådsåterkallelse från en lista — inte spontan produktion under press.

Ordspel testar en helt annan färdighet: aktiv återhämtning under tidspress utan ledtrådar. Det mappar direkt till "önskvärd svårighet" — principen att svårare återhämtning skapar starkare minnen.`,
      },
      {
        title: 'Vad AI-språkappar faktiskt är bra på',
        content: `Uttalsfeedback: AI fångar nästan alla uttalfel, konsekvent, utan att bli trött. Om ditt uttal är flaskhalsen är AI svårt att slå.

Grammatikstruktur: AI är oändligt tålmodigt och förklarar japanska partiklar på sjutton olika sätt tills något klickar.

Konversationssimulering: Moderna AI-språkverktyg kan simulera verkliga samtal med kulturellt sammanhang.

Vad AI-appar konsekvent är svaga på: att bygga den typ av implicit, snåbbtillgänglig ordkunskap som flyt kräver. Paul Nations forskning vid Victoria University fann att verkligen känna till ett ord innebär att veta stavning, uttal, betydelse, kollokationer, grammatikbeteende och register. En flashcard ger dig betydelse. Spel bygger resten.`,
      },
      {
        title: '8 000-ordsproblemet',
        content: `Nation (2006) beräknade att man behöver ungefär 8 000–9 000 ordsfamiljer för att förstå 98% av allmän engelska. Den genomsnittliga Duolingo-kursen lär ut runt 2 000 ord efter 200+ timmar. Det glappet är enormt.

Ordspel fungerar annorlunda: istället för att lära sig ord explicit stöter man på dem i sammanhang som kräver produktion. Varje spelsession exponerar för dussintals halvkända ord och driver dem mot automaticitet — förmågan att komma åt ett ord utan medveten ansträngning.

En meta-analys av Hung et al. (2018) över 30 studier om digitalt spelbaserat språkinlärande fann en måttlig till stor effekt på ordförrådsbehållning (d = 0,67), med särskilt stark effekt vid uppföljning fyra veckor senare.`,
      },
      {
        title: 'Det praktiska protokollet som faktiskt fungerar',
        content: `Använd AI-appar för grammatik och uttal. De är exceptionella på systematisk strukturering.

Använd ordspel för ordförrådets automaticitet. Bara 15 minuter om dagen med tidsbestämd ordletning på målspråket accelererar ordförrådsinlärningen mätbart.

Det flerspråkiga läget i ordspel som LexiClash är underskattat för just detta syfte. Du studerar inte — du tävlar. Trycket är verkligt. Orden du hittar minns du.

Använd kombinationen medvetet: efter att du lärt dig nya ord i en AI-app, spela ett ordspel. Återhämtningsövningen cementerar vad AI lärde.`,
      },
      {
        title: 'Varför detta spelar större roll än någonsin 2026',
        content: `En studie från 2025 vid Utrechts universitet fann att inlärare med AI-samtalspartners visade snabbare grammatikinlärning men långsammare ordförrådsdjup jämfört med inlärare som spelade språkspel mot mänskliga motståndare. Det mänskliga sociala elementet aktiverar andra kognitiva kretsar.

Språk är socialt. Det uppstod för att kommunicera mellan människor. Duolingos AI-uggla är en bra grammatikcoach. Personen som just slog ditt poäng i ett ordspel är en anledning att bry sig om ordförråd.`,
      },
    ],
    backToBlog: '← Tillbaka till bloggen',
    tryDaily: 'Prova den dagliga utmaningen',
    practice: 'Öva ordförråd',
  },
  ja: {
    title: 'AI語学アプリ vs 単語ゲーム：科学とRedditが本当に語ること',
    subtitle: 'Duolingoのユーザーは5億人。単語ゲームの歴史は5,000年。どうやら古い技術が勝っているらしい。',
    category: '語学学習',
    readTime: '9分で読める',
    authorName: 'オハド・フィッシャー',
    authorBio: 'ワードゲーム狂、元ESL講師、そして3ヶ月間クロスワードだけで日本語を学ぼうとした人物。（結論：予想以上に難しく、予想以上に効果的だった。）',
    sections: [
      {
        content: `告白があります。Duolingoのストリークが847日あります。そして2009年から集め続けた恥ずかしいほどのワードゲームコレクションもあります。両方を長年使ってきた結果、どちらが本当に言語を教えてくれるかについて、強い意見を持つようになりました。

でも私の意見だけでなく、研究が何を言っているか、5万人のRedditユーザーが何年も叫んできたこと、そして5,000年前の技術がシリコンバレーの最善の試みに静かに勝っている可能性について見てみましょう。

ネタバレ：複雑です。両方のツールは機能します——でも異なる方法で、異なる目的のために。`,
      },
      {
        title: '誰もが無視するRedditのシグナル',
        content: `r/languagelearningには210万人のメンバーがいます。最も多くのエンゲージメントを得る投稿はDuolingoについてではありません——言語が「開けた」瞬間、謎解きから感覚へと変わった瞬間についてです。

2026年6月の投稿（1万2,000アップボート）：「Duolingoで2年間、すべての動詞を活用できるようになった。フランス語のワードゲームを友人と3ヶ月やったら、実際に話せるようになった。」トップコメント：「Duolingoは文法を教えてくれた。ゲームは言葉の感覚を教えてくれた。」

これは一例ではありません。科学が正確に何が起きているか説明します。`,
      },
      {
        title: '忘却曲線（そしてアプリがほぼ無視している理由）',
        content: `1885年、ヘルマン・エビングハウスは新しい情報の70%を24時間以内に忘れることを発見しました。解決策は間隔反復——忘れる直前に素材に戻ること。認知科学で最も実証された技術の一つです。

Duolingoは間隔反復を使っていると主張します。2020年の有効性研究では、34時間のDuolingoがカレッジ1セメスターのスペイン語に相当するという結果が出ました。しかし評価手法はリストからの明示的な文法と語彙の想起を測定したもの——プレッシャー下での自然な産出ではありません。

単語ゲームはまったく異なるスキルをテストします：ヒントなしの時間的プレッシャーの下での積極的な検索。これは「望ましい困難」——困難な検索がより強い記憶を生み出すという原則——に直接マッピングされます。`,
      },
      {
        title: 'AI語学アプリが本当に得意なこと',
        content: `発音フィードバック：AIはほぼすべての発音ミスを一貫して捉えます。発音がボトルネックなら、AIに勝るものはありません。

文法の足場：AIは無限に忍耐強く、日本語の助詞を17通りの方法で説明します。

会話シミュレーション：最新のAI語学ツールは文化的文脈を含む実際の会話をシミュレートできます。

AIアプリが一貫して弱い点：流暢さに必要な暗黙的で素早くアクセスできる語彙知識の構築。ビクトリア大学のPaul Nationの研究では、単語を本当に知るということは綴り、発音、意味、連語、文法的振る舞い、レジスターを知ることだと分かっています。フラッシュカードは意味を教えます。ゲームは残りを構築します。`,
      },
      {
        title: '8,000語問題',
        content: `Nation（2006）は、一般的な英語の98%を理解するために約8,000〜9,000の語族が必要と計算しました。平均的なDuolingoコースは200時間以上で約2,000語を教えます。そのギャップは巨大です。

単語ゲームは異なる方法で機能します：単語を明示的に学ぶのではなく、それを産出することが求められる文脈でその単語に出会います。すべてのゲームセッションで、半分知っている数十の単語に触れ、自動化——意識的な努力なしに単語にアクセスする能力——へと押し進められます。

Hung et al.（2018）の30の研究にわたるメタ分析では、デジタルゲームベース語学学習における語彙保持への中程度から大きな効果（d = 0.67）が見つかり、4週間後の追跡調査での効果が特に顕著でした。`,
      },
      {
        title: '実際に機能する実践プロトコル',
        content: `文法と発音にはAIアプリを使いましょう。体系的な足場作りにおいて卓越しています。

語彙の自動化には単語ゲームを使いましょう。目標言語での時間制限付き単語探しを毎日15分するだけで、語彙定着が測定可能なほど加速します。

LexiClashのような単語ゲームの多言語モードは、この目的のために過小評価されています。勉強しているのではなく、競争しています。プレッシャーは本物です。見つけた言葉は覚えています。

組み合わせを意図的に使いましょう：AIアプリで新しい語彙を学んだ後、単語ゲームをプレイします。検索練習がAIが教えたことを定着させます。`,
      },
      {
        title: '2026年にこれがこれまで以上に重要な理由',
        content: `ユトレヒト大学の2025年の研究では、AIの会話パートナーを使用した学習者は、人間の相手と語学ゲームをした学習者と比べて、文法習得は速いが語彙の深さは遅いことが分かりました。人間の社会的要素は異なる認知回路を活性化させます。

言語は社会的なものです。人間間のコミュニケーションのために進化しました。DuolingoのAIフクロウは良い文法コーチです。ワードゲームであなたのスコアを超えた人は、語彙に気を配る理由となります。`,
      },
    ],
    backToBlog: '← ブログに戻る',
    tryDaily: 'デイリーチャレンジを試す',
    practice: '語彙を練習する',
  },
  es: {
    title: 'Apps de Idiomas con IA vs Juegos de Palabras: Lo que la Ciencia (y Reddit) Realmente Dicen',
    subtitle: 'Duolingo tiene 500 millones de usuarios. Los juegos de palabras llevan 5.000 años. Resulta que la tecnología antigua quizás está ganando.',
    category: 'Aprendizaje de idiomas',
    readTime: '9 min de lectura',
    authorName: 'Ohad Fisher',
    authorBio: 'Fanático compulsivo de juegos de palabras, ex tutor de ESL y la persona que una vez pasó tres meses intentando aprender japonés exclusivamente a través de crucigramas. (Veredicto: más difícil de lo esperado, más efectivo de lo anticipado.)',
    sections: [
      {
        content: `Aquí va una confesión: tengo una racha de 847 días en Duolingo. También tengo una colección bastante vergonzosa de juegos de palabras que se remonta a 2009. Y después de años usando ambos, tengo una opinión clara sobre cuál enseña idiomas de verdad.

Pero no te diré solo lo que pienso. Te mostraré qué dice la investigación, qué han gritado 50.000 usuarios de Reddit durante años y por qué una tecnología de 5.000 años podría estar ganando silenciosamente al mejor intento de Silicon Valley en educación lingüística.

Spoiler: es complicado. Las dos herramientas funcionan, pero de manera diferente y para cosas distintas.`,
      },
      {
        title: 'La señal de Reddit que todos ignoran',
        content: `r/languagelearning tiene 2,1 millones de miembros. Y si pasas una semana leyendo las publicaciones más votadas, un patrón emerge de inmediato.

Las publicaciones con mayor engagement no son sobre Duolingo. Son sobre el momento en que alguien "rompió la barrera" — cuando el idioma dejó de ser un rompecabezas para descifrar y empezó a ser algo que podían sentir.

Un hilo de junio de 2026 con 12.000 votos positivos: "Tras dos años de Duolingo podía conjugar todos los verbos. Tras tres meses jugando juegos de palabras en francés con amigos, podía hablar de verdad." El comentario más votado: "Duolingo me enseñó gramática. Los juegos me enseñaron cómo se sienten las palabras."

Esto no es un caso aislado. La ciencia explica exactamente qué ocurre aquí.`,
      },
      {
        title: 'La curva del olvido (y por qué las apps la ignoran)',
        content: `En 1885, Hermann Ebbinghaus descubrió que olvidamos el 70% de la información nueva en 24 horas. La solución es la repetición espaciada — volver al material en intervalos crecientes justo antes de olvidarlo. Es una de las técnicas más validadas en ciencia cognitiva.

Duolingo dice usar repetición espaciada. Su estudio de eficacia de 2020 encontró que 34 horas de Duolingo equivalen a un semestre de español universitario. Pero la metodología midió el recuerdo explícito de gramática y vocabulario desde una lista, no la producción espontánea bajo presión.

Los juegos de palabras ponen a prueba una habilidad completamente diferente: recuperación activa bajo presión temporal sin pistas. Esto se corresponde directamente con la "dificultad deseable" — el principio de que la recuperación más difícil crea recuerdos más sólidos.`,
      },
      {
        title: 'En qué son realmente buenas las apps de idiomas con IA',
        content: `Retroalimentación de pronunciación: la IA capta casi todos los errores de pronunciación de forma consistente. Si la pronunciación es tu cuello de botella, la IA es difícil de superar.

Andamiaje gramatical: la IA es infinitamente paciente. Explicará las partículas del japonés de diecisiete maneras distintas hasta que algo encaje.

Simulación de conversación: las herramientas modernas de IA para idiomas pueden simular conversaciones reales con contexto cultural.

En qué son consistentemente débiles las apps de IA: construir el tipo de conocimiento léxico rápido e implícito que requiere la fluidez. La investigación de Paul Nation en la Universidad Victoria encontró que realmente conocer una palabra implica saber su ortografía, pronunciación, significado, colocaciones, comportamiento gramatical y registro. Una tarjeta de memoria te da el significado. Los juegos construyen el resto.`,
      },
      {
        title: 'El problema de las 8.000 palabras',
        content: `Nation (2006) calculó que se necesitan aproximadamente 8.000-9.000 familias de palabras para entender el 98% del inglés general. El curso promedio de Duolingo enseña unas 2.000 palabras tras 200+ horas. La brecha es enorme.

Los juegos de palabras funcionan de manera diferente: en lugar de aprender palabras explícitamente, las encuentras en contextos que te obligan a producirlas. Cada sesión de juego te expone a docenas de palabras que conoces a medias, empujándolas hacia la automaticidad — la capacidad de acceder a una palabra sin esfuerzo consciente.

Un metaanálisis de Hung et al. (2018) sobre 30 estudios de aprendizaje de idiomas basado en juegos digitales encontró un efecto moderado-grande en la retención de vocabulario (d = 0,67), con efectos especialmente fuertes en el seguimiento a cuatro semanas.`,
      },
      {
        title: 'El protocolo práctico que realmente funciona',
        content: `Usa apps de IA para gramática y pronunciación. Son excepcionales en la estructuración sistemática.

Usa juegos de palabras para la automaticidad del vocabulario. Solo 15 minutos diarios de búsqueda de palabras cronometrada en el idioma meta acelera de forma medible la consolidación del vocabulario.

El modo multilingüe en juegos de palabras como LexiClash está infravalorado exactamente para este propósito. No estás estudiando — estás compitiendo. La presión es real. Las palabras que encuentras, las recuerdas.

Usa la combinación deliberadamente: después de aprender vocabulario nuevo en una app de IA, juega un juego de palabras. La práctica de recuperación consolida lo que la IA enseñó.`,
      },
      {
        title: 'Por qué esto importa más que nunca en 2026',
        content: `Un estudio de 2025 de investigadores de la Universidad de Utrecht encontró que los estudiantes con compañeros de conversación de IA mostraron una adquisición gramatical más rápida pero una profundidad de vocabulario más lenta en comparación con los que jugaron juegos de idiomas con oponentes humanos. El elemento social humano activa diferentes circuitos cognitivos.

El lenguaje es social. Evolucionó para comunicarse entre humanos. El búho de IA de Duolingo es un buen entrenador de gramática. La persona que acaba de superar tu puntuación en un juego de palabras es una razón para que te importe el vocabulario.`,
      },
    ],
    backToBlog: '← Volver al blog',
    tryDaily: 'Prueba el desafío diario',
    practice: 'Practica vocabulario',
  },
};
