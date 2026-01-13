const fs = require('fs');
const path = require('path');

// Translations to add - organized by section and language
const translations = {
  achievement: {
    en: {
      dailyDouble: 'Daily Double',
      'dailyDouble.desc': 'Complete both daily challenges in one day'
    },
    he: {
      dailyDouble: 'כפול יומי',
      'dailyDouble.desc': 'השלם את שני האתגרים היומיים ביום אחד'
    },
    sv: {
      dailyDouble: 'Dubbel Daglig',
      'dailyDouble.desc': 'Slutför båda dagliga utmaningarna på en dag'
    },
    ja: {
      dailyDouble: 'デイリーダブル',
      'dailyDouble.desc': '1日で両方のデイリーチャレンジを完了'
    },
    es: {
      dailyDouble: 'Doble Diario',
      'dailyDouble.desc': 'Completa ambos desafíos diarios en un día'
    }
  },
  buzz: {
    en: {
      badge: 'NEW',
      betaPreview: 'Beta Preview',
      challenges: 'challenges',
      connectingWord: 'Connecting word',
      error: 'Failed to load challenge',
      feature1: 'Daily trending topics',
      feature2: 'Shareable results',
      feature3: 'No time pressure',
      fillTheBlank: 'Fill in the blank',
      finish: 'Finish',
      helpText: 'Solve word puzzles based on today\'s trending topics',
      loading: 'Loading challenge...',
      maxScore: 'Max score',
      noTimeLimit: 'No time limit',
      'preview.play': 'Start Playing',
      'preview.subtitle': '5 word challenges. No timer. Just you and the trends.',
      'preview.title': 'Today\'s Daily Buzz',
      quitConfirm: 'Your progress won\'t be saved. Quit anyway?',
      quitConfirmTitle: 'Leave Daily Buzz?',
      'results.perfect': 'PERFECT BUZZ!',
      searches: 'trending searches',
      topicIs: 'Topic',
      total: 'Total',
      'trio.hint': 'What word connects all three?',
      viewResults: 'View Results',
      yourAnswer: 'Your answer',
      yourScore: 'Your Score'
    },
    he: {
      badge: 'חדש',
      betaPreview: 'תצוגה מקדימה',
      challenges: 'אתגרים',
      connectingWord: 'מילה מקשרת',
      error: 'נכשל בטעינת האתגר',
      feature1: 'נושאים טרנדיים יומיים',
      feature2: 'תוצאות ניתנות לשיתוף',
      feature3: 'ללא לחץ זמן',
      fillTheBlank: 'מלא את החסר',
      finish: 'סיום',
      helpText: 'פתור חידות מילים על סמך נושאים טרנדיים של היום',
      loading: 'טוען אתגר...',
      maxScore: 'ניקוד מקסימלי',
      noTimeLimit: 'ללא הגבלת זמן',
      'preview.play': 'התחל לשחק',
      'preview.subtitle': '5 אתגרי מילים. ללא טיימר. רק אתה והטרנדים.',
      'preview.title': 'הבאז היומי של היום',
      quitConfirm: 'ההתקדמות שלך לא תישמר. לצאת בכל זאת?',
      quitConfirmTitle: 'לעזוב את הבאז היומי?',
      'results.perfect': 'באז מושלם!',
      searches: 'חיפושים טרנדיים',
      topicIs: 'נושא',
      total: 'סה״כ',
      'trio.hint': 'איזו מילה מקשרת בין שלושתם?',
      viewResults: 'צפה בתוצאות',
      yourAnswer: 'התשובה שלך',
      yourScore: 'הניקוד שלך'
    },
    sv: {
      badge: 'NYTT',
      betaPreview: 'Beta Förhandsgranskning',
      challenges: 'utmaningar',
      connectingWord: 'Koppla ord',
      error: 'Misslyckades att ladda utmaning',
      feature1: 'Dagliga trendämnen',
      feature2: 'Delningsbara resultat',
      feature3: 'Ingen tidspress',
      fillTheBlank: 'Fyll i tomrummet',
      finish: 'Avsluta',
      helpText: 'Lös ordpussel baserade på dagens trendämnen',
      loading: 'Laddar utmaning...',
      maxScore: 'Max poäng',
      noTimeLimit: 'Ingen tidsgräns',
      'preview.play': 'Börja Spela',
      'preview.subtitle': '5 ordutmaningar. Ingen timer. Bara du och trenderna.',
      'preview.title': 'Dagens Daily Buzz',
      quitConfirm: 'Dina framsteg kommer inte att sparas. Avsluta ändå?',
      quitConfirmTitle: 'Lämna Daily Buzz?',
      'results.perfect': 'PERFEKT BUZZ!',
      searches: 'trendande sökningar',
      topicIs: 'Ämne',
      total: 'Totalt',
      'trio.hint': 'Vilket ord kopplar ihop alla tre?',
      viewResults: 'Visa Resultat',
      yourAnswer: 'Ditt svar',
      yourScore: 'Din Poäng'
    },
    ja: {
      badge: '新',
      betaPreview: 'ベータプレビュー',
      challenges: 'チャレンジ',
      connectingWord: 'つなぐ言葉',
      error: 'チャレンジの読み込みに失敗しました',
      feature1: '毎日のトレンドトピック',
      feature2: '共有可能な結果',
      feature3: '時間制限なし',
      fillTheBlank: '空欄を埋める',
      finish: '終了',
      helpText: '今日のトレンドトピックに基づいた言葉パズルを解く',
      loading: 'チャレンジを読み込み中...',
      maxScore: '最高得点',
      noTimeLimit: '時間制限なし',
      'preview.play': 'プレイ開始',
      'preview.subtitle': '5つの言葉チャレンジ。タイマーなし。あなたとトレンドだけ。',
      'preview.title': '今日のデイリーバズ',
      quitConfirm: '進行状況は保存されません。それでも終了しますか？',
      quitConfirmTitle: 'デイリーバズを離れますか？',
      'results.perfect': 'パーフェクトバズ！',
      searches: 'トレンド検索',
      topicIs: 'トピック',
      total: '合計',
      'trio.hint': '3つすべてをつなぐ言葉は？',
      viewResults: '結果を見る',
      yourAnswer: 'あなたの答え',
      yourScore: 'あなたのスコア'
    },
    es: {
      badge: 'NUEVO',
      betaPreview: 'Vista Previa Beta',
      challenges: 'desafíos',
      connectingWord: 'Palabra conectora',
      error: 'Error al cargar el desafío',
      feature1: 'Temas de tendencia diarios',
      feature2: 'Resultados compartibles',
      feature3: 'Sin presión de tiempo',
      fillTheBlank: 'Rellena el espacio',
      finish: 'Terminar',
      helpText: 'Resuelve acertijos de palabras basados en los temas de tendencia de hoy',
      loading: 'Cargando desafío...',
      maxScore: 'Puntuación máxima',
      noTimeLimit: 'Sin límite de tiempo',
      'preview.play': 'Comenzar a Jugar',
      'preview.subtitle': '5 desafíos de palabras. Sin temporizador. Solo tú y las tendencias.',
      'preview.title': 'Buzz Diario de Hoy',
      quitConfirm: 'Tu progreso no se guardará. ¿Salir de todos modos?',
      quitConfirmTitle: '¿Salir del Buzz Diario?',
      'results.perfect': '¡BUZZ PERFECTO!',
      searches: 'búsquedas de tendencia',
      topicIs: 'Tema',
      total: 'Total',
      'trio.hint': '¿Qué palabra conecta a los tres?',
      viewResults: 'Ver Resultados',
      yourAnswer: 'Tu respuesta',
      yourScore: 'Tu Puntuación'
    }
  },
  common: {
    en: { pts: 'pts' },
    he: { pts: 'נק׳' },
    sv: { pts: 'p' },
    ja: { pts: 'pt' },
    es: { pts: 'pts' }
  },
  daily: {
    en: {
      chooseChallengeHint: 'Pick your daily quest and compete on the global leaderboard',
      chooseQuest: 'Choose Your Daily Quest',
      new: 'NEW',
      play: 'Play',
      viewResults: 'View Results',
      wordHunt: 'Word Hunt',
      'wordHunt.desc': 'Find as many words as you can in 3 minutes',
      'wordHunt.feature1': 'Timed challenge',
      'wordHunt.feature2': 'Global leaderboard',
      'wordHunt.feature3': 'Share your score',
      'wordHunt.subtitle': '3 minutes. Find all the words you can.'
    },
    he: {
      chooseChallengeHint: 'בחר את המשימה היומית שלך והתחרה בלוח התוצאות העולמי',
      chooseQuest: 'בחר את המשימה היומית שלך',
      new: 'חדש',
      play: 'שחק',
      viewResults: 'צפה בתוצאות',
      wordHunt: 'ציד מילים',
      'wordHunt.desc': 'מצא כמה שיותר מילים תוך 3 דקות',
      'wordHunt.feature1': 'אתגר מתוזמן',
      'wordHunt.feature2': 'לוח תוצאות עולמי',
      'wordHunt.feature3': 'שתף את הניקוד שלך',
      'wordHunt.subtitle': '3 דקות. מצא את כל המילים שאתה יכול.'
    },
    sv: {
      chooseChallengeHint: 'Välj ditt dagliga uppdrag och tävla på den globala topplistan',
      chooseQuest: 'Välj Ditt Dagliga Uppdrag',
      new: 'NYTT',
      play: 'Spela',
      viewResults: 'Visa Resultat',
      wordHunt: 'Ordjakt',
      'wordHunt.desc': 'Hitta så många ord du kan på 3 minuter',
      'wordHunt.feature1': 'Tidsutmaning',
      'wordHunt.feature2': 'Global topplista',
      'wordHunt.feature3': 'Dela din poäng',
      'wordHunt.subtitle': '3 minuter. Hitta alla ord du kan.'
    },
    ja: {
      chooseChallengeHint: 'デイリークエストを選んで世界ランキングで競争',
      chooseQuest: 'デイリークエストを選ぶ',
      new: '新',
      play: 'プレイ',
      viewResults: '結果を見る',
      wordHunt: 'ワードハント',
      'wordHunt.desc': '3分間でできるだけ多くの単語を見つける',
      'wordHunt.feature1': '時間制限チャレンジ',
      'wordHunt.feature2': '世界ランキング',
      'wordHunt.feature3': 'スコアを共有',
      'wordHunt.subtitle': '3分間。できるだけ多くの単語を見つけて。'
    },
    es: {
      chooseChallengeHint: 'Elige tu misión diaria y compite en la tabla de clasificación global',
      chooseQuest: 'Elige Tu Misión Diaria',
      new: 'NUEVO',
      play: 'Jugar',
      viewResults: 'Ver Resultados',
      wordHunt: 'Caza de Palabras',
      'wordHunt.desc': 'Encuentra tantas palabras como puedas en 3 minutos',
      'wordHunt.feature1': 'Desafío cronometrado',
      'wordHunt.feature2': 'Tabla de clasificación global',
      'wordHunt.feature3': 'Comparte tu puntuación',
      'wordHunt.subtitle': '3 minutos. Encuentra todas las palabras que puedas.'
    }
  }
};

