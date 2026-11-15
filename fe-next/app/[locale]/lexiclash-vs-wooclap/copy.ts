/**
 * Visible page text for /[locale]/lexiclash-vs-wooclap, in every locale.
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
    h1: "LexiClash vs Wooclap Starter — 5 active questions / 30d honesty",
    lede: "Wooclap Starter is free up to **5 active questions**; more than 5 active in **30 days** prompts an upgrade. Active = **3+ responses from unique participants**. The education pricing page lists **5 questions per month** and **Unlimited participants** (up to 1000 on all plans). LexiClash foils with free classroom vocab play **without an active-question meter** (question-quota honesty, not a participant-cap fight). Cite [Wooclap Help (pricing, June 2, 2026)](https://docs.wooclap.com/en/articles/14402104-what-is-wooclap-s-pricing) and [wooclap.com pricing-education](https://www.wooclap.com/en/pricing/pricing-education/).",
    thCompetitor: "Wooclap Starter",
    rows: [
      ['Free question / activity model', '✓ Free classroom vocab — no active-question meter', 'Starter: up to 5 active questions / 30 days'],
      ['What counts as “active”', '—', '3+ responses from unique participants in one event'],
      ['Pricing page Starter row', '—', '5 questions per month · Unlimited participants'],
      ['Participant cap', 'Whole-class free classroom seats (published LexiClash free limit)', 'Up to 1000 participants on all plans'],
      ['Miss → reteach Live', '✓ Free miss-gap → Live deep-link', 'Session results (export gated on paid plans)'],
      ['No student signup', '✓ 6-character join code', 'Audience joins Wooclap events'],
      ['Game / lesson type', 'Word-formation (Boggle/Wheel/Anagram)', 'Interactive presentations / polls / quizzes'],
      [
        'Evidence',
        '—',
        'docs…/14402104 (June 2, 2026) + wooclap.com/…/pricing-education',
      ],
    ],
    footnote: "Mentimeter Free 50/month is #1183. Nearpod Silver 40-join / 300 MB is #1169. Distinct from Blooket, Gimkit, Wayground, Kahoot Go.",
    faqs: [
      {
          q: "What is Wooclap Starter's free question limit?",
          a: 'Wooclap Help (docs.wooclap.com/en/articles/14402104, June 2, 2026): Starter is free and lets you present up to 5 active questions. A question becomes active when it receives 3 or more responses from unique participants in a single event. If you present more than 5 active questions in 30 days, you are prompted to upgrade. The education pricing page lists “5 questions per month” and “Unlimited participants” on Starter. Up to 1000 participants on all plans.',
      },
      {
          q: "How does LexiClash foil Wooclap Starter's 5 active / 30d meter?",
          a: 'LexiClash free classroom vocab runs without Wooclap’s active-question meter — question-quota honesty (5 active / 30 days), not a participant-cap fight. Distinct from Mentimeter Free 50/month/#1183, Nearpod Silver 40-join/#1169, Blooket Starter, Gimkit Pro-Exclusive, Wayground, and Kahoot Go Free.',
      },
      {
          q: 'Is LexiClash a live-polling tool like Wooclap?',
          a: 'Different category. Wooclap is interactive presentations / polls / quizzes with a Starter active-question counter. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free classroom play on the classroom loop.',
      },
      {
          q: 'Do students need accounts on LexiClash?',
          a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers classroom vocab word games without an active-question meter.',
      },
    ],
    ctaStart: "Start a classroom game",
    related: [
      { label: "vs Mentimeter" },
      { label: "vs Nearpod" },
      { label: "vs Kahoot" },
    ],
  },
  he: {
    eyebrow: 'השוואה כנה',
    h1: 'LexiClash מול Wooclap Starter — 5 שאלות פעילות ב-30 יום, בכנות',
    lede: 'Wooclap Starter חינמי עד **5 שאלות פעילות**; יותר מ-5 שאלות פעילות ב-**30 יום** מביא להצעת שדרוג. שאלה פעילה היא כזו שקיבלה **3 תשובות ויותר ממשתתפים שונים**. בעמוד התמחור לחינוך מופיעות **5 שאלות בחודש** ו-**משתתפים ללא הגבלה** (עד 1000 בכל התוכניות). LexiClash עונה על כך עם תרגול אוצר מילים חינמי בכיתה **בלי מונה שאלות פעילות** (כנות לגבי מכסת שאלות, לא ויכוח על תקרת משתתפים). מקורות: [מרכז העזרה של Wooclap (תמחור, 2 ביוני 2026)](https://docs.wooclap.com/en/articles/14402104-what-is-wooclap-s-pricing) ו-[wooclap.com pricing-education](https://www.wooclap.com/en/pricing/pricing-education/).',
    thCompetitor: 'Wooclap Starter',
    rows: [
      ['מודל שאלות / פעילויות בחינם', '✓ אוצר מילים כיתתי חינמי — בלי מונה שאלות פעילות', 'Starter: עד 5 שאלות פעילות ב-30 יום'],
      ['מה נחשב "פעילה"', '—', '3 תשובות ויותר ממשתתפים שונים באירוע אחד'],
      ['שורת Starter בעמוד התמחור', '—', '5 שאלות בחודש · משתתפים ללא הגבלה'],
      ['תקרת משתתפים', 'מקומות חינמיים לכל הכיתה (המגבלה החינמית המפורסמת של LexiClash)', 'עד 1000 משתתפים בכל התוכניות'],
      ['מטעויות לחזרה חיה', '✓ מילים שהוחמצו מובילות בקישור ישיר למשחק חי, בחינם', 'תוצאות מפגש (ייצוא רק בתוכניות בתשלום)'],
      ['בלי הרשמת תלמידים', '✓ קוד הצטרפות של 6 תווים', 'הקהל מצטרף לאירועי Wooclap'],
      ['סוג המשחק / השיעור', 'יצירת מילים (Boggle / גלגל / אנגרמות)', 'מצגות אינטראקטיביות / סקרים / חידונים'],
      ['מקור', '—', 'docs…/14402104 (2 ביוני 2026) + wooclap.com/…/pricing-education'],
    ],
    footnote: '',
    faqs: [
      { q: 'מהי מגבלת השאלות החינמית של Wooclap Starter?', a: 'מרכז העזרה של Wooclap (docs.wooclap.com/en/articles/14402104, 2 ביוני 2026): Starter חינמי ומאפשר להציג עד 5 שאלות פעילות. שאלה הופכת לפעילה כשהיא מקבלת 3 תשובות ויותר ממשתתפים שונים באירוע אחד. אם מציגים יותר מ-5 שאלות פעילות ב-30 יום, מוצעת שדרוג. בעמוד התמחור לחינוך מופיעות ב-Starter "5 שאלות בחודש" ו"משתתפים ללא הגבלה". עד 1000 משתתפים בכל התוכניות.' },
      { q: 'איך LexiClash מתמודד עם מונה 5 השאלות הפעילות ב-30 יום של Wooclap Starter?', a: 'אוצר המילים החינמי של LexiClash לכיתה פועל בלי מונה שאלות פעילות כמו של Wooclap — כנות לגבי מכסת שאלות (5 פעילות ב-30 יום), לא ויכוח על תקרת משתתפים. שונה מ-Mentimeter Free (50 בחודש), Nearpod Silver (40 הצטרפויות), Blooket Starter, Gimkit במצבי Pro בלבד, Wayground ו-Kahoot Go Free.' },
      { q: 'האם LexiClash הוא כלי סקרים חיים כמו Wooclap?', a: 'זו קטגוריה אחרת. Wooclap הוא מצגות אינטראקטיביות, סקרים וחידונים, עם מונה שאלות פעילות ב-Starter. LexiClash הוא יצירת מילים (רשתות בסגנון Boggle, אנגרמות, גלגלי מילים) לתרגול אוצר מילים — משחק חינמי בכיתה במעגל הכיתתי.' },
      { q: 'האם תלמידים צריכים חשבון ב-LexiClash?', a: 'לא. התלמידים מצטרפים עם קוד של 6 תווים. Teacher Pro מוסיף כיתות ללא הגבלה ודוחות להדפסה; המסלול החינמי כבר מכסה משחקי מילים לאוצר מילים בכיתה, בלי מונה שאלות פעילות.' },
    ],
    ctaStart: 'התחילו משחק כיתתי',
    related: [{ label: 'מול Mentimeter' }, { label: 'מול Nearpod' }, { label: 'מול Kahoot' }],
  },

  es: {
    eyebrow: 'Comparativa honesta',
    h1: 'LexiClash vs Wooclap Starter: 5 preguntas activas en 30 días, con honestidad',
    lede: 'Wooclap Starter es gratis hasta **5 preguntas activas**; si presentas más de 5 preguntas activas en **30 días**, te piden mejorar el plan. Una pregunta está activa cuando recibe **3 o más respuestas de participantes distintos**. La página de precios para educación indica **5 preguntas al mes** y **participantes ilimitados** (hasta 1000 en todos los planes). LexiClash responde con práctica de vocabulario gratuita en clase **sin contador de preguntas activas** (honestidad sobre la cuota de preguntas, no una pelea por el tope de participantes). Fuentes: [Ayuda de Wooclap (precios, 2 de junio de 2026)](https://docs.wooclap.com/en/articles/14402104-what-is-wooclap-s-pricing) y [wooclap.com pricing-education](https://www.wooclap.com/en/pricing/pricing-education/).',
    thCompetitor: 'Wooclap Starter',
    rows: [
      ['Modelo de preguntas / actividades gratis', '✓ Vocabulario de aula gratis, sin contador de preguntas activas', 'Starter: hasta 5 preguntas activas en 30 días'],
      ['Qué cuenta como «activa»', '—', '3 o más respuestas de participantes distintos en un mismo evento'],
      ['Fila Starter de la página de precios', '—', '5 preguntas al mes · participantes ilimitados'],
      ['Tope de participantes', 'Plazas gratuitas para toda la clase (el límite gratuito publicado de LexiClash)', 'Hasta 1000 participantes en todos los planes'],
      ['De los fallos al repaso en vivo', '✓ Los fallos llevan directamente a una partida en vivo, gratis', 'Resultados de la sesión (exportación solo en planes de pago)'],
      ['Sin registro del alumnado', '✓ Código de acceso de 6 caracteres', 'El público se une a los eventos de Wooclap'],
      ['Tipo de juego / lección', 'Formación de palabras (Boggle/Rueda/Anagramas)', 'Presentaciones interactivas / encuestas / cuestionarios'],
      ['Fuente', '—', 'docs…/14402104 (2 de junio de 2026) + wooclap.com/…/pricing-education'],
    ],
    footnote: '',
    faqs: [
      { q: '¿Cuál es el límite gratuito de preguntas de Wooclap Starter?', a: 'Ayuda de Wooclap (docs.wooclap.com/en/articles/14402104, 2 de junio de 2026): Starter es gratis y permite presentar hasta 5 preguntas activas. Una pregunta se vuelve activa cuando recibe 3 o más respuestas de participantes distintos en un mismo evento. Si presentas más de 5 preguntas activas en 30 días, te invitan a mejorar el plan. La página de precios para educación indica en Starter «5 preguntas al mes» y «participantes ilimitados». Hasta 1000 participantes en todos los planes.' },
      { q: '¿Cómo responde LexiClash al contador de 5 preguntas activas en 30 días de Wooclap Starter?', a: 'El vocabulario de aula gratuito de LexiClash funciona sin el contador de preguntas activas de Wooclap: honestidad sobre la cuota de preguntas (5 activas en 30 días), no una pelea por el tope de participantes. No es lo mismo que Mentimeter Free (50 al mes), Nearpod Silver (40 accesos), Blooket Starter, Gimkit con modos solo Pro, Wayground ni Kahoot Go Free.' },
      { q: '¿Es LexiClash una herramienta de encuestas en vivo como Wooclap?', a: 'Es otra categoría. Wooclap son presentaciones interactivas, encuestas y cuestionarios, con un contador de preguntas activas en Starter. LexiClash es un juego de formar palabras (cuadrículas estilo Boggle, anagramas, ruedas de palabras) para practicar vocabulario: juego gratuito en clase dentro del bucle de aula.' },
      { q: '¿Necesita el alumnado cuentas en LexiClash?', a: 'No. El alumnado se une con un código de 6 caracteres. Teacher Pro añade clases ilimitadas e informes imprimibles; el plan gratuito ya cubre los juegos de palabras de vocabulario en clase, sin contador de preguntas activas.' },
    ],
    ctaStart: 'Empezar una partida de clase',
    related: [{ label: 'vs Mentimeter' }, { label: 'vs Nearpod' }, { label: 'vs Kahoot' }],
  },

  sv: {
    eyebrow: 'Ärlig jämförelse',
    h1: 'LexiClash vs Wooclap Starter — 5 aktiva frågor på 30 dagar, ärligt talat',
    lede: 'Wooclap Starter är gratis upp till **5 aktiva frågor**; fler än 5 aktiva frågor på **30 dagar** leder till en uppmaning att uppgradera. En fråga är aktiv när den får **3 eller fler svar från olika deltagare**. Prissidan för utbildning anger **5 frågor per månad** och **obegränsat antal deltagare** (upp till 1000 i alla planer). LexiClash svarar med gratis ordförrådsträning i klassrummet **utan räknare för aktiva frågor** (ärlighet om frågekvoten, inte en strid om deltagartak). Källor: [Wooclaps hjälp (priser, 2 juni 2026)](https://docs.wooclap.com/en/articles/14402104-what-is-wooclap-s-pricing) och [wooclap.com pricing-education](https://www.wooclap.com/en/pricing/pricing-education/).',
    thCompetitor: 'Wooclap Starter',
    rows: [
      ['Gratis fråge- / aktivitetsmodell', '✓ Gratis ordförråd för klassrummet — ingen räknare för aktiva frågor', 'Starter: upp till 5 aktiva frågor på 30 dagar'],
      ['Vad som räknas som "aktiv"', '—', '3 eller fler svar från olika deltagare i ett och samma event'],
      ['Starter-raden på prissidan', '—', '5 frågor per månad · obegränsat antal deltagare'],
      ['Deltagartak', 'Gratisplatser för hela klassen (LexiClashs publicerade gratisgräns)', 'Upp till 1000 deltagare i alla planer'],
      ['Från miss till live-repetition', '✓ Missade ord leder direkt till ett live-spel, gratis', 'Sessionsresultat (export bara i betalplaner)'],
      ['Ingen elevregistrering', '✓ Anslutningskod med 6 tecken', 'Publiken går med i Wooclap-event'],
      ['Spel- / lektionstyp', 'Ordbildning (Boggle/Hjul/Anagram)', 'Interaktiva presentationer / enkäter / quiz'],
      ['Källa', '—', 'docs…/14402104 (2 juni 2026) + wooclap.com/…/pricing-education'],
    ],
    footnote: '',
    faqs: [
      { q: 'Vilken gratisgräns för frågor har Wooclap Starter?', a: 'Wooclaps hjälp (docs.wooclap.com/en/articles/14402104, 2 juni 2026): Starter är gratis och låter dig presentera upp till 5 aktiva frågor. En fråga blir aktiv när den får 3 eller fler svar från olika deltagare i ett och samma event. Presenterar du fler än 5 aktiva frågor på 30 dagar uppmanas du att uppgradera. Prissidan för utbildning anger för Starter "5 frågor per månad" och "obegränsat antal deltagare". Upp till 1000 deltagare i alla planer.' },
      { q: 'Hur svarar LexiClash på Wooclap Starters räknare på 5 aktiva frågor på 30 dagar?', a: 'LexiClashs gratis klassrumsordförråd körs utan Wooclaps räknare för aktiva frågor — ärlighet om frågekvoten (5 aktiva på 30 dagar), inte en strid om deltagartak. Skiljer sig från Mentimeter Free (50 per månad), Nearpod Silver (40 anslutningar), Blooket Starter, Gimkit med enbart Pro-lägen, Wayground och Kahoot Go Free.' },
      { q: 'Är LexiClash ett verktyg för liveomröstningar som Wooclap?', a: 'Det är en annan kategori. Wooclap är interaktiva presentationer, enkäter och quiz, med en räknare för aktiva frågor i Starter. LexiClash är ordbildning (Boggle-liknande rutnät, anagram, ordhjul) för ordförrådsträning — gratis spel i klassrummet i klassrumsloopen.' },
      { q: 'Behöver eleverna konton på LexiClash?', a: 'Nej. Eleverna går med med en kod på 6 tecken. Teacher Pro lägger till obegränsat antal klasser och utskrivbara rapporter; gratisnivån täcker redan ordspel för ordförråd i klassrummet, utan räknare för aktiva frågor.' },
    ],
    ctaStart: 'Starta ett klassrumsspel',
    related: [{ label: 'vs Mentimeter' }, { label: 'vs Nearpod' }, { label: 'vs Kahoot' }],
  },

  ja: {
    eyebrow: '正直な比較',
    h1: 'LexiClash vs Wooclap Starter — 30日で5問のアクティブ質問の上限を正直に比較',
    lede: 'Wooclap Starter は**アクティブな質問5つ**まで無料で、**30日間**に5つを超えるアクティブな質問を出すとアップグレードを促されます。アクティブとは、**別々の参加者から3件以上の回答**があることです。教育向けの料金ページには**月5問**と**参加者無制限**(全プランで最大1000人)と書かれています。LexiClash は、**アクティブ質問のカウンターなし**で、無料の教室向け語彙プレイを提供します(質問数の上限についての正直な比較で、参加者数の上限をめぐる争いではありません)。出典: [Wooclap ヘルプ(料金、2026年6月2日)](https://docs.wooclap.com/en/articles/14402104-what-is-wooclap-s-pricing)、[wooclap.com pricing-education](https://www.wooclap.com/en/pricing/pricing-education/)。',
    thCompetitor: 'Wooclap Starter',
    rows: [
      ['無料の質問/アクティビティのモデル', '✓ 無料の教室向け語彙 — アクティブ質問のカウンターなし', 'Starter: 30日で最大5つのアクティブな質問'],
      ['「アクティブ」とみなされる条件', '—', '1回のイベントで別々の参加者から3件以上の回答'],
      ['料金ページの Starter 行', '—', '月5問 · 参加者無制限'],
      ['参加者数の上限', 'クラス全員の無料の席(LexiClash が公開している無料の上限)', '全プランで最大1000人'],
      ['ミスからライブ復習へ', '✓ ミスした単語から無料のライブゲームへ直接リンク', 'セッション結果(エクスポートは有料プランのみ)'],
      ['生徒の登録不要', '✓ 6文字の参加コード', '参加者は Wooclap のイベントに参加'],
      ['ゲーム/授業のタイプ', '単語づくり(Boggle/ホイール/アナグラム)', 'インタラクティブなプレゼン / 投票 / クイズ'],
      ['出典', '—', 'docs…/14402104(2026年6月2日)+ wooclap.com/…/pricing-education'],
    ],
    footnote: '',
    faqs: [
      { q: 'Wooclap Starter の無料の質問数の上限は?', a: 'Wooclap ヘルプ(docs.wooclap.com/en/articles/14402104、2026年6月2日)では、Starter は無料で、アクティブな質問を最大5つまで出せます。1回のイベントで別々の参加者から3件以上の回答を受けた質問がアクティブになります。30日間に5つを超えるアクティブな質問を出すと、アップグレードを促されます。教育向けの料金ページでは、Starter は「月5問」「参加者無制限」とされています。参加者は全プランで最大1000人です。' },
      { q: 'LexiClash は Wooclap Starter の「30日で5問」のカウンターにどう対応しますか?', a: 'LexiClash の無料の教室向け語彙ゲームには、Wooclap のようなアクティブ質問のカウンターがありません。質問数の上限についての正直な比較であり、参加者数の上限をめぐる争いではありません。Mentimeter Free(月50)、Nearpod Silver(参加40)、Blooket Starter、Gimkit の Pro 限定モード、Wayground、Kahoot Go Free とは別の仕組みです。' },
      { q: 'LexiClash は Wooclap のようなライブ投票ツールですか?', a: 'カテゴリが異なります。Wooclap はインタラクティブなプレゼン、投票、クイズのツールで、Starter にはアクティブ質問のカウンターがあります。LexiClash は語彙練習のための単語づくりゲーム(Boggle 風のグリッド、アナグラム、ワードホイール)で、教室ループで無料で遊べます。' },
      { q: '生徒は LexiClash のアカウントが必要ですか?', a: '不要です。生徒は6文字のコードで参加します。Teacher Pro ではクラス数が無制限になり、印刷用レポートも使えます。無料プランでも、アクティブ質問のカウンターなしで、教室での語彙の単語ゲームをすでにカバーできます。' },
    ],
    ctaStart: 'クラスゲームを始める',
    related: [{ label: 'vs Mentimeter' }, { label: 'vs Nearpod' }, { label: 'vs Kahoot' }],
  },

  ru: {
    eyebrow: 'Честное сравнение',
    h1: 'LexiClash vs Wooclap Starter — 5 активных вопросов за 30 дней: честно',
    lede: 'Wooclap Starter бесплатен до **5 активных вопросов**; больше 5 активных вопросов за **30 дней** — повод предложить обновить тариф. Вопрос считается активным, если на него пришло **3 и более ответа от разных участников**. На странице цен для образования указаны **5 вопросов в месяц** и **неограниченное число участников** (до 1000 на всех тарифах). LexiClash отвечает бесплатной классной практикой лексики **без счётчика активных вопросов** (честный разговор о квоте вопросов, а не спор о потолке участников). Источники: [справка Wooclap (цены, 2 июня 2026)](https://docs.wooclap.com/en/articles/14402104-what-is-wooclap-s-pricing) и [wooclap.com pricing-education](https://www.wooclap.com/en/pricing/pricing-education/).',
    thCompetitor: 'Wooclap Starter',
    rows: [
      ['Бесплатная модель вопросов / заданий', '✓ Бесплатная классная лексика — без счётчика активных вопросов', 'Starter: до 5 активных вопросов за 30 дней'],
      ['Что считается «активным»', '—', '3 и более ответа от разных участников в одном событии'],
      ['Строка Starter на странице цен', '—', '5 вопросов в месяц · неограниченное число участников'],
      ['Потолок участников', 'Бесплатные места для всего класса (опубликованный бесплатный лимит LexiClash)', 'До 1000 участников на всех тарифах'],
      ['От ошибки к живому повторению', '✓ Пропущенные слова ведут прямой ссылкой в живую игру, бесплатно', 'Результаты сессии (экспорт только на платных тарифах)'],
      ['Без регистрации учеников', '✓ Код входа из 6 символов', 'Аудитория входит в события Wooclap'],
      ['Тип игры / урока', 'Составление слов (Boggle/Колесо/Анаграммы)', 'Интерактивные презентации / опросы / викторины'],
      ['Источник', '—', 'docs…/14402104 (2 июня 2026) + wooclap.com/…/pricing-education'],
    ],
    footnote: '',
    faqs: [
      { q: 'Каков бесплатный лимит вопросов у Wooclap Starter?', a: 'Справка Wooclap (docs.wooclap.com/en/articles/14402104, 2 июня 2026): Starter бесплатен и позволяет показать до 5 активных вопросов. Вопрос становится активным, когда получает 3 и более ответа от разных участников в одном событии. Если за 30 дней показать больше 5 активных вопросов, предложат обновить тариф. На странице цен для образования у Starter указаны «5 вопросов в месяц» и «неограниченное число участников». До 1000 участников на всех тарифах.' },
      { q: 'Как LexiClash отвечает на счётчик Wooclap Starter — 5 активных вопросов за 30 дней?', a: 'Бесплатная классная игра LexiClash по лексике работает без счётчика активных вопросов, как у Wooclap: речь о честной квоте вопросов (5 активных за 30 дней), а не о споре про потолок участников. Это отличается от Mentimeter Free (50 в месяц), Nearpod Silver (40 подключений), Blooket Starter, Gimkit с режимами только для Pro, Wayground и Kahoot Go Free.' },
      { q: 'LexiClash — это инструмент живых опросов, как Wooclap?', a: 'Это другая категория. Wooclap — интерактивные презентации, опросы и викторины, со счётчиком активных вопросов в Starter. LexiClash — игра в составление слов (сетки в стиле Boggle, анаграммы, колёса слов) для тренировки лексики: бесплатная игра в классе в классном цикле.' },
      { q: 'Нужны ли ученикам аккаунты в LexiClash?', a: 'Нет. Ученики входят по коду из 6 символов. Teacher Pro добавляет неограниченное число классов и печатные отчёты; бесплатный тариф уже покрывает словесные игры для лексики в классе без счётчика активных вопросов.' },
    ],
    ctaStart: 'Начать игру для класса',
    related: [{ label: 'vs Mentimeter' }, { label: 'vs Nearpod' }, { label: 'vs Kahoot' }],
  },
};

export const copies: Record<Locale, VsFoilCopy> = Object.fromEntries(
  (Object.keys(pageCopy) as Locale[]).map((l) => [l, { ...common[l], ...pageCopy[l] }]),
) as Record<Locale, VsFoilCopy>;

export { resolveVsLocale };
