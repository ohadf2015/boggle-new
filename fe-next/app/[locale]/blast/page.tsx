import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import BlastPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'blast', path: '/blast', locale });
}

const seoContent: Record<string, {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}> = {
  en: {
    title: 'Blast Mode — Word Puzzle Game with Combos & Special Tiles',
    description:
      'Blast Mode is a fast-paced word puzzle game where you chain words across a gem-filled board to trigger devastating combos. Activate fire, ice, bomb, and lightning tiles, build score multipliers through cascade mechanics, and race the clock in one of the most addictive free word games online.',
    features: [
      'Combo chain system — link consecutive words to multiply your score exponentially',
      'Special tile effects: fire burns adjacent tiles, ice freezes enemy progress, bombs clear the board, lightning strikes highest-value letters',
      'Cascade mechanics — cleared tiles cause new letters to fall, opening fresh word opportunities',
      'Score multipliers that stack with each successive combo chain',
      'Progressive difficulty with tile generation tuned to your vocabulary level',
    ],
    faq: [
      {
        question: 'What is Blast Mode in word games?',
        answer:
          'Blast Mode is a tile-matching word game that combines the vocabulary challenge of Boggle with the explosive cascade mechanics of puzzle games like Candy Crush. You spell words on a grid to clear tiles, trigger special effects, and chain combos for massive score multipliers.',
      },
      {
        question: 'Is this free word puzzle game with combos available on mobile?',
        answer:
          'Yes — LexiClash Blast Mode runs in any modern mobile browser with no download required. The responsive layout adapts to phone and tablet screens, and touch swipe input is fully supported for tracing words across the board.',
      },
      {
        question: 'How do combo chains work in Blast Mode?',
        answer:
          'Each word you spell within the combo window extends your chain. The longer the chain, the higher the multiplier applied to every subsequent word. Chains reset if you let the combo timer expire, so speed and planning are equally important.',
      },
      {
        question: 'What do the special tiles do in this word game?',
        answer:
          'Fire tiles ignite and destroy surrounding letters after a short delay — useful for clearing a crowded board. Ice tiles freeze a zone, preventing cascade drops. Bomb tiles explode in a radius, earning bonus points. Lightning tiles seek out the highest-value letter on the board and double its score.',
      },
      {
        question: 'How is Blast Mode different from classic Boggle?',
        answer:
          'Classic Boggle is turn-based and score-focused on single words. Blast Mode adds real-time combo pressure, cascading tile physics, and a suite of special power tiles that fundamentally change strategy — rewarding players who plan chains rather than just finding long words.',
      },
    ],
  },
  he: {
    title: 'מצב בלאסט — משחק מילים מהיר עם קומבו ואריחים מיוחדים',
    description:
      'מצב בלאסט הוא משחק מילים תזזיתי שבו אתם מחברים מילים על לוח מלא אבנים יקרות כדי להפעיל קומבו הרסניים. הפעילו אריחי אש, קרח, פצצה וברק, בנו מכפילי ניקוד דרך מנגנוני מפולת, ותתחרו בשעון באחד ממשחקי המילים המהנים והממכרים ברשת.',
    features: [
      'מערכת שרשרת קומבו — קשרו מילים עוקבות כדי להכפיל את הניקוד שלכם באופן אקספוננציאלי',
      'אריחים מיוחדים: אש שורפת אריחים סמוכים, קרח מקפיא התקדמות יריב, פצצה מנקה את הלוח, וברק פוגע באותיות בעלות הערך הגבוה ביותר',
      'מנגנון מפולת — לאחר ניקוי אריחים יורדות אותיות חדשות ופותחות הזדמנויות מילוליות חדשות',
      'מכפילי ניקוד שמצטברים עם כל שרשרת קומבו נוספת',
      'עלייה הדרגתית בקושי עם יצירת אריחים המותאמת לרמת אוצר המילים שלכם',
    ],
    faq: [
      {
        question: 'מה זה מצב בלאסט במשחקי מילים?',
        answer:
          'מצב בלאסט הוא משחק מילים על לוח שמשלב את אתגר האוצר המילוני של בוגל עם מנגנוני המפולת הנפיצים של משחקי פאזל כמו קנדי קראש. אתם מאייתים מילים על רשת כדי לנקות אריחים, להפעיל אפקטים מיוחדים ולשרשר קומבו למכפילי ניקוד עצומים.',
      },
      {
        question: 'כיצד עובדות שרשרות הקומבו במצב בלאסט?',
        answer:
          'כל מילה שאתם מאייתים בתוך חלון הקומבו מאריכה את השרשרת שלכם. ככל שהשרשרת ארוכה יותר, כך גבוה יותר המכפיל המוחל על כל מילה עוקבת. השרשרת מתאפסת אם תנו לטיימר פג — אז מהירות ותכנון חשובים בשווה.',
      },
      {
        question: 'מה עושים האריחים המיוחדים?',
        answer:
          'אריחי אש מציתים ומשמידים אותיות סמוכות לאחר השהייה קצרה. אריחי קרח מקפיאים אזור ומונעים נפילת אריחים. אריחי פצצה מתפוצצים ברדיוס ומזכים בנקודות בונוס. אריחי ברק מאתרים את האות בעלת הערך הגבוה ביותר בלוח ומכפילים את ניקודה.',
      },
    ],
  },
  sv: {
    title: 'Blast-läge — Ordpussel med kombokejdor och specialbrickor',
    description:
      'Blast-läge är ett snabbt ordpusselspel där du kedjar ord över ett bräde fullt av ädelstenar för att utlösa kraftfulla kombos. Aktivera eld-, is-, bomb- och blixtbrickor och bygg poängmultiplikatorer genom kaskadmekanik i ett av de mest beroendeframkallande gratis-ordspelen online.',
    features: [
      'Kombokejdsystem — länka ord i följd för att multiplicera ditt poäng exponentiellt',
      'Specialbrickor: eld bränner angränsande brickor, is fryser brädet, bomber rensar ett område och blixt dubblar den högst värderade bokstaven',
      'Kaskadmekanik — när brickor rensas faller nya bokstäver ned och skapar nya ordmöjligheter',
      'Staplingsbara poängmultiplikatorer med varje ny kombokejda',
    ],
    faq: [
      {
        question: 'Vad är Blast-läge i ordspel?',
        answer:
          'Blast-läge kombinerar ordutmaningen från Boggle med de explosiva kaskadmekanikerna från pusselspel som Candy Crush. Du stavar ord på ett rutnät för att rensa brickor, utlösa specialeffekter och kedja kombos för massiva poängmultiplikatorer.',
      },
      {
        question: 'Hur fungerar kombokejdor i Blast-läge?',
        answer:
          'Varje ord du stavar inom kombofönstret förlänger din kedja. Ju längre kedja, desto högre multiplikator på varje efterföljande ord. Kedjan återställs om kombo-timern löper ut, så både hastighet och planering är viktiga.',
      },
    ],
  },
  ja: {
    title: 'ブラストモード — コンボとスペシャルタイルで遊ぶ爽快ワードパズル',
    description:
      'ブラストモードは、宝石が散りばめられたボードで単語を連鎖させ、強力なコンボを発動させるスピード感あふれるワードパズルゲームです。ファイア・アイス・ボム・ライトニングの特殊タイルを使い、カスケードメカニクスでスコア倍率を積み重ねましょう。',
    features: [
      'コンボチェーンシステム — 連続して単語をつなぎ、スコアを指数的に倍増させる',
      '特殊タイル: ファイアは隣接タイルを燃やし、アイスはボードを凍らせ、ボムはエリアを一掃し、ライトニングは最高得点の文字を2倍にする',
      'カスケードメカニクス — タイルを消すと新しい文字が降ってきて新たな単語チャンスが生まれる',
      '連鎖するたびに積み重なるスコア倍率',
    ],
    faq: [
      {
        question: 'ブラストモードとは何ですか？',
        answer:
          'ブラストモードは、ボグルの語彙力チャレンジとキャンディクラッシュのようなカスケードパズルメカニクスを組み合わせたワードゲームです。グリッド上で単語をスペルしてタイルをクリアし、特殊効果を発動させ、コンボチェーンで大きなスコア倍率を獲得できます。',
      },
      {
        question: 'コンボチェーンはどのように機能しますか？',
        answer:
          'コンボウィンドウ内で単語をスペルするたびにチェーンが延びます。チェーンが長いほど、以降の単語に適用される倍率が高くなります。タイマーが切れるとチェーンはリセットされるため、スピードと計画性の両方が重要です。',
      },
    ],
  },
  es: {
    title: 'Modo Blast — Juego de palabras con combos y fichas especiales',
    description:
      'El Modo Blast es un trepidante juego de palabras donde encadenas términos a través de un tablero lleno de gemas para desencadenar devastadores combos. Activa fichas de fuego, hielo, bomba y rayo, acumula multiplicadores de puntuación mediante mecánicas de cascada y compite contra el reloj en uno de los mejores juegos de palabras gratis en línea.',
    features: [
      'Sistema de cadenas de combo — enlaza palabras consecutivas para multiplicar tu puntuación de forma exponencial',
      'Efectos de fichas especiales: el fuego quema las fichas adyacentes, el hielo congela el progreso, las bombas limpian el tablero y el rayo golpea las letras de mayor valor',
      'Mecánicas de cascada — las fichas eliminadas hacen caer nuevas letras, abriendo oportunidades de nuevas palabras',
      'Multiplicadores de puntuación que se acumulan con cada cadena de combo sucesiva',
      'Dificultad progresiva con generación de fichas calibrada a tu nivel de vocabulario',
    ],
    faq: [
      {
        question: '¿Qué es el Modo Blast en los juegos de palabras?',
        answer:
          'El Modo Blast es un juego de palabras en tablero que combina el desafío de vocabulario del Boggle con las mecánicas explosivas de cascada de juegos de puzle como Candy Crush. Deletreas palabras en una cuadrícula para eliminar fichas, activar efectos especiales y encadenar combos para obtener enormes multiplicadores de puntuación.',
      },
      {
        question: '¿Está disponible este juego de palabras gratis con combos en móvil?',
        answer:
          'Sí — el Modo Blast de LexiClash funciona en cualquier navegador móvil moderno sin necesidad de descarga. El diseño adaptable se ajusta a pantallas de teléfono y tableta, y la entrada táctil deslizante es totalmente compatible para trazar palabras en el tablero.',
      },
      {
        question: '¿Cómo funcionan las cadenas de combo en el Modo Blast?',
        answer:
          'Cada palabra que deletreas dentro de la ventana de combo extiende tu cadena. Cuanto más larga sea la cadena, mayor será el multiplicador aplicado a cada palabra siguiente. Las cadenas se reinician si dejas que expire el temporizador de combo, así que la velocidad y la planificación son igualmente importantes.',
      },
      {
        question: '¿Qué hacen las fichas especiales en este juego de palabras?',
        answer:
          'Las fichas de fuego se encienden y destruyen las letras circundantes tras un breve retardo. Las fichas de hielo congelan una zona e impiden la caída de fichas en cascada. Las fichas de bomba explotan en radio y otorgan puntos extra. Las fichas de rayo localizan la letra de mayor valor en el tablero y duplican su puntuación.',
      },
      {
        question: '¿En qué se diferencia el Modo Blast del Boggle clásico?',
        answer:
          'El Boggle clásico es por turnos y se centra en la puntuación de palabras individuales. El Modo Blast añade presión de combo en tiempo real, física de fichas en cascada y un conjunto de fichas de poder especiales que cambian fundamentalmente la estrategia — recompensando a los jugadores que planifican cadenas en lugar de buscar simplemente palabras largas.',
      },
    ],
  },
};

export default async function BlastPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] ?? seoContent.en;
  const origin = 'https://www.lexiclash.live';
  return (
    <>
      <VideoGameJsonLd
        mode="blast"
        locale={locale}
        name={content.title}
        description={content.description}
        playMode="SinglePlayer"
        numberOfPlayers={{ minValue: 1, maxValue: 1 }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'LexiClash', url: `${origin}/${locale}` },
          { name: content.title, url: `${origin}/${locale}/blast` },
        ]}
      />
      <BlastPageClient />
      <GamePageSeoContent
        asH1
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
      />
    </>
  );
}
