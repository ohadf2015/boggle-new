/**
 * Visible page text for /[locale]/lexiclash-vs-mentimeter, in every locale.
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
    h1: "LexiClash vs Mentimeter Free — 50 participants/month honesty",
    lede: "Mentimeter Free publishes **50 participants per month** in Help and on the pricing table (**Participants per month: 50**); the counter resets on the account-creation date, with an 8-hour grace for one over-50 presentation. Free marketing bullets say “Unlimited participants once per month.” LexiClash foils with whole-class free (50) + miss→reteach Live. Cite [Mentimeter Help (Free account)](https://help.mentimeter.com/en/articles/1258367-what-is-included-in-the-free-account) and [mentimeter.com/plans](https://www.mentimeter.com/plans?view=standard).",
    thCompetitor: "Mentimeter Free",
    rows: [
      ['Free participant / seat model', '✓ Up to 50 students free per class', 'Free: 50 participants per month'],
      ['Reset / grace rule', '—', 'Resets on account-creation date; 8-hour grace for one over-50 presentation'],
      ['Pricing table Free row', '—', 'Participants per month: 50'],
      ['Free marketing bullet vs table', '—', 'Bullets: “Unlimited participants once per month” vs table/Help: 50'],
      ['Miss → reteach Live', '✓ Free miss-gap → Live deep-link', 'Presentation replay / reports (plan-gated features vary)'],
      ['No student signup', '✓ 6-character join code', 'Audience joins Mentimeter presentations'],
      ['Game / lesson type', 'Word-formation (Boggle/Wheel/Anagram)', 'Interactive presentations / polls / quizzes'],
      [
        'Evidence',
        '—',
        'help…/1258367 + mentimeter.com/plans?view=standard (Free: 50/month)',
      ],
    ],
    footnote: '',
    faqs: [
      {
          q: 'What is Mentimeter Free’s participant cap?',
          a: 'Mentimeter Help (help.mentimeter.com/en/articles/1258367, lastChecked September 29, 2026): Up to 50 participants per month. Once you hit the 50-participant limit, upgrade or wait until the counter resets — every month on the date you created your account. One presentation may exceed 50 with an 8-hour grace, then you are blocked from presenting again until reset or upgrade. The pricing table (mentimeter.com/plans?view=standard) lists Free “Participants per month: 50”. Free marketing bullets say “Unlimited participants once per month” — the Help/table number is 50.',
      },
      {
          q: 'How does LexiClash foil Mentimeter Free’s 50 participants/month cap?',
          a: 'LexiClash free classroom vocab runs a whole class (up to 50 students) with miss-gap → reteach Live — one published free seat cap per class, not a monthly participant counter that resets on the account-creation date. Distinct from Nearpod Silver 40-join, Blooket Starter ≤60, Gimkit Pro-Exclusive 5, Wayground, and Kahoot Go Free.',
      },
      {
          q: 'Is LexiClash a live-polling tool like Mentimeter?',
          a: 'Different category. Mentimeter is interactive presentations / polls / quizzes with a Free monthly participant counter. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats on the classroom loop.',
      },
      {
          q: 'Do students need accounts on LexiClash?',
          a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games.',
      },
    ],
    ctaStart: "Start a classroom game",
    related: [
      { label: "vs Nearpod" },
      { label: "vs Blooket" },
      { label: "vs Kahoot" },
    ],
  },
  he: {
    eyebrow: 'השוואה כנה',
    h1: 'LexiClash מול Mentimeter Free — 50 משתתפים בחודש, בכנות',
    lede: 'Mentimeter Free מפרסם במרכז העזרה ובטבלת התמחור **50 משתתפים בחודש** (**משתתפים בחודש: 50**); המונה מתאפס בתאריך פתיחת החשבון, ויש 8 שעות חסד למצגת אחת שחורגת מ-50. בנקודות השיווק של Free כתוב "משתתפים ללא הגבלה פעם בחודש". LexiClash עונה על כך עם כל הכיתה בחינם (50) וחזרה חיה על הטעויות. מקורות: [מרכז העזרה של Mentimeter (חשבון Free)](https://help.mentimeter.com/en/articles/1258367-what-is-included-in-the-free-account) ו-[mentimeter.com/plans](https://www.mentimeter.com/plans?view=standard).',
    thCompetitor: 'Mentimeter Free',
    rows: [
      ['מודל משתתפים / מקומות בחינם', '✓ עד 50 תלמידים בכיתה בחינם', 'Free: 50 משתתפים בחודש'],
      ['איפוס / כלל החסד', '—', 'מתאפס בתאריך פתיחת החשבון; 8 שעות חסד למצגת אחת מעל 50'],
      ['שורת Free בטבלת התמחור', '—', 'משתתפים בחודש: 50'],
      ['נקודת שיווק של Free לעומת הטבלה', '—', 'נקודות השיווק: "משתתפים ללא הגבלה פעם בחודש" לעומת הטבלה ומרכז העזרה: 50'],
      ['מטעויות לחזרה חיה', '✓ מילים שהוחמצו מובילות בקישור ישיר למשחק חי, בחינם', 'הפעלה חוזרת של מצגת / דוחות (היקף התכונות משתנה לפי התוכנית)'],
      ['בלי הרשמת תלמידים', '✓ קוד הצטרפות של 6 תווים', 'הקהל מצטרף למצגות של Mentimeter'],
      ['סוג המשחק / השיעור', 'יצירת מילים (Boggle / גלגל / אנגרמות)', 'מצגות אינטראקטיביות / סקרים / חידונים'],
      ['מקור', '—', 'מרכז העזרה (1258367) + mentimeter.com/plans?view=standard (Free: 50 בחודש)'],
    ],
    footnote: '',
    faqs: [
      { q: 'מהי תקרת המשתתפים של Mentimeter Free?', a: 'מרכז העזרה של Mentimeter (help.mentimeter.com/en/articles/1258367, נבדק לאחרונה ב-29 בספטמבר 2026): עד 50 משתתפים בחודש. אחרי שמגיעים ל-50 משתתפים צריך לשדרג או לחכות לאיפוס המונה — בכל חודש בתאריך שבו נפתח החשבון. מצגת אחת רשאית לחרוג מ-50 עם 8 שעות חסד, ואחר כך חסומים מהצגה נוספת עד האיפוס או השדרוג. בטבלת התמחור (mentimeter.com/plans?view=standard) כתוב ב-Free "משתתפים בחודש: 50". בנקודות השיווק של Free כתוב "משתתפים ללא הגבלה פעם בחודש" — המספר במרכז העזרה ובטבלה הוא 50.' },
      { q: 'איך LexiClash מתמודד עם תקרת 50 המשתתפים בחודש של Mentimeter Free?', a: 'אוצר המילים החינמי של LexiClash לכיתה מפעיל כיתה שלמה (עד 50 תלמידים) עם חזרה חיה על הטעויות — תקרת מקומות חינמית אחת ומפורסמת לכל כיתה, ולא מונה משתתפים חודשי שמתאפס בתאריך פתיחת החשבון. שונה מ-Nearpod Silver (40 הצטרפויות), Blooket Starter (עד 60), Gimkit במצבי Pro בלבד (5), Wayground ו-Kahoot Go Free.' },
      { q: 'האם LexiClash הוא כלי סקרים חיים כמו Mentimeter?', a: 'זו קטגוריה אחרת. Mentimeter הוא מצגות אינטראקטיביות, סקרים וחידונים, עם מונה משתתפים חודשי בתוכנית החינמית. LexiClash הוא יצירת מילים (רשתות בסגנון Boggle, אנגרמות, גלגלי מילים) לתרגול אוצר מילים — מקומות חינמיים לכל הכיתה במעגל הכיתתי.' },
      { q: 'האם תלמידים צריכים חשבון ב-LexiClash?', a: 'לא. התלמידים מצטרפים עם קוד של 6 תווים. Teacher Pro מוסיף כיתות ללא הגבלה ודוחות להדפסה; המסלול החינמי כבר מכסה כיתה שלמה של עד 50 תלמידים במשחקי מילים לאוצר מילים.' },
    ],
    ctaStart: 'התחילו משחק כיתתי',
    related: [{ label: 'מול Nearpod' }, { label: 'מול Blooket' }, { label: 'מול Kahoot' }],
  },

  es: {
    eyebrow: 'Comparativa honesta',
    h1: 'LexiClash vs Mentimeter Free: 50 participantes al mes, con honestidad',
    lede: 'Mentimeter Free publica en su ayuda y en la tabla de precios **50 participantes al mes** (**Participantes al mes: 50**); el contador se reinicia en la fecha de creación de la cuenta, con 8 horas de cortesía para una presentación que supere los 50. Los puntos de marketing de Free dicen «participantes ilimitados una vez al mes». LexiClash responde con toda la clase gratis (50) y repaso en vivo de los fallos. Fuentes: [Ayuda de Mentimeter (cuenta Free)](https://help.mentimeter.com/en/articles/1258367-what-is-included-in-the-free-account) y [mentimeter.com/plans](https://www.mentimeter.com/plans?view=standard).',
    thCompetitor: 'Mentimeter Free',
    rows: [
      ['Modelo de participantes / plazas gratis', '✓ Hasta 50 estudiantes por clase gratis', 'Free: 50 participantes al mes'],
      ['Reinicio / regla de cortesía', '—', 'Se reinicia en la fecha de creación de la cuenta; 8 horas de cortesía para una presentación con más de 50'],
      ['Fila Free de la tabla de precios', '—', 'Participantes al mes: 50'],
      ['Punto de marketing de Free frente a la tabla', '—', 'Puntos de marketing: «participantes ilimitados una vez al mes» frente a tabla y ayuda: 50'],
      ['De los fallos al repaso en vivo', '✓ Los fallos llevan directamente a una partida en vivo, gratis', 'Reproducción de presentaciones / informes (las funciones varían según el plan)'],
      ['Sin registro del alumnado', '✓ Código de acceso de 6 caracteres', 'El público se une a las presentaciones de Mentimeter'],
      ['Tipo de juego / lección', 'Formación de palabras (Boggle/Rueda/Anagramas)', 'Presentaciones interactivas / encuestas / cuestionarios'],
      ['Fuente', '—', 'Ayuda (1258367) + mentimeter.com/plans?view=standard (Free: 50 al mes)'],
    ],
    footnote: '',
    faqs: [
      { q: '¿Cuál es el límite de participantes de Mentimeter Free?', a: 'Ayuda de Mentimeter (help.mentimeter.com/en/articles/1258367, última comprobación el 29 de septiembre de 2026): hasta 50 participantes al mes. Al llegar al límite de 50 hay que mejorar el plan o esperar a que se reinicie el contador, cada mes en la fecha en que se creó la cuenta. Una presentación puede superar los 50 con 8 horas de cortesía; después no se puede volver a presentar hasta el reinicio o la mejora del plan. La tabla de precios (mentimeter.com/plans?view=standard) indica para Free «Participantes al mes: 50». Los puntos de marketing de Free dicen «participantes ilimitados una vez al mes»; la cifra de la ayuda y de la tabla es 50.' },
      { q: '¿Cómo responde LexiClash al límite de 50 participantes al mes de Mentimeter Free?', a: 'El vocabulario de aula gratuito de LexiClash reúne a una clase entera (hasta 50 estudiantes) con repaso en vivo de los fallos: un único límite gratuito publicado por clase, no un contador mensual de participantes que se reinicia en la fecha de creación de la cuenta. No es lo mismo que Nearpod Silver (40 accesos), Blooket Starter (hasta 60), Gimkit con modos solo Pro (5), Wayground ni Kahoot Go Free.' },
      { q: '¿Es LexiClash una herramienta de encuestas en vivo como Mentimeter?', a: 'Es otra categoría. Mentimeter son presentaciones interactivas, encuestas y cuestionarios, con un contador mensual de participantes en el plan gratuito. LexiClash es un juego de formar palabras (cuadrículas estilo Boggle, anagramas, ruedas de palabras) para practicar vocabulario: plazas gratuitas para toda la clase en el bucle de aula.' },
      { q: '¿Necesita el alumnado cuentas en LexiClash?', a: 'No. El alumnado se une con un código de 6 caracteres. Teacher Pro añade clases ilimitadas e informes imprimibles; el plan gratuito ya cubre una clase completa de hasta 50 estudiantes en los juegos de palabras de vocabulario.' },
    ],
    ctaStart: 'Empezar una partida de clase',
    related: [{ label: 'vs Nearpod' }, { label: 'vs Blooket' }, { label: 'vs Kahoot' }],
  },

  sv: {
    eyebrow: 'Ärlig jämförelse',
    h1: 'LexiClash vs Mentimeter Free — 50 deltagare i månaden, ärligt talat',
    lede: 'Mentimeter Free publicerar i hjälpen och i pristabellen **50 deltagare per månad** (**Deltagare per månad: 50**); räknaren nollställs på datumet då kontot skapades, med 8 timmars respit för en presentation över 50. Marknadsföringspunkterna för Free säger "obegränsat antal deltagare en gång i månaden". LexiClash svarar med hela klassen gratis (50) och live-repetition av missar. Källor: [Mentimeters hjälp (Free-konto)](https://help.mentimeter.com/en/articles/1258367-what-is-included-in-the-free-account) och [mentimeter.com/plans](https://www.mentimeter.com/plans?view=standard).',
    thCompetitor: 'Mentimeter Free',
    rows: [
      ['Gratis deltagar- / platsmodell', '✓ Upp till 50 elever per klass gratis', 'Free: 50 deltagare per månad'],
      ['Nollställning / respitregel', '—', 'Nollställs på datumet då kontot skapades; 8 timmars respit för en presentation över 50'],
      ['Free-raden i pristabellen', '—', 'Deltagare per månad: 50'],
      ['Marknadsföringspunkt för Free mot tabellen', '—', 'Marknadsföringspunkter: "obegränsat antal deltagare en gång i månaden" mot tabell och hjälp: 50'],
      ['Från miss till live-repetition', '✓ Missade ord leder direkt till ett live-spel, gratis', 'Uppspelning av presentationer / rapporter (funktionerna varierar mellan planerna)'],
      ['Ingen elevregistrering', '✓ Anslutningskod med 6 tecken', 'Publiken går med i Mentimeter-presentationer'],
      ['Spel- / lektionstyp', 'Ordbildning (Boggle/Hjul/Anagram)', 'Interaktiva presentationer / enkäter / quiz'],
      ['Källa', '—', 'Hjälpen (1258367) + mentimeter.com/plans?view=standard (Free: 50 per månad)'],
    ],
    footnote: '',
    faqs: [
      { q: 'Vilket deltagartak har Mentimeter Free?', a: 'Mentimeters hjälp (help.mentimeter.com/en/articles/1258367, senast kontrollerad 29 september 2026): upp till 50 deltagare per månad. När gränsen på 50 deltagare är nådd måste man uppgradera eller vänta tills räknaren nollställs — varje månad på datumet då kontot skapades. En presentation får överstiga 50 med 8 timmars respit, därefter är man blockerad från att presentera igen tills nollställningen eller uppgraderingen. Pristabellen (mentimeter.com/plans?view=standard) anger för Free "Deltagare per månad: 50". Marknadsföringspunkterna för Free säger "obegränsat antal deltagare en gång i månaden" — siffran i hjälpen och tabellen är 50.' },
      { q: 'Hur svarar LexiClash på Mentimeter Frees tak på 50 deltagare i månaden?', a: 'LexiClashs gratis klassrumsordförråd kör en hel klass (upp till 50 elever) med live-repetition av missar — en enda publicerad gratisgräns per klass, inte en månatlig deltagarräknare som nollställs på kontots skapandedatum. Skiljer sig från Nearpod Silver (40 anslutningar), Blooket Starter (upp till 60), Gimkit med enbart Pro-lägen (5), Wayground och Kahoot Go Free.' },
      { q: 'Är LexiClash ett verktyg för liveomröstningar som Mentimeter?', a: 'Det är en annan kategori. Mentimeter är interaktiva presentationer, enkäter och quiz, med en månatlig deltagarräknare i gratisplanen. LexiClash är ordbildning (Boggle-liknande rutnät, anagram, ordhjul) för ordförrådsträning — gratisplatser för hela klassen i klassrumsloopen.' },
      { q: 'Behöver eleverna konton på LexiClash?', a: 'Nej. Eleverna går med med en kod på 6 tecken. Teacher Pro lägger till obegränsat antal klasser och utskrivbara rapporter; gratisnivån täcker redan en hel klass på upp till 50 elever i ordspel för ordförråd.' },
    ],
    ctaStart: 'Starta ett klassrumsspel',
    related: [{ label: 'vs Nearpod' }, { label: 'vs Blooket' }, { label: 'vs Kahoot' }],
  },

  ja: {
    eyebrow: '正直な比較',
    h1: 'LexiClash vs Mentimeter Free — 月50人の参加者上限を正直に比較',
    lede: 'Mentimeter Free は、ヘルプと料金表の両方で**月50人の参加者**(**Participants per month: 50**)と公開しています。カウンターはアカウント作成日にリセットされ、50人を超える発表1回には8時間の猶予があります。Free のマーケティング上の記載は「月に一度、参加者無制限」です。LexiClash は、クラス全員(50人)を無料で受け入れ、ミスの単語をライブで復習できます。出典: [Mentimeter ヘルプ(Free アカウント)](https://help.mentimeter.com/en/articles/1258367-what-is-included-in-the-free-account)、[mentimeter.com/plans](https://www.mentimeter.com/plans?view=standard)。',
    thCompetitor: 'Mentimeter Free',
    rows: [
      ['無料の参加者/席モデル', '✓ 1クラス最大50人まで無料', 'Free: 月50人の参加者'],
      ['リセット/猶予ルール', '—', 'アカウント作成日にリセット。50人を超える発表1回に8時間の猶予'],
      ['料金表の Free 行', '—', '月あたりの参加者数: 50'],
      ['Free のマーケティング記載と料金表の違い', '—', 'マーケティング記載「月に一度、参加者無制限」に対し、料金表とヘルプは50'],
      ['ミスからライブ復習へ', '✓ ミスした単語から無料のライブゲームへ直接リンク', 'プレゼンの再生/レポート(機能はプランにより異なる)'],
      ['生徒の登録不要', '✓ 6文字の参加コード', '参加者は Mentimeter のプレゼンに参加'],
      ['ゲーム/授業のタイプ', '単語づくり(Boggle/ホイール/アナグラム)', 'インタラクティブなプレゼン / 投票 / クイズ'],
      ['出典', '—', 'ヘルプ(1258367)+ mentimeter.com/plans?view=standard(Free: 月50人)'],
    ],
    footnote: '',
    faqs: [
      { q: 'Mentimeter Free の参加者数の上限は?', a: 'Mentimeter ヘルプ(help.mentimeter.com/en/articles/1258367、2026年9月29日確認)では、月に最大50人の参加者とされています。50人に達したら、プランをアップグレードするか、毎月アカウント作成日に行われるカウンターのリセットを待つ必要があります。1回の発表は8時間の猶予付きで50人を超えられますが、その後はリセットかアップグレードまで再び発表できません。料金表(mentimeter.com/plans?view=standard)の Free は「Participants per month: 50」です。Free のマーケティング上の記載は「月に一度、参加者無制限」ですが、ヘルプと料金表の数字は50です。' },
      { q: 'LexiClash は Mentimeter Free の「月50人」の上限にどう対応しますか?', a: 'LexiClash の無料の教室向け語彙ゲームは、クラス全体(最大50人)で遊べ、ミスした単語をライブで復習できます。公開している無料の上限はクラスあたり1つだけで、アカウント作成日にリセットされる月間の参加者カウンターはありません。Nearpod Silver(参加40)、Blooket Starter(最大60)、Gimkit の Pro 限定モード(5)、Wayground、Kahoot Go Free とは別の仕組みです。' },
      { q: 'LexiClash は Mentimeter のようなライブ投票ツールですか?', a: 'カテゴリが異なります。Mentimeter はインタラクティブなプレゼン、投票、クイズのツールで、無料プランには月間の参加者カウンターがあります。LexiClash は語彙練習のための単語づくりゲーム(Boggle 風のグリッド、アナグラム、ワードホイール)で、教室ループではクラス全員が無料で参加できます。' },
      { q: '生徒は LexiClash のアカウントが必要ですか?', a: '不要です。生徒は6文字のコードで参加します。Teacher Pro ではクラス数が無制限になり、印刷用レポートも使えます。無料プランでも、語彙の単語ゲームなら最大50人のクラス全体をすでにカバーできます。' },
    ],
    ctaStart: 'クラスゲームを始める',
    related: [{ label: 'vs Nearpod' }, { label: 'vs Blooket' }, { label: 'vs Kahoot' }],
  },

  ru: {
    eyebrow: 'Честное сравнение',
    h1: 'LexiClash vs Mentimeter Free — 50 участников в месяц: честно',
    lede: 'В справке и в таблице цен Mentimeter Free указано **50 участников в месяц** (**Participants per month: 50**); счётчик обнуляется в день создания аккаунта, а для одной презентации свыше 50 есть 8 часов льготы. В маркетинговых пунктах Free написано «неограниченное число участников раз в месяц». LexiClash отвечает бесплатным входом для всего класса (50 человек) и живым повторением ошибок. Источники: [справка Mentimeter (аккаунт Free)](https://help.mentimeter.com/en/articles/1258367-what-is-included-in-the-free-account) и [mentimeter.com/plans](https://www.mentimeter.com/plans?view=standard).',
    thCompetitor: 'Mentimeter Free',
    rows: [
      ['Бесплатные места для участников', '✓ До 50 учеников в классе бесплатно', 'Free: 50 участников в месяц'],
      ['Обнуление / льготное правило', '—', 'Обнуляется в день создания аккаунта; 8 часов льготы для одной презентации свыше 50'],
      ['Строка Free в таблице цен', '—', 'Участников в месяц: 50'],
      ['Маркетинговый пункт Free и таблица', '—', 'Маркетинг: «неограниченное число участников раз в месяц», а в таблице и справке: 50'],
      ['От ошибки к живому повторению', '✓ Пропущенные слова ведут прямой ссылкой в живую игру, бесплатно', 'Повтор презентации / отчёты (набор функций зависит от тарифа)'],
      ['Без регистрации учеников', '✓ Код входа из 6 символов', 'Аудитория входит в презентации Mentimeter'],
      ['Тип игры / урока', 'Составление слов (Boggle/Колесо/Анаграммы)', 'Интерактивные презентации / опросы / викторины'],
      ['Источник', '—', 'Справка (1258367) + mentimeter.com/plans?view=standard (Free: 50 в месяц)'],
    ],
    footnote: '',
    faqs: [
      { q: 'Какой лимит участников у Mentimeter Free?', a: 'Справка Mentimeter (help.mentimeter.com/en/articles/1258367, проверено 29 сентября 2026 года): до 50 участников в месяц. Когда лимит в 50 участников исчерпан, нужно перейти на платный тариф или дождаться обнуления счётчика — каждый месяц в день создания аккаунта. Одна презентация может превысить 50 с 8-часовой льготой, после чего показывать презентации снова нельзя до обнуления или повышения тарифа. В таблице цен (mentimeter.com/plans?view=standard) у Free указано «Participants per month: 50». В маркетинговых пунктах Free написано «неограниченное число участников раз в месяц», но в справке и таблице — 50.' },
      { q: 'Как LexiClash отвечает на лимит Mentimeter Free — 50 участников в месяц?', a: 'Бесплатная классная игра LexiClash по лексике вмещает весь класс (до 50 учеников) и повторяет ошибки вживую: один опубликованный бесплатный лимит на класс, а не ежемесячный счётчик участников, который обнуляется в день создания аккаунта. Это отличается от Nearpod Silver (40 подключений), Blooket Starter (до 60), Gimkit с режимами только для Pro (5), Wayground и Kahoot Go Free.' },
      { q: 'LexiClash — это инструмент живых опросов, как Mentimeter?', a: 'Это другая категория. Mentimeter — интерактивные презентации, опросы и викторины, с ежемесячным счётчиком участников в бесплатном тарифе. LexiClash — игра в составление слов (сетки в стиле Boggle, анаграммы, колёса слов) для тренировки лексики: бесплатные места для всего класса в классном цикле.' },
      { q: 'Нужны ли ученикам аккаунты в LexiClash?', a: 'Нет. Ученики входят по коду из 6 символов. Teacher Pro добавляет неограниченное число классов и печатные отчёты; бесплатный тариф уже покрывает целый класс до 50 человек в словесных играх для лексики.' },
    ],
    ctaStart: 'Начать игру для класса',
    related: [{ label: 'vs Nearpod' }, { label: 'vs Blooket' }, { label: 'vs Kahoot' }],
  },
};

export const copies: Record<Locale, VsFoilCopy> = Object.fromEntries(
  (Object.keys(pageCopy) as Locale[]).map((l) => [l, { ...common[l], ...pageCopy[l] }]),
) as Record<Locale, VsFoilCopy>;

export { resolveVsLocale };
