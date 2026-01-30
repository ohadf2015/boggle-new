'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

// Multilingual content - native-sounding for each language
type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  intro: string;
  benefits: Array<{
    number: number;
    title: string;
    content: string;
  }>;
  howMuch: {
    title: string;
    content: string;
    tip: string;
    tipContent: string;
  };
  lifestyle: {
    title: string;
    content: string;
    listItems: string[];
    conclusion: string;
  };
  cta: {
    title: string;
    content: string;
    action: string;
  };
  backToBlog: string;
  playDaily: string;
  startPracticing: string;
  researchSources: string;
};

const contentByLocale: Record<string, LocaleContent> = {
  he: {
    title: '10 יתרונות מפתיעים של משחקי מילים יומיים',
    subtitle: 'מדע מוכח למה משחקי מילים הם הרבה יותר ממשחק - הם אימון מוחי חיוני',
    category: 'מחקר',
    readTime: 'זמן קריאה: 5 דקות',
    intro: 'חושבים שמשחקי מילים זה רק לבזבז זמן? תחשבו שוב. מחקרים עדכניים מ-2024-2025 מגלים שפאזלים יומיים של מילים מספקים יתרונות מדהימים שהרבה מעבר לבידור. הנה 10 סיבות מבוססות מדע למה כדאי להפוך משחקי מילים לחלק מהשגרה היומית שלכם.',
    benefits: [
      {
        number: 1,
        title: 'מאט הזדקנות מוחית ב-5 שנים',
        content: 'מחקרי הדמיה מוחית מראים שמשתתפים בתשחצים חוו פחות כיווץ במוח באזורי זיכרון קריטיים לעומת אלו שהשתמשו במשחקים ממוחשבים. מחקרים מראים שמשחקי מילים יכולים לעכב את הופעת תסמיני דמנציה עד 5 שנים.',
      },
      {
        number: 2,
        title: 'זיכרון חד יותר לטווח ארוך',
        content: 'מחקר פורץ דרך שפורסם בכתב העת New England Journal of Medicine מצא שתשחצים הראו יתרון משמעותי על פני משחקי מוח דיגיטליים בחידוד זיכרון בקרב מבוגרים עם ירידה קוגניטיבית קלה.',
      },
      {
        number: 3,
        title: 'מהירות עיבוד מהירה יותר',
        content: 'אנשים מבוגרים עם ירידה קוגניטיבית קלה שעוסקים במשחקי מילים והתעסקויות אחרות מראים מהירות עיבוד טובה יותר מאלו שלא. המוח שלכם ממש מגיב מהר יותר כשאתם מאמנים אותו באופן קבוע.',
      },
      {
        number: 4,
        title: 'טווח קשב משופר',
        content: 'משחקי מילים מעוררים חלקים מפתח במוח כולל קשב ופתרון בעיות. שחקנים קבועים מראים שיפור ניכר בטווח הקשב, וזה קריטי כי כישורים אלו יורדים באופן טבעי עם הגיל.',
      },
      {
        number: 5,
        title: 'הרחבת אוצר מילים',
        content: 'חוקרים אינדונזים מצאו שיפור משמעותי באוצר מילים באנגלית בקרב משתתפים ששיחקו סקרבל באופן קבוע. המחקר הראה הבדלים מדידים בין נתוני טרום-בדיקה ופוסט-בדיקה, מוכיח שמשחקי מילים מרחיבים אוצר מילים ביעילות.',
      },
      {
        number: 6,
        title: 'שטף דיבור משופר',
        content: 'שיפורים בשטף דיבור הם בין התוצאות המרכזיות של משחק קבוע במשחקי מילים. זה אומר שתמצאו את המילים הנכונות מהר יותר בשיחות ותבטאו את עצמכם בצורה ברורה יותר.',
      },
      {
        number: 7,
        title: 'סיכון מופחת לדמנציה',
        content: 'ועדת לנסט מדווחת ש-45% מסיכון הדמנציה מבוסס על גורמי אורח חיים ניתנים לשינוי. עירור נפשי קבוע דרך משחקי מילים הוא אחת הדרכים הנגישות ביותר להפחית את הסיכון שלכם.',
      },
      {
        number: 8,
        title: 'זיכרון עבודה משופר',
        content: 'משחקי מילים מעסיקים את זיכרון העבודה שלכם - המרחב הנפשי שמחזיק מידע בזמן שאתם משתמשים בו. שחקנים מראים באופן עקבי ביצועי זיכרון עבודה טובים יותר מאשר לא-שחקנים.',
      },
      {
        number: 9,
        title: 'כישורי חשיבה משופרים',
        content: 'פאזלים ומשחקים מעוררים חשיבה, לוגיקה ותפיסה ויזואלית. אלו לא רק כישורים מבודדים - הם מועברים לפתרון בעיות ויכולת קבלת החלטות בחיים האמיתיים.',
      },
      {
        number: 10,
        title: 'בריאות נפשית טובה יותר',
        content: 'מעבר ליתרונות קוגניטיביים, משחקי מילים מספקים הפגת לחץ ורווחה נפשית. הקשב הממוקד יוצר מצב מדיטטיבי, מפחית חרדה ומשפר מצב רוח. בנוסף, תחושת ההישג מגבירה את הביטחון העצמי.',
      },
    ],
    howMuch: {
      title: 'כמה זמן צריך לשחק?',
      content: 'החדשות הטובות: אתם לא צריכים שעות של משחק. מומחים ממליצים על רק 15-20 דקות של פעילויות מעוררות מחשבה יומית ליתרונות קוגניטיביים ניכרים.',
      tip: '💡 עקביות זה המפתח',
      tipContent: 'לשחק 15 דקות כל יום הרבה יותר יעיל מלשחק שעתיים פעם בשבוע. מעורבות יומית יוצרת שינויים נוירולוגיים מתמשכים שמצטברים עם הזמן.',
    },
    lifestyle: {
      title: 'הקשר החשוב: חלק מאורח חיים בריא',
      content: 'בעוד שמשחקי מילים מספקים יתרונות קוגניטיביים משמעותיים, מומחים מדגישים שהם עובדים הכי טוב כחלק מגישה מקיפה לבריאות המוח. מחקרים ממרכז לבריאות המוח מציינים שגורמי אורח חיים חיוניים - כולל:',
      listItems: [
        'פעילות גופנית: אירובי ואימוני כוח',
        'קשרים חברתיים: אינטראקציה קבועה עם חברים ומשפחה',
        'מיינדפולנס: מדיטציה וניהול לחץ',
        'תכלית: פעילויות ויעדים משמעותיים',
        'עירור נפשי: משחקי מילים, קריאה, למידת כישורים חדשים',
      ],
      conclusion: 'תחשבו על משחקי מילים ככלי חזק אחד בארגז הכלים של בריאות המוח שלכם - לא כדור קסם, אלא אסטרטגיה מוכחת שהיא מהנה, נגישה ויעילה.',
    },
    cta: {
      title: 'תתחילו היום, תראו תוצאות מחר',
      content: 'עם יתרונות החל מזיכרון חד יותר ועד סיכון מופחת לדמנציה, אף פעם לא היה זמן טוב יותר להפוך משחקי מילים לחלק מהשגרה היומית שלכם. המחקר ברור: המוח שלכם יודה לכם.',
      action: 'מוכנים להשקיע 15 דקות בעתיד הקוגניטיבי שלכם?',
    },
    backToBlog: 'חזרה לבלוג',
    playDaily: 'שחק אתגר יומי',
    startPracticing: 'התחל אימון',
    researchSources: 'מקורות מחקר',
  },
  en: {
    title: '10 Surprising Benefits of Playing Word Games Daily',
    subtitle: 'Science-backed reasons why word games are more than just fun—they\'re essential brain training',
    category: 'Research',
    readTime: '5 min read',
    intro: 'Think word games are just a way to pass time? Think again. Recent research from 2024-2025 reveals that daily word puzzles provide remarkable benefits that go far beyond entertainment. Here are 10 science-backed reasons to make word games part of your daily routine.',
    benefits: [
      {
        number: 1,
        title: 'Slows Brain Aging by Up to 5 Years',
        content: 'Recent brain imaging studies reveal that crossword puzzle participants experienced less brain shrinkage in critical memory areas compared to those using computer-based games. Research shows word games can delay the onset of dementia symptoms by up to 5 years.',
      },
      {
        number: 2,
        title: 'Sharper Memory That Lasts',
        content: 'A landmark study published in the New England Journal of Medicine found that crossword puzzles showed a significant advantage over digital brain games in sharpening memory among older adults with mild cognitive impairment.',
      },
      {
        number: 3,
        title: 'Faster Processing Speed',
        content: 'Older people with mild cognitive impairment who engage in high levels of word games and hobbies show better processing speed than those who don\'t. Your brain literally responds faster when you train it regularly.',
      },
      {
        number: 4,
        title: 'Enhanced Attention Span',
        content: 'Word games stimulate key parts of the brain including attention and problem-solving. Regular players show measurably improved attention spans, which is crucial as these skills naturally decline with age.',
      },
      {
        number: 5,
        title: 'Vocabulary Expansion',
        content: 'Indonesian researchers found significant improvement in English vocabulary among participants who played Scrabble regularly. The study showed measurable differences between pre-test and post-test data, proving word games effectively expand vocabulary.',
      },
      {
        number: 6,
        title: 'Better Verbal Fluency',
        content: 'Improvements in verbal fluency are among the key outcomes of regular word game play. This means you\'ll find the right words faster in conversations and express yourself more clearly.',
      },
      {
        number: 7,
        title: 'Reduced Dementia Risk',
        content: 'The Lancet Commission reports that 45% of dementia risk is based on modifiable lifestyle factors. Regular mental stimulation through word games is one of the most accessible ways to reduce your risk.',
      },
      {
        number: 8,
        title: 'Improved Working Memory',
        content: 'Word games engage your working memory—the mental workspace that holds information while you\'re using it. Players consistently show better working memory performance than non-players.',
      },
      {
        number: 9,
        title: 'Enhanced Reasoning Skills',
        content: 'Puzzles and games stimulate reasoning, logic, and visual perception. These aren\'t just isolated skills—they transfer to real-world problem-solving and decision-making.',
      },
      {
        number: 10,
        title: 'Better Mental Health',
        content: 'Beyond cognitive benefits, word games provide stress relief and mental wellness. The focused attention creates a meditative state, reducing anxiety and improving mood. Plus, the sense of achievement boosts confidence.',
      },
    ],
    howMuch: {
      title: 'How Much Do You Need to Play?',
      content: 'The good news: you don\'t need hours of gameplay. Experts recommend just 15-20 minutes of mentally stimulating activities daily for measurable cognitive benefits.',
      tip: '💡 Consistency Is Key',
      tipContent: 'Playing 15 minutes every day is far more effective than playing 2 hours once a week. Daily engagement creates lasting neural changes that compound over time.',
    },
    lifestyle: {
      title: 'Important Context: Part of a Healthy Lifestyle',
      content: 'While word games provide significant cognitive benefits, experts emphasize they work best as part of a comprehensive approach to brain health. Research from the Center for Brain Health notes that lifestyle factors are crucial—including:',
      listItems: [
        'Physical exercise: Cardio and strength training',
        'Social connections: Regular interaction with friends and family',
        'Mindfulness: Meditation and stress management',
        'Purpose: Meaningful activities and goals',
        'Mental stimulation: Word games, reading, learning new skills',
      ],
      conclusion: 'Think of word games as one powerful tool in your brain health toolkit—not a magic bullet, but a proven strategy that\'s enjoyable, accessible, and effective.',
    },
    cta: {
      title: 'Start Today, See Results Tomorrow',
      content: 'With benefits ranging from sharper memory to reduced dementia risk, there\'s never been a better time to make word games part of your daily routine. The research is clear: your brain will thank you.',
      action: 'Ready to invest 15 minutes in your cognitive future?',
    },
    backToBlog: 'Back to Blog',
    playDaily: 'Play Daily Challenge',
    startPracticing: 'Start Practicing',
    researchSources: 'Research Sources',
  },
  sv: {
    title: '10 Överraskande Fördelar med Dagliga Ordspel',
    subtitle: 'Vetenskapligt bevisade skäl till varför ordspel är mycket mer än bara kul—de är viktig hjärnträning',
    category: 'Forskning',
    readTime: '5 min läsning',
    intro: 'Tror du att ordspel bara är tidsfördiv? Tänk om! Ny forskning från 2024-2025 visar att dagliga ordpussel ger anmärkningsvärda fördelar som går långt bortom underhållning. Här är 10 vetenskapligt belagda skäl att göra ordspel till en del av din dagliga rutin.',
    benefits: [
      {
        number: 1,
        title: 'Bromsar Hjärnåldring med Upp till 5 År',
        content: 'Färska hjärnavbildningsstudier visar att korsordsentusiaster upplevde mindre hjärnschrympning i kritiska minnesområden jämfört med de som använder datorbaserade spel. Forskning visar att ordspel kan försena uppkomsten av demenssymptom med upp till 5 år.',
      },
      {
        number: 2,
        title: 'Skarpare Minne som Håller',
        content: 'En banbrytande studie publicerad i New England Journal of Medicine fann att korsord visade en betydande fördel över digitala hjärnspel när det gäller att skärpa minnet bland äldre vuxna med mild kognitiv försämring.',
      },
      {
        number: 3,
        title: 'Snabbare Bearbetningshastighet',
        content: 'Äldre personer med mild kognitiv försämring som ägnar sig åt höga nivåer av ordspel och hobbyer visar bättre bearbetningshastighet än de som inte gör det. Din hjärna svarar bokstavligen snabbare när du tränar den regelbundet.',
      },
      {
        number: 4,
        title: 'Förbättrad Koncentrationsförmåga',
        content: 'Ordspel stimulerar nyckeldelar av hjärnan inklusive uppmärksamhet och problemlösning. Regelbundna spelare visar mätbart förbättrad koncentrationsförmåga, vilket är avgörande eftersom dessa färdigheter naturligt minskar med åldern.',
      },
      {
        number: 5,
        title: 'Utökat Ordförråd',
        content: 'Indonesiska forskare fann betydande förbättring i engelskt ordförråd bland deltagare som spelade Scrabble regelbundet. Studien visade mätbara skillnader mellan för- och eftertestdata, vilket bevisar att ordspel effektivt utökar ordförrådet.',
      },
      {
        number: 6,
        title: 'Bättre Verbal Flyt',
        content: 'Förbättringar i verbal flyt är bland de viktigaste resultaten av regelbundet ordspelande. Det betyder att du hittar rätt ord snabbare i samtal och uttrycker dig tydligare.',
      },
      {
        number: 7,
        title: 'Minskad Risk för Demens',
        content: 'Lancet-kommissionen rapporterar att 45% av demensrisken baseras på modifierbara livsstilsfaktorer. Regelbunden mental stimulering genom ordspel är ett av de mest tillgängliga sätten att minska din risk.',
      },
      {
        number: 8,
        title: 'Förbättrat Arbetsminne',
        content: 'Ordspel engagerar ditt arbetsminne—den mentala arbetsytan som håller information medan du använder den. Spelare visar konsekvent bättre arbetsminnesprestation än icke-spelare.',
      },
      {
        number: 9,
        title: 'Förbättrade Resonemangsförmågor',
        content: 'Pussel och spel stimulerar resonemang, logik och visuell uppfattning. Dessa är inte bara isolerade färdigheter—de överförs till verklig problemlösning och beslutsfattande.',
      },
      {
        number: 10,
        title: 'Bättre Mental Hälsa',
        content: 'Utöver kognitiva fördelar ger ordspel stresslindring och mental hälsa. Den fokuserade uppmärksamheten skapar ett meditativt tillstånd som minskar ångest och förbättrar humöret. Plus, känslan av prestation ökar självförtroendet.',
      },
    ],
    howMuch: {
      title: 'Hur Mycket Behöver Du Spela?',
      content: 'De goda nyheterna: du behöver inte timmar av speltid. Experter rekommenderar bara 15-20 minuter av mentalt stimulerande aktiviteter dagligen för mätbara kognitiva fördelar.',
      tip: '💡 Kontinuitet är Nyckeln',
      tipContent: 'Att spela 15 minuter varje dag är mycket mer effektivt än att spela 2 timmar en gång i veckan. Dagligt engagemang skapar varaktiga neurala förändringar som förstärks över tid.',
    },
    lifestyle: {
      title: 'Viktigt Sammanhang: Del av en Hälsosam Livsstil',
      content: 'Även om ordspel ger betydande kognitiva fördelar betonar experter att de fungerar bäst som en del av en omfattande strategi för hjärnhälsa. Forskning från Center for Brain Health noterar att livsstilsfaktorer är avgörande—inklusive:',
      listItems: [
        'Fysisk träning: Kondition och styrketräning',
        'Sociala kontakter: Regelbunden interaktion med vänner och familj',
        'Mindfulness: Meditation och stresshantering',
        'Syfte: Meningsfulla aktiviteter och mål',
        'Mental stimulans: Ordspel, läsning, lära nya färdigheter',
      ],
      conclusion: 'Tänk på ordspel som ett kraftfullt verktyg i din hjärnhälsoverktygslåda—inte en magisk kula, men en beprövad strategi som är rolig, tillgänglig och effektiv.',
    },
    cta: {
      title: 'Börja Idag, Se Resultat Imorgon',
      content: 'Med fördelar som sträcker sig från skarpare minne till minskad demensrisk har det aldrig funnits en bättre tid att göra ordspel till en del av din dagliga rutin. Forskningen är tydlig: din hjärna kommer tacka dig.',
      action: 'Redo att investera 15 minuter i din kognitiva framtid?',
    },
    backToBlog: 'Tillbaka till Bloggen',
    playDaily: 'Spela Daglig Utmaning',
    startPracticing: 'Börja Öva',
    researchSources: 'Forskningskällor',
  },
  ja: {
    title: '毎日の言葉ゲームがもたらす10の驚くべき効果',
    subtitle: '科学的に証明された理由：言葉ゲームは単なる娯楽ではなく、必須の脳トレーニング',
    category: '研究',
    readTime: '読了時間：5分',
    intro: '言葉ゲームは時間つぶしだと思っていませんか？考え直してください。2024-2025年の最新研究により、毎日の言葉パズルが娯楽をはるかに超える驚くべき効果をもたらすことが明らかになりました。言葉ゲームを日課にすべき10の科学的根拠をご紹介します。',
    benefits: [
      {
        number: 1,
        title: '脳の老化を最大5年遅らせる',
        content: '最新の脳画像研究により、クロスワードパズルの参加者は、コンピューターベースのゲームを使用する人と比較して、重要な記憶領域の脳萎縮が少ないことが明らかになりました。研究では、言葉ゲームが認知症の症状の発症を最大5年遅らせることができることが示されています。',
      },
      {
        number: 2,
        title: '持続する鋭い記憶力',
        content: 'ニューイングランド医学雑誌に発表された画期的な研究では、軽度認知障害のある高齢者において、クロスワードパズルがデジタル脳トレーニングゲームよりも記憶力を鋭くする上で有意な利点を示したことがわかりました。',
      },
      {
        number: 3,
        title: '処理速度の向上',
        content: '軽度認知障害のある高齢者で、言葉ゲームや趣味に高レベルで取り組んでいる人は、そうでない人よりも処理速度が優れています。定期的にトレーニングすると、脳は文字通り速く反応するようになります。',
      },
      {
        number: 4,
        title: '集中力の向上',
        content: '言葉ゲームは、注意力や問題解決を含む脳の重要な部分を刺激します。定期的なプレイヤーは、測定可能なほど集中力が向上しており、これらのスキルは年齢とともに自然に低下するため、非常に重要です。',
      },
      {
        number: 5,
        title: '語彙の拡大',
        content: 'インドネシアの研究者は、定期的にスクラブルをプレイした参加者の英語語彙に著しい改善を発見しました。この研究は、テスト前後のデータ間で測定可能な違いを示し、言葉ゲームが語彙を効果的に拡大することを証明しています。',
      },
      {
        number: 6,
        title: '言語流暢性の向上',
        content: '言語流暢性の改善は、定期的な言葉ゲームプレイの主要な成果の1つです。これは、会話で適切な言葉をより速く見つけ、より明確に自分を表現できることを意味します。',
      },
      {
        number: 7,
        title: '認知症リスクの軽減',
        content: 'ランセット委員会は、認知症リスクの45%が修正可能なライフスタイル要因に基づいていると報告しています。言葉ゲームを通じた定期的な精神刺激は、リスクを軽減する最もアクセスしやすい方法の1つです。',
      },
      {
        number: 8,
        title: 'ワーキングメモリの改善',
        content: '言葉ゲームは、使用中に情報を保持する精神的ワークスペースであるワーキングメモリを活性化します。プレイヤーは一貫して非プレイヤーよりも優れたワーキングメモリパフォーマンスを示します。',
      },
      {
        number: 9,
        title: '推論能力の向上',
        content: 'パズルやゲームは、推論、論理、視覚認識を刺激します。これらは孤立したスキルではなく、現実世界の問題解決や意思決定に転用されます。',
      },
      {
        number: 10,
        title: 'メンタルヘルスの改善',
        content: '認知的利点を超えて、言葉ゲームはストレス軽減と精神的健康を提供します。集中した注意は瞑想状態を作り出し、不安を軽減し、気分を改善します。さらに、達成感は自信を高めます。',
      },
    ],
    howMuch: {
      title: 'どれくらいプレイする必要がありますか？',
      content: '良いニュース：何時間もプレイする必要はありません。専門家は、測定可能な認知的利点を得るために、毎日わずか15〜20分の精神的に刺激的な活動を推奨しています。',
      tip: '💡 一貫性が鍵',
      tipContent: '毎日15分プレイすることは、週に1回2時間プレイするよりもはるかに効果的です。毎日の取り組みは、時間とともに複利効果をもたらす持続的な神経変化を生み出します。',
    },
    lifestyle: {
      title: '重要な文脈：健康的なライフスタイルの一部',
      content: '言葉ゲームは重要な認知的利点を提供しますが、専門家は脳の健康への包括的なアプローチの一部として最もよく機能することを強調しています。センター・フォー・ブレイン・ヘルスの研究は、ライフスタイル要因が重要であることを指摘しています—以下を含む：',
      listItems: [
        '身体運動：有酸素運動と筋力トレーニング',
        '社会的つながり：友人や家族との定期的な交流',
        'マインドフルネス：瞑想とストレス管理',
        '目的：意味のある活動と目標',
        '精神的刺激：言葉ゲーム、読書、新しいスキルの学習',
      ],
      conclusion: '言葉ゲームを脳の健康ツールキットの強力なツールの1つと考えてください—魔法の弾丸ではありませんが、楽しく、アクセスしやすく、効果的な実証済みの戦略です。',
    },
    cta: {
      title: '今日始めて、明日結果を見る',
      content: '鋭い記憶力から認知症リスクの軽減まで、言葉ゲームを日常生活の一部にするのにこれほど良い時期はありませんでした。研究は明確です：あなたの脳はあなたに感謝するでしょう。',
      action: '認知的未来に15分投資する準備はできましたか？',
    },
    backToBlog: 'ブログに戻る',
    playDaily: 'デイリーチャレンジをプレイ',
    startPracticing: '練習を開始',
    researchSources: '研究ソース',
  },
  es: {
    title: '10 Beneficios Sorprendentes de Jugar Juegos de Palabras Diariamente',
    subtitle: 'Razones respaldadas por la ciencia de por qué los juegos de palabras son mucho más que diversión—son entrenamiento cerebral esencial',
    category: 'Investigación',
    readTime: '5 min de lectura',
    intro: '¿Crees que los juegos de palabras son solo para pasar el tiempo? Piénsalo de nuevo. Investigaciones recientes de 2024-2025 revelan que los rompecabezas diarios de palabras brindan beneficios notables que van mucho más allá del entretenimiento. Aquí hay 10 razones respaldadas por la ciencia para hacer de los juegos de palabras parte de tu rutina diaria.',
    benefits: [
      {
        number: 1,
        title: 'Retrasa el Envejecimiento Cerebral Hasta 5 Años',
        content: 'Estudios recientes de imágenes cerebrales revelan que los participantes en crucigramas experimentaron menos contracción cerebral en áreas críticas de memoria en comparación con quienes usan juegos basados en computadora. Las investigaciones muestran que los juegos de palabras pueden retrasar la aparición de síntomas de demencia hasta 5 años.',
      },
      {
        number: 2,
        title: 'Memoria Más Aguda que Perdura',
        content: 'Un estudio histórico publicado en el New England Journal of Medicine encontró que los crucigramas mostraron una ventaja significativa sobre los juegos cerebrales digitales en agudizar la memoria entre adultos mayores con deterioro cognitivo leve.',
      },
      {
        number: 3,
        title: 'Velocidad de Procesamiento Más Rápida',
        content: 'Las personas mayores con deterioro cognitivo leve que participan en altos niveles de juegos de palabras y pasatiempos muestran mejor velocidad de procesamiento que aquellos que no lo hacen. Tu cerebro literalmente responde más rápido cuando lo entrenas regularmente.',
      },
      {
        number: 4,
        title: 'Mayor Capacidad de Atención',
        content: 'Los juegos de palabras estimulan partes clave del cerebro, incluida la atención y la resolución de problemas. Los jugadores regulares muestran una capacidad de atención mediblemente mejorada, lo cual es crucial ya que estas habilidades disminuyen naturalmente con la edad.',
      },
      {
        number: 5,
        title: 'Expansión del Vocabulario',
        content: 'Investigadores indonesios encontraron una mejora significativa en el vocabulario en inglés entre los participantes que jugaban Scrabble regularmente. El estudio mostró diferencias medibles entre los datos de la prueba previa y posterior, demostrando que los juegos de palabras expanden efectivamente el vocabulario.',
      },
      {
        number: 6,
        title: 'Mejor Fluidez Verbal',
        content: 'Las mejoras en la fluidez verbal se encuentran entre los resultados clave del juego regular de juegos de palabras. Esto significa que encontrarás las palabras correctas más rápido en las conversaciones y te expresarás con mayor claridad.',
      },
      {
        number: 7,
        title: 'Riesgo Reducido de Demencia',
        content: 'La Comisión Lancet informa que el 45% del riesgo de demencia se basa en factores de estilo de vida modificables. La estimulación mental regular a través de juegos de palabras es una de las formas más accesibles de reducir tu riesgo.',
      },
      {
        number: 8,
        title: 'Memoria de Trabajo Mejorada',
        content: 'Los juegos de palabras activan tu memoria de trabajo, el espacio mental que retiene información mientras la estás usando. Los jugadores muestran consistentemente un mejor rendimiento de la memoria de trabajo que los no jugadores.',
      },
      {
        number: 9,
        title: 'Habilidades de Razonamiento Mejoradas',
        content: 'Los rompecabezas y juegos estimulan el razonamiento, la lógica y la percepción visual. Estas no son solo habilidades aisladas: se transfieren a la resolución de problemas y la toma de decisiones del mundo real.',
      },
      {
        number: 10,
        title: 'Mejor Salud Mental',
        content: 'Más allá de los beneficios cognitivos, los juegos de palabras proporcionan alivio del estrés y bienestar mental. La atención enfocada crea un estado meditativo, reduciendo la ansiedad y mejorando el estado de ánimo. Además, la sensación de logro aumenta la confianza.',
      },
    ],
    howMuch: {
      title: '¿Cuánto Necesitas Jugar?',
      content: 'Las buenas noticias: no necesitas horas de juego. Los expertos recomiendan solo 15-20 minutos de actividades mentalmente estimulantes diarias para obtener beneficios cognitivos medibles.',
      tip: '💡 La Consistencia es Clave',
      tipContent: 'Jugar 15 minutos todos los días es mucho más efectivo que jugar 2 horas una vez a la semana. El compromiso diario crea cambios neuronales duraderos que se acumulan con el tiempo.',
    },
    lifestyle: {
      title: 'Contexto Importante: Parte de un Estilo de Vida Saludable',
      content: 'Si bien los juegos de palabras proporcionan beneficios cognitivos significativos, los expertos enfatizan que funcionan mejor como parte de un enfoque integral para la salud cerebral. La investigación del Centro para la Salud Cerebral señala que los factores del estilo de vida son cruciales, incluidos:',
      listItems: [
        'Ejercicio físico: Cardio y entrenamiento de fuerza',
        'Conexiones sociales: Interacción regular con amigos y familiares',
        'Mindfulness: Meditación y manejo del estrés',
        'Propósito: Actividades y metas significativas',
        'Estimulación mental: Juegos de palabras, lectura, aprender nuevas habilidades',
      ],
      conclusion: 'Piensa en los juegos de palabras como una herramienta poderosa en tu kit de herramientas de salud cerebral, no como una bala mágica, sino como una estrategia probada que es agradable, accesible y efectiva.',
    },
    cta: {
      title: 'Comienza Hoy, Ve Resultados Mañana',
      content: 'Con beneficios que van desde una memoria más aguda hasta un riesgo reducido de demencia, nunca ha habido un mejor momento para hacer de los juegos de palabras parte de tu rutina diaria. La investigación es clara: tu cerebro te lo agradecerá.',
      action: '¿Listo para invertir 15 minutos en tu futuro cognitivo?',
    },
    backToBlog: 'Volver al Blog',
    playDaily: 'Juega el Desafío Diario',
    startPracticing: 'Comienza a Practicar',
    researchSources: 'Fuentes de Investigación',
  },
};

