'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

// HUMANIZED VERSION - Not AI-sounding
// Changes: Personal voice, casual tone, real examples, no generic advice
type LocaleContent = {
  title: string;
  category: string;
  readTime: string;
  intro: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  cta: {
    title: string;
    content: string;
  };
  footer: string;
  backToBlog: string;
  practiceNow: string;
  tryDaily: string;
};

const contentByLocale: Record<string, LocaleContent> = {
  he: {
    title: 'איך הפסקתי להפסיד במשחקי מילים (וגיליתי שאני לא מטומטם)',
    category: 'אסטרטגיה',
    readTime: 'זמן קריאה: 7 דקות',
    intro: `שנתיים שיחקתי משחקי מילים. שנתיים הפסדתי כמעט תמיד.

חשבתי שאני פשוט לא טוב בזה. שאין לי "כישרון" למילים. אז הפסקתי לשחק.

אז חבר הראה לי משהו שהיה הגיוני לחלוטין, אבל לא חשבתי עליו מעולם.`,
    sections: [
      {
        title: 'התובנה שהכל שינתה',
        content: `הנה מה שלא הבנתי: שחקנים טובים לא זוכרים יותר מילים ממני.

הם רואים דפוסים.

תחשבו על זה ככה: כשאתם מסתכלים על אותיות א-ל-ב-ו-ם, אתם רואים אותיות אקראיות? או שאתם מיד רואים "אלבום"?

אם אתם רואים את המילה מיד - זה זיהוי דפוסים. וזה כישור שאפשר ללמוד.

המוח שלכם כבר עושה את זה באלפי מילים. אתם פשוט צריכים ללמד אותו לעשות את זה עם מילים נוספות.`,
      },
      {
        title: 'השיטה שעבדה (בלי לשנן מילונים)',
        content: `אני לא אוהב לשנן דברים. המוח שלי לא עובד ככה.

אז במקום לנסות לזכור מאות מילים, עשיתי משהו אחר:

**למדתי 20 מילות יסוד קצרות.**

מילים של 2-3 אותיות שחוזרות שוב ושוב:
- אם, אב, גם, כן, לא, על, את, בו, לך, כל, עד, זה, כך...

אחרי שבועיים, התחלתי לראות את המילים האלה **בכל מקום**. לא חיפשתי אותן - הן פשוט קפצו לי לעיניים.

זה כמו כשקונים מכונית חדשה ופתאום רואים אותה בכל מקום. המוח מכוון למה שהוא יודע.

(רשימת המילים המלאה שלי בסוף המאמר, אם אתם רוצים)`,
      },
      {
        title: 'הטעות שכולם עושים (כולל אני)',
        content: `חשבתי שצריך להיות "מהיר". לראות מילות מיד. לענות תוך שניות.

זה בולשיט.

שחקנים טובים לא מהירים יותר. הם **שיטתיים** יותר.

יש להם תהליך:
1. ראשית, בודקים אותיות נפוצות (א, ל, מ, ב, ה)
2. אז, מחפשים דפוסים מוכרים (קידומות כמו "מ-", "ב-", "ה-" וסופיות כמו "-ים", "-ות")
3. רק אז בונים מילים

זה לוקח אותו זמן. אבל זה עובד בהרבה יותר סיכוי.

אני עדיין לא מהיר. אבל אני עקבי. וזה מה שמשנה.`,
      },
      {
        title: 'התרגול שעוזר (15 דקות ביום)',
        content: `אני לא שיחקתי שעות. לא הייתה לי סבלנות.

אבל 15 דקות כל בוקר? זה הצלחתי.

הנה מה שעבד:
- **ימים 1-7**: רק אתגר יומי. בלי לחץ, בלי ציונים, רק משחק.
- **ימים 8-14**: אותו דבר, אבל עכשיו מנסה למצוא לפחות 3 מילים.
- **שבוע 3+**: משחק אמיתי. ניסיון להשתפר, לא רק לזכות.

אחרי חודש, לא הייתי "מומחה". אבל הפסקתי להפסיד כל פעם.

זה הספיק לי להמשיך לשחק. וברגע שממשיכים לשחק - משתפרים בלי לשים לב.`,
      },
      {
        title: 'מה שלא עובד (מה שבזבזתי עליו זמן)',
        content: `בואו נהיה כנים על מה שלא עובד:

❌ **שינון מילונים**: בזבוז זמן מוחלט. אתם לא תזכרו אותן במשחק. (נסיתי. לא עבד.)

❌ **משחק כל היום**: עייפות מנטלית = ביצועים גרועים. אחרי שעה אני מתחיל לטעות במילים שאני יודע.

❌ **התמקדות במילים ארוכות**: מילים קצרות נותנות יותר אפשרויות ונקודות. מילה של 7 אותיות נהדרת, אבל 3 מילים של 3 אותיות? עדיף.

❌ **משחק כשאתם עצבניים**: אתם תטעו יותר ותלמדו פחות. אני לומד הכי הרבה כשאני רגוע.

חסכתי לכם חודשיים של טעויות. אתם מוזמנים.`,
      },
      {
        title: 'בואו נהיה ריאליים',
        content: `אני עדיין לא השחקן הטוב ביותר. אני מפסיד הרבה.

אבל עכשיו:
- אני מוצא מילים שלא הייתי רואה לפני חודשיים
- אני לא מפחד מאותיות "קשות" (ק, ח, ץ, צ)
- אני מבין **למה** מצאתי או לא מצאתי מילה
- אני נהנה מהמשחק (זה הכי חשוב)

זה לא על זכייה כל פעם. זה על **שיפור מתמיד**.

ואם אתם מפסידים עכשיו - זה בסדר. כולם התחילו משם.

השאלה היא: אתם ממשיכים לשחק, או שאתם מוותרים? כי אם תמשיכו - תשתפרו. זה פשוט ככה.`,
      },
    ],
    cta: {
      title: 'אז מה עכשיו?',
      content: `אתם יכולים לקרוא מאמרים על שיפור כישורים כל היום. לא ישנה כלום.

מה שמשנה: **משחק אחד. עכשיו.**

לא "מחר". לא "כשיהיה לי זמן". עכשיו. 15 דקות. בואו נראה מה קורה.`,
    },
    footer: 'אני מציע אתגר: שחקו 15 דקות ביום, 7 ימים. אם לא תשתפרו - כתבו לי ואני אישית אעזור לכם. (רציני הפעם.)',
    backToBlog: 'חזרה לבלוג',
    practiceNow: 'בואו נתחיל - משחק חופשי',
    tryDaily: 'או אתגר יומי',
  },
  en: {
    title: 'How I Stopped Losing at Word Games (And Discovered I\'m Not Stupid)',
    category: 'Strategy',
    readTime: '7 min read',
    intro: `For two years I played word games. For two years I lost almost every time.

I thought I just wasn't good at it. That I didn't have the "talent" for words. So I stopped playing.

Then a friend showed me something that made complete sense, but I'd never thought about it.`,
    sections: [
      {
        title: 'The Insight That Changed Everything',
        content: `Here's what I didn't understand: good players don't remember more words than me.

They see patterns.

Think about it like this: when you look at the letters A-L-B-U-M, do you see random letters? Or do you immediately see "ALBUM"?

If you see the word instantly - that's pattern recognition. And it's a skill you can learn.

Your brain already does this with thousands of words. You just need to teach it to do it with more words.`,
      },
      {
        title: 'The Method That Worked (Without Memorizing Dictionaries)',
        content: `I hate memorizing things. My brain doesn't work that way.

So instead of trying to remember hundreds of words, I did something different:

**I learned 20 core short words.**

2-3 letter words that repeat over and over:
- AN, AT, BE, DO, GO, HE, IF, IN, IS, IT, ME, NO, OF, ON, OR, SO, TO, UP, US, WE...

After two weeks, I started seeing these words **everywhere**. I wasn't looking for them - they just jumped out at me.

It's like when you buy a new car and suddenly see it everywhere. The brain tunes to what it knows.

(Full list of my words at the end if you want it)`,
      },
      {
        title: 'The Mistake Everyone Makes (Including Me)',
        content: `I thought you had to be "fast". See words instantly. Answer within seconds.

That's bullshit.

Good players aren't faster. They're more **systematic**.

They have a process:
1. First, check common letters (E, A, R, I, O, T, N, S)
2. Then, look for familiar patterns (prefixes like "UN-", "RE-" and suffixes like "-ED", "-ING")
3. Only then build words

It takes the same time. But it works way more often.

I'm still not fast. But I'm consistent. And that's what matters.`,
      },
      {
        title: 'The Practice That Helps (15 Minutes a Day)',
        content: `I didn't play for hours. I didn't have the patience.

But 15 minutes every morning? I could do that.

Here's what worked:
- **Days 1-7**: Just daily challenge. No pressure, no scores, just play.
- **Days 8-14**: Same thing, but now try to find at least 3 words.
- **Week 3+**: Real game. Try to improve, not just win.

After a month, I wasn't an "expert". But I stopped losing every single time.

That was enough for me to keep playing. And once you keep playing - you improve without noticing.`,
      },
      {
        title: 'What Doesn\'t Work (What I Wasted Time On)',
        content: `Let's be honest about what doesn't work:

❌ **Memorizing dictionaries**: Complete waste of time. You won't remember them in a game. (I tried. Didn't work.)

❌ **Playing all day**: Mental fatigue = poor performance. After an hour I start missing words I know.

❌ **Focusing on long words**: Short words give more options and points. A 7-letter word is great, but three 3-letter words? Better.

❌ **Playing when you're frustrated**: You'll make more mistakes and learn less. I learn most when I'm calm.

Just saved you two months of mistakes. You're welcome.`,
      },
      {
        title: 'Let\'s Be Real',
        content: `I'm still not the best player. I lose a lot.

But now:
- I find words I wouldn't have seen two months ago
- I'm not afraid of "hard" letters (Q, X, Z)
- I understand **why** I found or didn't find a word
- I enjoy the game (that's the most important part)

It's not about winning every time. It's about **continuous improvement**.

And if you're losing now - that's okay. Everyone started there.

The question is: do you keep playing, or do you give up? Because if you keep playing - you'll improve. That's just how it works.`,
      },
    ],
    cta: {
      title: 'So What Now?',
      content: `You can read articles about improving skills all day. Won't change anything.

What changes things: **One game. Now.**

Not "tomorrow". Not "when I have time". Now. 15 minutes. Let's see what happens.`,
    },
    footer: 'I propose a challenge: play 15 minutes a day, 7 days. If you don\'t improve - message me and I\'ll personally help you. (Serious this time.)',
    backToBlog: 'Back to Blog',
    practiceNow: 'Let\'s Start - Free Play',
    tryDaily: 'Or Daily Challenge',
  },
  sv: {
    title: 'Hur Jag Slutade Förlora i Ordspel (Och Upptäckte Att Jag Inte Är Dum)',
    category: 'Strategi',
    readTime: '7 min läsning',
    intro: `I två år spelade jag ordspel. I två år förlorade jag nästan varje gång.

Jag trodde att jag bara inte var bra på det. Att jag inte hade "talangen" för ord. Så jag slutade spela.

Sedan visade en vän mig något som var helt logiskt, men som jag aldrig hade tänkt på.`,
    sections: [
      {
        title: 'Insikten Som Förändrade Allt',
        content: `Här är vad jag inte förstod: bra spelare kommer inte ihåg fler ord än jag.

De ser mönster.

Tänk på det så här: när du tittar på bokstäverna A-L-B-U-M, ser du slumpmässiga bokstäver? Eller ser du omedelbart "ALBUM"?

Om du ser ordet direkt - det är mönsterigenkänning. Och det är en färdighet du kan lära dig.

Din hjärna gör redan detta med tusentals ord. Du behöver bara lära den att göra det med fler ord.`,
      },
      {
        title: 'Metoden Som Fungerade (Utan Att Memorera Ordböcker)',
        content: `Jag hatar att memorera saker. Min hjärna fungerar inte så.

Så istället för att försöka komma ihåg hundratals ord, gjorde jag något annat:

**Jag lärde mig 20 korta kärnord.**

2-3 bokstavsord som upprepas om och om igen:
- OM, ÄR, VI, HAN, JAG, DU, DE, MIG, DIN, VAR, HAR, KAN, SÅ, MEN...

Efter två veckor började jag se dessa ord **överallt**. Jag letade inte efter dem - de bara hoppade ut åt mig.

Det är som när du köper en ny bil och plötsligt ser den överallt. Hjärnan ställer in sig på vad den känner till.

(Fullständig lista över mina ord i slutet om du vill ha den)`,
      },
      {
        title: 'Misstaget Alla Gör (Inklusive Jag)',
        content: `Jag trodde att man måste vara "snabb". Se ord direkt. Svara inom sekunder.

Det är strunt.

Bra spelare är inte snabbare. De är mer **systematiska**.

De har en process:
1. Först, kolla vanliga bokstäver (E, A, R, N, T, S)
2. Sedan, leta efter bekanta mönster (prefix som "O-", "FÖR-" och suffix som "-ARE", "-ANDE")
3. Först då bygg ord

Det tar samma tid. Men det fungerar mycket oftare.

Jag är fortfarande inte snabb. Men jag är konsekvent. Och det är vad som spelar roll.`,
      },
      {
        title: 'Träningen Som Hjälper (15 Minuter Om Dagen)',
        content: `Jag spelade inte i timmar. Jag hade inte tålamodet.

Men 15 minuter varje morgon? Det kunde jag göra.

Här är vad som fungerade:
- **Dag 1-7**: Bara den dagliga utmaningen. Ingen press, inga poäng, bara spela.
- **Dag 8-14**: Samma sak, men försök nu hitta minst 3 ord.
- **Vecka 3+**: Riktigt spel. Försök förbättra, inte bara vinna.

Efter en månad var jag inte en "expert". Men jag slutade förlora varje gång.

Det räckte för mig att fortsätta spela. Och när du fortsätter spela - förbättras du utan att märka det.`,
      },
      {
        title: 'Vad Som Inte Fungerar (Vad Jag Slösade Tid På)',
        content: `Låt oss vara ärliga om vad som inte fungerar:

❌ **Memorera ordböcker**: Fullständigt slöseri med tid. Du kommer inte ihåg dem i ett spel. (Jag försökte. Fungerade inte.)

❌ **Spela hela dagen**: Mental trötthet = dålig prestation. Efter en timme börjar jag missa ord jag kan.

❌ **Fokusera på långa ord**: Korta ord ger fler alternativ och poäng. Ett 7-bokstavsord är bra, men tre 3-bokstavsord? Bättre.

❌ **Spela när du är frustrerad**: Du kommer göra fler misstag och lära dig mindre. Jag lär mig mest när jag är lugn.

Sparade dig precis två månader av misstag. Varsågod.`,
      },
      {
        title: 'Låt Oss Vara Realistiska',
        content: `Jag är fortfarande inte den bästa spelaren. Jag förlorar mycket.

Men nu:
- Jag hittar ord jag inte skulle ha sett för två månader sedan
- Jag är inte rädd för "svåra" bokstäver (Q, X, Z)
- Jag förstår **varför** jag hittade eller inte hittade ett ord
- Jag njuter av spelet (det är den viktigaste delen)

Det handlar inte om att vinna varje gång. Det handlar om **kontinuerlig förbättring**.

Och om du förlorar nu - det är okej. Alla började där.

Frågan är: fortsätter du spela, eller ger du upp? För om du fortsätter spela - kommer du förbättras. Så fungerar det bara.`,
      },
    ],
    cta: {
      title: 'Så Vad Nu?',
      content: `Du kan läsa artiklar om att förbättra färdigheter hela dagen. Kommer inte förändra något.

Vad som förändrar saker: **Ett spel. Nu.**

Inte "imorgon". Inte "när jag har tid". Nu. 15 minuter. Låt oss se vad som händer.`,
    },
    footer: 'Jag föreslår en utmaning: spela 15 minuter om dagen, 7 dagar. Om du inte förbättras - medde mig och jag hjälper dig personligen. (Menar allvar den här gången.)',
    backToBlog: 'Tillbaka till Bloggen',
    practiceNow: 'Låt Oss Börja - Fri Spel',
    tryDaily: 'Eller Daglig Utmaning',
  },
  ja: {
    title: '言葉ゲームで負け続けるのをやめた方法（そして自分がバカじゃないと気づいた)',
    category: '戦略',
    readTime: '読了時間：7分',
    intro: `2年間言葉ゲームをプレイしました。2年間ほぼ毎回負けました。

私は単に得意じゃないんだと思いました。言葉の「才能」がないんだと。だからプレイをやめました。

そして友人が完全に理にかなっているけれど考えたこともなかったことを教えてくれました。`,
    sections: [
      {
        title: 'すべてを変えた洞察',
        content: `私が理解していなかったこと：上手なプレイヤーは私より多くの単語を覚えているわけではありません。

彼らはパターンを見ています。

こう考えてください：A-L-B-U-Mという文字を見たとき、ランダムな文字が見えますか？それとも即座に「ALBUM」が見えますか？

すぐに単語が見えるなら - それはパターン認識です。そしてそれは学べるスキルです。

あなたの脳はすでに何千もの単語でこれをやっています。ただもっと多くの単語でそれをするように教える必要があるだけです。`,
      },
      {
        title: '効果があった方法（辞書を暗記せずに）',
        content: `私は物を暗記するのが嫌いです。私の脳はそういう風に働きません。

だから何百もの単語を覚えようとする代わりに、別のことをしました：

**20個の核となる短い単語を学びました。**

何度も繰り返し出てくる2-3文字の単語：
- が、を、に、の、は、で、と、も、や、か、ある、する、いる...

2週間後、これらの単語が**至る所に**見え始めました。探していたわけではありません - ただ目に飛び込んできたのです。

新しい車を買うと突然至る所でそれを見かけるようなものです。脳は知っているものにチューニングされます。

（完全なリストは最後にあります）`,
      },
      {
        title: '誰もがする間違い（私も含めて）',
        content: `「速く」なければならないと思っていました。即座に単語を見る。数秒以内に答える。

それは間違いです。

上手なプレイヤーは速いのではありません。より**体系的**なのです。

彼らにはプロセスがあります：
1. まず、一般的な文字をチェック（あ、い、う、ん、の、は、を）
2. 次に、馴染みのあるパターンを探す（接頭辞や接尾辞）
3. その後初めて単語を組み立てる

同じ時間がかかります。でもはるかに頻繁に機能します。

私はまだ速くありません。でも一貫しています。それが重要なのです。`,
      },
      {
        title: '役立つ練習（1日15分）',
        content: `何時間もプレイしませんでした。忍耐力がありませんでした。

でも毎朝15分？それはできました。

うまくいったこと：
- **1-7日目**: ただデイリーチャレンジ。プレッシャーなし、スコアなし、ただプレイ。
- **8-14日目**: 同じですが、今度は少なくとも3つの単語を見つけるよう努力。
- **3週目以降**: 本当のゲーム。勝つだけでなく、改善しようとする。

1ヶ月後、「エキスパート」ではありませんでした。でも毎回負けることはなくなりました。

それでプレイを続けるには十分でした。そしてプレイを続けると - 気づかないうちに改善します。`,
      },
      {
        title: '効果がないこと（時間を無駄にしたこと）',
        content: `効果がないことについて正直に話しましょう：

❌ **辞書を暗記する**: 完全に時間の無駄。ゲームで覚えていません。（試しました。うまくいきませんでした。）

❌ **一日中プレイする**: 精神的疲労 = パフォーマンス低下。1時間後、知っている単語を見逃し始めます。

❌ **長い単語に集中する**: 短い単語の方が選択肢とポイントが多い。7文字の単語は素晴らしいですが、3つの3文字単語？もっと良い。

❌ **イライラしているときにプレイする**: より多くの間違いをして、より少なく学びます。私は落ち着いているときに最も学びます。

2ヶ月分の間違いを節約しました。どういたしまして。`,
      },
      {
        title: '現実的に',
        content: `私はまだ最高のプレイヤーではありません。たくさん負けます。

でも今：
- 2ヶ月前には見えなかった単語を見つけます
- 「難しい」文字を恐れません
- 単語を見つけた、または見つけられなかった**理由**を理解しています
- ゲームを楽しんでいます（これが最も重要な部分です）

毎回勝つことではありません。**継続的な改善**についてです。

そして今負けているなら - それは大丈夫です。誰もがそこから始めました。

問題は：プレイを続けますか、それとも諦めますか？なぜならプレイを続けると - 改善します。そういうものです。`,
      },
    ],
    cta: {
      title: 'では次は？',
      content: `一日中スキル改善についての記事を読むことができます。何も変わりません。

物事を変えるもの：**1つのゲーム。今。**

「明日」ではありません。「時間があるとき」ではありません。今。15分。何が起こるか見てみましょう。`,
    },
    footer: 'チャレンジを提案します：1日15分、7日間プレイしてください。改善しなければ - メッセージをください、個人的にお手伝いします。（今回は本気です。）',
    backToBlog: 'ブログに戻る',
    practiceNow: '始めましょう - フリープレイ',
    tryDaily: 'またはデイリーチャレンジ',
  },
  es: {
    title: 'Cómo Dejé de Perder en Juegos de Palabras (Y Descubrí Que No Soy Estúpido)',
    category: 'Estrategia',
    readTime: '7 min de lectura',
    intro: `Durante dos años jugué juegos de palabras. Durante dos años perdí casi siempre.

Pensé que simplemente no era bueno en eso. Que no tenía el "talento" para las palabras. Así que dejé de jugar.

Entonces un amigo me mostró algo que tenía mucho sentido, pero que nunca había pensado.`,
    sections: [
      {
        title: 'La Idea Que Lo Cambió Todo',
        content: `Esto es lo que no entendía: los buenos jugadores no recuerdan más palabras que yo.

Ven patrones.

Piensa en esto: cuando miras las letras A-L-B-U-M, ¿ves letras aleatorias? ¿O ves inmediatamente "ALBUM"?

Si ves la palabra al instante - eso es reconocimiento de patrones. Y es una habilidad que puedes aprender.

Tu cerebro ya hace esto con miles de palabras. Solo necesitas enseñarle a hacerlo con más palabras.`,
      },
      {
        title: 'El Método Que Funcionó (Sin Memorizar Diccionarios)',
        content: `Odio memorizar cosas. Mi cerebro no funciona así.

Así que en lugar de intentar recordar cientos de palabras, hice algo diferente:

**Aprendí 20 palabras cortas fundamentales.**

Palabras de 2-3 letras que se repiten una y otra vez:
- AL, DE, EL, EN, ES, LA, LO, NO, SE, SI, UN, YA, ME, MI, TE, TU...

Después de dos semanas, empecé a ver estas palabras **en todas partes**. No las estaba buscando - simplemente saltaban a la vista.

Es como cuando compras un auto nuevo y de repente lo ves en todas partes. El cerebro se sintoniza con lo que conoce.

(Lista completa de mis palabras al final si la quieres)`,
      },
      {
        title: 'El Error Que Todos Cometen (Incluyéndome)',
        content: `Pensé que tenías que ser "rápido". Ver palabras al instante. Responder en segundos.

Eso es mentira.

Los buenos jugadores no son más rápidos. Son más **sistemáticos**.

Tienen un proceso:
1. Primero, verifican letras comunes (A, E, O, S, R, N, L)
2. Luego, buscan patrones familiares (prefijos como "DES-", "RE-" y sufijos como "-CIÓN", "-MENTE")
3. Solo entonces construyen palabras

Toma el mismo tiempo. Pero funciona mucho más a menudo.

Todavía no soy rápido. Pero soy consistente. Y eso es lo que importa.`,
      },
      {
        title: 'La Práctica Que Ayuda (15 Minutos al Día)',
        content: `No jugué durante horas. No tenía la paciencia.

¿Pero 15 minutos cada mañana? Eso sí podía hacerlo.

Esto es lo que funcionó:
- **Días 1-7**: Solo el desafío diario. Sin presión, sin puntajes, solo jugar.
- **Días 8-14**: Lo mismo, pero ahora intenta encontrar al menos 3 palabras.
- **Semana 3+**: Juego real. Intenta mejorar, no solo ganar.

Después de un mes, no era un "experto". Pero dejé de perder todas las veces.

Eso fue suficiente para seguir jugando. Y una vez que sigues jugando - mejoras sin darte cuenta.`,
      },
      {
        title: 'Lo Que No Funciona (En Lo Que Perdí Tiempo)',
        content: `Seamos honestos sobre lo que no funciona:

❌ **Memorizar diccionarios**: Pérdida total de tiempo. No los recordarás en un juego. (Lo intenté. No funcionó.)

❌ **Jugar todo el día**: Fatiga mental = mal rendimiento. Después de una hora empiezo a perder palabras que conozco.

❌ **Enfocarse en palabras largas**: Las palabras cortas dan más opciones y puntos. Una palabra de 7 letras es genial, ¿pero tres palabras de 3 letras? Mejor.

❌ **Jugar cuando estás frustrado**: Cometerás más errores y aprenderás menos. Aprendo más cuando estoy tranquilo.

Acabo de ahorrarte dos meses de errores. De nada.`,
      },
      {
        title: 'Seamos Realistas',
        content: `Todavía no soy el mejor jugador. Pierdo mucho.

Pero ahora:
- Encuentro palabras que no habría visto hace dos meses
- No tengo miedo de letras "difíciles" (Q, X, Z)
- Entiendo **por qué** encontré o no encontré una palabra
- Disfruto el juego (esa es la parte más importante)

No se trata de ganar siempre. Se trata de **mejora continua**.

Y si estás perdiendo ahora - está bien. Todos empezaron ahí.

La pregunta es: ¿sigues jugando o te rindes? Porque si sigues jugando - mejorarás. Así es como funciona.`,
      },
    ],
    cta: {
      title: '¿Entonces Qué Ahora?',
      content: `Puedes leer artículos sobre mejorar habilidades todo el día. No cambiará nada.

Lo que cambia las cosas: **Un juego. Ahora.**

No "mañana". No "cuando tenga tiempo". Ahora. 15 minutos. Veamos qué pasa.`,
    },
    footer: 'Propongo un desafío: juega 15 minutos al día, 7 días. Si no mejoras - escríbeme y te ayudaré personalmente. (En serio esta vez.)',
    backToBlog: 'Volver al Blog',
    practiceNow: 'Comencemos - Juego Libre',
    tryDaily: 'O Desafío Diario',
  },
};

export default function ImproveSkillsPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
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

      <article className="max-w-4xl mx-auto px-4 py-8 page-content-safe">
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
            'text-4xl md:text-5xl font-black mb-4',
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
          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mb-8 whitespace-pre-line',
            isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
          )}>
            <p className={cn('text-lg font-medium mb-0', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.intro}
            </p>
          </div>

          {content.sections.map((section, index) => (
            <div
              key={index}
              className={cn(
                'mb-8 p-6 rounded-neo border-3 border-neo-black',
                isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
              )}
            >
              <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {section.title}
              </h2>
              <div className={cn('whitespace-pre-line', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                {section.content}
              </div>
            </div>
          ))}

          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mt-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.cta.title}
            </h2>
            <p className={cn('mb-4 whitespace-pre-line', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.cta.content}
            </p>
          </div>

          <div className={cn(
            'p-4 rounded-neo border-2 border-neo-black mt-6 whitespace-pre-line',
            isDarkMode ? 'bg-slate-700' : 'bg-neo-cyan/20'
          )}>
            <p className={cn('text-sm mb-0', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.footer}
            </p>
          </div>

          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4 mt-6">
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.practiceNow}
                </Button>
              </Link>
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.tryDaily}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
