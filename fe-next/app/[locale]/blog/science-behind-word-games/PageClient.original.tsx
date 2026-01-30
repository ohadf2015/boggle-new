'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, Brain, Lightbulb, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

type LocaleContent = {
  title: string;
  category: string;
  date: string;
  readTime: string;
  imageAlt: string;
  intro: string;
  brainBoost: {
    title: string;
    description: string;
    cards: Array<{
      title: string;
      description: string;
    }>;
  };
  vocabulary: {
    title: string;
    intro: string;
    subtitle: string;
    types: string;
    passive: string;
    active: string;
    conclusion: string;
  };
  cognitiveReserve: {
    title: string;
    intro: string;
    findings: string;
    benefits: string[];
    metaphor: string;
  };
  multilingual: {
    title: string;
    intro: string;
    benefits: Array<{
      title: string;
      description: string;
    }>;
  };
  stressReduction: {
    title: string;
    paragraph1: string;
    paragraph2: string;
  };
  howMuch: {
    title: string;
    description: string;
    tipTitle: string;
    tipContent: string;
  };
  bottomLine: {
    title: string;
    paragraph1: string;
    paragraph2: string;
  };
  backToBlog: string;
  tryDaily: string;
  practiceNow: string;
};

const contentByLocale: Record<string, LocaleContent> = {
  he: {
    title: 'המדע מאחורי משחקי מילים ובריאות המוח',
    category: 'מחקר',
    date: '30 בינואר, 2026',
    readTime: 'זמן קריאה: 6 דקות',
    imageAlt: 'איור של מוח זוהר העשוי ממילים מחוברות המציג יתרונות קוגניטיביים של משחקי מילים',
    intro: 'תהיתם פעם למה משחקי מילים מרגישים כל כך מספקים? זה לא רק כיף - המוח שלכם בעצם מקבל אימון מקיף. המדע מראה שמשחק במשחקי מילים באופן קבוע יכול לשפר זיכרון, להרחיב אוצר מילים, ואפילו לעזור להגן מפני ירידה קוגניטיבית.',
    brainBoost: {
      title: 'איך משחקי מילים מחזקים את המוח',
      description: 'כשאתם משחקים במשחקי מילים, אתם לא רק נהנים - אתם מפעילים מספר מערכות קוגניטיביות במקביל. הנה מה קורה במוח:',
      cards: [
        {
          title: 'זיהוי דפוסים',
          description: 'המוח שלכם מחזק מסלולים עצביים שאחראים על זיהוי דפוסים ורצפים.'
        },
        {
          title: 'הפעלת זיכרון',
          description: 'שליפת מילים מהזיכרון מאמנת גם את מערכות הזיכרון לטווח קצר וגם לטווח ארוך.'
        },
        {
          title: 'תפקוד ניהולי',
          description: 'תכנון אסטרטגיות וקבלת החלטות מפעילים את מרכז השליטה של המוח.'
        }
      ]
    },
    vocabulary: {
      title: 'הקשר לאוצר המילים',
      intro: 'מחקרים מראים שאנשים שמשחקים במשחקי מילים באופן קבוע יש להם אוצר מילים גדול משמעותית משאינם משחקים. אבל זה לא רק על ידיעת יותר מילים - זה על איך אתם משתמשים בהן.',
      subtitle: 'אוצר מילים אקטיבי לעומת פסיבי',
      types: 'לרוב האנשים יש שני אוצרי מילים:',
      passive: 'אוצר מילים פסיבי: מילים שאתם מזהים בקריאה או שמיעה',
      active: 'אוצר מילים אקטיבי: מילים שאתם באמת משתמשים בהן בדיבור וכתיבה',
      conclusion: 'משחקי מילים יעילים במיוחד כי הם מאלצים אתכם להיזכר ולהשתמש במילים באופן אקטיבי, וממירים אוצר מילים פסיבי לאקטיבי. זה יוצר קשרים עצביים חזקים יותר ועושה את המילים האלה נגישות יותר בחיי היום-יום.'
    },
    cognitiveReserve: {
      title: 'רזרבה קוגניטיבית: קרן הפנסיה של המוח',
      intro: 'אחד הגילויים המרגשים ביותר במדעי המוח הוא המושג "רזרבה קוגניטיבית" - בעצם, היכולת של המוח לפצות על שינויים ונזקים הקשורים לגיל.',
      findings: 'מחקרים מצאו שאנשים שעוסקים בפעילויות מגרות מחשבה לאורך חייהם, כולל משחקי מילים, מראים:',
      benefits: [
        'עיכוב בהופעת תסמיני דמנציה של עד 5 שנים',
        'שמירה טובה יותר על כישורי זיכרון וחשיבה בגיל מבוגר',
        'מהירות עיבוד ומוחית גמישה יותר',
        'יכולות פתרון בעיות משופרות'
      ],
      metaphor: 'תחשבו על זה כמו חשבון חיסכון למוח - כל משחק מילים שאתם משחקים הוא הפקדה קטנה שמשלמת דיבידנדים בהמשך החיים.'
    },
    multilingual: {
      title: 'היתרון הרב-לשוני',
      intro: 'משחק במשחקי מילים במספר שפות - כמו שלקסיקלאש מציעה עם עברית, אנגלית, שוודית ויפנית - מספק יתרונות קוגניטיביים אפילו גדולים יותר. אנשים דו-לשוניים ורב-לשוניים מראים:',
      benefits: [
        {
          title: 'תפקוד ניהולי משופר:',
          description: 'טובים יותר במעבר בין משימות ובמיקוד תשומת לב'
        },
        {
          title: 'מודעות מטא-לשונית משופרת:',
          description: 'הבנה גדולה יותר של איך שפה עובדת'
        },
        {
          title: 'שליטה קוגניטיבית חזקה יותר:',
          description: 'טובים יותר בהתעלמות ממידע לא רלוונטי'
        },
        {
          title: 'הזדקנות קוגניטיבית מעוכבת:',
          description: 'רב-לשוניות נקשרה להופעה מאוחרת יותר של אלצהיימר'
        }
      ]
    },
    stressReduction: {
      title: 'הפחתת לחץ ובריאות נפשית',
      paragraph1: 'מעבר ליתרונות קוגניטיביים, משחקי מילים משמשים כמפיגי לחץ מצוינים. הקשב הממוקד הנדרש יוצר מצב דומה למדיטציה, המכונה "זרימה".',
      paragraph2: 'כשאתם שקועים במציאת מילים, אתם לא מהרהרים על לחץ בעבודה או דאגות יומיומיות. ההפסקה המנטלית הזו מאפשרת למוח להתאפס, להפחית רמות קורטיזול ולשפר את מצב הרוח הכולל.'
    },
    howMuch: {
      title: 'כמה צריך לשחק?',
      description: 'החדשות הטובות? אתם לא צריכים שעות של משחק כדי לראות תוצאות. מחקרים מציעים שאפילו 15-20 דקות של פעילויות מגרות מחשבה יומית יכולות לעשות הבדל משמעותי.',
      tipTitle: '💡 טיפ מקצועי: עקביות מנצחת עוצמה',
      tipContent: 'משחק של 15 דקות כל יום מועיל יותר ממשחק של שעתיים פעם בשבוע. מעורבות קבועה יוצרת שינויים עצביים מתמשכים.'
    },
    bottomLine: {
      title: 'שורה תחתונה',
      paragraph1: 'משחקי מילים הם לא רק בידור - הם דרך מגובה מדעית לשמור על המוח בריא, חד וגמיש לאורך החיים. כל חידה שאתם פותרים, כל מילה שאתם מוצאים, תורמת לבניית מוח חזק וגמיש יותר.',
      paragraph2: 'אז בפעם הבאה שמישהו אומר שאתם "רק משחקים משחקים", אתם יכולים לספר לו שאתם בעצם משקיעים בבריאות הקוגניטיבית שלכם. למדע יש את הגב שלכם!'
    },
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'נסו אתגר יומי',
    practiceNow: 'תתחילו לתרגל'
  },

  en: {
    title: 'The Science Behind Word Games and Brain Health',
    category: 'Research',
    date: 'January 30, 2026',
    readTime: '6 min read',
    imageAlt: 'Illustration of a glowing brain made of interconnected words showing cognitive benefits of word games',
    intro: 'Ever wondered why word games feel so satisfying? It\'s not just fun—your brain is actually getting a comprehensive workout. Science shows that playing word games regularly can improve memory, expand vocabulary, and even help protect against cognitive decline.',
    brainBoost: {
      title: 'How Word Games Boost Your Brain',
      description: 'When you play word games, you\'re not just having fun—you\'re engaging multiple cognitive systems simultaneously. Here\'s what happens in your brain:',
      cards: [
        {
          title: 'Pattern Recognition',
          description: 'Your brain strengthens neural pathways responsible for identifying patterns and sequences.'
        },
        {
          title: 'Memory Activation',
          description: 'Retrieving words from memory exercises both short-term and long-term memory systems.'
        },
        {
          title: 'Executive Function',
          description: 'Planning strategies and making decisions activates your brain\'s control center.'
        }
      ]
    },
    vocabulary: {
      title: 'The Vocabulary Connection',
      intro: 'Research shows that people who regularly play word games have significantly larger vocabularies than non-players. But it\'s not just about knowing more words—it\'s about how you use them.',
      subtitle: 'Active vs. Passive Vocabulary',
      types: 'Most people have two vocabularies:',
      passive: 'Passive vocabulary: Words you recognize when reading or hearing',
      active: 'Active vocabulary: Words you actually use in speaking and writing',
      conclusion: 'Word games are particularly effective because they force you to actively recall and use words, converting passive vocabulary into active vocabulary. This creates stronger neural connections and makes these words more accessible in daily life.'
    },
    cognitiveReserve: {
      title: 'Cognitive Reserve: Your Brain\'s Retirement Fund',
      intro: 'One of the most exciting discoveries in neuroscience is the concept of "cognitive reserve"—essentially, your brain\'s ability to compensate for age-related changes and damage.',
      findings: 'Studies have found that people who engage in mentally stimulating activities throughout their lives, including word games, show:',
      benefits: [
        'Delayed onset of dementia symptoms by up to 5 years',
        'Better maintenance of memory and thinking skills in old age',
        'Faster processing speed and mental flexibility',
        'Enhanced problem-solving abilities'
      ],
      metaphor: 'Think of it like a savings account for your brain—every word game you play is a small deposit that pays dividends later in life.'
    },
    multilingual: {
      title: 'The Multilingual Advantage',
      intro: 'Playing word games in multiple languages—like LexiClash offers with Hebrew, English, Swedish, and Japanese—provides even greater cognitive benefits. Bilingual and multilingual individuals show:',
      benefits: [
        {
          title: 'Enhanced executive function:',
          description: 'Better at task-switching and focusing attention'
        },
        {
          title: 'Improved metalinguistic awareness:',
          description: 'Greater understanding of how language works'
        },
        {
          title: 'Stronger cognitive control:',
          description: 'Better at ignoring irrelevant information'
        },
        {
          title: 'Delayed cognitive aging:',
          description: 'Multilingualism has been linked to later onset of Alzheimer\'s disease'
        }
      ]
    },
    stressReduction: {
      title: 'Stress Reduction and Mental Wellness',
      paragraph1: 'Beyond cognitive benefits, word games serve as excellent stress relievers. The focused attention required creates a state similar to meditation, known as "flow."',
      paragraph2: 'When you\'re absorbed in finding words, you\'re not ruminating about work stress or daily worries. This mental break allows your brain to reset, reducing cortisol levels and improving overall mood.'
    },
    howMuch: {
      title: 'How Much Do You Need to Play?',
      description: 'The good news? You don\'t need hours of gameplay to see benefits. Research suggests that even 15-20 minutes of mentally stimulating activities daily can make a significant difference.',
      tipTitle: '💡 Pro Tip: Consistency beats intensity',
      tipContent: 'Playing 15 minutes every day is more beneficial than playing 2 hours once a week. Regular engagement creates lasting neural changes.'
    },
    bottomLine: {
      title: 'The Bottom Line',
      paragraph1: 'Word games aren\'t just entertainment—they\'re a scientifically-backed way to keep your brain healthy, sharp, and resilient throughout your life. Every puzzle you solve, every word you find, contributes to building a stronger, more flexible mind.',
      paragraph2: 'So the next time someone says you\'re "just playing games," you can tell them you\'re actually investing in your cognitive health. Science has your back!'
    },
    backToBlog: 'Back to Blog',
    tryDaily: 'Try Daily Challenge',
    practiceNow: 'Practice Now'
  },

  sv: {
    title: 'Vetenskapen bakom ordspel och hjärnhälsa',
    category: 'Forskning',
    date: '30 januari, 2026',
    readTime: '6 min läsning',
    imageAlt: 'Illustration av en lysande hjärna gjord av sammankopplade ord som visar kognitiva fördelar med ordspel',
    intro: 'Undrat varför ordspel känns så tillfredsställande? Det är inte bara kul—din hjärna får faktiskt en omfattande träning. Forskning visar att regelbundet spelande av ordspel kan förbättra minnet, utöka ordförrådet och till och med hjälpa till att skydda mot kognitiv nedgång.',
    brainBoost: {
      title: 'Hur ordspel förstärker din hjärna',
      description: 'När du spelar ordspel har du inte bara kul—du aktiverar flera kognitiva system samtidigt. Här är vad som händer i din hjärna:',
      cards: [
        {
          title: 'Mönsterigenkänning',
          description: 'Din hjärna stärker nervbanor som ansvarar för att identifiera mönster och sekvenser.'
        },
        {
          title: 'Minnesaktivering',
          description: 'Att hämta ord från minnet tränar både kortminne och långtidsminne.'
        },
        {
          title: 'Exekutiv funktion',
          description: 'Planering av strategier och beslutsfattande aktiverar hjärnans kontrollcentrum.'
        }
      ]
    },
    vocabulary: {
      title: 'Ordförrådskopplingen',
      intro: 'Forskning visar att människor som regelbundet spelar ordspel har betydligt större ordförråd än icke-spelare. Men det handlar inte bara om att känna till fler ord—det handlar om hur du använder dem.',
      subtitle: 'Aktivt vs. Passivt ordförråd',
      types: 'De flesta har två ordförråd:',
      passive: 'Passivt ordförråd: Ord du känner igen när du läser eller hör',
      active: 'Aktivt ordförråd: Ord du faktiskt använder när du talar och skriver',
      conclusion: 'Ordspel är särskilt effektiva eftersom de tvingar dig att aktivt komma ihåg och använda ord, vilket omvandlar passivt ordförråd till aktivt. Detta skapar starkare neurala kopplingar och gör dessa ord mer tillgängliga i vardagen.'
    },
    cognitiveReserve: {
      title: 'Kognitiv reserv: Din hjärnas pensionsfond',
      intro: 'En av de mest spännande upptäckterna inom neurovetenskap är konceptet "kognitiv reserv"—i grund och botten din hjärnas förmåga att kompensera för åldersrelaterade förändringar och skador.',
      findings: 'Studier har visat att människor som ägnar sig åt mentalt stimulerande aktiviteter genom hela livet, inklusive ordspel, uppvisar:',
      benefits: [
        'Försenad uppkomst av demenssymptom med upp till 5 år',
        'Bättre bibehållande av minne och tänkande i hög ålder',
        'Snabbare bearbetningshastighet och mental flexibilitet',
        'Förbättrade problemlösningsförmågor'
      ],
      metaphor: 'Tänk på det som ett sparkonto för din hjärna—varje ordspel du spelar är en liten insättning som ger utdelning senare i livet.'
    },
    multilingual: {
      title: 'Den flerspråkiga fördelen',
      intro: 'Att spela ordspel på flera språk—som LexiClash erbjuder med hebreiska, engelska, svenska och japanska—ger ännu större kognitiva fördelar. Tvåspråkiga och flerspråkiga individer visar:',
      benefits: [
        {
          title: 'Förbättrad exekutiv funktion:',
          description: 'Bättre på att byta mellan uppgifter och fokusera uppmärksamhet'
        },
        {
          title: 'Förbättrad metalingvistisk medvetenhet:',
          description: 'Större förståelse för hur språk fungerar'
        },
        {
          title: 'Starkare kognitiv kontroll:',
          description: 'Bättre på att ignorera irrelevant information'
        },
        {
          title: 'Försenad kognitiv åldrande:',
          description: 'Flerspråkighet har kopplats till senare uppkomst av Alzheimers sjukdom'
        }
      ]
    },
    stressReduction: {
      title: 'Stressreducering och mental hälsa',
      paragraph1: 'Utöver kognitiva fördelar fungerar ordspel som utmärkta stressreducerare. Den fokuserade uppmärksamheten som krävs skapar ett tillstånd liknande meditation, känt som "flow".',
      paragraph2: 'När du är uppslukad av att hitta ord grubblar du inte över arbetsstress eller dagliga bekymmer. Denna mentala paus låter din hjärna återställas, vilket minskar kortisolnivåerna och förbättrar det allmänna humöret.'
    },
    howMuch: {
      title: 'Hur mycket behöver du spela?',
      description: 'De goda nyheterna? Du behöver inte timmar av spelande för att se fördelar. Forskning tyder på att även 15-20 minuter av mentalt stimulerande aktiviteter dagligen kan göra en betydande skillnad.',
      tipTitle: '💡 Proffstips: Konsistens slår intensitet',
      tipContent: 'Att spela 15 minuter varje dag är mer fördelaktigt än att spela 2 timmar en gång i veckan. Regelbundet engagemang skapar varaktiga neurala förändringar.'
    },
    bottomLine: {
      title: 'Slutsatsen',
      paragraph1: 'Ordspel är inte bara underhållning—de är ett vetenskapligt beprövat sätt att hålla din hjärna frisk, skarp och motståndskraftig genom hela livet. Varje pussel du löser, varje ord du hittar, bidrar till att bygga ett starkare, mer flexibelt sinne.',
      paragraph2: 'Så nästa gång någon säger att du "bara spelar spel" kan du berätta att du faktiskt investerar i din kognitiva hälsa. Vetenskapen har din rygg!'
    },
    backToBlog: 'Tillbaka till bloggen',
    tryDaily: 'Prova daglig utmaning',
    practiceNow: 'Träna nu'
  },

  ja: {
    title: '単語ゲームと脳の健康の科学',
    category: '研究',
    date: '2026年1月30日',
    readTime: '読了時間：6分',
    imageAlt: '単語ゲームの認知的利点を示す、相互接続された単語で作られた輝く脳のイラスト',
    intro: '単語ゲームがなぜこんなに満足感を与えるのか、不思議に思ったことはありませんか？それは単なる楽しみではありません—脳が実際に総合的なトレーニングを受けているのです。科学的研究によると、定期的に単語ゲームをプレイすることで記憶力が向上し、語彙が拡大し、認知機能の低下を防ぐのにも役立ちます。',
    brainBoost: {
      title: '単語ゲームが脳を強化する仕組み',
      description: '単語ゲームをプレイするとき、楽しんでいるだけではありません—複数の認知システムを同時に活性化させています。脳内で起こっていることは次のとおりです：',
      cards: [
        {
          title: 'パターン認識',
          description: 'パターンやシーケンスを識別する神経経路が強化されます。'
        },
        {
          title: '記憶の活性化',
          description: '記憶から単語を取り出すことで、短期記憶と長期記憶の両方のシステムが鍛えられます。'
        },
        {
          title: '実行機能',
          description: '戦略を計画し、意思決定を行うことで、脳の制御センターが活性化されます。'
        }
      ]
    },
    vocabulary: {
      title: '語彙とのつながり',
      intro: '研究によると、定期的に単語ゲームをプレイする人は、プレイしない人よりも著しく大きな語彙を持っています。しかし、それは単により多くの単語を知っているということだけではありません—それらをどのように使うかが重要なのです。',
      subtitle: '能動的語彙と受動的語彙',
      types: 'ほとんどの人には2種類の語彙があります：',
      passive: '受動的語彙：読んだり聞いたりしたときに認識できる単語',
      active: '能動的語彙：話したり書いたりするときに実際に使用する単語',
      conclusion: '単語ゲームは、能動的に単語を思い出して使用することを強いるため、特に効果的です。受動的語彙を能動的語彙に変換します。これにより、より強い神経接続が作られ、日常生活でこれらの単語がより利用しやすくなります。'
    },
    cognitiveReserve: {
      title: '認知予備力：脳の退職基金',
      intro: '神経科学における最も刺激的な発見の1つは、「認知予備力」という概念です—本質的には、加齢に伴う変化や損傷を補う脳の能力のことです。',
      findings: '研究によると、単語ゲームを含む精神的に刺激的な活動に生涯を通じて従事する人々は、次のような特徴を示すことがわかっています：',
      benefits: [
        '認知症症状の発症が最大5年遅れる',
        '高齢期における記憶力と思考力のより良い維持',
        'より速い処理速度と精神的柔軟性',
        '問題解決能力の向上'
      ],
      metaphor: '脳の貯蓄口座のようなものと考えてください—プレイする単語ゲームごとに、人生の後半で配当を支払う小さな預金をしているのです。'
    },
    multilingual: {
      title: '多言語の利点',
      intro: 'LexiClashがヘブライ語、英語、スウェーデン語、日本語で提供しているような複数の言語で単語ゲームをプレイすることは、さらに大きな認知的利点をもたらします。バイリンガルおよびマルチリンガルの個人は次のような特徴を示します：',
      benefits: [
        {
          title: '実行機能の向上：',
          description: 'タスクの切り替えと注意の集中がより優れている'
        },
        {
          title: 'メタ言語意識の向上：',
          description: '言語がどのように機能するかについてのより深い理解'
        },
        {
          title: 'より強い認知制御：',
          description: '無関係な情報を無視するのがより優れている'
        },
        {
          title: '認知老化の遅延：',
          description: '多言語能力はアルツハイマー病の発症遅延に関連している'
        }
      ]
    },
    stressReduction: {
      title: 'ストレス軽減と精神的健康',
      paragraph1: '認知的利点を超えて、単語ゲームは優れたストレス解消法としても機能します。必要とされる集中的な注意は、「フロー」として知られる瞑想に似た状態を作り出します。',
      paragraph2: '単語を見つけることに没頭しているとき、仕事のストレスや日常の心配事について考えていません。この精神的休息により、脳がリセットされ、コルチゾールレベルが減少し、全体的な気分が改善されます。'
    },
    howMuch: {
      title: 'どのくらいプレイする必要がありますか？',
      description: '良いニュースは？利点を得るために何時間もゲームプレイする必要はありません。研究によると、毎日わずか15〜20分の精神的に刺激的な活動でも大きな違いを生むことができます。',
      tipTitle: '💡 プロのヒント：一貫性が強度に勝る',
      tipContent: '毎日15分プレイすることは、週に1回2時間プレイするよりも有益です。定期的な取り組みは、持続的な神経の変化を生み出します。'
    },
    bottomLine: {
      title: '結論',
      paragraph1: '単語ゲームは単なる娯楽ではありません—生涯を通じて脳を健康で鋭敏で回復力のあるものに保つ、科学的に裏付けられた方法なのです。解決するパズルごと、見つける単語ごとに、より強く柔軟な心を築くことに貢献しています。',
      paragraph2: '次回誰かが「ただゲームをしているだけ」と言ったら、実際には認知的健康に投資していると伝えることができます。科学があなたの味方です！'
    },
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジを試す',
    practiceNow: '今すぐ練習'
  },

  es: {
    title: 'La ciencia detrás de los juegos de palabras y la salud cerebral',
    category: 'Investigación',
    date: '30 de enero, 2026',
    readTime: 'Lectura: 6 min',
    imageAlt: 'Ilustración de un cerebro brillante hecho de palabras interconectadas que muestra los beneficios cognitivos de los juegos de palabras',
    intro: '¿Alguna vez te preguntaste por qué los juegos de palabras se sienten tan satisfactorios? No es solo diversión—tu cerebro está recibiendo un entrenamiento integral. La ciencia muestra que jugar juegos de palabras regularmente puede mejorar la memoria, expandir el vocabulario e incluso ayudar a proteger contra el deterioro cognitivo.',
    brainBoost: {
      title: 'Cómo los juegos de palabras potencian tu cerebro',
      description: 'Cuando juegas juegos de palabras, no solo te estás divirtiendo—estás activando múltiples sistemas cognitivos simultáneamente. Esto es lo que sucede en tu cerebro:',
      cards: [
        {
          title: 'Reconocimiento de patrones',
          description: 'Tu cerebro fortalece las vías neuronales responsables de identificar patrones y secuencias.'
        },
        {
          title: 'Activación de memoria',
          description: 'Recuperar palabras de la memoria ejercita los sistemas de memoria a corto y largo plazo.'
        },
        {
          title: 'Función ejecutiva',
          description: 'Planificar estrategias y tomar decisiones activa el centro de control de tu cerebro.'
        }
      ]
    },
    vocabulary: {
      title: 'La conexión del vocabulario',
      intro: 'Las investigaciones muestran que las personas que juegan regularmente juegos de palabras tienen vocabularios significativamente más grandes que quienes no juegan. Pero no se trata solo de conocer más palabras—se trata de cómo las usas.',
      subtitle: 'Vocabulario activo vs. pasivo',
      types: 'La mayoría de las personas tienen dos vocabularios:',
      passive: 'Vocabulario pasivo: Palabras que reconoces al leer o escuchar',
      active: 'Vocabulario activo: Palabras que realmente usas al hablar y escribir',
      conclusion: 'Los juegos de palabras son particularmente efectivos porque te obligan a recordar y usar palabras activamente, convirtiendo el vocabulario pasivo en activo. Esto crea conexiones neuronales más fuertes y hace que estas palabras sean más accesibles en la vida diaria.'
    },
    cognitiveReserve: {
      title: 'Reserva cognitiva: El fondo de retiro de tu cerebro',
      intro: 'Uno de los descubrimientos más emocionantes en neurociencia es el concepto de "reserva cognitiva"—esencialmente, la capacidad de tu cerebro para compensar cambios y daños relacionados con la edad.',
      findings: 'Los estudios han encontrado que las personas que participan en actividades mentalmente estimulantes a lo largo de sus vidas, incluidos los juegos de palabras, muestran:',
      benefits: [
        'Retraso en la aparición de síntomas de demencia hasta 5 años',
        'Mejor mantenimiento de habilidades de memoria y pensamiento en la vejez',
        'Mayor velocidad de procesamiento y flexibilidad mental',
        'Capacidades mejoradas de resolución de problemas'
      ],
      metaphor: 'Piénsalo como una cuenta de ahorros para tu cerebro—cada juego de palabras que juegas es un pequeño depósito que paga dividendos más adelante en la vida.'
    },
    multilingual: {
      title: 'La ventaja multilingüe',
      intro: 'Jugar juegos de palabras en múltiples idiomas—como LexiClash ofrece con hebreo, inglés, sueco y japonés—proporciona beneficios cognitivos aún mayores. Los individuos bilingües y multilingües muestran:',
      benefits: [
        {
          title: 'Función ejecutiva mejorada:',
          description: 'Mejor en el cambio de tareas y el enfoque de la atención'
        },
        {
          title: 'Conciencia metalingüística mejorada:',
          description: 'Mayor comprensión de cómo funciona el lenguaje'
        },
        {
          title: 'Control cognitivo más fuerte:',
          description: 'Mejor para ignorar información irrelevante'
        },
        {
          title: 'Envejecimiento cognitivo retrasado:',
          description: 'El multilingüismo se ha relacionado con una aparición tardía de la enfermedad de Alzheimer'
        }
      ]
    },
    stressReduction: {
      title: 'Reducción del estrés y bienestar mental',
      paragraph1: 'Más allá de los beneficios cognitivos, los juegos de palabras sirven como excelentes alivios del estrés. La atención enfocada requerida crea un estado similar a la meditación, conocido como "flujo".',
      paragraph2: 'Cuando estás absorto en encontrar palabras, no estás rumiando sobre el estrés laboral o las preocupaciones diarias. Este descanso mental permite que tu cerebro se reinicie, reduciendo los niveles de cortisol y mejorando el estado de ánimo general.'
    },
    howMuch: {
      title: '¿Cuánto necesitas jugar?',
      description: '¿Las buenas noticias? No necesitas horas de juego para ver beneficios. Las investigaciones sugieren que incluso 15-20 minutos de actividades mentalmente estimulantes diarias pueden hacer una diferencia significativa.',
      tipTitle: '💡 Consejo profesional: La constancia vence a la intensidad',
      tipContent: 'Jugar 15 minutos todos los días es más beneficioso que jugar 2 horas una vez a la semana. El compromiso regular crea cambios neuronales duraderos.'
    },
    bottomLine: {
      title: 'La conclusión',
      paragraph1: 'Los juegos de palabras no son solo entretenimiento—son una forma respaldada científicamente de mantener tu cerebro saludable, agudo y resiliente durante toda tu vida. Cada rompecabezas que resuelves, cada palabra que encuentras, contribuye a construir una mente más fuerte y flexible.',
      paragraph2: 'Así que la próxima vez que alguien diga que estás "solo jugando juegos", puedes decirles que en realidad estás invirtiendo en tu salud cognitiva. ¡La ciencia te respalda!'
    },
    backToBlog: 'Volver al blog',
    tryDaily: 'Prueba el desafío diario',
    practiceNow: 'Practica ahora'
  }
};

