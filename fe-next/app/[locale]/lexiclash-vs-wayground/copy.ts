/**
 * Visible page text for /[locale]/lexiclash-vs-wayground, in every locale.
 * Metadata (title, description, OG) is deliberately NOT here: it stays English
 * with a noindex on non-English locales (see page.tsx) and is SEO-frozen.
 */
import type { Locale } from '@/i18n/config';
import { resolveVsLocale } from '@/lib/seo/vsCommonCopy';
import type { VsFoilCopy } from '@/lib/seo/vsFoilCopy';

const common: Record<Locale, Pick<VsFoilCopy, 'sideHeading' | 'thFeature' | 'faqHeading'>> = {
  en: { sideHeading: 'Side-by-side', thFeature: 'Capability', faqHeading: 'FAQ' },
  he: { sideHeading: 'זה מול זה', thFeature: 'תכונה', faqHeading: 'שאלות נפוצות' },
  es: { sideHeading: 'Cara a cara', thFeature: 'Característica', faqHeading: 'Preguntas frecuentes' },
  sv: { sideHeading: 'Sida vid sida', thFeature: 'Funktion', faqHeading: 'Vanliga frågor' },
  ja: { sideHeading: '並べて比較', thFeature: '項目', faqHeading: 'よくある質問' },
  ru: { sideHeading: 'Сравнение', thFeature: 'Возможность', faqHeading: 'Частые вопросы' },
};

