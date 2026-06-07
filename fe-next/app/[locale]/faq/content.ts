// FAQ page content — server-renderable for SEO
// Answers must be in HTML so Google crawler sees them without accordion interaction

export type FAQItem = {
  question: string;
  answer: string;
  category: string;
};

export type FAQContent = {
  title: string;
  subtitle: string;
  back: string;
  stillHaveQuestions: string;
  hereToHelp: string;
  contactUs: string;
  learnMore: string;
  blogCta: string;
  blogScienceTitle: string;
  blogStrategiesTitle: string;
  blogViewAll: string;
  categories: {
    gettingStarted: string;
    gameplay: string;
    technical: string;
    account: string;
    privacy: string;
  };
  items: FAQItem[];
};

export const contentByLocale: Record<string, FAQContent> = {
  en: {
    title: 'FAQ',
    subtitle: 'Frequently Asked Questions',
    back: 'Back',
    stillHaveQuestions: 'Still have questions?',
    hereToHelp: "We're here to help! Reach out to us anytime.",
    contactUs: 'Contact Us',
    learnMore: 'Want to learn more?',
    blogCta: 'Check out our blog for tips, strategies, and the science behind word games.',
    blogScienceTitle: 'The Science Behind Word Games',
    blogStrategiesTitle: 'Daily Challenge Strategies',
    blogViewAll: 'View all posts →',
    categories: {
      gettingStarted: 'Getting Started',
      gameplay: 'Gameplay',
      technical: 'Technical',
      account: 'Account',
      privacy: 'Privacy & Safety',
    },
    items: [
      {
        category: 'gettingStarted',
        question: 'What is LexiClash?',
        answer: 'LexiClash is a multiplayer word game where you compete against friends or AI opponents to find words on a shared board. Play solo, challenge daily puzzles, or compete in real-time multiplayer matches across Hebrew, English, Swedish, Japanese, and Spanish.',
      },
      {
        category: 'gettingStarted',
        question: 'How do I create an account?',
        answer: 'You can play as a guest or create an account using Google Sign-In. Having an account lets you save your progress, track statistics, compete on leaderboards, and play across devices.',
      },
      {
        category: 'gettingStarted',
        question: 'Is LexiClash free to play?',
        answer: 'Yes! LexiClash is completely free to play. All game modes including singleplayer, multiplayer, and daily challenges are available at no cost.',
      },
      {
        category: 'gameplay',
        question: 'How do I score points?',
        answer: 'Points are awarded based on word length and letter values. Longer words score more points. Rare letters like Q, Z, and X have higher values. Bonus points are awarded for finding all words on the board.',
      },
      {
        category: 'gameplay',
        question: 'What game modes are available?',
        answer: 'LexiClash offers three main modes: (1) Singleplayer - practice against AI with various difficulty levels, (2) Multiplayer - real-time matches against other players, (3) Daily Challenge - compete on the same puzzle as players worldwide.',
      },
      {
        category: 'gameplay',
        question: 'How does the Daily Challenge work?',
        answer: 'Every day at midnight UTC, a new puzzle is generated that all players worldwide can attempt. You get one chance per day to find as many words as possible. Your score is recorded on the daily leaderboard.',
      },
      {
        category: 'gameplay',
        question: 'Can I play in multiple languages?',
        answer: 'Yes! LexiClash supports Hebrew, English, Swedish, Japanese, and Spanish. You can switch languages in Settings. Each language has its own word dictionary and leaderboards.',
      },
      {
        category: 'technical',
        question: 'Which devices are supported?',
        answer: 'LexiClash works on all modern devices including desktop computers, tablets, and smartphones. We support the latest versions of Chrome, Firefox, Safari, and Edge browsers.',
      },
      {
        category: 'technical',
        question: 'Do I need an internet connection to play?',
        answer: 'Yes, an internet connection is required for multiplayer and daily challenges. However, you can play singleplayer mode offline if you have previously loaded the game.',
      },
      {
        category: 'technical',
        question: 'How do I report a bug or technical issue?',
        answer: 'If you encounter a bug, please contact us at lexiclash.game@gmail.com or reach out on Instagram @lexi.clash. Include details about what happened and which device/browser you were using.',
      },
      {
        category: 'account',
        question: 'How do I change my username or profile?',
        answer: 'Go to Settings (gear icon in the header) and navigate to the Profile section. You can update your username, avatar, and other profile details there.',
      },
      {
        category: 'account',
        question: 'Can I play on multiple devices?',
        answer: 'Yes! If you create an account using Google Sign-In, your progress, statistics, and settings sync automatically across all your devices.',
      },
      {
        category: 'account',
        question: 'How do I delete my account?',
        answer: 'To delete your account, go to Settings > Account > Delete Account. This action is permanent and will erase all your data including statistics, achievements, and game history.',
      },
      {
        category: 'privacy',
        question: 'Is my data safe?',
        answer: 'Yes. We take privacy seriously and only collect necessary data to operate the game. We use industry-standard encryption and never sell your personal information. See our Privacy Policy for full details.',
      },
      {
        category: 'privacy',
        question: 'Does LexiClash show ads?',
        answer: 'We partner with Google AdMob to display relevant advertisements. Ads help us keep the game free for everyone. You can learn more about ad personalization and opt-out options in our Privacy Policy.',
      },
      {
        category: 'privacy',
        question: 'Can I opt out of data collection?',
        answer: 'While some data collection is necessary for the game to function (like your username and scores), you can opt out of analytics and personalized ads in Settings > Privacy.',
      },
    ],
  },
  he: {
    title: 'שאלות נפוצות',
    subtitle: 'שאלות ותשובות נפוצות',
    back: 'חזרה',
    stillHaveQuestions: 'עדיין יש לך שאלות?',
    hereToHelp: 'אנחנו כאן כדי לעזור! פנו אלינו בכל עת.',
    contactUs: 'צרו קשר',
    learnMore: 'רוצים ללמוד עוד?',
    blogCta: 'בקרו בבלוג שלנו לטיפים, אסטרטגיות והמדע שמאחורי משחקי מילים.',
    blogScienceTitle: 'המדע שמאחורי משחקי מילים',
    blogStrategiesTitle: 'אסטרטגיות לאתגר היומי',
    blogViewAll: 'כל הפוסטים ←',
    categories: {
      gettingStarted: 'מתחילים',
      gameplay: 'משחק',
      technical: 'טכני',
      account: 'חשבון',
      privacy: 'פרטיות ובטיחות',
    },
    items: [
      {
        category: 'gettingStarted',
        question: 'מה זה LexiClash?',
        answer: 'LexiClash הוא משחק מילים מרובה משתתפים שבו מתחרים מול חברים או מול יריבי מחשב כדי למצוא מילים על לוח משותף. אפשר לשחק לבד, להתמודד באתגר היומי, או להתחרות בזמן אמת — בעברית, אנגלית, שוודית, יפנית וספרדית.',
      },
      {
        category: 'gettingStarted',
        question: 'איך יוצרים חשבון?',
        answer: 'אפשר לשחק כאורח או ליצור חשבון באמצעות התחברות עם Google. חשבון מאפשר לשמור את ההתקדמות, לעקוב אחר סטטיסטיקות, להתחרות בטבלאות מובילים ולשחק ממכשירים שונים.',
      },
      {
        category: 'gettingStarted',
        question: 'האם LexiClash בחינם?',
        answer: 'כן! LexiClash הוא לגמרי בחינם. כל מצבי המשחק כולל יחיד, מרובה משתתפים ואתגרים יומיים זמינים ללא עלות.',
      },
      {
        category: 'gameplay',
        question: 'איך צוברים נקודות?',
        answer: 'צוברים נקודות לפי אורך המילה וערך האותיות: ככל שהמילה ארוכה יותר היא שווה יותר, ואותיות נדירות שוות יותר. מי שמוצא את כל המילים בלוח מקבל בונוס.',
      },
      {
        category: 'gameplay',
        question: 'אילו מצבי משחק קיימים?',
        answer: 'LexiClash מציע שלושה מצבים עיקריים: (1) יחיד - אימון נגד AI ברמות קושי שונות, (2) מרובה משתתפים - משחקים בזמן אמת נגד שחקנים אחרים, (3) אתגר יומי - התחרות על אותה חידה כמו שחקנים ברחבי העולם.',
      },
      {
        category: 'gameplay',
        question: 'איך עובד האתגר היומי?',
        answer: 'כל יום בחצות UTC נוצרת חידה חדשה שכל השחקנים בעולם יכולים לנסות. יש לכם הזדמנות אחת ביום למצוא כמה שיותר מילים. הציון שלכם נרשם בטבלת המובילים היומית.',
      },
      {
        category: 'gameplay',
        question: 'אפשר לשחק בכמה שפות?',
        answer: 'כן! LexiClash תומך בעברית, אנגלית, שוודית, יפנית וספרדית. מחליפים שפה בהגדרות, ולכל שפה יש מילון משלה וטבלאות מובילים נפרדות.',
      },
      {
        category: 'technical',
        question: 'אילו מכשירים נתמכים?',
        answer: 'LexiClash עובד על כל המכשירים המודרניים כולל מחשבים שולחניים, טאבלטים וסמארטפונים. אנחנו תומכים בגרסאות האחרונות של Chrome, Firefox, Safari ו-Edge.',
      },
      {
        category: 'technical',
        question: 'צריך חיבור לאינטרנט כדי לשחק?',
        answer: 'למשחק מרובה משתתפים ולאתגר היומי צריך חיבור לאינטרנט. את מצב היחיד אפשר לשחק גם בלי חיבור, אם כבר פתחתם את המשחק קודם.',
      },
      {
        category: 'technical',
        question: 'איך מדווחים על באג או בעיה טכנית?',
        answer: 'נתקלתם בבאג? כתבו לנו ל-lexiclash.game@gmail.com או באינסטגרם @lexi.clash. ספרו מה קרה ובאיזה מכשיר ודפדפן הייתם — זה עוזר לנו לאתר את הבעיה מהר.',
      },
      {
        category: 'account',
        question: 'איך משנים שם משתמש או פרופיל?',
        answer: 'נכנסים להגדרות (אייקון גלגל השיניים למעלה) ועוברים לחלק הפרופיל. שם אפשר לעדכן את שם המשתמש, האווטאר ושאר הפרטים.',
      },
      {
        category: 'account',
        question: 'אפשר לשחק ממספר מכשירים?',
        answer: 'כן! אם יצרתם חשבון באמצעות התחברות עם Google, ההתקדמות, הסטטיסטיקות וההגדרות מסתנכרנים אוטומטית בין כל המכשירים.',
      },
      {
        category: 'account',
        question: 'איך מוחקים חשבון?',
        answer: 'למחיקת חשבון, עברו להגדרות > חשבון > מחיקת חשבון. פעולה זו היא בלתי הפיכה ותמחק את כל הנתונים כולל סטטיסטיקות, הישגים והיסטוריית משחקים.',
      },
      {
        category: 'privacy',
        question: 'האם המידע שלי בטוח?',
        answer: 'כן. אנחנו מתייחסים לפרטיות ברצינות ואוספים רק מידע הכרחי להפעלת המשחק. אנחנו משתמשים בהצפנה תקנית ולעולם לא מוכרים את המידע האישי שלכם. ראו את מדיניות הפרטיות לפרטים מלאים.',
      },
      {
        category: 'privacy',
        question: 'האם LexiClash מציג פרסומות?',
        answer: 'אנחנו משתפים פעולה עם Google AdMob להצגת פרסומות רלוונטיות. פרסומות עוזרות לנו לשמור על המשחק חינמי לכולם. תוכלו ללמוד עוד על התאמת פרסומות ואפשרויות ביטול במדיניות הפרטיות.',
      },
      {
        category: 'privacy',
        question: 'אפשר לבטל איסוף נתונים?',
        answer: 'בעוד שחלק מאיסוף הנתונים הכרחי לתפקוד המשחק (כמו שם משתמש וציונים), אפשר לבטל אנליטיקס ופרסומות מותאמות אישית בהגדרות > פרטיות.',
      },
    ],
  },
  sv: {
    title: 'FAQ',
    subtitle: 'Vanliga frågor',
    back: 'Tillbaka',
    stillHaveQuestions: 'Har du fortfarande frågor?',
    hereToHelp: 'Vi finns här för att hjälpa! Kontakta oss när som helst.',
    contactUs: 'Kontakta oss',
    learnMore: 'Vill du veta mer?',
    blogCta: 'Kolla in vår blogg för tips, strategier och vetenskapen bakom ordspel.',
    blogScienceTitle: 'Vetenskapen bakom ordspel',
    blogStrategiesTitle: 'Strategier för dagliga utmaningen',
    blogViewAll: 'Visa alla inlägg →',
    categories: {
      gettingStarted: 'Kom igång',
      gameplay: 'Spelande',
      technical: 'Tekniskt',
      account: 'Konto',
      privacy: 'Integritet & säkerhet',
    },
    items: [
      {
        category: 'gettingStarted',
        question: 'Vad är LexiClash?',
        answer: 'LexiClash är ett ordspel för flera spelare där du tävlar mot vänner eller AI-motståndare om att hitta ord på en delad spelplan. Spela solo, utmana dagliga pussel eller tävla i realtid på hebreiska, engelska, svenska och japanska.',
      },
      {
        category: 'gettingStarted',
        question: 'Hur skapar jag ett konto?',
        answer: 'Du kan spela som gäst eller skapa ett konto med Google-inloggning. Med ett konto kan du spara framsteg, följa statistik, tävla på topplistor och spela på flera enheter.',
      },
      {
        category: 'gettingStarted',
        question: 'Är LexiClash gratis?',
        answer: 'Ja! LexiClash är helt gratis att spela. Alla spellägen inklusive enspelar, flerspelar och dagliga utmaningar är tillgängliga utan kostnad.',
      },
      {
        category: 'gameplay',
        question: 'Hur får jag poäng?',
        answer: 'Poäng ges baserat på ordlängd och bokstavsvärden. Längre ord ger fler poäng. Sällsynta bokstäver har högre värden. Bonus ges för att hitta alla ord på spelplanen.',
      },
      {
        category: 'gameplay',
        question: 'Vilka spellägen finns?',
        answer: 'LexiClash erbjuder tre huvudlägen: (1) Enspelar - träna mot AI med olika svårighetsgrader, (2) Flerspelar - matcher i realtid mot andra spelare, (3) Daglig utmaning - tävla på samma pussel som spelare världen över.',
      },
      {
        category: 'gameplay',
        question: 'Hur fungerar den dagliga utmaningen?',
        answer: 'Varje dag vid midnatt UTC genereras ett nytt pussel som alla spelare kan försöka lösa. Du har en chans per dag att hitta så många ord som möjligt. Din poäng registreras på den dagliga topplistan.',
      },
      {
        category: 'gameplay',
        question: 'Kan jag spela på flera språk?',
        answer: 'Ja! LexiClash stöder hebreiska, engelska, svenska och japanska. Du kan byta språk i Inställningar. Varje språk har sin egen ordbok och topplistor.',
      },
      {
        category: 'technical',
        question: 'Vilka enheter stöds?',
        answer: 'LexiClash fungerar på alla moderna enheter inklusive stationära datorer, surfplattor och smartphones. Vi stöder de senaste versionerna av Chrome, Firefox, Safari och Edge.',
      },
      {
        category: 'technical',
        question: 'Behöver jag internetanslutning för att spela?',
        answer: 'Ja, internetanslutning krävs för flerspelar och dagliga utmaningar. Du kan dock spela enspelarläge offline om du tidigare har laddat spelet.',
      },
      {
        category: 'technical',
        question: 'Hur rapporterar jag en bugg eller tekniskt problem?',
        answer: 'Om du stöter på en bugg, kontakta oss på lexiclash.game@gmail.com eller nå oss på Instagram @lexi.clash. Inkludera detaljer om vad som hände och vilken enhet/webbläsare du använde.',
      },
      {
        category: 'account',
        question: 'Hur ändrar jag mitt användarnamn eller profil?',
        answer: 'Gå till Inställningar (kugghjulsikonen i sidhuvudet) och navigera till profilsektionen. Där kan du uppdatera ditt användarnamn, avatar och andra profildetaljer.',
      },
      {
        category: 'account',
        question: 'Kan jag spela på flera enheter?',
        answer: 'Ja! Om du skapar ett konto med Google-inloggning synkroniseras dina framsteg, statistik och inställningar automatiskt mellan alla dina enheter.',
      },
      {
        category: 'account',
        question: 'Hur tar jag bort mitt konto?',
        answer: 'För att ta bort ditt konto, gå till Inställningar > Konto > Ta bort konto. Denna åtgärd är permanent och raderar all din data inklusive statistik, prestationer och spelhistorik.',
      },
      {
        category: 'privacy',
        question: 'Är min data säker?',
        answer: 'Ja. Vi tar integritet på allvar och samlar bara in nödvändig data för att driva spelet. Vi använder branschstandard kryptering och säljer aldrig din personliga information. Se vår integritetspolicy för fullständiga detaljer.',
      },
      {
        category: 'privacy',
        question: 'Visar LexiClash annonser?',
        answer: 'Vi samarbetar med Google AdMob för att visa relevanta annonser. Annonser hjälper oss att hålla spelet gratis för alla. Du kan läsa mer om annonsanpassning och alternativ i vår integritetspolicy.',
      },
      {
        category: 'privacy',
        question: 'Kan jag välja bort datainsamling?',
        answer: 'Viss datainsamling är nödvändig för att spelet ska fungera (som ditt användarnamn och poäng), men du kan välja bort analys och personliga annonser i Inställningar > Integritet.',
      },
    ],
  },
  ja: {
    title: 'よくある質問',
    subtitle: 'FAQ - よくある質問と回答',
    back: '戻る',
    stillHaveQuestions: 'まだ質問がありますか？',
    hereToHelp: 'いつでもお気軽にお問い合わせください。',
    contactUs: 'お問い合わせ',
    learnMore: 'もっと知りたいですか？',
    blogCta: 'ヒント、戦略、ワードゲームの科学についてブログをチェックしてください。',
    blogScienceTitle: 'ワードゲームの科学',
    blogStrategiesTitle: 'デイリーチャレンジ戦略',
    blogViewAll: 'すべての投稿を見る →',
    categories: {
      gettingStarted: 'はじめに',
      gameplay: 'ゲームプレイ',
      technical: '技術的な質問',
      account: 'アカウント',
      privacy: 'プライバシーと安全性',
    },
    items: [
      {
        category: 'gettingStarted',
        question: 'LexiClashとは？',
        answer: 'LexiClashは、友達やAI対戦相手と共有ボード上で単語を見つけるマルチプレイヤーワードゲームです。ソロプレイ、デイリーチャレンジ、ヘブライ語・英語・スウェーデン語・日本語でのリアルタイム対戦が楽しめます。',
      },
      {
        category: 'gettingStarted',
        question: 'アカウントの作成方法は？',
        answer: 'ゲストとしてプレイするか、Googleログインでアカウントを作成できます。アカウントがあれば、進捗の保存、統計の追跡、リーダーボードでの競争、複数デバイスでのプレイが可能です。',
      },
      {
        category: 'gettingStarted',
        question: 'LexiClashは無料ですか？',
        answer: 'はい！LexiClashは完全無料でプレイできます。シングルプレイヤー、マルチプレイヤー、デイリーチャレンジを含むすべてのゲームモードが無料で利用できます。',
      },
      {
        category: 'gameplay',
        question: 'スコアの仕組みは？',
        answer: '単語の長さと文字の価値に基づいてポイントが付与されます。長い単語ほど高得点です。珍しい文字はより高い価値を持ちます。ボード上のすべての単語を見つけるとボーナスポイントがもらえます。',
      },
      {
        category: 'gameplay',
        question: 'どのゲームモードがありますか？',
        answer: 'LexiClashには3つの主要モードがあります：(1) シングルプレイヤー - 様々な難易度のAIと練習、(2) マルチプレイヤー - 他のプレイヤーとリアルタイム対戦、(3) デイリーチャレンジ - 世界中のプレイヤーと同じパズルで競争。',
      },
      {
        category: 'gameplay',
        question: 'デイリーチャレンジの仕組みは？',
        answer: '毎日UTC午前0時に新しいパズルが生成され、世界中のプレイヤーが挑戦できます。1日1回のチャンスでできるだけ多くの単語を見つけてください。スコアはデイリーリーダーボードに記録されます。',
      },
      {
        category: 'gameplay',
        question: '複数の言語でプレイできますか？',
        answer: 'はい！LexiClashはヘブライ語、英語、スウェーデン語、日本語に対応しています。設定で言語を切り替えられます。各言語には独自の辞書とリーダーボードがあります。',
      },
      {
        category: 'technical',
        question: '対応デバイスは？',
        answer: 'LexiClashはデスクトップ、タブレット、スマートフォンなど、すべての最新デバイスで動作します。Chrome、Firefox、Safari、Edgeの最新バージョンをサポートしています。',
      },
      {
        category: 'technical',
        question: 'インターネット接続は必要ですか？',
        answer: 'はい、マルチプレイヤーとデイリーチャレンジにはインターネット接続が必要です。ただし、以前にゲームをロードしていれば、シングルプレイヤーモードはオフラインでプレイできます。',
      },
      {
        category: 'technical',
        question: 'バグや技術的な問題の報告方法は？',
        answer: 'バグを見つけた場合は、lexiclash.game@gmail.comまたはInstagram @lexi.clashまでご連絡ください。何が起きたか、どのデバイス/ブラウザを使用していたかの詳細を含めてください。',
      },
      {
        category: 'account',
        question: 'ユーザー名やプロフィールの変更方法は？',
        answer: '設定（ヘッダーの歯車アイコン）に移動し、プロフィールセクションに進んでください。ユーザー名、アバター、その他のプロフィール情報を更新できます。',
      },
      {
        category: 'account',
        question: '複数のデバイスでプレイできますか？',
        answer: 'はい！Googleログインでアカウントを作成すると、進捗、統計、設定がすべてのデバイス間で自動的に同期されます。',
      },
      {
        category: 'account',
        question: 'アカウントの削除方法は？',
        answer: 'アカウントを削除するには、設定 > アカウント > アカウント削除に進んでください。この操作は元に戻せず、統計、実績、ゲーム履歴を含むすべてのデータが消去されます。',
      },
      {
        category: 'privacy',
        question: 'データは安全ですか？',
        answer: 'はい。プライバシーを重視し、ゲーム運営に必要なデータのみを収集しています。業界標準の暗号化を使用し、個人情報を販売することはありません。詳細はプライバシーポリシーをご覧ください。',
      },
      {
        category: 'privacy',
        question: 'LexiClashに広告はありますか？',
        answer: 'Google AdMobと提携して関連広告を表示しています。広告はゲームを無料に保つために役立っています。広告のパーソナライズとオプトアウトオプションについてはプライバシーポリシーをご覧ください。',
      },
      {
        category: 'privacy',
        question: 'データ収集をオプトアウトできますか？',
        answer: 'ゲームの機能に必要なデータ収集（ユーザー名やスコアなど）がありますが、設定 > プライバシーでアナリティクスやパーソナライズ広告をオプトアウトできます。',
      },
    ],
  },
  es: {
    title: 'Preguntas frecuentes',
    subtitle: 'Preguntas y respuestas frecuentes',
    back: 'Volver',
    stillHaveQuestions: '¿Aún tienes preguntas?',
    hereToHelp: '¡Estamos aquí para ayudarte! Contáctanos en cualquier momento.',
    contactUs: 'Contáctanos',
    learnMore: '¿Quieres saber más?',
    blogCta: 'Visita nuestro blog para consejos, estrategias y la ciencia detrás de los juegos de palabras.',
    blogScienceTitle: 'La ciencia detrás de los juegos de palabras',
    blogStrategiesTitle: 'Estrategias para el desafío diario',
    blogViewAll: 'Ver todas las publicaciones →',
    categories: {
      gettingStarted: 'Primeros pasos',
      gameplay: 'Juego',
      technical: 'Técnico',
      account: 'Cuenta',
      privacy: 'Privacidad y seguridad',
    },
    items: [
      {
        category: 'gettingStarted',
        question: '¿Qué es LexiClash?',
        answer: 'LexiClash es un juego de palabras multijugador donde compites contra amigos o rivales de IA para encontrar palabras en un tablero compartido. Juega solo, acepta desafíos diarios o compite en tiempo real en hebreo, inglés, sueco y japonés.',
      },
      {
        category: 'gettingStarted',
        question: '¿Cómo creo una cuenta?',
        answer: 'Puedes jugar como invitado o crear una cuenta con inicio de sesión de Google. Tener una cuenta te permite guardar tu progreso, seguir estadísticas, competir en tablas de clasificación y jugar en varios dispositivos.',
      },
      {
        category: 'gettingStarted',
        question: '¿LexiClash es gratis?',
        answer: '¡Sí! LexiClash es completamente gratis. Todos los modos de juego, incluyendo un jugador, multijugador y desafíos diarios, están disponibles sin costo.',
      },
      {
        category: 'gameplay',
        question: '¿Cómo se obtienen puntos?',
        answer: 'Los puntos se otorgan según la longitud de la palabra y el valor de las letras. Las palabras más largas dan más puntos. Las letras raras tienen valores más altos. Se otorgan puntos de bonificación por encontrar todas las palabras en el tablero.',
      },
      {
        category: 'gameplay',
        question: '¿Qué modos de juego hay?',
        answer: 'LexiClash ofrece tres modos principales: (1) Un jugador - practica contra IA con varios niveles de dificultad, (2) Multijugador - partidas en tiempo real contra otros jugadores, (3) Desafío diario - compite en el mismo rompecabezas que jugadores de todo el mundo.',
      },
      {
        category: 'gameplay',
        question: '¿Cómo funciona el desafío diario?',
        answer: 'Cada día a medianoche UTC se genera un nuevo rompecabezas que todos los jugadores del mundo pueden intentar. Tienes una oportunidad por día para encontrar tantas palabras como sea posible. Tu puntuación se registra en la tabla de clasificación diaria.',
      },
      {
        category: 'gameplay',
        question: '¿Puedo jugar en varios idiomas?',
        answer: '¡Sí! LexiClash soporta hebreo, inglés, sueco y japonés. Puedes cambiar idiomas en Configuración. Cada idioma tiene su propio diccionario y tablas de clasificación.',
      },
      {
        category: 'technical',
        question: '¿Qué dispositivos son compatibles?',
        answer: 'LexiClash funciona en todos los dispositivos modernos incluyendo computadoras de escritorio, tabletas y smartphones. Soportamos las últimas versiones de Chrome, Firefox, Safari y Edge.',
      },
      {
        category: 'technical',
        question: '¿Necesito conexión a internet para jugar?',
        answer: 'Sí, se requiere conexión a internet para multijugador y desafíos diarios. Sin embargo, puedes jugar en modo un jugador sin conexión si previamente cargaste el juego.',
      },
      {
        category: 'technical',
        question: '¿Cómo reporto un error o problema técnico?',
        answer: 'Si encuentras un error, contáctanos en lexiclash.game@gmail.com o escríbenos en Instagram @lexi.clash. Incluye detalles sobre lo que pasó y qué dispositivo/navegador estabas usando.',
      },
      {
        category: 'account',
        question: '¿Cómo cambio mi nombre de usuario o perfil?',
        answer: 'Ve a Configuración (icono de engranaje en el encabezado) y navega a la sección de Perfil. Allí puedes actualizar tu nombre de usuario, avatar y otros detalles del perfil.',
      },
      {
        category: 'account',
        question: '¿Puedo jugar en varios dispositivos?',
        answer: '¡Sí! Si creas una cuenta con inicio de sesión de Google, tu progreso, estadísticas y configuración se sincronizan automáticamente en todos tus dispositivos.',
      },
      {
        category: 'account',
        question: '¿Cómo elimino mi cuenta?',
        answer: 'Para eliminar tu cuenta, ve a Configuración > Cuenta > Eliminar cuenta. Esta acción es permanente y borrará todos tus datos incluyendo estadísticas, logros e historial de juegos.',
      },
      {
        category: 'privacy',
        question: '¿Mis datos están seguros?',
        answer: 'Sí. Nos tomamos la privacidad en serio y solo recopilamos datos necesarios para operar el juego. Usamos cifrado estándar de la industria y nunca vendemos tu información personal. Consulta nuestra Política de privacidad para más detalles.',
      },
      {
        category: 'privacy',
        question: '¿LexiClash muestra anuncios?',
        answer: 'Nos asociamos con Google AdMob para mostrar anuncios relevantes. Los anuncios nos ayudan a mantener el juego gratuito para todos. Puedes aprender más sobre la personalización de anuncios y opciones de exclusión en nuestra Política de privacidad.',
      },
      {
        category: 'privacy',
        question: '¿Puedo optar por no participar en la recopilación de datos?',
        answer: 'Si bien cierta recopilación de datos es necesaria para el funcionamiento del juego (como tu nombre de usuario y puntuaciones), puedes optar por no participar en análisis y anuncios personalizados en Configuración > Privacidad.',
      },
    ],
  },
};
