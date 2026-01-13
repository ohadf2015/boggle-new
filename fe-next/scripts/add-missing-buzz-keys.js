const fs = require('fs');
const path = require('path');

// All missing translations organized by language
const allTranslations = {
  en: {
    'achievement.dailyDouble': 'Daily Double',
    'achievement.dailyDouble.desc': 'Complete both daily challenges in one day',
    'buzz.badge': 'NEW',
    'buzz.betaPreview': 'Beta Preview',
    'buzz.challenges': 'challenges',
    'buzz.connectingWord': 'Connecting word',
    'buzz.error': 'Failed to load challenge',
    'buzz.feature1': 'Daily trending topics',
    'buzz.feature2': 'Shareable results',
    'buzz.feature3': 'No time pressure',
    'buzz.fillTheBlank': 'Fill in the blank',
    'buzz.finish': 'Finish',
    'buzz.helpText': 'Solve word puzzles based on today\'s trending topics',
    'buzz.loading': 'Loading challenge...',
    'buzz.maxScore': 'Max score',
    'buzz.noTimeLimit': 'No time limit',
    'buzz.preview.play': 'Start Playing',
    'buzz.preview.subtitle': '5 word challenges. No timer. Just you and the trends.',
    'buzz.preview.title': 'Today\'s Daily Buzz',
    'buzz.quitConfirm': 'Your progress won\'t be saved. Quit anyway?',
    'buzz.quitConfirmTitle': 'Leave Daily Buzz?',
    'buzz.results.perfect': 'PERFECT BUZZ!',
    'buzz.searches': 'trending searches',
    'buzz.topicIs': 'Topic',
    'buzz.total': 'Total',
    'buzz.trio.hint': 'What word connects all three?',
    'buzz.viewResults': 'View Results',
    'buzz.yourAnswer': 'Your answer',
    'buzz.yourScore': 'Your Score',
    'common.pts': 'pts',
    'daily.chooseChallengeHint': 'Pick your daily quest and compete on the global leaderboard',
    'daily.chooseQuest': 'Choose Your Daily Quest',
    'daily.new': 'NEW',
    'daily.play': 'Play',
    'daily.viewResults': 'View Results',
    'daily.wordHunt': 'Word Hunt',
    'daily.wordHunt.desc': 'Find as many words as you can in 3 minutes',
    'daily.wordHunt.feature1': 'Timed challenge',
    'daily.wordHunt.feature2': 'Global leaderboard',
    'daily.wordHunt.feature3': 'Share your score',
    'daily.wordHunt.subtitle': '3 minutes. Find all the words you can.'
  },
  he: {
    'achievement.dailyDouble': 'כפול יומי',
    'achievement.dailyDouble.desc': 'השלם את שני האתגרים היומיים ביום אחד',
    'buzz.badge': 'חדש',
    'buzz.betaPreview': 'תצוגה מקדימה',
    'buzz.challenges': 'אתגרים',
    'buzz.connectingWord': 'מילה מקשרת',
    'buzz.error': 'נכשל בטעינת האתגר',
    'buzz.feature1': 'נושאים טרנדיים יומיים',
    'buzz.feature2': 'תוצאות ניתנות לשיתוף',
    'buzz.feature3': 'ללא לחץ זמן',
    'buzz.fillTheBlank': 'מלא את החסר',
    'buzz.finish': 'סיום',
    'buzz.helpText': 'פתור חידות מילים על סמך נושאים טרנדיים של היום',
    'buzz.loading': 'טוען אתגר...',
    'buzz.maxScore': 'ניקוד מקסימלי',
    'buzz.noTimeLimit': 'ללא הגבלת זמן',
    'buzz.preview.play': 'התחל לשחק',
    'buzz.preview.subtitle': '5 אתגרי מילים. ללא טיימר. רק אתה והטרנדים.',
    'buzz.preview.title': 'הבאז היומי של היום',
    'buzz.quitConfirm': 'ההתקדמות שלך לא תישמר. לצאת בכל זאת?',
    'buzz.quitConfirmTitle': 'לעזוב את הבאז היומי?',
    'buzz.results.perfect': 'באז מושלם!',
    'buzz.searches': 'חיפושים טרנדיים',
    'buzz.topicIs': 'נושא',
    'buzz.total': 'סה״כ',
    'buzz.trio.hint': 'איזו מילה מקשרת בין שלושתם?',
    'buzz.viewResults': 'צפה בתוצאות',
    'buzz.yourAnswer': 'התשובה שלך',
    'buzz.yourScore': 'הניקוד שלך',
    'common.pts': 'נק׳',
    'daily.chooseChallengeHint': 'בחר את המשימה היומית שלך והתחרה בלוח התוצאות העולמי',
    'daily.chooseQuest': 'בחר את המשימה היומית שלך',
    'daily.new': 'חדש',
    'daily.play': 'שחק',
    'daily.viewResults': 'צפה בתוצאות',
    'daily.wordHunt': 'ציד מילים',
    'daily.wordHunt.desc': 'מצא כמה שיותר מילים תוך 3 דקות',
    'daily.wordHunt.feature1': 'אתגר מתוזמן',
    'daily.wordHunt.feature2': 'לוח תוצאות עולמי',
    'daily.wordHunt.feature3': 'שתף את הניקוד שלך',
    'daily.wordHunt.subtitle': '3 דקות. מצא את כל המילים שאתה יכול.'
  },
  sv: {
    'achievement.dailyDouble': 'Dubbel Daglig',
    'achievement.dailyDouble.desc': 'Slutför båda dagliga utmaningarna på en dag',
    'buzz.badge': 'NYTT',
    'buzz.betaPreview': 'Beta Förhandsgranskning',
    'buzz.challenges': 'utmaningar',
    'buzz.connectingWord': 'Koppla ord',
    'buzz.error': 'Misslyckades att ladda utmaning',
    'buzz.feature1': 'Dagliga trendämnen',
    'buzz.feature2': 'Delningsbara resultat',
    'buzz.feature3': 'Ingen tidspress',
    'buzz.fillTheBlank': 'Fyll i tomrummet',
    'buzz.finish': 'Avsluta',
    'buzz.helpText': 'Lös ordpussel baserade på dagens trendämnen',
    'buzz.loading': 'Laddar utmaning...',
    'buzz.maxScore': 'Max poäng',
    'buzz.noTimeLimit': 'Ingen tidsgräns',
    'buzz.preview.play': 'Börja Spela',
    'buzz.preview.subtitle': '5 ordutmaningar. Ingen timer. Bara du och trenderna.',
    'buzz.preview.title': 'Dagens Daily Buzz',
    'buzz.quitConfirm': 'Dina framsteg kommer inte att sparas. Avsluta ändå?',
    'buzz.quitConfirmTitle': 'Lämna Daily Buzz?',
    'buzz.results.perfect': 'PERFEKT BUZZ!',
    'buzz.searches': 'trendande sökningar',
    'buzz.topicIs': 'Ämne',
    'buzz.total': 'Totalt',
    'buzz.trio.hint': 'Vilket ord kopplar ihop alla tre?',
    'buzz.viewResults': 'Visa Resultat',
    'buzz.yourAnswer': 'Ditt svar',
    'buzz.yourScore': 'Din Poäng',
    'common.pts': 'p',
    'daily.chooseChallengeHint': 'Välj ditt dagliga uppdrag och tävla på den globala topplistan',
    'daily.chooseQuest': 'Välj Ditt Dagliga Uppdrag',
    'daily.new': 'NYTT',
    'daily.play': 'Spela',
    'daily.viewResults': 'Visa Resultat',
    'daily.wordHunt': 'Ordjakt',
    'daily.wordHunt.desc': 'Hitta så många ord du kan på 3 minuter',
    'daily.wordHunt.feature1': 'Tidsutmaning',
    'daily.wordHunt.feature2': 'Global topplista',
    'daily.wordHunt.feature3': 'Dela din poäng',
    'daily.wordHunt.subtitle': '3 minuter. Hitta alla ord du kan.'
  },
  ja: {
    'achievement.dailyDouble': 'デイリーダブル',
    'achievement.dailyDouble.desc': '1日で両方のデイリーチャレンジを完了',
    'buzz.badge': '新',
    'buzz.betaPreview': 'ベータプレビュー',
    'buzz.challenges': 'チャレンジ',
    'buzz.connectingWord': 'つなぐ言葉',
    'buzz.error': 'チャレンジの読み込みに失敗しました',
    'buzz.feature1': '毎日のトレンドトピック',
    'buzz.feature2': '共有可能な結果',
    'buzz.feature3': '時間制限なし',
    'buzz.fillTheBlank': '空欄を埋める',
    'buzz.finish': '終了',
    'buzz.helpText': '今日のトレンドトピックに基づいた言葉パズルを解く',
    'buzz.loading': 'チャレンジを読み込み中...',
    'buzz.maxScore': '最高得点',
    'buzz.noTimeLimit': '時間制限なし',
    'buzz.preview.play': 'プレイ開始',
    'buzz.preview.subtitle': '5つの言葉チャレンジ。タイマーなし。あなたとトレンドだけ。',
    'buzz.preview.title': '今日のデイリーバズ',
    'buzz.quitConfirm': '進行状況は保存されません。それでも終了しますか？',
    'buzz.quitConfirmTitle': 'デイリーバズを離れますか？',
    'buzz.results.perfect': 'パーフェクトバズ！',
    'buzz.searches': 'トレンド検索',
    'buzz.topicIs': 'トピック',
    'buzz.total': '合計',
    'buzz.trio.hint': '3つすべてをつなぐ言葉は？',
    'buzz.viewResults': '結果を見る',
    'buzz.yourAnswer': 'あなたの答え',
    'buzz.yourScore': 'あなたのスコア',
    'common.pts': 'pt',
    'daily.chooseChallengeHint': 'デイリークエストを選んで世界ランキングで競争',
    'daily.chooseQuest': 'デイリークエストを選ぶ',
    'daily.new': '新',
    'daily.play': 'プレイ',
    'daily.viewResults': '結果を見る',
    'daily.wordHunt': 'ワードハント',
    'daily.wordHunt.desc': '3分間でできるだけ多くの単語を見つける',
    'daily.wordHunt.feature1': '時間制限チャレンジ',
    'daily.wordHunt.feature2': '世界ランキング',
    'daily.wordHunt.feature3': 'スコアを共有',
    'daily.wordHunt.subtitle': '3分間。できるだけ多くの単語を見つけて。'
  },
  es: {
    'achievement.dailyDouble': 'Doble Diario',
    'achievement.dailyDouble.desc': 'Completa ambos desafíos diarios en un día',
    'buzz.badge': 'NUEVO',
    'buzz.betaPreview': 'Vista Previa Beta',
    'buzz.challenges': 'desafíos',
    'buzz.connectingWord': 'Palabra conectora',
    'buzz.error': 'Error al cargar el desafío',
    'buzz.feature1': 'Temas de tendencia diarios',
    'buzz.feature2': 'Resultados compartibles',
    'buzz.feature3': 'Sin presión de tiempo',
    'buzz.fillTheBlank': 'Rellena el espacio',
    'buzz.finish': 'Terminar',
    'buzz.helpText': 'Resuelve acertijos de palabras basados en los temas de tendencia de hoy',
    'buzz.loading': 'Cargando desafío...',
    'buzz.maxScore': 'Puntuación máxima',
    'buzz.noTimeLimit': 'Sin límite de tiempo',
    'buzz.preview.play': 'Comenzar a Jugar',
    'buzz.preview.subtitle': '5 desafíos de palabras. Sin temporizador. Solo tú y las tendencias.',
    'buzz.preview.title': 'Buzz Diario de Hoy',
    'buzz.quitConfirm': 'Tu progreso no se guardará. ¿Salir de todos modos?',
    'buzz.quitConfirmTitle': '¿Salir del Buzz Diario?',
    'buzz.results.perfect': '¡BUZZ PERFECTO!',
    'buzz.searches': 'búsquedas de tendencia',
    'buzz.topicIs': 'Tema',
    'buzz.total': 'Total',
    'buzz.trio.hint': '¿Qué palabra conecta a los tres?',
    'buzz.viewResults': 'Ver Resultados',
    'buzz.yourAnswer': 'Tu respuesta',
    'buzz.yourScore': 'Tu Puntuación',
    'common.pts': 'pts',
    'daily.chooseChallengeHint': 'Elige tu misión diaria y compite en la tabla de clasificación global',
    'daily.chooseQuest': 'Elige Tu Misión Diaria',
    'daily.new': 'NUEVO',
    'daily.play': 'Jugar',
    'daily.viewResults': 'Ver Resultados',
    'daily.wordHunt': 'Caza de Palabras',
    'daily.wordHunt.desc': 'Encuentra tantas palabras como puedas en 3 minutos',
    'daily.wordHunt.feature1': 'Desafío cronometrado',
    'daily.wordHunt.feature2': 'Tabla de clasificación global',
    'daily.wordHunt.feature3': 'Comparte tu puntuación',
    'daily.wordHunt.subtitle': '3 minutos. Encuentra todas las palabras que puedas.'
  }
};

