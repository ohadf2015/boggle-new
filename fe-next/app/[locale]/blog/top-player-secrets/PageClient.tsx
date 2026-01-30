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
    title: 'למה אני מפסידה לאבא שלי כל פעם',
    category: 'מחשבות',
    readTime: 'זמן קריאה: 4 דקות',
    sections: [
      {
        content: `אבא שלי בן 67. הוא גמלאי. הוא לא היה טוב בבית ספר, לפי מה שהוא מספר. ועדיין, כל שישי כשאנחנו יושבים לשחק, הוא מנצח.

לא תמיד. אבל לפחות שבע מתוך עשר פעמים.`,
      },
      {
        title: 'מה שמתעצבן אותי',
        content: `הוא לא מתאמץ. לא נראה לי שהוא מתאמץ.

אני יושבת ומחפשת, סורקת את הלוח, מנסה למצוא מילים ארוכות. הוא מסתכל, שם מילה, מסתכל שוב, שם עוד מילה. בלי לחץ.

פעם שאלתי אותו איך הוא עושה את זה. הוא אמר "אני לא יודע. אני פשוט רואה אותן."

לא עזר לי בכלום.`,
      },
      {
        title: 'מה שמתי לב אליו',
        content: `אז התחלתי לצפות בו במקום לשחק. שם לב שהוא לא מחפש מילים כמוני. הוא מחפש... חלקים. קטעים של מילים.

הוא רואה "על" ומיד מחפש מה יכול לבוא לפני או אחרי. הוא לא מנסה לראות את כל המילה בבת אחת.

אני חושבת שזה כמו לקרוא ספר. בהתחלה קוראים אות אות. אחר כך מילה מילה. ואז פשוט רואים משפטים שלמים. הוא בשלב של משפטים, אני עדיין במילים.`,
      },
      {
        title: 'מה שלא עובד לי',
        content: `ניסיתי לעשות כמוהו. לא עובד. אני לא הוא.

מה שכן עובד לי: לשחק בלי לחץ. כשאני מודאגת מלנצח, אני מפסידה יותר. כשאני פשוט משחקת, מוצאת מילים שלא ראיתי קודם.

אבא אומר שזה כי הוא כבר לא צריך להוכיח כלום. אולי הוא צודק.`,
      },
      {
        content: `עדיין מפסידה לו. אבל עכשיו לפחות אני יודעת למה.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  en: {
    title: 'Why I keep losing to my dad',
    category: 'Thoughts',
    readTime: '4 min read',
    sections: [
      {
        content: `My dad is 67. He's retired. He wasn't good at school, by his own account. And yet, every Sunday when we sit down to play, he wins.

Not always. But at least seven times out of ten.`,
      },
      {
        title: 'What frustrates me',
        content: `He doesn't seem to try. It doesn't look like he's trying.

I sit there searching, scanning the board, trying to find long words. He looks, places a word, looks again, places another word. No pressure.

Once I asked him how he does it. He said "I don't know. I just see them."

That didn't help me at all.`,
      },
      {
        title: 'What I noticed',
        content: `So I started watching him instead of playing. I noticed he doesn't look for words like I do. He looks for... pieces. Fragments of words.

He sees "RE" and immediately looks for what can come before or after. He doesn't try to see the whole word at once.

I think it's like reading a book. At first you read letter by letter. Then word by word. And then you just see whole sentences. He's at the sentence stage, I'm still at words.`,
      },
      {
        title: 'What doesn\'t work for me',
        content: `I tried to do what he does. Doesn't work. I'm not him.

What does work for me: playing without pressure. When I'm worried about winning, I lose more. When I just play, I find words I didn't see before.

Dad says it's because he doesn't need to prove anything anymore. Maybe he's right.`,
      },
      {
        content: `I still lose to him. But now at least I know why.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  sv: {
    title: 'Varför jag alltid förlorar mot min pappa',
    category: 'Tankar',
    readTime: '4 min läsning',
    sections: [
      {
        content: `Min pappa är 67. Han är pensionär. Han var inte bra i skolan, enligt honom själv. Ändå, varje söndag när vi spelar, vinner han.

Inte alltid. Men minst sju gånger av tio.`,
      },
      {
        title: 'Vad som frustrerar mig',
        content: `Han verkar inte försöka. Det ser inte ut som om han anstränger sig.

Jag sitter och söker, skannar brädet, försöker hitta långa ord. Han tittar, lägger ett ord, tittar igen, lägger ett annat ord. Ingen press.

En gång frågade jag hur han gör det. Han sa "Jag vet inte. Jag bara ser dem."

Det hjälpte mig inte alls.`,
      },
      {
        title: 'Vad jag märkte',
        content: `Så jag började titta på honom istället för att spela. Jag märkte att han inte letar efter ord som jag gör. Han letar efter... bitar. Delar av ord.

Han ser "FÖR" och tittar direkt efter vad som kan komma före eller efter. Han försöker inte se hela ordet på en gång.

Jag tror det är som att läsa en bok. Först läser man bokstav för bokstav. Sen ord för ord. Och sen ser man bara hela meningar. Han är på meningsstadiet, jag är fortfarande på ord.`,
      },
      {
        title: 'Vad som inte fungerar för mig',
        content: `Jag försökte göra som han. Fungerar inte. Jag är inte han.

Vad som fungerar för mig: spela utan press. När jag oroar mig för att vinna, förlorar jag mer. När jag bara spelar, hittar jag ord jag inte såg förut.

Pappa säger att det är för att han inte behöver bevisa något längre. Kanske har han rätt.`,
      },
      {
        content: `Jag förlorar fortfarande mot honom. Men nu vet jag åtminstone varför.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Dagens Utmaning',
    practice: 'Öva',
  },
  ja: {
    title: 'なぜ父にいつも負けるのか',
    category: '考察',
    readTime: '読了時間：4分',
    sections: [
      {
        content: `父は67歳。定年退職している。本人曰く、学校では優秀じゃなかったらしい。それでも、毎週日曜日に遊ぶと、彼が勝つ。

いつもじゃない。でも10回中7回は。`,
      },
      {
        title: 'イライラすること',
        content: `父は頑張っているように見えない。

私は座って探す。盤面をスキャンして、長い言葉を見つけようとする。父は見て、言葉を置いて、また見て、また言葉を置く。プレッシャーがない。

一度、どうやっているのか聞いた。「わからない。ただ見えるんだ」と言われた。

全然参考にならなかった。`,
      },
      {
        title: '気づいたこと',
        content: `だから遊ぶ代わりに父を観察し始めた。父は私のように言葉を探していないことに気づいた。探しているのは...パーツ。言葉の断片。

「お」を見たら、すぐに前後に何が来れるか探している。言葉全体を一度に見ようとしていない。

本を読むのと同じだと思う。最初は一文字ずつ読む。次に一語ずつ。そして文全体が見えるようになる。父は文の段階、私はまだ単語の段階。`,
      },
      {
        title: 'うまくいかないこと',
        content: `父と同じようにやってみた。うまくいかない。私は父じゃない。

うまくいくこと：プレッシャーなしで遊ぶこと。勝つことを心配すると、もっと負ける。ただ遊ぶと、見えなかった言葉が見つかる。

父は「もう何も証明する必要がないからだ」と言う。たぶん正しい。`,
      },
      {
        content: `まだ父に負けている。でも少なくとも理由がわかった。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習',
  },
  es: {
    title: 'Por qué siempre pierdo contra mi papá',
    category: 'Reflexiones',
    readTime: '4 min de lectura',
    sections: [
      {
        content: `Mi papá tiene 67 años. Está jubilado. No era bueno en la escuela, según él. Y aun así, cada domingo cuando nos sentamos a jugar, él gana.

No siempre. Pero al menos siete de cada diez veces.`,
      },
      {
        title: 'Lo que me frustra',
        content: `No parece que se esfuerce. No se ve como si estuviera intentando.

Yo me siento buscando, escaneando el tablero, tratando de encontrar palabras largas. Él mira, pone una palabra, mira de nuevo, pone otra palabra. Sin presión.

Una vez le pregunté cómo lo hace. Me dijo "No sé. Simplemente las veo."

Eso no me ayudó en nada.`,
      },
      {
        title: 'Lo que noté',
        content: `Así que empecé a observarlo en lugar de jugar. Noté que no busca palabras como yo. Busca... pedazos. Fragmentos de palabras.

Ve "DES" e inmediatamente busca qué puede venir antes o después. No intenta ver la palabra completa de una vez.

Creo que es como leer un libro. Al principio lees letra por letra. Luego palabra por palabra. Y después simplemente ves oraciones completas. Él está en la etapa de oraciones, yo todavía en palabras.`,
      },
      {
        title: 'Lo que no funciona para mí',
        content: `Traté de hacer lo que él hace. No funciona. No soy él.

Lo que sí funciona para mí: jugar sin presión. Cuando me preocupo por ganar, pierdo más. Cuando simplemente juego, encuentro palabras que no veía antes.

Papá dice que es porque ya no tiene nada que probar. Quizás tenga razón.`,
      },
      {
        content: `Todavía le pierdo. Pero ahora al menos sé por qué.`,
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
