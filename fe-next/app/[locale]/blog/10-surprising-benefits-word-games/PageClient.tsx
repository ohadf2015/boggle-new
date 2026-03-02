'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { AdPlaceholder } from '@/components/ads';

// Genuinely human content - each language has its own authentic voice
type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  sections: Array<{
    title?: string;
    content: string;
  }>;
  backToBlog: string;
  playDaily: string;
  startPracticing: string;
};

const contentByLocale: Record<string, LocaleContent> = {
  he: {
    title: 'מה המדע באמת אומר על משחקי מילים והמוח',
    subtitle: 'סקירת המחקרים העדכניים מאוניברסיטאות אקסטר, קולומביה ודיוק',
    category: 'מחקר',
    readTime: 'זמן קריאה: 7 דקות',
    sections: [
      {
        content: `יש הרבה טענות על משחקי מילים והמוח. חלקן מוגזמות, חלקן נכונות. הלכתי לבדוק מה המחקרים באמת מראים.`,
      },
      {
        title: 'המחקר הגדול: 19,000 משתתפים',
        content: `ב-2019, חוקרים מאוניברסיטת אקסטר וקינגס קולג׳ לונדון פרסמו מחקר ב-International Journal of Geriatric Psychiatry. הם עקבו אחרי 19,000 מבוגרים בגילאי 50-93.

הממצא המרכזי: מי שפתר תשבצים באופן קבוע הראה יכולת חשיבה לוגית של מישהו צעיר ממנו בעשר שנים, וזיכרון לטווח קצר של מישהו צעיר ב-8 שנים.

פרופ׳ קית׳ וסנס מאקסטר: "הביצועים היו טובים יותר באופן עקבי אצל מי שדיווח על פתרון חידות, והשתפרו בהדרגה עם תדירות השימוש."`,
      },
      {
        title: 'תשבצים מול משחקי מחשב',
        content: `מחקר מפתיע מאוניברסיטאות קולומביה ודיוק בחן 107 מבוגרים עם ליקוי קוגניטיבי קל. חצי קיבלו תשבצים ממוחשבים, חצי קיבלו משחקי זיכרון דיגיטליים.

אחרי 78 שבועות, קבוצת התשבצים הראתה שיפור קוגניטיבי. קבוצת המשחקים הדיגיטליים הראתה ירידה.

ד״ר דבננד מקולומביה: "היתרונות נראו לא רק בקוגניציה אלא גם בתפקוד היומיומי, עם סימנים להתכווצות מוחית מופחתת ב-MRI."

זה היה המחקר הראשון שתיעד יתרונות לטווח ארוך לאימון תשבצים ביתי.`,
      },
      {
        title: 'מה לגבי מניעת דמנציה?',
        content: `כאן צריך להיות זהירים. ד״ר אן קורבט מאקסטר הדגישה: "אנחנו לא יכולים לומר שפתרון חידות בהכרח מפחית את הסיכון לדמנציה בגיל מאוחר."

המחקרים מראים קורלציה - קשר סטטיסטי - אבל לא בהכרח סיבתיות. יכול להיות שאנשים עם יכולות קוגניטיביות טובות יותר נוטים יותר לפתור תשבצים מלכתחילה.

מה שכן ברור: משחקי מילים קשורים לתפקוד קוגניטיבי טוב יותר בהווה.`,
      },
      {
        title: 'למי זה עוזר יותר?',
        content: `המחקר מקולומביה ודיוק גילה משהו מעניין: אם אתם בשלב מוקדם מאוד של ליקוי קוגניטיבי, גם משחקי מחשב וגם תשבצים עוזרים באותה מידה. אבל בשלבים מאוחרים יותר, תשבצים היו יעילים יותר.

מחקר מטקסס A&M מ-2024 מצא שמשחקים, חידות וקריאה מאטים ירידה קוגניטיבית גם אצל מי שכבר יש לו ליקוי קל.`,
      },
      {
        title: 'הנקודה לגבי אוצר מילים',
        content: `סקירה שיטתית של 17 מחקרים על לימוד מילים דרך משחקים מצאה שהמוח זוכר מילים טוב יותר כשהוא פוגש אותן בהקשר של פתרון בעיות.

הסיבה: משחקים מספקים "הקשרים עשירים, מעורבות קוגניטיבית, וסיטואציות למידה וירטואליות" שמשפרים את יעילות הלמידה.

במילים פשוטות: מילה שגילית בתשבץ נשארת בזיכרון טוב יותר ממילה שקראת ברשימה.`,
      },
      {
        title: 'השורה התחתונה',
        content: `המחקר מראה שמשחקי מילים קשורים ל:
• תפקוד קוגניטיבי טוב יותר (מחקר אקסטר, 19,000 משתתפים)
• האטה של ירידה קוגניטיבית (מחקר קולומביה-דיוק, 78 שבועות)
• למידת מילים יעילה יותר (סקירה של 17 מחקרים)

מה שהמחקר לא מוכיח (עדיין): שמשחקי מילים מונעים דמנציה.

הייחוד של משחקי מילים לעומת "אימוני מוח" דיגיטליים הוא שהם דורשים ידע שפתי אמיתי, לא רק תגובה מהירה לגירויים חזותיים.`,
      },
      {
        content: `מקורות: International Journal of Geriatric Psychiatry (2019), NEJM Evidence (2022), Duke University School of Medicine, University of Exeter PROTECT Study`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    playDaily: 'אתגר יומי',
    startPracticing: 'תרגול',
  },
  en: {
    title: 'What Science Actually Says About Word Games and the Brain',
    subtitle: 'A look at recent research from Exeter, Columbia, and Duke universities',
    category: 'Research',
    readTime: '7 min read',
    sections: [
      {
        content: `There are plenty of claims about word games and the brain. Some are exaggerated, some are accurate. I went to check what the research actually shows.`,
      },
      {
        title: 'The Big Study: 19,000 Participants',
        content: `In 2019, researchers from the University of Exeter and King's College London published a study in the International Journal of Geriatric Psychiatry. They tracked 19,000 adults aged 50-93.

The key finding: those who regularly solved crosswords showed grammatical reasoning equivalent to someone 10 years younger, and short-term memory of someone 8 years younger.

Professor Keith Wesnes from Exeter: "Performance was consistently better in those who reported engaging in puzzles, and generally improved incrementally with the frequency of puzzle use."`,
      },
      {
        title: 'Crosswords vs. Computer Games',
        content: `A surprising study from Columbia and Duke universities examined 107 older adults with mild cognitive impairment. Half received computerized crosswords, half received digital memory games.

After 78 weeks, the crossword group showed cognitive improvement. The digital games group showed decline.

Dr. D.P. Devanand from Columbia: "The benefits were seen not only in cognition but also in daily activities with indications of brain shrinkage on MRI that suggests the effects are clinically meaningful."

This was the first study to document long-term benefits for home-based crossword training.`,
      },
      {
        title: 'What About Preventing Dementia?',
        content: `Here we need to be careful. Dr. Anne Corbett from Exeter emphasized: "We can't say that playing these puzzles necessarily reduces the risk of dementia in later life."

The studies show correlation—a statistical relationship—but not necessarily causation. It could be that people with better cognitive abilities are more likely to do crosswords in the first place.

What is clear: word games are associated with better cognitive function in the present.`,
      },
      {
        title: 'Who Benefits Most?',
        content: `The Columbia-Duke study found something interesting: if you're very early in the mild cognitive impairment process, both computer games and crosswords help equally. But in later stages, crosswords were more effective.

A 2024 study from Texas A&M found that games, puzzles, and reading slow cognitive decline even in those who already have mild impairment.`,
      },
      {
        title: 'The Vocabulary Point',
        content: `A systematic review of 17 studies on learning words through games found that the brain remembers words better when it encounters them in a problem-solving context.

The reason: games provide "rich contexts, cognitive engagement, and virtual learning situations" that improve learning effectiveness.

In simple terms: a word you discovered in a crossword stays in memory better than a word you read on a list.`,
      },
      {
        title: 'The Bottom Line',
        content: `Research shows word games are associated with:
• Better cognitive function (Exeter study, 19,000 participants)
• Slower cognitive decline (Columbia-Duke study, 78 weeks)
• More effective word learning (review of 17 studies)

What research doesn't prove (yet): that word games prevent dementia.

What makes word games unique compared to digital "brain training" is that they require real linguistic knowledge, not just quick reactions to visual stimuli.`,
      },
      {
        content: `Sources: International Journal of Geriatric Psychiatry (2019), NEJM Evidence (2022), Duke University School of Medicine, University of Exeter PROTECT Study`,
      },
    ],
    backToBlog: 'Back to Blog',
    playDaily: 'Daily Challenge',
    startPracticing: 'Practice',
  },
  sv: {
    title: 'Vad forskningen faktiskt säger om ordspel och hjärnan',
    subtitle: 'En genomgång av aktuell forskning från Exeter, Columbia och Duke',
    category: 'Forskning',
    readTime: '7 min läsning',
    sections: [
      {
        content: `Det finns många påståenden om ordspel och hjärnan. Vissa är överdrivna, andra stämmer. Jag gick och kollade vad forskningen faktiskt visar.`,
      },
      {
        title: 'Den stora studien: 19 000 deltagare',
        content: `År 2019 publicerade forskare från University of Exeter och King's College London en studie i International Journal of Geriatric Psychiatry. De följde 19 000 vuxna i åldrarna 50-93.

Huvudfyndet: de som regelbundet löste korsord visade logiskt tänkande motsvarande någon 10 år yngre, och korttidsminne som någon 8 år yngre.

Professor Keith Wesnes från Exeter: "Prestationen var konsekvent bättre hos dem som rapporterade att de sysslade med pussel, och förbättrades generellt stegvis med frekvensen av pusselanvändning."`,
      },
      {
        title: 'Korsord mot datorspel',
        content: `En överraskande studie från Columbia och Duke undersökte 107 äldre vuxna med mild kognitiv nedsättning. Hälften fick datoriserade korsord, hälften fick digitala minnesspel.

Efter 78 veckor visade korsordgruppen kognitiv förbättring. Gruppen med digitala spel visade försämring.

Dr. D.P. Devanand från Columbia: "Fördelarna sågs inte bara i kognition utan också i dagliga aktiviteter med indikationer på hjärnkrympning på MRI som tyder på att effekterna är kliniskt meningsfulla."

Detta var den första studien som dokumenterade långsiktiga fördelar för hembaserad korsordträning.`,
      },
      {
        title: 'Vad med att förebygga demens?',
        content: `Här måste vi vara försiktiga. Dr. Anne Corbett från Exeter betonade: "Vi kan inte säga att att spela dessa pussel nödvändigtvis minskar risken för demens senare i livet."

Studierna visar korrelation – ett statistiskt samband – men inte nödvändigtvis orsakssamband. Det kan vara så att personer med bättre kognitiva förmågor är mer benägna att göra korsord från början.

Vad som är klart: ordspel är förknippade med bättre kognitiv funktion i nuet.`,
      },
      {
        title: 'Vem har mest nytta?',
        content: `Columbia-Duke-studien fann något intressant: om du är mycket tidigt i processen med mild kognitiv nedsättning hjälper både datorspel och korsord lika mycket. Men i senare stadier var korsord mer effektiva.

En studie från Texas A&M 2024 fann att spel, pussel och läsning bromsar kognitiv nedgång även hos dem som redan har mild nedsättning.`,
      },
      {
        title: 'Ordförrådsaspekten',
        content: `En systematisk genomgång av 17 studier om ordinlärning genom spel fann att hjärnan minns ord bättre när den möter dem i en problemlösningskontext.

Anledningen: spel ger "rika sammanhang, kognitivt engagemang och virtuella inlärningssituationer" som förbättrar inlärningseffektiviteten.

Enkelt uttryckt: ett ord du upptäckte i ett korsord stannar bättre i minnet än ett ord du läste på en lista.`,
      },
      {
        title: 'Slutsatsen',
        content: `Forskning visar att ordspel är förknippade med:
• Bättre kognitiv funktion (Exeter-studien, 19 000 deltagare)
• Långsammare kognitiv nedgång (Columbia-Duke-studien, 78 veckor)
• Mer effektiv ordinlärning (genomgång av 17 studier)

Vad forskning inte bevisar (än): att ordspel förebygger demens.

Det som gör ordspel unika jämfört med digital "hjärnträning" är att de kräver verklig språklig kunskap, inte bara snabba reaktioner på visuella stimuli.`,
      },
      {
        content: `Källor: International Journal of Geriatric Psychiatry (2019), NEJM Evidence (2022), Duke University School of Medicine, University of Exeter PROTECT Study`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    playDaily: 'Dagens Utmaning',
    startPracticing: 'Öva',
  },
  ja: {
    title: '言葉ゲームと脳について、科学が実際に示していること',
    subtitle: 'エクセター大学、コロンビア大学、デューク大学の最新研究から',
    category: '研究',
    readTime: '読了時間：7分',
    sections: [
      {
        content: `言葉ゲームと脳についてはさまざまな主張があります。誇張されたものもあれば、正確なものもあります。研究が実際に何を示しているか調べてみました。`,
      },
      {
        title: '大規模研究：19,000人の参加者',
        content: `2019年、エクセター大学とキングス・カレッジ・ロンドンの研究者がInternational Journal of Geriatric Psychiatryに研究を発表しました。50〜93歳の19,000人の成人を追跡しました。

主な発見：定期的にクロスワードを解いていた人は、10歳若い人と同等の文法的推論能力を示し、短期記憶は8歳若い人と同等でした。

エクセター大学のキース・ウェスネス教授：「パズルに取り組んでいると報告した人は一貫してパフォーマンスが良く、パズルの使用頻度に応じて段階的に改善していました。」`,
      },
      {
        title: 'クロスワード対コンピューターゲーム',
        content: `コロンビア大学とデューク大学の驚きの研究では、軽度認知障害を持つ107人の高齢者を調査しました。半数はコンピューター化されたクロスワードを、半数はデジタル記憶ゲームを受けました。

78週間後、クロスワード群は認知機能の改善を示しました。デジタルゲーム群は低下を示しました。

コロンビア大学のD.P.デバナンド博士：「効果は認知だけでなく日常活動にも見られ、MRIでの脳萎縮の減少の兆候は、効果が臨床的に意味があることを示唆しています。」

これは自宅でのクロスワードトレーニングの長期的な利点を記録した最初の研究でした。`,
      },
      {
        title: '認知症予防については？',
        content: `ここは慎重になる必要があります。エクセター大学のアン・コルベット博士は強調しました：「これらのパズルをすることが必ずしも後年の認知症リスクを減らすとは言えません。」

研究は相関関係（統計的な関係）を示していますが、必ずしも因果関係ではありません。認知能力の高い人がそもそもクロスワードをする傾向があるかもしれません。

明らかなこと：言葉ゲームは現在のより良い認知機能と関連しています。`,
      },
      {
        title: '誰に最も効果があるか？',
        content: `コロンビア-デューク研究は興味深いことを発見しました：軽度認知障害の非常に初期段階であれば、コンピューターゲームもクロスワードも同じように役立ちます。しかし、後期段階ではクロスワードの方が効果的でした。

2024年のテキサスA&M大学の研究では、ゲーム、パズル、読書は、すでに軽度の障害がある人でも認知機能の低下を遅らせることがわかりました。`,
      },
      {
        title: '語彙について',
        content: `ゲームを通じた単語学習に関する17の研究の系統的レビューでは、脳は問題解決の文脈で出会った単語をよりよく記憶することがわかりました。

理由：ゲームは学習効果を高める「豊かなコンテキスト、認知的関与、仮想学習状況」を提供します。

簡単に言えば：クロスワードで発見した単語は、リストで読んだ単語よりも記憶に残りやすいのです。`,
      },
      {
        title: '結論',
        content: `研究は言葉ゲームが以下と関連していることを示しています：
• より良い認知機能（エクセター研究、19,000人の参加者）
• 認知機能低下の遅延（コロンビア-デューク研究、78週間）
• より効果的な単語学習（17の研究のレビュー）

研究がまだ証明していないこと：言葉ゲームが認知症を予防すること。

デジタル「脳トレーニング」と比較した言葉ゲームの独自性は、視覚刺激への素早い反応だけでなく、実際の言語知識を必要とすることです。`,
      },
      {
        content: `出典：International Journal of Geriatric Psychiatry (2019)、NEJM Evidence (2022)、Duke University School of Medicine、University of Exeter PROTECT Study`,
      },
    ],
    backToBlog: 'ブログに戻る',
    playDaily: 'デイリーチャレンジ',
    startPracticing: '練習する',
  },
  es: {
    title: 'Lo que la ciencia realmente dice sobre los juegos de palabras y el cerebro',
    subtitle: 'Un repaso de investigaciones recientes de Exeter, Columbia y Duke',
    category: 'Investigación',
    readTime: '7 min de lectura',
    sections: [
      {
        content: `Hay muchas afirmaciones sobre los juegos de palabras y el cerebro. Algunas son exageradas, otras son precisas. Fui a verificar qué muestra realmente la investigación.`,
      },
      {
        title: 'El estudio grande: 19,000 participantes',
        content: `En 2019, investigadores de la Universidad de Exeter y King's College London publicaron un estudio en el International Journal of Geriatric Psychiatry. Siguieron a 19,000 adultos de 50 a 93 años.

El hallazgo clave: quienes resolvían crucigramas regularmente mostraron razonamiento gramatical equivalente a alguien 10 años más joven, y memoria a corto plazo de alguien 8 años más joven.

El Profesor Keith Wesnes de Exeter: "El rendimiento fue consistentemente mejor en quienes reportaron participar en puzzles, y generalmente mejoró incrementalmente con la frecuencia de uso."`,
      },
      {
        title: 'Crucigramas vs. juegos de computadora',
        content: `Un estudio sorprendente de las universidades de Columbia y Duke examinó a 107 adultos mayores con deterioro cognitivo leve. La mitad recibió crucigramas computarizados, la mitad recibió juegos de memoria digitales.

Después de 78 semanas, el grupo de crucigramas mostró mejora cognitiva. El grupo de juegos digitales mostró declive.

El Dr. D.P. Devanand de Columbia: "Los beneficios se vieron no solo en la cognición sino también en las actividades diarias, con indicios de menor contracción cerebral en la resonancia magnética que sugiere que los efectos son clínicamente significativos."

Este fue el primer estudio en documentar beneficios a largo plazo del entrenamiento de crucigramas en casa.`,
      },
      {
        title: '¿Qué hay de prevenir la demencia?',
        content: `Aquí debemos ser cuidadosos. La Dra. Anne Corbett de Exeter enfatizó: "No podemos decir que jugar estos puzzles necesariamente reduce el riesgo de demencia en la vida posterior."

Los estudios muestran correlación—una relación estadística—pero no necesariamente causalidad. Podría ser que las personas con mejores capacidades cognitivas tienen más probabilidades de hacer crucigramas en primer lugar.

Lo que está claro: los juegos de palabras están asociados con mejor función cognitiva en el presente.`,
      },
      {
        title: '¿Quién se beneficia más?',
        content: `El estudio Columbia-Duke encontró algo interesante: si estás muy temprano en el proceso de deterioro cognitivo leve, tanto los juegos de computadora como los crucigramas ayudan igual. Pero en etapas posteriores, los crucigramas fueron más efectivos.

Un estudio de 2024 de Texas A&M encontró que los juegos, puzzles y la lectura ralentizan el declive cognitivo incluso en quienes ya tienen deterioro leve.`,
      },
      {
        title: 'El punto del vocabulario',
        content: `Una revisión sistemática de 17 estudios sobre aprender palabras a través de juegos encontró que el cerebro recuerda mejor las palabras cuando las encuentra en un contexto de resolución de problemas.

La razón: los juegos proporcionan "contextos ricos, compromiso cognitivo y situaciones de aprendizaje virtual" que mejoran la efectividad del aprendizaje.

En términos simples: una palabra que descubriste en un crucigrama permanece mejor en la memoria que una palabra que leíste en una lista.`,
      },
      {
        title: 'La conclusión',
        content: `La investigación muestra que los juegos de palabras están asociados con:
• Mejor función cognitiva (estudio de Exeter, 19,000 participantes)
• Declive cognitivo más lento (estudio Columbia-Duke, 78 semanas)
• Aprendizaje de palabras más efectivo (revisión de 17 estudios)

Lo que la investigación no prueba (aún): que los juegos de palabras previenen la demencia.

Lo que hace únicos a los juegos de palabras comparados con el "entrenamiento cerebral" digital es que requieren conocimiento lingüístico real, no solo reacciones rápidas a estímulos visuales.`,
      },
      {
        content: `Fuentes: International Journal of Geriatric Psychiatry (2019), NEJM Evidence (2022), Duke University School of Medicine, University of Exeter PROTECT Study`,
      },
    ],
    backToBlog: 'Volver al Blog',
    playDaily: 'Desafío Diario',
    startPracticing: 'Practicar',
  },
};

export default function BenefitsPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = (params.locale as string) || language;
  const isDarkMode = theme === 'dark';

  // Get content for current locale, fallback to English
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
        {/* Back Button */}
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

        {/* Article Header */}
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

          <p className={cn('text-lg mb-6', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {content.subtitle}
          </p>

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

          {/* Hero Image */}
          <div className="relative w-full h-64 md:h-80 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/10-benefits.jpg"
              alt="Word game tiles scattered on a table"
              fill
              className="object-cover"
              priority
            />
          </div>
        </header>

        {/* Ad: After hero */}
        <AdPlaceholder zone="content-page" className="my-6" />

        {/* Article Content */}
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

          {/* Simple navigation - no marketing CTAs */}
          <div className={cn('mt-12 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.playDaily}
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.startPracticing}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
