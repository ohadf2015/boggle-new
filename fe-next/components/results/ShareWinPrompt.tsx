'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWhatsapp, FaLink, FaShare, FaTrophy, FaFire, FaTimes } from 'react-icons/fa';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../utils/ThemeContext';
import { getJoinUrl, copyJoinUrl, shareViaWhatsApp } from '../../utils/share';
import { trackShare, getShareUrlWithTracking, generateReferralCode } from '../../utils/growthTracking';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface Achievement {
  id?: string;
  key?: string;
  icon?: string;
  name?: string;
}

interface ShareWinPromptProps {
  isWinner: boolean;
  username: string;
  score: number;
  wordCount: number;
  achievements?: Achievement[];
  gameCode: string;
  streakDays?: number;
  onClose?: () => void;
  compact?: boolean;
}

// Witty share messages - English
const WITTY_WINNER_MESSAGES_EN = {
  legendary: [ // score > 150
    "🔥 I just went NUCLEAR in LexiClash! {score} points. My brain is literally smoking.",
    "🔥 {score} points?! I didn't know I had this many brain cells. LexiClash brings out my inner genius.",
    "🔥 Just dropped {score} points like it's hot. Your move, smarty pants.",
    "🔥 Warning: I am dangerously good at finding words. {score} points. Come humble me (you can't).",
    "🔥 My dictionary called. It's scared. {score} points in LexiClash!",
  ],
  amazing: [ // score > 100
    "⚡ {score} points! Either I'm a genius or my opponents need coffee. Probably both.",
    "⚡ Just word-vomited my way to {score} points. Beautiful chaos.",
    "⚡ {score} points! I see letters in my sleep now. Send help. Or challengers.",
    "⚡ Vocabulary? Checked. Opponents? Wrecked. {score} points!",
    "⚡ {score} points! I'm not saying I'm the GOAT, but... BAAA 🐐",
  ],
  good: [ // score > 50
    "⭐ {score} points! Not too shabby for someone who types with two fingers.",
    "⭐ Scored {score} points! My 3rd grade spelling bee trophy is quaking.",
    "⭐ {score} points! Autocorrect could never.",
    "⭐ {score} points in LexiClash! My English teacher would finally be proud.",
    "⭐ Just flexed my vocabulary muscles. {score} points!",
  ],
  normal: [ // any score
    "🎮 {score} points! Come play and see if you can do better (spoiler: probably not).",
    "🎮 Just scored {score} in LexiClash! It's giving main character energy.",
    "🎮 {score} points! Not my best, not my worst, definitely my vibe.",
    "🎮 {score} points! The letters feared me today.",
  ],
};

const WITTY_LOSER_MESSAGES_EN = [
  "🎮 Just played LexiClash and honestly? I regret nothing. Come join the chaos!",
  "🎮 Lost at LexiClash but won at having fun. That counts, right? RIGHT?!",
  "🎮 I found {wordCount} words but my dignity? Still searching.",
  "🎮 My vocabulary took a vacation. {wordCount} words in LexiClash. I'll get 'em next time!",
  "🎮 Plot twist: I didn't win. But I DID have fun finding {wordCount} words!",
];

// Witty share messages - Hebrew
const WITTY_WINNER_MESSAGES_HE = {
  legendary: [
    "🔥 {score} נקודות?! המוח שלי עדיין בוער. LexiClash עשה ממני גאונות!",
    "🔥 פשוט הרסתי את LexiClash עם {score} נקודות. מי מעז להתמודד?",
    "🔥 {score} נקודות! המילון התקשר, הוא פוחד ממני.",
    "🔥 אזהרה: רמת מציאת מילים מסוכנת. {score} נקודות!",
    "🔥 {score} נקודות! האקדמיה ללשון רוצה לדבר איתי.",
  ],
  amazing: [
    "⚡ {score} נקודות! או גאונות טהורה או היריבים צריכים קפה.",
    "⚡ {score} נקודות! רואים אותיות בחלומות עכשיו. שלחו עזרה.",
    "⚡ אוצר מילים? יש. יריבים? מרוסקים. {score} נקודות!",
    "⚡ {score} נקודות! לא רוצים להתפאר, אבל... 🐐",
    "⚡ {score} נקודות! המוח עובד שעות נוספות.",
  ],
  good: [
    "⭐ {score} נקודות! לא רע בכלל למי שמקליד עם שתי אצבעות.",
    "⭐ {score} נקודות! סוף סוף משתלם שקראנו ספרים.",
    "⭐ שריר אוצר המילים עבד היום. {score} נקודות!",
    "⭐ {score} נקודות! המילים פשוט זרמו.",
  ],
  normal: [
    "🎮 {score} נקודות! בואו תנסו לעשות יותר טוב (ספוילר: כנראה לא).",
    "🎮 {score} נקודות! האותיות פחדו ממני היום.",
    "🎮 {score} נקודות! לא הכי גבוה, אבל הכי כיף.",
  ],
};

