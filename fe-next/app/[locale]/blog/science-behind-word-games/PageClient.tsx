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
    title: 'מה קורה במוח כשאתם מחפשים מילים',
    category: 'מדע',
    readTime: 'זמן קריאה: 6 דקות',
    sections: [
      {
        content: `כשאתם מסתכלים על לוח של אותיות ומחפשים מילים, המוח שלכם עושה משהו מורכב להפליא. הנה מה שמחקרי fMRI גילו על מה שקורה בפנים.`,
      },
      {
        title: 'רשת שלמה עובדת בו-זמנית',
        content: `לפי סקירה שיטתית של מחקרי fMRI שפורסמה ב-AIMS Neuroscience, חיפוש מילים מפעיל מספר אזורים במוח במקביל:

• אזור ברוקה (Broca's area) - אחראי על עיבוד פונולוגי, כלומר צלילי המילים
• אזור ורניקה (Wernicke's area) - אחראי על הבנת משמעות המילים
• קורטקס פרה-פרונטלי (DLPFC) - מנהל את "הפקח" שמתאם את הכל
• הגנגליה הבזאלית (Basal Ganglia) - מתערבת כשהמשימה נהיית מורכבת

זה לא אזור אחד שעובד - זו רשת שלמה.`,
      },
      {
        title: 'מה מיוחד בזיכרון העבודה המילולי',
        content: `מטא-אנליזה שפורסמה ב-Frontiers in Human Neuroscience מצאה שזיכרון עבודה מילולי (verbal working memory) מפעיל בעיקר את הקורטקס הפרה-פרונטלי השמאלי, בעוד זיכרון עבודה מרחבי (spatial) מפעיל יותר את הצד הימני.

כשאתם מחזיקים בראש את האותיות הזמינות תוך כדי חיפוש מילים, אתם משתמשים במה שנקרא "הלולאה הפונולוגית" (phonological loop) - מנגנון שחוזר על המידע כדי לשמור אותו פעיל.`,
      },
      {
        title: 'למה משימות מורכבות מפעילות יותר אזורים',
        content: `המחקרים מראים קשר ישיר בין מורכבות המשימה לבין מספר אזורי המוח המעורבים. כשאתם מחפשים מילה ארוכה או נדירה, המוח מגייס אזורים נוספים - כולל אזורי פרה-מוטור (pre-motor) והצרבלום (cerebellum).

זה מסביר למה משחק מילים מאתגר "מרגיש" אחרת ממשחק קל. המוח באמת עובד קשה יותר.`,
      },
      {
        title: 'הקשר בין שפה לפעולה',
        content: `מחקר מעניין מצא שכשאנשים שומרים מילים בזיכרון העבודה, במיוחד מילי פעולה (action words), הם מפעילים גם אזורים מוטוריים במוח - אותם אזורים שאחראים על תנועה.

זה תומך ברעיון שהמוח לא מאחסן מילים כמו קבצים במחשב, אלא כרשתות של קשרים - בין צליל, משמעות, ופעולות קשורות.`,
      },
      {
        title: 'מודל "זיכרון-איחוד-בקרה"',
        content: `לפי מודל הגורט (Hagoort's MUC Model), עיבוד שפה במוח מתחלק לשלושה תהליכים:
• זיכרון (Memory) - אחזור מילים מהמאגר השפתי
• איחוד (Unification) - שילוב מילים למשפטים ומשמעויות
• בקרה (Control) - ניהול התהליך וקבלת החלטות

באזור ברוקה מתרחש האיחוד, באונה הטמפורלית הזיכרון, ובקורטקס הפרה-פרונטלי (DLPFC) הבקרה.

כשאתם משחקים משחק מילים, שלושת התהליכים עובדים במקביל.`,
      },
      {
        title: 'למה זה חשוב',
        content: `ההבנה הזו מסבירה כמה דברים:

1. למה משחקי מילים מרגישים "מאמצים" - הם באמת מפעילים רשתות מוחיות מורכבות
2. למה תרגול משפר ביצועים - הרשתות האלה נהיות יעילות יותר עם שימוש
3. למה משחקי מילים שונים ממשחקי תגובה מהירה - הם דורשים ידע שפתי אמיתי, לא רק רפלקסים

המוח לא סתם "עובד" כשאתם מחפשים מילים. הוא מתרגל תיאום בין מערכות שונות - וזה משהו שיש לו ערך.`,
      },
      {
        content: `מקורות: AIMS Neuroscience (2021), Frontiers in Human Neuroscience (2019), PMC - Brain correlates of action word memory (2022)`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  en: {
    title: 'What Happens in Your Brain When You Search for Words',
    category: 'Science',
    readTime: '6 min read',
    sections: [
      {
        content: `When you look at a board of letters and search for words, your brain does something remarkably complex. Here's what fMRI research has revealed about what's happening inside.`,
      },
      {
        title: 'A Whole Network Working Simultaneously',
        content: `According to a systematic review of fMRI studies published in AIMS Neuroscience, word searching activates multiple brain regions in parallel:

• Broca's area - handles phonological processing (the sounds of words)
• Wernicke's area - handles semantic processing (word meanings)
• Dorsolateral Prefrontal Cortex (DLPFC) - manages the "executive" that coordinates everything
• Basal Ganglia - gets involved when the task becomes complex

It's not one area working - it's an entire network.`,
      },
      {
        title: 'What Makes Verbal Working Memory Special',
        content: `A meta-analysis published in Frontiers in Human Neuroscience found that verbal working memory primarily activates the left prefrontal cortex, while spatial working memory activates more of the right side.

When you hold available letters in mind while searching for words, you're using what's called the "phonological loop" - a mechanism that rehearses information to keep it active.`,
      },
      {
        title: 'Why Complex Tasks Activate More Areas',
        content: `Studies show a direct relationship between task complexity and the number of brain regions involved. When you search for a long or rare word, the brain recruits additional areas - including pre-motor regions and the cerebellum.

This explains why a challenging word game "feels" different from an easy one. The brain really is working harder.`,
      },
      {
        title: 'The Language-Action Connection',
        content: `An interesting study found that when people hold words in working memory, especially action words, they also activate motor areas of the brain - the same areas responsible for movement.

This supports the idea that the brain doesn't store words like files on a computer, but as networks of associations - between sound, meaning, and related actions.`,
      },
      {
        title: 'The "Memory-Unification-Control" Model',
        content: `According to Hagoort's MUC Model, language processing in the brain divides into three processes:
• Memory - retrieving words from our linguistic storage
• Unification - combining words into sentences and meanings
• Control - managing the process and making decisions

Unification happens in Broca's area, memory in the temporal lobe, and control in the dorsolateral prefrontal cortex (DLPFC).

When you play a word game, all three processes work in parallel.`,
      },
      {
        title: 'Why This Matters',
        content: `This understanding explains several things:

1. Why word games feel "effortful" - they really do activate complex brain networks
2. Why practice improves performance - these networks become more efficient with use
3. Why word games differ from quick-reaction games - they require real linguistic knowledge, not just reflexes

The brain isn't just "working" when you search for words. It's practicing coordination between different systems - and that has real value.`,
      },
      {
        content: `Sources: AIMS Neuroscience (2021), Frontiers in Human Neuroscience (2019), PMC - Brain correlates of action word memory (2022)`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  sv: {
    title: 'Vad som händer i hjärnan när du söker efter ord',
    category: 'Vetenskap',
    readTime: '6 min läsning',
    sections: [
      {
        content: `När du tittar på ett bräde med bokstäver och söker efter ord gör din hjärna något anmärkningsvärt komplext. Här är vad fMRI-forskning har avslöjat om vad som händer inuti.`,
      },
      {
        title: 'Ett helt nätverk arbetar samtidigt',
        content: `Enligt en systematisk genomgång av fMRI-studier publicerad i AIMS Neuroscience aktiverar ordsökning flera hjärnregioner parallellt:

• Brocas område - hanterar fonologisk bearbetning (ordljud)
• Wernickes område - hanterar semantisk bearbetning (ordmeningar)
• Dorsolateral prefrontal cortex (DLPFC) - hanterar den "exekutiva" funktionen som koordinerar allt
• Basala ganglierna - aktiveras när uppgiften blir komplex

Det är inte ett område som arbetar - det är ett helt nätverk.`,
      },
      {
        title: 'Vad som gör verbalt arbetsminne speciellt',
        content: `En metaanalys publicerad i Frontiers in Human Neuroscience fann att verbalt arbetsminne primärt aktiverar vänster prefrontal cortex, medan spatialt arbetsminne aktiverar mer av höger sida.

När du håller tillgängliga bokstäver i minnet medan du söker efter ord använder du det som kallas "fonologiska loopen" - en mekanism som repeterar information för att hålla den aktiv.`,
      },
      {
        title: 'Varför komplexa uppgifter aktiverar fler områden',
        content: `Studier visar ett direkt samband mellan uppgiftens komplexitet och antalet inblandade hjärnregioner. När du söker efter ett långt eller ovanligt ord rekryterar hjärnan ytterligare områden - inklusive premotoriska regioner och cerebellum.

Detta förklarar varför ett utmanande ordspel "känns" annorlunda än ett enkelt. Hjärnan arbetar verkligen hårdare.`,
      },
      {
        title: 'Kopplingen mellan språk och handling',
        content: `En intressant studie fann att när människor håller ord i arbetsminnet, särskilt handlingsord, aktiverar de också motoriska områden i hjärnan - samma områden som ansvarar för rörelse.

Detta stöder idén att hjärnan inte lagrar ord som filer på en dator, utan som nätverk av associationer - mellan ljud, mening och relaterade handlingar.`,
      },
      {
        title: '"Minne-Enande-Kontroll"-modellen',
        content: `Enligt Hagoorts MUC-modell delas språkbearbetning i hjärnan in i tre processer:
• Minne - hämta ord från vårt språkliga förråd
• Enande - kombinera ord till meningar och betydelser
• Kontroll - hantera processen och fatta beslut

Enande sker i Brocas område, minne i temporalloben och kontroll i dorsolateral prefrontal cortex (DLPFC).

När du spelar ett ordspel arbetar alla tre processer parallellt.`,
      },
      {
        title: 'Varför detta är viktigt',
        content: `Denna förståelse förklarar flera saker:

1. Varför ordspel känns "ansträngande" - de aktiverar verkligen komplexa hjärnnätverk
2. Varför övning förbättrar prestanda - dessa nätverk blir mer effektiva med användning
3. Varför ordspel skiljer sig från snabb-reaktionsspel - de kräver verklig språklig kunskap, inte bara reflexer

Hjärnan "arbetar" inte bara när du söker efter ord. Den övar koordination mellan olika system - och det har verkligt värde.`,
      },
      {
        content: `Källor: AIMS Neuroscience (2021), Frontiers in Human Neuroscience (2019), PMC - Brain correlates of action word memory (2022)`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Dagens Utmaning',
    practice: 'Öva',
  },
  ja: {
    title: '言葉を探す時、脳で何が起きているか',
    category: '科学',
    readTime: '読了時間：6分',
    sections: [
      {
        content: `文字のボードを見て言葉を探す時、脳は驚くほど複雑なことをしています。fMRI研究が内部で何が起きているかを明らかにしました。`,
      },
      {
        title: 'ネットワーク全体が同時に働いている',
        content: `AIMS Neuroscienceに発表されたfMRI研究の系統的レビューによると、言葉の検索は複数の脳領域を同時に活性化します：

• ブローカ野 - 音韻処理（言葉の音）を担当
• ウェルニッケ野 - 意味処理（言葉の意味）を担当
• 背外側前頭前皮質（DLPFC）- すべてを調整する「実行機能」を管理
• 大脳基底核 - タスクが複雑になると関与

一つの領域が働いているのではなく、ネットワーク全体です。`,
      },
      {
        title: '言語ワーキングメモリの特別な点',
        content: `Frontiers in Human Neuroscienceに発表されたメタ分析によると、言語ワーキングメモリは主に左前頭前皮質を活性化し、空間ワーキングメモリは右側をより多く活性化します。

言葉を探しながら使える文字を頭に保持している時、「音韻ループ」と呼ばれるものを使っています。これは情報をアクティブに保つために繰り返すメカニズムです。`,
      },
      {
        title: 'なぜ複雑なタスクはより多くの領域を活性化するか',
        content: `研究は、タスクの複雑さと関与する脳領域の数の間に直接的な関係があることを示しています。長いまたは珍しい言葉を探す時、脳は追加の領域（運動前野や小脳を含む）を動員します。

これは、難しい言葉ゲームが簡単なものと「違う感じ」がする理由を説明しています。脳は本当により一生懸命働いているのです。`,
      },
      {
        title: '言語と行動のつながり',
        content: `興味深い研究では、人がワーキングメモリに言葉を保持している時、特に動作を表す言葉の場合、運動を担当する脳の運動野も活性化することがわかりました。

これは、脳がコンピューターのファイルのように言葉を保存するのではなく、音、意味、関連する行動の間の連想のネットワークとして保存するという考えを支持しています。`,
      },
      {
        title: '「記憶-統合-制御」モデル',
        content: `ハゴートのMUCモデルによると、脳での言語処理は3つのプロセスに分かれます：
• 記憶 - 言語的貯蔵から言葉を取り出す
• 統合 - 言葉を文や意味に組み合わせる
• 制御 - プロセスを管理し決定を下す

統合はブローカ野で、記憶は側頭葉で、制御は背外側前頭前皮質（DLPFC）で行われます。

言葉ゲームをする時、3つのプロセスすべてが並行して働きます。`,
      },
      {
        title: 'なぜこれが重要か',
        content: `この理解はいくつかのことを説明します：

1. なぜ言葉ゲームは「努力が必要」に感じるか - 本当に複雑な脳ネットワークを活性化している
2. なぜ練習でパフォーマンスが向上するか - これらのネットワークは使用とともに効率的になる
3. なぜ言葉ゲームは素早い反応ゲームと異なるか - 反射だけでなく、本当の言語知識を必要とする

言葉を探す時、脳は単に「働いている」のではありません。異なるシステム間の調整を練習しているのです。そしてそれには本当の価値があります。`,
      },
      {
        content: `出典：AIMS Neuroscience (2021)、Frontiers in Human Neuroscience (2019)、PMC - Brain correlates of action word memory (2022)`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習',
  },
  es: {
    title: 'Qué pasa en tu cerebro cuando buscas palabras',
    category: 'Ciencia',
    readTime: '6 min de lectura',
    sections: [
      {
        content: `Cuando miras un tablero de letras y buscas palabras, tu cerebro hace algo notablemente complejo. Esto es lo que la investigación con fMRI ha revelado sobre lo que sucede adentro.`,
      },
      {
        title: 'Una red completa trabajando simultáneamente',
        content: `Según una revisión sistemática de estudios de fMRI publicada en AIMS Neuroscience, la búsqueda de palabras activa múltiples regiones del cerebro en paralelo:

• Área de Broca - maneja el procesamiento fonológico (los sonidos de las palabras)
• Área de Wernicke - maneja el procesamiento semántico (significados de palabras)
• Corteza prefrontal dorsolateral (DLPFC) - gestiona el "ejecutivo" que coordina todo
• Ganglios basales - se involucran cuando la tarea se vuelve compleja

No es un área trabajando - es una red completa.`,
      },
      {
        title: 'Qué hace especial a la memoria de trabajo verbal',
        content: `Un metaanálisis publicado en Frontiers in Human Neuroscience encontró que la memoria de trabajo verbal activa principalmente la corteza prefrontal izquierda, mientras que la memoria de trabajo espacial activa más el lado derecho.

Cuando mantienes las letras disponibles en mente mientras buscas palabras, estás usando lo que se llama el "bucle fonológico" - un mecanismo que repasa la información para mantenerla activa.`,
      },
      {
        title: 'Por qué las tareas complejas activan más áreas',
        content: `Los estudios muestran una relación directa entre la complejidad de la tarea y el número de regiones cerebrales involucradas. Cuando buscas una palabra larga o rara, el cerebro recluta áreas adicionales - incluyendo regiones premotoras y el cerebelo.

Esto explica por qué un juego de palabras desafiante "se siente" diferente a uno fácil. El cerebro realmente está trabajando más duro.`,
      },
      {
        title: 'La conexión lenguaje-acción',
        content: `Un estudio interesante encontró que cuando las personas mantienen palabras en la memoria de trabajo, especialmente palabras de acción, también activan áreas motoras del cerebro - las mismas áreas responsables del movimiento.

Esto apoya la idea de que el cerebro no almacena palabras como archivos en una computadora, sino como redes de asociaciones - entre sonido, significado y acciones relacionadas.`,
      },
      {
        title: 'El modelo "Memoria-Unificación-Control"',
        content: `Según el Modelo MUC de Hagoort, el procesamiento del lenguaje en el cerebro se divide en tres procesos:
• Memoria - recuperar palabras de nuestro almacén lingüístico
• Unificación - combinar palabras en oraciones y significados
• Control - gestionar el proceso y tomar decisiones

La unificación ocurre en el área de Broca, la memoria en el lóbulo temporal y el control en la corteza prefrontal dorsolateral (DLPFC).

Cuando juegas un juego de palabras, los tres procesos trabajan en paralelo.`,
      },
      {
        title: 'Por qué esto importa',
        content: `Esta comprensión explica varias cosas:

1. Por qué los juegos de palabras se sienten "esforzados" - realmente activan redes cerebrales complejas
2. Por qué la práctica mejora el rendimiento - estas redes se vuelven más eficientes con el uso
3. Por qué los juegos de palabras difieren de los juegos de reacción rápida - requieren conocimiento lingüístico real, no solo reflejos

El cerebro no solo "trabaja" cuando buscas palabras. Está practicando la coordinación entre diferentes sistemas - y eso tiene valor real.`,
      },
      {
        content: `Fuentes: AIMS Neuroscience (2021), Frontiers in Human Neuroscience (2019), PMC - Brain correlates of action word memory (2022)`,
      },
    ],
    backToBlog: 'Volver al Blog',
    tryDaily: 'Desafío Diario',
    practice: 'Practicar',
  },
};

export default function SciencePageClient(): React.ReactElement {
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
              'bg-neo-lime text-neo-black'
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
