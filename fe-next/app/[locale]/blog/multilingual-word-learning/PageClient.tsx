'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, AlertTriangle } from 'lucide-react';
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

export default function MultilingualPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  const contentByLocale: Record<string, LocaleContent> = {
    he: {
      title: 'למדתי 3 שפות במקביל עם משחקי מילים. זה היה טעות',
      subtitle: 'איך החלטה אימפולסיבית הפכה לשיעור בהשפלה (ואז, באופן מפתיע, הצליחה)',
      intro: `ינואר 2023. אני שב בחדר בברלין, מסתכל על השפות הזמינות באפליקציה:
English. Svenska. 日本語.

"אני יכול לעשות את כל השלושה במקביל," חשבתי. "זה רק משחק מילים, כמה קשה זה יכול להיות?"

הסתבר: מאוד, מאוד קשה.

אבל אם אתם קוראים את זה, כנראה שגם אתם שוקלים לשחק במספר שפות. אז הנה מה שאף אחד לא יגיד לכם.`,
      sections: [
        {
          title: 'השבוע הראשון: תחושה של גאון',
          content: `בשבוע הראשון הרגשתי כמו פוליגלוט.

אנגלית? קל. מצאתי 40 מילים בפעם הראשונה.

שוודית? קצת יותר קשה, אבל אני מכיר כמה מילים.

יפנית? בעיקר היראגאנה, אבל מצאתי 15 מילים קצרות.

חשבתי: "זה עובד! אני לומד שלוש שפות!"

(לא הבנתי עדיין שאני בעצם לא לומד כלום.)`,
        },
        {
          title: 'השבוע השלישי: משבר הזהות',
          content: `זה קרה בערב חמישי. ישבתי מול לוח אנגלית ופתאום כל מילה נראתה לי כמו שוודית.

ראיתי "LAND" וחשבתי - זה country בשוודית או זה ground באנגלית?

אז עברתי לשוודית ומצאתי את עצמי מחפש מילים יפניות בלוח שוודי.

המוח שלי פשוט התבלבל. שלוש שפות, אותו פורמט, הכל התערבב.

"טוב," אמרתי לעצמי, "אולי שלוש שפות זה מדי."`,
        },
        {
          title: 'מה שבאמת למדתי (וזה לא מילים)',
          content: `אחרי חודש של בלבול, החלטתי לנסות משהו אחר: שבוע אחד, שפה אחת.

שבוע 1: רק אנגלית
שבוע 2: רק שוודית
שבוע 3: רק יפנית
שבוע 4: חזרה לאנגלית

ופתאום... זה התחיל לעבוד.

למה? כי במקום לנסות לזכור מילים בשלוש שפות, התמקדתי בדפוסים של כל שפה.

באנגלית: -ING, -TION, -LY
בשוודית: מילים מורכבות (barnbok = ספר ילדים)
ביפנית: צמדי אותיות נפוצים (ます, です)

כל שפה יש לה "טעם" משלה. אבל צריך זמן כדי להרגיש את זה.`,
        },
        {
          title: 'הטעות הכי גדולה שעשיתי',
          content: `הייתי חושב שזה על אוצר מילים.

"אם אני אשחק בשלוש שפות, אני אלמד פי 3 יותר מילים!"

לא.

מה שקורה זה שאתה לומד פי 3 יותר לאט. כי כל מילה בשפה חדשה דורשת מאמץ קוגניטיבי. ואם אתה מחליף כל היום בין שפות, המוח שלך פשוט מותש.

הגישה הנכונה: התמחות עם חשיפה.

רוב הזמן: שפה אחת
מדי פעם: "תיירות" בשפות אחרות`,
        },
        {
          title: 'איך זה נראה עכשיו (שנה מאוחר יותר)',
          content: `אני עדיין משחק בשלוש שפות. אבל לא בצורה המטומטמת שניסיתי בהתחלה.

שגרה שלי:
- יום ראשון-חמישי: אנגלית (השפה הכי חזקה שלי)
- שישי: שוודית (אתגר)
- שבת: יפנית (כיף)

התוצאות?
- אנגלית: עליתי 200 נקודות
- שוודית: מצאתי 17 מילים חדשות שלא ידעתי
- יפנית: למדתי 43 מילות היראגאנה (אני סופר)

האם זה "ללמוד 3 שפות במקביל"? לא באמת.

זה יותר: להשתמש במשחקי מילים כדי לחזק שפה אחת, עם נגיעות קלות בשתיים נוספות.`,
        },
        {
          title: 'האמת על למידת שפות דרך משחקים',
          content: `בואו נהיה כנים: משחק מילים לא יהפוך אתכם לשוטפים.

לא תצאו מזה מדברים שוודית. לא תקראו ספרים ביפנית.

מה כן יקרה:
- תכירו מילים נפוצות
- תזהו דפוסים
- תפתחו "תחושת שפה"
- תהנו תוך כדי

משחקי מילים הם הכניסה, לא היעד.

אבל בתור כניסה? הם לא רעים בכלל. מרגיש הרבה יותר טוב מאשר לשבת עם כרטיסיות.`,
        },
        {
          title: 'אם אתם רוצים לנסות (הייתי עושה ככה)',
          content: `אם הייתי מתחיל מחדש:

חודש 1: רק שפה אחת (הכי חזקה)
- בנו ביטחון
- למדו את מכניקת המשחק
- תבינו מה עובד

חודש 2: הוסיפו שפה שנייה (יום אחד בשבוע)
- אל תשוו ציונים
- חפשו דפוסים שונים
- תהנו מהאתגר

חודש 3+: שפה שלישית (אם באמת רוצים)
- רק אם זה כיף
- ללא לחץ
- אפשר גם לוותר

הכלל שלי עכשיו: אם זה מרגיש כמו עבודה, אתם עושים את זה לא נכון.`,
        },
      ],
      conclusion: `אז, האם כדאי ללמוד שפות דרך משחקי מילים?

תלוי מה אתם מצפים.

אם אתם רוצים:
- לדבר בשוטף ✗ לא יקרה
- לעבור בחינה ✗ לא יקרה
- להכיר מילים + ליהנות ✓ בהחלט

משחקי מילים הם לא קורס שפה. הם כלי נוסף. כלי מהנה.

אני עדיין משחק בשלוש שפות. אבל עכשיו אני יודע למה אני עושה את זה: לא כדי "להפוך לרב-לשוני", אלא כי זה כיף לראות את אותו משחק דרך עדשה של שפה אחרת.

(ואגב, אחרי שנה: האנגלית שלי השתפרה. השוודית... בערך אותו דבר. היפנית? בואו פשוט נגיד שאני עדיין מחפש מילים של 3 אותיות.)`,
    },
    en: {
      title: 'I Learned 3 Languages Simultaneously With Word Games. It Was a Mistake',
      subtitle: 'How an impulsive decision turned into a humbling lesson (and then, surprisingly, worked)',
      intro: `January 2023. I'm sitting in my room in Berlin, looking at the available languages in the app:
English. Svenska. 日本語.

"I can do all three at once," I thought. "It's just a word game, how hard can it be?"

Turns out: very, very hard.

But if you're reading this, you're probably considering playing in multiple languages too. So here's what nobody will tell you.`,
      sections: [
        {
          title: 'First Week: Feeling Like a Genius',
          content: `The first week I felt like a polyglot.

English? Easy. Found 40 words on my first try.

Swedish? A bit harder, but I know some words.

Japanese? Mostly hiragana, but I found 15 short words.

I thought: "This works! I'm learning three languages!"

(I didn't realize yet that I wasn't actually learning anything.)`,
        },
        {
          title: 'Third Week: Identity Crisis',
          content: `It happened on a Thursday evening. I was sitting in front of an English board and suddenly every word looked Swedish to me.

I saw "LAND" and thought - is that country in Swedish or ground in English?

Then I switched to Swedish and found myself looking for Japanese words on a Swedish board.

My brain just got confused. Three languages, same format, everything mixed up.

"Okay," I told myself, "maybe three languages is too much."`,
        },
        {
          title: 'What I Actually Learned (And It\'s Not Words)',
          content: `After a month of confusion, I decided to try something different: one week, one language.

Week 1: English only
Week 2: Swedish only
Week 3: Japanese only
Week 4: Back to English

And suddenly... it started working.

Why? Because instead of trying to remember words in three languages, I focused on the patterns of each language.

In English: -ING, -TION, -LY
In Swedish: compound words (barnbok = children's book)
In Japanese: common letter pairs (ます, です)

Each language has its own "flavor". But you need time to feel it.`,
        },
        {
          title: 'The Biggest Mistake I Made',
          content: `I thought it was about vocabulary.

"If I play in three languages, I'll learn 3x more words!"

No.

What happens is you learn 3x slower. Because every word in a new language requires cognitive effort. And if you're switching all day between languages, your brain is just exhausted.

The right approach: Specialization with exposure.

Most of the time: One language
Occasionally: "Tourism" in other languages`,
        },
        {
          title: 'What It Looks Like Now (A Year Later)',
          content: `I still play in three languages. But not in the stupid way I tried at the beginning.

My routine:
- Sunday-Thursday: English (my strongest language)
- Friday: Swedish (challenge)
- Saturday: Japanese (fun)

The results?
- English: Went up 200 points
- Swedish: Found 17 new words I didn't know
- Japanese: Learned 43 hiragana words (I'm counting)

Is this "learning 3 languages simultaneously"? Not really.

It's more: Using word games to strengthen one language, with light touches of two others.`,
        },
        {
          title: 'The Truth About Language Learning Through Games',
          content: `Let's be honest: word games won't make you fluent.

You won't come out speaking Swedish. You won't read books in Japanese.

What will happen:
- You'll know common words
- You'll recognize patterns
- You'll develop "language sense"
- You'll have fun while doing it

Word games are the entrance, not the destination.

But as an entrance? They're not bad at all. Feels a lot better than sitting with flashcards.`,
        },
        {
          title: 'If You Want to Try (Here\'s What I\'d Do)',
          content: `If I was starting over:

Month 1: One language only (strongest)
- Build confidence
- Learn game mechanics
- Understand what works

Month 2: Add second language (one day a week)
- Don't compare scores
- Look for different patterns
- Enjoy the challenge

Month 3+: Third language (if you really want)
- Only if it's fun
- No pressure
- It's okay to skip

My rule now: If it feels like work, you're doing it wrong.`,
        },
      ],
      conclusion: `So, should you learn languages through word games?

Depends what you expect.

If you want to:
- Speak fluently ✗ Won't happen
- Pass an exam ✗ Won't happen
- Know words + have fun ✓ Absolutely

Word games aren't a language course. They're an additional tool. A fun tool.

I still play in three languages. But now I know why I'm doing it: not to "become multilingual", but because it's fun to see the same game through the lens of a different language.

(By the way, after a year: My English improved. Swedish... about the same. Japanese? Let's just say I'm still looking for 3-letter words.)`,
    },
    sv: {
      title: 'Jag Lärde Mig 3 Språk Samtidigt Med Ordspel. Det Var Ett Misstag',
      subtitle: 'Hur ett impulsivt beslut blev en ödmjukande läxa (och sedan, överraskande nog, fungerade)',
      intro: `Januari 2023. Jag sitter i mitt rum i Berlin och tittar på de tillgängliga språken i appen:
English. Svenska. 日本語.

"Jag kan göra alla tre samtidigt," tänkte jag. "Det är bara ett ordspel, hur svårt kan det vara?"

Visade sig: mycket, mycket svårt.

Men om du läser detta överväger du förmodligen att spela på flera språk också. Så här är vad ingen kommer att berätta för dig.`,
      sections: [
        {
          title: 'Första Veckan: Känna Sig Som Ett Geni',
          content: `Första veckan kände jag mig som en polyglott.

Engelska? Lätt. Hittade 40 ord på första försöket.

Svenska? Lite svårare, men jag kan några ord.

Japanska? Mestadels hiragana, men jag hittade 15 korta ord.

Jag tänkte: "Det här fungerar! Jag lär mig tre språk!"

(Jag insåg inte än att jag faktiskt inte lärde mig någonting.)`,
        },
        {
          title: 'Tredje Veckan: Identitetskris',
          content: `Det hände en torsdagskväll. Jag satt framför en engelsk bräda och plötsligt såg varje ord svenskt ut för mig.

Jag såg "LAND" och tänkte - är det country på svenska eller ground på engelska?

Sedan bytte jag till svenska och hittade mig själv leta efter japanska ord på en svensk bräda.

Min hjärna blev bara förvirrad. Tre språk, samma format, allt blandades.

"Okej," sa jag till mig själv, "kanske tre språk är för mycket."`,
        },
        {
          title: 'Vad Jag Faktiskt Lärde Mig (Och Det Är Inte Ord)',
          content: `Efter en månad av förvirring bestämde jag mig för att prova något annat: en vecka, ett språk.

Vecka 1: Bara engelska
Vecka 2: Bara svenska
Vecka 3: Bara japanska
Vecka 4: Tillbaka till engelska

Och plötsligt... började det fungera.

Varför? För att istället för att försöka komma ihåg ord på tre språk fokuserade jag på mönstren i varje språk.

På engelska: -ING, -TION, -LY
På svenska: sammansatta ord (barnbok = children's book)
På japanska: vanliga bokstavspar (ます, です)

Varje språk har sin egen "smak". Men du behöver tid för att känna den.`,
        },
        {
          title: 'Det Största Misstaget Jag Gjorde',
          content: `Jag trodde det handlade om ordförråd.

"Om jag spelar på tre språk lär jag mig 3x fler ord!"

Nej.

Vad som händer är att du lär dig 3x långsammare. För varje ord på ett nytt språk kräver kognitiv ansträngning. Och om du byter hela dagen mellan språk är din hjärna bara utmattad.

Rätt approach: Specialisering med exponering.

Mestadels: Ett språk
Ibland: "Turism" i andra språk`,
        },
        {
          title: 'Hur Det Ser Ut Nu (Ett År Senare)',
          content: `Jag spelar fortfarande på tre språk. Men inte på det dumma sätt jag försökte i början.

Min rutin:
- Söndag-torsdag: Engelska (mitt starkaste språk)
- Fredag: Svenska (utmaning)
- Lördag: Japanska (kul)

Resultaten?
- Engelska: Gick upp 200 poäng
- Svenska: Hittade 17 nya ord jag inte kunde
- Japanska: Lärde mig 43 hiragana-ord (jag räknar)

Är detta "att lära sig 3 språk samtidigt"? Inte riktigt.

Det är mer: Att använda ordspel för att stärka ett språk, med lätta beröringspunkter av två andra.`,
        },
        {
          title: 'Sanningen Om Språkinlärning Genom Spel',
          content: `Låt oss vara ärliga: ordspel kommer inte göra dig flytande.

Du kommer inte ut och talar svenska. Du kommer inte läsa böcker på japanska.

Vad som kommer hända:
- Du kommer känna vanliga ord
- Du kommer känna igen mönster
- Du kommer utveckla "språkkänsla"
- Du kommer ha kul medan du gör det

Ordspel är ingången, inte destinationen.

Men som ingång? De är inte dåliga alls. Känns mycket bättre än att sitta med flashkort.`,
        },
        {
          title: 'Om Du Vill Prova (Här Är Vad Jag Skulle Göra)',
          content: `Om jag började om:

Månad 1: Ett språk bara (starkast)
- Bygg självförtroende
- Lär dig spelmekanik
- Förstå vad som fungerar

Månad 2: Lägg till andra språket (en dag i veckan)
- Jämför inte poäng
- Leta efter olika mönster
- Njut av utmaningen

Månad 3+: Tredje språket (om du verkligen vill)
- Bara om det är kul
- Ingen press
- Det är okej att hoppa över

Min regel nu: Om det känns som arbete gör du det fel.`,
        },
      ],
      conclusion: `Så, borde du lära dig språk genom ordspel?

Beror på vad du förväntar dig.

Om du vill:
- Tala flytande ✗ Kommer inte hända
- Klara ett prov ✗ Kommer inte hända
- Känna ord + ha kul ✓ Absolut

Ordspel är inte en språkkurs. De är ett extra verktyg. Ett roligt verktyg.

Jag spelar fortfarande på tre språk. Men nu vet jag varför jag gör det: inte för att "bli flerspråkig", utan för att det är kul att se samma spel genom linsen av ett annat språk.

(Förresten, efter ett år: Min engelska förbättrades. Svenska... ungefär samma. Japanska? Låt oss bara säga att jag fortfarande letar efter 3-bokstavsord.)`,
    },
    ja: {
      title: '言葉ゲームで3つの言語を同時に学んだ。それは間違いだった',
      subtitle: '衝動的な決定がどのように謙虚な教訓になったか（そして驚くべきことに、うまくいった）',
      intro: `2023年1月。ベルリンの部屋に座って、アプリで利用可能な言語を見ていた：
English. Svenska. 日本語.

「全部同時にできる」と思った。「ただの言葉ゲームだし、どれくらい難しいだろう？」

判明：とても、とても難しい。

でももしあなたがこれを読んでいるなら、おそらく複数の言語でプレイすることを考えているでしょう。だから誰も教えてくれないことをここに書きます。`,
      sections: [
        {
          title: '最初の週：天才のように感じる',
          content: `最初の週は自分がポリグロットのように感じた。

英語？簡単。最初の試みで40語見つけた。

スウェーデン語？少し難しいが、いくつかの単語は知っている。

日本語？主にひらがなだけど、15個の短い単語を見つけた。

「これは機能する！3つの言語を学んでいる！」と思った。

（まだ実際には何も学んでいないことに気づいていなかった。）`,
        },
        {
          title: '3週目：アイデンティティの危機',
          content: `木曜日の夕方に起こった。英語のボードの前に座っていて、突然すべての単語がスウェーデン語に見えた。

「LAND」を見て思った - これはスウェーデン語のcountry？それとも英語のground？

そしてスウェーデン語に切り替えて、スウェーデン語のボードで日本語の単語を探している自分がいた。

脳が混乱した。3つの言語、同じフォーマット、すべてが混ざり合った。

「わかった」と自分に言った。「3つの言語は多すぎるかもしれない。」`,
        },
        {
          title: '実際に学んだこと（そしてそれは単語ではない）',
          content: `1ヶ月の混乱の後、別のことを試すことにした：1週間、1言語。

1週目：英語のみ
2週目：スウェーデン語のみ
3週目：日本語のみ
4週目：英語に戻る

そして突然...機能し始めた。

なぜ？3つの言語で単語を覚えようとする代わりに、各言語のパターンに焦点を当てたから。

英語：-ING、-TION、-LY
スウェーデン語：複合語（barnbok = 子供の本）
日本語：一般的な文字のペア（ます、です）

各言語には独自の「味」がある。でもそれを感じるには時間が必要。`,
        },
        {
          title: '私が犯した最大の間違い',
          content: `語彙についてだと思っていた。

「3つの言語でプレイすれば、3倍の単語を学べる！」

いいえ。

起こることは3倍遅く学ぶこと。なぜなら新しい言語のすべての単語は認知的努力を必要とするから。そして一日中言語を切り替えていると、脳はただ疲れ果てる。

正しいアプローチ：露出を伴う専門化。

ほとんどの時間：1つの言語
時々：他の言語への「観光」`,
        },
        {
          title: '今の様子（1年後）',
          content: `まだ3つの言語でプレイしている。でも最初に試した愚かな方法ではない。

私のルーチン：
- 日曜日-木曜日：英語（最も強い言語）
- 金曜日：スウェーデン語（挑戦）
- 土曜日：日本語（楽しみ）

結果は？
- 英語：200ポイント上がった
- スウェーデン語：知らなかった新しい単語17個見つけた
- 日本語：43個のひらがな単語を学んだ（数えている）

これは「3つの言語を同時に学ぶ」こと？実際には違う。

それは：1つの言語を強化するために言葉ゲームを使い、他の2つに軽く触れること。`,
        },
        {
          title: 'ゲームを通じた言語学習の真実',
          content: `正直に言おう：言葉ゲームはあなたを流暢にしない。

スウェーデン語を話せるようにはならない。日本語の本を読めるようにはならない。

何が起こるか：
- 一般的な単語を知る
- パターンを認識する
- 「言語感覚」を発達させる
- 楽しみながらそれをする

言葉ゲームは入口であって、目的地ではない。

でも入口として？全然悪くない。フラッシュカードに座るよりずっと良い感じがする。`,
        },
        {
          title: '試したいなら（私がやること）',
          content: `もし最初からやり直すなら：

1ヶ月目：1つの言語のみ（最強）
- 自信を築く
- ゲームメカニクスを学ぶ
- 何が機能するか理解する

2ヶ月目：2番目の言語を追加（週1日）
- スコアを比較しない
- 異なるパターンを探す
- 挑戦を楽しむ

3ヶ月目以降：3番目の言語（本当にやりたいなら）
- 楽しい場合のみ
- プレッシャーなし
- スキップしても大丈夫

今の私のルール：仕事のように感じるなら、間違っている。`,
        },
      ],
      conclusion: `では、言葉ゲームで言語を学ぶべきか？

何を期待するかによる。

もしあなたが望むなら：
- 流暢に話す ✗ 起こらない
- 試験に合格する ✗ 起こらない
- 単語を知る + 楽しむ ✓ 絶対に

言葉ゲームは言語コースではない。追加のツール。楽しいツール。

まだ3つの言語でプレイしている。でも今は理由を知っている：「多言語になる」ためではなく、異なる言語のレンズを通して同じゲームを見るのが楽しいから。

（ちなみに、1年後：英語は改善した。スウェーデン語...ほぼ同じ。日本語？まだ3文字の単語を探していると言っておこう。）`,
    },
    es: {
      title: 'Aprendí 3 Idiomas Simultáneamente Con Juegos de Palabras. Fue Un Error',
      subtitle: 'Cómo una decisión impulsiva se convirtió en una lección humillante (y luego, sorprendentemente, funcionó)',
      intro: `Enero de 2023. Estoy sentado en mi habitación en Berlín, mirando los idiomas disponibles en la aplicación:
English. Svenska. 日本語.

"Puedo hacer los tres a la vez," pensé. "Es solo un juego de palabras, ¿qué tan difícil puede ser?"

Resultó: muy, muy difícil.

Pero si estás leyendo esto, probablemente estés considerando jugar en varios idiomas también. Así que aquí está lo que nadie te dirá.`,
      sections: [
        {
          title: 'Primera Semana: Sintiéndome Como Un Genio',
          content: `La primera semana me sentí como un políglota.

¿Inglés? Fácil. Encontré 40 palabras en mi primer intento.

¿Sueco? Un poco más difícil, pero conozco algunas palabras.

¿Japonés? Principalmente hiragana, pero encontré 15 palabras cortas.

Pensé: "¡Esto funciona! ¡Estoy aprendiendo tres idiomas!"

(Todavía no me daba cuenta de que en realidad no estaba aprendiendo nada.)`,
        },
        {
          title: 'Tercera Semana: Crisis de Identidad',
          content: `Sucedió un jueves por la noche. Estaba sentado frente a un tablero en inglés y de repente cada palabra me parecía sueca.

Vi "LAND" y pensé - ¿es eso country en sueco o ground en inglés?

Luego cambié al sueco y me encontré buscando palabras japonesas en un tablero sueco.

Mi cerebro se confundió. Tres idiomas, mismo formato, todo mezclado.

"Está bien," me dije, "tal vez tres idiomas sean demasiados."`,
        },
        {
          title: 'Lo Que Realmente Aprendí (Y No Son Palabras)',
          content: `Después de un mes de confusión, decidí probar algo diferente: una semana, un idioma.

Semana 1: Solo inglés
Semana 2: Solo sueco
Semana 3: Solo japonés
Semana 4: De vuelta al inglés

Y de repente... comenzó a funcionar.

¿Por qué? Porque en lugar de intentar recordar palabras en tres idiomas, me enfoqué en los patrones de cada idioma.

En inglés: -ING, -TION, -LY
En sueco: palabras compuestas (barnbok = libro para niños)
En japonés: pares de letras comunes (ます, です)

Cada idioma tiene su propio "sabor". Pero necesitas tiempo para sentirlo.`,
        },
        {
          title: 'El Mayor Error Que Cometí',
          content: `Pensé que se trataba de vocabulario.

"¡Si juego en tres idiomas, aprenderé 3 veces más palabras!"

No.

Lo que sucede es que aprendes 3 veces más lento. Porque cada palabra en un nuevo idioma requiere esfuerzo cognitivo. Y si estás cambiando todo el día entre idiomas, tu cerebro simplemente se agota.

El enfoque correcto: Especialización con exposición.

La mayor parte del tiempo: Un idioma
Ocasionalmente: "Turismo" en otros idiomas`,
        },
        {
          title: 'Cómo Se Ve Ahora (Un Año Después)',
          content: `Todavía juego en tres idiomas. Pero no de la manera estúpida que intenté al principio.

Mi rutina:
- Domingo-jueves: Inglés (mi idioma más fuerte)
- Viernes: Sueco (desafío)
- Sábado: Japonés (diversión)

¿Los resultados?
- Inglés: Subí 200 puntos
- Sueco: Encontré 17 palabras nuevas que no conocía
- Japonés: Aprendí 43 palabras en hiragana (estoy contando)

¿Es esto "aprender 3 idiomas simultáneamente"? En realidad no.

Es más: Usar juegos de palabras para fortalecer un idioma, con toques ligeros de otros dos.`,
        },
        {
          title: 'La Verdad Sobre el Aprendizaje de Idiomas A Través de Juegos',
          content: `Seamos honestos: los juegos de palabras no te harán fluido.

No saldrás hablando sueco. No leerás libros en japonés.

Lo que sucederá:
- Conocerás palabras comunes
- Reconocerás patrones
- Desarrollarás "sentido del idioma"
- Te divertirás mientras lo haces

Los juegos de palabras son la entrada, no el destino.

¿Pero como entrada? No están nada mal. Se siente mucho mejor que sentarse con tarjetas de memoria.`,
        },
        {
          title: 'Si Quieres Intentarlo (Esto Es Lo Que Haría)',
          content: `Si estuviera empezando de nuevo:

Mes 1: Solo un idioma (el más fuerte)
- Construye confianza
- Aprende la mecánica del juego
- Entiende qué funciona

Mes 2: Agrega el segundo idioma (un día a la semana)
- No compares puntuaciones
- Busca patrones diferentes
- Disfruta el desafío

Mes 3+: Tercer idioma (si realmente quieres)
- Solo si es divertido
- Sin presión
- Está bien omitirlo

Mi regla ahora: Si se siente como trabajo, lo estás haciendo mal.`,
        },
      ],
      conclusion: `Entonces, ¿deberías aprender idiomas a través de juegos de palabras?

Depende de lo que esperes.

Si quieres:
- Hablar con fluidez ✗ No sucederá
- Aprobar un examen ✗ No sucederá
- Conocer palabras + divertirte ✓ Absolutamente

Los juegos de palabras no son un curso de idiomas. Son una herramienta adicional. Una herramienta divertida.

Todavía juego en tres idiomas. Pero ahora sé por qué lo hago: no para "volverme multilingüe", sino porque es divertido ver el mismo juego a través del lente de un idioma diferente.

(Por cierto, después de un año: Mi inglés mejoró. Sueco... más o menos igual. ¿Japonés? Digamos que todavía estoy buscando palabras de 3 letras.)`,
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
              'bg-neo-orange text-neo-black'
            )}>
              {t('blog.experience')}
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
              src="/images/blog/multilingual-learning.jpg"
              alt="Personal journey learning multiple languages through word games"
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
          {/* Warning Box */}
          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mb-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-orange/20 shadow-hard'
          )}>
            <div className="flex items-start gap-4">
              <AlertTriangle className={cn('w-6 h-6 flex-shrink-0', isDarkMode ? 'text-neo-orange' : 'text-neo-black')} />
              <div>
                <p className={cn('text-lg font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  {language === 'he' ? 'אזהרה: אני לא מומחה' : language === 'ja' ? '警告：私は専門家ではない' : language === 'sv' ? 'Varning: Jag är ingen expert' : language === 'es' ? 'Advertencia: No soy un experto' : 'Warning: I\'m Not an Expert'}
                </p>
                <p className={cn('text-base mb-0 whitespace-pre-line', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  {content.intro}
                </p>
              </div>
            </div>
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
            isDarkMode ? 'bg-slate-800' : 'bg-neo-lime/20 shadow-hard'
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
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {t('blog.startPlaying')}
                </Button>
              </Link>
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {t('blog.dailyChallenge')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
