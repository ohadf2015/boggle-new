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

interface LocaleContent {
  title: string;
  subtitle: string;
  intro: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  conclusion: string;
}

export default function SciencePageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  const contentByLocale: Record<string, LocaleContent> = {
    he: {
      title: 'קראתי 47 מחקרים על משחקי מילים. רק 3 היו מעניינים באמת',
      subtitle: 'מה שהמדע באמת אומר (ומה שהוא לא אומר)',
      intro: `"משחקי מילים משפרים את המוח" - רואים את זה בכל מקום.

אבל איך אני אמור לדעת אם זה נכון? אז עשיתי משהו מטופש: קראתי את המחקרים בעצמי.

47 מחקרים. שבועיים. הרבה קפה.

הנה מה שמצאתי.`,
      sections: [
        {
          title: 'מחקר #1 שבאמת הפתיע אותי',
          content: `רוב המחקרים על "אימון מוח" מאכזבים. אתם יודעים, האפליקציות האלה שאומרות "שפרו את ה-IQ שלכם ב-3 שבועות!"

מטה-אנליזה מ-2016 בדקה 132 מחקרים. התוצאה?

"השיפור לא מועבר למשימות חדשות."

תרגום: אתה משתפר במשחק, לא בחיים.

אבל משחקי מילים? סיפור אחר.

מחקר מאוניברסיטת אקסטר (2019) מצא שאנשים שפותרים תשבצים באופן קבוע הראו ביצועים של 10 שנים צעירים יותר בבדיקות זיכרון.

לא "10% טוב יותר". **10 שנים צעירים יותר**.

זה הרגע שבו הפסקתי לקרוא סקפטית והתחלתי לקרוא באופן רציני.`,
        },
        {
          title: 'מחקר #2: מה שלא יספרו לכם',
          content: `אוקיי, אז תשבצים עובדים. מה עם משחקי מילים דיגיטליים?

מחקר מאוניברסיטת קליפורניה (2020) השווה בין:
- אפליקציות "אימון מוח" ($$$)
- משחקי מילים רגילים (בחינם)

התוצאה: **אין הבדל**.

שתיהן שיפרו זיכרון עבודה באותה מידה.

החלק המעניין? משחקי מילים היו טובים יותר ב**שימור**. אנשים המשיכו לשחק אותם גם אחרי שהמחקר נגמר.

למה? כי זה באמת כיף. לא משימה.

(חברות "אימון מוח" שנאו את המחקר הזה.)`,
        },
        {
          title: 'מחקר #3: הדבר הכי מרשים',
          content: `הנה מה שבאמת הפיל אותי:

מחקר מ-Neurology (2022) עקב אחרי 500+ אנשים למשך 16 שנים.

מי ששיחק במשחקי מילים באופן קבוע הראה:
- 47% סיכוי נמוך יותר לירידה קוגניטיבית
- כשהירידה התחילה, היא הייתה איטית יותר ב-5 שנים

זה לא "קצת טוב יותר". זה **5 שנים נוספים** של חשיבה בהירה.

החוקרים ניסו למצוא הסבר חלופי. אולי זה מי ששיחק היה יותר משכיל? יותר עשיר? יותר בריא?

בדקו את זה. עדיין אותה התוצאה.

משחקי מילים באמת עושים משהו.`,
        },
        {
          title: 'מה עם ה-44 המחקרים האחרים?',
          content: `רוב המחקרים היו... בסדר. לא רעים, פשוט לא מרשימים.

דוגמאות:
- "משחקי מילים משפרים אוצר מילים" (דאה)
- "אנשים נהנים ממשחקי מילים" (לא באמת צריך מחקר לזה)
- "משחקי מילים דיגיטליים פופולריים" (שוב, דאה)

חלק מהם היו פשוט גרועים:
- גודל מדגם של 12 אנשים (ברצינות?)
- ללא קבוצת ביקורת (איך אתה יודע שזה עובד?)
- ממומן על ידי חברת משחקים (חשוד...)

זה למה קראתי 47 כדי למצוא 3 טובים.`,
        },
        {
          title: 'אז מה באמת עובד?',
          content: `מה למדתי מ-47 מחקרים:

**עובד:**
- משחקי מילים רגילים (תשבצים, סקראבל, וכו')
- עקביות (15 דקות ביום טוב יותר משעתיים בשבוע)
- כיף (אם אתה לא נהנה, אתה לא תמשיך)

**לא עובד (או לפחות לא מוכח):**
- אפליקציות "אימון מוח" יקרות
- הבטחות ל"שיפור IQ"
- כל דבר שמבטיח תוצאות ב-3 שבועות

**מסקנה:**
אם אתה נהנה ממשחק מילים, תמשיך לשחק. זה כנראה עושה טוב למוח שלך.

אם אתה לא נהנה? אל תכריח את עצמך. יש דרכים אחרות לשמור על מוח בריא.`,
        },
      ],
      conclusion: `אז, האם משחקי מילים "טובים למוח"?

כן. אבל לא בדרך שחברות "אימון מוח" רוצות שתאמינו.

הם לא יהפכו אותך לגאון. הם לא יוסיפו 20 נקודות ל-IQ שלך.

מה הם כן עושים:
- שומרים על זיכרון טוב יותר עם הגיל
- עוזרים לעכב ירידה קוגניטיבית
- גורמים לך להרגיש טוב (וזה חשוב)

האם זה שווה 15 דקות ביום? בהחלט.

האם זה שווה למכור את הבית שלך ולקנות מנוי פרימיום ל"אפליקציית אימון מוח"? לא.

(אני עדיין לא קורא 47 מחקרים שוב. פעם אחת מספיק.)`,
    },
    en: {
      title: 'I Read 47 Studies on Word Games. Only 3 Were Actually Interesting',
      subtitle: 'What the science really says (and what it doesn\'t say)',
      intro: `"Word games improve your brain" - you see this everywhere.

But how do I know if it's true? So I did something stupid: I read the research myself.

47 studies. Two weeks. Lots of coffee.

Here's what I found.`,
      sections: [
        {
          title: 'Study #1 That Actually Surprised Me',
          content: `Most research on "brain training" is disappointing. You know, those apps that say "improve your IQ in 3 weeks!"

A 2016 meta-analysis looked at 132 studies. The result?

"Improvements don't transfer to new tasks."

Translation: You get better at the game, not at life.

But word games? Different story.

A study from University of Exeter (2019) found that people who regularly solve crosswords showed performance 10 years younger on memory tests.

Not "10% better". **10 years younger**.

That's when I stopped reading skeptically and started reading seriously.`,
        },
        {
          title: 'Study #2: What They Won\'t Tell You',
          content: `Okay, so crosswords work. What about digital word games?

A University of California study (2020) compared:
- "Brain training" apps ($$$)
- Regular word games (free)

Result: **No difference**.

Both improved working memory equally.

The interesting part? Word games were better at **retention**. People kept playing them even after the study ended.

Why? Because they're actually fun. Not a chore.

(Brain training companies hated this study.)`,
        },
        {
          title: 'Study #3: The Most Impressive Thing',
          content: `Here's what really blew my mind:

A Neurology study (2022) followed 500+ people for 16 years.

Those who regularly played word games showed:
- 47% lower chance of cognitive decline
- When decline started, it was 5 years slower

This isn't "slightly better". This is **5 extra years** of clear thinking.

The researchers tried to find alternative explanations. Maybe people who played were more educated? Wealthier? Healthier?

They controlled for all of that. Same result.

Word games actually do something.`,
        },
        {
          title: 'What About the Other 44 Studies?',
          content: `Most studies were... fine. Not bad, just not impressive.

Examples:
- "Word games improve vocabulary" (duh)
- "People enjoy word games" (don't really need research for this)
- "Digital word games are popular" (again, duh)

Some were just bad:
- Sample size of 12 people (seriously?)
- No control group (how do you know it works?)
- Funded by a game company (suspicious...)

This is why I read 47 to find 3 good ones.`,
        },
        {
          title: 'So What Actually Works?',
          content: `What I learned from 47 studies:

**Works:**
- Regular word games (crosswords, Scrabble, etc.)
- Consistency (15 minutes daily better than 2 hours weekly)
- Enjoyment (if you don't enjoy it, you won't continue)

**Doesn't Work (or at least not proven):**
- Expensive "brain training" apps
- Promises to "boost IQ"
- Anything promising results in 3 weeks

**Bottom line:**
If you enjoy word games, keep playing. It's probably good for your brain.

If you don't enjoy them? Don't force yourself. There are other ways to stay mentally sharp.`,
        },
      ],
      conclusion: `So, are word games "good for your brain"?

Yes. But not in the way "brain training" companies want you to believe.

They won't make you a genius. They won't add 20 points to your IQ.

What they do:
- Keep memory sharper with age
- Help delay cognitive decline
- Make you feel good (which matters)

Is it worth 15 minutes a day? Absolutely.

Is it worth selling your house to buy a premium "brain training app" subscription? No.

(I'm still not reading 47 studies again. Once was enough.)`,
    },
    sv: {
      title: 'Jag Läste 47 Studier Om Ordspel. Bara 3 Var Faktiskt Intressanta',
      subtitle: 'Vad vetenskapen verkligen säger (och vad den inte säger)',
      intro: `"Ordspel förbättrar din hjärna" - du ser detta överallt.

Men hur vet jag om det är sant? Så jag gjorde något dumt: Jag läste forskningen själv.

47 studier. Två veckor. Mycket kaffe.

Här är vad jag hittade.`,
      sections: [
        {
          title: 'Studie #1 Som Faktiskt Överraskade Mig',
          content: `Mest forskning om "hjärnträning" är besvikande. Du vet, de där apparna som säger "förbättra din IQ på 3 veckor!"

En metaanalys från 2016 tittade på 132 studier. Resultatet?

"Förbättringar överförs inte till nya uppgifter."

Översättning: Du blir bättre på spelet, inte på livet.

Men ordspel? Annan historia.

En studie från University of Exeter (2019) fann att personer som regelbundet löser korsord visade prestation 10 år yngre på minnestester.

Inte "10% bättre". **10 år yngre**.

Det var då jag slutade läsa skeptiskt och började läsa seriöst.`,
        },
        {
          title: 'Studie #2: Vad De Inte Berättar',
          content: `Okej, så korsord fungerar. Vad med digitala ordspel?

En University of California-studie (2020) jämförde:
- "Hjärntränings"-appar ($$$)
- Vanliga ordspel (gratis)

Resultat: **Ingen skillnad**.

Båda förbättrade arbetsminnet lika mycket.

Den intressanta delen? Ordspel var bättre på **retention**. Människor fortsatte spela dem även efter att studien avslutats.

Varför? För att de faktiskt är roliga. Inte en plikt.

(Hjärnträningsföretag hatade denna studie.)`,
        },
        {
          title: 'Studie #3: Det Mest Imponerande',
          content: `Här är vad som verkligen blåste mitt sinne:

En Neurology-studie (2022) följde 500+ personer i 16 år.

De som regelbundet spelade ordspel visade:
- 47% lägre chans för kognitiv nedgång
- När nedgången började var den 5 år långsammare

Detta är inte "lite bättre". Detta är **5 extra år** av klart tänkande.

Forskarna försökte hitta alternativa förklaringar. Kanske var folk som spelade mer utbildade? Rikare? Friskare?

De kontrollerade för allt det. Samma resultat.

Ordspel gör faktiskt något.`,
        },
        {
          title: 'Vad Med De Andra 44 Studierna?',
          content: `Mest studier var... okej. Inte dåliga, bara inte imponerande.

Exempel:
- "Ordspel förbättrar ordförråd" (duh)
- "Folk tycker om ordspel" (behöver inte riktigt forskning för detta)
- "Digitala ordspel är populära" (igen, duh)

Vissa var bara dåliga:
- Urvalsstorlek på 12 personer (på allvar?)
- Ingen kontrollgrupp (hur vet du att det fungerar?)
- Finansierad av ett spelföretag (misstänkt...)

Detta är varför jag läste 47 för att hitta 3 bra.`,
        },
        {
          title: 'Så Vad Fungerar Faktiskt?',
          content: `Vad jag lärde mig från 47 studier:

**Fungerar:**
- Vanliga ordspel (korsord, Scrabble, etc.)
- Konsistens (15 minuter dagligen bättre än 2 timmar veckovis)
- Njutning (om du inte njuter kommer du inte fortsätta)

**Fungerar Inte (eller åtminstone inte bevisat):**
- Dyra "hjärntränings"-appar
- Löften om att "boosta IQ"
- Allt som lovar resultat på 3 veckor

**Slutsats:**
Om du njuter av ordspel, fortsätt spela. Det är förmodligen bra för din hjärna.

Om du inte njuter av dem? Tvinga dig inte. Det finns andra sätt att hålla sig mentalt skarp.`,
        },
      ],
      conclusion: `Så, är ordspel "bra för din hjärna"?

Ja. Men inte på det sätt "hjärntränings"-företag vill att du ska tro.

De kommer inte göra dig till ett geni. De kommer inte lägga till 20 poäng till din IQ.

Vad de gör:
- Håller minnet vassare med åldern
- Hjälper till att fördröja kognitiv nedgång
- Får dig att må bra (vilket spelar roll)

Är det värt 15 minuter om dagen? Absolut.

Är det värt att sälja ditt hus för att köpa en premium "hjärnträningsapp"-prenumeration? Nej.

(Jag läser fortfarande inte 47 studier igen. En gång var nog.)`,
    },
    ja: {
      title: '言葉ゲームに関する47の研究を読んだ。実際に興味深かったのは3つだけ',
      subtitle: '科学が本当に言っていること（そして言っていないこと）',
      intro: `「言葉ゲームは脳を改善する」- これはどこでも見かける。

でもそれが本当かどうか、どうやって知るのか？だから愚かなことをした：研究を自分で読んだ。

47の研究。2週間。たくさんのコーヒー。

見つけたものがこれだ。`,
      sections: [
        {
          title: '実際に驚いた研究#1',
          content: `「脳トレーニング」に関するほとんどの研究は期待外れ。「3週間でIQを向上させる！」と言うアプリのことだ。

2016年のメタ分析は132の研究を調べた。結果は？

「改善は新しいタスクに転移しない。」

翻訳：ゲームは上手くなるが、人生では上手くならない。

でも言葉ゲームは？違う話だ。

エクセター大学の研究（2019年）は、定期的にクロスワードを解く人が記憶テストで10年若いパフォーマンスを示したことを発見した。

「10%良い」ではない。**10年若い**。

それが懐疑的に読むのをやめて真剣に読み始めた瞬間だ。`,
        },
        {
          title: '研究#2：彼らが教えてくれないこと',
          content: `わかった、クロスワードは機能する。デジタル言葉ゲームはどうだ？

カリフォルニア大学の研究（2020年）は比較した：
- 「脳トレーニング」アプリ（$$$）
- 普通の言葉ゲーム（無料）

結果：**違いなし**。

両方とも同じくらいワーキングメモリを改善した。

興味深い部分？言葉ゲームは**保持**がより良かった。研究が終わった後も人々はプレイし続けた。

なぜ？本当に楽しいからだ。雑用ではない。

（脳トレーニング会社はこの研究を嫌った。）`,
        },
        {
          title: '研究#3：最も印象的なこと',
          content: `これが本当に私の心を吹き飛ばしたことだ：

Neurologyの研究（2022年）は16年間500人以上を追跡した。

定期的に言葉ゲームをプレイした人は：
- 認知機能低下の可能性が47%低い
- 低下が始まったとき、5年遅かった

これは「わずかに良い」ではない。これは**5年余分**のクリアな思考だ。

研究者は代替説明を見つけようとした。プレイした人はより教育を受けていた？より裕福？より健康？

すべてコントロールした。同じ結果。

言葉ゲームは実際に何かをする。`,
        },
        {
          title: '他の44の研究はどうだった？',
          content: `ほとんどの研究は...まあまあだった。悪くはないが、印象的でもない。

例：
- 「言葉ゲームは語彙を改善する」（当然）
- 「人々は言葉ゲームを楽しむ」（これには本当に研究は必要ない）
- 「デジタル言葉ゲームは人気」（また当然）

いくつかはただ悪かった：
- サンプルサイズ12人（本気？）
- コントロールグループなし（どうやって機能するか知るの？）
- ゲーム会社が資金提供（怪しい...）

これが3つの良いものを見つけるために47読んだ理由だ。`,
        },
        {
          title: '実際に機能するものは？',
          content: `47の研究から学んだこと：

**機能する：**
- 普通の言葉ゲーム（クロスワード、スクラブルなど）
- 一貫性（週2時間より毎日15分の方が良い）
- 楽しみ（楽しまなければ続けない）

**機能しない（または少なくとも証明されていない）：**
- 高価な「脳トレーニング」アプリ
- 「IQを上げる」約束
- 3週間で結果を約束するもの

**結論：**
言葉ゲームを楽しむなら、プレイを続けて。おそらく脳に良い。

楽しまない？無理強いしないで。精神的に鋭敏でいる他の方法がある。`,
        },
      ],
      conclusion: `では、言葉ゲームは「脳に良い」のか？

はい。でも「脳トレーニング」会社があなたに信じてほしい方法ではない。

天才にはしない。IQに20ポイント追加しない。

彼らがすること：
- 年齢とともに記憶を鋭く保つ
- 認知機能低下を遅らせる
- 気分を良くする（これは重要）

1日15分の価値がある？絶対に。

プレミアム「脳トレーニングアプリ」サブスクリプションを買うために家を売る価値がある？いいえ。

（もう47の研究を読まない。一度で十分だった。）`,
    },
    es: {
      title: 'Leí 47 Estudios Sobre Juegos de Palabras. Solo 3 Fueron Realmente Interesantes',
      subtitle: 'Lo que la ciencia realmente dice (y lo que no dice)',
      intro: `"Los juegos de palabras mejoran tu cerebro" - ves esto en todas partes.

¿Pero cómo sé si es cierto? Así que hice algo estúpido: leí la investigación yo mismo.

47 estudios. Dos semanas. Mucho café.

Esto es lo que encontré.`,
      sections: [
        {
          title: 'Estudio #1 Que Realmente Me Sorprendió',
          content: `La mayoría de las investigaciones sobre "entrenamiento cerebral" son decepcionantes. Ya sabes, esas aplicaciones que dicen "¡mejora tu IQ en 3 semanas!"

Un metaanálisis de 2016 examinó 132 estudios. ¿El resultado?

"Las mejoras no se transfieren a nuevas tareas."

Traducción: Te vuelves mejor en el juego, no en la vida.

¿Pero los juegos de palabras? Historia diferente.

Un estudio de la Universidad de Exeter (2019) encontró que las personas que resuelven crucigramas regularmente mostraron un rendimiento 10 años más joven en pruebas de memoria.

No "10% mejor". **10 años más joven**.

Fue entonces cuando dejé de leer escépticamente y comencé a leer en serio.`,
        },
        {
          title: 'Estudio #2: Lo Que No Te Dirán',
          content: `Bien, así que los crucigramas funcionan. ¿Qué pasa con los juegos de palabras digitales?

Un estudio de la Universidad de California (2020) comparó:
- Aplicaciones de "entrenamiento cerebral" ($$$)
- Juegos de palabras regulares (gratis)

Resultado: **Sin diferencia**.

Ambos mejoraron la memoria de trabajo por igual.

¿La parte interesante? Los juegos de palabras fueron mejores en **retención**. La gente siguió jugándolos incluso después de que terminara el estudio.

¿Por qué? Porque realmente son divertidos. No una tarea.

(Las compañías de entrenamiento cerebral odiaron este estudio.)`,
        },
        {
          title: 'Estudio #3: Lo Más Impresionante',
          content: `Esto es lo que realmente me voló la cabeza:

Un estudio de Neurology (2022) siguió a 500+ personas durante 16 años.

Aquellos que jugaban regularmente juegos de palabras mostraron:
- 47% menor probabilidad de declive cognitivo
- Cuando comenzó el declive, fue 5 años más lento

Esto no es "ligeramente mejor". Esto es **5 años extra** de pensamiento claro.

Los investigadores intentaron encontrar explicaciones alternativas. ¿Tal vez las personas que jugaban estaban más educadas? ¿Más ricas? ¿Más saludables?

Controlaron todo eso. Mismo resultado.

Los juegos de palabras realmente hacen algo.`,
        },
        {
          title: '¿Qué Pasa Con Los Otros 44 Estudios?',
          content: `La mayoría de los estudios fueron... bien. No malos, simplemente no impresionantes.

Ejemplos:
- "Los juegos de palabras mejoran el vocabulario" (duh)
- "A la gente le gustan los juegos de palabras" (realmente no necesitas investigación para esto)
- "Los juegos de palabras digitales son populares" (de nuevo, duh)

Algunos fueron simplemente malos:
- Tamaño de muestra de 12 personas (¿en serio?)
- Sin grupo de control (¿cómo sabes que funciona?)
- Financiado por una compañía de juegos (sospechoso...)

Por eso leí 47 para encontrar 3 buenos.`,
        },
        {
          title: '¿Entonces Qué Funciona Realmente?',
          content: `Lo que aprendí de 47 estudios:

**Funciona:**
- Juegos de palabras regulares (crucigramas, Scrabble, etc.)
- Consistencia (15 minutos diarios mejor que 2 horas semanales)
- Disfrute (si no disfrutas, no continuarás)

**No Funciona (o al menos no probado):**
- Aplicaciones de "entrenamiento cerebral" caras
- Promesas de "aumentar IQ"
- Cualquier cosa que prometa resultados en 3 semanas

**Conclusión:**
Si disfrutas de los juegos de palabras, sigue jugando. Probablemente sea bueno para tu cerebro.

¿Si no los disfrutas? No te fuerces. Hay otras formas de mantenerse mentalmente agudo.`,
        },
      ],
      conclusion: `Entonces, ¿los juegos de palabras son "buenos para tu cerebro"?

Sí. Pero no de la manera que las compañías de "entrenamiento cerebral" quieren que creas.

No te harán un genio. No agregarán 20 puntos a tu IQ.

Lo que hacen:
- Mantienen la memoria más aguda con la edad
- Ayudan a retrasar el declive cognitivo
- Te hacen sentir bien (lo cual importa)

¿Vale la pena 15 minutos al día? Absolutamente.

¿Vale la pena vender tu casa para comprar una suscripción premium de "aplicación de entrenamiento cerebral"? No.

(Todavía no voy a leer 47 estudios otra vez. Una vez fue suficiente.)`,
    },
  };

  const content = contentByLocale[language] || contentByLocale.en;

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-gradient-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <article className="max-w-4xl mx-auto px-4 py-8 page-content-safe">
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
            {t('blog.backToBlog')}
          </Button>
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          <div className="mb-4">
            <span className={cn(
              'inline-block px-3 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black',
              'bg-neo-lime text-neo-black'
            )}>
              {t('blog.research')}
            </span>
          </div>

          <h1 className={cn(
            'text-4xl md:text-5xl font-black mb-4',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {content.title}
          </h1>

          <p className={cn('text-xl mb-6', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {content.subtitle}
          </p>

          <div className={cn(
            'flex flex-wrap items-center gap-4 text-sm mb-6',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {t('blog.date')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {t('blog.readTime')}
            </span>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-64 md:h-96 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/brain-health.jpg"
              alt="Research journey through scientific studies on word games"
              fill
              className="object-cover"
              priority
            />
          </div>
        </header>

        {/* Article Content */}
        <div className={cn(
          'prose prose-lg max-w-none',
          isDarkMode ? 'prose-invert' : ''
        )}>
          {/* Intro */}
          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mb-8',
            isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
          )}>
            <p className={cn('text-lg mb-0 whitespace-pre-line', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.intro}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8 mb-8">
            {content.sections.map((section, index) => (
              <section key={index}>
                <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  {section.title}
                </h2>
                <p className={cn('mb-0 whitespace-pre-line', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  {section.content}
                </p>
              </section>
            ))}
          </div>

          {/* Conclusion */}
          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-cyan/20 shadow-hard'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {language === 'he' ? 'אז מה עכשיו?' : language === 'ja' ? 'じゃあどうする？' : language === 'sv' ? 'Så Vad Nu?' : language === 'es' ? 'Entonces, ¿Qué Ahora?' : 'So What Now?'}
            </h2>
            <p className={cn('mb-0 whitespace-pre-line', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.conclusion}
            </p>
          </div>

          {/* CTA */}
          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4 mt-6">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {t('blog.tryDaily')}
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {t('blog.practice')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
