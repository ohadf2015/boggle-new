// Homepage FAQPage JSON-LD.
// Must appear on exactly one URL per locale (the homepage). Emitting this on
// every route via root layout causes Google "Duplicate field 'FAQPage'" when
// landing pages (e.g. lexiclash-vs-wordle) emit their own FAQPage.

const SUPPORTED = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

export function buildHomepageFaqJsonLd(locale: string) {
  const lang = SUPPORTED.has(locale) ? locale : 'en';
  const localePath = `/${lang}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `https://www.lexiclash.live${localePath}#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: lang === 'he'
          ? 'האם אפשר לשחק בוגל אונליין בחינם?'
          : lang === 'ru'
            ? 'Можно ли играть в бизнес-игры онлайн бесплатно?'
            : 'Can I play boggle online free with no download?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: lang === 'he'
            ? 'כן! לקסיקלאש מאפשר לשחק בוגל אונליין בחינם ללא הורדה וללא הרשמה. פשוט גלשו ל-lexiclash.live והתחילו לשחק מיד בכל מכשיר.'
            : lang === 'ru'
              ? 'Да! LexiClash позволяет играть в слова онлайн совершенно бесплатно без скачивания и регистрации. Просто зайди на lexiclash.live и начни играть прямо в браузере на любом устройстве.'
              : 'Yes! LexiClash lets you play boggle online completely free with no download and no signup. Just visit lexiclash.live and start playing instantly on any device.',
        },
      },
      {
        '@type': 'Question',
        name: lang === 'he'
          ? 'האם זה כמו Words With Friends?'
          : lang === 'ru'
            ? 'Это как Words With Friends, но для нескольких игроков?'
            : 'Is this like Words With Friends but multiplayer?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: lang === 'he'
            ? 'לקסיקלאש שונה מ-Words With Friends כי כולם משחקים בו-זמנית בזמן אמת במקום בתורות. 2-20+ שחקנים יכולים להתחרות על אותו לוח. מהיר יותר, מרגש יותר ומושלם לקבוצות.'
            : lang === 'ru'
              ? 'LexiClash отличается от Words With Friends тем, что все играют одновременно в реальном времени, а не по очереди. 2-20+ игроков могут соревноваться на одной доске. Быстрее, интереснее и идеально для компаний.'
              : 'LexiClash is different from Words With Friends because everyone plays simultaneously in real-time instead of taking turns. 2-20+ players can compete on the same grid. Faster, more exciting, and perfect for groups.',
        },
      },
      {
        '@type': 'Question',
        name: lang === 'he'
          ? 'האם המשחק חינם?'
          : lang === 'ru'
            ? 'LexiClash бесплатно?'
            : 'Is LexiClash free to play?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: lang === 'he'
            ? 'כן, לקסיקלאש חינם לחלוטין. ללא מנוי, ללא רכישות בתוך האפליקציה. פשוט גלשו ל-lexiclash.live והתחילו לשחק.'
            : lang === 'ru'
              ? 'Да, LexiClash полностью бесплатно. Без подписки, без покупок внутри игры. Просто зайди на lexiclash.live и начни играть.'
              : 'Yes, LexiClash is completely free. No subscription, no in-app purchases. Just visit lexiclash.live and start playing.',
        },
      },
      {
        '@type': 'Question',
        name: lang === 'he'
          ? 'איך משחקים עם חברים?'
          : lang === 'ru'
            ? 'Как играть в словесные игры с друзьями онлайн?'
            : 'How do I play word games with friends online?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: lang === 'he'
            ? 'צרו חדר, שתפו את הלינק עם חברים דרך וואטסאפ, דיסקורד או כל מסנג\'ר. חברים לוחצים על הלינק ומצטרפים מיד — ללא הרשמה או הורדה. עד 20+ שחקנים בחדר אחד.'
            : lang === 'ru'
              ? 'Создай комнату, отправь ссылку друзьям через WhatsApp, Discord или мессенджер. Они переходят по ссылке и сразу присоединяются — без регистрации и скачивания. До 20+ игроков в одной комнате.'
              : 'Create a room, share the link with friends via WhatsApp, Discord, or any messenger. Friends click the link and join instantly — no signup or download needed. Up to 20+ players per room.',
        },
      },
      {
        '@type': 'Question',
        name: lang === 'he'
          ? 'מה זה גלגל המילה היומית?'
          : lang === 'ja'
            ? 'デイリーワードホイールとは？'
            : lang === 'sv'
              ? 'Vad är Dagligt Ordhjul?'
              : lang === 'es'
                ? '¿Qué es la Rueda de Palabras diaria?'
                : lang === 'ru'
                  ? 'Что такое ежедневное Колесо Слов?'
                  : 'What is the Daily Word Wheel?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: lang === 'he'
            ? 'גלגל המילה היומית הוא פאזל חינמי חדש מדי יום: גלגל של אותיות שממנו יוצרים כמה שיותר מילים, כאשר כל מילה חייבת לכלול את האות המרכזית. כל העולם מקבל את אותו הגלגל בחצות UTC. ללא הורדה, ללא הרשמה — שחקו בדפדפן ושתפו תוצאות כמו Wordle.'
            : lang === 'ja'
              ? 'デイリーワードホイールは毎日新しい無料パズル。文字のホイールから単語を作り、すべての単語に中心文字を含める必要があります。全プレイヤーが世界中でUTC午前0時に同じホイールを受け取ります。ダウンロード・登録不要、ブラウザでプレイし、Wordleのように結果を共有できます。'
              : lang === 'sv'
                ? 'Dagligt Ordhjul är ett gratis ordpussel som förnyas varje dag: ett hjul med bokstäver där du bildar så många ord som möjligt, och varje ord måste innehålla mittbokstaven. Alla spelare världen över får samma hjul vid midnatt UTC. Ingen nedladdning, ingen registrering — spela i webbläsaren och dela resultat som Wordle.'
                : lang === 'es'
                  ? 'La Rueda de Palabras diaria es un puzzle gratuito nuevo cada día: una rueda de letras donde formas la mayor cantidad de palabras posible, y cada palabra debe incluir la letra central. Todos los jugadores del mundo reciben la misma rueda a medianoche UTC. Sin descargas, sin registro — juega en el navegador y comparte resultados como Wordle.'
                  : lang === 'ru'
                    ? 'Ежедневное Колесо Слов — это бесплатный новый паззл каждый день: колесо с буквами, из которых составляешь как можно больше слов, и каждое слово должно содержать центральную букву. Все игроки мира получают одно и то же колесо в полночь UTC. Без скачивания, без регистрации — играй в браузере и делись результатами как в Wordle.'
                    : 'The Daily Word Wheel is a free daily word puzzle: a wheel of letters where you form as many words as possible, and every word must include the center letter. All players worldwide get the same wheel at midnight UTC. No download, no signup — play in your browser and share results like Wordle.',
        },
      },
      {
        '@type': 'Question',
        name: lang === 'he'
          ? 'מה זה Word Hunt (חיפוש מילים)?'
          : lang === 'ja'
            ? 'ワードハントとは？'
            : lang === 'sv'
              ? 'Vad är Word Hunt (Ordjakt)?'
              : lang === 'es'
                ? '¿Qué es Word Hunt (Caza de Palabras)?'
                : lang === 'ru'
                  ? 'Что такое Word Hunt (Охота на Слова)?'
                  : 'What is Word Hunt?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: lang === 'he'
            ? 'Word Hunt הוא פאזל חיפוש מילים יומי: יש לכם 10 ניסיונות למצוא את המילה המוסתרת בלוח. כל העולם מקבל את אותו הלוח בחצות UTC. שתפו תוצאות אימוג\'י כמו Wordle. שחקו חינם בלקסיקלאש — ללא הורדה, ללא הרשמה.'
            : lang === 'ja'
              ? 'ワードハントは毎日のワードサーチパズルです。10回の試行で隠された単語を見つけます。全プレイヤーが世界中でUTC午前0時に同じボードを受け取ります。Wordleのように絵文字で結果を共有できます。LexiClashで無料でプレイ — ダウンロード・登録不要。'
              : lang === 'sv'
                ? 'Word Hunt är ett dagligt ordpussel: du har 10 försök att hitta det dolda ordet på brädet. Alla spelare världen över får samma bräde vid midnatt UTC. Dela emoji-resultat som Wordle. Spela gratis på LexiClash — ingen nedladdning, ingen registrering.'
                : lang === 'es'
                  ? 'Word Hunt es un puzzle diario de búsqueda de palabras: tienes 10 intentos para encontrar la palabra oculta en el tablero. Todos los jugadores del mundo reciben el mismo tablero a medianoche UTC. Comparte resultados emoji como Wordle. Juega gratis en LexiClash — sin descargas, sin registro.'
                  : lang === 'ru'
                    ? 'Word Hunt — ежедневный паззл поиска слов: у тебя есть 10 попыток найти скрытое слово на доске. Все игроки мира получают одну и ту же доску в полночь UTC. Делись результатами эмодзи как в Wordle. Играй бесплатно в LexiClash — без скачивания и регистрации.'
                    : 'Word Hunt is a daily word-search puzzle: you have 10 attempts to find the hidden word on the board. All players worldwide get the same board at midnight UTC. Share emoji results like Wordle. Play free on LexiClash — no download, no signup.',
        },
      },
      {
        '@type': 'Question',
        name: lang === 'he'
          ? 'מה הם משחקי המילים הטובים ביותר אונליין ב-2026?'
          : lang === 'ja'
            ? '2026年のおすすめ無料オンラインワードゲームは？'
            : lang === 'sv'
              ? 'Vilka är de bästa gratis ordspelen online 2026?'
              : lang === 'es'
                ? '¿Cuáles son los mejores juegos de palabras gratuitos en línea en 2026?'
                : lang === 'ru'
                  ? 'Какие лучшие бесплатные словесные игры онлайн в 2026?'
                  : 'What are the best free online word games in 2026?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: lang === 'he'
            ? 'לקסיקלאש מציע חמישה משחקי מילים חינמיים שניתן לשחק בכל דפדפן ללא הורדה: קלאסיק (בוגל בזמן אמת ל-2–50 שחקנים), גלגל המילה היומית (פאזל יומי משותף), Word Hunt (חיפוש מילים יומי), Word Forge (בניית מילים בלחץ זמן), ו-Blast (ספרינט ניקוי קוביות). ללא הרשמה, בחמש שפות כולל עברית.'
            : lang === 'ja'
              ? 'LexiClashはダウンロード・登録不要でブラウザから無料プレイできる5つのワードゲームを提供しています。Classic（2〜50人リアルタイムBoggle）、デイリーワードホイール（毎日更新の共有パズル）、ワードハント（毎日の単語探し）、ワードフォージ（制限時間内の単語構築）、Blast（タイルクリアスプリント）。日本語を含む5言語対応。'
              : lang === 'sv'
                ? 'LexiClash erbjuder fem gratis ordspel som spelas direkt i webbläsaren utan nedladdning: Classic (Boggle i realtid för 2–50 spelare), Dagligt Ordhjul (ett dagligt delat ordpussel), Word Hunt (daglig ordsökning), Word Forge (snabbt ordbyggarläge) och Blast (sprintläge med brickrensning). Inget konto krävs, tillgängligt på fem språk inklusive svenska.'
                : lang === 'es'
                  ? 'LexiClash ofrece cinco juegos de palabras gratuitos que se juegan en el navegador sin descargas: Classic (Boggle en tiempo real para 2–50 jugadores), Rueda de Palabras Diaria (puzzle diario compartido), Word Hunt (búsqueda de palabras diaria), Word Forge (construcción rápida de palabras) y Blast (sprint de limpieza de fichas). Sin registro, en cinco idiomas incluyendo español.'
                  : lang === 'ru'
                    ? 'LexiClash предлагает пять бесплатных словесных игр, которые можно играть в любом браузере без скачивания: Classic (Boggle в реальном времени для 2–50 игроков), Daily Word Wheel (ежедневный общий паззл), Word Hunt (ежедневный поиск слов), Word Forge (быстрое составление слов) и Blast (спринт по очистке плиток). Без регистрации, на шести языках включая русский.'
                    : 'LexiClash has five free word games playable in any browser with no download or signup: Classic (real-time Boggle for 2–50 players), Daily Word Wheel (a shared daily puzzle), Word Hunt (a daily word-search challenge), Word Forge (a speed word-building mode), and Blast (a tile-clearing sprint). Five languages, no account required.',
        },
      },
    ],
  };
}
