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
    title: 'אני לא טוב באתגר היומי. עדיין משחק',
    category: 'סתם',
    readTime: 'זמן קריאה: 3 דקות',
    sections: [
      {
        content: `כל בוקר אני בודק את הדירוג שלי. בדרך כלל אני איפשהו באמצע. לפעמים יותר גרוע.

לא יודע למה אני ממשיך. זה לא שאני משתפר.`,
      },
      {
        title: 'דברים שניסיתי',
        content: `ניסיתי לשחק מהר יותר. סיימתי עם פחות מילים.

ניסיתי לשחק לאט יותר. נגמר לי הזמן.

ניסיתי לחפש מילים ארוכות. פספסתי עשר מילים קצרות.

ניסיתי לחפש רק מילים קצרות. כל השאר מצאו את המילים הארוכות.`,
      },
      {
        title: 'מה כן עובד לי',
        content: `בבוקר אני יותר טוב. אם אני משחק בלילה, הראש לא שם.

קפה עוזר. בלי קפה אני פספסתי מילה שהייתה ממש מול העיניים שלי.

אם אני לחוץ על משהו אחר, אני גרוע יותר. המשחק דורש שקט בראש.`,
      },
      {
        title: 'מה לא עובד לי',
        content: `"טיפים" מהאינטרנט. קראתי כמה. לא עזר.

לנסות להתחרות במישהו ספציפי. יש בחור שכל יום מסיים ראשון. לא יודע איך הוא עושה את זה. אני גם לא צריך לדעת.

לכעוס על עצמי. זה רק מחמיר.`,
      },
      {
        content: `יש אנשים שטובים בדברים האלה. אני לא. וזה בסדר.

אני לא משחק כדי לנצח. אני משחק כי יש לי עשר דקות פנויות בבוקר ואני לא רוצה לגלול באינסטגרם.

מחר אני אשחק שוב. כנראה אסיים באמצע. בסדר גמור.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  en: {
    title: "I'm not good at the daily challenge. Still playing",
    category: 'Whatever',
    readTime: '3 min read',
    sections: [
      {
        content: `Every morning I check my ranking. Usually somewhere in the middle. Sometimes worse.

Don't know why I keep going. It's not like I'm getting better.`,
      },
      {
        title: 'Things I tried',
        content: `Tried playing faster. Ended up with fewer words.

Tried playing slower. Ran out of time.

Tried looking for long words. Missed ten short ones.

Tried looking only for short words. Everyone else found the long ones.`,
      },
      {
        title: 'What does work for me',
        content: `I'm better in the morning. If I play at night, my head's not in it.

Coffee helps. Without coffee I missed a word that was right in front of me.

If I'm stressed about something else, I'm worse. The game needs a quiet head.`,
      },
      {
        title: "What doesn't work for me",
        content: `"Tips" from the internet. Read some. Didn't help.

Trying to compete with someone specific. There's a guy who finishes first every day. Don't know how he does it. Don't need to know either.

Getting angry at myself. Just makes it worse.`,
      },
      {
        content: `Some people are good at these things. I'm not. And that's fine.

I don't play to win. I play because I have ten minutes free in the morning and I don't want to scroll Instagram.

Tomorrow I'll play again. Probably finish in the middle. Totally fine.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  sv: {
    title: 'Jag är inte bra på dagliga utmaningen. Spelar fortfarande',
    category: 'Vadsomhelst',
    readTime: '3 min läsning',
    sections: [
      {
        content: `Varje morgon kollar jag min ranking. Vanligtvis någonstans i mitten. Ibland sämre.

Vet inte varför jag fortsätter. Det är inte som att jag blir bättre.`,
      },
      {
        title: 'Saker jag försökte',
        content: `Försökte spela snabbare. Slutade med färre ord.

Försökte spela långsammare. Tiden tog slut.

Försökte leta efter långa ord. Missade tio korta.

Försökte bara leta efter korta ord. Alla andra hittade de långa.`,
      },
      {
        title: 'Vad som fungerar för mig',
        content: `Jag är bättre på morgonen. Om jag spelar på kvällen är huvudet inte med.

Kaffe hjälper. Utan kaffe missade jag ett ord som var rakt framför mig.

Om jag är stressad över något annat är jag sämre. Spelet behöver ett lugnt huvud.`,
      },
      {
        title: 'Vad som inte fungerar för mig',
        content: `"Tips" från internet. Läste några. Hjälpte inte.

Att försöka konkurrera med någon specifik. Det finns en kille som slutar först varje dag. Vet inte hur han gör det. Behöver inte veta heller.

Att bli arg på mig själv. Gör det bara värre.`,
      },
      {
        content: `Vissa människor är bra på sånt här. Jag är inte det. Och det är okej.

Jag spelar inte för att vinna. Jag spelar för att jag har tio minuter ledigt på morgonen och jag vill inte scrolla Instagram.

Imorgon spelar jag igen. Kommer förmodligen sluta i mitten. Helt okej.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Dagens Utmaning',
    practice: 'Öva',
  },
  ja: {
    title: 'デイリーチャレンジは得意じゃない。それでもやってる',
    category: 'なんとなく',
    readTime: '読了時間：3分',
    sections: [
      {
        content: `毎朝ランキングをチェックする。だいたい真ん中あたり。もっと悪い時もある。

なぜ続けているかわからない。上手くなっているわけでもないし。`,
      },
      {
        title: '試したこと',
        content: `速くプレイしてみた。見つけた単語が少なくなった。

ゆっくりプレイしてみた。時間切れになった。

長い単語を探してみた。短い単語を10個見逃した。

短い単語だけ探してみた。みんな長い単語を見つけてた。`,
      },
      {
        title: '私に効くこと',
        content: `朝の方がいい。夜やると頭が働かない。

コーヒーは助かる。コーヒーなしで目の前にあった単語を見逃した。

他のことでストレスがあると、もっと悪い。ゲームには静かな頭が必要。`,
      },
      {
        title: '私に効かないこと',
        content: `ネットの「コツ」。いくつか読んだ。役に立たなかった。

特定の誰かと競おうとすること。毎日1位で終わる人がいる。どうやってるのかわからない。知る必要もない。

自分に怒ること。もっと悪くなるだけ。`,
      },
      {
        content: `こういうのが得意な人もいる。私はそうじゃない。それでいい。

勝つためにプレイしてるわけじゃない。朝10分時間があって、インスタをスクロールしたくないからプレイしてる。

明日もまたやる。たぶん真ん中あたりで終わる。全然問題ない。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習',
  },
  es: {
    title: 'No soy bueno en el desafío diario. Sigo jugando',
    category: 'Lo que sea',
    readTime: '3 min de lectura',
    sections: [
      {
        content: `Cada mañana reviso mi ranking. Generalmente en algún lugar del medio. A veces peor.

No sé por qué sigo. No es que esté mejorando.`,
      },
      {
        title: 'Cosas que intenté',
        content: `Intenté jugar más rápido. Terminé con menos palabras.

Intenté jugar más lento. Se me acabó el tiempo.

Intenté buscar palabras largas. Perdí diez cortas.

Intenté buscar solo palabras cortas. Todos los demás encontraron las largas.`,
      },
      {
        title: 'Qué sí funciona para mí',
        content: `Soy mejor en la mañana. Si juego en la noche, mi cabeza no está ahí.

El café ayuda. Sin café perdí una palabra que estaba justo frente a mí.

Si estoy estresado por otra cosa, soy peor. El juego necesita una cabeza tranquila.`,
      },
      {
        title: 'Qué no funciona para mí',
        content: `"Consejos" de internet. Leí algunos. No ayudaron.

Intentar competir con alguien específico. Hay un tipo que termina primero todos los días. No sé cómo lo hace. Tampoco necesito saber.

Enojarme conmigo mismo. Solo lo empeora.`,
      },
      {
        content: `Algunas personas son buenas en estas cosas. Yo no. Y está bien.

No juego para ganar. Juego porque tengo diez minutos libres en la mañana y no quiero estar en Instagram.

Mañana jugaré otra vez. Probablemente termine en el medio. Totalmente bien.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    tryDaily: 'Desafío Diario',
    practice: 'Practicar',
  },
};

export default function StrategiesPageClient(): React.ReactElement {
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
              'bg-neo-cyan text-neo-black'
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
