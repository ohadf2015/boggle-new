export interface GameModeContent {
    title: string;
    description: string;
    steps: Array<{ title: string; description: string }>;
}

export interface ScoringRow {
    length: string;
    points: string;
    example: string;
}

export interface FAQItem {
    question: string;
    answer: string;
}

export interface HowToPlayContent {
    pageTitle: string;
    pageDescription: string;
    introText: string;
    gameModes: {
        classic: GameModeContent;
        blast: GameModeContent;
        wordHunt: GameModeContent;
    };
    scoring: {
        title: string;
        headers: [string, string, string];
        rows: ScoringRow[];
        comboNote: string;
    };
    faq: {
        title: string;
        items: FAQItem[];
    };
    cta: {
        title: string;
        subtitle: string;
        classic: string;
        blast: string;
        daily: string;
        multiplayer: string;
    };
}

const content: Record<string, HowToPlayContent> = {
    en: {
        pageTitle: 'How to Play LexiClash - Complete Guide to All Game Modes',
        pageDescription: 'Learn how to play LexiClash with step-by-step instructions for Classic, Blast, and Word Hunt modes. Scoring guide, tips, and FAQ included.',
        introText: 'LexiClash is a real-time multiplayer word game where players compete to find words on a shared letter grid. Whether you are playing solo against AI bots, competing with friends in multiplayer, or tackling the daily challenge, this guide covers everything you need to know to start winning.',
        gameModes: {
            classic: {
                title: 'Classic Mode',
                description: 'The original LexiClash experience. Race against other players to find as many words as possible on a shared letter grid.',
                steps: [
                    { title: 'Create or Join a Room', description: 'Start a new game room or join an existing one using a room code or QR code. You can also play solo against AI bots.' },
                    { title: 'Find Words on the Grid', description: 'Swipe or click adjacent letters (horizontal, vertical, or diagonal) to form words. The minimum word length is 3 letters.' },
                    { title: 'Build Combos for Bonus Points', description: 'Find words in quick succession to build combo multipliers. Each consecutive word found within a few seconds increases your combo level.' },
                    { title: 'Beat the Clock', description: 'You have 3 minutes to find as many words as possible. In multiplayer, words found by all players score zero - find unique words!' },
                    { title: 'Check the Leaderboard', description: 'When time runs out, see your final score, longest word, best combo, and how you rank against other players.' },
                ],
            },
            blast: {
                title: 'Blast Mode',
                description: 'An explosive twist on word finding. Clear tiles from the grid by forming words, triggering chain reactions and cascading combos.',
                steps: [
                    { title: 'Select Blast Mode', description: 'Choose Blast mode from the game mode selector. The grid features special blast tiles alongside regular letters.' },
                    { title: 'Form Words to Clear Tiles', description: 'When you submit a word, those letter tiles are destroyed and removed from the grid. New letters cascade down from above to fill the gaps.' },
                    { title: 'Trigger Chain Reactions', description: 'As new tiles fall into place, they may create new word opportunities. Chain multiple clears together for massive bonus points.' },
                    { title: 'Use Blast Tiles', description: 'Special blast tiles clear entire rows or columns when included in a word. Position your words strategically to maximize destruction.' },
                    { title: 'Maximize Your Score', description: 'The game ends when time runs out. Long chain reactions, blast tile combos, and quick word-finding all contribute to your final score.' },
                ],
            },
            wordHunt: {
                title: 'Word Hunt Survival',
                description: 'A daily puzzle challenge similar to Wordle. Everyone plays the same board each day. Find the hidden target word within 10 attempts.',
                steps: [
                    { title: 'Open the Daily Challenge', description: 'Navigate to the Daily Challenge section and select Word Hunt Survival. A new puzzle appears every day at midnight UTC.' },
                    { title: 'Study the Grid', description: 'Examine the letter grid carefully. The hidden target word is formed by connecting adjacent letters on this grid.' },
                    { title: 'Make Your Guesses', description: 'Swipe to form words you think might be the target. You have 10 attempts. Each guess reveals feedback about your answer.' },
                    { title: 'Read the Feedback', description: 'After each guess, colored highlights show which letters are correct and correctly placed. Use this information to narrow down the target.' },
                    { title: 'Share Your Results', description: 'Win or lose, share your emoji-based results with friends. Compare how many attempts it took without spoiling the answer.' },
                ],
            },
        },
        scoring: {
            title: 'Scoring Guide',
            headers: ['Word Length', 'Base Points', 'Example'],
            rows: [
                { length: '3 letters', points: '1 point', example: 'CAT, DOG, RUN' },
                { length: '4 letters', points: '3 points', example: 'GAME, WORD, PLAY' },
                { length: '5 letters', points: '5 points', example: 'CLASH, BRAIN, QUEST' },
                { length: '6 letters', points: '8 points', example: 'BATTLE, PUZZLE, MASTER' },
                { length: '7 letters', points: '12 points', example: 'AMAZING, COMPETE, VICTORY' },
                { length: '8+ letters', points: '18+ points', example: 'CHAMPION, ULTIMATE' },
            ],
            comboNote: 'Combo multipliers stack on top of base points. A x3 combo on a 5-letter word earns 15 points instead of 5!',
        },
        faq: {
            title: 'Frequently Asked Questions',
            items: [
                { question: 'Is LexiClash free to play?', answer: 'Yes, LexiClash is completely free. No subscription, no in-app purchases. Just visit lexiclash.live and start playing.' },
                { question: 'Do I need to download an app?', answer: 'No download required. LexiClash runs in your web browser on any device - desktop, tablet, or mobile phone.' },
                { question: 'How many players can join a game?', answer: 'LexiClash supports 2 to 20+ players in a single room. Perfect for small groups or large parties.' },
                { question: 'What languages does LexiClash support?', answer: 'LexiClash supports English, Hebrew, Swedish, Japanese, and Spanish. Each language has its own dictionary for word validation.' },
                { question: 'How do combos work?', answer: 'Find words in quick succession (within a few seconds of each other) to build combo multipliers. Each consecutive quick find increases your combo level, multiplying your base score.' },
                { question: 'Can I play alone?', answer: 'Absolutely. Single-player mode lets you practice against AI bots at various difficulty levels, or try the daily challenges.' },
                { question: 'What is the difference between Classic and Blast mode?', answer: 'In Classic mode, the grid stays the same throughout the game. In Blast mode, tiles are destroyed when you form words, and new letters cascade down, creating chain reaction opportunities.' },
                { question: 'How does Word Hunt compare to Wordle?', answer: 'Like Wordle, Word Hunt gives everyone the same daily puzzle. But instead of guessing a 5-letter word, you search a letter grid to find a hidden target word using adjacency-based swiping.' },
                { question: 'Can I play on my phone?', answer: 'Yes! LexiClash is fully optimized for mobile. Swipe letters on the touch screen to form words. Works on both iOS and Android browsers.' },
                { question: 'How do I invite friends to play?', answer: 'Create a room and share the room code or QR code with friends. They can join instantly by entering the code or scanning the QR code at lexiclash.live.' },
            ],
        },
        cta: {
            title: 'Ready to Play?',
            subtitle: 'Jump into a game and start finding words!',
            classic: 'Play Classic',
            blast: 'Play Blast',
            daily: 'Daily Challenge',
            multiplayer: 'Multiplayer',
        },
    },
    he: {
        pageTitle: 'איך לשחק בלקסיקלאש - מדריך מלא לכל מצבי המשחק',
        pageDescription: 'למדו איך לשחק בלקסיקלאש עם הוראות שלב-אחר-שלב למצב קלאסי, בלאסט, וציד מילים. מדריך ניקוד, טיפים ושאלות נפוצות.',
        introText: 'לקסיקלאש הוא משחק מילים מרובה משתתפים בזמן אמת שבו שחקנים מתחרים למצוא מילים על לוח אותיות משותף. בין אם אתם משחקים לבד נגד בוטים, מתחרים עם חברים במולטיפלייר, או מתמודדים עם האתגר היומי - המדריך הזה מכסה את כל מה שצריך לדעת כדי להתחיל לנצח.',
        gameModes: {
            classic: {
                title: 'מצב קלאסי',
                description: 'חוויית הלקסיקלאש המקורית. התחרו נגד שחקנים אחרים למצוא כמה שיותר מילים על לוח אותיות משותף.',
                steps: [
                    { title: 'צרו או הצטרפו לחדר', description: 'התחילו חדר משחק חדש או הצטרפו לחדר קיים באמצעות קוד חדר או קוד QR. אפשר גם לשחק לבד נגד בוטים.' },
                    { title: 'מצאו מילים בלוח', description: 'החליקו או לחצו על אותיות סמוכות (אופקית, אנכית או באלכסון) כדי ליצור מילים. אורך מילה מינימלי הוא 3 אותיות.' },
                    { title: 'בנו קומבו לנקודות בונוס', description: 'מצאו מילים ברצף מהיר כדי לבנות מכפילי קומבו. כל מילה רצופה שנמצאת תוך שניות מעלה את רמת הקומבו.' },
                    { title: 'נצחו את השעון', description: 'יש לכם 3 דקות למצוא כמה שיותר מילים. במולטיפלייר, מילים שנמצאו על ידי כולם לא נותנות נקודות - מצאו מילים ייחודיות!' },
                    { title: 'בדקו את הלידרבורד', description: 'כשהזמן נגמר, ראו את הניקוד הסופי, המילה הארוכה ביותר, הקומבו הטוב ביותר, ואת הדירוג מול שחקנים אחרים.' },
                ],
            },
            blast: {
                title: 'מצב בלאסט',
                description: 'טוויסט מפוצץ על מציאת מילים. נקו אריחים מהלוח על ידי יצירת מילים, והפעילו תגובות שרשרת וקומבו מפלים.',
                steps: [
                    { title: 'בחרו מצב בלאסט', description: 'בחרו מצב בלאסט מבורר מצב המשחק. הלוח כולל אריחי פיצוץ מיוחדים לצד אותיות רגילות.' },
                    { title: 'צרו מילים כדי לנקות אריחים', description: 'כשמגישים מילה, אריחי האותיות נהרסים ומוסרים מהלוח. אותיות חדשות נופלות מלמעלה כדי למלא את הפערים.' },
                    { title: 'הפעילו תגובות שרשרת', description: 'כשאריחים חדשים נופלים למקומם, הם עשויים ליצור הזדמנויות חדשות למילים. שרשרו מספר ניקויים יחד לנקודות בונוס מסיביות.' },
                    { title: 'השתמשו באריחי פיצוץ', description: 'אריחי פיצוץ מיוחדים מנקים שורות או עמודות שלמות כשהם חלק ממילה. מקמו את המילים שלכם אסטרטגית.' },
                    { title: 'מקסמו את הניקוד', description: 'המשחק נגמר כשהזמן אוזל. תגובות שרשרת ארוכות, קומבו של אריחי פיצוץ, ומציאת מילים מהירה כולם תורמים לניקוד.' },
                ],
            },
            wordHunt: {
                title: 'ציד מילים',
                description: 'אתגר פאזל יומי דומה לוורדל. כולם משחקים על אותו לוח כל יום. מצאו את מילת המטרה המוסתרת תוך 10 ניסיונות.',
                steps: [
                    { title: 'פתחו את האתגר היומי', description: 'נווטו לאזור האתגר היומי ובחרו ציד מילים. פאזל חדש מופיע כל יום בחצות UTC.' },
                    { title: 'בחנו את הלוח', description: 'בדקו את לוח האותיות בקפידה. מילת המטרה המוסתרת נוצרת על ידי חיבור אותיות סמוכות בלוח.' },
                    { title: 'נחשו', description: 'החליקו כדי ליצור מילים שאתם חושבים שעשויות להיות המטרה. יש לכם 10 ניסיונות. כל ניחוש חושף רמזים.' },
                    { title: 'קראו את הרמזים', description: 'אחרי כל ניחוש, הדגשות צבעוניות מראות אילו אותיות נכונות ובמקום הנכון. השתמשו במידע הזה כדי לצמצם את האפשרויות.' },
                    { title: 'שתפו את התוצאות', description: 'ניצחתם או לא, שתפו תוצאות מבוססות אמוג\'י עם חברים. השוו כמה ניסיונות לקח בלי לחשוף את התשובה.' },
                ],
            },
        },
        scoring: {
            title: 'מדריך ניקוד',
            headers: ['אורך מילה', 'נקודות בסיס', 'דוגמה'],
            rows: [
                { length: '3 אותיות', points: 'נקודה 1', example: 'גל, שם, יד' },
                { length: '4 אותיות', points: '3 נקודות', example: 'משחק, מילה, ספר' },
                { length: '5 אותיות', points: '5 נקודות', example: 'קלאסי, חידה, ניצחון' },
                { length: '6 אותיות', points: '8 נקודות', example: 'תחרות, פיצוץ, אלופים' },
                { length: '7 אותיות', points: '12 נקודות', example: 'מדהימים, מתחרים' },
                { length: '8+ אותיות', points: '18+ נקודות', example: 'אלופים, מנצחים' },
            ],
            comboNote: 'מכפילי קומבו נוספים על נקודות הבסיס. קומבו x3 על מילה בת 5 אותיות מרוויח 15 נקודות במקום 5!',
        },
        faq: {
            title: 'שאלות נפוצות',
            items: [
                { question: 'האם לקסיקלאש חינמי?', answer: 'כן, לקסיקלאש חינמי לחלוטין. ללא מנוי, ללא רכישות באפליקציה. פשוט היכנסו ל-lexiclash.live והתחילו לשחק.' },
                { question: 'צריך להוריד אפליקציה?', answer: 'לא צריך להוריד כלום. לקסיקלאש רץ בדפדפן האינטרנט שלכם על כל מכשיר - מחשב, טאבלט או טלפון.' },
                { question: 'כמה שחקנים יכולים להצטרף למשחק?', answer: 'לקסיקלאש תומך ב-2 עד 20+ שחקנים בחדר אחד. מושלם לקבוצות קטנות או מסיבות גדולות.' },
                { question: 'באילו שפות לקסיקלאש תומך?', answer: 'לקסיקלאש תומך באנגלית, עברית, שוודית, יפנית וספרדית. לכל שפה יש מילון משלה לאימות מילים.' },
                { question: 'איך קומבו עובד?', answer: 'מצאו מילים ברצף מהיר (תוך שניות אחד מהשני) כדי לבנות מכפילי קומבו. כל מציאה מהירה רצופה מעלה את רמת הקומבו ומכפילה את הניקוד.' },
                { question: 'אפשר לשחק לבד?', answer: 'בהחלט. מצב שחקן יחיד מאפשר לכם להתאמן נגד בוטים ברמות קושי שונות, או לנסות את האתגרים היומיים.' },
                { question: 'מה ההבדל בין מצב קלאסי לבלאסט?', answer: 'במצב קלאסי, הלוח נשאר אותו דבר לאורך כל המשחק. במצב בלאסט, אריחים נהרסים כשיוצרים מילים, ואותיות חדשות נופלות מלמעלה ויוצרות הזדמנויות לתגובות שרשרת.' },
                { question: 'איך ציד מילים דומה לוורדל?', answer: 'כמו וורדל, ציד מילים נותן לכולם את אותו פאזל יומי. אבל במקום לנחש מילה בת 5 אותיות, מחפשים מילת מטרה מוסתרת בלוח אותיות על ידי החלקה על אותיות סמוכות.' },
                { question: 'אפשר לשחק בטלפון?', answer: 'כן! לקסיקלאש מותאם לחלוטין למובייל. החליקו אותיות על מסך המגע כדי ליצור מילים. עובד על דפדפני iOS ואנדרואיד.' },
                { question: 'איך מזמינים חברים לשחק?', answer: 'צרו חדר ושתפו את קוד החדר או קוד QR עם חברים. הם יכולים להצטרף מיד על ידי הזנת הקוד או סריקת ה-QR ב-lexiclash.live.' },
            ],
        },
        cta: {
            title: 'מוכנים לשחק?',
            subtitle: 'קפצו למשחק והתחילו למצוא מילים!',
            classic: 'שחקו קלאסי',
            blast: 'שחקו בלאסט',
            daily: 'אתגר יומי',
            multiplayer: 'מולטיפלייר',
        },
    },
    sv: {
        pageTitle: 'Hur man spelar LexiClash - Komplett guide till alla spellag',
        pageDescription: 'Lar dig spela LexiClash med steg-for-steg-instruktioner for Classic, Blast och Word Hunt. Poangguide, tips och vanliga fragor.',
        introText: 'LexiClash ar ett multiplayer-ordspel i realtid dar spelare tavlar om att hitta ord pa ett delat bokstavsrutnot. Oavsett om du spelar solo mot AI-botar, tavlar med vanner i multiplayer eller tar dig an den dagliga utmaningen, tackes allt du behover veta for att borja vinna.',
        gameModes: {
            classic: {
                title: 'Klassiskt lage',
                description: 'Den ursprungliga LexiClash-upplevelsen. Tavla mot andra spelare for att hitta sa manga ord som mojligt pa ett delat bokstavsrutnot.',
                steps: [
                    { title: 'Skapa eller ga med i ett rum', description: 'Starta ett nytt spelrum eller ga med i ett befintligt med en rumskod eller QR-kod. Du kan ocksa spela solo mot AI-botar.' },
                    { title: 'Hitta ord pa rutnatet', description: 'Svep eller klicka pa angransande bokstaver (horisontellt, vertikalt eller diagonalt) for att bilda ord. Minsta ordlangd ar 3 bokstaver.' },
                    { title: 'Bygg kombos for bonuspoang', description: 'Hitta ord i snabb foljd for att bygga kombomultiplikatorer. Varje konsekutivt ord som hittas inom nagra sekunder okar din komboniva.' },
                    { title: 'Sla klockan', description: 'Du har 3 minuter pa dig att hitta sa manga ord som mojligt. I multiplayer ger ord som alla hittar noll poang - hitta unika ord!' },
                    { title: 'Kolla resultattavlan', description: 'Nar tiden ar ute, se din slutpoang, langsta ord, basta kombo och hur du rankas mot andra spelare.' },
                ],
            },
            blast: {
                title: 'Blast-lage',
                description: 'En explosiv twist pa ordhittande. Rensa brickor fran rutnatet genom att bilda ord, utlos kedjereaktioner och kaskadkombos.',
                steps: [
                    { title: 'Valj Blast-lage', description: 'Valj Blast-lage fran spelagsvaljaren. Rutnatet har speciella blast-brickor bredvid vanliga bokstaver.' },
                    { title: 'Bilda ord for att rensa brickor', description: 'Nar du skickar in ett ord forstors bokstavsbrickorna och tas bort fran rutnatet. Nya bokstaver faller ner ovifran.' },
                    { title: 'Utlos kedjereaktioner', description: 'Nar nya brickor faller pa plats kan de skapa nya ordmojligheter. Kedja ihop flera rensningar for massiva bonuspoang.' },
                    { title: 'Anvand blast-brickor', description: 'Speciella blast-brickor rensar hela rader eller kolumner nar de ingal i ett ord. Planera dina ord strategiskt.' },
                    { title: 'Maximera din poang', description: 'Spelet slutar nar tiden ar ute. Langa kedjereaktioner, blast-brickkombos och snabb ordhittning bidrar alla till slutpoangen.' },
                ],
            },
            wordHunt: {
                title: 'Word Hunt Survival',
                description: 'En daglig pusselutmaning liknande Wordle. Alla spelar pa samma brade varje dag. Hitta det dolda malordet inom 10 forsok.',
                steps: [
                    { title: 'Oppna den dagliga utmaningen', description: 'Navigera till avsnittet Daglig utmaning och valj Word Hunt Survival. Ett nytt pussel dyker upp varje dag vid midnatt UTC.' },
                    { title: 'Studera rutnatet', description: 'Granska bokstavsrutnatet noga. Det dolda malordet bildas genom att koppla ihop angransande bokstaver pa rutnatet.' },
                    { title: 'Gissa', description: 'Svep for att bilda ord du tror kan vara malet. Du har 10 forsok. Varje gissning avlojar ledtradar.' },
                    { title: 'Las ledtradarna', description: 'Efter varje gissning visar fargade markeringar vilka bokstaver som ar korrekta och ratt placerade. Anvand informationen for att begrana malet.' },
                    { title: 'Dela dina resultat', description: 'Vinn eller forlora, dela dina emoji-baserade resultat med vanner. Jamfor hur manga forsok det tog utan att avsloja svaret.' },
                ],
            },
        },
        scoring: {
            title: 'Poangguide',
            headers: ['Ordlangd', 'Baspoang', 'Exempel'],
            rows: [
                { length: '3 bokstaver', points: '1 poang', example: 'KAT, HUS, SOL' },
                { length: '4 bokstaver', points: '3 poang', example: 'SPEL, VIND, SKOG' },
                { length: '5 bokstaver', points: '5 poang', example: 'STORM, DATOR, MUSIK' },
                { length: '6 bokstaver', points: '8 poang', example: 'TAVLING, PUSSEL' },
                { length: '7 bokstaver', points: '12 poang', example: 'FANTASI, MONSTER' },
                { length: '8+ bokstaver', points: '18+ poang', example: 'CHAMPION, AVENTYR' },
            ],
            comboNote: 'Kombomultiplikatorer laggs till baspoangen. En x3-kombo pa ett 5-bokstavsord ger 15 poang istallet for 5!',
        },
        faq: {
            title: 'Vanliga fragor',
            items: [
                { question: 'Ar LexiClash gratis?', answer: 'Ja, LexiClash ar helt gratis. Inget abonnemang, inga kopinuti appen. Besok lexiclash.live och borja spela.' },
                { question: 'Behover jag ladda ner en app?', answer: 'Ingen nedladdning kravs. LexiClash kors i din webblasare pa vilken enhet som helst.' },
                { question: 'Hur manga spelare kan ga med?', answer: 'LexiClash stoder 2 till 20+ spelare i ett rum. Perfekt for sma grupper eller stora fester.' },
                { question: 'Vilka sprak stoder LexiClash?', answer: 'LexiClash stoder engelska, hebreiska, svenska, japanska och spanska.' },
                { question: 'Hur fungerar kombos?', answer: 'Hitta ord i snabb foljd for att bygga kombomultiplikatorer som okar din baspoang.' },
                { question: 'Kan jag spela ensam?', answer: 'Absolut. Enspelarlag lat dig ova mot AI-botar eller prova dagliga utmaningar.' },
                { question: 'Vad ar skillnaden mellan Classic och Blast?', answer: 'I Classic forblir rutnatet detsamma. I Blast forstors brickor nar du bildar ord och nya faller ner.' },
                { question: 'Kan jag spela pa mobilen?', answer: 'Ja! LexiClash ar optimerat for mobil. Svep bokstaver pa pekskarms. Fungerar pa bade iOS och Android.' },
                { question: 'Hur bjuder jag in vanner?', answer: 'Skapa ett rum och dela rumskoden eller QR-koden med vanner.' },
                { question: 'Hur liknar Word Hunt Wordle?', answer: 'Som Wordle ger Word Hunt alla samma dagliga pussel, men du soker pa ett bokstavsrutnot istallet for att gissa bokstaver.' },
            ],
        },
        cta: {
            title: 'Redo att spela?',
            subtitle: 'Hoppa in i ett spel och borja hitta ord!',
            classic: 'Spela Classic',
            blast: 'Spela Blast',
            daily: 'Daglig utmaning',
            multiplayer: 'Multiplayer',
        },
    },
    ja: {
        pageTitle: 'LexiClashの遊び方 - 全ゲームモード完全ガイド',
        pageDescription: 'クラシック、ブラスト、ワードハントモードのステップバイステップガイドでLexiClashの遊び方を学びましょう。スコアリングガイド、ヒント、FAQ付き。',
        introText: 'LexiClashは、共有された文字グリッド上で単語を見つけるリアルタイムマルチプレイヤーワードゲームです。AIボットとのソロプレイ、友達とのマルチプレイヤー対戦、デイリーチャレンジなど、勝ち始めるために知っておくべきことをすべてカバーしています。',
        gameModes: {
            classic: {
                title: 'クラシックモード',
                description: 'オリジナルのLexiClash体験。共有文字グリッド上でできるだけ多くの単語を見つけるために他のプレイヤーと競争します。',
                steps: [
                    { title: 'ルームを作成または参加', description: '新しいゲームルームを開始するか、ルームコードまたはQRコードで既存のルームに参加します。AIボットとソロプレイも可能です。' },
                    { title: 'グリッド上で単語を見つける', description: '隣接する文字（水平、垂直、または斜め）をスワイプまたはクリックして単語を形成します。最小単語長は3文字です。' },
                    { title: 'コンボを作ってボーナスポイント', description: '素早く連続して単語を見つけてコンボ倍率を上げましょう。数秒以内に見つけた連続する単語がコンボレベルを上げます。' },
                    { title: '時間に勝つ', description: '3分間でできるだけ多くの単語を見つけてください。マルチプレイヤーでは、全員が見つけた単語はゼロポイント - ユニークな単語を見つけましょう！' },
                    { title: 'リーダーボードを確認', description: '時間切れ後、最終スコア、最長単語、ベストコンボ、他のプレイヤーとのランキングを確認できます。' },
                ],
            },
            blast: {
                title: 'ブラストモード',
                description: '単語探しの爆発的なツイスト。単語を作ってグリッドからタイルをクリアし、連鎖反応とカスケードコンボを発動させます。',
                steps: [
                    { title: 'ブラストモードを選択', description: 'ゲームモードセレクターからブラストモードを選択します。通常の文字の横に特別なブラストタイルがあります。' },
                    { title: '単語を作ってタイルをクリア', description: '単語を送信すると、文字タイルが破壊されグリッドから除去されます。上から新しい文字が落ちてきます。' },
                    { title: '連鎖反応を発動', description: '新しいタイルが所定の位置に落ちると、新しい単語の機会が生まれます。複数のクリアを連鎖させて大量ボーナスポイントを獲得。' },
                    { title: 'ブラストタイルを使用', description: '特別なブラストタイルは単語に含まれると行または列全体をクリアします。戦略的に単語を配置しましょう。' },
                    { title: 'スコアを最大化', description: '時間切れでゲーム終了。長い連鎖反応、ブラストタイルコンボ、素早い単語発見がすべて最終スコアに貢献します。' },
                ],
            },
            wordHunt: {
                title: 'ワードハントサバイバル',
                description: 'Wordleに似たデイリーパズルチャレンジ。毎日同じボードで全員がプレイ。10回以内に隠されたターゲット単語を見つけてください。',
                steps: [
                    { title: 'デイリーチャレンジを開く', description: 'デイリーチャレンジセクションに移動してワードハントサバイバルを選択。毎日UTC午前0時に新しいパズルが登場します。' },
                    { title: 'グリッドを研究する', description: '文字グリッドを注意深く調べてください。隠されたターゲット単語はグリッド上の隣接する文字を接続して形成されます。' },
                    { title: '推測する', description: 'ターゲットだと思う単語をスワイプで形成します。10回の試行があります。各推測でフィードバックの手がかりが得られます。' },
                    { title: 'フィードバックを読む', description: '各推測後、色付きのハイライトが正しい文字と正しい位置を示します。この情報を使ってターゲットを絞り込みましょう。' },
                    { title: '結果を共有', description: '勝っても負けても、絵文字ベースの結果を友達と共有できます。答えを明かさずに何回の試行が必要だったか比較しましょう。' },
                ],
            },
        },
        scoring: {
            title: 'スコアリングガイド',
            headers: ['単語の長さ', '基本ポイント', '例'],
            rows: [
                { length: '3文字', points: '1ポイント', example: 'ねこ、いぬ、はな' },
                { length: '4文字', points: '3ポイント', example: 'ことば、あそび' },
                { length: '5文字', points: '5ポイント', example: 'しょうぶ、たたかい' },
                { length: '6文字', points: '8ポイント', example: 'ぼうけん、せんとう' },
                { length: '7文字', points: '12ポイント', example: 'ゆうしょう' },
                { length: '8文字以上', points: '18ポイント以上', example: 'チャンピオン' },
            ],
            comboNote: 'コンボ倍率は基本ポイントに加算されます。5文字の単語にx3コンボで5ではなく15ポイント！',
        },
        faq: {
            title: 'よくある質問',
            items: [
                { question: 'LexiClashは無料ですか？', answer: 'はい、LexiClashは完全無料です。サブスクリプションもアプリ内課金もありません。lexiclash.liveにアクセスしてプレイ開始。' },
                { question: 'アプリのダウンロードは必要？', answer: 'ダウンロード不要。LexiClashはどのデバイスでもウェブブラウザで動作します。' },
                { question: '何人までプレイできますか？', answer: 'LexiClashは1つのルームで2〜20人以上をサポート。小グループにもパーティーにも最適。' },
                { question: 'どの言語をサポートしていますか？', answer: 'LexiClashは英語、ヘブライ語、スウェーデン語、日本語、スペイン語をサポートしています。' },
                { question: 'コンボはどう機能しますか？', answer: '素早く連続して単語を見つけてコンボ倍率を上げ、基本スコアを増加させます。' },
                { question: '一人でプレイできますか？', answer: 'もちろん！シングルプレイヤーモードでAIボットと練習したり、デイリーチャレンジに挑戦できます。' },
                { question: 'クラシックとブラストの違いは？', answer: 'クラシックではグリッドは変わりません。ブラストでは単語を作るとタイルが破壊され、新しい文字が落ちてきます。' },
                { question: 'スマホでプレイできますか？', answer: 'はい！LexiClashはモバイル完全対応。タッチスクリーンで文字をスワイプ。iOSとAndroidの両方のブラウザで動作します。' },
                { question: '友達を招待するには？', answer: 'ルームを作成してルームコードまたはQRコードを友達と共有します。' },
                { question: 'ワードハントはWordleとどう違いますか？', answer: 'Wordleのように全員が同じ日替わりパズルをプレイしますが、文字を推測する代わりに文字グリッド上で隠された単語を探します。' },
            ],
        },
        cta: {
            title: 'プレイする準備はできましたか？',
            subtitle: 'ゲームに飛び込んで単語を見つけ始めましょう！',
            classic: 'クラシックをプレイ',
            blast: 'ブラストをプレイ',
            daily: 'デイリーチャレンジ',
            multiplayer: 'マルチプレイヤー',
        },
    },
    es: {
        pageTitle: 'Como jugar LexiClash - Guia completa de todos los modos de juego',
        pageDescription: 'Aprende a jugar LexiClash con instrucciones paso a paso para los modos Clasico, Blast y Word Hunt. Guia de puntuacion, consejos y preguntas frecuentes.',
        introText: 'LexiClash es un juego de palabras multijugador en tiempo real donde los jugadores compiten para encontrar palabras en una cuadricula de letras compartida. Ya sea jugando solo contra bots de IA, compitiendo con amigos en multijugador, o enfrentando el desafio diario, esta guia cubre todo lo que necesitas saber para empezar a ganar.',
        gameModes: {
            classic: {
                title: 'Modo Clasico',
                description: 'La experiencia original de LexiClash. Compite contra otros jugadores para encontrar tantas palabras como sea posible en una cuadricula de letras compartida.',
                steps: [
                    { title: 'Crea o unete a una sala', description: 'Inicia una nueva sala de juego o unete a una existente usando un codigo de sala o codigo QR. Tambien puedes jugar solo contra bots de IA.' },
                    { title: 'Encuentra palabras en la cuadricula', description: 'Desliza o haz clic en letras adyacentes (horizontal, vertical o diagonal) para formar palabras. La longitud minima es de 3 letras.' },
                    { title: 'Construye combos para puntos extra', description: 'Encuentra palabras en rapida sucesion para construir multiplicadores de combo. Cada palabra consecutiva encontrada en segundos aumenta tu nivel de combo.' },
                    { title: 'Vence al reloj', description: 'Tienes 3 minutos para encontrar tantas palabras como sea posible. En multijugador, las palabras encontradas por todos no dan puntos - encuentra palabras unicas!' },
                    { title: 'Revisa la tabla de posiciones', description: 'Cuando se acaba el tiempo, ve tu puntuacion final, palabra mas larga, mejor combo y como te clasificas contra otros jugadores.' },
                ],
            },
            blast: {
                title: 'Modo Blast',
                description: 'Un giro explosivo en la busqueda de palabras. Elimina fichas de la cuadricula formando palabras, desencadenando reacciones en cadena y combos en cascada.',
                steps: [
                    { title: 'Selecciona modo Blast', description: 'Elige el modo Blast del selector de modos. La cuadricula tiene fichas de explosion especiales junto a letras regulares.' },
                    { title: 'Forma palabras para eliminar fichas', description: 'Al enviar una palabra, las fichas de letras se destruyen y se eliminan de la cuadricula. Nuevas letras caen desde arriba.' },
                    { title: 'Desencadena reacciones en cadena', description: 'Cuando nuevas fichas caen en su lugar, pueden crear nuevas oportunidades de palabras. Encadena multiples eliminaciones para puntos masivos.' },
                    { title: 'Usa fichas de explosion', description: 'Las fichas especiales de explosion eliminan filas o columnas enteras cuando se incluyen en una palabra. Planifica estrategicamente.' },
                    { title: 'Maximiza tu puntuacion', description: 'El juego termina cuando se acaba el tiempo. Reacciones en cadena, combos de fichas y busqueda rapida contribuyen a tu puntuacion.' },
                ],
            },
            wordHunt: {
                title: 'Word Hunt Survival',
                description: 'Un desafio de rompecabezas diario similar a Wordle. Todos juegan en el mismo tablero cada dia. Encuentra la palabra objetivo oculta en 10 intentos.',
                steps: [
                    { title: 'Abre el desafio diario', description: 'Navega a la seccion de Desafio Diario y selecciona Word Hunt Survival. Un nuevo rompecabezas aparece cada dia a medianoche UTC.' },
                    { title: 'Estudia la cuadricula', description: 'Examina la cuadricula de letras cuidadosamente. La palabra objetivo oculta se forma conectando letras adyacentes.' },
                    { title: 'Haz tus intentos', description: 'Desliza para formar palabras que crees que podrian ser el objetivo. Tienes 10 intentos. Cada intento revela pistas.' },
                    { title: 'Lee las pistas', description: 'Despues de cada intento, los resaltados de colores muestran que letras son correctas y estan bien ubicadas. Usa esta informacion para reducir opciones.' },
                    { title: 'Comparte tus resultados', description: 'Ganes o pierdas, comparte tus resultados basados en emojis con amigos. Compara cuantos intentos fueron necesarios sin revelar la respuesta.' },
                ],
            },
        },
        scoring: {
            title: 'Guia de puntuacion',
            headers: ['Longitud', 'Puntos base', 'Ejemplo'],
            rows: [
                { length: '3 letras', points: '1 punto', example: 'SOL, MAR, LUZ' },
                { length: '4 letras', points: '3 puntos', example: 'JUEGO, VIDA, MESA' },
                { length: '5 letras', points: '5 puntos', example: 'MUNDO, PLAYA, FUEGO' },
                { length: '6 letras', points: '8 puntos', example: 'BATALLA, ENIGMA' },
                { length: '7 letras', points: '12 puntos', example: 'VICTORIA, COMBATE' },
                { length: '8+ letras', points: '18+ puntos', example: 'CAMPEON, AVENTURA' },
            ],
            comboNote: 'Los multiplicadores de combo se suman a los puntos base. Un combo x3 en una palabra de 5 letras da 15 puntos en vez de 5!',
        },
        faq: {
            title: 'Preguntas frecuentes',
            items: [
                { question: 'Es LexiClash gratis?', answer: 'Si, LexiClash es completamente gratis. Sin suscripcion, sin compras dentro de la app. Solo visita lexiclash.live y empieza a jugar.' },
                { question: 'Necesito descargar una app?', answer: 'No se necesita descarga. LexiClash funciona en tu navegador web en cualquier dispositivo.' },
                { question: 'Cuantos jugadores pueden unirse?', answer: 'LexiClash soporta de 2 a 20+ jugadores en una sola sala. Perfecto para grupos pequenos o fiestas grandes.' },
                { question: 'Que idiomas soporta LexiClash?', answer: 'LexiClash soporta ingles, hebreo, sueco, japones y espanol. Cada idioma tiene su propio diccionario.' },
                { question: 'Como funcionan los combos?', answer: 'Encuentra palabras en rapida sucesion para construir multiplicadores de combo que aumentan tu puntuacion base.' },
                { question: 'Puedo jugar solo?', answer: 'Por supuesto. El modo un jugador te permite practicar contra bots de IA o probar los desafios diarios.' },
                { question: 'Cual es la diferencia entre Clasico y Blast?', answer: 'En Clasico, la cuadricula permanece igual. En Blast, las fichas se destruyen al formar palabras y nuevas letras caen.' },
                { question: 'Puedo jugar en mi telefono?', answer: 'Si! LexiClash esta optimizado para movil. Desliza letras en la pantalla tactil. Funciona en navegadores iOS y Android.' },
                { question: 'Como invito amigos?', answer: 'Crea una sala y comparte el codigo o QR con amigos. Pueden unirse al instante en lexiclash.live.' },
                { question: 'Como se compara Word Hunt con Wordle?', answer: 'Como Wordle, Word Hunt da a todos el mismo rompecabezas diario, pero buscas una palabra oculta en una cuadricula de letras en vez de adivinar letras.' },
            ],
        },
        cta: {
            title: 'Listo para jugar?',
            subtitle: 'Salta a un juego y empieza a encontrar palabras!',
            classic: 'Jugar Clasico',
            blast: 'Jugar Blast',
            daily: 'Desafio diario',
            multiplayer: 'Multijugador',
        },
    },
};

// Fallback to English for unsupported locales
export function getHowToPlayContent(locale: string): HowToPlayContent {
    return content[locale] || content.en;
}