const WITTY_LOSER_MESSAGES_HE = [
  "🎮 שיחקתי LexiClash ובכנות? אפס חרטות. בואו לכאוס!",
  "🎮 הפסד? אולי. כיף? בהחלט. זה מה שחשוב, נכון?!",
  "🎮 מצאתי {wordCount} מילים אבל את הכבוד? עדיין מחפשים.",
  "🎮 אוצר המילים יצא לחופש. בפעם הבאה מנצחים!",
  "🎮 לא ניצחתי, אבל לפחות למדתי מילים חדשות. בערך.",
];

// Swedish messages
const WITTY_WINNER_MESSAGES_SV = {
  legendary: [
    "🔥 {score} poäng?! Min hjärna brinner fortfarande. LexiClash gjorde mig till ett geni.",
    "🔥 Krossade just LexiClash med {score} poäng. Vågar någon utmana mig?",
    "🔥 {score} poäng! Ordboken ringde, den är rädd för mig.",
  ],
  amazing: [
    "⚡ {score} poäng! Antingen är jag ett geni eller så behöver motståndarna kaffe.",
    "⚡ {score} poäng! Jag ser bokstäver i mina drömmar nu. Skicka hjälp.",
    "⚡ Ordförråd? Check. Motståndare? Krossade. {score} poäng!",
  ],
  good: [
    "⭐ {score} poäng! Inte illa för någon som skriver med två fingrar.",
    "⭐ {score} poäng! Min svensklärare skulle äntligen vara stolt.",
  ],
  normal: [
    "🎮 {score} poäng! Kom och försök slå det (spoiler: förmodligen inte).",
    "🎮 {score} poäng! Bokstäverna var rädda för mig idag.",
  ],
};

const WITTY_LOSER_MESSAGES_SV = [
  "🎮 Spelade LexiClash och ärligt talat? Ångrar ingenting. Kom och var med!",
  "🎮 Förlorade men hade kul. Det räknas, eller hur? ELLER HUR?!",
  "🎮 Hittade {wordCount} ord men min värdighet? Letar fortfarande.",
];

// Spanish messages
const WITTY_WINNER_MESSAGES_ES = {
  legendary: [
    "🔥 ¡{score} puntos! Mi cerebro todavía está ardiendo. LexiClash me convirtió en genio.",
    "🔥 Acabo de destruir LexiClash con {score} puntos. ¿Alguien se atreve?",
    "🔥 ¡{score} puntos! El diccionario llamó, me tiene miedo.",
  ],
  amazing: [
    "⚡ ¡{score} puntos! O soy un genio o mis oponentes necesitan café.",
    "⚡ ¡{score} puntos! Ahora veo letras en mis sueños. Envíen ayuda.",
    "⚡ ¿Vocabulario? Listo. ¿Oponentes? Destruidos. ¡{score} puntos!",
  ],
  good: [
    "⭐ ¡{score} puntos! Nada mal para alguien que escribe con dos dedos.",
    "⭐ ¡{score} puntos! Mi profe de español finalmente estaría orgulloso/a.",
  ],
  normal: [
    "🎮 ¡{score} puntos! Ven a intentar superarlo (spoiler: probablemente no).",
    "🎮 ¡{score} puntos! Las letras me temían hoy.",
  ],
};

const WITTY_LOSER_MESSAGES_ES = [
  "🎮 Jugué LexiClash y ¿sinceramente? No me arrepiento de nada. ¡Únete al caos!",
  "🎮 Perdí pero me divertí. Eso cuenta, ¿verdad? ¿¡VERDAD!?",
  "🎮 Encontré {wordCount} palabras pero ¿mi dignidad? Sigo buscando.",
];

