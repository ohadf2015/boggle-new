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
    title: 'כתבתי מילה בשוודית על לוח אנגלית',
    category: 'לבד איתי',
    readTime: 'זמן קריאה: 3 דקות',
    sections: [
      {
        content: `זה קרה בערב שישי. ישבתי עם הלפטופ, משחק מילים באנגלית. ראיתי את האותיות L-A-N-D ומיד כתבתי את זה.

אבל משהו לא היה נכון. המשחק לא קיבל את המילה.

לקח לי כמה שניות להבין: LAND זו מילה אנגלית. אבל במוח שלי היא הייתה שוודית. כי בשוודית LAND זה "מדינה", לא "קרקע".`,
      },
      {
        title: 'מתי זה התחיל',
        content: `בחודשים האחרונים התחלתי לשחק בשלוש שפות. לא בגלל שיש לי איזה תוכנית מסודרת, אלא בגלל שהאפליקציה נתנה אפשרות ופשוט ניסיתי.

אנגלית כי זו השפה שאני הכי חזק בה.

שוודית כי גרתי שם שנתיים וזה כיף לחזור לזה.

יפנית כי... למה לא?`,
      },
      {
        title: 'הבלבול',
        content: `הדבר המוזר הוא שבהתחלה הרגשתי שאני מסתדר. אחרי שבועיים הכל התערבב.

יושב מול לוח שוודי ומחפש מילים יפניות. יושב מול לוח יפני ומחפש את "och" (וו בשוודית). המוח פשוט מחליט לבד באיזו שפה הוא נמצא.

אחי אמר לי שזה סימן שאני צריך לישון יותר. אולי הוא צודק.`,
      },
      {
        title: 'מה שגיליתי',
        content: `אחרי הרבה טעויות מביכות, משהו השתנה.

התחלתי לשים לב לדפוסים. לא כאילו "עכשיו אני לומד", אלא פשוט שמתי לב שמילים שוודיות נראות אחרת מאנגליות. שמילים יפניות יש להן מקצב מסוים.

זה כמו כשאתה שומע שיר ואתה יודע אם זה רוק או ג'אז בלי לחשוב על זה.`,
      },
      {
        content: `עכשיו אני משחק בעיקר באנגלית. שוודית בסופי שבוע. יפנית כשיש לי סבלנות.

עדיין כותב מילים בשפה הלא נכונה. עדיין מתבלבל בין LAND ל-LAND. אבל זה כבר פחות מרגיש כמו טעות ויותר כמו... משהו שקורה.

אני חושב שזה מה שמעניין במשחקים בכמה שפות. לא שאתה הופך לפוליגלוט. אתה פשוט רואה כמה השפה שלך עובדת אחרת משפות אחרות.

או שאני פשוט צריך לישון יותר. אחי כנראה צודק.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  en: {
    title: 'I wrote a Swedish word on an English board',
    category: 'Just me',
    readTime: '3 min read',
    sections: [
      {
        content: `It happened on a Friday night. Sitting with my laptop, playing words in English. I saw the letters L-A-N-D and typed it immediately.

But something was off. The game didn't accept the word.

Took me a few seconds to figure it out: LAND is an English word. But in my head it was Swedish. Because in Swedish, LAND means "country", not "ground".`,
      },
      {
        title: 'When it started',
        content: `Last few months I've been playing in three languages. Not because I have some organized plan. The app gave me the option and I just tried it.

English because it's my strongest language.

Swedish because I lived there for two years and it's fun to go back.

Japanese because... why not?`,
      },
      {
        title: 'The confusion',
        content: `The weird thing is that at first I felt like I was managing. After two weeks everything got mixed up.

Sitting in front of a Swedish board looking for Japanese words. Sitting in front of a Japanese board looking for "och" (and in Swedish). The brain just decides on its own which language it's in.

My brother told me it's a sign I need to sleep more. Maybe he's right.`,
      },
      {
        title: 'What I figured out',
        content: `After many embarrassing mistakes, something changed.

I started noticing patterns. Not like "now I'm learning", just noticed that Swedish words look different from English. That Japanese words have a certain rhythm.

It's like when you hear a song and you know if it's rock or jazz without thinking about it.`,
      },
      {
        content: `Now I play mostly in English. Swedish on weekends. Japanese when I have patience.

Still write words in the wrong language. Still confuse LAND with LAND. But it doesn't feel like a mistake anymore. More like... something that happens.

I think that's what's interesting about playing in multiple languages. Not that you become a polyglot. You just see how your language works differently from other languages.

Or I just need to sleep more. My brother is probably right.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  sv: {
    title: 'Jag skrev ett engelskt ord på en svensk bräda',
    category: 'Bara jag',
    readTime: '3 min läsning',
    sections: [
      {
        content: `Det hände en fredagskväll. Satt med laptopen, spelade ord på svenska. Jag såg bokstäverna K-I-N-D och skrev det direkt.

Men något var fel. Spelet accepterade inte ordet.

Det tog några sekunder att förstå: KIND är ett svenskt ord som betyder "kind" (i ansiktet). Men i mitt huvud var det engelska, som betyder "snäll".`,
      },
      {
        title: 'När det började',
        content: `De senaste månaderna har jag spelat på tre språk. Inte för att jag har någon organiserad plan. Appen gav mig möjligheten och jag testade bara.

Svenska för att det är mitt modersmål.

Engelska för att jag använder det varje dag på jobbet.

Japanska för att... varför inte?`,
      },
      {
        title: 'Förvirringen',
        content: `Det konstiga är att först kände jag att jag klarade det. Efter två veckor blev allt blandning.

Sitter framför en engelsk bräda och letar efter svenska ord. Sitter framför en japansk bräda och letar efter "the". Hjärnan bestämmer själv vilket språk den är i.

Min syster sa att det är ett tecken på att jag behöver sova mer. Kanske har hon rätt.`,
      },
      {
        title: 'Vad jag upptäckte',
        content: `Efter många pinsamma misstag ändrades något.

Jag började märka mönster. Inte som "nu lär jag mig", bara märkte att engelska ord ser annorlunda ut än svenska. Att japanska ord har en viss rytm.

Det är som när du hör en låt och du vet om det är rock eller jazz utan att tänka på det.`,
      },
      {
        content: `Nu spelar jag mest på svenska. Engelska på helger. Japanska när jag har tålamod.

Skriver fortfarande ord på fel språk. Blandar fortfarande KIND med KIND. Men det känns inte som ett misstag längre. Mer som... något som händer.

Jag tror det är det som är intressant med att spela på flera språk. Inte att du blir polyglott. Du ser bara hur ditt språk fungerar annorlunda än andra språk.

Eller så behöver jag bara sova mer. Min syster har förmodligen rätt.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Dagens Utmaning',
    practice: 'Öva',
  },
  ja: {
    title: '英語のボードにスウェーデン語を書いた',
    category: '独り言',
    readTime: '読了時間：3分',
    sections: [
      {
        content: `金曜日の夜だった。ラップトップで英語の単語ゲームをしていた。L-A-N-Dという文字を見て、すぐに入力した。

でも何かがおかしかった。ゲームがその単語を受け付けなかった。

理解するのに数秒かかった：LANDは英語の単語だ。でも頭の中ではスウェーデン語だった。スウェーデン語でLANDは「国」という意味だから。`,
      },
      {
        title: 'いつ始まったか',
        content: `最近の数ヶ月、3つの言語でプレイしている。計画があったわけじゃない。アプリにオプションがあって、試してみただけ。

英語は一番得意な言語だから。

スウェーデン語は2年住んでいたから、また触れるのが楽しい。

日本語は...なぜダメ？`,
      },
      {
        title: '混乱',
        content: `変なのは、最初はうまくいっていると思っていたこと。2週間後、全部が混ざった。

スウェーデン語のボードの前に座って日本語の単語を探している。日本語のボードの前に座って「och」（スウェーデン語の「と」）を探している。脳が勝手にどの言語にいるか決める。

兄がもっと寝る必要があると言った。たぶん正しい。`,
      },
      {
        title: '気づいたこと',
        content: `たくさんの恥ずかしい間違いの後、何かが変わった。

パターンに気づき始めた。「今学んでいる」というわけじゃなく、スウェーデン語の単語が英語と違って見えることに気づいた。日本語の単語には特定のリズムがあること。

曲を聴いて、考えなくてもロックかジャズかわかるのと同じ。`,
      },
      {
        content: `今は主に英語でプレイしている。週末はスウェーデン語。根気があるときは日本語。

まだ間違った言語で単語を書く。まだLANDとLANDを混同する。でももう間違いとは感じない。何というか...起こること。

複数の言語でプレイすることの面白さはこれだと思う。ポリグロットになるわけじゃない。自分の言語が他の言語とどう違うか見えるだけ。

それか、もっと寝る必要があるだけ。兄はたぶん正しい。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習',
  },
  es: {
    title: 'Escribí una palabra en sueco en un tablero en inglés',
    category: 'Solo yo',
    readTime: '3 min de lectura',
    sections: [
      {
        content: `Fue un viernes por la noche. Sentado con mi laptop, jugando palabras en inglés. Vi las letras L-A-N-D y las escribí inmediatamente.

Pero algo andaba mal. El juego no aceptó la palabra.

Me tomó unos segundos entender: LAND es una palabra en inglés. Pero en mi cabeza era sueca. Porque en sueco, LAND significa "país", no "tierra".`,
      },
      {
        title: 'Cuándo empezó',
        content: `Los últimos meses he estado jugando en tres idiomas. No porque tenga algún plan organizado. La app me dio la opción y simplemente probé.

Inglés porque es mi idioma más fuerte.

Sueco porque viví ahí dos años y es divertido volver.

Japonés porque... ¿por qué no?`,
      },
      {
        title: 'La confusión',
        content: `Lo raro es que al principio sentía que lo estaba manejando. Después de dos semanas todo se mezcló.

Sentado frente a un tablero sueco buscando palabras japonesas. Sentado frente a un tablero japonés buscando "och" (y en sueco). El cerebro decide solo en qué idioma está.

Mi hermana me dijo que es señal de que necesito dormir más. Tal vez tiene razón.`,
      },
      {
        title: 'Lo que descubrí',
        content: `Después de muchos errores vergonzosos, algo cambió.

Empecé a notar patrones. No como "ahora estoy aprendiendo", solo noté que las palabras suecas se ven diferentes de las inglesas. Que las palabras japonesas tienen cierto ritmo.

Es como cuando escuchas una canción y sabes si es rock o jazz sin pensarlo.`,
      },
      {
        content: `Ahora juego principalmente en inglés. Sueco los fines de semana. Japonés cuando tengo paciencia.

Todavía escribo palabras en el idioma equivocado. Todavía confundo LAND con LAND. Pero ya no se siente como un error. Más como... algo que pasa.

Creo que eso es lo interesante de jugar en varios idiomas. No que te vuelves políglota. Solo ves cómo tu idioma funciona diferente de otros idiomas.

O simplemente necesito dormir más. Mi hermana probablemente tiene razón.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    tryDaily: 'Desafío Diario',
    practice: 'Practicar',
  },
};

export default function MultilingualPageClient(): React.ReactElement {
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
              'bg-neo-orange text-white'
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
