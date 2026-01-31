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
    title: 'איך להשתפר במשחקי מילים: מה שבאמת עובד',
    category: 'טכניקות',
    readTime: 'זמן קריאה: 6 דקות',
    sections: [
      {
        content: `רוב האנשים חושבים שכדי להיות טוב במשחקי מילים צריך לשנן מילון. חוקרים שחקרו שחקני סקראבל מקצועיים גילו משהו אחר: הם משתמשים בחלקים אחרים של המוח - יותר תפיסה חזותית, פחות זיכרון. הנה מה שבאמת עובד.`,
      },
      {
        title: 'זיהוי דפוסים, לא שינון',
        content: `כששחקן מנוסה רואה את האותיות א-ב-ה-י-ת-ל, הוא לא סורק מילון בראש. הוא מזהה מבנים שמכיר - "ה" בהתחלה, "ית" בסוף, צירופים שמופיעים במילים עבריות.

איך מפתחים את זה? תרגול של חודש: כל מילה שאתם רואים במהלך היום - בשלטים, במאמרים, בכל מקום - ערבבו אותה מנטלית ואז סדרו מחדש. אחרי חודש, המוח מתחיל לארגן אותיות למבנים אפשריים אוטומטית.`,
      },
      {
        title: 'צירופי אותיות נפוצים',
        content: `בעברית, כמו בכל שפה, יש צירופים שמופיעים שוב ושוב. סיומות כמו "-ות", "-ים", "-ית" הן נקודות התחלה טובות. תחיליות כמו "ה-", "מ-", "ל-" מרחיבות אפשרויות.

טריק פרקטי: הפרידו את האותיות לעיצורים ותנועות. לפעמים קל יותר לראות מילים כשהן מסודרות אחרת.`,
      },
      {
        title: 'מילים קצרות קודם',
        content: `טעות נפוצה: לחפש את המילה הארוכה והמרשימה. בפועל, שלוש מילים של שלוש אותיות עדיפות על מילה אחת ארוכה שמצאתם במזל.

למה? (1) יש יותר מילים קצרות, אז יש יותר סיכוי למצוא אותן. (2) כל מילה שמצאתם משחררת לחץ ומשחררת את המוח לחפש עוד. (3) במשחקים עם ניקוד, מילים קצרות מרובות לפעמים שוות יותר.`,
      },
      {
        title: 'למה תרגול עובד יותר משינון',
        content: `מחקרים על שחקני סקראבל מקצועיים גילו שהם מסתמכים יותר על תפיסה חזותית מאשר על שליפה מזיכרון. המוח שלהם "רואה" מילים בתוך ערימת אותיות.

היכולת הזו מתפתחת רק דרך משחק. לא דרך קריאת רשימות מילים, אלא דרך חזרה על הפעולה של חיפוש מילים שוב ושוב. במשחק השלישי או הרביעי באותו יום, תתחילו לראות דברים שלא ראיתם קודם.`,
      },
      {
        title: 'טכניקת "הקריאה לאחור"',
        content: `נסו לקרוא את האותיות גם מהסוף להתחלה. לפעמים המוח "תקוע" בכיוון אחד, וקריאה הפוכה משחררת אותו. זו טכניקה שמשתמשים בה שחקנים מנוסים כשהם מרגישים שנתקעו.`,
      },
      {
        title: 'הזמן הכי טוב לשחק',
        content: `מחקרים על קוגניציה מראים שרוב האנשים חדים יותר בבוקר. אם אתם משחקים אתגר יומי, נסו לשחק בשעות הראשונות אחרי ההתעוררות.

גם מנוחה חשובה. אם אתם עייפים או לחוצים, המוח פחות יעיל בזיהוי דפוסים. לפעמים כדאי פשוט לחכות ליום אחר.`,
      },
      {
        content: `השורה התחתונה: אל תנסו להיות מילון מהלך. תנו למוח לפתח תפיסה חזותית של מילים דרך תרגול. זה לוקח זמן, אבל התוצאות מגיעות.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    practiceNow: 'משחק חופשי',
    tryDaily: 'אתגר יומי',
  },
  en: {
    title: 'How to Actually Get Better at Word Games',
    category: 'Techniques',
    readTime: '6 min read',
    sections: [
      {
        content: `Most people think being good at word games means memorizing a dictionary. Researchers who studied competitive Scrabble players discovered something different: they use different parts of their brains—more visual perception, less memory retrieval. Here's what actually works.`,
      },
      {
        title: 'Pattern Recognition, Not Memorization',
        content: `When an experienced player sees the letters AEILNST, they don't scan a mental dictionary. They recognize structures they know—common letter combinations, prefixes, suffixes.

How to develop this: One month of deliberate practice. Take any word you see during the day—on signs, in articles, anywhere—mentally scramble it, then unscramble it. Within a month, your brain starts automatically organizing letters into possible word structures.`,
      },
      {
        title: 'Common Letter Combinations',
        content: `In English, certain letters frequently appear together. Digraphs like TH, SH, CH, PH are what experts call "frequent flyers." Common endings like -ING, -ED, -TION help you spot longer words. Prefixes like RE-, UN-, DIS- expand possibilities.

Practical trick: Separate your letters into consonants and vowels. Sometimes it's easier to see words when they're arranged differently.`,
      },
      {
        title: 'Short Words First',
        content: `Common mistake: hunting for the long, impressive word. In practice, three 3-letter words beat one long word you found by luck.

Why? (1) There are more short words, so you're more likely to find them. (2) Each word you find releases pressure and frees your brain to search for more. (3) In scored games, multiple short words sometimes score higher.`,
      },
      {
        title: 'Why Practice Works Better Than Memorization',
        content: `Research on professional Scrabble players found they rely more on visual perception than memory retrieval. Their brains "see" words within piles of letters.

This ability develops only through play. Not through reading word lists, but through repeating the action of searching for words again and again. By the third or fourth game in the same session, you'll start seeing things you didn't notice before.`,
      },
      {
        title: 'The "Backward Reading" Technique',
        content: `Try reading the letters from end to beginning. Sometimes your brain gets "stuck" in one direction, and reverse reading unsticks it. This is a technique experienced players use when they feel blocked.`,
      },
      {
        title: 'Best Time to Play',
        content: `Cognitive research shows most people are sharpest in the morning. If you're playing a daily challenge, try playing in the first hours after waking.

Rest matters too. When you're tired or stressed, your brain is less efficient at pattern recognition. Sometimes it's better to just wait for another day.`,
      },
      {
        content: `Bottom line: Don't try to be a walking dictionary. Let your brain develop visual perception of words through practice. It takes time, but the results come.`,
      },
    ],
    backToBlog: 'Back to Blog',
    practiceNow: 'Free Play',
    tryDaily: 'Daily Challenge',
  },
  sv: {
    title: 'Hur du faktiskt blir bättre på ordspel',
    category: 'Tekniker',
    readTime: '6 min läsning',
    sections: [
      {
        content: `De flesta tror att man måste memorera en ordbok för att vara bra på ordspel. Forskare som studerade tävlings-Scrabble-spelare upptäckte något annat: de använder andra delar av hjärnan—mer visuell perception, mindre minnesåterkallning. Här är vad som faktiskt fungerar.`,
      },
      {
        title: 'Mönsterigenkänning, inte memorering',
        content: `När en erfaren spelare ser bokstäverna AEILNST scannar de inte en mental ordbok. De känner igen strukturer de vet om—vanliga bokstavskombinationer, prefix, suffix.

Hur utvecklar man detta: En månads medveten övning. Ta vilket ord som helst som du ser under dagen—på skyltar, i artiklar, var som helst—blanda det mentalt och lös det sedan. Inom en månad börjar din hjärna automatiskt organisera bokstäver till möjliga ordstrukturer.`,
      },
      {
        title: 'Vanliga bokstavskombinationer',
        content: `På svenska förekommer vissa bokstäver ofta tillsammans. Kombinationer som SK, ST, NG, ÖR är vad experter kallar "vanliga flyers." Vanliga ändelser som -ANDE, -TION, -HET hjälper dig hitta längre ord. Prefix som FÖR-, OM-, AV- utökar möjligheterna.

Praktiskt trick: Separera dina bokstäver i konsonanter och vokaler. Ibland är det lättare att se ord när de är arrangerade annorlunda.`,
      },
      {
        title: 'Korta ord först',
        content: `Vanligt misstag: jaga det långa, imponerande ordet. I praktiken slår tre trebokstavsord ett långt ord du hittade av tur.

Varför? (1) Det finns fler korta ord, så du hittar dem lättare. (2) Varje ord du hittar frigör press och låter hjärnan söka efter fler. (3) I spel med poäng ger flera korta ord ibland högre poäng.`,
      },
      {
        title: 'Varför övning fungerar bättre än memorering',
        content: `Forskning på professionella Scrabble-spelare fann att de förlitar sig mer på visuell perception än minnesåterkallning. Deras hjärnor "ser" ord i högar av bokstäver.

Denna förmåga utvecklas bara genom spel. Inte genom att läsa ordlistor, utan genom att upprepa handlingen att söka efter ord om och om igen. I det tredje eller fjärde spelet under samma session börjar du se saker du inte märkte förut.`,
      },
      {
        title: '"Bakåtläsning"-tekniken',
        content: `Försök läsa bokstäverna från slutet till början. Ibland fastnar hjärnan i en riktning, och omvänd läsning löser det. Detta är en teknik erfarna spelare använder när de känner sig blockerade.`,
      },
      {
        title: 'Bästa tiden att spela',
        content: `Kognitiv forskning visar att de flesta är skarpast på morgonen. Om du spelar en daglig utmaning, försök spela under de första timmarna efter uppvaknande.

Vila spelar också roll. När du är trött eller stressad är hjärnan mindre effektiv på mönsterigenkänning. Ibland är det bättre att bara vänta till en annan dag.`,
      },
      {
        content: `Slutsatsen: Försök inte vara en vandrande ordbok. Låt din hjärna utveckla visuell perception av ord genom övning. Det tar tid, men resultaten kommer.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    practiceNow: 'Fritt Spel',
    tryDaily: 'Dagens Utmaning',
  },
  ja: {
    title: '言葉ゲームで実際に上達する方法',
    category: 'テクニック',
    readTime: '読了時間：6分',
    sections: [
      {
        content: `ほとんどの人は、言葉ゲームが上手になるには辞書を暗記する必要があると思っています。競技スクラブルプレイヤーを研究した研究者は、違うことを発見しました：彼らは脳の異なる部分を使っている—記憶の呼び出しより視覚的知覚が多い。実際に効果があることを紹介します。`,
      },
      {
        title: '暗記ではなく、パターン認識',
        content: `経験豊富なプレイヤーがAEILNSTという文字を見た時、頭の中の辞書をスキャンしていません。知っている構造を認識しています—よくある文字の組み合わせ、接頭辞、接尾辞。

これを発達させる方法：1ヶ月の意図的な練習。日中に見かける言葉を—看板、記事、どこでも—頭の中で混ぜて、それから並べ替えてください。1ヶ月以内に、脳が自動的に文字を可能な単語構造に整理し始めます。`,
      },
      {
        title: 'よくある文字の組み合わせ',
        content: `日本語では、特定の文字がよく一緒に現れます。「です」「ます」「ない」などの語尾、「お」「ご」などの接頭語。これらはより長い言葉を見つけるのに役立ちます。

実践的なコツ：文字を子音と母音に分けてみてください。配置が違うと言葉が見えやすくなることがあります。`,
      },
      {
        title: '短い言葉を先に',
        content: `よくある間違い：長くて印象的な言葉を探すこと。実際には、運で見つけた長い言葉より、3文字の言葉を3つ見つける方がいいです。

なぜ？(1) 短い言葉は多いので、見つけやすい。(2) 見つけた言葉ごとにプレッシャーが解放され、脳がもっと探せるようになる。(3) スコア付きゲームでは、複数の短い言葉の方がスコアが高いことがある。`,
      },
      {
        title: '暗記より練習が効果的な理由',
        content: `プロのスクラブルプレイヤーの研究では、彼らは記憶の呼び出しより視覚的知覚に頼っていることがわかりました。彼らの脳は文字の山の中に言葉を「見る」のです。

この能力は遊ぶことでしか発達しません。単語リストを読むことではなく、言葉を探す行為を何度も繰り返すことです。同じセッションの3回目か4回目のゲームで、前は気づかなかったものが見え始めます。`,
      },
      {
        title: '「逆読み」テクニック',
        content: `文字を終わりから始まりまで読んでみてください。脳が一方向に「固まる」ことがあり、逆読みがそれを解消します。これは経験豊富なプレイヤーが行き詰まった時に使うテクニックです。`,
      },
      {
        title: 'プレイに最適な時間',
        content: `認知研究によると、ほとんどの人は朝が最も鋭いです。デイリーチャレンジをするなら、起床後の最初の数時間にプレイしてみてください。

休息も重要です。疲れていたりストレスを感じていると、脳のパターン認識効率が下がります。別の日を待った方がいいこともあります。`,
      },
      {
        content: `結論：歩く辞書になろうとしないでください。練習を通じて脳に言葉の視覚的知覚を発達させましょう。時間はかかりますが、結果は出ます。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    practiceNow: 'フリープレイ',
    tryDaily: 'デイリーチャレンジ',
  },
  es: {
    title: 'Cómo mejorar realmente en los juegos de palabras',
    category: 'Técnicas',
    readTime: '6 min de lectura',
    sections: [
      {
        content: `La mayoría piensa que para ser bueno en juegos de palabras hay que memorizar un diccionario. Investigadores que estudiaron jugadores competitivos de Scrabble descubrieron algo diferente: usan partes diferentes del cerebro—más percepción visual, menos recuperación de memoria. Esto es lo que realmente funciona.`,
      },
      {
        title: 'Reconocimiento de patrones, no memorización',
        content: `Cuando un jugador experimentado ve las letras AEILNST, no escanea un diccionario mental. Reconoce estructuras que conoce—combinaciones comunes de letras, prefijos, sufijos.

Cómo desarrollar esto: Un mes de práctica deliberada. Toma cualquier palabra que veas durante el día—en letreros, artículos, donde sea—revuélvela mentalmente y luego ordénala. En un mes, tu cerebro comenzará a organizar automáticamente las letras en posibles estructuras de palabras.`,
      },
      {
        title: 'Combinaciones comunes de letras',
        content: `En español, ciertas letras aparecen frecuentemente juntas. Terminaciones como -CIÓN, -MENTE, -ANDO son lo que los expertos llaman "viajeros frecuentes." Prefijos como DES-, RE-, PRE- expanden las posibilidades.

Truco práctico: Separa tus letras en consonantes y vocales. A veces es más fácil ver palabras cuando están ordenadas diferente.`,
      },
      {
        title: 'Palabras cortas primero',
        content: `Error común: buscar la palabra larga e impresionante. En la práctica, tres palabras de tres letras superan una palabra larga que encontraste por suerte.

¿Por qué? (1) Hay más palabras cortas, así que es más probable encontrarlas. (2) Cada palabra que encuentras libera presión y deja a tu cerebro buscar más. (3) En juegos con puntuación, múltiples palabras cortas a veces dan más puntos.`,
      },
      {
        title: 'Por qué la práctica funciona mejor que la memorización',
        content: `La investigación sobre jugadores profesionales de Scrabble encontró que dependen más de la percepción visual que de la recuperación de memoria. Sus cerebros "ven" palabras dentro de pilas de letras.

Esta habilidad se desarrolla solo a través del juego. No leyendo listas de palabras, sino repitiendo la acción de buscar palabras una y otra vez. Para el tercer o cuarto juego en la misma sesión, empezarás a ver cosas que no notabas antes.`,
      },
      {
        title: 'La técnica de "lectura inversa"',
        content: `Intenta leer las letras del final al principio. A veces el cerebro se "atasca" en una dirección, y la lectura inversa lo desbloquea. Esta es una técnica que usan jugadores experimentados cuando se sienten bloqueados.`,
      },
      {
        title: 'Mejor momento para jugar',
        content: `La investigación cognitiva muestra que la mayoría de las personas están más agudas por la mañana. Si juegas un desafío diario, intenta jugar en las primeras horas después de despertar.

El descanso también importa. Cuando estás cansado o estresado, tu cerebro es menos eficiente en el reconocimiento de patrones. A veces es mejor simplemente esperar otro día.`,
      },
      {
        content: `Conclusión: No intentes ser un diccionario andante. Deja que tu cerebro desarrolle percepción visual de palabras a través de la práctica. Toma tiempo, pero los resultados llegan.`,
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