export default function BenefitsPageClient(): React.ReactElement {
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
              'bg-neo-lime text-neo-black'
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
              {new Date('2026-01-30').toLocaleDateString(language, { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {content.readTime}
            </span>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-64 md:h-96 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/10-benefits.jpg"
              alt="Illustration showing the number 10 surrounded by icons representing benefits of word games"
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
          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mb-8',
            isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
          )}>
            <p className={cn('text-lg font-medium mb-0', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.intro}
            </p>
          </div>

          {/* Benefits List */}
          <div className="space-y-6 mb-8">
            {content.benefits.map((benefit) => (
              <div
                key={benefit.number}
                className={cn(
                  'p-6 rounded-neo border-3 border-neo-black',
                  isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-neo border-2 border-neo-black flex items-center justify-center',
                    'bg-neo-yellow font-black text-2xl'
                  )}>
                    {benefit.number}
                  </div>
                  <div className="flex-1">
                    <h3 className={cn('text-xl font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                      <CheckCircle className="w-5 h-5 text-neo-lime" />
                      {benefit.title}
                    </h3>
                    <p className={cn('mb-0', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                      {benefit.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.howMuch.title}
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.howMuch.content}
            </p>
            <div className={cn(
              'p-6 rounded-neo border-2 border-neo-black',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-cyan/20'
            )}>
              <p className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {content.howMuch.tip}
              </p>
              <p className={cn('mb-0 text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                {content.howMuch.tipContent}
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.lifestyle.title}
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.lifestyle.content}
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.lifestyle.listItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.lifestyle.conclusion}
            </p>
          </section>

          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mt-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20 border-neo-black'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.cta.title}
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.cta.content}
            </p>
            <p className={cn('mb-0 font-bold', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.cta.action}
            </p>
          </div>

          {/* Research Sources */}
          <section className="mb-8 mt-8">
            <h3 className={cn('text-lg font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.researchSources}
            </h3>
            <ul className={cn('text-sm space-y-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              <li>
                <a
                  href="https://www.psychologytoday.com/us/blog/the-full-picture/202412/word-puzzles-and-board-games-boost-brain-health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Psychology Today - Word Puzzles and Board Games Boost Brain Health (2024)
                </a>
              </li>
              <li>
                <a
                  href="https://mosait.com/blog/are-crossword-puzzles-good-for-your-brain-research-2025"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Latest 2025 Research & Scientific Evidence on Crossword Puzzles
                </a>
              </li>
              <li>
                <a
                  href="https://health.osu.edu/health/brain-and-spine/how-games-like-wordle-can-improve-brain-health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Ohio State Health & Discovery - How Games Like Wordle Can Improve Brain Health
                </a>
              </li>
              <li>
                <a
                  href="https://www.sciencedaily.com/releases/2024/09/240910155904.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  ScienceDaily - Games, Puzzles Can Slow Cognitive Decline (2024)
                </a>
              </li>
              <li>
                <a
                  href="https://centerforbrainhealth.org/article/wellness-wednesday-word-games"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Center for Brain Health - Word Games and Brain Health
                </a>
              </li>
            </ul>
          </section>

          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4 mt-6">
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
