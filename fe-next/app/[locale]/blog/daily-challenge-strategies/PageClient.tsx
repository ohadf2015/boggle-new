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
  category: string;
  date: string;
  readTime: string;
  imageAlt: string;
  intro: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  conclusion: string;
  backToBlog: string;
  tryDaily: string;
  practiceStrategies: string;
  sourcesTitle: string;
}

const contentByLocale: Record<string, LocaleContent> = {
  he: {
    title: 'איך להכות את האתגר היומי (בלי להיות גאון)',
    subtitle: 'השבוע שבו הפסקתי לסיים ב-50% האחרונים',
    category: 'אסטרטגיה',
    date: '15 בינואר, 2024',
    readTime: 'זמן קריאה: 6 דקות',
    imageAlt: 'שחקן מרוכז על לוח משחק עם אסטרטגיות מודגשות',
    intro: `למשך 3 חודשים, שיחקתי באתגר היומי כל יום בלי לפספס.

ותוצאה? סיימתי בין מקום 40 ל-60 מתוך 100 שחקנים. כל. יום. בודד.

זה היה משפיל. אני רואה את שמי ליד "מקום 47" ושואל את עצמי: "למה אני בכלל ממשיך?"

ואז קרה משהו.`,
    sections: [
      {
        title: 'השבר שלי (שבוע 14)',
        content: `זה היה יום רביעי אחר הצהריים. גמרתי אתגר, שוב מקום 52, ופשוט נשארתי להסתכל על הטבלה.

ראיתי את DanielM ליד מקום 3. שוב. בפעם החמישית השבוע.

ופתאום עלה לי רעיון מטופש: מה אם אני אסתכל מה הוא עושה אחרת?

אז עשיתי את הדבר הכי לא כיף שיש - הקלטתי את עצמי משחק ושלחתי לו. שאלתי אם הוא יכול להסתכל.

הוא כתב לי תשובה אחת שנתיים יותר מ-200 מילים. התמקדתי בחלק אחד:

"אתה משחק כאילו יש לך כל הזמן שבעולם. אין לך כל הזמן שבעולם."

שנאתי אותו. ברור שהוא צודק.`
      },
      {
        title: 'מה שלמדתי מהלקיחת הבזק',
        content: `בשבוע הבא ניסיתי משהו חדש: התחלתי לשחק כאילו יש לי רק 60 שניות, לא את כל הזמן הרגיל.

טיימר על הטלפון, צליל כל 20 שניות.

השלושים שניות הראשונים: תפסתי כל מילה בת 3-4 אותיות שראיתי. לא חשבתי, רק תפסתי.

השלושים השניים: אז חיפשתי את המילים הארוכות.

השלושים האחרונים: בדקתי שוב את כל הלוח.

ניחוש מה קרה?

מקום 28.

פעם ראשונה מתחת ל-30. אחרי 14 שבועות.`
      },
      {
        title: 'הדבר השני שלמדתי: תפסיק לחפש "מילים מדהימות"',
        content: `זה היה ההרגל הכי גרוע שלי.

הייתי רואה לוח ומיד מחפש איזה מילה בת 8 אותיות שתעשה לי חשבון.

הבעיה? בזמן שהייתי מחפש את ה"יהלום" הזה, שחקנים אחרים תפסו 15 מילים קטנות שגם הן שוות נקודות.

אז שיניתי את הגישה:

**30 השניות הראשונות - ציד מהיר:**
- כל מילה בת 3 אותיות שאני רואה → תפוס
- כל מילה בת 4 אותיות שאני רואה → תפוס
- אל תחשוב, תפוס

**30 השניות השניות - בניית מילים:**
- עכשיו תחפש מילים ארוכות
- השתמש בקידומות: לא-, מ-, ב-
- השתמש בסיומות: -ות, -ים, -י

**30 השניות האחרונות - סיום:**
- בדוק כל זווית שלא בדקת
- תפוס מילים שפספסת
- תמיד יש עוד 2-3 מילים שהחמצת

התוצאה? מקום 18 בשבוע השני.`
      },
      {
        title: 'הדבר השלישי שלמדתי: אל תנסה למצוא כל מילה',
        content: `זה נשמע מוזר, אבל:

השחקנים הטובים לא מוצאים כל מילה.

הם מוצאים את המילים הנכונות. מהר.

ב-3 הדקות שלך, אתה לא יכול למצוא 100% מהמילים. אף אחד לא יכול.

אז מה השחקנים הטובים עושים? הם מתמקדים ב-70% הראשונים - המילים שכולם אמורים למצוא.

ואז, אם נשאר זמן, הם צדים את ה-30% האחרונים.

אבל הם לא מתחילים מה-30% האחרונים. זה הסוד.

(למדתי את זה בדרך הקשה. חיפשתי מילה נדירה למשך דקה וחצי ופספסתי 8 מילים פשוטות. סיימתי מקום 64. זכור את זה.)

**הסדר הנכון:**
1. תפוס את המילים הפשוטות (30 שניות)
2. תפוס את המילים הבינוניות (60 שניות)
3. תפוס את המילים הקשות (30 שניות אחרונות)
4. בדוק שוב מה שפספסת (60 שניות אחרונות)

עובד טוב יותר. מבטיח.`
      },
      {
        title: 'מה הרווחתי מכל זה?',
        content: `אחרי 4 שבועות של המערכת הזו, הנה הממוצעים שלי:

שבוע 1 עם מערכת: מקום 28 (למעלה ממקום 52)
שבוע 2: מקום 18
שבוע 3: מקום 14
שבוע 4: מקום 11

היום הטוב ביותר? מקום 6.

העצוב ביותר? מקום 32 (יום שבו ניסיתי "לשפר" את המערכת. לא השתלם).

האם אני בטופ 10 כל יום? לא.

האם אני בטופ 20 רוב הימים? כן.

האם זה מספיק טוב בשבילי? בהחלט.

**דברים שעדיין לא עובדים:**
- ימים שבהם יש הרבה מילים ארוכות (אני עדיין לא מספיק מהיר)
- לוחות עם דפוסי אותיות מוזרים (צ, ץ, ק ביחד)
- ימי שישי אחר הצהריים (פשוט עייף מדי)

**דברים שכן עובדים:**
- הטיימר של 3x30 שניות
- התמקדות במילים פשוטות תחילה
- לא לחפש את "המילה המושלמת"
- לבדוק שוב בסוף`
      },
      {
        title: 'אם אתה רוצה לנסות את המערכת שלי',
        content: `אני לא אגיד לך "פשוט תעשה את זה" כי זה לא כזה פשוט.

לקח לי שבועיים להרגיל את עצמי לטיימר. השבוע הראשון, שנאתי את זה. תחושת לחץ נוראה.

אבל אחרי שבועיים, זה נהיה טבעי.

**מה שעבד בשבילי:**

שבוע 1: פשוט תרגיש את הקצב
- הגדר טיימר ל-3 דקות
- חלק ל-3 חלקים (צליל כל דקה)
- אל תצפה לשיפור, פשוט תרגיש את הקצב

שבוע 2: תפוס מילים פשוטות מהר
- 30 שניות ראשונות: רק מילים בנות 3-4 אותיות
- תתאמן על זה עד שזה יהיה אוטומטי

שבוע 3: הוסף את החיפוש של מילים ארוכות
- 30 שניות שניות: חפש מילים בנות 5-7 אותיות
- השתמש בקידומות וסיומות

שבוע 4: שלב את כל המערכת
- 30-30-30-60 (תפוס - בנה - צוד - בדוק)
- שמור על הקצב
- אל תשבור את המערכת

**אם אתה מרגיש שזה לא עובד אחרי שבוע:**
- זה נורמלי. המערכת לוקחת זמן
- תמשיך עוד שבוע
- אם אחרי שבועיים זה עדיין לא עובד, תנסה משהו אחר

אני עדיין לא בטופ 10. אבל אני כבר לא ב-50% האחרונים.

וזה מספיק בשבילי.`
      }
    ],
    conclusion: `עשיתי טעויות. לא מצאתי פתרון מושלם. יש לי ימים שאני סיים מקום 35.

אבל אחרי שעברתי מממוצע של מקום 52 לממוצע של מקום 15-20, אני יכול להגיד:

המערכת הזו עובדת. לא לכולם, אבל היא עבדה בשבילי.

נסה אותה במשך שבועיים. אם היא עובדת - מעולה. אם לא - אתה תמצא משהו אחר.

(ואם תמצא משהו שעובד טוב יותר, אתה תכתוב לי?)`,
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'נסו אתגר יומי',
    practiceStrategies: 'תרגלו אסטרטגיות',
    sourcesTitle: 'מקורות וקריאה נוספת'
  },

  en: {
    title: 'How to Beat the Daily Challenge (Without Being a Genius)',
    subtitle: 'The week I stopped finishing in the bottom 50%',
    category: 'Strategy',
    date: 'January 15, 2024',
    readTime: '6 min read',
    imageAlt: 'Player focused on game board with strategies highlighted',
    intro: `For 3 months, I played the daily challenge every single day without missing.

Result? I finished between 40th and 60th place out of 100 players. Every. Single. Day.

It was humiliating. I'd see my name next to "Rank 47" and think: "Why am I even doing this?"

Then something happened.`,
    sections: [
      {
        title: 'My Breaking Point (Week 14)',
        content: `It was Wednesday afternoon. Finished a challenge, rank 52 again, and just sat there staring at the leaderboard.

I saw DanielM at rank 3. Again. Fifth time that week.

And a stupid idea hit me: What if I watch what he does differently?

So I did the least fun thing possible - recorded myself playing and sent it to him. Asked if he could watch.

He wrote back a response that was over 200 words long. I focused on one part:

"You play like you have all the time in the world. You don't have all the time in the world."

I hated him. Obviously he was right.`
      },
      {
        title: 'What I Learned from the Takedown',
        content: `Next week I tried something new: Started playing like I only had 60 seconds, not the full time.

Timer on my phone, beep every 20 seconds.

First 30 seconds: Grabbed every 3-4 letter word I saw. Didn't think, just grabbed.

Second 30: Then searched for longer words.

Last 30: Double-checked the entire board.

Guess what happened?

Rank 28.

First time below 30. After 14 weeks.`
      },
      {
        title: 'Second Thing I Learned: Stop Looking for "Amazing Words"',
        content: `This was my worst habit.

I'd see a board and immediately hunt for some 8-letter word that would make my score.

The problem? While I was hunting for that "diamond," other players grabbed 15 small words that also scored points.

So I changed my approach:

**First 30 Seconds - Speed Hunt:**
- Every 3-letter word I see → grab
- Every 4-letter word I see → grab
- Don't think, grab

**Second 30 Seconds - Build Words:**
- Now look for longer words
- Use prefixes: UN-, RE-, PRE-
- Use suffixes: -NESS, -LY, -ING

**Last 30 Seconds - Finish:**
- Check every angle you didn't check
- Grab words you missed
- There are always 2-3 more words you missed

Result? Rank 18 in week two.`
      },
      {
        title: 'Third Thing I Learned: Don\'t Try to Find Every Word',
        content: `This sounds weird, but:

Good players don't find every word.

They find the right words. Fast.

In your 3 minutes, you can't find 100% of words. Nobody can.

So what do good players do? They focus on the first 70% - the words everyone should find.

Then, if time remains, they hunt the final 30%.

But they don't start with the final 30%. That's the secret.

(Learned this the hard way. Searched for a rare word for 90 seconds and missed 8 simple words. Finished rank 64. Remember that.)

**The Right Order:**
1. Grab simple words (30 seconds)
2. Grab medium words (60 seconds)
3. Grab hard words (last 30 seconds)
4. Double-check what you missed (last 60 seconds)

Works better. Promise.`
      },
      {
        title: 'What Did I Actually Gain From This?',
        content: `After 4 weeks with this system, here are my averages:

Week 1 with system: Rank 28 (up from rank 52)
Week 2: Rank 18
Week 3: Rank 14
Week 4: Rank 11

Best day? Rank 6.

Worst? Rank 32 (day I tried to "improve" the system. Didn't pay off).

Am I in the top 10 every day? No.

Am I in the top 20 most days? Yes.

Is that good enough for me? Absolutely.

**Things That Still Don't Work:**
- Days with lots of long words (I'm still not fast enough)
- Boards with weird letter patterns (Q, X, Z together)
- Friday afternoons (just too tired)

**Things That Do Work:**
- The 3x30 second timer
- Focus on simple words first
- Not hunting for the "perfect word"
- Double-checking at the end`
      },
      {
        title: 'If You Want to Try My System',
        content: `I won't tell you "just do it" because it's not that simple.

Took me two weeks to get used to the timer. First week, I hated it. Felt so much pressure.

But after two weeks, it became natural.

**What Worked for Me:**

Week 1: Just feel the pace
- Set timer for 3 minutes
- Divide into 3 parts (beep every minute)
- Don't expect improvement, just feel the pace

Week 2: Grab simple words fast
- First 30 seconds: Only 3-4 letter words
- Practice until it's automatic

Week 3: Add searching for longer words
- Second 30 seconds: Look for 5-7 letter words
- Use prefixes and suffixes

Week 4: Integrate the full system
- 30-30-30-60 (grab - build - hunt - check)
- Keep the pace
- Don't break the system

**If You Feel It's Not Working After a Week:**
- That's normal. The system takes time
- Keep going another week
- If after two weeks it still doesn't work, try something else

I'm still not in the top 10. But I'm no longer in the bottom 50%.

And that's enough for me.`
      }
    ],
    conclusion: `I made mistakes. Didn't find a perfect solution. I have days where I finish rank 35.

But after going from an average of rank 52 to an average of rank 15-20, I can say:

This system works. Not for everyone, but it worked for me.

Try it for two weeks. If it works - great. If not - you'll find something else.

(And if you find something that works better, will you write to me?)`,
    backToBlog: 'Back to Blog',
    tryDaily: 'Try Daily Challenge',
    practiceStrategies: 'Practice Strategies',
    sourcesTitle: 'Sources & Further Reading'
  },

  sv: {
    title: 'Hur Jag Började Slå Dagliga Utmaningen (Utan Att Vara Ett Geni)',
    subtitle: 'Veckan då jag slutade hamna i nedre 50%',
    category: 'Strategi',
    date: '15 januari, 2024',
    readTime: '6 min läsning',
    imageAlt: 'Spelare fokuserad på spelbrädet med strategier markerade',
    intro: `I 3 månader spelade jag den dagliga utmaningen varje dag utan att missa.

Resultat? Jag kom mellan plats 40 och 60 av 100 spelare. Varje. Enda. Dag.

Det var förödmjukande. Jag såg mitt namn bredvid "Plats 47" och tänkte: "Varför fortsätter jag ens?"

Sedan hände något.`,
    sections: [
      {
        title: 'Min Brytpunkt (Vecka 14)',
        content: `Det var onsdag eftermiddag. Avslutade en utmaning, plats 52 igen, och bara satt där och stirrade på topplistan.

Jag såg DanielM på plats 3. Igen. Femte gången den veckan.

Och en dum idé slog mig: Tänk om jag tittar på vad han gör annorlunda?

Så jag gjorde det minst roliga möjliga - spelade in mig själv och skickade till honom. Frågade om han kunde titta.

Han skrev tillbaka ett svar som var över 200 ord långt. Jag fokuserade på en del:

"Du spelar som om du har all tid i världen. Du har inte all tid i världen."

Jag hatade honom. Uppenbarligen hade han rätt.`
      },
      {
        title: 'Vad Jag Lärde Mig från Nederlaget',
        content: `Nästa vecka provade jag något nytt: Började spela som om jag bara hade 60 sekunder, inte hela tiden.

Timer på telefonen, pip varje 20 sekunder.

Första 30 sekunderna: Tog varje 3-4 bokstavsord jag såg. Tänkte inte, bara tog.

Andra 30: Sedan sökte efter längre ord.

Sista 30: Dubbelkollade hela brädet.

Gissa vad som hände?

Plats 28.

Första gången under 30. Efter 14 veckor.`
      },
      {
        title: 'Andra Saken Jag Lärde Mig: Sluta Leta Efter "Fantastiska Ord"',
        content: `Det här var min värsta vana.

Jag såg ett bräde och jagade omedelbart något 8-bokstavsord som skulle ge mig poäng.

Problemet? Medan jag jagade den "diamanten" tog andra spelare 15 små ord som också gav poäng.

Så jag ändrade min strategi:

**Första 30 Sekunderna - Snabbjakt:**
- Varje 3-bokstavsord jag ser → ta
- Varje 4-bokstavsord jag ser → ta
- Tänk inte, ta

**Andra 30 Sekunderna - Bygg Ord:**
- Nu leta efter längre ord
- Använd prefix: O-, ÅT-, FÖR-
- Använd suffix: -HET, -NING, -LIG

**Sista 30 Sekunderna - Avsluta:**
- Kolla varje vinkel du inte kollade
- Ta ord du missade
- Det finns alltid 2-3 fler ord du missade

Resultat? Plats 18 i vecka två.`
      },
      {
        title: 'Tredje Saken Jag Lärde Mig: Försök Inte Hitta Varje Ord',
        content: `Det här låter konstigt, men:

Bra spelare hittar inte varje ord.

De hittar rätt ord. Snabbt.

På dina 3 minuter kan du inte hitta 100% av orden. Ingen kan.

Så vad gör bra spelare? De fokuserar på de första 70% - orden alla borde hitta.

Sedan, om tid återstår, jagar de de sista 30%.

Men de börjar inte med de sista 30%. Det är hemligheten.

(Lärde mig det på det hårda sättet. Sökte efter ett sällsynt ord i 90 sekunder och missade 8 enkla ord. Kom på plats 64. Kom ihåg det.)

**Rätt Ordning:**
1. Ta enkla ord (30 sekunder)
2. Ta medelsvåra ord (60 sekunder)
3. Ta svåra ord (sista 30 sekunderna)
4. Dubbelkolla vad du missade (sista 60 sekunderna)

Fungerar bättre. Lovar.`
      },
      {
        title: 'Vad Fick Jag Egentligen Av Detta?',
        content: `Efter 4 veckor med det här systemet, här är mina genomsnitt:

Vecka 1 med system: Plats 28 (upp från plats 52)
Vecka 2: Plats 18
Vecka 3: Plats 14
Vecka 4: Plats 11

Bästa dag? Plats 6.

Sämsta? Plats 32 (dag jag försökte "förbättra" systemet. Lönade sig inte).

Är jag i topp 10 varje dag? Nej.

Är jag i topp 20 de flesta dagar? Ja.

Är det tillräckligt bra för mig? Absolut.

**Saker Som Fortfarande Inte Fungerar:**
- Dagar med många långa ord (jag är fortfarande inte snabb nog)
- Brädor med konstiga bokstavsmönster (Q, X, Z tillsammans)
- Fredagseftermiddagar (bara för trött)

**Saker Som Fungerar:**
- 3x30 sekunders timer
- Fokus på enkla ord först
- Inte jaga det "perfekta ordet"
- Dubbelkolla i slutet`
      },
      {
        title: 'Om Du Vill Prova Mitt System',
        content: `Jag säger inte "bara gör det" eftersom det inte är så enkelt.

Tog mig två veckor att vänja mig vid timern. Första veckan hatade jag det. Kände så mycket press.

Men efter två veckor blev det naturligt.

**Vad Som Fungerade För Mig:**

Vecka 1: Bara känn takten
- Ställ in timer på 3 minuter
- Dela in i 3 delar (pip varje minut)
- Förvänta dig inte förbättring, bara känn takten

Vecka 2: Ta enkla ord snabbt
- Första 30 sekunderna: Bara 3-4 bokstavsord
- Öva tills det är automatiskt

Vecka 3: Lägg till sökning efter längre ord
- Andra 30 sekunderna: Leta efter 5-7 bokstavsord
- Använd prefix och suffix

Vecka 4: Integrera hela systemet
- 30-30-30-60 (ta - bygg - jaga - kolla)
- Håll takten
- Bryt inte systemet

**Om Du Känner Att Det Inte Fungerar Efter En Vecka:**
- Det är normalt. Systemet tar tid
- Fortsätt en vecka till
- Om det fortfarande inte fungerar efter två veckor, prova något annat

Jag är fortfarande inte i topp 10. Men jag är inte längre i nedre 50%.

Och det räcker för mig.`
      }
    ],
    conclusion: `Jag gjorde misstag. Hittade inte en perfekt lösning. Jag har dagar där jag kommer på plats 35.

Men efter att ha gått från ett genomsnitt på plats 52 till ett genomsnitt på plats 15-20 kan jag säga:

Det här systemet fungerar. Inte för alla, men det fungerade för mig.

Prova det i två veckor. Om det fungerar - bra. Om inte - hittar du något annat.

(Och om du hittar något som fungerar bättre, skriver du till mig?)`,
    backToBlog: 'Tillbaka till bloggen',
    tryDaily: 'Prova daglig utmaning',
    practiceStrategies: 'Träna strategier',
    sourcesTitle: 'Källor och vidare läsning'
  },

  ja: {
    title: 'デイリーチャレンジを倒す方法（天才じゃなくても）',
    subtitle: '下位50%から抜け出した週',
    category: '戦略',
    date: '2024年1月15日',
    readTime: '読了時間：6分',
    imageAlt: 'ゲームボードに集中するプレイヤーと強調された戦略',
    intro: `3ヶ月間、私は毎日デイリーチャレンジをプレイしました。一度も欠かさず。

結果は？100人のプレイヤーのうち40位から60位の間。毎日。毎日。

屈辱的でした。「順位47位」の横に自分の名前を見て思いました：「なぜ続けているんだろう？」

そして何かが起こりました。`,
    sections: [
      {
        title: '私の転換点（14週目）',
        content: `水曜日の午後でした。チャレンジを終えて、また52位、そしてリーダーボードを見つめていました。

DanielMが3位にいました。また。その週で5回目。

そして馬鹿げた考えが浮かびました：彼が何を違うやり方でやっているか見たらどうだろう？

そこで私は最も楽しくないことをしました - 自分がプレイしている様子を録画して彼に送りました。見てもらえるか尋ねました。

彼は200語以上の返信を書いてくれました。私は一部に焦点を当てました：

「あなたは時間が無限にあるかのようにプレイしています。時間は無限にありません。」

彼を憎みました。明らかに彼は正しかったです。`
      },
      {
        title: '敗北から学んだこと',
        content: `翌週、私は新しいことを試しました：フルタイムではなく、60秒しかないかのようにプレイし始めました。

携帯電話のタイマー、20秒ごとにビープ音。

最初の30秒：見た3-4文字の単語をすべて掴みました。考えずに、ただ掴みました。

2番目の30秒：それから長い単語を探しました。

最後の30秒：ボード全体を再確認しました。

何が起こったと思いますか？

28位。

14週間後、初めて30位以下。`
      },
      {
        title: '2番目に学んだこと：「素晴らしい単語」を探すのをやめる',
        content: `これは私の最悪の習慣でした。

ボードを見て、すぐにスコアを上げる8文字の単語を探していました。

問題は？その「ダイヤモンド」を探している間に、他のプレイヤーはポイントを獲得する15の小さな単語を掴んでいました。

そこでアプローチを変えました：

**最初の30秒 - スピードハント：**
- 見た3文字の単語はすべて → 掴む
- 見た4文字の単語はすべて → 掴む
- 考えずに掴む

**2番目の30秒 - 単語を構築：**
- 長い単語を探す
- 接頭辞を使用：UN-、RE-、PRE-
- 接尾辞を使用：-NESS、-LY、-ING

**最後の30秒 - 仕上げ：**
- チェックしていないすべての角度をチェック
- 見逃した単語を掴む
- 常に2-3の単語を見逃しています

結果は？2週目で18位。`
      },
      {
        title: '3番目に学んだこと：すべての単語を見つけようとしない',
        content: `これは奇妙に聞こえますが：

良いプレイヤーはすべての単語を見つけません。

彼らは正しい単語を見つけます。速く。

あなたの3分間で、100%の単語を見つけることはできません。誰もできません。

では、良いプレイヤーは何をしますか？彼らは最初の70%に焦点を当てます - 全員が見つけるべき単語。

それから、時間が残っていれば、最後の30%を探します。

しかし、最後の30%から始めません。それが秘密です。

（難しい方法で学びました。90秒間珍しい単語を探して、8つの簡単な単語を見逃しました。64位でした。それを覚えてください。）

**正しい順序：**
1. 簡単な単語を掴む（30秒）
2. 中程度の単語を掴む（60秒）
3. 難しい単語を掴む（最後の30秒）
4. 見逃したものを再確認（最後の60秒）

より良く機能します。約束します。`
      },
      {
        title: 'これから実際に何を得たのか？',
        content: `このシステムで4週間後、ここに私の平均があります：

システムでの1週目：28位（52位から上昇）
2週目：18位
3週目：14位
4週目：11位

最高の日？6位。

最悪？32位（システムを「改善」しようとした日。報われませんでした）。

毎日トップ10に入っていますか？いいえ。

ほとんどの日にトップ20に入っていますか？はい。

それは私にとって十分に良いですか？絶対に。

**まだ機能しないこと：**
- 長い単語が多い日（私はまだ十分に速くありません）
- 奇妙な文字パターンのボード（Q、X、Zが一緒）
- 金曜日の午後（ただ疲れすぎています）

**機能すること：**
- 3x30秒タイマー
- 最初に簡単な単語に焦点を当てる
- 「完璧な単語」を探さない
- 最後に再確認`
      },
      {
        title: '私のシステムを試したい場合',
        content: `「ただやれ」とは言いません。それほど簡単ではないからです。

タイマーに慣れるのに2週間かかりました。最初の週は嫌いでした。とてもプレッシャーを感じました。

しかし、2週間後、それは自然になりました。

**私にとって機能したこと：**

1週目：ただペースを感じる
- 3分のタイマーを設定
- 3つの部分に分ける（毎分ビープ音）
- 改善を期待せず、ただペースを感じる

2週目：簡単な単語を素早く掴む
- 最初の30秒：3-4文字の単語のみ
- 自動的になるまで練習

3週目：長い単語の検索を追加
- 2番目の30秒：5-7文字の単語を探す
- 接頭辞と接尾辞を使用

4週目：完全なシステムを統合
- 30-30-30-60（掴む - 構築 - 探す - チェック）
- ペースを保つ
- システムを壊さない

**1週間後にうまくいかないと感じたら：**
- それは正常です。システムには時間がかかります
- もう1週間続けてください
- 2週間後もうまくいかない場合は、他のものを試してください

私はまだトップ10にはいません。しかし、もはや下位50%にはいません。

そしてそれは私にとって十分です。`
      }
    ],
    conclusion: `私は間違いを犯しました。完璧な解決策は見つかりませんでした。35位で終わる日もあります。

しかし、平均52位から平均15-20位になった後、私は言えます：

このシステムは機能します。すべての人にではありませんが、私には機能しました。

2週間試してみてください。機能すれば - 素晴らしい。そうでなければ - 他のものを見つけるでしょう。

（もっとうまくいくものを見つけたら、私に教えてくれますか？）`,
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジを試す',
    practiceStrategies: '戦略を練習する',
    sourcesTitle: '情報源と参考文献'
  },

  es: {
    title: 'Cómo Vencer el Desafío Diario (Sin Ser un Genio)',
    subtitle: 'La semana en que dejé de terminar en el 50% inferior',
    category: 'Estrategia',
    date: '15 de enero, 2024',
    readTime: 'Lectura: 6 min',
    imageAlt: 'Jugador concentrado en el tablero con estrategias resaltadas',
    intro: `Durante 3 meses, jugué el desafío diario todos los días sin fallar.

¿Resultado? Terminé entre el puesto 40 y 60 de 100 jugadores. Cada. Día. Único.

Fue humillante. Veía mi nombre junto a "Puesto 47" y pensaba: "¿Por qué sigo haciendo esto?"

Entonces algo sucedió.`,
    sections: [
      {
        title: 'Mi Punto de Quiebre (Semana 14)',
        content: `Era miércoles por la tarde. Terminé un desafío, puesto 52 otra vez, y me quedé mirando la tabla de clasificación.

Vi a DanielM en el puesto 3. Otra vez. Quinta vez esa semana.

Y me golpeó una idea estúpida: ¿Y si veo qué hace él diferente?

Así que hice lo menos divertido posible - me grabé jugando y se lo envié. Le pregunté si podía verlo.

Él respondió con más de 200 palabras. Me concentré en una parte:

"Juegas como si tuvieras todo el tiempo del mundo. No tienes todo el tiempo del mundo."

Lo odié. Obviamente tenía razón.`
      },
      {
        title: 'Lo Que Aprendí de la Derrota',
        content: `La semana siguiente probé algo nuevo: Empecé a jugar como si solo tuviera 60 segundos, no todo el tiempo.

Temporizador en mi teléfono, pitido cada 20 segundos.

Primeros 30 segundos: Tomé cada palabra de 3-4 letras que vi. No pensé, solo tomé.

Segundos 30: Luego busqué palabras más largas.

Últimos 30: Revisé dos veces todo el tablero.

¿Adivina qué pasó?

Puesto 28.

Primera vez por debajo de 30. Después de 14 semanas.`
      },
      {
        title: 'Segunda Cosa Que Aprendí: Deja de Buscar "Palabras Increíbles"',
        content: `Este fue mi peor hábito.

Veía un tablero e inmediatamente buscaba alguna palabra de 8 letras que me daría puntos.

¿El problema? Mientras yo cazaba ese "diamante", otros jugadores tomaban 15 palabras pequeñas que también daban puntos.

Así que cambié mi enfoque:

**Primeros 30 Segundos - Caza Rápida:**
- Cada palabra de 3 letras que veo → tomar
- Cada palabra de 4 letras que veo → tomar
- No pensar, tomar

**Segundos 30 Segundos - Construir Palabras:**
- Ahora buscar palabras más largas
- Usar prefijos: IN-, RE-, PRE-
- Usar sufijos: -IDAD, -CIÓN, -MENTE

**Últimos 30 Segundos - Finalizar:**
- Revisar cada ángulo que no revisé
- Tomar palabras que perdí
- Siempre hay 2-3 palabras más que perdiste

¿Resultado? Puesto 18 en la semana dos.`
      },
      {
        title: 'Tercera Cosa Que Aprendí: No Intentes Encontrar Cada Palabra',
        content: `Esto suena raro, pero:

Los buenos jugadores no encuentran cada palabra.

Encuentran las palabras correctas. Rápido.

En tus 3 minutos, no puedes encontrar el 100% de las palabras. Nadie puede.

¿Entonces qué hacen los buenos jugadores? Se enfocan en el primer 70% - las palabras que todos deberían encontrar.

Luego, si queda tiempo, cazan el 30% final.

Pero no comienzan con el 30% final. Ese es el secreto.

(Lo aprendí de la manera difícil. Busqué una palabra rara durante 90 segundos y perdí 8 palabras simples. Terminé en el puesto 64. Recuerda eso.)

**El Orden Correcto:**
1. Tomar palabras simples (30 segundos)
2. Tomar palabras medias (60 segundos)
3. Tomar palabras difíciles (últimos 30 segundos)
4. Revisar dos veces lo que perdiste (últimos 60 segundos)

Funciona mejor. Lo prometo.`
      },
      {
        title: '¿Qué Gané Realmente de Esto?',
        content: `Después de 4 semanas con este sistema, aquí están mis promedios:

Semana 1 con sistema: Puesto 28 (subí del puesto 52)
Semana 2: Puesto 18
Semana 3: Puesto 14
Semana 4: Puesto 11

¿Mejor día? Puesto 6.

¿Peor? Puesto 32 (día que intenté "mejorar" el sistema. No valió la pena).

¿Estoy en el top 10 todos los días? No.

¿Estoy en el top 20 la mayoría de los días? Sí.

¿Es eso suficientemente bueno para mí? Absolutamente.

**Cosas Que Todavía No Funcionan:**
- Días con muchas palabras largas (todavía no soy lo suficientemente rápido)
- Tableros con patrones de letras raros (Q, X, Z juntas)
- Viernes por la tarde (simplemente demasiado cansado)

**Cosas Que Sí Funcionan:**
- El temporizador de 3x30 segundos
- Enfoque en palabras simples primero
- No cazar la "palabra perfecta"
- Revisar dos veces al final`
      },
      {
        title: 'Si Quieres Probar Mi Sistema',
        content: `No te diré "solo hazlo" porque no es tan simple.

Me tomó dos semanas acostumbrarme al temporizador. Primera semana, lo odié. Sentí tanta presión.

Pero después de dos semanas, se volvió natural.

**Lo Que Funcionó Para Mí:**

Semana 1: Solo siente el ritmo
- Configura temporizador para 3 minutos
- Divide en 3 partes (pitido cada minuto)
- No esperes mejora, solo siente el ritmo

Semana 2: Toma palabras simples rápido
- Primeros 30 segundos: Solo palabras de 3-4 letras
- Practica hasta que sea automático

Semana 3: Agrega búsqueda de palabras más largas
- Segundos 30 segundos: Busca palabras de 5-7 letras
- Usa prefijos y sufijos

Semana 4: Integra el sistema completo
- 30-30-30-60 (tomar - construir - cazar - revisar)
- Mantén el ritmo
- No rompas el sistema

**Si Sientes Que No Funciona Después de Una Semana:**
- Eso es normal. El sistema toma tiempo
- Continúa otra semana
- Si después de dos semanas todavía no funciona, prueba algo más

Todavía no estoy en el top 10. Pero ya no estoy en el 50% inferior.

Y eso es suficiente para mí.`
      }
    ],
    conclusion: `Cometí errores. No encontré una solución perfecta. Tengo días donde termino en el puesto 35.

Pero después de pasar de un promedio de puesto 52 a un promedio de puesto 15-20, puedo decir:

Este sistema funciona. No para todos, pero funcionó para mí.

Pruébalo durante dos semanas. Si funciona - genial. Si no - encontrarás algo más.

(¿Y si encuentras algo que funciona mejor, me escribirás?)`,
    backToBlog: 'Volver al blog',
    tryDaily: 'Prueba el desafío diario',
    practiceStrategies: 'Practica estrategias',
    sourcesTitle: 'Fuentes y lectura adicional'
  }
};

