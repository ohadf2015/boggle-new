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
    title: 'מה המחקר אומר על שחקני מילים מומחים',
    category: 'מדע קוגניטיבי',
    readTime: 'זמן קריאה: 5 דקות',
    sections: [
      {
        content: `יש אנשים שפשוט "רואים" מילים בלוח. הם לא מחפשים, לא סורקים - המילים פשוט קופצות להם. מה קורה במוח שלהם? חוקרים החליטו לבדוק.`,
      },
      {
        title: 'המוח של שחקני סקרבל מומחים',
        content: `מחקר שפורסם ב-Memory & Cognition בדק שחקני סקרבל תחרותיים. הם גילו שהשחקנים האלה מפגינים יכולות זיהוי מילים ויזואלי שונות באופן מהותי מאנשים רגילים.

הממצא המפתיע: שחקנים מומחים פחות תלויים במשמעות המילים כדי לשפוט אם הן אמיתיות. במקום זאת, הם מסתמכים יותר על מידע אורתוגרפי - הצורה הוויזואלית של המילים.

כפי שהחוקרים כותבים: "זיהוי מילים ויזואלי מעוצב על ידי ניסיון, ועם ניסיון, יש יעילויות שניתן להשיג גם במערכת זיהוי המילים של מבוגרים."`,
      },
      {
        title: 'מחקר fMRI: מה קורה בפנים',
        content: `מחקר ב-ScienceDirect השתמש ב-fMRI כדי להשוות פעילות מוחית ב-12 שחקני סקרבל תחרותיים עם 12 אנשים רגילים. התוצאות היו מפתיעות.

במהלך משימות זיהוי מילים, שחקנים מומחים הפעילו אזורי מוח שלא קשורים בדרך כלל לשליפת משמעות - אלא לזיכרון עבודה ותפיסה ויזואלית.

המשמעות: מומחים לא "חושבים" על מילים כמונו. הם רואים דפוסים.`,
      },
      {
        title: 'הסוד: Chunking (קיבוץ)',
        content: `ב-1973, צ'ייס וסיימון הראו שמומחי שחמט זוכרים מצבי לוח טוב יותר מטירונים - אבל רק כשהמצבים הגיוניים. כשהכלים מפוזרים אקראית, היתרון נעלם.

הסיבה: מומחים לא זוכרים כלים בודדים. הם זוכרים "chunks" - קבוצות של כלים שיוצרות דפוס מוכר.

אותו עיקרון עובד במשחקי מילים. שחקנים מנוסים לא רואים אותיות בודדות. הם רואים צירופים נפוצים: "ת-ה" כקידומת, "ים" כסיומת. הלוח הופך מרשת של אותיות לאוסף של אבני בניין.`,
      },
      {
        title: 'הנתון המפתיע על תרגול',
        content: `מחקר מצא ששחקני סקרבל תחרותיים מקדישים בממוצע 4.5 שעות בשבוע לשינון מילים מהמילון הרשמי.

אבל הנה הפתעה: כששנשאלו אם הם לומדים את משמעויות המילים, רק 6.4% ענו "תמיד". השאר התחלקו בין "לפעמים" ל-"לעיתים רחוקות או אף פעם".

בכל זאת, במבחנים הם הגדירו יותר מילים נכון. למה? כי גישה מהירה למילים (שנמדדה בזמני תגובה) קשורה לרמת המומחיות, לא לידע המשמעות.`,
      },
      {
        title: 'מה זה אומר עליך',
        content: `אתה לא צריך להיות מומחה כדי להשתמש בעקרונות האלה:

1. חפש דפוסים, לא מילים שלמות. התחל לשים לב לצירופי אותיות נפוצים.

2. תרגול חוזר משנה את המוח. ככל שתשחק יותר, יותר דפוסים יהפכו לאוטומטיים.

3. המשמעות פחות חשובה ממה שחשבת. המוח יכול לזהות מילה כ"אמיתית" בלי לזכור מה היא אומרת.`,
      },
      {
        content: `המחקר מראה שזיהוי מילים ויזואלי ממשיך להשתפר גם אצל מבוגרים. מה שנראה כמו "כישרון טבעי" הוא לרוב תוצאה של ניסיון מצטבר - והוכחה שהמוח שלנו גמיש יותר ממה שחשבנו.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  en: {
    title: 'What Research Says About Expert Word Game Players',
    category: 'Cognitive Science',
    readTime: '5 min read',
    sections: [
      {
        content: `Some people just "see" words on the board. They don't search, don't scan - the words just jump out at them. What's happening in their brains? Researchers decided to find out.`,
      },
      {
        title: 'The Brain of Expert Scrabble Players',
        content: `A study published in Memory & Cognition examined competitive Scrabble players. They discovered that these players exhibit fundamentally different visual word recognition abilities compared to regular people.

The surprising finding: expert players are less reliant on word meaning to judge whether words are real. Instead, they rely more on orthographic information - the visual shape of words.

As the researchers write: "Visual word recognition is shaped by experience and, with experience, there are efficiencies to be had even in the adult word recognition system."`,
      },
      {
        title: 'fMRI Research: What Happens Inside',
        content: `A study in ScienceDirect used fMRI to compare brain activity in 12 competitive Scrabble players with 12 matched controls. The results were surprising.

During word recognition tasks, expert players activated brain regions not generally associated with meaning retrieval - but rather those associated with working memory and visual perception.

The implication: experts don't "think" about words like we do. They see patterns.`,
      },
      {
        title: 'The Secret: Chunking',
        content: `In 1973, Chase and Simon showed that chess experts remember board positions better than novices - but only when the positions make sense. When pieces are randomly scattered, the advantage disappears.

The reason: experts don't remember individual pieces. They remember "chunks" - groups of pieces that form a recognizable pattern.

The same principle applies to word games. Experienced players don't see individual letters. They see common combinations: "RE" as a prefix, "ING" as a suffix. The board transforms from a grid of letters into a collection of building blocks.`,
      },
      {
        title: 'The Surprising Data on Practice',
        content: `Research found that competitive Scrabble players dedicate an average of 4.5 hours per week to memorizing words from the official dictionary.

But here's the surprise: when asked if they learn word meanings, only 6.4% answered "always." The rest split between "sometimes" and "rarely or never."

Yet in tests, they defined more words correctly. Why? Because fast word access (measured by reaction times) correlates with expertise level, not meaning knowledge.`,
      },
      {
        title: 'What This Means for You',
        content: `You don't need to be an expert to use these principles:

1. Look for patterns, not complete words. Start noticing common letter combinations.

2. Repeated practice changes the brain. The more you play, the more patterns become automatic.

3. Meaning matters less than you thought. The brain can recognize a word as "real" without remembering what it means.`,
      },
      {
        content: `Research shows that visual word recognition continues to improve even in adults. What looks like "natural talent" is often the result of accumulated experience - and proof that our brains are more flexible than we thought.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  sv: {
    title: 'Vad forskning säger om experter på ordspel',
    category: 'Kognitiv vetenskap',
    readTime: '5 min läsning',
    sections: [
      {
        content: `Vissa människor "ser" bara ord på brädet. De söker inte, skannar inte - orden hoppar bara ut. Vad händer i deras hjärnor? Forskare bestämde sig för att ta reda på det.`,
      },
      {
        title: 'Hjärnan hos Scrabble-experter',
        content: `En studie publicerad i Memory & Cognition undersökte tävlingsinriktade Scrabble-spelare. De upptäckte att dessa spelare uppvisar fundamentalt annorlunda förmågor för visuell ordigenkänning jämfört med vanliga människor.

Det överraskande fyndet: expertspelare är mindre beroende av ordets betydelse för att bedöma om ord är verkliga. Istället förlitar de sig mer på ortografisk information - ordets visuella form.

Som forskarna skriver: "Visuell ordigenkänning formas av erfarenhet, och med erfarenhet finns det effektivitetsvinster även i den vuxna ordigenkänningssystemet."`,
      },
      {
        title: 'fMRI-forskning: Vad som händer inuti',
        content: `En studie i ScienceDirect använde fMRI för att jämföra hjärnaktivitet hos 12 tävlings-Scrabble-spelare med 12 matchade kontroller. Resultaten var överraskande.

Under ordigenkänningsuppgifter aktiverade expertspelare hjärnregioner som vanligtvis inte associeras med betydelsehämtning - utan snarare de som associeras med arbetsminne och visuell perception.

Implikationen: experter "tänker" inte på ord som vi gör. De ser mönster.`,
      },
      {
        title: 'Hemligheten: Chunking',
        content: `År 1973 visade Chase och Simon att schackexperter minns brädpositioner bättre än nybörjare - men endast när positionerna är meningsfulla. När pjäser placeras slumpmässigt försvinner fördelen.

Anledningen: experter minns inte enskilda pjäser. De minns "chunks" - grupper av pjäser som bildar ett igenkännbart mönster.

Samma princip gäller för ordspel. Erfarna spelare ser inte enskilda bokstäver. De ser vanliga kombinationer: "FÖR" som prefix, "NING" som suffix. Brädet förvandlas från ett rutnät av bokstäver till en samling byggstenar.`,
      },
      {
        title: 'Överraskande data om övning',
        content: `Forskning visade att tävlings-Scrabble-spelare ägnar i genomsnitt 4,5 timmar per vecka åt att memorera ord från den officiella ordboken.

Men här är överraskningen: när de tillfrågades om de lär sig ordets betydelser svarade endast 6,4% "alltid". Resten delade sig mellan "ibland" och "sällan eller aldrig."

Ändå definierade de fler ord korrekt i tester. Varför? Eftersom snabb ordåtkomst (mätt genom reaktionstider) korrelerar med expertisnivå, inte betydelsekunskap.`,
      },
      {
        title: 'Vad detta betyder för dig',
        content: `Du behöver inte vara expert för att använda dessa principer:

1. Leta efter mönster, inte kompletta ord. Börja lägga märke till vanliga bokstavskombinationer.

2. Upprepat övande förändrar hjärnan. Ju mer du spelar, desto fler mönster blir automatiska.

3. Betydelse spelar mindre roll än du trodde. Hjärnan kan känna igen ett ord som "verkligt" utan att minnas vad det betyder.`,
      },
      {
        content: `Forskning visar att visuell ordigenkänning fortsätter att förbättras även hos vuxna. Det som ser ut som "naturlig talang" är ofta resultatet av ackumulerad erfarenhet - och bevis på att våra hjärnor är mer flexibla än vi trodde.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Dagens Utmaning',
    practice: 'Öva',
  },
  ja: {
    title: '研究が明かすワードゲーム上級者の秘密',
    category: '認知科学',
    readTime: '読了時間：5分',
    sections: [
      {
        content: `ボード上の単語が「見える」人がいます。彼らは探さない、スキャンしない - 単語が飛び込んでくるのです。彼らの脳で何が起きているのでしょうか？研究者たちが調べることにしました。`,
      },
      {
        title: 'スクラブル上級者の脳',
        content: `Memory & Cognitionに発表された研究は、競技スクラブルプレイヤーを調査しました。彼らは一般の人とは根本的に異なる視覚的単語認識能力を示すことがわかりました。

驚くべき発見：上級者は単語が本物かどうかを判断する際、単語の意味にあまり頼りません。代わりに、正書法的情報 - 単語の視覚的な形 - により依存しています。

研究者は次のように書いています：「視覚的単語認識は経験によって形作られ、経験によって、成人の単語認識システムでも効率化が達成できます。」`,
      },
      {
        title: 'fMRI研究：内部で何が起きているか',
        content: `ScienceDirectの研究は、fMRIを使用して12人の競技スクラブルプレイヤーと12人の対照群の脳活動を比較しました。結果は驚くべきものでした。

単語認識タスク中、上級者は通常、意味の検索に関連しない脳領域を活性化しました - むしろ作業記憶と視覚的知覚に関連する領域を。

含意：上級者は私たちのように単語について「考えて」いません。彼らはパターンを見ているのです。`,
      },
      {
        title: '秘密：チャンキング',
        content: `1973年、チェイスとサイモンは、チェスの上級者は初心者よりも盤面の位置をよく覚えることを示しました - ただし、位置が意味を成す場合のみ。駒がランダムに配置されると、その優位性は消えます。

理由：上級者は個々の駒を覚えていません。認識可能なパターンを形成する駒のグループである「チャンク」を覚えているのです。

同じ原理がワードゲームにも適用されます。経験豊富なプレイヤーは個々の文字を見ません。一般的な組み合わせを見ます：接頭辞としての「お」、接尾辞としての「ます」。ボードは文字のグリッドから構成要素のコレクションに変わります。`,
      },
      {
        title: '練習に関する驚くべきデータ',
        content: `研究によると、競技スクラブルプレイヤーは週平均4.5時間を公式辞書の単語の暗記に費やしています。

しかし、ここに驚きがあります：単語の意味を学ぶかどうか尋ねられたとき、「常に」と答えたのはわずか6.4%でした。残りは「時々」と「まれに、またはまったくしない」に分かれました。

しかし、テストではより多くの単語を正しく定義しました。なぜ？速い単語アクセス（反応時間で測定）は、意味の知識ではなく、専門性レベルと相関するからです。`,
      },
      {
        title: 'これがあなたにとって意味すること',
        content: `これらの原則を使うのに上級者である必要はありません：

1. 完全な単語ではなく、パターンを探しましょう。一般的な文字の組み合わせに気づき始めましょう。

2. 繰り返しの練習は脳を変えます。プレイすればするほど、より多くのパターンが自動的になります。

3. 意味は思ったほど重要ではありません。脳は、それが何を意味するか覚えていなくても、単語を「本物」として認識できます。`,
      },
      {
        content: `研究は、視覚的単語認識が大人でも改善し続けることを示しています。「自然な才能」に見えるものは、しばしば蓄積された経験の結果です - そして、私たちの脳が思ったより柔軟であることの証拠です。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習',
  },
  es: {
    title: 'Lo que la investigación dice sobre los expertos en juegos de palabras',
    category: 'Ciencia Cognitiva',
    readTime: '5 min de lectura',
    sections: [
      {
        content: `Algunas personas simplemente "ven" palabras en el tablero. No buscan, no escanean - las palabras simplemente saltan. ¿Qué está pasando en sus cerebros? Los investigadores decidieron averiguarlo.`,
      },
      {
        title: 'El cerebro de los expertos en Scrabble',
        content: `Un estudio publicado en Memory & Cognition examinó a jugadores competitivos de Scrabble. Descubrieron que estos jugadores exhiben habilidades de reconocimiento visual de palabras fundamentalmente diferentes en comparación con personas comunes.

El hallazgo sorprendente: los jugadores expertos dependen menos del significado de las palabras para juzgar si son reales. En cambio, se basan más en información ortográfica - la forma visual de las palabras.

Como escriben los investigadores: "El reconocimiento visual de palabras está moldeado por la experiencia y, con experiencia, hay eficiencias que se pueden lograr incluso en el sistema de reconocimiento de palabras adulto."`,
      },
      {
        title: 'Investigación con fMRI: Qué pasa adentro',
        content: `Un estudio en ScienceDirect usó fMRI para comparar la actividad cerebral en 12 jugadores competitivos de Scrabble con 12 controles emparejados. Los resultados fueron sorprendentes.

Durante tareas de reconocimiento de palabras, los jugadores expertos activaron regiones cerebrales no generalmente asociadas con la recuperación de significado - sino más bien aquellas asociadas con la memoria de trabajo y la percepción visual.

La implicación: los expertos no "piensan" en las palabras como nosotros. Ven patrones.`,
      },
      {
        title: 'El secreto: Chunking',
        content: `En 1973, Chase y Simon mostraron que los expertos en ajedrez recuerdan posiciones del tablero mejor que los novatos - pero solo cuando las posiciones tienen sentido. Cuando las piezas están dispersas aleatoriamente, la ventaja desaparece.

La razón: los expertos no recuerdan piezas individuales. Recuerdan "chunks" - grupos de piezas que forman un patrón reconocible.

El mismo principio se aplica a los juegos de palabras. Los jugadores experimentados no ven letras individuales. Ven combinaciones comunes: "DES" como prefijo, "CIÓN" como sufijo. El tablero se transforma de una cuadrícula de letras en una colección de bloques de construcción.`,
      },
      {
        title: 'Datos sorprendentes sobre la práctica',
        content: `La investigación encontró que los jugadores competitivos de Scrabble dedican un promedio de 4.5 horas por semana a memorizar palabras del diccionario oficial.

Pero aquí está la sorpresa: cuando se les preguntó si aprenden los significados de las palabras, solo el 6.4% respondió "siempre". El resto se dividió entre "a veces" y "rara vez o nunca."

Sin embargo, en las pruebas definieron más palabras correctamente. ¿Por qué? Porque el acceso rápido a palabras (medido por tiempos de reacción) se correlaciona con el nivel de experiencia, no con el conocimiento del significado.`,
      },
      {
        title: 'Qué significa esto para ti',
        content: `No necesitas ser un experto para usar estos principios:

1. Busca patrones, no palabras completas. Empieza a notar combinaciones de letras comunes.

2. La práctica repetida cambia el cerebro. Cuanto más juegues, más patrones se vuelven automáticos.

3. El significado importa menos de lo que pensabas. El cerebro puede reconocer una palabra como "real" sin recordar lo que significa.`,
      },
      {
        content: `La investigación muestra que el reconocimiento visual de palabras sigue mejorando incluso en adultos. Lo que parece "talento natural" es a menudo el resultado de experiencia acumulada - y prueba de que nuestros cerebros son más flexibles de lo que pensábamos.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    tryDaily: 'Desafío Diario',
    practice: 'Practicar',
  },
};

export default function SecretsPageClient(): React.ReactElement {
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
              'bg-neo-pink text-white'
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