// French messages
const WITTY_WINNER_MESSAGES_FR = {
  legendary: [
    "🔥 {score} points ?! Mon cerveau fume encore. LexiClash m'a transformé en génie.",
    "🔥 Je viens d'écraser LexiClash avec {score} points. Qui ose me défier ?",
    "🔥 {score} points ! Le dictionnaire a appelé, il a peur de moi.",
  ],
  amazing: [
    "⚡ {score} points ! Soit je suis un génie, soit mes adversaires ont besoin de café.",
    "⚡ {score} points ! Je vois des lettres dans mes rêves maintenant. Envoyez de l'aide.",
    "⚡ Vocabulaire ? OK. Adversaires ? Détruits. {score} points !",
  ],
  good: [
    "⭐ {score} points ! Pas mal pour quelqu'un qui tape avec deux doigts.",
    "⭐ {score} points ! Mon prof de français serait enfin fier/fière.",
  ],
  normal: [
    "🎮 {score} points ! Viens essayer de faire mieux (spoiler : probablement pas).",
    "🎮 {score} points ! Les lettres me craignaient aujourd'hui.",
  ],
};

const WITTY_LOSER_MESSAGES_FR = [
  "🎮 J'ai joué à LexiClash et honnêtement ? Je ne regrette rien. Rejoins le chaos !",
  "🎮 J'ai perdu mais je me suis amusé(e). Ça compte, non ? NON ?!",
  "🎮 J'ai trouvé {wordCount} mots mais ma dignité ? Toujours en recherche.",
];

// German messages
const WITTY_WINNER_MESSAGES_DE = {
  legendary: [
    "🔥 {score} Punkte?! Mein Gehirn brennt noch. LexiClash hat mich zum Genie gemacht.",
    "🔥 Gerade LexiClash mit {score} Punkten zerstört. Wagt es jemand, mich herauszufordern?",
    "🔥 {score} Punkte! Das Wörterbuch hat angerufen, es hat Angst vor mir.",
  ],
  amazing: [
    "⚡ {score} Punkte! Entweder bin ich ein Genie oder meine Gegner brauchen Kaffee.",
    "⚡ {score} Punkte! Ich sehe jetzt Buchstaben in meinen Träumen. Schickt Hilfe.",
    "⚡ Wortschatz? Check. Gegner? Zerstört. {score} Punkte!",
  ],
  good: [
    "⭐ {score} Punkte! Nicht schlecht für jemanden, der mit zwei Fingern tippt.",
    "⭐ {score} Punkte! Mein Deutschlehrer wäre endlich stolz.",
  ],
  normal: [
    "🎮 {score} Punkte! Komm und versuch es besser zu machen (Spoiler: wahrscheinlich nicht).",
    "🎮 {score} Punkte! Die Buchstaben hatten heute Angst vor mir.",
  ],
};

const WITTY_LOSER_MESSAGES_DE = [
  "🎮 Habe LexiClash gespielt und ehrlich? Bereue nichts. Komm ins Chaos!",
  "🎮 Verloren aber Spaß gehabt. Das zählt, oder? ODER?!",
  "🎮 Habe {wordCount} Wörter gefunden, aber meine Würde? Suche noch.",
];

// Witty viral prompts to display below the share buttons
const VIRAL_PROMPTS_EN = [
  "Challenge your friends... if they dare 😈",
  "Warning: May cause intense vocabulary envy",
  "Show them who the real wordsmith is 💪",
  "Make your friends question their education",
  "Friendship-ending scores await!",
  "Let's see who actually paid attention in English class",
  "Time to find out who the smart friend is",
];

const VIRAL_PROMPTS_HE = [
  "תאתגרו את החברים... אם הם מעזים 😈",
  "אזהרה: עלול לגרום לקנאה חריפה באוצר מילים",
  "הראו להם מי הבוס של המילים 💪",
  "בואו נראה מי באמת הקשיב בשיעור עברית",
  "הזמינו את החברים להפסיד בכבוד 🎯",
  "מי חשב שמילים יכולות להיות כל כך מסוכנות?",
];

const VIRAL_PROMPTS_SV = [
  "Utmana dina vänner... om de vågar 😈",
  "Varning: Kan orsaka intensiv ordförrådsavund",
  "Visa dem vem som är den riktiga ordsmeden 💪",
  "Dags att ta reda på vem den smarta vännen är",
];

