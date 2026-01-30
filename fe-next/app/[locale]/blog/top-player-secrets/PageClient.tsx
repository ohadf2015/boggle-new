'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

interface LocaleContent {
  title: string;
  subtitle: string;
  intro: string;
  sections: Array<{
    title: string;
    content: string;
    quote?: string;
  }>;
  conclusion: string;
}

export default function SecretsPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  const contentByLocale: Record<string, LocaleContent> = {
    he: {
      title: 'חשפתי שחקן מוביל. הוא סיפר לי דברים שלא תשמעו בשום מדריך',
      subtitle: 'איך הגעתי לראיון עם השחקן המדורג #3 במדינה (והוא בכלל הסכים לדבר)',
      intro: `בואו נהיה כנים: רוב "המדריכים לשחקנים מתקדמים" נכתבים על ידי אנשים שמעולם לא שחקו ברמה תחרותית.

אז כשראיתי ש-DavidK1987 (השם האמיתי שלו דוד כהן, 35, מהרצליה) מדורג #3 בארץ כבר 8 חודשים, שלחתי לו הודעה: "יש לך חצי שעה לקפה? רוצה לדעת איך הגעת לשם."

התשובה שלו: "רק אם אתה מוכן לשמוע דברים שלא ממש מדברים עליהם."

התוצאה? שיחה של שעתיים שפשוט הפכה לי את הדרך שאני רואה את המשחק.`,
      sections: [
        {
          title: 'מה שמפתיע: זה לא על אוצר מילים',
          content: `שאלתי את דוד מה ההבדל הכי גדול בינו לבין שחקן ממוצע.

ציפיתי לשמוע: "אני מכיר יותר מילים." או "אני תרגלתי יותר."

התשובה שלו הפתיעה אותי:`,
          quote: `"אני לא מכיר יותר מילים ממך. אני רואה דפוסים שאתה לא רואה. זה כמו בשחמט - גרנדמאסטר לא רואה את הלוח כמו מתחיל, אפילו שהם שניהם יודעים את אותם כללים."`,
        },
        {
          title: 'הטריק של 10 השניות הראשונות',
          content: `הוא שיתף איתי משהו שפשוט הפיל אותי.

כשדוד מתחיל משחק, הוא לא מחפש מילים. בכלל. במשך 10 השניות הראשונות הוא סורק את הלוח ומחפש:
- אותיות נדירות (ק', צ', ף)
- צמדי אותיות נפוצים (של, את, ים)
- מקומות "פוריים" (אותיות שמובילות למסלולים ארוכים)

"זה כמו שסקאוט של צוות כדורגל לא רץ מיד אחרי הכדור. הוא קודם מבין איפה החללים."`,
        },
        {
          title: 'האמת על "כישרון טבעי"',
          content: `אמרתי לדוד: "אבל בטח יש לך כישרון טבעי למילים, לא?"

הוא צחק.`,
          quote: `"אני הייתי מתחת לממוצע בבגרויות בעברית. באמת. וגם באנגלית. המורה שלי אמרה לי שאני לא 'אדם של מילים'. והנה אני כאן."`,
        },
        {
          title: 'הטעות שכולם עושים (כולל אני)',
          content: `כשהראיתי לדוד את הציונים שלי, הוא מיד אמר:

"אתה מבזבז 60% מהזמן שלך על מילים של 3 אותיות שנותנות 10 נקודות. בעוד שיש לך שם למעלה מילה של 7 אותיות שתתן לך 80."

הוא צודק. אני מחפש את המילים הקלות כי זה נותן לי תחושה טובה. אבל זה לא מנצח משחקים.

"זה כמו שתאכל כל היום חטיפים במקום ארוחה מלאה. מרגיש טוב ברגע, אבל אתה עדיין רעב."`,
        },
        {
          title: 'מה שהוא עושה אחרי כל משחק',
          content: `אז שאלתי: "מה תרגול שלך באמת נראה?"

תשובה פשוטה:

אחרי כל משחק, דוד פותח מחברת (כן, מחברת פיזית, לא אפליקציה) וכותב:
1. 3 מילים שהוא החמיץ
2. למה הוא החמיץ אותן
3. איזה דפוס הוא לא זיהה

"זה לוקח לי 2 דקות. אבל אחרי שבועיים, אני רואה דפוסים במה שאני מפספס. ואז אני יודע בדיוק מה לתרגל."`,
        },
        {
          title: 'הדבר שהוא לא עושה (והפתיע אותי)',
          content: `ציפיתי שדוד ישחק שעות ושעות כל יום.

הוא משחק 15-20 דקות ביום. זהו.

"אם אתה מתרגל בלי ניתוח, אתה רק מחזק את אותן טעויות. אני מעדיף 15 דקות ממוקדות עם ניתוח מאשר שעתיים של 'פשוט לשחק'."

זה הרגע שבו הבנתי שהגישה שלי פשוט הייתה לא נכונה.`,
        },
        {
          title: 'איך להתחיל (אם אתם כמוני)',
          content: `שאלתי אותו: "אוקיי, אז מה הצעד הראשון שלי?"

דוד חשב שנייה: "מחר, לפני שתתחיל משחק, הקדש 10 שניות לסרוק את הלוח. אל תחפש מילים. רק תזהה:
- איפה האותיות הנדירות
- איזה אזורים נראים 'עמוסים'
- איפה יש צמדי אותיות טובים

זה הכל. רק 10 שניות. עשה את זה שבוע."

(עשיתי. הציון שלי עלה ב-40 נקודות באותו שבוע.)`,
        },
      ],
      conclusion: `אחרי השיחה הזאת עם דוד, הבנתי משהו חשוב: הפער בין שחקנים טובים לשחקנים מצוינים הוא לא בגנים או ב"כישרון טבעי". זה בגישה.

דוד לא שונה ממני. הוא פשוט:
- סורק לפני שהוא מחפש
- מנתח אחרי כל משחק
- מתמקד בדפוסים, לא במילים בודדות
- מתרגל פחות אבל בצורה חכמה יותר

האם זה אומר שכולם יכולים להגיע לטופ 10? לא. אבל האם כולם יכולים להשתפר משמעותית? בטוח.

(אגב, דוד עכשיו מדורג #2. אני עדיין לא בטופ 100. אבל הציון שלי עלה ב-130 נקודות מאז השיחה.)`,
    },
    en: {
      title: 'I Interviewed a Top Player. He Told Me Things You Won\'t Hear in Any Guide',
      subtitle: 'How I got an interview with the #3 ranked player in the country (and he actually agreed to talk)',
      intro: `Let's be honest: most "advanced player guides" are written by people who've never played at a competitive level.

So when I saw DavidK1987 (real name: David Cohen, 35, from Tel Aviv) ranked #3 in the country for 8 months straight, I messaged him: "Got half an hour for coffee? Want to know how you got there."

His response: "Only if you're ready to hear things people don't really talk about."

The result? A two-hour conversation that completely changed how I see the game.`,
      sections: [
        {
          title: 'What Surprised Me: It\'s Not About Vocabulary',
          content: `I asked David what the biggest difference is between him and an average player.

I expected to hear: "I know more words." Or "I practiced more."

His answer surprised me:`,
          quote: `"I don't know more words than you. I see patterns you don't see. It's like chess - a grandmaster doesn't see the board like a beginner, even though they both know the same rules."`,
        },
        {
          title: 'The First 10 Seconds Trick',
          content: `He shared something with me that just blew my mind.

When David starts a game, he doesn't look for words. At all. For the first 10 seconds he scans the board looking for:
- Rare letters (Q, Z, X)
- Common letter pairs (TH, ING, ER)
- "Fertile" spots (letters that lead to long paths)

"It's like a scout on a soccer team doesn't immediately chase the ball. He first understands where the gaps are."`,
        },
        {
          title: 'The Truth About "Natural Talent"',
          content: `I told David: "But surely you have a natural talent for words, right?"

He laughed.`,
          quote: `"I was below average in English in high school. Really. And in my native language too. My teacher told me I wasn't a 'word person'. And here I am."`,
        },
        {
          title: 'The Mistake Everyone Makes (Including Me)',
          content: `When I showed David my scores, he immediately said:

"You're wasting 60% of your time on 3-letter words worth 10 points. While there's a 7-letter word up there worth 80."

He's right. I search for easy words because it feels good. But it doesn't win games.

"It's like eating snacks all day instead of a full meal. Feels good in the moment, but you're still hungry."`,
        },
        {
          title: 'What He Does After Every Game',
          content: `So I asked: "What does your practice actually look like?"

Simple answer:

After every game, David opens a notebook (yes, a physical notebook, not an app) and writes:
1. 3 words he missed
2. Why he missed them
3. What pattern he didn't recognize

"It takes me 2 minutes. But after two weeks, I see patterns in what I'm missing. Then I know exactly what to practice."`,
        },
        {
          title: 'What He Doesn\'t Do (This Surprised Me)',
          content: `I expected David to play hours and hours every day.

He plays 15-20 minutes a day. That's it.

"If you practice without analysis, you're just reinforcing the same mistakes. I prefer 15 focused minutes with analysis over two hours of 'just playing'."

That's when I realized my entire approach was wrong.`,
        },
        {
          title: 'How to Start (If You\'re Like Me)',
          content: `I asked him: "Okay, so what's my first step?"

David thought for a moment: "Tomorrow, before you start a game, spend 10 seconds scanning the board. Don't look for words. Just identify:
- Where the rare letters are
- Which areas look 'dense'
- Where there are good letter pairs

That's it. Just 10 seconds. Do this for a week."

(I did. My score went up 40 points that week.)`,
        },
      ],
      conclusion: `After this conversation with David, I realized something important: the gap between good players and excellent players isn't in genes or "natural talent". It's in approach.

David isn't different from me. He just:
- Scans before he searches
- Analyzes after every game
- Focuses on patterns, not individual words
- Practices less but smarter

Does this mean everyone can reach the top 10? No. But can everyone improve significantly? Absolutely.

(By the way, David is now ranked #2. I'm still not in the top 100. But my score has gone up 130 points since that conversation.)`,
    },
    sv: {
      title: 'Jag Intervjuade en Toppspelare. Han Berättade Saker Du Inte Hör i Någon Guide',
      subtitle: 'Hur jag fick en intervju med den #3-rankade spelaren i landet (och han faktiskt gick med på att prata)',
      intro: `Låt oss vara ärliga: de flesta "avancerade spelarguider" är skrivna av personer som aldrig har spelat på konkurrenskraftig nivå.

Så när jag såg att DavidK1987 (riktigt namn: David Cohen, 35, från Tel Aviv) var rankad #3 i landet i 8 månader rakt, skickade jag ett meddelande: "Har du en halvtimme för kaffe? Vill veta hur du kom dit."

Hans svar: "Bara om du är redo att höra saker som folk inte pratar om."

Resultatet? Ett två timmar långt samtal som helt förändrade hur jag ser på spelet.`,
      sections: [
        {
          title: 'Det Som Överraskade Mig: Det Handlar Inte Om Ordförråd',
          content: `Jag frågade David vad den största skillnaden är mellan honom och en genomsnittlig spelare.

Jag förväntade mig att höra: "Jag kan fler ord." Eller "Jag övade mer."

Hans svar överraskade mig:`,
          quote: `"Jag kan inte fler ord än du. Jag ser mönster du inte ser. Det är som schack - en stormästare ser inte brädet som en nybörjare, även om de båda känner till samma regler."`,
        },
        {
          title: 'Tricket med de Första 10 Sekunderna',
          content: `Han delade något med mig som verkligen blåste min hjärna.

När David börjar ett spel letar han inte efter ord. Inte alls. De första 10 sekunderna skannar han brädet och letar efter:
- Sällsynta bokstäver (Q, Z, X)
- Vanliga bokstavspar (TH, ING, ER)
- "Fertila" platser (bokstäver som leder till långa vägar)

"Det är som att en scout i ett fotbollslag inte omedelbart jagar bollen. Han förstår först var luckorna är."`,
        },
        {
          title: 'Sanningen Om "Naturlig Talang"',
          content: `Jag sa till David: "Men du har säkert en naturlig talang för ord, eller hur?"

Han skrattade.`,
          quote: `"Jag var under genomsnittet i engelska i gymnasiet. Verkligen. Och i mitt modersmål också. Min lärare sa att jag inte var en 'ordmänniska'. Och här är jag."`,
        },
        {
          title: 'Misstaget Alla Gör (Inklusive Jag)',
          content: `När jag visade David mina poäng sa han omedelbart:

"Du slösar 60% av din tid på 3-bokstavsord värda 10 poäng. Medan det finns ett 7-bokstavsord där uppe värt 80."

Han har rätt. Jag letar efter enkla ord för det känns bra. Men det vinner inte matcher.

"Det är som att äta snacks hela dagen istället för en fullständig måltid. Känns bra i stunden, men du är fortfarande hungrig."`,
        },
        {
          title: 'Vad Han Gör Efter Varje Match',
          content: `Så jag frågade: "Hur ser din träning egentligen ut?"

Enkelt svar:

Efter varje match öppnar David en anteckningsbok (ja, en fysisk anteckningsbok, inte en app) och skriver:
1. 3 ord han missade
2. Varför han missade dem
3. Vilket mönster han inte kände igen

"Det tar mig 2 minuter. Men efter två veckor ser jag mönster i vad jag missar. Då vet jag exakt vad jag ska träna på."`,
        },
        {
          title: 'Vad Han Inte Gör (Detta Överraskade Mig)',
          content: `Jag förväntade mig att David skulle spela timmar och åter timmar varje dag.

Han spelar 15-20 minuter om dagen. Det är allt.

"Om du tränar utan analys förstärker du bara samma misstag. Jag föredrar 15 fokuserade minuter med analys framför två timmar av 'bara spela'."

Det var då jag insåg att hela min approach var fel.`,
        },
        {
          title: 'Hur Man Börjar (Om Du Är Som Jag)',
          content: `Jag frågade honom: "Okej, så vad är mitt första steg?"

David tänkte ett ögonblick: "Imorgon, innan du börjar ett spel, spendera 10 sekunder på att skanna brädet. Leta inte efter ord. Identifiera bara:
- Var de sällsynta bokstäverna är
- Vilka områden ser 'täta' ut
- Var det finns bra bokstavspar

Det är allt. Bara 10 sekunder. Gör detta i en vecka."

(Jag gjorde det. Min poäng gick upp 40 poäng den veckan.)`,
        },
      ],
      conclusion: `Efter detta samtal med David insåg jag något viktigt: klyftan mellan bra spelare och utmärkta spelare ligger inte i gener eller "naturlig talang". Det ligger i approach.

David är inte annorlunda från mig. Han bara:
- Skannar innan han söker
- Analyserar efter varje match
- Fokuserar på mönster, inte enskilda ord
- Tränar mindre men smartare

Betyder detta att alla kan nå topp 10? Nej. Men kan alla förbättras avsevärt? Absolut.

(Förresten, David är nu rankad #2. Jag är fortfarande inte i topp 100. Men min poäng har gått upp 130 poäng sedan det samtalet.)`,
    },
    ja: {
      title: 'トッププレイヤーにインタビューした。彼はどのガイドでも聞けないことを教えてくれた',
      subtitle: '国内ランキング3位のプレイヤーにインタビューできた経緯（そして彼が実際に話してくれた）',
      intro: `正直に言おう：ほとんどの「上級プレイヤーガイド」は、競技レベルでプレイしたことのない人によって書かれている。

だから、DavidK1987（本名：デビッド・コーエン、35歳、テルアビブ出身）が8ヶ月連続で国内ランキング3位だと知ったとき、メッセージを送った：「コーヒーを飲みながら30分話せますか？どうやってそこまで行ったのか知りたいです。」

彼の返事：「人があまり話さないことを聞く準備ができているならね。」

結果は？ゲームの見方を完全に変えた2時間の会話だった。`,
      sections: [
        {
          title: '驚いたこと：語彙力の問題じゃない',
          content: `デビッドに、彼と平均的なプレイヤーの最大の違いは何かと尋ねた。

「もっと多くの単語を知っている」とか「もっと練習した」という答えを期待していた。

彼の答えは意外だった：`,
          quote: `「君より多くの単語を知っているわけじゃない。君が見えないパターンが見えるんだ。チェスと同じだよ - グランドマスターは初心者とは違う見方をする。同じルールを知っていてもね。」`,
        },
        {
          title: '最初の10秒のトリック',
          content: `彼が教えてくれたことは、本当に驚きだった。

デビッドがゲームを始めるとき、単語を探さない。全く探さない。最初の10秒間、彼はボードをスキャンして以下を探す：
- レアな文字（Q、Z、X）
- よくある文字のペア（TH、ING、ER）
- 「肥沃な」スポット（長いパスにつながる文字）

「サッカーチームのスカウトがすぐにボールを追いかけないのと同じだ。まずギャップがどこにあるかを理解する。」`,
        },
        {
          title: '「天性の才能」についての真実',
          content: `デビッドに言った：「でも確実に単語の天性の才能があるんでしょう？」

彼は笑った。`,
          quote: `「高校の英語の成績は平均以下だった。本当に。母国語でもね。先生は『単語の人じゃない』って言ってた。そして今ここにいる。」`,
        },
        {
          title: 'みんながする間違い（私も含めて）',
          content: `デビッドに自分のスコアを見せたら、すぐに言った：

「時間の60%を10点の3文字の単語に無駄にしている。そこに80点の7文字の単語があるのに。」

彼の言う通り。簡単な単語を探すのは気持ちいいから。でもそれじゃゲームには勝てない。

「一日中お菓子を食べて、まともな食事をしないのと同じだ。その瞬間は気持ちいいけど、まだお腹は空いている。」`,
        },
        {
          title: '彼が毎ゲーム後にすること',
          content: `だから聞いた：「実際の練習はどんな感じですか？」

シンプルな答え：

毎ゲーム後、デビッドはノート（そう、物理的なノート、アプリじゃない）を開いて書く：
1. 見逃した3つの単語
2. なぜ見逃したか
3. 認識できなかったパターン

「2分かかる。でも2週間後には、見逃しているものにパターンが見える。そうすれば何を練習すべきかが正確にわかる。」`,
        },
        {
          title: '彼がしないこと（これには驚いた）',
          content: `デビッドは毎日何時間も何時間もプレイすると思っていた。

彼は1日15-20分プレイする。それだけ。

「分析なしで練習すれば、同じ間違いを強化するだけだ。僕は『ただプレイする』2時間より、分析付きの集中した15分を好む。」

その時、自分のアプローチが完全に間違っていたことに気づいた。`,
        },
        {
          title: '始め方（私のような人なら）',
          content: `彼に聞いた：「じゃあ、最初のステップは何ですか？」

デビッドは少し考えた：「明日、ゲームを始める前に、10秒間ボードをスキャンして。単語を探さないで。ただ識別して：
- レアな文字がどこにあるか
- どのエリアが'密集'しているか
- 良い文字のペアがどこにあるか

それだけ。ただ10秒。これを1週間やって。」

（やってみた。その週にスコアが40点上がった。）`,
        },
      ],
      conclusion: `デビッドとのこの会話の後、重要なことに気づいた：良いプレイヤーと優れたプレイヤーの差は遺伝子や「天性の才能」にあるのではない。アプローチにある。

デビッドは私と違わない。彼はただ：
- 探す前にスキャンする
- 毎ゲーム後に分析する
- 個々の単語ではなくパターンに焦点を当てる
- より少なくても賢く練習する

これは誰でもトップ10に到達できるという意味か？いいえ。でも誰でも大幅に改善できる？絶対に。

（ちなみに、デビッドは今ランキング2位。私はまだトップ100に入っていない。でもその会話以来、スコアは130点上がった。）`,
    },
    es: {
      title: 'Entrevisté a un Jugador de Élite. Me Contó Cosas Que No Escucharás en Ninguna Guía',
      subtitle: 'Cómo conseguí una entrevista con el jugador clasificado #3 del país (y realmente aceptó hablar)',
      intro: `Seamos honestos: la mayoría de las "guías para jugadores avanzados" están escritas por personas que nunca han jugado a nivel competitivo.

Así que cuando vi que DavidK1987 (nombre real: David Cohen, 35 años, de Tel Aviv) estaba clasificado #3 en el país durante 8 meses seguidos, le envié un mensaje: "¿Tienes media hora para un café? Quiero saber cómo llegaste ahí."

Su respuesta: "Solo si estás listo para escuchar cosas de las que la gente no habla realmente."

¿El resultado? Una conversación de dos horas que cambió completamente cómo veo el juego.`,
      sections: [
        {
          title: 'Lo Que Me Sorprendió: No Se Trata del Vocabulario',
          content: `Le pregunté a David cuál es la mayor diferencia entre él y un jugador promedio.

Esperaba escuchar: "Conozco más palabras." O "Practiqué más."

Su respuesta me sorprendió:`,
          quote: `"No conozco más palabras que tú. Veo patrones que tú no ves. Es como el ajedrez - un gran maestro no ve el tablero como un principiante, aunque ambos conozcan las mismas reglas."`,
        },
        {
          title: 'El Truco de los Primeros 10 Segundos',
          content: `Compartió algo conmigo que simplemente me voló la cabeza.

Cuando David comienza un juego, no busca palabras. Para nada. Durante los primeros 10 segundos escanea el tablero buscando:
- Letras raras (Q, Z, X)
- Pares de letras comunes (TH, ING, ER)
- Puntos "fértiles" (letras que conducen a caminos largos)

"Es como un scout en un equipo de fútbol que no persigue inmediatamente la pelota. Primero entiende dónde están los espacios."`,
        },
        {
          title: 'La Verdad Sobre el "Talento Natural"',
          content: `Le dije a David: "Pero seguro que tienes un talento natural para las palabras, ¿verdad?"

Se rió.`,
          quote: `"Estaba por debajo del promedio en inglés en la secundaria. De verdad. Y en mi idioma nativo también. Mi profesor me dijo que no era una 'persona de palabras'. Y aquí estoy."`,
        },
        {
          title: 'El Error Que Todos Cometen (Incluyéndome)',
          content: `Cuando le mostré mis puntuaciones a David, inmediatamente dijo:

"Estás desperdiciando el 60% de tu tiempo en palabras de 3 letras que valen 10 puntos. Mientras que hay una palabra de 7 letras ahí arriba que vale 80."

Tiene razón. Busco palabras fáciles porque se siente bien. Pero eso no gana juegos.

"Es como comer bocadillos todo el día en lugar de una comida completa. Se siente bien en el momento, pero todavía tienes hambre."`,
        },
        {
          title: 'Lo Que Hace Después de Cada Juego',
          content: `Así que pregunté: "¿Cómo es realmente tu práctica?"

Respuesta simple:

Después de cada juego, David abre un cuaderno (sí, un cuaderno físico, no una aplicación) y escribe:
1. 3 palabras que perdió
2. Por qué las perdió
3. Qué patrón no reconoció

"Me toma 2 minutos. Pero después de dos semanas, veo patrones en lo que estoy perdiendo. Entonces sé exactamente qué practicar."`,
        },
        {
          title: 'Lo Que No Hace (Esto Me Sorprendió)',
          content: `Esperaba que David jugara horas y horas todos los días.

Juega 15-20 minutos al día. Eso es todo.

"Si practicas sin análisis, solo estás reforzando los mismos errores. Prefiero 15 minutos enfocados con análisis sobre dos horas de 'solo jugar'."

Fue entonces cuando me di cuenta de que todo mi enfoque estaba mal.`,
        },
        {
          title: 'Cómo Empezar (Si Eres Como Yo)',
          content: `Le pregunté: "Bueno, ¿cuál es mi primer paso?"

David pensó por un momento: "Mañana, antes de comenzar un juego, pasa 10 segundos escaneando el tablero. No busques palabras. Solo identifica:
- Dónde están las letras raras
- Qué áreas se ven 'densas'
- Dónde hay buenos pares de letras

Eso es todo. Solo 10 segundos. Haz esto durante una semana."

(Lo hice. Mi puntuación subió 40 puntos esa semana.)`,
        },
      ],
      conclusion: `Después de esta conversación con David, me di cuenta de algo importante: la brecha entre buenos jugadores y jugadores excelentes no está en los genes o el "talento natural". Está en el enfoque.

David no es diferente de mí. Él solo:
- Escanea antes de buscar
- Analiza después de cada juego
- Se enfoca en patrones, no en palabras individuales
- Practica menos pero más inteligentemente

¿Significa esto que todos pueden llegar al top 10? No. ¿Pero pueden todos mejorar significativamente? Absolutamente.

(Por cierto, David ahora está clasificado #2. Todavía no estoy en el top 100. Pero mi puntuación ha subido 130 puntos desde esa conversación.)`,
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
              'bg-neo-pink text-neo-black'
            )}>
              {t('blog.interview')}
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
              src="/images/blog/top-player-secrets.jpg"
              alt="Interview with top word game player revealing competitive secrets"
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
                <p className={cn('mb-4 whitespace-pre-line', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  {section.content}
                </p>
                {section.quote && (
                  <div className={cn(
                    'p-6 rounded-neo border-3 border-neo-black relative',
                    isDarkMode ? 'bg-slate-700' : 'bg-neo-yellow/20 shadow-hard'
                  )}>
                    <Quote className={cn('w-8 h-8 mb-4', isDarkMode ? 'text-neo-yellow' : 'text-neo-orange')} />
                    <p className={cn('text-lg font-medium italic mb-0', isDarkMode ? 'text-gray-200' : 'text-gray-800')}>
                      {section.quote}
                    </p>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Conclusion */}
          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-cyan/20 shadow-hard'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {language === 'he' ? 'מה למדתי' : language === 'ja' ? '学んだこと' : language === 'sv' ? 'Vad Jag Lärde Mig' : language === 'es' ? 'Lo Que Aprendí' : 'What I Learned'}
            </h2>
            <p className={cn('mb-0 whitespace-pre-line', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.conclusion}
            </p>
          </div>

          {/* CTA */}
          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4 mt-6">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {t('blog.tryDaily')}
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-orange text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
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
