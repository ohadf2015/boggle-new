const fs = require('fs');
const path = require('path');

const achievementTranslations = {
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
};

['en', 'he', 'sv', 'ja', 'es'].forEach(lang => {
  console.log(`Processing ${lang}.js...`);
  const filePath = path.join(__dirname, '../translations', `${lang}.js`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    const achievementSection = `  "achievement": {\n    "dailyDouble": "${achievementTranslations[lang].dailyDouble}",\n    "dailyDouble.desc": "${achievementTranslations[lang]['dailyDouble.desc']}"\n  },\n`;
    
    const achievementsPattern = /(\s*"achievements":\s*{)/;
    const match = content.match(achievementsPattern);
    
    if (match) {
      content = content.replace(achievementsPattern, achievementSection + '$1');
      console.log(`  Added achievement section before achievements`);
    } else {
      console.log(`  Warning: Could not find achievements section`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${lang}.js`);
  } catch (error) {
    console.error(`Error processing ${lang}.js:`, error.message);
  }
});

console.log('\n✓ Achievement sections added!');
