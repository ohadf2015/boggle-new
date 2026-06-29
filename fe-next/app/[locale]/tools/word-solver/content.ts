export type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

export interface ToolContent {
  title: string;
  subtitle: string;
  description: string;
  metaDescription: string;
  inputPlaceholder: string;
  inputLabel: string;
  languageLabel: string;
  solveButton: string;
  searchingText: string;
  clearButton: string;
  resultsTitle: string;
  noResults: string;
  wordsFound: string;
  showingFirst: string;
  letterWords: string;
  ctaTitle: string;
  ctaButton: string;
  ctaDescription: string;
  fullDictionaryNote: string;
  howToTitle: string;
  howToSteps: string[];
  tipsTitle: string;
  faqTitle: string;
  faqs: { question: string; answer: string }[];
  tips: { title: string; body: string }[];
  toolsHub: {
    title: string;
    description: string;
    wordSolverCard: string;
    wordSolverDesc: string;
    comingSoon: string;
  };
}

const content: Record<Locale, ToolContent> = {
  en: {
    title: 'Word Solver & Anagram Finder',
    subtitle: 'Unscramble letters and find every possible word',
    description:
      'Free online anagram solver and word unscrambler. Enter your letters and instantly find all possible words. Perfect for Scrabble, Boggle, Words With Friends, and LexiClash.',
    metaDescription:
      'Free anagram solver & word finder. Unscramble letters to find all possible words. Works for Scrabble, Boggle, Words With Friends. Try our word unscrambler now!',
    inputPlaceholder: 'Enter your letters (e.g. AELRST)',
    inputLabel: 'Your Letters',
    languageLabel: 'Dictionary Language',
    solveButton: 'Find Words',
    searchingText: 'Searching...',
    clearButton: 'Clear',
    resultsTitle: 'Words Found',
    noResults: 'No words found. Try different letters!',
    wordsFound: 'words found',
    showingFirst: 'showing first',
    letterWords: '-letter words',
    ctaTitle: 'Practice Finding Words Faster',
    ctaButton: 'Play LexiClash Free',
    ctaDescription: 'Challenge friends in real-time word battles. Train your brain to spot words instantly!',
    fullDictionaryNote: 'Showing results from the full LexiClash dictionary. Play LexiClash to test your word-finding skills!',
    howToTitle: 'How to Use the Word Solver',
    howToSteps: [
      'Type or paste your available letters into the input field above.',
      'Click "Find Words" or press Enter to search.',
      'Browse results grouped by word length, longest words first.',
      'Use the results to discover words you might have missed in your game.',
      'Click "Play LexiClash" to practice finding words under time pressure!',
    ],
    tipsTitle: 'Word Game Tips',
    faqTitle: 'Frequently Asked Questions',
    faqs: [
      {
        question: 'How many words can you make from 7 letters?',
        answer:
          'From 7 random letters, you can typically make between 20 and 80 valid English words, depending on the letter combination. Common vowel-consonant mixes yield more words. Our solver finds all possibilities from a curated word list instantly.',
      },
      {
        question: 'What is an anagram solver?',
        answer:
          'An anagram solver is a tool that takes a set of letters and finds all valid words that can be formed using some or all of those letters. It checks every possible combination against a dictionary to find words you might miss.',
      },
      {
        question: 'Can I use this for Scrabble or Words With Friends?',
        answer:
          'Yes! This word finder works for any word game including Scrabble, Words With Friends, Boggle, and LexiClash. Enter your rack letters and discover every possible word you can play.',
      },
      {
        question: 'Why are some words missing from the results?',
        answer:
          'Our free tool uses a curated list of 500+ common English words to keep results fast and relevant. For access to a full dictionary with thousands of words, play LexiClash where every valid English word counts!',
      },
      {
        question: 'How do I get better at finding words from scrambled letters?',
        answer:
          'Practice regularly with timed word games like LexiClash. Look for common prefixes (UN-, RE-, PRE-) and suffixes (-ING, -TION, -ED). Start with longer words and work down. Our solver helps you learn words you might not know.',
      },
    ],
    tips: [
      {
        title: 'Start With Vowels and Common Consonants',
        body: 'When scanning scrambled letters, first identify your vowels (A, E, I, O, U) and high-frequency consonants (S, T, R, N, L). These letters form the backbone of most English words. Try pairing each vowel with surrounding consonants to spot 3-letter words first, then build outward to longer combinations.',
      },
      {
        title: 'Look for Common Word Patterns',
        body: 'Train your eye to recognize frequent letter patterns like -ING, -TION, -ED, -ER, -EST, and -LY. If you spot these endings in your available letters, work backward to find the root word. This technique dramatically speeds up word finding in timed games like Boggle and LexiClash.',
      },
      {
        title: 'Use Prefixes to Multiply Your Words',
        body: 'Common prefixes like UN-, RE-, PRE-, and OUT- can transform a single word into multiple valid entries. If you find "DO" in your letters, check for "UNDO" and "REDO". This strategy can double or triple your word count in competitive word games.',
      },
      {
        title: 'Practice With Daily Word Puzzles',
        body: 'Consistent practice is the fastest way to improve your anagram-solving skills. Play a daily word puzzle or challenge to build your vocabulary and pattern recognition. LexiClash offers daily challenges that test your ability to find words from a fixed grid of letters under time pressure.',
      },
      {
        title: 'Think in Letter Combinations, Not Whole Words',
        body: 'Instead of trying to see complete words at once, train yourself to spot 2-letter and 3-letter combinations (bigrams and trigrams) like TH, SH, CH, QU, STR, and PL. These building blocks appear in thousands of words and help your brain assemble valid words more quickly from random letter sets.',
      },
      {
        title: 'Do Not Overlook Short Words',
        body: 'In word games, short 2-letter and 3-letter words add up fast. Words like "QI", "ZA", "XI", "OX", and "AX" score surprisingly well. Learn the valid 2-letter words for your game of choice. In LexiClash, every word counts toward your score, so small words can make the difference between winning and losing.',
      },
    ],
    toolsHub: {
      title: 'LexiClash Tools',
      description: 'Free word game tools to boost your skills',
      wordSolverCard: 'Word Solver',
      wordSolverDesc: 'Find all possible words from your letters. Anagram solver and word unscrambler.',
      comingSoon: 'More tools coming soon!',
    },
  },
  he: {
    title: 'פותר מילים ומוצא אנגרמות',
    subtitle: 'פענחו אותיות ומצאו כל מילה אפשרית',
    description:
      'פותר אנגרמות ומפענח מילים חינמי. הזינו אותיות ומצאו מיד את כל המילים האפשריות. מושלם למשחקי מילים ול-LexiClash.',
    metaDescription:
      'פותר אנגרמות ומוצא מילים חינמי. פענחו אותיות כדי למצוא את כל המילים האפשריות. נסו את הכלי שלנו עכשיו!',
    inputPlaceholder: 'הזינו אותיות (למשל AELRST)',
    inputLabel: 'האותיות שלכם',
    languageLabel: 'שפת המילון',
    solveButton: 'מצא מילים',
    searchingText: 'מחפש...',
    clearButton: 'נקה',
    resultsTitle: 'מילים שנמצאו',
    noResults: 'לא נמצאו מילים. נסו אותיות אחרות!',
    wordsFound: 'מילים נמצאו',
    showingFirst: 'מציג ראשונים',
    letterWords: ' אותיות',
    ctaTitle: 'תרגלו מציאת מילים מהר יותר',
    ctaButton: 'שחקו ב-LexiClash בחינם',
    ctaDescription: 'אתגרו חברים בקרבות מילים בזמן אמת. אמנו את המוח שלכם!',
    fullDictionaryNote: 'מציג תוצאות מרשימה של 500+ מילים נפוצות. למילון המלא, שחקו ב-LexiClash!',
    howToTitle: 'איך להשתמש בפותר המילים',
    howToSteps: [
      'הקלידו או הדביקו את האותיות הזמינות בשדה הקלט למעלה.',
      'לחצו על "מצא מילים" או הקישו Enter לחיפוש.',
      'עיינו בתוצאות מקובצות לפי אורך מילה, המילים הארוכות ראשונות.',
      'השתמשו בתוצאות כדי לגלות מילים שאולי פספסתם במשחק.',
      'לחצו "שחקו ב-LexiClash" כדי לתרגל מציאת מילים תחת לחץ זמן!',
    ],
    tipsTitle: 'טיפים למשחקי מילים',
    faqTitle: 'שאלות נפוצות',
    faqs: [
      {
        question: 'כמה מילים אפשר ליצור מ-7 אותיות?',
        answer: 'מ-7 אותיות אקראיות ניתן בדרך כלל ליצור בין 20 ל-80 מילים תקפות באנגלית. הפותר שלנו מוצא את כל האפשרויות מיד.',
      },
      {
        question: 'מה זה פותר אנגרמות?',
        answer: 'פותר אנגרמות הוא כלי שלוקח סט של אותיות ומוצא את כל המילים התקפות שניתן ליצור מהן.',
      },
      {
        question: 'אפשר להשתמש בזה למשחקי מילים?',
        answer: 'כן! מוצא המילים הזה עובד לכל משחק מילים כולל Scrabble, Boggle ו-LexiClash.',
      },
      {
        question: 'למה חסרות מילים מהתוצאות?',
        answer: 'הכלי החינמי שלנו משתמש ברשימה של 500+ מילים נפוצות. למילון מלא, שחקו ב-LexiClash!',
      },
      {
        question: 'איך משתפרים במציאת מילים?',
        answer: 'תרגלו באופן קבוע עם משחקי מילים מתוזמנים כמו LexiClash. חפשו תחיליות וסיומות נפוצות.',
      },
    ],
    tips: [
      {
        title: 'התחילו עם תנועות ועיצורים נפוצים',
        body: 'כשסורקים אותיות מעורבבות, זהו קודם את התנועות והעיצורים בתדירות גבוהה. אותיות אלו מהוות את הבסיס לרוב המילים. נסו לשלב כל תנועה עם עיצורים סמוכים כדי לזהות מילים קצרות תחילה.',
      },
      {
        title: 'חפשו דפוסי מילים נפוצים',
        body: 'אמנו את העין שלכם לזהות צירופי אותיות תכופים כמו סיומות וקידומות נפוצות. אם תזהו דפוס כזה באותיות הזמינות, עבדו אחורה כדי למצוא את שורש המילה.',
      },
      {
        title: 'השתמשו בקידומות כדי להכפיל מילים',
        body: 'קידומות נפוצות יכולות להפוך מילה אחת למספר ערכים תקפים. אסטרטגיה זו יכולה להכפיל או לשלש את מספר המילים שלכם.',
      },
      {
        title: 'תרגלו עם חידות מילים יומיות',
        body: 'תרגול עקבי הוא הדרך המהירה ביותר לשפר את כישורי פתרון האנגרמות. LexiClash מציע אתגרים יומיים שבודקים את היכולת שלכם למצוא מילים תחת לחץ זמן.',
      },
      {
        title: 'חשבו בצירופי אותיות',
        body: 'במקום לנסות לראות מילים שלמות, אמנו את עצמכם לזהות צירופי 2-3 אותיות. אבני בניין אלו מופיעות באלפי מילים ועוזרות למוח שלכם להרכיב מילים מהר יותר.',
      },
      {
        title: 'אל תתעלמו ממילים קצרות',
        body: 'במשחקי מילים, מילים קצרות של 2-3 אותיות מצטברות מהר. ב-LexiClash כל מילה נחשבת לציון, אז מילים קטנות יכולות לעשות את ההבדל בין ניצחון להפסד.',
      },
    ],
    toolsHub: {
      title: 'כלי LexiClash',
      description: 'כלי משחקי מילים חינמיים לשיפור הכישורים',
      wordSolverCard: 'פותר מילים',
      wordSolverDesc: 'מצאו את כל המילים האפשריות מהאותיות שלכם. פותר אנגרמות ומפענח מילים.',
      comingSoon: 'עוד כלים בקרוב!',
    },
  },
  sv: {
    title: 'Ordlösare & Anagramfinnare',
    subtitle: 'Avkoda bokstäver och hitta alla möjliga ord',
    description:
      'Gratis anagramlösare och ordavkodare online. Ange dina bokstäver och hitta alla möjliga ord direkt. Perfekt för ordspel och LexiClash.',
    metaDescription:
      'Gratis anagramlösare och ordfinnare. Avkoda bokstäver för att hitta alla möjliga ord. Prova vår ordavkodare nu!',
    inputPlaceholder: 'Ange dina bokstäver (t.ex. AELRST)',
    inputLabel: 'Dina bokstäver',
    languageLabel: 'Ordboksspråk',
    solveButton: 'Hitta ord',
    searchingText: 'Söker...',
    clearButton: 'Rensa',
    resultsTitle: 'Hittade ord',
    noResults: 'Inga ord hittades. Prova andra bokstäver!',
    wordsFound: 'ord hittade',
    showingFirst: 'visar första',
    letterWords: '-bokstavsord',
    ctaTitle: 'Öva på att hitta ord snabbare',
    ctaButton: 'Spela LexiClash gratis',
    ctaDescription: 'Utmana vänner i ordstrider i realtid. Träna din hjärna!',
    fullDictionaryNote: 'Visar resultat från en lista med 500+ vanliga ord. För hela ordboken, spela LexiClash!',
    howToTitle: 'Hur man använder ordlösaren',
    howToSteps: [
      'Skriv eller klistra in dina tillgängliga bokstäver i fältet ovan.',
      'Klicka på "Hitta ord" eller tryck Enter för att söka.',
      'Bläddra bland resultat grupperade efter ordlängd.',
      'Använd resultaten för att upptäcka ord du kanske missade.',
      'Klicka "Spela LexiClash" för att öva under tidspress!',
    ],
    faqTitle: 'Vanliga frågor',
    faqs: [
      { question: 'Hur många ord kan man bilda av 7 bokstäver?', answer: 'Från 7 slumpmässiga bokstäver kan du vanligtvis bilda mellan 20 och 80 giltiga engelska ord. Vår lösare hittar alla möjligheter direkt.' },
      { question: 'Vad är en anagramlösare?', answer: 'En anagramlösare tar en uppsättning bokstäver och hittar alla giltiga ord som kan bildas.' },
      { question: 'Kan jag använda detta för Scrabble?', answer: 'Ja! Denna ordfinnare fungerar för alla ordspel inklusive Scrabble, Boggle och LexiClash.' },
      { question: 'Varför saknas vissa ord?', answer: 'Vårt gratisverktyg använder en lista med 500+ vanliga ord. För hela ordboken, spela LexiClash!' },
      { question: 'Hur blir man bättre på att hitta ord?', answer: 'Öva regelbundet med tidsbegränsade ordspel som LexiClash. Leta efter vanliga prefix och suffix.' },
    ],
    tipsTitle: 'Tips för ordspel',
    tips: [
      { title: 'Börja med vokaler', body: 'Identifiera dina vokaler och högfrekventa konsonanter först. Dessa bildar grunden för de flesta ord. Prova att para varje vokal med omgivande konsonanter för att hitta korta ord först.' },
      { title: 'Leta efter vanliga mönster', body: 'Träna ögat att känna igen vanliga bokstavsmönster och ändelser. Om du ser dem bland dina bokstäver, arbeta bakåt för att hitta grundordet.' },
      { title: 'Använd prefix', body: 'Vanliga prefix kan förvandla ett ord till flera giltiga poster. Denna strategi kan fördubbla ditt ordantal i tävlingsspel.' },
      { title: 'Öva med dagliga pussel', body: 'Regelbunden träning är det snabbaste sättet att förbättra dina anagramlösningskunskaper. LexiClash erbjuder dagliga utmaningar.' },
      { title: 'Tänk i bokstavskombinationer', body: 'Istället för att försöka se hela ord, träna dig att upptäcka 2-3 bokstavskombinationer. Dessa byggstenar hjälper hjärnan att sätta ihop ord snabbare.' },
      { title: 'Glöm inte korta ord', body: 'I ordspel adderas korta 2-3 bokstavsord snabbt. I LexiClash räknas varje ord, så små ord kan göra skillnaden mellan vinst och förlust.' },
    ],
    toolsHub: {
      title: 'LexiClash-verktyg',
      description: 'Gratis ordspelsverktyg för att förbättra dina färdigheter',
      wordSolverCard: 'Ordlösare',
      wordSolverDesc: 'Hitta alla möjliga ord från dina bokstäver. Anagramlösare och ordavkodare.',
      comingSoon: 'Fler verktyg kommer snart!',
    },
  },
  ja: {
    title: 'ワードソルバー＆アナグラムファインダー',
    subtitle: '文字を解読してすべての可能な単語を見つけよう',
    description:
      '無料オンラインアナグラムソルバーとワードアンスクランブラー。文字を入力してすべての可能な単語を瞬時に見つけましょう。LexiClashに最適です。',
    metaDescription:
      '無料アナグラムソルバーとワードファインダー。文字を解読してすべての可能な単語を見つけましょう。今すぐお試しください！',
    inputPlaceholder: '文字を入力（例：AELRST）',
    inputLabel: 'あなたの文字',
    languageLabel: '辞書の言語',
    solveButton: '単語を検索',
    searchingText: '検索中...',
    clearButton: 'クリア',
    resultsTitle: '見つかった単語',
    noResults: '単語が見つかりませんでした。別の文字を試してください！',
    wordsFound: '個の単語が見つかりました',
    showingFirst: '最初の',
    letterWords: '文字の単語',
    ctaTitle: 'もっと速く単語を見つける練習をしよう',
    ctaButton: 'LexiClashを無料でプレイ',
    ctaDescription: 'リアルタイムのワードバトルで友達に挑戦。脳を鍛えよう！',
    fullDictionaryNote: '500以上の一般的な単語リストから結果を表示。完全な辞書はLexiClashでプレイ！',
    howToTitle: 'ワードソルバーの使い方',
    howToSteps: [
      '上の入力フィールドに利用可能な文字を入力またはペーストしてください。',
      '「単語を検索」をクリックするかEnterキーを押して検索します。',
      '単語の長さ別にグループ化された結果を確認します。',
      '結果を使って、ゲームで見逃した単語を発見しましょう。',
      '「LexiClashをプレイ」をクリックして、制限時間内で単語探しの練習をしましょう！',
    ],
    tipsTitle: 'ワードゲームのコツ',
    faqTitle: 'よくある質問',
    faqs: [
      { question: '7文字からいくつの単語が作れますか？', answer: '7つのランダムな文字から、通常20〜80個の有効な英単語を作ることができます。当ソルバーはすべての可能性を瞬時に見つけます。' },
      { question: 'アナグラムソルバーとは？', answer: 'アナグラムソルバーは文字のセットから、それらを使って作れるすべての有効な単語を見つけるツールです。' },
      { question: 'スクラブルなどに使えますか？', answer: 'はい！このワードファインダーはScrabble、Boggle、LexiClashなどすべてのワードゲームで使えます。' },
      { question: 'なぜ一部の単語が結果にないのですか？', answer: '無料ツールは500以上の一般的な単語リストを使用しています。完全な辞書はLexiClashで！' },
      { question: '単語探しが上手くなるには？', answer: 'LexiClashのような時間制限付きワードゲームで定期的に練習しましょう。一般的な接頭辞と接尾辞を探しましょう。' },
    ],
    tips: [
      { title: '母音と一般的な子音から始めよう', body: 'スクランブルされた文字をスキャンする際、まず母音と高頻度の子音を特定しましょう。これらはほとんどの単語の基盤となります。各母音を周囲の子音と組み合わせて、まず短い単語を見つけましょう。' },
      { title: '一般的なパターンを探そう', body: '頻出する文字パターンやよくある語尾を認識する目を養いましょう。利用可能な文字の中にそれらを見つけたら、逆算して元の単語を見つけましょう。' },
      { title: '接頭辞で単語を増やそう', body: '一般的な接頭辞は1つの単語を複数の有効なエントリに変換できます。この戦略は競争ゲームでの単語数を2倍、3倍にできます。' },
      { title: '毎日のパズルで練習しよう', body: '一貫した練習がアナグラム解読スキルを向上させる最速の方法です。LexiClashは制限時間内に単語を見つける能力を試すデイリーチャレンジを提供しています。' },
      { title: '文字の組み合わせで考えよう', body: '完全な単語を一度に見ようとする代わりに、2〜3文字の組み合わせを見つける訓練をしましょう。これらの構成要素がランダムな文字から単語をより速く組み立てるのに役立ちます。' },
      { title: '短い単語を見逃さないで', body: 'ワードゲームでは、短い2〜3文字の単語が素早く積み重なります。LexiClashではすべての単語がスコアにカウントされるので、小さな単語が勝敗を分けることがあります。' },
    ],
    toolsHub: {
      title: 'LexiClashツール',
      description: 'スキルを磨く無料ワードゲームツール',
      wordSolverCard: 'ワードソルバー',
      wordSolverDesc: '文字からすべての可能な単語を見つけます。アナグラムソルバーとワードアンスクランブラー。',
      comingSoon: 'その他のツールは近日公開！',
    },
  },
  es: {
    title: 'Buscador de Palabras y Anagramas',
    subtitle: 'Descifra letras y encuentra todas las palabras posibles',
    description:
      'Solucionador de anagramas y descifrador de palabras gratuito en línea. Ingresa tus letras y encuentra todas las palabras posibles al instante. Perfecto para Scrabble, Boggle y LexiClash.',
    metaDescription:
      'Solucionador de anagramas y buscador de palabras gratis. Descifra letras para encontrar todas las palabras posibles. ¡Prueba nuestro descifrador ahora!',
    inputPlaceholder: 'Ingresa tus letras (ej. AELRST)',
    inputLabel: 'Tus letras',
    languageLabel: 'Idioma del diccionario',
    solveButton: 'Buscar palabras',
    searchingText: 'Buscando...',
    clearButton: 'Limpiar',
    resultsTitle: 'Palabras encontradas',
    noResults: '¡No se encontraron palabras. Prueba con otras letras!',
    wordsFound: 'palabras encontradas',
    showingFirst: 'mostrando primeras',
    letterWords: ' letras',
    ctaTitle: 'Practica encontrar palabras más rápido',
    ctaButton: 'Juega LexiClash gratis',
    ctaDescription: '¡Desafía a amigos en batallas de palabras en tiempo real. Entrena tu cerebro!',
    fullDictionaryNote: 'Mostrando resultados de una lista de 500+ palabras comunes. ¡Para el diccionario completo, juega LexiClash!',
    howToTitle: 'Cómo usar el buscador de palabras',
    howToSteps: [
      'Escribe o pega tus letras disponibles en el campo de entrada.',
      'Haz clic en "Buscar palabras" o presiona Enter.',
      'Explora los resultados agrupados por longitud de palabra.',
      'Usa los resultados para descubrir palabras que pudiste haber pasado por alto.',
      '¡Haz clic en "Jugar LexiClash" para practicar bajo presión de tiempo!',
    ],
    tipsTitle: 'Consejos para juegos de palabras',
    faqTitle: 'Preguntas frecuentes',
    faqs: [
      { question: '¿Cuántas palabras se pueden formar con 7 letras?', answer: 'Con 7 letras aleatorias, normalmente puedes formar entre 20 y 80 palabras válidas en inglés. Nuestro solucionador encuentra todas las posibilidades al instante.' },
      { question: '¿Qué es un solucionador de anagramas?', answer: 'Un solucionador de anagramas toma un conjunto de letras y encuentra todas las palabras válidas que se pueden formar con ellas.' },
      { question: '¿Puedo usarlo para Scrabble?', answer: '¡Sí! Este buscador de palabras funciona para todos los juegos de palabras incluyendo Scrabble, Boggle y LexiClash.' },
      { question: '¿Por qué faltan algunas palabras?', answer: 'Nuestra herramienta gratuita usa una lista de 500+ palabras comunes. ¡Para el diccionario completo, juega LexiClash!' },
      { question: '¿Cómo mejorar en encontrar palabras?', answer: 'Practica regularmente con juegos de palabras cronometrados como LexiClash. Busca prefijos y sufijos comunes.' },
    ],
    tips: [
      { title: 'Comienza con vocales y consonantes comunes', body: 'Al escanear letras desordenadas, primero identifica tus vocales y consonantes de alta frecuencia. Estas forman la base de la mayoría de las palabras. Intenta emparejar cada vocal con consonantes cercanas para encontrar palabras cortas primero.' },
      { title: 'Busca patrones comunes', body: 'Entrena tu ojo para reconocer patrones de letras frecuentes y terminaciones comunes. Si los ves entre tus letras disponibles, trabaja hacia atrás para encontrar la palabra raíz.' },
      { title: 'Usa prefijos para multiplicar palabras', body: 'Los prefijos comunes pueden transformar una sola palabra en múltiples entradas válidas. Esta estrategia puede duplicar o triplicar tu conteo de palabras en juegos competitivos.' },
      { title: 'Practica con puzzles diarios', body: 'La práctica constante es la forma más rápida de mejorar tus habilidades. LexiClash ofrece desafíos diarios que ponen a prueba tu capacidad para encontrar palabras bajo presión de tiempo.' },
      { title: 'Piensa en combinaciones de letras', body: 'En lugar de intentar ver palabras completas, entrénate para detectar combinaciones de 2-3 letras. Estos bloques de construcción te ayudan a ensamblar palabras más rápidamente.' },
      { title: 'No ignores las palabras cortas', body: 'En juegos de palabras, las palabras cortas de 2-3 letras se acumulan rápido. En LexiClash cada palabra cuenta para tu puntuación, así que las palabras pequeñas pueden marcar la diferencia.' },
    ],
    toolsHub: {
      title: 'Herramientas LexiClash',
      description: 'Herramientas gratuitas para mejorar tus habilidades',
      wordSolverCard: 'Buscador de Palabras',
      wordSolverDesc: 'Encuentra todas las palabras posibles con tus letras. Solucionador de anagramas.',
      comingSoon: '¡Más herramientas próximamente!',
    },
  },
  ru: {
    title: 'Решатель слов и искатель анаграмм',
    subtitle: 'Расшифруй буквы и найди все возможные слова',
    description: 'Бесплатный онлайн-решатель анаграмм. Введи свои буквы и мгновенно найди все возможные слова. Идеально для Scrabble, Boggle, Words With Friends и LexiClash.',
    metaDescription: 'Бесплатный решатель анаграмм и искатель слов. Расшифруй буквы, чтобы найти все возможные слова. Работает для Scrabble, Boggle, Words With Friends.',
    inputPlaceholder: 'Введи свои буквы (например АБВГДЕ)',
    inputLabel: 'Твои буквы',
    languageLabel: 'Язык словаря',
    solveButton: 'Найти слова',
    searchingText: 'Поиск...',
    clearButton: 'Очистить',
    resultsTitle: 'Найдены слова',
    noResults: 'Слова не найдены. Попробуй другие буквы!',
    wordsFound: 'слов найдено',
    showingFirst: 'показываем первые',
    letterWords: '-буквенные слова',
    ctaTitle: 'Практикуйся находить слова быстрее',
    ctaButton: 'Играй в LexiClash бесплатно',
    ctaDescription: 'Вызывай друзей на боевые слои в реальном времени. Тренируй свой мозг!',
    fullDictionaryNote: 'Показываются результаты из списка 500+ частых русских слов. Для полного словаря играй в LexiClash!',
    howToTitle: 'Как использовать решатель слов',
    howToSteps: [
      'Введи или вставь свои доступные буквы в поле ввода.',
      'Нажми "Найти слова" или нажми Enter.',
      'Просмотри результаты, отсортированные по длине слова.',
      'Используй результаты для открытия слов, которые ты мог пропустить.',
      'Нажми "Играй в LexiClash", чтобы практиковаться под давлением времени!',
    ],
    tipsTitle: 'Советы для словесных игр',
    faqTitle: 'Часто задаваемые вопросы',
    faqs: [
      { question: 'Сколько слов можно составить из 7 букв?', answer: 'Из 7 случайных букв обычно можно составить от 20 до 80 действительных русских слов, в зависимости от комбинации букв. Наш решатель находит все возможности мгновенно.' },
      { question: 'Что такое решатель анаграмм?', answer: 'Решатель анаграмм берет набор букв и находит все действительные слова, которые можно составить из этих букв.' },
      { question: 'Могу ли я использовать это для Scrabble?', answer: 'Да! Этот искатель слов работает для всех словесных игр, включая Scrabble, Boggle и LexiClash.' },
      { question: 'Почему отсутствуют некоторые слова?', answer: 'Наш бесплатный инструмент использует список 500+ частых русских слов. Для полного словаря играй в LexiClash!' },
      { question: 'Как улучшить навыки поиска слов?', answer: 'Занимайся регулярно с помощью словесных игр с таймером, таких как LexiClash. Ищи распространенные префиксы и суффиксы.' },
    ],
    tips: [
      { title: 'Начни с гласных и частых согласных', body: 'При сканировании перепутанных букв сначала найди свои гласные и согласные с высокой частотой. Они образуют основу большинства слов. Попробуй сначала найти короткие слова.' },
      { title: 'Ищи частые узоры', body: 'Тренируй свой взгляд распознавать частые узоры букв и общие окончания. Если ты видишь их среди доступных букв, ищи корневое слово.' },
      { title: 'Используй префиксы для увеличения количества слов', body: 'Распространенные префиксы могут превратить одно слово в несколько действительных записей. Эта стратегия может удвоить или утроить твое количество слов в соревновательных играх.' },
      { title: 'Практикуйся с ежедневными головоломками', body: 'Постоянная практика - самый быстрый способ улучшить свои навыки. LexiClash предлагает ежедневные вызовы, которые испытывают твою способность находить слова под давлением времени.' },
      { title: 'Думай о комбинациях букв', body: 'Вместо того чтобы пытаться увидеть полные слова, тренируй себя обнаруживать комбинации из 2-3 букв. Эти строительные блоки помогают быстрее составлять слова.' },
      { title: 'Не игнорируй короткие слова', body: 'В словесных играх короткие слова из 2-3 букв быстро накапливаются. В LexiClash каждое слово считается для твоего счета, поэтому маленькие слова могут иметь значение.' },
    ],
    toolsHub: {
      title: 'Инструменты LexiClash',
      description: 'Бесплатные инструменты для улучшения своих навыков',
      wordSolverCard: 'Решатель слов',
      wordSolverDesc: 'Найди все возможные слова из своих букв. Решатель анаграмм.',
      comingSoon: 'Скоро еще инструменты!',
    },
  },
};

export function getContent(locale: string): ToolContent {
  return content[(locale in content ? locale : 'en') as Locale];
}