export default function StrategiesPageClient(): React.ReactElement {
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
              'bg-neo-orange text-neo-black'
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

          <p className={cn('text-xl mb-6', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {content.subtitle}
          </p>

          <div className={cn(
            'flex flex-wrap items-center gap-4 text-sm mb-6',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {content.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {content.readTime}
            </span>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-64 md:h-96 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/strategy-tactics.jpg"
              alt={content.imageAlt}
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
          {/* Intro Box */}
          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mb-8',
            isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
          )}>
            <p className={cn('text-lg font-medium mb-0 whitespace-pre-line', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.intro}
            </p>
          </div>

          {/* Main Sections */}
          {content.sections.map((section, index) => (
            <section key={index} className="mb-8">
              <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {section.title}
              </h2>
              <div className={cn(
                'prose prose-lg max-w-none',
                isDarkMode ? 'prose-invert' : ''
              )}>
                <p className={cn('whitespace-pre-line', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  {section.content}
                </p>
              </div>
            </section>
          ))}

          {/* Conclusion Box */}
          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mt-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20'
          )}>
            <p className={cn('text-lg font-medium mb-0 whitespace-pre-line', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.conclusion}
            </p>
          </div>

          {/* Research Sources */}
          <section className="mb-8 mt-8">
            <h3 className={cn('text-lg font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.sourcesTitle}
            </h3>
            <ul className={cn('text-sm space-y-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              <li>
                <a
                  href="https://parade.com/living/how-to-win-crossplay-nyt-game"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  How To Win NYT Game &apos;Crossplay&apos; Every Time - Parade
                </a>
              </li>
              <li>
                <a
                  href="https://blog.clevergoat.com/posts/word-grid-strategy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Word Grid Strategy for Success - CleverGoat
                </a>
              </li>
              <li>
                <a
                  href="https://game-wisdom.com/general/win-word-games-every-time-5-tips"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Win Word Games Every Time - Game Wisdom
                </a>
              </li>
            </ul>
          </section>

          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4 mt-6">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-orange text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.tryDaily}
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.practiceStrategies}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
