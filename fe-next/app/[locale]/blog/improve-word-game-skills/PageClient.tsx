'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

// Multilingual content structure
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
    title: 'איך לשפר את כישורי משחקי המילים שלך',
    category: 'אסטרטגיה',
    readTime: 'זמן קריאה: 8 דקות',
    intro: 'בין אם אתם שחקן מזדמן או חובב משחקי מילים תחרותי, תמיד יש מקום לשיפור. המדריך הזה חושף אסטרטגיות מנוסות שהשחקנים המובילים משתמשים בהן כדי לשלוט במשחקי מילים כמו LexiClash.',
    sections: [
      {
        title: '1. בנה את היסוד: הרחבת אוצר המילים',
        content: 'האספקט הברור ביותר - אך לעתים קרובות מוזנח - של משחקי מילים הוא אוצר המילים. אתם לא יכולים למצוא מילים שאתם לא יודעים שקיימות. תתמקדו בלמידת מילים קצרות (2-3 אותיות), שורשי מילים, וקטגוריות בעלות ערך גבוה.',
      },
      {
        title: '2. שלוט בזיהוי דפוסים',
        content: 'שחקנים מומחים לא רואים אותיות אקראיות - הם רואים דפוסים. למדו לזהות קידומות נפוצות (כמו ב-, ל-, מ-) וסופיות (-ים, -ות, -ה) שמופיעות שוב ושוב.',
      },
      {
        title: '3. פתח חשיבה אסטרטגית',
        content: 'משחקי מילים זה לא רק אוצר מילים - זה אסטרטגיה. חשבו כמה מהלכים קדימה, נהלו את האותיות שלכם בחכמה, ותנהלו את הזמן ביעילות.',
      },
      {
        title: '4. תרגל בכוונה',
        content: 'תרגול אקראי עוזר, אבל תרגול מכוון משנה את המשחק שלכם. השתמשו באתגרים היומיים, נתחו טעויות, ותתמקדו בתרגילים ממוקדים על החולשות שלכם.',
      },
      {
        title: '5. למד משחקנים טובים יותר',
        content: 'אתם משתפרים הכי מהר על ידי לימוד מאלו שלפניכם. צפו במשחקים תחרותיים, הצטרפו לקהילות, ואל תפחדו לשאול שאלות.',
      },
      {
        title: '6. הישאר בכושר מנטלי',
        content: 'המצב המנטלי שלכם משפיע באופן דרמטי על הביצועים. שחקו כשאתם רעננים, קחו הפסקות, הישארו מהודרטים, ואל תיכנסו למשחק מתוך תסכול.',
      },
    ],
    cta: {
      title: 'תוכנית הפעולה שלכם',
      content: 'שיפור לא קורה בן לילה, אבל הוא קורה עם מאמץ עקבי. שבוע 1-2: למדו 10 מילים חדשות של 2-3 אותיות ביום. שבוע 3-4: התמקדו בזיהוי דפוסים. שבוע 5-8: שחקו אתגרים יומיים באופן עקבי.',
    },
    footer: 'זכרו: כל מומחה היה פעם מתחיל. ההבדל הוא שהם המשיכו לשחק, המשיכו ללמוד, והמשיכו להשתפר. המסע שלכם לשליטה במשחקי מילים מתחיל במשחק אחד. למה לא עכשיו?',
    backToBlog: 'חזרה לבלוג',
    practiceNow: 'תרגל עכשיו',
    tryDaily: 'נסה אתגר יומי',
  },
  en: {
    title: 'How to Improve Your Word Game Skills',
    category: 'Strategy',
    readTime: '8 min read',
    intro: 'Whether you\'re a casual player or a competitive word game enthusiast, there\'s always room to improve. This guide shares battle-tested strategies that top players use to dominate word games like LexiClash.',
    sections: [
      {
        title: '1. Build Your Foundation: Vocabulary Expansion',
        content: 'The most obvious—yet often neglected—aspect of word games is vocabulary. You can\'t find words you don\'t know exist. Focus on learning short words (2-3 letters), word roots, and high-value categories.',
      },
      {
        title: '2. Master Pattern Recognition',
        content: 'Expert players don\'t see random letters—they see patterns. Learn to recognize common prefixes (UN-, RE-, IN-) and suffixes (-ING, -ED, -ER) that appear repeatedly.',
      },
      {
        title: '3. Develop a Strategic Mindset',
        content: 'Word games aren\'t just about vocabulary—they\'re about strategy. Think several moves ahead, manage your letters wisely, and use your time efficiently.',
      },
      {
        title: '4. Practice Deliberately',
        content: 'Random practice helps, but deliberate practice transforms your game. Use daily challenges, analyze mistakes, and focus on targeted drills for your weaknesses.',
      },
      {
        title: '5. Learn from Better Players',
        content: 'You improve fastest by studying those ahead of you. Watch competitive games, join communities, and don\'t be afraid to ask questions.',
      },
      {
        title: '6. Stay Mentally Sharp',
        content: 'Your mental state dramatically affects performance. Play when you\'re fresh, take breaks, stay hydrated, and don\'t play when tilted.',
      },
    ],
    cta: {
      title: 'Your Action Plan',
      content: 'Improvement doesn\'t happen overnight, but it does happen with consistent effort. Week 1-2: Learn 10 new 2-3 letter words daily. Week 3-4: Focus on pattern recognition. Week 5-8: Play daily challenges consistently.',
    },
    footer: 'Remember: every expert was once a beginner. The difference is they kept playing, kept learning, and kept improving. Your journey to word game mastery starts with a single game. Why not make it right now?',
    backToBlog: 'Back to Blog',
    practiceNow: 'Practice Now',
    tryDaily: 'Try Daily Challenge',
  },
  sv: {
    title: 'Hur du Förbättrar dina Ordspelsförmågor',
    category: 'Strategi',
    readTime: '8 min läsning',
    intro: 'Oavsett om du är en casual-spelare eller en tävlingsinriktad ordspelsentusiast finns det alltid utrymme för förbättring. Den här guiden delar stridstestade strategier som toppspelare använder för att dominera ordspel som LexiClash.',
    sections: [
      {
        title: '1. Bygg din Grund: Ordförrådsexpansion',
        content: 'Den mest uppenbara—men ofta försummade—aspekten av ordspel är ordförråd. Du kan inte hitta ord du inte vet finns. Fokusera på att lära dig korta ord (2-3 bokstäver), ordrötter och högvärdeskategorier.',
      },
      {
        title: '2. Bemästra Mönsterigenkänning',
        content: 'Expertspelare ser inte slumpmässiga bokstäver—de ser mönster. Lär dig känna igen vanliga prefix (O-, Å-, FÖR-) och suffix (-ING, -AD, -ARE) som dyker upp upprepade gånger.',
      },
      {
        title: '3. Utveckla ett Strategiskt Tänkande',
        content: 'Ordspel handlar inte bara om ordförråd—det handlar om strategi. Tänk flera drag framåt, hantera dina bokstäver klokt och använd din tid effektivt.',
      },
      {
        title: '4. Träna Medvetet',
        content: 'Slumpmässig träning hjälper, men medveten träning transformerar ditt spel. Använd dagliga utmaningar, analysera misstag och fokusera på riktade övningar för dina svagheter.',
      },
      {
        title: '5. Lär av Bättre Spelare',
        content: 'Du förbättras snabbast genom att studera de som ligger före dig. Titta på tävlingsspel, gå med i communities och var inte rädd för att ställa frågor.',
      },
      {
        title: '6. Håll dig Mentalt Skarp',
        content: 'Ditt mentala tillstånd påverkar prestationen dramatiskt. Spela när du är pigg, ta pauser, håll dig hydrerad och spela inte när du är frustrerad.',
      },
    ],
    cta: {
      title: 'Din Handlingsplan',
      content: 'Förbättring sker inte över natten, men det sker med konsekvent ansträngning. Vecka 1-2: Lär dig 10 nya 2-3 bokstavsord dagligen. Vecka 3-4: Fokusera på mönsterigenkänning. Vecka 5-8: Spela dagliga utmaningar konsekvent.',
    },
    footer: 'Kom ihåg: varje expert var en gång nybörjare. Skillnaden är att de fortsatte spela, fortsatte lära sig och fortsatte förbättras. Din resa till ordspelsmästerskap börjar med ett enda spel. Varför inte göra det just nu?',
    backToBlog: 'Tillbaka till Bloggen',
    practiceNow: 'Öva Nu',
    tryDaily: 'Prova Daglig Utmaning',
  },
  ja: {
    title: '言葉ゲームのスキルを向上させる方法',
    category: '戦略',
    readTime: '読了時間：8分',
    intro: 'カジュアルプレイヤーでも競技志向の言葉ゲーム愛好家でも、常に改善の余地があります。このガイドでは、トッププレイヤーがLexiClashのような言葉ゲームを支配するために使用する実戦テスト済みの戦略を共有します。',
    sections: [
      {
        title: '1. 基礎を築く：語彙の拡大',
        content: '最も明白でありながら、しばしば無視される言葉ゲームの側面は語彙です。存在を知らない言葉は見つけられません。短い言葉（2〜3文字）、語根、および高価値カテゴリの学習に焦点を当ててください。',
      },
      {
        title: '2. パターン認識をマスターする',
        content: 'エキスパートプレイヤーはランダムな文字を見ません—彼らはパターンを見ます。繰り返し現れる一般的な接頭辞（不-、再-、未-）と接尾辞（-的、-性、-化）を認識することを学びましょう。',
      },
      {
        title: '3. 戦略的思考を発展させる',
        content: '言葉ゲームは語彙だけではありません—戦略の問題です。数手先を考え、文字を賢く管理し、時間を効率的に使用してください。',
      },
      {
        title: '4. 意図的に練習する',
        content: 'ランダムな練習は役立ちますが、意図的な練習があなたのゲームを変革します。デイリーチャレンジを使用し、ミスを分析し、弱点に対する的を絞った訓練に集中してください。',
      },
      {
        title: '5. より良いプレイヤーから学ぶ',
        content: 'あなたより先を行く人々を研究することで、最も速く改善します。競技ゲームを観戦し、コミュニティに参加し、質問することを恐れないでください。',
      },
      {
        title: '6. メンタルを鋭く保つ',
        content: 'あなたのメンタル状態はパフォーマンスに劇的な影響を与えます。新鮮なときにプレイし、休憩を取り、水分補給を保ち、傾いているときにプレイしないでください。',
      },
    ],
    cta: {
      title: 'あなたの行動計画',
      content: '改善は一夜にして起こるものではありませんが、一貫した努力で起こります。第1〜2週：毎日新しい2〜3文字の単語を10個学びます。第3〜4週：パターン認識に焦点を当てます。第5〜8週：デイリーチャレンジを一貫してプレイします。',
    },
    footer: '覚えておいてください：すべてのエキスパートはかつて初心者でした。違いは、彼らがプレイし続け、学び続け、改善し続けたことです。言葉ゲームマスタリーへのあなたの旅は1つのゲームから始まります。今すぐ始めてみませんか？',
    backToBlog: 'ブログに戻る',
    practiceNow: '今すぐ練習',
    tryDaily: 'デイリーチャレンジを試す',
  },
  es: {
    title: 'Cómo Mejorar tus Habilidades en Juegos de Palabras',
    category: 'Estrategia',
    readTime: '8 min de lectura',
    intro: 'Ya seas un jugador casual o un entusiasta competitivo de juegos de palabras, siempre hay espacio para mejorar. Esta guía comparte estrategias probadas en batalla que los mejores jugadores usan para dominar juegos de palabras como LexiClash.',
    sections: [
      {
        title: '1. Construye tu Base: Expansión de Vocabulario',
        content: 'El aspecto más obvio, pero a menudo descuidado, de los juegos de palabras es el vocabulario. No puedes encontrar palabras que no sabes que existen. Concéntrate en aprender palabras cortas (2-3 letras), raíces de palabras y categorías de alto valor.',
      },
      {
        title: '2. Domina el Reconocimiento de Patrones',
        content: 'Los jugadores expertos no ven letras al azar, ven patrones. Aprende a reconocer prefijos comunes (DES-, RE-, IN-) y sufijos (-CIÓN, -MENTE, -DAD) que aparecen repetidamente.',
      },
      {
        title: '3. Desarrolla una Mentalidad Estratégica',
        content: 'Los juegos de palabras no se tratan solo de vocabulario, se tratan de estrategia. Piensa varios movimientos por adelantado, administra tus letras sabiamente y usa tu tiempo de manera eficiente.',
      },
      {
        title: '4. Practica Deliberadamente',
        content: 'La práctica aleatoria ayuda, pero la práctica deliberada transforma tu juego. Usa desafíos diarios, analiza errores y concéntrate en ejercicios dirigidos a tus debilidades.',
      },
      {
        title: '5. Aprende de Mejores Jugadores',
        content: 'Mejoras más rápido estudiando a aquellos que están adelante de ti. Mira juegos competitivos, únete a comunidades y no tengas miedo de hacer preguntas.',
      },
      {
        title: '6. Mantente Mentalmente Agudo',
        content: 'Tu estado mental afecta drásticamente el rendimiento. Juega cuando estés fresco, toma descansos, mantente hidratado y no juegues cuando estés frustrado.',
      },
    ],
    cta: {
      title: 'Tu Plan de Acción',
      content: 'La mejora no sucede de la noche a la mañana, pero sucede con esfuerzo consistente. Semana 1-2: Aprende 10 nuevas palabras de 2-3 letras diariamente. Semana 3-4: Concéntrate en el reconocimiento de patrones. Semana 5-8: Juega desafíos diarios de manera consistente.',
    },
    footer: 'Recuerda: cada experto fue una vez un principiante. La diferencia es que siguieron jugando, siguieron aprendiendo y siguieron mejorando. Tu viaje hacia el dominio de los juegos de palabras comienza con un solo juego. ¿Por qué no hacerlo ahora mismo?',
    backToBlog: 'Volver al Blog',
    practiceNow: 'Practica Ahora',
    tryDaily: 'Prueba el Desafío Diario',
  },
};

export default function ImproveSkillsPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
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
              'bg-neo-yellow text-neo-black'
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
            'flex flex-wrap items-center gap-4 text-sm',
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

        {/* Article Content */}
        <div className={cn(
          'prose prose-lg max-w-none',
          isDarkMode ? 'prose-invert' : ''
        )}>
          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mb-8',
            isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
          )}>
            <p className={cn('text-lg font-medium mb-0', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.intro}
            </p>
          </div>

          {/* Sections */}
          {content.sections.map((section, index) => (
            <section key={index} className="mb-8">
              <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {section.title}
              </h2>
              <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                {section.content}
              </p>
            </section>
          ))}

          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mt-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20 border-neo-black'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.cta.title}
            </h2>
            <p className={cn('mb-0', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.cta.content}
            </p>
          </div>

          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <p className={cn('text-sm mb-6', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              {content.footer}
            </p>
            <div className="flex gap-4">
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.practiceNow}
                </Button>
              </Link>
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
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