export default function SciencePageClient(): React.ReactElement {
  const { t, language } = useLanguage();
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
              'bg-neo-cyan text-neo-black'
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
            'flex flex-wrap items-center gap-4 text-sm mb-6',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {content.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {content.readTime}
            </span>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-64 md:h-96 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/brain-health.jpg"
              alt={content.imageAlt}
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

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
              <Brain className="w-6 h-6 text-neo-cyan" />
              {content.brainBoost.title}
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.brainBoost.description}
            </p>

            <div className={cn(
              'grid md:grid-cols-3 gap-4 mb-6',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            )}>
              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-yellow/20'
              )}>
                <h3 className={cn('font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  <Lightbulb className="w-5 h-5 text-neo-yellow" />
                  {content.brainBoost.cards[0].title}
                </h3>
                <p className="text-sm">{content.brainBoost.cards[0].description}</p>
              </div>

              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-lime/20'
              )}>
                <h3 className={cn('font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  <TrendingUp className="w-5 h-5 text-neo-lime" />
                  {content.brainBoost.cards[1].title}
                </h3>
                <p className="text-sm">{content.brainBoost.cards[1].description}</p>
              </div>

              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-pink/20'
              )}>
                <h3 className={cn('font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  <Brain className="w-5 h-5 text-neo-pink" />
                  {content.brainBoost.cards[2].title}
                </h3>
                <p className="text-sm">{content.brainBoost.cards[2].description}</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.vocabulary.title}
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.vocabulary.intro}
            </p>

            <h3 className={cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.vocabulary.subtitle}
            </h3>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.vocabulary.types}
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>{content.vocabulary.passive}</strong></li>
              <li><strong>{content.vocabulary.active}</strong></li>
            </ul>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.vocabulary.conclusion}
            </p>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.cognitiveReserve.title}
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.cognitiveReserve.intro}
            </p>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.cognitiveReserve.findings}
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.cognitiveReserve.benefits.map((benefit, index) => (
                <li key={index}>{benefit}</li>
              ))}
            </ul>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.cognitiveReserve.metaphor}
            </p>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.multilingual.title}
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.multilingual.intro}
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.multilingual.benefits.map((benefit, index) => (
                <li key={index}>
                  <strong>{benefit.title}</strong> {benefit.description}
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.stressReduction.title}
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.stressReduction.paragraph1}
            </p>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.stressReduction.paragraph2}
            </p>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.howMuch.title}
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.howMuch.description}
            </p>
            <div className={cn(
              'p-4 rounded-neo border-2 border-neo-black mb-4',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-cyan/20'
            )}>
              <p className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {content.howMuch.tipTitle}
              </p>
              <p className={cn('text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                {content.howMuch.tipContent}
              </p>
            </div>
          </section>

          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mt-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20 border-neo-black'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.bottomLine.title}
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.bottomLine.paragraph1}
            </p>
            <p className={cn('mb-0', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              {content.bottomLine.paragraph2}
            </p>
          </div>

          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4 mt-6">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.tryDaily}
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.practiceNow}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
