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
    title: 'אמא שלי חושבת שזה טוב למוח. אני לא בטוח',
    category: 'מחשבות',
    readTime: 'זמן קריאה: 3 דקות',
    sections: [
      {
        content: `"זה טוב למוח," אמא אמרה, כשראתה אותי משחק.

אני לא יודע אם זה נכון. אני גם לא יודע אם זה לא נכון.`,
      },
      {
        title: 'מה אני יודע',
        content: `כשאני משחק, אני לא חושב על עבודה. לא חושב על הרשימה הארוכה של דברים שאני צריך לעשות. לא חושב על המייל שלא עניתי עליו.

אני פשוט מחפש מילים.

זה משהו. אני לא יודע אם זה "טוב למוח" בצורה שאפשר למדוד, אבל זה משהו.`,
      },
      {
        title: 'מה אני לא יודע',
        content: `האם אני יהיה יותר חכם אם אמשיך לשחק? כנראה שלא.

האם אני ימנע דמנציה? אין לי מושג. אני לא חוקר.

ראיתי כותרות על מחקרים שאומרים כזה או אחר. לא קראתי אותם. אתם כנראה גם לא קראתם.`,
      },
      {
        title: 'מה אני חושב',
        content: `הדוד שלי משחק תשבצים כל יום מאז שפרש לפנסיה. הוא בן 78 ועדיין חד.

הדודה שלי מעולם לא פתרה תשבץ. היא בת 76 ועדיין חדה.

אולי המוח הוא יותר מסובך משיחק מילים יכול לפתור.`,
      },
      {
        content: `אני משחק כי זה כיף. לא כי אמא אמרה שזה טוב למוח.

אם בסוף זה גם עוזר למוח, יופי. ואם לא, לפחות נהניתי.

לא הכל צריך להיות "טוב לך". לפעמים דברים פשוט כיפיים.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  en: {
    title: "My mom thinks this is good for the brain. I'm not sure",
    category: 'Thoughts',
    readTime: '3 min read',
    sections: [
      {
        content: `"It's good for the brain," my mom said when she saw me playing.

I don't know if that's true. I also don't know if it's not true.`,
      },
      {
        title: 'What I do know',
        content: `When I play, I'm not thinking about work. Not thinking about the long list of things I need to do. Not thinking about the email I didn't reply to.

I'm just looking for words.

That's something. I don't know if it's "good for the brain" in a measurable way, but it's something.`,
      },
      {
        title: "What I don't know",
        content: `Will I be smarter if I keep playing? Probably not.

Will I prevent dementia? No idea. I'm not a researcher.

I've seen headlines about studies saying this or that. Haven't read them. You probably haven't either.`,
      },
      {
        title: 'What I think',
        content: `My uncle does crosswords every day since he retired. He's 78 and still sharp.

My aunt has never solved a crossword. She's 76 and still sharp.

Maybe the brain is more complicated than what a word game can solve.`,
      },
      {
        content: `I play because it's fun. Not because my mom said it's good for the brain.

If it turns out it also helps the brain, great. And if not, at least I enjoyed it.

Not everything needs to be "good for you". Sometimes things are just fun.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  sv: {
    title: 'Min mamma tror det är bra för hjärnan. Jag är inte säker',
    category: 'Tankar',
    readTime: '3 min läsning',
    sections: [
      {
        content: `"Det är bra för hjärnan," sa min mamma när hon såg mig spela.

Jag vet inte om det är sant. Jag vet heller inte om det inte är sant.`,
      },
      {
        title: 'Vad jag vet',
        content: `När jag spelar tänker jag inte på jobbet. Inte på den långa listan av saker jag behöver göra. Inte på mejlet jag inte svarat på.

Jag letar bara efter ord.

Det är något. Jag vet inte om det är "bra för hjärnan" på ett mätbart sätt, men det är något.`,
      },
      {
        title: 'Vad jag inte vet',
        content: `Kommer jag bli smartare om jag fortsätter spela? Förmodligen inte.

Kommer jag förebygga demens? Ingen aning. Jag är ingen forskare.

Jag har sett rubriker om studier som säger det ena eller andra. Har inte läst dem. Ni har förmodligen inte heller.`,
      },
      {
        title: 'Vad jag tror',
        content: `Min farbror gör korsord varje dag sedan han gick i pension. Han är 78 och fortfarande skarp.

Min moster har aldrig löst ett korsord. Hon är 76 och fortfarande skarp.

Kanske är hjärnan mer komplicerad än vad ett ordspel kan lösa.`,
      },
      {
        content: `Jag spelar för att det är kul. Inte för att min mamma sa att det är bra för hjärnan.

Om det visar sig att det också hjälper hjärnan, bra. Och om inte, åtminstone hade jag roligt.

Allt behöver inte vara "bra för dig". Ibland är saker bara roliga.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Dagens Utmaning',
    practice: 'Öva',
  },
  ja: {
    title: '母は脳に良いと思っている。私はわからない',
    category: '考え',
    readTime: '読了時間：3分',
    sections: [
      {
        content: `「脳にいいのよ」と母が言った、私がプレイしているのを見て。

それが本当かどうかわからない。本当じゃないかどうかもわからない。`,
      },
      {
        title: '私が知っていること',
        content: `プレイしている時、仕事のことを考えていない。やらなきゃいけないことの長いリストのことも。返事していないメールのことも。

ただ言葉を探している。

それは何かだ。「脳に良い」かどうか測れる方法でわからないけど、何かだ。`,
      },
      {
        title: '私が知らないこと',
        content: `プレイし続けたら賢くなる？たぶんならない。

認知症を予防できる？わからない。研究者じゃない。

これとかあれとか言う研究についての見出しを見たことはある。読んでいない。あなたもたぶん読んでいない。`,
      },
      {
        title: '私が思うこと',
        content: `叔父は退職してから毎日クロスワードをする。78歳でまだ頭がいい。

叔母はクロスワードを一度も解いたことがない。76歳でまだ頭がいい。

たぶん脳は言葉ゲームで解決できるより複雑なのかもしれない。`,
      },
      {
        content: `楽しいからプレイしている。母が脳に良いと言ったからじゃない。

もし結局脳にも良いなら、いいね。そうじゃなくても、少なくとも楽しんだ。

全てが「自分のためになる」必要はない。時々物事はただ楽しいだけ。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習',
  },
  es: {
    title: 'Mi mamá piensa que es bueno para el cerebro. No estoy seguro',
    category: 'Pensamientos',
    readTime: '3 min de lectura',
    sections: [
      {
        content: `"Es bueno para el cerebro," dijo mi mamá cuando me vio jugando.

No sé si eso es verdad. Tampoco sé si no es verdad.`,
      },
      {
        title: 'Lo que sí sé',
        content: `Cuando juego, no pienso en el trabajo. No pienso en la larga lista de cosas que tengo que hacer. No pienso en el correo que no contesté.

Solo busco palabras.

Eso es algo. No sé si es "bueno para el cerebro" de manera medible, pero es algo.`,
      },
      {
        title: 'Lo que no sé',
        content: `¿Seré más inteligente si sigo jugando? Probablemente no.

¿Prevendré la demencia? Ni idea. No soy investigador.

He visto titulares sobre estudios que dicen esto o aquello. No los he leído. Ustedes probablemente tampoco.`,
      },
      {
        title: 'Lo que pienso',
        content: `Mi tío hace crucigramas todos los días desde que se jubiló. Tiene 78 años y todavía está lúcido.

Mi tía nunca ha resuelto un crucigrama. Tiene 76 años y todavía está lúcida.

Tal vez el cerebro es más complicado de lo que un juego de palabras puede resolver.`,
      },
      {
        content: `Juego porque es divertido. No porque mi mamá dijo que es bueno para el cerebro.

Si resulta que también ayuda al cerebro, genial. Y si no, al menos me divertí.

No todo tiene que ser "bueno para ti". A veces las cosas simplemente son divertidas.`,
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
