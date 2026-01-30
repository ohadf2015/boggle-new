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
  practiceNow: string;
  tryDaily: string;
};

const contentByLocale: Record<string, LocaleContent> = {
  he: {
    title: 'בן דוד שלי אומר שאני מרמה במשחקי מילים',
    category: 'נקודת מבט',
    readTime: 'זמן קריאה: 5 דקות',
    sections: [
      {
        content: `אני לא מרמה. פשוט שמים לב לדברים שהוא לא שם לב אליהם.

בן דוד שלי, יובל, מכיר יותר מילים ממני. הוא קורא ספרים כל הזמן. בעבודה שלו הוא כותב מסמכים ארוכים. אני בקושי קורא מעבר לכותרות.

אבל אני מנצח אותו. כמעט תמיד.`,
      },
      {
        title: 'מה שהוא לא מבין',
        content: `יובל מחפש מילים. אני מחפש צורות.

כשאני מסתכל על לוח של אותיות, אני לא מנסה לזכור מילים מהראש. אני מחפש דברים שחוזרים על עצמם.

אני רואה "ה" בהתחלה ומיד בודק מה עוד יש. אני רואה "ים" בסוף ומחפש מה אפשר לשים לפני.

זה לא עניין של לזכור כל מילה. זה עניין של לזהות דפוסים שכבר יודעים.`,
      },
      {
        title: 'הטעות שעשיתי בהתחלה',
        content: `ניסיתי פעם לשנן מילים. ישבתי עם רשימות, למדתי מילים נדירות. חשבתי שככה מנצחים.

במשחק הבא לא זכרתי כלום. הראש שלי פשוט לא עובד ככה.

מה שכן עובד: לשחק הרבה. לא ללמוד על משחקים, לשחק משחקים. במשחק השלישי או הרביעי אתחיל לראות דברים שלא ראיתי קודם. המוח פשוט מתרגל.`,
      },
      {
        title: 'משהו שעזר לי',
        content: `אני לא אוהב לתת עצות כי מה שעובד לי אולי לא יעבוד לאחרים. אבל דבר אחד שינה לי את המשחק: הפסקתי לחפש מילים ארוכות.

מילים קצרות הן יותר כיף. יותר מהן, יותר אפשרויות, ואני מרגיש חכם יותר כשמוצא שלוש מילים של שלוש אותיות מאשר מילה אחת ארוכה שהזל הביא לי.`,
      },
      {
        content: `יובל עדיין מתלונן שאני מרמה. בפעם האחרונה הוא אמר שיש לי "מילון מוסלק בראש". אמרתי לו שזה לא מילון, זה פשוט ניסיון.

הוא לא האמין לי. אולי הוא צודק.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    practiceNow: 'משחק חופשי',
    tryDaily: 'אתגר יומי',
  },
  en: {
    title: 'My cousin says I cheat at word games',
    category: 'Perspective',
    readTime: '5 min read',
    sections: [
      {
        content: `I don't cheat. I just notice things he doesn't.

My cousin, Mike, knows more words than me. He reads books all the time. At work he writes long documents. I barely read past headlines.

But I beat him. Almost every time.`,
      },
      {
        title: 'What he doesn\'t get',
        content: `Mike looks for words. I look for shapes.

When I look at a board of letters, I'm not trying to remember words from memory. I'm looking for things that repeat.

I see an "RE" at the start and immediately check what else is there. I see "ING" at the end and look for what can go before it.

It's not about remembering every word. It's about recognizing patterns you already know.`,
      },
      {
        title: 'The mistake I made early on',
        content: `I once tried to memorize words. I sat with lists, learned rare words. I thought that's how you win.

In the next game I remembered nothing. My head just doesn't work that way.

What does work: playing a lot. Not studying games, playing games. By the third or fourth game I start seeing things I didn't see before. The brain just gets used to it.`,
      },
      {
        title: 'Something that helped me',
        content: `I don't like giving advice because what works for me might not work for others. But one thing changed my game: I stopped looking for long words.

Short words are more fun. More of them, more options, and I feel smarter when I find three 3-letter words than one long word that luck handed me.`,
      },
      {
        content: `Mike still complains that I cheat. Last time he said I have a "hidden dictionary in my head." I told him it's not a dictionary, it's just experience.

He didn't believe me. Maybe he's right.`,
      },
    ],
    backToBlog: 'Back to Blog',
    practiceNow: 'Free Play',
    tryDaily: 'Daily Challenge',
  },
  sv: {
    title: 'Min kusin säger att jag fuskar i ordspel',
    category: 'Perspektiv',
    readTime: '5 min läsning',
    sections: [
      {
        content: `Jag fuskar inte. Jag märker bara saker han inte gör.

Min kusin Erik läser mycket mer än jag. Han kan fler ord. Han skriver hela tiden på jobbet, långa mejl, rapporter.

Ändå vinner jag. Nästan varje gång.`,
      },
      {
        title: 'Vad han inte förstår',
        content: `Erik letar efter ord. Jag letar efter former.

När jag tittar på bokstäver försöker jag inte komma ihåg ord. Jag letar efter saker som upprepas.

Jag ser "FÖR" i början och kollar direkt vad mer som finns. Jag ser "ANDE" i slutet och letar efter vad som kan komma före.

Det handlar inte om att komma ihåg varje ord. Det handlar om att känna igen mönster man redan kan.`,
      },
      {
        title: 'Mitt misstag i början',
        content: `Jag försökte memorera ord en gång. Satt med listor, lärde mig ovanliga ord. Trodde det var så man vann.

I nästa spel kom jag inte ihåg något. Min hjärna fungerar bara inte så.

Vad som fungerar: spela mycket. Inte studera spel, spela spel. Efter tredje eller fjärde spelet börjar jag se saker jag inte såg förut. Hjärnan vänjer sig bara.`,
      },
      {
        title: 'Något som hjälpte mig',
        content: `Jag gillar inte att ge råd för det som fungerar för mig kanske inte fungerar för andra. Men en sak förändrade mitt spel: jag slutade leta efter långa ord.

Korta ord är roligare. Fler av dem, fler alternativ, och jag känner mig smartare när jag hittar tre ord på tre bokstäver än ett långt ord som jag hade tur med.`,
      },
      {
        content: `Erik klagar fortfarande på att jag fuskar. Förra gången sa han att jag har en "hemlig ordbok i huvudet." Jag sa att det inte är en ordbok, det är bara erfarenhet.

Han trodde mig inte. Kanske har han rätt.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    practiceNow: 'Fritt Spel',
    tryDaily: 'Dagens Utmaning',
  },
  ja: {
    title: 'いとこは僕がずるしてると言う',
    category: '視点',
    readTime: '読了時間：5分',
    sections: [
      {
        content: `ずるはしてない。彼が気づかないことに気づいているだけ。

いとこの健太は僕より多くの言葉を知っている。いつも本を読んでいる。仕事で長い文書を書いている。僕は見出しくらいしか読まない。

でも僕が勝つ。ほぼ毎回。`,
      },
      {
        title: '彼がわかっていないこと',
        content: `健太は言葉を探している。僕は形を探している。

文字の盤面を見るとき、僕は頭から言葉を思い出そうとしていない。繰り返されるものを探している。

最初に「お」を見たらすぐに他に何があるか確認する。最後に「ます」を見たらその前に何が来れるか探す。

全ての言葉を覚えることじゃない。もう知っているパターンを認識すること。`,
      },
      {
        title: '最初に僕がした間違い',
        content: `一度言葉を暗記しようとした。リストと一緒に座って、珍しい言葉を覚えた。そうやって勝つんだと思った。

次のゲームで何も覚えていなかった。僕の頭はそういう風に動かない。

うまくいくこと：たくさん遊ぶこと。ゲームを勉強するんじゃなくて、ゲームを遊ぶ。3回目か4回目のゲームで、前は見えなかったものが見え始める。脳は慣れるだけ。`,
      },
      {
        title: '僕に役立ったこと',
        content: `アドバイスを言うのは好きじゃない。僕にうまくいくことが他の人にうまくいくとは限らないから。でも一つだけゲームを変えたことがある：長い言葉を探すのをやめた。

短い言葉の方が楽しい。もっと多く見つかる、選択肢も多い、運で見つけた長い言葉より3文字の言葉を3つ見つける方が賢く感じる。`,
      },
      {
        content: `健太はまだ僕がずるしてると文句を言う。この前は「頭の中に隠し辞書がある」と言った。辞書じゃなくて、ただの経験だと言った。

信じてくれなかった。たぶん彼が正しいのかも。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    practiceNow: 'フリープレイ',
    tryDaily: 'デイリーチャレンジ',
  },
  es: {
    title: 'Mi primo dice que hago trampa en los juegos de palabras',
    category: 'Perspectiva',
    readTime: '5 min de lectura',
    sections: [
      {
        content: `No hago trampa. Simplemente noto cosas que él no nota.

Mi primo Carlos sabe más palabras que yo. Lee libros todo el tiempo. En el trabajo escribe documentos largos. Yo apenas leo más allá de los títulos.

Pero yo le gano. Casi siempre.`,
      },
      {
        title: 'Lo que él no entiende',
        content: `Carlos busca palabras. Yo busco formas.

Cuando miro un tablero de letras, no estoy tratando de recordar palabras de memoria. Busco cosas que se repiten.

Veo "DES" al principio e inmediatamente reviso qué más hay. Veo "CIÓN" al final y busco qué puede ir antes.

No se trata de recordar cada palabra. Se trata de reconocer patrones que ya conoces.`,
      },
      {
        title: 'El error que cometí al principio',
        content: `Una vez traté de memorizar palabras. Me senté con listas, aprendí palabras raras. Pensé que así se ganaba.

En el siguiente juego no recordé nada. Mi cabeza simplemente no funciona así.

Lo que sí funciona: jugar mucho. No estudiar juegos, jugar juegos. Para el tercer o cuarto juego empiezo a ver cosas que no veía antes. El cerebro simplemente se acostumbra.`,
      },
      {
        title: 'Algo que me ayudó',
        content: `No me gusta dar consejos porque lo que funciona para mí quizás no funcione para otros. Pero una cosa cambió mi juego: dejé de buscar palabras largas.

Las palabras cortas son más divertidas. Más de ellas, más opciones, y me siento más inteligente cuando encuentro tres palabras de tres letras que una palabra larga que me dio la suerte.`,
      },
      {
        content: `Carlos todavía se queja de que hago trampa. La última vez dijo que tengo un "diccionario escondido en la cabeza." Le dije que no es un diccionario, es solo experiencia.

No me creyó. Quizás tiene razón.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    practiceNow: 'Juego Libre',
    tryDaily: 'Desafío Diario',
  },
};

export default function ImproveSkillsPageClient(): React.ReactElement {
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