function addKeysToSection(content, lang, section, keys) {
  const sectionPattern = new RegExp(`("${section}":\\s*{)([\\s\\S]*?)(\\n\\s*})`, 'm');
  const match = content.match(sectionPattern);
  
  if (!match) {
    console.log(`  Warning: Section "${section}" not found in ${lang}.js`);
    return content;
  }
  
  let sectionContent = match[2];
  const indent = sectionContent.match(/\n(\s+)/)?.[1] || '    ';
  
  Object.entries(keys).forEach(([key, value]) => {
    const escapedValue = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const keyPattern = new RegExp(`"${key.replace(/\./g, '\\.')}":`, 'm');
    
    if (!keyPattern.test(sectionContent)) {
      const newLine = `\n${indent}"${key}": "${escapedValue}",`;
      sectionContent = sectionContent.trimEnd() + newLine;
      console.log(`  Added ${section}.${key}`);
    }
  });
  
  return content.replace(sectionPattern, `$1${sectionContent}\n$3`);
}

['en', 'he', 'sv', 'ja', 'es'].forEach(lang => {
  console.log(`\nProcessing ${lang}.js...`);
  const filePath = path.join(__dirname, '../translations', `${lang}.js`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    Object.entries(translations).forEach(([section, langData]) => {
      if (langData[lang]) {
        content = addKeysToSection(content, lang, section, langData[lang]);
      }
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${lang}.js`);
  } catch (error) {
    console.error(`Error processing ${lang}.js:`, error.message);
  }
});

console.log('\n✓ All translation files updated!');
