const fs = require('fs');
const path = require('path');

const translationsDir = path.join(__dirname, '../translations');

// Define all missing translations
const newTranslations = {
  en: {
    achievement: {
      dailyDouble: "Daily Double",
      "dailyDouble.desc": "Complete both daily challenges in one day"
    },
    buzz: {
      badge: "NEW",
      betaPreview: "Beta Preview",
      challenges: "challenges",
      connectingWord: "Connecting word",
      error: "Failed to load challenge",
      feature1: "Daily trending topics",
      feature2: "Shareable results",
      feature3: "No time pressure",
      fillTheBlank: "Fill in the blank",
      finish: "Finish",
      helpText: "Solve word puzzles based on today's trending topics",
      loading: "Loading challenge...",
      maxScore: "Max score",
      noTimeLimit: "No time limit",
      preview: {
        play: "Start Playing",
        subtitle: "5 word challenges. No timer. Just you and the trends.",
        title: "Today's Daily Buzz"
      },
      quitConfirm: "Your progress won't be saved. Quit anyway?",
      quitConfirmTitle: "Leave Daily Buzz?",
      results: {
        perfect: "PERFECT BUZZ!"
      },
      searches: "trending searches",
      topicIs: "Topic",
      total: "Total",
      trio: {
        hint: "What word connects all three?"
      },
      viewResults: "View Results",
      yourAnswer: "Your answer",
      yourScore: "Your Score"
    },
    common: {
      pts: "pts"
    },
    daily: {
      chooseChallengeHint: "Pick your daily quest and compete on the global leaderboard",
      chooseQuest: "Choose Your Daily Quest",
      new: "NEW",
      play: "Play",
      viewResults: "View Results",
      wordHunt: "Word Hunt",
      "wordHunt.desc": "Find as many words as you can in 3 minutes",
      "wordHunt.feature1": "Timed challenge",
      "wordHunt.feature2": "Global leaderboard",
      "wordHunt.feature3": "Share your score",
      "wordHunt.subtitle": "3 minutes. Find all the words you can."
    }
  },
  he: {
    achievement: {
      dailyDouble: "כפול יומי",
      "dailyDouble.desc": "השלם את שני האתגרים היומיים ביום אחד"
    },
    buzz: {
      badge: "חדש",
      betaPreview: "תצוגה מקדימה",
      challenges: "אתגרים",
      connectingWord: "מילה מקשרת",
      error: "נכשל בטעינת האתגר",
      feature1: "נושאים טרנדיים יומיים",
      feature2: "תוצאות ניתנות לשיתוף",
      feature3: "ללא לחץ זמן",
      fillTheBlank: "מלא את החסר",
      finish: "סיום",
      helpText: "פתור חידות מילים על סמך נושאים טרנדיים של היום",
      loading: "טוען אתגר...",
      maxScore: "ניקוד מקסימלי",
      noTimeLimit: "ללא הגבלת זמן",
      preview: {
        play: "התחל לשחק",
        subtitle: "5 אתגרי מילים. ללא טיימר. רק אתה והטרנדים.",
        title: "הבאז היומי של היום"
      },
      quitConfirm: "ההתקדמות שלך לא תישמר. לצאת בכל זאת?",
      quitConfirmTitle: "לעזוב את הבאז היומי?",
      results: {
        perfect: "באז מושלם!"
      },
      searches: "חיפושים טרנדיים",
      topicIs: "נושא",
      total: "סה״כ",
      trio: {
        hint: "איזו מילה מקשרת בין שלושתם?"
      },
      viewResults: "צפה בתוצאות",
      yourAnswer: "התשובה שלך",
      yourScore: "הניקוד שלך"
    },
    common: {
      pts: "נק׳"
    },
    daily: {
      chooseChallengeHint: "בחר את המשימה היומית שלך והתחרה בלוח התוצאות העולמי",
      chooseQuest: "בחר את המשימה היומית שלך",
      new: "חדש",
      play: "שחק",
      viewResults: "צפה בתוצאות",
      wordHunt: "ציד מילים",
      "wordHunt.desc": "מצא כמה שיותר מילים תוך 3 דקות",
      "wordHunt.feature1": "אתגר מתוזמן",
      "wordHunt.feature2": "לוח תוצאות עולמי",
      "wordHunt.feature3": "שתף את הניקוד שלך",
      "wordHunt.subtitle": "3 דקות. מצא את כל המילים שאתה יכול."
    }
  },
  sv: {
    achievement: {
      dailyDouble: "Dubbel Daglig",
      "dailyDouble.desc": "Slutför båda dagliga utmaningarna på en dag"
    },
    buzz: {
      badge: "NYTT",
      betaPreview: "Beta Förhandsgranskning",
      challenges: "utmaningar",
      connectingWord: "Koppla ord",
      error: "Misslyckades att ladda utmaning",
      feature1: "Dagliga trendämnen",
      feature2: "Delningsbara resultat",
      feature3: "Ingen tidspress",
      fillTheBlank: "Fyll i tomrummet",
      finish: "Avsluta",
      helpText: "Lös ordpussel baserade på dagens trendämnen",
      loading: "Laddar utmaning...",
      maxScore: "Max poäng",
      noTimeLimit: "Ingen tidsgräns",
      preview: {
        play: "Börja Spela",
        subtitle: "5 ordutmaningar. Ingen timer. Bara du och trenderna.",
        title: "Dagens Daily Buzz"
      },
      quitConfirm: "Dina framsteg kommer inte att sparas. Avsluta ändå?",
      quitConfirmTitle: "Lämna Daily Buzz?",
      results: {
        perfect: "PERFEKT BUZZ!"
      },
      searches: "trendande sökningar",
      topicIs: "Ämne",
      total: "Totalt",
      trio: {
        hint: "Vilket ord kopplar ihop alla tre?"
      },
      viewResults: "Visa Resultat",
      yourAnswer: "Ditt svar",
      yourScore: "Din Poäng"
    },
    common: {
      pts: "p"
    },
    daily: {
      chooseChallengeHint: "Välj ditt dagliga uppdrag och tävla på den globala topplistan",
      chooseQuest: "Välj Ditt Dagliga Uppdrag",
      new: "NYTT",
      play: "Spela",
      viewResults: "Visa Resultat",
      wordHunt: "Ordjakt",
      "wordHunt.desc": "Hitta så många ord du kan på 3 minuter",
      "wordHunt.feature1": "Tidsutmaning",
      "wordHunt.feature2": "Global topplista",
      "wordHunt.feature3": "Dela din poäng",
      "wordHunt.subtitle": "3 minuter. Hitta alla ord du kan."
    }
  },
  ja: {
    achievement: {
      dailyDouble: "デイリーダブル",
      "dailyDouble.desc": "1日で両方のデイリーチャレンジを完了"
    },
    buzz: {
      badge: "新",
      betaPreview: "ベータプレビュー",
      challenges: "チャレンジ",
      connectingWord: "つなぐ言葉",
      error: "チャレンジの読み込みに失敗しました",
      feature1: "毎日のトレンドトピック",
      feature2: "共有可能な結果",
      feature3: "時間制限なし",
      fillTheBlank: "空欄を埋める",
      finish: "終了",
      helpText: "今日のトレンドトピックに基づいた言葉パズルを解く",
      loading: "チャレンジを読み込み中...",
      maxScore: "最高得点",
      noTimeLimit: "時間制限なし",
      preview: {
        play: "プレイ開始",
        subtitle: "5つの言葉チャレンジ。タイマーなし。あなたとトレンドだけ。",
        title: "今日のデイリーバズ"
      },
      quitConfirm: "進行状況は保存されません。それでも終了しますか？",
      quitConfirmTitle: "デイリーバズを離れますか？",
      results: {
        perfect: "パーフェクトバズ！"
      },
      searches: "トレンド検索",
      topicIs: "トピック",
      total: "合計",
      trio: {
        hint: "3つすべてをつなぐ言葉は？"
      },
      viewResults: "結果を見る",
      yourAnswer: "あなたの答え",
      yourScore: "あなたのスコア"
    },
    common: {
      pts: "pt"
    },
    daily: {
      chooseChallengeHint: "デイリークエストを選んで世界ランキングで競争",
      chooseQuest: "デイリークエストを選ぶ",
      new: "新",
      play: "プレイ",
      viewResults: "結果を見る",
      wordHunt: "ワードハント",
      "wordHunt.desc": "3分間でできるだけ多くの単語を見つける",
      "wordHunt.feature1": "時間制限チャレンジ",
      "wordHunt.feature2": "世界ランキング",
      "wordHunt.feature3": "スコアを共有",
      "wordHunt.subtitle": "3分間。できるだけ多くの単語を見つけて。"
    }
  },
  es: {
    achievement: {
      dailyDouble: "Doble Diario",
      "dailyDouble.desc": "Completa ambos desafíos diarios en un día"
    },
    buzz: {
      badge: "NUEVO",
      betaPreview: "Vista Previa Beta",
      challenges: "desafíos",
      connectingWord: "Palabra conectora",
      error: "Error al cargar el desafío",
      feature1: "Temas de tendencia diarios",
      feature2: "Resultados compartibles",
      feature3: "Sin presión de tiempo",
      fillTheBlank: "Rellena el espacio",
      finish: "Terminar",
      helpText: "Resuelve acertijos de palabras basados en los temas de tendencia de hoy",
      loading: "Cargando desafío...",
      maxScore: "Puntuación máxima",
      noTimeLimit: "Sin límite de tiempo",
      preview: {
        play: "Comenzar a Jugar",
        subtitle: "5 desafíos de palabras. Sin temporizador. Solo tú y las tendencias.",
        title: "Buzz Diario de Hoy"
      },
      quitConfirm: "Tu progreso no se guardará. ¿Salir de todos modos?",
      quitConfirmTitle: "¿Salir del Buzz Diario?",
      results: {
        perfect: "¡BUZZ PERFECTO!"
      },
      searches: "búsquedas de tendencia",
      topicIs: "Tema",
      total: "Total",
      trio: {
        hint: "¿Qué palabra conecta a los tres?"
      },
      viewResults: "Ver Resultados",
      yourAnswer: "Tu respuesta",
      yourScore: "Tu Puntuación"
    },
    common: {
      pts: "pts"
    },
    daily: {
      chooseChallengeHint: "Elige tu misión diaria y compite en la tabla de clasificación global",
      chooseQuest: "Elige Tu Misión Diaria",
      new: "NUEVO",
      play: "Jugar",
      viewResults: "Ver Resultados",
      wordHunt: "Caza de Palabras",
      "wordHunt.desc": "Encuentra tantas palabras como puedas en 3 minutos",
      "wordHunt.feature1": "Desafío cronometrado",
      "wordHunt.feature2": "Tabla de clasificación global",
      "wordHunt.feature3": "Comparte tu puntuación",
      "wordHunt.subtitle": "3 minutos. Encuentra todas las palabras que puedas."
    }
  }
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

['en', 'he', 'sv', 'ja', 'es'].forEach(lang => {
  const filePath = path.join(translationsDir, `${lang}.js`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/const\s+\w+\s*=\s*({[\s\S]*});[\s\S]*module\.exports/);
    if (!match) {
      console.error(`Could not parse ${lang}.js`);
      return;
    }
    
    const translationsObj = eval('(' + match[1] + ')');
    deepMerge(translationsObj, newTranslations[lang]);
    
    const jsonStr = JSON.stringify(translationsObj, null, 2);
    const newContent = content.replace(
      /const\s+\w+\s*=\s*{[\s\S]*};/,
      `const ${lang} = ${jsonStr};`
    );
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Updated ${lang}.js`);
    
  } catch (error) {
    console.error(`Error processing ${lang}.js:`, error.message);
  }
});

console.log('\n✓ All translation files updated successfully!');