const VIRAL_PROMPTS_ES = [
  "Desafía a tus amigos... si se atreven 😈",
  "Advertencia: Puede causar envidia de vocabulario intensa",
  "Demuéstrales quién es el verdadero maestro de palabras 💪",
  "¡Hora de ver quién es el amigo inteligente!",
];

const VIRAL_PROMPTS_FR = [
  "Défiez vos amis... s'ils osent 😈",
  "Attention : Peut causer une jalousie de vocabulaire intense",
  "Montrez-leur qui est le vrai maître des mots 💪",
  "C'est l'heure de découvrir qui est l'ami intelligent !",
];

const VIRAL_PROMPTS_DE = [
  "Fordere deine Freunde heraus... wenn sie sich trauen 😈",
  "Warnung: Kann intensiven Wortschatz-Neid verursachen",
  "Zeig ihnen, wer der wahre Wortmeister ist 💪",
  "Zeit herauszufinden, wer der schlaue Freund ist!",
];

// Helper to pick random item from array
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const ShareWinPrompt: React.FC<ShareWinPromptProps> = ({
  isWinner,
  username,
  score,
  wordCount,
  achievements = [],
  gameCode,
  streakDays = 0,
  onClose,
  compact = false,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [copied, setCopied] = useState(false);

  // Generate witty personalized share message
  const shareMessage = useMemo(() => {
    const referralCode = generateReferralCode();
    const url = getShareUrlWithTracking(gameCode, referralCode);

    // Achievement icons (max 3)
    const achievementIcons = achievements
      .slice(0, 3)
      .map(a => a.icon || '🏆')
      .join('');

    // Streak text
    const streakText = streakDays && streakDays > 1
      ? language === 'he'
        ? `\n🔥 רצף של ${streakDays} ימים!`
        : `\n🔥 ${streakDays} day streak - I'm on FIRE!`
      : '';

    // Pick witty message based on score tier, winner status, and language
    // Get language-specific messages or fall back to English
    const getWinnerMessages = () => {
      switch (language) {
        case 'he': return WITTY_WINNER_MESSAGES_HE;
        case 'sv': return WITTY_WINNER_MESSAGES_SV;
        case 'es': return WITTY_WINNER_MESSAGES_ES;
        case 'fr': return WITTY_WINNER_MESSAGES_FR;
        case 'de': return WITTY_WINNER_MESSAGES_DE;
        default: return WITTY_WINNER_MESSAGES_EN;
      }
    };

    const getLoserMessages = () => {
      switch (language) {
        case 'he': return WITTY_LOSER_MESSAGES_HE;
        case 'sv': return WITTY_LOSER_MESSAGES_SV;
        case 'es': return WITTY_LOSER_MESSAGES_ES;
        case 'fr': return WITTY_LOSER_MESSAGES_FR;
        case 'de': return WITTY_LOSER_MESSAGES_DE;
        default: return WITTY_LOSER_MESSAGES_EN;
      }
    };

    let baseMessage: string;

    if (isWinner) {
      const messages = getWinnerMessages();
      if (score > 150) {
        baseMessage = pickRandom(messages.legendary);
      } else if (score > 100) {
        baseMessage = pickRandom(messages.amazing);
      } else if (score > 50) {
        baseMessage = pickRandom(messages.good);
      } else {
        baseMessage = pickRandom(messages.normal);
      }
    } else {
      baseMessage = pickRandom(getLoserMessages());
    }

    // Replace placeholders
    baseMessage = baseMessage
      .replace('{score}', String(score))
      .replace('{wordCount}', String(wordCount));

    // Add achievements and word count info
    const statsLine = language === 'he'
      ? `\n${wordCount} מילים${achievementIcons ? ` ${achievementIcons}` : ''}`
      : `\n${wordCount} words found${achievementIcons ? ` ${achievementIcons}` : ''}`;

    // Compose final message
    return `${baseMessage}${isWinner ? statsLine : ''}${streakText}\n\n${url}`;
  }, [isWinner, score, wordCount, achievements, gameCode, language, streakDays]);

  // Random viral prompt based on language
  const viralPrompt = useMemo(() => {
    const getViralPrompts = () => {
      switch (language) {
        case 'he': return VIRAL_PROMPTS_HE;
        case 'sv': return VIRAL_PROMPTS_SV;
        case 'es': return VIRAL_PROMPTS_ES;
        case 'fr': return VIRAL_PROMPTS_FR;
        case 'de': return VIRAL_PROMPTS_DE;
        default: return VIRAL_PROMPTS_EN;
      }
    };
    return pickRandom(getViralPrompts());
  }, [language]);

  // Handle WhatsApp share - use whatsapp utm_source for tracking
  const handleWhatsAppShare = () => {
    trackShare('whatsapp', gameCode);

    // Generate message with whatsapp utm_source
    const referralCode = generateReferralCode();
    const url = getShareUrlWithTracking(gameCode, referralCode, 'whatsapp');
    // Replace URL in share message with the whatsapp-tracked URL
    const messageWithTracking = shareMessage.replace(/https?:\/\/[^\s]+/, url);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(messageWithTracking)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Handle copy link - use copy utm_source for tracking
  const handleCopyLink = async () => {
    trackShare('copy', gameCode);

    const referralCode = generateReferralCode();
    const url = getShareUrlWithTracking(gameCode, referralCode, 'copy');

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('share.linkCopied'), { icon: '📋' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('share.copyError'));
    }
  };

  // Handle native share (if available) - use native_share utm_source
  const handleNativeShare = async () => {
    if (navigator.share) {
      trackShare('native', gameCode);

      try {
        const referralCode = generateReferralCode();
        const url = getShareUrlWithTracking(gameCode, referralCode, 'native_share');
        await navigator.share({
          title: 'LexiClash',
          text: shareMessage.replace(/https?:\/\/[^\s]+/, url),
          url: url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
    }
  };

  // Don't show for non-winners unless they have a good score
  if (!isWinner && score < 30) return null;

  // Compact inline version - just share buttons with witty prompt
  if (compact && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex flex-col sm:flex-row items-center justify-center gap-3 p-4 rounded-xl border-2',
          isDarkMode
            ? 'bg-slate-800/60 border-cyan-400/30 shadow-[3px_3px_0px_rgba(34,211,238,0.2)]'
            : 'bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-300 shadow-[3px_3px_0px_rgba(34,211,238,0.3)]'
        )}
      >
        <span className={cn('text-sm font-bold', isDarkMode ? 'text-cyan-300' : 'text-cyan-700')}>
          {language === 'he' ? 'הזמינו חברים לקרב! 🎯' : 'Recruit challengers! 🎯'}
        </span>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-bold rounded-lg border-2 border-[#1a9e4a] shadow-[2px_2px_0px_#1a9e4a] transition-all"
          >
            <FaWhatsapp size={14} />
            <span className="hidden sm:inline">{language === 'he' ? 'וואטסאפ' : 'WhatsApp'}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyLink}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-lg border-2 transition-all',
              copied
                ? 'bg-green-500 text-white border-green-700 shadow-[2px_2px_0px_#15803d]'
                : isDarkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-500 shadow-[2px_2px_0px_#475569]'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-400 shadow-[2px_2px_0px_#9ca3af]'
            )}
          >
            <FaLink size={12} />
            <span className="hidden sm:inline">{copied ? '✓' : (language === 'he' ? 'לינק' : 'Link')}</span>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={cn(
          'relative p-4 sm:p-5 rounded-2xl border-3 overflow-hidden',
          isWinner
            ? isDarkMode
              ? 'bg-gradient-to-br from-yellow-900/30 via-amber-900/20 to-orange-900/30 border-yellow-400/60 shadow-[4px_4px_0px_rgba(250,204,21,0.4)]'
              : 'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-yellow-400 shadow-[4px_4px_0px_rgba(250,204,21,0.5)]'
            : isDarkMode
            ? 'bg-gradient-to-br from-cyan-900/30 via-blue-900/20 to-indigo-900/30 border-cyan-400/50 shadow-[4px_4px_0px_rgba(34,211,238,0.3)]'
            : 'bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border-cyan-400 shadow-[4px_4px_0px_rgba(34,211,238,0.4)]'
        )}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-white/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded-full transition-colors',
              isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'
            )}
          >
            <FaTimes size={14} />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            className="relative"
          >
            {isWinner ? (
              <FaTrophy className="text-3xl text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.7)]" />
            ) : (
              <FaShare className="text-2xl text-blue-400" />
            )}
          </motion.div>
          <div>
            <h3
              className={cn(
                'text-xl font-black uppercase tracking-wide',
                isDarkMode ? 'text-white' : 'text-gray-900'
              )}
            >
              {isWinner
                ? language === 'he' ? 'שתפו את הניצחון! 🎉' : 'FLEX YOUR WIN! 🎉'
                : language === 'he' ? 'שתפו את המשחק!' : 'SHARE THE FUN!'}
            </h3>
            <p className={cn('text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
              {isWinner
                ? language === 'he' ? 'הראו לחברים מי הבוס' : 'Make your friends jealous'
                : language === 'he' ? 'הזמינו חברים למשחק' : 'Get your crew in here'}
            </p>
          </div>
        </div>

        {/* Streak badge (if applicable) */}
        {streakDays > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4',
              streakDays >= 7
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            )}
          >
            <FaFire className={streakDays >= 7 ? 'text-orange-500' : 'text-yellow-500'} />
            {streakDays} {t('growth.dayStreak') || 'day streak'}!
          </motion.div>
        )}

        {/* Stats preview */}
        <div
          className={cn(
            'flex items-center justify-center gap-4 mb-4 p-3 rounded-xl border-2',
            isDarkMode
              ? 'bg-black/30 border-white/10'
              : 'bg-white/60 border-gray-200'
          )}
        >
          <div className="text-center px-3">
            <div className={cn('text-2xl font-black', isDarkMode ? 'text-yellow-400' : 'text-yellow-600')}>
              {score}
            </div>
            <div className={cn('text-xs font-bold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
              {language === 'he' ? 'נקודות' : 'pts'}
            </div>
          </div>
          <div className={cn('w-0.5 h-10 rounded-full', isDarkMode ? 'bg-white/20' : 'bg-gray-300')} />
          <div className="text-center px-3">
            <div className={cn('text-2xl font-black', isDarkMode ? 'text-cyan-400' : 'text-cyan-600')}>
              {wordCount}
            </div>
            <div className={cn('text-xs font-bold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
              {language === 'he' ? 'מילים' : 'words'}
            </div>
          </div>
          {achievements.length > 0 && (
            <>
              <div className={cn('w-0.5 h-10 rounded-full', isDarkMode ? 'bg-white/20' : 'bg-gray-300')} />
              <div className="text-center px-3">
                <div className="text-2xl">{achievements.slice(0, 3).map(a => a.icon || '🏆').join('')}</div>
                <div className={cn('text-xs font-bold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                  {achievements.length} {language === 'he' ? 'הישגים' : 'badges'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Share buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleWhatsAppShare}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-sm uppercase tracking-wide rounded-xl border-2 border-[#1a9e4a] shadow-[3px_3px_0px_#1a9e4a] hover:shadow-[1px_1px_0px_#1a9e4a] transition-all duration-150"
          >
            <FaWhatsapp size={20} />
            <span>{language === 'he' ? 'שתפו בוואטסאפ' : 'Send on WhatsApp'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopyLink}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 font-black text-sm uppercase tracking-wide rounded-xl border-2 transition-all duration-150',
              copied
                ? 'bg-green-500 text-white border-green-700 shadow-[3px_3px_0px_#15803d]'
                : isDarkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-500 shadow-[3px_3px_0px_#475569] hover:shadow-[1px_1px_0px_#475569]'
                : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-400 shadow-[3px_3px_0px_#9ca3af] hover:shadow-[1px_1px_0px_#9ca3af]'
            )}
          >
            <FaLink size={16} />
            <span>{copied ? (language === 'he' ? 'הועתק!' : 'Copied!') : (language === 'he' ? 'העתק לינק' : 'Copy Link')}</span>
          </motion.button>

          {/* Native share button (mobile) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNativeShare}
              className={cn(
                'sm:hidden flex items-center justify-center gap-2 px-4 py-3 font-black text-sm uppercase tracking-wide rounded-xl border-2 transition-all duration-150',
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-800 shadow-[3px_3px_0px_#1e40af]'
                  : 'bg-blue-500 hover:bg-blue-400 text-white border-blue-700 shadow-[3px_3px_0px_#1d4ed8]'
              )}
            >
              <FaShare size={16} />
              <span>{language === 'he' ? 'שתף' : 'Share'}</span>
            </motion.button>
          )}
        </div>

        {/* Witty viral prompt */}
        <p
          className={cn(
            'mt-3 text-center text-sm font-medium italic',
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          )}
        >
          {viralPrompt}
        </p>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShareWinPrompt;