function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

function setNestedKey(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  
  current[parts[parts.length - 1]] = value;
}

['en', 'he', 'sv', 'ja', 'es'].forEach(lang => {
  console.log(`\nProcessing ${lang}.js...`);
  const filePath = path.join(__dirname, '../translations', `${lang}.js`);
  
  try {
    // Load and parse the current translations
    let content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/const\s+\w+\s*=\s*({[\s\S]*});[\s\S]*module\.exports/);
    
    if (!match) {
      console.error(`  Could not parse ${lang}.js`);
      return;
    }
    
    // Safely evaluate the object
    const translationsObj = eval('(' + match[1] + ')');
    
    // Add all missing keys
    let addedCount = 0;
    Object.entries(allTranslations[lang]).forEach(([key, value]) => {
      setNestedKey(translationsObj, key, value);
      addedCount++;
    });
    
    // Convert back to formatted string
    const jsonStr = JSON.stringify(translationsObj, null, 2);
    const newContent = content.replace(
      /const\s+\w+\s*=\s*{[\s\S]*};/,
      `const ${lang} = ${jsonStr};`
    );
    
    // Write back
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Added ${addedCount} translations to ${lang}.js`);
    
  } catch (error) {
    console.error(`Error processing ${lang}.js:`, error.message);
  }
});

console.log('\n✓ All translation files updated successfully!');
