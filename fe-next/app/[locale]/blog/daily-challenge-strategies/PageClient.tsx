'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { AdPlaceholder } from '@/components/ads';

type LocaleContent = {
  title: string;
  category: string;
  readTime: string;
  sections: Array<{
    title?: string;
    content: string;
  }>;
  backToBlog: string;
  tryDaily: string;
  practice: string;
};

const contentByLocale: Record<string, LocaleContent> = {
  he: {
    title: 'אסטרטגיות לאתגר היומי: מה באמת משנה',
    category: 'אסטרטגיה',
    readTime: 'זמן קריאה: 5 דקות',
    sections: [
      {
        content: `אתגרים יומיים הם שונים ממשחק רגיל. יש מגבלת זמן, יש דירוג, ויש רק הזדמנות אחת. הנה מה שלמדתי מכמה חודשים של משחק יומי - ומה שמחקרים קוגניטיביים אומרים על ביצועים תחת לחץ.`,
      },
      {
        title: 'התזמון חשוב',
        content: `מחקרים על קוגניציה מראים שרוב האנשים מגיעים לשיא הביצועים המנטליים בשעות הבוקר המוקדמות, בדרך כלל 2-4 שעות אחרי ההתעוררות. זה הזמן שבו הקורטקס הפרה-פרונטלי (אזור התכנון וקבלת ההחלטות) הכי פעיל.

אם אתם משחקים את האתגר היומי בלילה אחרי יום עבודה ארוך, אתם מתחרים עם גרסה פחות יעילה של עצמכם.`,
      },
      {
        title: 'סריקה לפני פעולה',
        content: `כשהלוח נפתח, אל תתחילו לכתוב מיד. עשו סריקה מהירה - 5-10 שניות - של כל האותיות. המוח יתחיל לעבד ברקע גם כשאתם לא מודעים לזה.

זו טכניקה שמשתמשים בה שחקני שחמט מקצועיים: להסתכל על הלוח כולו לפני שמתמקדים בנקודה ספציפית.`,
      },
      {
        title: 'מילים קצרות מייצרות מומנטום',
        content: `בניגוד לאינטואיציה, להתחיל עם מילים קצרות זה לא "לבזבז זמן". כל מילה שנמצאת משחררת לחץ פסיכולוגי ומשחררת משאבים קוגניטיביים לחיפוש הבא.

בנוסף, במשחקים עם הגבלת זמן, שלוש מילים של 3 אותיות (9 אותיות סך הכל) נותנות יותר נקודות מאשר מילה אחת של 7 אותיות שלקח לכם זמן רב למצוא.`,
      },
      {
        title: 'אל תתקעו על מילה אחת',
        content: `אם לא מצאתם מילה תוך 10-15 שניות, עברו הלאה. המוח לפעמים "ננעל" על דפוס מסוים. שינוי פוקוס לאזור אחר בלוח יכול לשחרר את החסימה.

שחקני סקראבל מנוסים קוראים לזה "היתקעות בצורה" - כשהמוח משוכנע שיש מילה מסוימת והוא מפסיק לחפש אחרות.`,
      },
      {
        title: 'הפסקה קצרה באמצע',
        content: `אם המשחק מאפשר, לקחת הפסקה של 5-10 שניות באמצע (גם אם זה רק לעצום עיניים) יכול לעזור. המוח ממשיך לעבד ברקע, ולפעמים התשובה "קופצת" אחרי ההפסקה.

זה קשור לתופעה הקרויה "אפקט האינקובציה" - פתרונות שמגיעים אחרי שמפסיקים לחשוב עליהם באופן פעיל.`,
      },
      {
        title: 'מה לגבי הדירוג?',
        content: `אם הדירוג מלחיץ אתכם, כדאי לדעת: לחץ מפעיל את מערכת ה-"ברח או הילחם" ומפחית את יעילות הקורטקס הפרה-פרונטלי. במילים אחרות, ככל שאתם יותר לחוצים על התוצאה, כך התוצאה כנראה תהיה פחות טובה.

גישה טובה יותר: להתמקד בתהליך (חיפוש שיטתי, סריקה של הלוח) ולא בתוצאה (דירוג, ניצחון).`,
      },
      {
        content: `הדבר הכי חשוב: זה משחק. המטרה היא ליהנות. אם זה מלחיץ, אולי שווה לשחק את מצב התרגול החופשי במקום האתגר היומי.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  en: {
    title: 'Daily Challenge Strategies: What Actually Matters',
    category: 'Strategy',
    readTime: '5 min read',
    sections: [
      {
        content: `Daily challenges are different from regular play. There's a time limit, there's ranking, and there's only one chance. Here's what I learned from several months of daily play—and what cognitive research says about performance under pressure.`,
      },
      {
        title: 'Timing Matters',
        content: `Cognitive research shows that most people reach peak mental performance in the early morning hours, typically 2-4 hours after waking. This is when the prefrontal cortex (the planning and decision-making area) is most active.

If you're playing the daily challenge at night after a long workday, you're competing against a less efficient version of yourself.`,
      },
      {
        title: 'Scan Before Acting',
        content: `When the board opens, don't start typing immediately. Do a quick scan—5-10 seconds—of all the letters. Your brain will start processing in the background even when you're not consciously aware of it.

This is a technique professional chess players use: looking at the entire board before focusing on a specific point.`,
      },
      {
        title: 'Short Words Build Momentum',
        content: `Counter-intuitively, starting with short words isn't "wasting time." Each found word releases psychological pressure and frees cognitive resources for the next search.

Also, in timed games, three 3-letter words (9 letters total) often give more points than one 7-letter word that took you a long time to find.`,
      },
      {
        title: "Don't Get Stuck on One Word",
        content: `If you haven't found a word in 10-15 seconds, move on. The brain sometimes "locks" onto a certain pattern. Shifting focus to a different area of the board can release the block.

Experienced Scrabble players call this "getting stuck in a shape"—when the brain is convinced a certain word exists and stops looking for others.`,
      },
      {
        title: 'A Short Break Midway',
        content: `If the game allows, taking a 5-10 second break in the middle (even just closing your eyes) can help. The brain continues processing in the background, and sometimes the answer "pops" after the break.

This is related to the phenomenon called the "incubation effect"—solutions that arrive after you stop actively thinking about them.`,
      },
      {
        title: 'What About the Ranking?',
        content: `If ranking stresses you, know this: stress activates the "fight or flight" system and reduces the efficiency of the prefrontal cortex. In other words, the more stressed you are about the result, the worse the result is likely to be.

A better approach: focus on the process (systematic search, scanning the board) not the outcome (ranking, winning).`,
      },
      {
        content: `The most important thing: it's a game. The goal is to enjoy it. If it's stressful, maybe it's worth playing free practice mode instead of the daily challenge.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  sv: {
    title: 'Strategier för dagliga utmaningen: Vad som faktiskt spelar roll',
    category: 'Strategi',
    readTime: '5 min läsning',
    sections: [
      {
        content: `Dagliga utmaningar skiljer sig från vanligt spel. Det finns en tidsgräns, det finns ranking, och det finns bara en chans. Här är vad jag lärde mig från flera månaders dagligt spelande—och vad kognitiv forskning säger om prestation under press.`,
      },
      {
        title: 'Timing spelar roll',
        content: `Kognitiv forskning visar att de flesta når topp mental prestation under de tidiga morgontimmarna, vanligtvis 2-4 timmar efter uppvaknande. Det är då den prefrontala cortex (planerings- och beslutsområdet) är mest aktivt.

Om du spelar den dagliga utmaningen på kvällen efter en lång arbetsdag tävlar du mot en mindre effektiv version av dig själv.`,
      },
      {
        title: 'Scanna innan du agerar',
        content: `När brädet öppnas, börja inte skriva direkt. Gör en snabb scanning—5-10 sekunder—av alla bokstäver. Din hjärna börjar bearbeta i bakgrunden även när du inte är medvetet medveten om det.

Detta är en teknik professionella schackspelare använder: att titta på hela brädet innan de fokuserar på en specifik punkt.`,
      },
      {
        title: 'Korta ord bygger momentum',
        content: `Motintuitivt är att börja med korta ord inte "slöseri med tid." Varje hittat ord frigör psykologiskt tryck och frigör kognitiva resurser för nästa sökning.

Dessutom, i tidsbegränsade spel ger tre trebokstavsord (9 bokstäver totalt) ofta fler poäng än ett sjubokstavsord som tog lång tid att hitta.`,
      },
      {
        title: 'Fastna inte på ett ord',
        content: `Om du inte hittat ett ord på 10-15 sekunder, gå vidare. Hjärnan "låser sig" ibland på ett visst mönster. Att flytta fokus till ett annat område av brädet kan släppa blockeringen.

Erfarna Scrabble-spelare kallar detta "att fastna i en form"—när hjärnan är övertygad om att ett visst ord finns och slutar leta efter andra.`,
      },
      {
        title: 'En kort paus halvvägs',
        content: `Om spelet tillåter kan en 5-10 sekunders paus i mitten (även bara att blunda) hjälpa. Hjärnan fortsätter bearbeta i bakgrunden, och ibland "dyker" svaret upp efter pausen.

Detta relaterar till fenomenet kallat "inkubationseffekten"—lösningar som kommer efter att man slutat aktivt tänka på dem.`,
      },
      {
        title: 'Hur är det med rankingen?',
        content: `Om ranking stressar dig, vet detta: stress aktiverar "kamp eller flykt"-systemet och minskar effektiviteten i den prefrontala cortex. Med andra ord, ju mer stressad du är över resultatet, desto sämre blir troligen resultatet.

Ett bättre tillvägagångssätt: fokusera på processen (systematisk sökning, scanning av brädet) inte resultatet (ranking, vinst).`,
      },
      {
        content: `Det viktigaste: det är ett spel. Målet är att njuta. Om det är stressigt kanske det är värt att spela fritt övningsläge istället för den dagliga utmaningen.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Dagens Utmaning',
    practice: 'Öva',
  },
  ja: {
    title: 'デイリーチャレンジ戦略：本当に重要なこと',
    category: '戦略',
    readTime: '読了時間：5分',
    sections: [
      {
        content: `デイリーチャレンジは通常のプレイとは違います。時間制限があり、ランキングがあり、チャンスは一度だけ。数ヶ月のデイリープレイから学んだこと、そしてプレッシャー下でのパフォーマンスについて認知研究が示していることをお伝えします。`,
      },
      {
        title: 'タイミングが重要',
        content: `認知研究によると、ほとんどの人は早朝、通常は起床後2〜4時間で精神的パフォーマンスのピークに達します。これは前頭前皮質（計画と意思決定の領域）が最も活発な時です。

長い仕事の日の後の夜にデイリーチャレンジをプレイしているなら、自分の効率の悪いバージョンと競争していることになります。`,
      },
      {
        title: '行動する前にスキャン',
        content: `ボードが開いたら、すぐに入力を始めないでください。すべての文字を5〜10秒でさっとスキャンしてください。意識していなくても、脳はバックグラウンドで処理を始めます。

これはプロのチェスプレイヤーが使うテクニックです：特定のポイントに集中する前にボード全体を見ること。`,
      },
      {
        title: '短い言葉が勢いを作る',
        content: `直感に反しますが、短い言葉から始めることは「時間の無駄」ではありません。見つけた言葉ごとに心理的プレッシャーが解放され、次の検索のための認知リソースが解放されます。

また、時間制限のあるゲームでは、3文字の言葉3つ（合計9文字）は、見つけるのに長い時間がかかった7文字の言葉1つより多くのポイントを与えることがよくあります。`,
      },
      {
        title: '1つの言葉に固執しない',
        content: `10〜15秒で言葉が見つからなければ、先に進みましょう。脳は特定のパターンに「ロック」することがあります。ボードの別の領域にフォーカスを移すと、ブロックが解除されることがあります。

経験豊富なスクラブルプレイヤーはこれを「形に固まる」と呼びます—脳が特定の言葉が存在すると確信し、他を探すのをやめる時です。`,
      },
      {
        title: '途中で短い休憩',
        content: `ゲームが許すなら、途中で5〜10秒の休憩を取る（目を閉じるだけでも）と役立ちます。脳はバックグラウンドで処理を続け、休憩後に答えが「ポップアップ」することがあります。

これは「インキュベーション効果」と呼ばれる現象に関連しています—積極的に考えるのをやめた後に解決策が来ること。`,
      },
      {
        title: 'ランキングについては？',
        content: `ランキングがストレスなら、これを知ってください：ストレスは「闘争または逃走」システムを活性化し、前頭前皮質の効率を低下させます。言い換えれば、結果についてストレスを感じれば感じるほど、結果は悪くなる可能性が高いです。

より良いアプローチ：結果（ランキング、勝利）ではなく、プロセス（体系的な検索、ボードのスキャン）に集中すること。`,
      },
      {
        content: `最も重要なこと：これはゲームです。目標は楽しむこと。ストレスなら、デイリーチャレンジではなくフリー練習モードでプレイする価値があるかもしれません。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習',
  },
  es: {
    title: 'Estrategias para el desafío diario: Lo que realmente importa',
    category: 'Estrategia',
    readTime: '5 min de lectura',
    sections: [
      {
        content: `Los desafíos diarios son diferentes del juego regular. Hay límite de tiempo, hay ranking, y solo hay una oportunidad. Aquí está lo que aprendí de varios meses de juego diario—y lo que la investigación cognitiva dice sobre el rendimiento bajo presión.`,
      },
      {
        title: 'El momento importa',
        content: `La investigación cognitiva muestra que la mayoría de las personas alcanzan el máximo rendimiento mental en las primeras horas de la mañana, típicamente 2-4 horas después de despertar. Es cuando la corteza prefrontal (el área de planificación y toma de decisiones) está más activa.

Si juegas el desafío diario por la noche después de un largo día de trabajo, estás compitiendo contra una versión menos eficiente de ti mismo.`,
      },
      {
        title: 'Escanea antes de actuar',
        content: `Cuando se abre el tablero, no empieces a escribir de inmediato. Haz un escaneo rápido—5-10 segundos—de todas las letras. Tu cerebro comenzará a procesar en segundo plano incluso cuando no eres consciente de ello.

Esta es una técnica que usan los jugadores profesionales de ajedrez: mirar todo el tablero antes de enfocarse en un punto específico.`,
      },
      {
        title: 'Palabras cortas generan impulso',
        content: `Contra la intuición, empezar con palabras cortas no es "perder tiempo." Cada palabra encontrada libera presión psicológica y libera recursos cognitivos para la siguiente búsqueda.

Además, en juegos con tiempo, tres palabras de 3 letras (9 letras en total) a menudo dan más puntos que una palabra de 7 letras que te tomó mucho tiempo encontrar.`,
      },
      {
        title: 'No te atasques en una palabra',
        content: `Si no has encontrado una palabra en 10-15 segundos, sigue adelante. El cerebro a veces se "bloquea" en cierto patrón. Cambiar el enfoque a un área diferente del tablero puede liberar el bloqueo.

Los jugadores experimentados de Scrabble llaman a esto "quedarse atascado en una forma"—cuando el cerebro está convencido de que cierta palabra existe y deja de buscar otras.`,
      },
      {
        title: 'Una pausa corta a la mitad',
        content: `Si el juego lo permite, tomar una pausa de 5-10 segundos a la mitad (incluso solo cerrar los ojos) puede ayudar. El cerebro continúa procesando en segundo plano, y a veces la respuesta "aparece" después de la pausa.

Esto se relaciona con el fenómeno llamado "efecto de incubación"—soluciones que llegan después de dejar de pensar activamente en ellas.`,
      },
      {
        title: '¿Qué pasa con el ranking?',
        content: `Si el ranking te estresa, sabe esto: el estrés activa el sistema de "lucha o huida" y reduce la eficiencia de la corteza prefrontal. En otras palabras, cuanto más estresado estés por el resultado, peor será probablemente el resultado.

Un mejor enfoque: enfócate en el proceso (búsqueda sistemática, escaneo del tablero) no en el resultado (ranking, ganar).`,
      },
      {
        content: `Lo más importante: es un juego. El objetivo es disfrutar. Si es estresante, quizás vale la pena jugar el modo de práctica libre en lugar del desafío diario.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    tryDaily: 'Desafío Diario',
    practice: 'Practicar',
  },
};

export default function StrategiesPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = (params.locale as string) || language;
  const isDarkMode = theme === 'dark';

  const content = contentByLocale[locale] || contentByLocale.en;

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-gradient-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <article className="max-w-3xl mx-auto px-4 py-8 page-content-safe">
        <Link href={`/${locale}/blog`}>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'mb-6 rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-neo-black hover:bg-neo-cream'
            )}
          >
            <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
            {content.backToBlog}
          </Button>
        </Link>

        <header className="mb-8">
          <div className="mb-4">
            <span className={cn(
              'inline-block px-3 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black',
              'bg-neo-cyan text-neo-black'
            )}>
              {content.category}
            </span>
          </div>

          <h1 className={cn(
            'text-3xl md:text-4xl font-black mb-4 leading-tight',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {content.title}
          </h1>

          <div className={cn(
            'flex flex-wrap items-center gap-4 text-sm mb-6',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date('2026-01-30').toLocaleDateString(language, { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {content.readTime}
            </span>
          </div>
        </header>

        {/* Ad: After hero */}
        <AdPlaceholder zone="content-page" className="my-6" />

        <div className={cn(
          'prose prose-lg max-w-none',
          isDarkMode ? 'prose-invert' : ''
        )}>
          {content.sections.map((section, index) => (
            <div key={index} className="mb-6">
              {section.title && (
                <h2 className={cn(
                  'text-xl font-bold mb-3 mt-8',
                  isDarkMode ? 'text-white' : 'text-neo-black'
                )}>
                  {section.title}
                </h2>
              )}
              {section.content.split('\n\n').map((paragraph, pIndex) => (
                <p
                  key={pIndex}
                  className={cn(
                    'mb-4 leading-relaxed',
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  )}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ))}

          {/* Ad: Before CTAs */}
          <AdPlaceholder zone="content-page" className="my-6" />

          <div className={cn('mt-12 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.tryDaily}
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-orange text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.practice}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
