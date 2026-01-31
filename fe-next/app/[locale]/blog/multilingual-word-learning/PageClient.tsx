'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

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
    title: 'למה המוח שלך מתבלבל בין שפות (ולמה זה בעצם טוב)',
    category: 'מדע קוגניטיבי',
    readTime: 'זמן קריאה: 5 דקות',
    sections: [
      {
        content: `אם פעם שיחקת משחק מילים בשפה אחת ומצאת את עצמך כותב מילה משפה אחרת - אתה לא לבד. יש סיבה מדעית למה זה קורה, וזה קשור לאיך המוח מאחסן שפות.`,
      },
      {
        title: 'המודל ההיררכי המתוקן',
        content: `חוקרים מתארים את הדרך שבה המוח מאחסן שפות במשהו שנקרא "המודל ההיררכי המתוקן" (Revised Hierarchical Model). לפי המודל הזה, יש לנו מחסן מושגים משותף - כל מה שאנחנו יודעים על העולם - ולידו שני לקסיקונים נפרדים, אחד לכל שפה.

כשאנחנו מתחילים ללמוד שפה שנייה, אנחנו משתמשים במילים מהשפה הראשונה כגשר. רואים כלב, חושבים "כלב" בעברית, ואז מתרגמים ל-"dog". עם הזמן, הקשר הישיר בין המושג לשפה השנייה מתחזק, והגשר הופך פחות נחוץ.

אבל - וזה החלק המעניין - שתי השפות תמיד פעילות במקביל.`,
      },
      {
        title: 'מחקר: שפות מתחרות על גישה',
        content: `מחקר שפורסם ב-Bilingualism: Language and Cognition מצא שכששתי שפות פעילות, הן מתחרות על גישה לקסיקלית-סמנטית. השפה שלא בשימוש צריכה להידחק, ומתי שעוברים אליה - הרשת הלקסיקלית-סמנטית שלה צריכה להיות מופעלת מחדש.

במילים פשוטות: המוח צריך לעבוד קשה יותר כשהוא עובר בין שפות. זה מסביר למה אחרי שעה של משחק באנגלית, המילה הראשונה שעולה לך יכולה להיות בעברית.`,
      },
      {
        title: 'הפתעה: הבלבול הוא אימון',
        content: `מחקר מ-2023 ב-Frontiers in Psychology בדק 266 דוברים דו-לשוניים צרפתיים-קנדיים. הם מצאו שאנשים שעוברים בין שפות באופן קבוע ("מחליפי קוד") מפגינים יתרונות בשליטה מעכבת - היכולת לדכא תגובות אוטומטיות.

הסיבה: כשאתה צריך לנטר באיזו שפה אתה נמצא ולבחור את השפה הנכונה תוך כדי תחרות בין שתי שפות פעילות, אתה מאמן את היכולת הקוגניטיבית שלך לשליטה וניטור מטרות.`,
      },
      {
        title: 'משחקים ורכישת אוצר מילים',
        content: `סקירה שיטתית מ-2024 ב-AWEJ ניתחה 17 מחקרים על למידה מבוססת משחקים ורכישת אוצר מילים. הממצא המרכזי: משחקים יוצרים סביבת למידה חיובית שבה הסטודנטים חווים רגשות חיוביים - מה שמשפר את שמירת המילים בזיכרון.

מחקר נפרד של אוניברסיטת AWEJ (ספטמבר 2024) על 100 סטודנטים סעודיים מצא שמי שלמד עם משחקי וידאו דיווח על מעורבות גבוהה יותר, מוטיבציה מוגברת, וחרדת שפה מופחתת.`,
      },
      {
        title: 'העברה בין-לשונית',
        content: `מחקר מ-PMC (2024) על זיכרון עבודה והשפעה בין-לשונית מצא שידע של שתי מערכות לשוניות (או יותר) יכול להאיץ את רכישת שפה חדשה. החוקרים קוראים לזה "העברה בין-לשונית" (cross-linguistic transfer).

מה שעוד יותר מעניין: ממצאים נוירו-קוגניטיביים מראים ששפות של דו-לשוניים מופעלות באופן רציף, גם כשהם עובדים בסביבה חד-לשונית. המוח לא באמת "מכבה" שפה - הוא רק מדכא אותה.`,
      },
      {
        content: `אז בפעם הבאה שתכתוב מילה בשפה הלא נכונה במשחק - תדע שזה לא טעות. זה סימן שהמוח שלך עובד בדיוק כמו שהוא צריך: עם כמה שפות פעילות במקביל, מתחרות על הבמה.

וזה, לפי המחקר, דבר טוב.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  en: {
    title: 'Why Your Brain Mixes Languages (And Why That\'s Actually Good)',
    category: 'Cognitive Science',
    readTime: '5 min read',
    sections: [
      {
        content: `If you've ever played a word game in one language and found yourself typing a word from another language, you're not alone. There's a scientific reason this happens, and it's connected to how your brain stores languages.`,
      },
      {
        title: 'The Revised Hierarchical Model',
        content: `Researchers describe how the brain stores languages using something called the "Revised Hierarchical Model." According to this model, we have a shared conceptual store - everything we know about the world - alongside two separate lexicons, one for each language.

When we start learning a second language, we use words from our first language as a bridge. We see a dog, think "dog" in our native language, then translate. Over time, the direct connection between the concept and the second language strengthens, and the bridge becomes less necessary.

But here's the interesting part: both languages remain active simultaneously.`,
      },
      {
        title: 'Research: Languages Compete for Access',
        content: `Research published in Bilingualism: Language and Cognition found that when two languages are active, they compete for lexical-semantic access. The non-target language must be inhibited, and when switching to a language that has been inhibited, that lexical-semantic network must be reactivated.

In simpler terms: the brain has to work harder when switching between languages. This explains why after an hour of playing in English, the first word that comes to mind might be in your native language.`,
      },
      {
        title: 'The Surprise: Confusion Is Training',
        content: `A 2023 study in Frontiers in Psychology examined 266 French Canadian bilinguals. They found that people who regularly switch between languages ("code-switchers") demonstrate advantages in inhibitory control - the ability to suppress automatic responses.

The reason: when you need to monitor which language you're in and select the correct language while both languages compete, you're training your cognitive capacity for control and goal-monitoring.`,
      },
      {
        title: 'Games and Vocabulary Acquisition',
        content: `A 2024 systematic review in AWEJ analyzed 17 studies on game-based learning and vocabulary acquisition. The key finding: games create a positive learning environment where students experience positive emotions - which improves vocabulary retention.

A separate study from AWEJ (September 2024) involving 100 Saudi students found that those who learned through video games reported higher engagement, increased motivation, and reduced language anxiety.`,
      },
      {
        title: 'Cross-Linguistic Transfer',
        content: `A 2024 PMC study on working memory and cross-linguistic influence found that knowledge of two (or more) linguistic systems can accelerate the acquisition of a new language. Researchers call this "cross-linguistic transfer."

What's even more interesting: neurocognitive findings show that bilinguals' languages are continuously activated, even when working in a monolingual-oriented environment. The brain doesn't actually "turn off" a language - it just suppresses it.`,
      },
      {
        content: `So next time you type a word in the wrong language during a game, know that it's not a mistake. It's a sign that your brain is working exactly as it should: with multiple languages active simultaneously, competing for the stage.

And that, according to research, is a good thing.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  sv: {
    title: 'Varför din hjärna blandar språk (och varför det är bra)',
    category: 'Kognitiv vetenskap',
    readTime: '5 min läsning',
    sections: [
      {
        content: `Om du någonsin spelat ett ordspel på ett språk och plötsligt skrivit ett ord på ett annat språk - du är inte ensam. Det finns en vetenskaplig förklaring till varför detta händer, och det handlar om hur hjärnan lagrar språk.`,
      },
      {
        title: 'Den reviderade hierarkiska modellen',
        content: `Forskare beskriver hur hjärnan lagrar språk med hjälp av den "reviderade hierarkiska modellen" (Revised Hierarchical Model). Enligt denna modell har vi ett gemensamt konceptuellt förråd - allt vi vet om världen - tillsammans med två separata lexikon, ett för varje språk.

När vi börjar lära oss ett andra språk använder vi ord från vårt första språk som en brygga. Vi ser en hund, tänker "hund" på modersmålet, och översätter sedan. Med tiden stärks den direkta kopplingen mellan konceptet och det andra språket, och bryggan blir mindre nödvändig.

Men det intressanta är: båda språken förblir aktiva samtidigt.`,
      },
      {
        title: 'Forskning: Språk tävlar om tillgång',
        content: `Forskning publicerad i Bilingualism: Language and Cognition visade att när två språk är aktiva tävlar de om lexikal-semantisk tillgång. Det icke-målspråket måste hämmas, och när man byter till ett språk som har hämmats måste det lexikal-semantiska nätverket återaktiveras.

Enkelt uttryckt: hjärnan måste arbeta hårdare när den växlar mellan språk. Detta förklarar varför det första ordet som dyker upp efter en timme av spel på engelska kan vara på svenska.`,
      },
      {
        title: 'Överraskningen: Förvirring är träning',
        content: `En studie från 2023 i Frontiers in Psychology undersökte 266 fransk-kanadensiska tvåspråkiga. De fann att personer som regelbundet växlar mellan språk ("kodväxlare") visar fördelar i inhiberingskontroll - förmågan att undertrycka automatiska svar.

Anledningen: när du behöver övervaka vilket språk du är i och välja rätt språk medan båda språken konkurrerar, tränar du din kognitiva kapacitet för kontroll och målövervakning.`,
      },
      {
        title: 'Spel och ordförrådsinlärning',
        content: `En systematisk granskning från 2024 i AWEJ analyserade 17 studier om spelbaserat lärande och ordförrådsinlärning. Huvudfyndet: spel skapar en positiv inlärningsmiljö där studenter upplever positiva känslor - vilket förbättrar ordförrådsretentionen.

En separat studie från AWEJ (september 2024) med 100 saudiska studenter fann att de som lärde sig genom videospel rapporterade högre engagemang, ökad motivation och minskad språkångest.`,
      },
      {
        title: 'Tvärspråklig överföring',
        content: `En PMC-studie från 2024 om arbetsminne och tvärspråkligt inflytande fann att kunskap om två (eller fler) språksystem kan påskynda inlärningen av ett nytt språk. Forskarna kallar detta "tvärspråklig överföring" (cross-linguistic transfer).

Ännu mer intressant: neurokognitiva fynd visar att tvåspråkigas språk är kontinuerligt aktiverade, även när de arbetar i en enspråkig miljö. Hjärnan stänger inte riktigt "av" ett språk - den undertrycker det bara.`,
      },
      {
        content: `Så nästa gång du skriver ett ord på fel språk under ett spel, vet att det inte är ett misstag. Det är ett tecken på att din hjärna fungerar precis som den ska: med flera språk aktiva samtidigt som tävlar om scenen.

Och det, enligt forskningen, är en bra sak.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Dagens Utmaning',
    practice: 'Öva',
  },
  ja: {
    title: '脳が言語を混ぜる理由（そしてそれが良いことである理由）',
    category: '認知科学',
    readTime: '読了時間：5分',
    sections: [
      {
        content: `ある言語でワードゲームをプレイしていて、別の言語の単語を入力してしまったことはありませんか？あなただけではありません。これが起こる科学的な理由があり、それは脳が言語をどのように保存するかに関係しています。`,
      },
      {
        title: '改訂階層モデル',
        content: `研究者たちは、脳が言語を保存する方法を「改訂階層モデル」（Revised Hierarchical Model）を使って説明しています。このモデルによると、私たちには共有の概念ストア（世界について知っているすべてのこと）と、各言語用の2つの別々の語彙があります。

第二言語を学び始めるとき、私たちは第一言語の単語を橋として使います。犬を見て、母国語で「犬」と考え、それから翻訳します。時間が経つにつれて、概念と第二言語の間の直接的なつながりが強くなり、橋は必要なくなります。

しかし、興味深いのは、両方の言語が同時にアクティブなままであるということです。`,
      },
      {
        title: '研究：言語はアクセスを競う',
        content: `Bilingualism: Language and Cognitionに発表された研究によると、2つの言語がアクティブなとき、それらは語彙・意味的アクセスを競います。ターゲットでない言語は抑制されなければならず、抑制されていた言語に切り替えるとき、その語彙・意味的ネットワークを再活性化する必要があります。

簡単に言えば：言語を切り替えるとき、脳はより激しく働かなければなりません。これは、英語で1時間プレイした後、最初に思い浮かぶ単語が母国語である理由を説明しています。`,
      },
      {
        title: '驚き：混乱はトレーニング',
        content: `Frontiers in Psychologyの2023年の研究では、266人のフランス系カナダ人バイリンガルを調査しました。定期的に言語を切り替える人（「コードスイッチャー」）は、抑制制御（自動的な反応を抑える能力）に優位性を示すことがわかりました。

理由：どの言語にいるかを監視し、両方の言語が競合している間に正しい言語を選択する必要があるとき、制御と目標監視のための認知能力をトレーニングしているのです。`,
      },
      {
        title: 'ゲームと語彙習得',
        content: `AWEJの2024年の系統的レビューでは、ゲームベースの学習と語彙習得に関する17の研究を分析しました。主な発見：ゲームは学生がポジティブな感情を経験するポジティブな学習環境を作り出し、それが語彙の保持を向上させます。

AWEJの別の研究（2024年9月）では、100人のサウジアラビアの学生を対象に、ビデオゲームを通じて学んだ学生は、より高いエンゲージメント、モチベーションの向上、言語不安の軽減を報告しました。`,
      },
      {
        title: '言語間転移',
        content: `作業記憶と言語間影響に関するPMCの2024年の研究では、2つ（またはそれ以上）の言語システムの知識が新しい言語の習得を加速できることがわかりました。研究者はこれを「言語間転移」（cross-linguistic transfer）と呼んでいます。

さらに興味深いのは、神経認知学的な発見によると、バイリンガルの言語は、単一言語の環境で作業しているときでも継続的に活性化されているということです。脳は実際には言語を「オフ」にしません - 抑制するだけです。`,
      },
      {
        content: `だから次にゲーム中に間違った言語で単語を入力しても、それは間違いではないと知ってください。それはあなたの脳が正確に機能している証拠です：複数の言語が同時にアクティブで、ステージを競っています。

そして、研究によると、それは良いことです。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習',
  },
  es: {
    title: 'Por qué tu cerebro mezcla idiomas (y por qué eso es bueno)',
    category: 'Ciencia Cognitiva',
    readTime: '5 min de lectura',
    sections: [
      {
        content: `Si alguna vez has jugado un juego de palabras en un idioma y te has encontrado escribiendo una palabra de otro idioma, no estás solo. Hay una razón científica por la que esto sucede, y está relacionada con cómo tu cerebro almacena los idiomas.`,
      },
      {
        title: 'El Modelo Jerárquico Revisado',
        content: `Los investigadores describen cómo el cerebro almacena idiomas usando algo llamado "Modelo Jerárquico Revisado" (Revised Hierarchical Model). Según este modelo, tenemos un almacén conceptual compartido - todo lo que sabemos sobre el mundo - junto con dos léxicos separados, uno para cada idioma.

Cuando empezamos a aprender un segundo idioma, usamos palabras de nuestro primer idioma como puente. Vemos un perro, pensamos "perro" en nuestro idioma nativo, y luego traducimos. Con el tiempo, la conexión directa entre el concepto y el segundo idioma se fortalece, y el puente se vuelve menos necesario.

Pero aquí está lo interesante: ambos idiomas permanecen activos simultáneamente.`,
      },
      {
        title: 'Investigación: Los idiomas compiten por acceso',
        content: `Investigación publicada en Bilingualism: Language and Cognition encontró que cuando dos idiomas están activos, compiten por acceso léxico-semántico. El idioma no objetivo debe ser inhibido, y cuando se cambia a un idioma que ha sido inhibido, esa red léxico-semántica debe ser reactivada.

En términos más simples: el cerebro tiene que trabajar más duro cuando cambia entre idiomas. Esto explica por qué después de una hora jugando en inglés, la primera palabra que viene a la mente podría ser en tu idioma nativo.`,
      },
      {
        title: 'La sorpresa: La confusión es entrenamiento',
        content: `Un estudio de 2023 en Frontiers in Psychology examinó a 266 bilingües franco-canadienses. Encontraron que las personas que cambian regularmente entre idiomas ("code-switchers") demuestran ventajas en control inhibitorio - la capacidad de suprimir respuestas automáticas.

La razón: cuando necesitas monitorear en qué idioma estás y seleccionar el idioma correcto mientras ambos idiomas compiten, estás entrenando tu capacidad cognitiva para el control y monitoreo de objetivos.`,
      },
      {
        title: 'Juegos y adquisición de vocabulario',
        content: `Una revisión sistemática de 2024 en AWEJ analizó 17 estudios sobre aprendizaje basado en juegos y adquisición de vocabulario. El hallazgo clave: los juegos crean un ambiente de aprendizaje positivo donde los estudiantes experimentan emociones positivas - lo que mejora la retención de vocabulario.

Un estudio separado de AWEJ (septiembre 2024) con 100 estudiantes saudíes encontró que aquellos que aprendieron a través de videojuegos reportaron mayor compromiso, mayor motivación y reducida ansiedad lingüística.`,
      },
      {
        title: 'Transferencia interlingüística',
        content: `Un estudio de PMC de 2024 sobre memoria de trabajo e influencia interlingüística encontró que el conocimiento de dos (o más) sistemas lingüísticos puede acelerar la adquisición de un nuevo idioma. Los investigadores llaman a esto "transferencia interlingüística" (cross-linguistic transfer).

Lo que es aún más interesante: hallazgos neurocognitivos muestran que los idiomas de los bilingües están continuamente activados, incluso cuando trabajan en un entorno monolingüe. El cerebro en realidad no "apaga" un idioma - solo lo suprime.`,
      },
      {
        content: `Así que la próxima vez que escribas una palabra en el idioma equivocado durante un juego, sabe que no es un error. Es una señal de que tu cerebro está funcionando exactamente como debería: con múltiples idiomas activos simultáneamente, compitiendo por el escenario.

Y eso, según la investigación, es algo bueno.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    tryDaily: 'Desafío Diario',
    practice: 'Practicar',
  },
};

export default function MultilingualPageClient(): React.ReactElement {
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
              'bg-neo-orange text-white'
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