const pageCopy: Record<Locale, Omit<VsFoilCopy, 'sideHeading' | 'thFeature' | 'faqHeading'>> = {
  en: {
    eyebrow: "Compare · education foil",
    h1: "LexiClash vs Wayground (Quizizz)",
    lede: "Wayground Basic on [wayground.com/home/plans](https://wayground.com/home/plans) publishes **20 max** under “Unlimited activity storage.” Starter (Basic) help — Updated 12 May 2026 — confirms [help.wayground.com Starter plan](https://help.wayground.com/support/solutions/articles/158000404038-wayground-starter-basic-plan): “Store up to 20 resources.” LexiClash free classroom vocab has no 20-resource ceiling.",
    thCompetitor: "Wayground Basic",
    rows: [
      ['Free-tier library / activity storage', '✓ No 20-resource ceiling', 'Basic: 20 max'],
      ['Reteach from miss gaps', '✓ Live deep-link', 'Rebuild / host from library'],
      ['No student signup', '✓ 6-character join code', 'PIN / join code'],
      ['Game type', 'Word-formation (Boggle/Wheel/Anagram)', 'Quiz / lesson / interactive video'],
      ['Best for', 'Vocabulary, spelling, ESL', 'Trivia, quizzes, lessons'],
      ['Whole-class multiplayer', '✓ Up to 50 students free', 'Up to 100 students (Basic)'],
      ['Evidence (Basic / Starter)', '—', 'Plans “20 max” + help Updated 12 May 2026'],
    ],
    footnote: "Mentimeter Free 50/month is #1183. Wooclap Starter 5 active is #1186. Nearpod Silver 40-join / 300 MB is #1169. Blooket free-tier is #1166. Gimkit Pro-Exclusive 5 is #1137.",
    faqs: [
      {
          q: 'Does Wayground Basic limit how many activities I can store?',
          a: 'Yes. Wayground (Quizizz Inc. DBA Wayground) Basic on wayground.com/home/plans lists “Unlimited activity storage → 20 max.” The Starter (Basic) help article — Updated 12 May 2026 — says “20 activity limit: Store up to 20 resources on your account.” Hit 20 and you archive or upgrade before creating more.',
      },
      {
          q: 'How does LexiClash foil the Wayground Basic 20 max activity storage limit?',
          a: 'LexiClash free classroom vocab + reteach / Live turns miss gaps into a Live deep-link — no 20-resource library ceiling on the free classroom loop. Distinct from Mentimeter Free 50 participants/month (#1183), Wooclap Starter 5 active questions (#1186), Nearpod Silver 40-join (#1169), Blooket free-tier caps (#1166), and Gimkit Pro-Exclusive 5-player (#1137).',
      },
      {
          q: 'Is Wayground the same as Quizizz?',
          a: 'Wayground is Quizizz Inc. DBA Wayground (support@wayground.com on the Starter help article). Basic / Starter still enforces the 20 max activity / resource library limit described above.',
      },
      {
          q: 'Do students need accounts on LexiClash?',
          a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 without a 20-activity library cap.',
      },
      {
          q: 'Is LexiClash a quiz platform like Wayground?',
          a: 'Different category. Wayground is Assessments/Quizzes, Lessons, Interactive Videos, Flashcards. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary and language practice — with classroom reteach Live from miss gaps.',
      },
    ],
    ctaStart: "Start a classroom game",
    related: [
      { label: "vs Mentimeter" },
      { label: "vs Wooclap" },
      { label: "vs Nearpod" },
      { label: "vs Blooket" },
      { label: "vs Gimkit" },
    ],
  },
  he: {
    eyebrow: 'השוואה חינוכית',
    h1: 'LexiClash מול Wayground (Quizizz)',
    lede: 'Wayground Basic ב-[wayground.com/home/plans](https://wayground.com/home/plans) מפרסם **20 לכל היותר** תחת "אחסון פעילויות ללא הגבלה". מאמר העזרה של Starter (Basic) — עודכן ב-12 במאי 2026 — מאשר ב-[help.wayground.com Starter plan](https://help.wayground.com/support/solutions/articles/158000404038-wayground-starter-basic-plan): "אפשר לאחסן עד 20 משאבים". באוצר המילים החינמי של LexiClash לכיתה אין תקרה של 20 משאבים.',
    thCompetitor: 'Wayground Basic',
    rows: [
      ['ספרייה / אחסון פעילויות בתוכנית החינמית', '✓ בלי תקרה של 20 משאבים', 'Basic: 20 לכל היותר'],
      ['חזרה על הטעויות', '✓ קישור ישיר למשחק חי', 'בנייה מחדש / הנחיה מהספרייה'],
      ['בלי הרשמת תלמידים', '✓ קוד הצטרפות של 6 תווים', 'קוד PIN / קוד הצטרפות'],
      ['סוג המשחק', 'יצירת מילים (Boggle / גלגל / אנגרמות)', 'חידון / שיעור / סרטון אינטראקטיבי'],
      ['הכי מתאים ל', 'אוצר מילים, איות, אנגלית כשפה זרה', 'טריוויה, חידונים, שיעורים'],
      ['משחק רב-משתתפים לכל הכיתה', '✓ עד 50 תלמידים בחינם', 'עד 100 תלמידים (Basic)'],
      ['מקור (Basic / Starter)', '—', 'עמוד התוכניות: "20 לכל היותר" + מאמר עזרה שעודכן ב-12 במאי 2026'],
    ],
    footnote: '',
    faqs: [
      { q: 'האם Wayground Basic מגביל כמה פעילויות אפשר לאחסן?', a: 'כן. ב-Wayground (Quizizz Inc. הפועלת תחת השם Wayground) Basic בעמוד wayground.com/home/plans מופיע "אחסון פעילויות ללא הגבלה ← 20 לכל היותר". מאמר העזרה של Starter (Basic) — עודכן ב-12 במאי 2026 — קובע "מגבלת 20 פעילויות: אפשר לאחסן עד 20 משאבים בחשבון". אחרי 20 צריך לארכב או לשדרג כדי ליצור עוד.' },
      { q: 'איך LexiClash מתמודד עם מגבלת האחסון של 20 פעילויות ב-Wayground Basic?', a: 'אוצר המילים החינמי של LexiClash לכיתה, יחד עם חזרה על הטעויות ומשחק חי, הופך מילים שהוחמצו לקישור ישיר למשחק חי — בלי תקרת ספרייה של 20 משאבים במעגל הכיתתי החינמי. שונה מ-Mentimeter Free (50 משתתפים בחודש), Wooclap Starter (5 שאלות פעילות), Nearpod Silver (40 הצטרפויות), מגבלות התוכנית החינמית של Blooket ו-Gimkit במצבי Pro בלבד (5 שחקנים).' },
      { q: 'האם Wayground זהה ל-Quizizz?', a: 'Wayground היא Quizizz Inc. הפועלת תחת השם Wayground (support@wayground.com במאמר העזרה של Starter). התוכנית Basic / Starter עדיין אוכפת את מגבלת הספרייה של 20 פעילויות או משאבים שתוארה למעלה.' },
      { q: 'האם תלמידים צריכים חשבון ב-LexiClash?', a: 'לא. התלמידים מצטרפים עם קוד של 6 תווים. Teacher Pro מוסיף כיתות ללא הגבלה ודוחות להדפסה; המסלול החינמי כבר מכסה כיתה שלמה של עד 50 תלמידים בלי תקרת ספרייה של 20 פעילויות.' },
      { q: 'האם LexiClash היא פלטפורמת חידונים כמו Wayground?', a: 'זו קטגוריה אחרת. Wayground כוללת הערכות וחידונים, שיעורים, סרטונים אינטראקטיביים וכרטיסיות. LexiClash היא יצירת מילים (רשתות בסגנון Boggle, אנגרמות, גלגלי מילים) לתרגול אוצר מילים ושפה — עם חזרה כיתתית חיה על הטעויות.' },
    ],
    ctaStart: 'התחילו משחק כיתתי',
    related: [{ label: 'מול Mentimeter' }, { label: 'מול Wooclap' }, { label: 'מול Nearpod' }, { label: 'מול Blooket' }, { label: 'מול Gimkit' }],
  },

  es: {
    eyebrow: 'Comparativa educativa',
    h1: 'LexiClash vs Wayground (Quizizz)',
    lede: 'Wayground Basic, en [wayground.com/home/plans](https://wayground.com/home/plans), publica **20 como máximo** bajo «Almacenamiento de actividades ilimitado». La ayuda de Starter (Basic), actualizada el 12 de mayo de 2026, lo confirma en [help.wayground.com Starter plan](https://help.wayground.com/support/solutions/articles/158000404038-wayground-starter-basic-plan): «Guarda hasta 20 recursos». El vocabulario de aula gratuito de LexiClash no tiene un techo de 20 recursos.',
    thCompetitor: 'Wayground Basic',
    rows: [
      ['Biblioteca / almacenamiento de actividades en el plan gratuito', '✓ Sin techo de 20 recursos', 'Basic: 20 como máximo'],
      ['Repaso de los fallos', '✓ Enlace directo a una partida en vivo', 'Reconstruir / dirigir desde la biblioteca'],
      ['Sin registro del alumnado', '✓ Código de acceso de 6 caracteres', 'PIN / código de acceso'],
      ['Tipo de juego', 'Formación de palabras (Boggle/Rueda/Anagramas)', 'Cuestionario / lección / vídeo interactivo'],
      ['Ideal para', 'Vocabulario, ortografía, ESL', 'Preguntas de cultura general, cuestionarios, lecciones'],
      ['Multijugador para toda la clase', '✓ Hasta 50 estudiantes gratis', 'Hasta 100 estudiantes (Basic)'],
      ['Fuente (Basic / Starter)', '—', 'Página de planes: «20 como máximo» + ayuda actualizada el 12 de mayo de 2026'],
    ],
    footnote: '',
    faqs: [
      { q: '¿Limita Wayground Basic cuántas actividades puedo guardar?', a: 'Sí. Wayground (Quizizz Inc., que opera como Wayground) indica en Basic, en wayground.com/home/plans, «Almacenamiento de actividades ilimitado → 20 como máximo». El artículo de ayuda de Starter (Basic), actualizado el 12 de mayo de 2026, dice: «Límite de 20 actividades: guarda hasta 20 recursos en tu cuenta». Al llegar a 20, hay que archivar o mejorar el plan antes de crear más.' },
      { q: '¿Cómo responde LexiClash al límite de 20 actividades guardadas de Wayground Basic?', a: 'El vocabulario de aula gratuito de LexiClash, con repaso y partida en vivo, convierte los fallos en un enlace directo a una partida en vivo: sin techo de biblioteca de 20 recursos en el bucle de aula gratuito. No es lo mismo que Mentimeter Free (50 participantes al mes), Wooclap Starter (5 preguntas activas), Nearpod Silver (40 accesos), los límites del plan gratuito de Blooket ni Gimkit con modos solo Pro (5 jugadores).' },
      { q: '¿Es Wayground lo mismo que Quizizz?', a: 'Wayground es Quizizz Inc., que opera como Wayground (support@wayground.com en el artículo de ayuda de Starter). Basic / Starter sigue aplicando el límite de 20 actividades o recursos en la biblioteca descrito arriba.' },
      { q: '¿Necesita el alumnado cuentas en LexiClash?', a: 'No. El alumnado se une con un código de 6 caracteres. Teacher Pro añade clases ilimitadas e informes imprimibles; el plan gratuito ya cubre una clase completa de hasta 50 estudiantes sin un tope de biblioteca de 20 actividades.' },
      { q: '¿Es LexiClash una plataforma de cuestionarios como Wayground?', a: 'Es otra categoría. Wayground son evaluaciones y cuestionarios, lecciones, vídeos interactivos y tarjetas. LexiClash es un juego de formar palabras (cuadrículas estilo Boggle, anagramas, ruedas de palabras) para practicar vocabulario e idiomas, con repaso en vivo en clase a partir de los fallos.' },
    ],
    ctaStart: 'Empezar una partida de clase',
    related: [{ label: 'vs Mentimeter' }, { label: 'vs Wooclap' }, { label: 'vs Nearpod' }, { label: 'vs Blooket' }, { label: 'vs Gimkit' }],
  },

  sv: {
    eyebrow: 'Utbildningsjämförelse',
    h1: 'LexiClash vs Wayground (Quizizz)',
    lede: 'Wayground Basic på [wayground.com/home/plans](https://wayground.com/home/plans) publicerar **högst 20** under "Obegränsad aktivitetslagring". Hjälpen för Starter (Basic) — uppdaterad 12 maj 2026 — bekräftar det på [help.wayground.com Starter plan](https://help.wayground.com/support/solutions/articles/158000404038-wayground-starter-basic-plan): "Lagra upp till 20 resurser". LexiClashs gratis klassrumsordförråd har inget tak på 20 resurser.',
    thCompetitor: 'Wayground Basic',
    rows: [
      ['Bibliotek / aktivitetslagring i gratisplanen', '✓ Inget tak på 20 resurser', 'Basic: högst 20'],
      ['Repetition av missar', '✓ Direktlänk till ett live-spel', 'Bygg om / hosta från biblioteket'],
      ['Ingen elevregistrering', '✓ Anslutningskod med 6 tecken', 'PIN / anslutningskod'],
      ['Speltyp', 'Ordbildning (Boggle/Hjul/Anagram)', 'Quiz / lektion / interaktiv video'],
      ['Bäst för', 'Ordförråd, stavning, ESL', 'Allmänbildning, quiz, lektioner'],
      ['Flerspelarläge för hela klassen', '✓ Upp till 50 elever gratis', 'Upp till 100 elever (Basic)'],
      ['Källa (Basic / Starter)', '—', 'Plansidan: "högst 20" + hjälpartikel uppdaterad 12 maj 2026'],
    ],
    footnote: '',
    faqs: [
      { q: 'Begränsar Wayground Basic hur många aktiviteter jag kan lagra?', a: 'Ja. Wayground (Quizizz Inc., verksamt som Wayground) anger för Basic på wayground.com/home/plans "Obegränsad aktivitetslagring → högst 20". Hjälpartikeln för Starter (Basic) — uppdaterad 12 maj 2026 — säger "Gräns på 20 aktiviteter: lagra upp till 20 resurser på ditt konto". När du nått 20 måste du arkivera eller uppgradera innan du skapar fler.' },
      { q: 'Hur svarar LexiClash på Wayground Basics gräns på 20 lagrade aktiviteter?', a: 'LexiClashs gratis klassrumsordförråd med repetition och live-spel gör missar till en direktlänk till ett live-spel — inget biblioteks­tak på 20 resurser i den gratis klassrumsloopen. Skiljer sig från Mentimeter Free (50 deltagare per månad), Wooclap Starter (5 aktiva frågor), Nearpod Silver (40 anslutningar), Blookets gränser i gratisplanen och Gimkit med enbart Pro-lägen (5 spelare).' },
      { q: 'Är Wayground samma sak som Quizizz?', a: 'Wayground är Quizizz Inc., verksamt som Wayground (support@wayground.com i hjälpartikeln för Starter). Basic / Starter tillämpar fortfarande gränsen på 20 aktiviteter eller resurser i biblioteket som beskrivs ovan.' },
      { q: 'Behöver eleverna konton på LexiClash?', a: 'Nej. Eleverna går med med en kod på 6 tecken. Teacher Pro lägger till obegränsat antal klasser och utskrivbara rapporter; gratisnivån täcker redan en hel klass på upp till 50 elever utan ett biblioteks­tak på 20 aktiviteter.' },
      { q: 'Är LexiClash en quizplattform som Wayground?', a: 'Det är en annan kategori. Wayground är bedömningar och quiz, lektioner, interaktiva videor och flashcards. LexiClash är ordbildning (Boggle-liknande rutnät, anagram, ordhjul) för ordförråds- och språkträning — med live-repetition i klassrummet utifrån missar.' },
    ],
    ctaStart: 'Starta ett klassrumsspel',
    related: [{ label: 'vs Mentimeter' }, { label: 'vs Wooclap' }, { label: 'vs Nearpod' }, { label: 'vs Blooket' }, { label: 'vs Gimkit' }],
  },

  ja: {
    eyebrow: '教育向け比較',
    h1: 'LexiClash vs Wayground(Quizizz)',
    lede: 'Wayground Basic は [wayground.com/home/plans](https://wayground.com/home/plans) の「アクティビティの保存数は無制限」の項目で**最大20**と公開しています。Starter(Basic)のヘルプ(2026年5月12日更新)も、[help.wayground.com Starter plan](https://help.wayground.com/support/solutions/articles/158000404038-wayground-starter-basic-plan) で「最大20件のリソースを保存できます」と確認しています。LexiClash の無料の教室向け語彙ゲームには、20件というリソースの上限はありません。',
    thCompetitor: 'Wayground Basic',
    rows: [
      ['無料プランのライブラリ/アクティビティ保存数', '✓ 20件の上限なし', 'Basic: 最大20'],
      ['ミスの復習', '✓ ライブゲームへの直接リンク', 'ライブラリから作り直し/ホスト'],
      ['生徒の登録不要', '✓ 6文字の参加コード', 'PIN / 参加コード'],
      ['ゲームのタイプ', '単語づくり(Boggle/ホイール/アナグラム)', 'クイズ / レッスン / インタラクティブ動画'],
      ['向いている用途', '語彙、スペリング、ESL', '雑学、クイズ、授業'],
      ['クラス全員でのマルチプレイ', '✓ 最大50人まで無料', '最大100人(Basic)'],
      ['出典(Basic / Starter)', '—', 'プランページの「最大20」+ 2026年5月12日更新のヘルプ'],
    ],
    footnote: '',
    faqs: [
      { q: 'Wayground Basic では保存できるアクティビティ数に上限がありますか?', a: 'はい。Wayground(Quizizz Inc.が Wayground の名称で運営)の Basic は、wayground.com/home/plans に「アクティビティの保存数は無制限 → 最大20」と記載されています。Starter(Basic)のヘルプ記事(2026年5月12日更新)にも「20件のアクティビティ上限: アカウントに最大20件のリソースを保存できます」とあります。20件に達したら、さらに作成する前にアーカイブするかアップグレードする必要があります。' },
      { q: 'LexiClash は Wayground Basic の「保存20件」の上限にどう対応しますか?', a: 'LexiClash の無料の教室向け語彙ゲームは、復習とライブプレイにより、ミスした単語をライブゲームへの直接リンクに変えます。無料の教室ループに、20件というライブラリの上限はありません。Mentimeter Free(月50人)、Wooclap Starter(アクティブな質問5つ)、Nearpod Silver(参加40)、Blooket の無料プランの上限、Gimkit の Pro 限定モード(5人)とは別の仕組みです。' },
      { q: 'Wayground は Quizizz と同じですか?', a: 'Wayground は、Quizizz Inc. が Wayground の名称で運営するサービスです(Starter のヘルプ記事には support@wayground.com とあります)。Basic / Starter では、上記のアクティビティ/リソース20件というライブラリの上限が引き続き適用されます。' },
      { q: '生徒は LexiClash のアカウントが必要ですか?', a: '不要です。生徒は6文字のコードで参加します。Teacher Pro ではクラス数が無制限になり、印刷用レポートも使えます。無料プランでも、20件というライブラリの上限なしで、最大50人のクラス全体をすでにカバーできます。' },
      { q: 'LexiClash は Wayground のようなクイズプラットフォームですか?', a: 'カテゴリが異なります。Wayground は、評価・クイズ、レッスン、インタラクティブ動画、フラッシュカードのサービスです。LexiClash は語彙・語学練習のための単語づくりゲーム(Boggle 風のグリッド、アナグラム、ワードホイール)で、ミスをもとに教室でライブ復習ができます。' },
    ],
    ctaStart: 'クラスゲームを始める',
    related: [{ label: 'vs Mentimeter' }, { label: 'vs Wooclap' }, { label: 'vs Nearpod' }, { label: 'vs Blooket' }, { label: 'vs Gimkit' }],
  },

  ru: {
    eyebrow: 'Сравнение для образования',
    h1: 'LexiClash vs Wayground (Quizizz)',
    lede: 'Wayground Basic на [wayground.com/home/plans](https://wayground.com/home/plans) указывает **не более 20** в строке «Неограниченное хранилище заданий». Справка по Starter (Basic), обновлённая 12 мая 2026 года, подтверждает это на [help.wayground.com Starter plan](https://help.wayground.com/support/solutions/articles/158000404038-wayground-starter-basic-plan): «Храните до 20 ресурсов». У бесплатной классной игры LexiClash по лексике нет потолка в 20 ресурсов.',
    thCompetitor: 'Wayground Basic',
    rows: [
      ['Библиотека / хранилище заданий на бесплатном тарифе', '✓ Без потолка в 20 ресурсов', 'Basic: не более 20'],
      ['Повторение ошибок', '✓ Прямая ссылка в живую игру', 'Пересобрать / провести из библиотеки'],
      ['Без регистрации учеников', '✓ Код входа из 6 символов', 'PIN / код входа'],
      ['Тип игры', 'Составление слов (Boggle/Колесо/Анаграммы)', 'Викторина / урок / интерактивное видео'],
      ['Лучше всего подходит для', 'Лексики, правописания, ESL', 'Викторин на эрудицию, тестов, уроков'],
      ['Мультиплеер для всего класса', '✓ До 50 учеников бесплатно', 'До 100 учеников (Basic)'],
      ['Источник (Basic / Starter)', '—', 'Страница тарифов: «не более 20» + справка, обновлённая 12 мая 2026'],
    ],
    footnote: '',
    faqs: [
      { q: 'Ограничивает ли Wayground Basic число хранимых заданий?', a: 'Да. Wayground (Quizizz Inc., работает под названием Wayground) указывает для Basic на wayground.com/home/plans: «Неограниченное хранилище заданий → не более 20». В статье справки по Starter (Basic), обновлённой 12 мая 2026 года, сказано: «Лимит в 20 заданий: храните до 20 ресурсов в аккаунте». Дойдя до 20, нужно архивировать задания или перейти на платный тариф, чтобы создавать новые.' },
      { q: 'Как LexiClash отвечает на лимит Wayground Basic — 20 хранимых заданий?', a: 'Бесплатная классная игра LexiClash по лексике с повторением и живой игрой превращает пропущенные слова в прямую ссылку на живую игру — без потолка библиотеки в 20 ресурсов в бесплатном классном цикле. Это отличается от Mentimeter Free (50 участников в месяц), Wooclap Starter (5 активных вопросов), Nearpod Silver (40 подключений), лимитов бесплатного тарифа Blooket и Gimkit с режимами только для Pro (5 игроков).' },
      { q: 'Wayground — это то же самое, что Quizizz?', a: 'Wayground — это Quizizz Inc., работающая под названием Wayground (support@wayground.com в статье справки по Starter). На Basic / Starter по-прежнему действует описанный выше лимит библиотеки в 20 заданий или ресурсов.' },
      { q: 'Нужны ли ученикам аккаунты в LexiClash?', a: 'Нет. Ученики входят по коду из 6 символов. Teacher Pro добавляет неограниченное число классов и печатные отчёты; бесплатный тариф уже покрывает целый класс до 50 человек без потолка библиотеки в 20 заданий.' },
      { q: 'LexiClash — это платформа для викторин, как Wayground?', a: 'Это другая категория. Wayground — оценивание и викторины, уроки, интерактивные видео и карточки. LexiClash — игра в составление слов (сетки в стиле Boggle, анаграммы, колёса слов) для тренировки лексики и языка, с живым повторением в классе по ошибкам.' },
    ],
    ctaStart: 'Начать игру для класса',
    related: [{ label: 'vs Mentimeter' }, { label: 'vs Wooclap' }, { label: 'vs Nearpod' }, { label: 'vs Blooket' }, { label: 'vs Gimkit' }],
  },
};

export const copies: Record<Locale, VsFoilCopy> = Object.fromEntries(
  (Object.keys(pageCopy) as Locale[]).map((l) => [l, { ...common[l], ...pageCopy[l] }]),
) as Record<Locale, VsFoilCopy>;

export { resolveVsLocale };
