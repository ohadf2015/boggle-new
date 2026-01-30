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
    title: 'סבתא שלי ניצחה אותי במשחק מילים. עדיין לא התאוששתי.',
    subtitle: 'על מה שלמדתי כשהפסקתי לזלזל במשחקי מילים',
    category: 'דעה',
    readTime: 'זמן קריאה: 6 דקות',
    sections: [
      {
        content: `בשבת האחרונה סבתא שלי, בת 82, הביסה אותי במשחק מילים. לא סתם הביסה - מחקה את הרצפה איתי. היא שמה מילים שאני לא בטוח שאי פעם שמעתי. שאלתי אותה איפה היא למדה את המילה "צפדינה". היא אמרה "מה זה צפדינה? זו מילה רגילה."`,
      },
      {
        content: `אני עובד בהייטק. אני מבלה שעות מול מסך. אני קורא הרבה. והיא עדיין מנצחת. משהו פה לא הסתדר לי.`,
      },
      {
        title: 'מה שגיליתי כשחפרתי',
        content: `אז התחלתי לחפור. לא כי רציתי להוכיח משהו - סתם היה לי סקרני למה היא כל כך טובה.

מסתבר שסבתא לא סתם "משחקת משחקים". היא משחקת תשבצים כל בוקר כבר 40 שנה. זה לא תחביב, זה כמו להתקלח או לשתות קפה. חלק מהשגרה.

קראתי איפשהו שאנשים שמשחקים משחקי מילים באופן קבוע שומרים על הזיכרון שלהם יותר טוב. לא יודע כמה זה מדויק, אבל כשאני רואה את סבתא - משהו בזה נשמע הגיוני.`,
      },
      {
        title: 'הדבר עם המוח',
        content: `הרופא של סבתא אמר לה פעם להמשיך עם התשבצים. היא סיפרה לי את זה כאילו זה משעמם, אבל נשמע שזה לא טריוויאלי. היא בת 82 ועדיין זוכרת איפה שמתי את המפתחות שלי טוב ממני.

אני לא אומר שמשחקי מילים הם פלא רפואי. אני פשוט אומר שהיא עושה משהו נכון.`,
      },
      {
        title: 'מה שלמדתי',
        content: `התחלתי לשחק קצת כל יום. לא הרבה, עשר דקות פה ושם. בהתחלה הרגשתי טיפש - מילים שחשבתי שאני מכיר פתאום לא עלו לי. אחרי כמה שבועות שמתי לב שאני מוצא מילים מהר יותר. לא רק במשחק, גם כשאני מנסה להסביר משהו.

עדיין מפסיד לסבתא. אולי תמיד אפסיד לה.`,
      },
      {
        title: 'דבר אחד שהפתיע אותי',
        content: `חשבתי שמשחקי מילים זה בשביל אנשים מבוגרים. סבתות וסבים שיושבים בסלון. אבל הילדים שלי התחילו לשחק איתי, ופתאום יש לנו משהו לעשות ביחד שלא כולל מסכים.

הקטנה שלי, בת 9, מנצחת אותי לפעמים. אני לא יודע אם להיות גאה או מודאג.`,
      },
      {
        content: `אז ככה. אין לי מסקנות גדולות. סבתא עדיין האלופה. אני עדיין מנסה להשתפר. ואולי זה הכי טוב שאפשר לצפות.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    playDaily: 'אתגר יומי',
    startPracticing: 'תרגול',
  },
  en: {
    title: 'My grandmother beat me at a word game. I still haven\'t recovered.',
    subtitle: 'What I learned when I stopped dismissing word games',
    category: 'Opinion',
    readTime: '6 min read',
    sections: [
      {
        content: `Last Sunday my grandmother, 82, destroyed me at a word game. Not just beat me—completely wiped the floor with me. She put down words I'm not sure I've ever seen. I asked her where she learned "qoph." She said "What do you mean? It's just a letter."`,
      },
      {
        content: `I work in tech. I spend hours in front of screens. I read a lot. And she still wins. Something didn't add up.`,
      },
      {
        title: 'What I found when I dug around',
        content: `So I started looking into it. Not because I wanted to prove anything—I was just curious why she's so good at this.

Turns out my grandmother doesn't just "play games." She's been doing crosswords every morning for 40 years. It's not a hobby, it's like showering or drinking coffee. Part of the routine.

I read somewhere that people who play word games regularly keep their memory sharper. I don't know how accurate that is, but when I see my grandmother—something about it makes sense.`,
      },
      {
        title: 'The brain thing',
        content: `My grandmother's doctor once told her to keep doing crosswords. She told me this like it was boring, but it sounds like it wasn't trivial. She's 82 and still remembers where I put my keys better than I do.

I'm not saying word games are some medical miracle. I'm just saying she's doing something right.`,
      },
      {
        title: 'What I learned',
        content: `I started playing a bit every day. Not much, ten minutes here and there. At first I felt stupid—words I thought I knew suddenly wouldn't come to me. After a few weeks I noticed I was finding words faster. Not just in the game, also when I'm trying to explain something.

Still losing to grandma. Maybe I'll always lose to her.`,
      },
      {
        title: 'One thing that surprised me',
        content: `I thought word games were for older people. Grandmas and grandpas sitting in the living room. But my kids started playing with me, and suddenly we have something to do together that doesn't involve screens.

My 9-year-old beats me sometimes. I don't know whether to be proud or worried.`,
      },
      {
        content: `So there it is. I don't have big conclusions. Grandma is still the champion. I'm still trying to get better. And maybe that's the best we can hope for.`,
      },
    ],
    backToBlog: 'Back to Blog',
    playDaily: 'Daily Challenge',
    startPracticing: 'Practice',
  },
  sv: {
    title: 'Farmor slog mig i ordspel. Igen.',
    subtitle: 'Vad jag lärde mig när jag slutade underskatta ordspel',
    category: 'Personligt',
    readTime: '6 min läsning',
    sections: [
      {
        content: `Förra söndagen förlorade jag mot farmor i ordspel. Hon är 84. Jag är 35 och jobbar med datorer hela dagen. Hon lade ord som jag aldrig hört talas om. När jag frågade hur hon kunde "fjäsing" sa hon bara: "Det är en fisk. Alla vet det."`,
      },
      {
        content: `Jag har en känsla av att inte alla vet det.`,
      },
      {
        title: 'Farmors hemlighet',
        content: `Farmor gör korsord varje morgon. Har gjort det i typ 50 år. Det är inte som att hon sitter och pluggar ordlistor - hon bara gör det. Som att dricka kaffe eller läsa tidningen.

Hon säger att det håller huvudet igång. Jag brukar skämta om det, men hon minns saker jag glömde förra veckan. Kanske skrattar hon sist.`,
      },
      {
        title: 'Vad jag började göra',
        content: `Jag laddade ner ett ordspel på mobilen. Tänkte att jag skulle spela lite på tunnelbanan. Första veckan var pinsam - jag hittade nästan ingenting. Ord som borde vara lätta fastnade någonstans.

Efter några veckor blev det lättare. Inte för att jag lärt mig fler ord, utan för att hjärnan liksom... flöt bättre? Svårt att förklara. Men jag märker det även på jobbet när jag skriver mejl.`,
      },
      {
        title: 'Det oväntade',
        content: `Mina barn började spela med mig. De är 7 och 11. Sjuåringen hittar ibland ord jag missar helt. Det är lite surt, men också ganska kul.

Vi sitter och spelar efter middagen ibland. Ingen tävling, bara spel. Det händer inte så ofta att vi gör något tillsammans utan skärmar.`,
      },
      {
        content: `Farmor vinner fortfarande. Varje gång. Men nu förstår jag åtminstone varför.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    playDaily: 'Dagens Utmaning',
    startPracticing: 'Öva',
  },
  ja: {
    title: '祖母に言葉ゲームで負けた。まだ立ち直れていない。',
    subtitle: '言葉ゲームを軽く見ていた自分が学んだこと',
    category: '個人的な話',
    readTime: '読了時間：6分',
    sections: [
      {
        content: `先週の日曜日、85歳の祖母に言葉ゲームで完敗した。ただ負けたんじゃない。完全に叩きのめされた。聞いたこともないような言葉を次々と出してきた。「おばあちゃん、"鹹い"ってどこで覚えたの？」と聞いたら、「普通の言葉でしょ」と言われた。`,
      },
      {
        content: `私はIT企業で働いている。毎日パソコンの前にいる。本も読む。それでも負ける。何かがおかしい。`,
      },
      {
        title: '調べてみたこと',
        content: `気になって調べ始めた。別に何かを証明したかったわけじゃない。ただ、なぜこんなに強いのか知りたかった。

祖母は毎朝クロスワードをやっている。もう40年以上続けているらしい。趣味というより、歯を磨くのと同じ。習慣。

言葉ゲームを続けている人は記憶力が落ちにくいという話をどこかで読んだ。本当かどうかわからないけど、祖母を見ていると、なんとなく納得してしまう。`,
      },
      {
        title: '脳のこと',
        content: `祖母の主治医が「クロスワードを続けなさい」と言ったらしい。祖母はつまらなそうに話していたけど、大事なことみたいだ。85歳で、私が鍵をどこに置いたか、私より覚えている。

言葉ゲームが何かの奇跡だとは言わない。ただ、祖母は何か正しいことをしている。`,
      },
      {
        title: '自分で試してみた',
        content: `毎日少しだけ遊ぶようになった。10分くらい。最初は自分の語彙力のなさにがっかりした。知っているはずの言葉が出てこない。

数週間経って、言葉が出てくるのが早くなった気がする。ゲームの中だけじゃなく、仕事でメールを書くときも。

まだ祖母には勝てない。たぶん一生勝てない。`,
      },
      {
        title: '意外だったこと',
        content: `言葉ゲームは年配の人のものだと思っていた。でも子供たちと一緒に遊ぶようになった。9歳の娘が時々私に勝つ。嬉しいような、悔しいような。

画面を使わない遊びを家族でするのは久しぶりだった。`,
      },
      {
        content: `結局、大した結論はない。祖母はまだチャンピオン。私はまだ練習中。それでいいのかもしれない。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    playDaily: 'デイリーチャレンジ',
    startPracticing: '練習する',
  },
  es: {
    title: 'Mi abuela me ganó en un juego de palabras. Todavía no me recupero.',
    subtitle: 'Lo que aprendí cuando dejé de subestimar los juegos de palabras',
    category: 'Personal',
    readTime: '6 min de lectura',
    sections: [
      {
        content: `El domingo pasado mi abuela de 83 años me destruyó en un juego de palabras. No solo me ganó—me barrió el piso. Puso palabras que nunca había visto. Le pregunté dónde aprendió "zahúrda." Me dijo "¿Cómo que dónde? Es una palabra normal."`,
      },
      {
        content: `Trabajo en tecnología. Paso horas frente a pantallas. Leo mucho. Y ella sigue ganando. Algo no cuadraba.`,
      },
      {
        title: 'Lo que descubrí',
        content: `Empecé a investigar. No porque quisiera probar algo—solo tenía curiosidad de por qué es tan buena.

Resulta que mi abuela no solo "juega juegos." Hace crucigramas cada mañana desde hace 45 años. No es un pasatiempo, es como ducharse o tomar café. Parte de la rutina.

Leí en algún lado que las personas que juegan juegos de palabras regularmente mantienen mejor la memoria. No sé qué tan preciso sea, pero cuando veo a mi abuela—tiene sentido.`,
      },
      {
        title: 'Lo del cerebro',
        content: `El médico de mi abuela le dijo una vez que siguiera con los crucigramas. Me lo contó como si fuera aburrido, pero parece que no era trivial. Tiene 83 y todavía recuerda dónde dejé mis llaves mejor que yo.

No digo que los juegos de palabras sean un milagro médico. Solo digo que ella está haciendo algo bien.`,
      },
      {
        title: 'Lo que aprendí',
        content: `Empecé a jugar un poco cada día. No mucho, diez minutos por aquí y por allá. Al principio me sentí tonto—palabras que creía conocer de repente no me salían. Después de unas semanas noté que encontraba palabras más rápido. No solo en el juego, también cuando intento explicar algo.

Todavía pierdo contra la abuela. Quizás siempre pierda contra ella.`,
      },
      {
        title: 'Algo que me sorprendió',
        content: `Pensaba que los juegos de palabras eran para gente mayor. Abuelas y abuelos sentados en la sala. Pero mis hijos empezaron a jugar conmigo, y de repente tenemos algo que hacer juntos que no involucra pantallas.

Mi hija de 9 años me gana a veces. No sé si estar orgulloso o preocupado.`,
      },
      {
        content: `Así que eso es todo. No tengo grandes conclusiones. La abuela sigue siendo la campeona. Yo sigo intentando mejorar. Y quizás eso es lo mejor que podemos esperar.`,
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
