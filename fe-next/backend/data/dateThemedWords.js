/**
 * Date-Themed Words for Board Generation
 *
 * Contains holiday/event word lists for all supported languages,
 * plus day-of-week themes for non-holiday periods.
 *
 * Words are filtered to include only valid dictionary words that can be
 * embedded in the game board (2-12 letters).
 */

// Day of week themes (0 = Sunday, 6 = Saturday)
const dayOfWeekThemes = {
  en: [
    { day: 0, nameKey: 'theme.sundayFunday', emoji: '🌞', words: ['SUNDAY', 'RELAX', 'REST', 'PEACE', 'CALM', 'LAZY', 'SLOW', 'EASY', 'CHILL', 'QUIET', 'SERENE', 'TRANQUIL'] },
    { day: 1, nameKey: 'theme.mondayMotivation', emoji: '💪', words: ['MONDAY', 'START', 'FRESH', 'POWER', 'ENERGY', 'DRIVE', 'FOCUS', 'GOAL', 'HUSTLE', 'GRIND', 'AMBITION', 'MOTIVATION'] },
    { day: 2, nameKey: 'theme.tuesdayTrivia', emoji: '🧠', words: ['TUESDAY', 'BRAIN', 'THINK', 'SMART', 'CLEVER', 'WISE', 'GENIUS', 'QUIZ', 'LEARN', 'STUDY', 'KNOWLEDGE', 'INTELLECT'] },
    { day: 3, nameKey: 'theme.wednesdayWisdom', emoji: '📚', words: ['WISDOM', 'BOOK', 'READ', 'WRITE', 'STORY', 'WORDS', 'PROSE', 'POEM', 'NOVEL', 'AUTHOR', 'LITERATURE', 'MANUSCRIPT'] },
    { day: 4, nameKey: 'theme.thursdayThrowback', emoji: '📷', words: ['MEMORY', 'PAST', 'RETRO', 'VINTAGE', 'CLASSIC', 'HISTORY', 'LEGACY', 'PHOTO', 'ALBUM', 'NOSTALGIA', 'REMINISCE', 'THROWBACK'] },
    { day: 5, nameKey: 'theme.funFriday', emoji: '🎉', words: ['FRIDAY', 'FUN', 'PARTY', 'DANCE', 'MUSIC', 'HAPPY', 'CHEER', 'JOY', 'LAUGH', 'CELEBRATE', 'EXCITEMENT', 'ENTERTAINMENT'] },
    { day: 6, nameKey: 'theme.saturdayAdventure', emoji: '🏔️', words: ['ADVENTURE', 'EXPLORE', 'TRAVEL', 'HIKE', 'CAMP', 'NATURE', 'OUTDOOR', 'TRAIL', 'JOURNEY', 'DISCOVER', 'EXPEDITION', 'WANDERLUST'] }
  ],
  he: [
    { day: 0, nameKey: 'theme.sundayFunday', emoji: '🌞', words: ['ראשון', 'שמש', 'מנוחה', 'שלום', 'רגוע', 'נעים', 'שקט', 'רוגע', 'נחת', 'שלווה', 'מרגיע', 'נינוח'] },
    { day: 1, nameKey: 'theme.mondayMotivation', emoji: '💪', words: ['שני', 'התחלה', 'כוח', 'אנרגיה', 'מוטיבציה', 'מטרה', 'הצלחה', 'שאיפה', 'נחישות', 'התמדה', 'מרץ', 'עוצמה'] },
    { day: 2, nameKey: 'theme.tuesdayTrivia', emoji: '🧠', words: ['שלישי', 'מוח', 'חכם', 'פיקח', 'ידע', 'למידה', 'חשיבה', 'תבונה', 'שכל', 'הבנה', 'חוכמה', 'אינטלקט'] },
    { day: 3, nameKey: 'theme.wednesdayWisdom', emoji: '📚', words: ['רביעי', 'ספר', 'קריאה', 'כתיבה', 'סיפור', 'מילים', 'שירה', 'חכמה', 'תורה', 'לימוד', 'השכלה', 'ספרות'] },
    { day: 4, nameKey: 'theme.thursdayThrowback', emoji: '📷', words: ['חמישי', 'זיכרון', 'עבר', 'היסטוריה', 'מורשת', 'תמונה', 'אלבום', 'נוסטלגיה', 'ותיק', 'קלאסי', 'עתיק', 'מסורת'] },
    { day: 5, nameKey: 'theme.funFriday', emoji: '🎉', words: ['שישי', 'שמחה', 'חגיגה', 'ריקוד', 'מוזיקה', 'שיר', 'מסיבה', 'כיף', 'צחוק', 'עליזות', 'התלהבות', 'אושר'] },
    { day: 6, nameKey: 'theme.saturdayAdventure', emoji: '🏔️', words: ['שבת', 'טיול', 'הרפתקה', 'טבע', 'יער', 'הר', 'נחל', 'שביל', 'מסע', 'גילוי', 'חקירה', 'נדודים'] }
  ],
  sv: [
    { day: 0, nameKey: 'theme.sundayFunday', emoji: '🌞', words: ['SONDAG', 'VILA', 'LUGN', 'FRED', 'SKON', 'LAT', 'MJUK', 'VARM', 'HEMMA', 'FAMIL', 'AVSLAPPNAD', 'HARMONISK'] },
    { day: 1, nameKey: 'theme.mondayMotivation', emoji: '💪', words: ['MANDAG', 'START', 'KRAFT', 'ENERGI', 'FOKUS', 'DRIVA', 'STARK', 'MODIG', 'VINNA', 'FRAMGANG', 'MOTIVATION', 'INSPIRATION'] },
    { day: 2, nameKey: 'theme.tuesdayTrivia', emoji: '🧠', words: ['TISDAG', 'SMART', 'KLOK', 'TANKE', 'LARA', 'VETA', 'KUNNA', 'FORSTA', 'MINNE', 'KUNSKAP', 'INTELLIGENS', 'VISDOM'] },
    { day: 3, nameKey: 'theme.wednesdayWisdom', emoji: '📚', words: ['ONSDAG', 'VISDOM', 'LASA', 'SKRIVA', 'SAGA', 'DIKT', 'ROMAN', 'FORFATTARE', 'BERATTELSE', 'LITTERATUR', 'BILDNING', 'KLASSIKER'] },
    { day: 4, nameKey: 'theme.thursdayThrowback', emoji: '📷', words: ['TORSDAG', 'MINNE', 'FORR', 'RETRO', 'HISTORIA', 'ARVTAGARE', 'FOTO', 'ALBUM', 'NOSTALGI', 'KLASSISK', 'ANTIK', 'TRADITION'] },
    { day: 5, nameKey: 'theme.funFriday', emoji: '🎉', words: ['FREDAG', 'KUL', 'FEST', 'DANS', 'MUSIK', 'GLAD', 'SKRATT', 'FIRA', 'PARTY', 'GLADA', 'UNDERHALLNING', 'FESTSTAMNING'] },
    { day: 6, nameKey: 'theme.saturdayAdventure', emoji: '🏔️', words: ['LORDAG', 'AVENTYR', 'RESA', 'VANDRA', 'NATUR', 'SKOG', 'BERG', 'UPPTACK', 'UTFORSKA', 'FRILUFTSLIV', 'EXPEDITION', 'VANDRING'] }
  ],
  es: [
    { day: 0, nameKey: 'theme.sundayFunday', emoji: '🌞', words: ['DOMINGO', 'DESCANSO', 'RELAX', 'PAZ', 'CALMA', 'SUAVE', 'LENTO', 'FACIL', 'TRANQUILO', 'SERENO', 'ARMONIOSO', 'SOSEGADO'] },
    { day: 1, nameKey: 'theme.mondayMotivation', emoji: '💪', words: ['LUNES', 'INICIO', 'FUERZA', 'ENERGIA', 'META', 'EXITO', 'LOGRO', 'PODER', 'AMBICION', 'MOTIVACION', 'INSPIRACION', 'DETERMINACION'] },
    { day: 2, nameKey: 'theme.tuesdayTrivia', emoji: '🧠', words: ['MARTES', 'CEREBRO', 'PENSAR', 'LISTO', 'SABIO', 'GENIO', 'QUIZ', 'ESTUDIO', 'APRENDER', 'CONOCIMIENTO', 'INTELIGENCIA', 'INTELECTO'] },
    { day: 3, nameKey: 'theme.wednesdayWisdom', emoji: '📚', words: ['MIERCOLES', 'LIBRO', 'LEER', 'ESCRIBIR', 'CUENTO', 'POEMA', 'NOVELA', 'AUTOR', 'HISTORIA', 'LITERATURA', 'SABIDURIA', 'MANUSCRITO'] },
    { day: 4, nameKey: 'theme.thursdayThrowback', emoji: '📷', words: ['JUEVES', 'MEMORIA', 'PASADO', 'RETRO', 'CLASICO', 'LEGADO', 'FOTO', 'ALBUM', 'NOSTALGIA', 'VINTAGE', 'ANTIGUO', 'TRADICION'] },
    { day: 5, nameKey: 'theme.funFriday', emoji: '🎉', words: ['VIERNES', 'FIESTA', 'BAILE', 'MUSICA', 'FELIZ', 'ALEGRIA', 'RISA', 'CELEBRAR', 'DIVERSION', 'EMOCION', 'ENTRETENIMIENTO', 'FESTIVIDAD'] },
    { day: 6, nameKey: 'theme.saturdayAdventure', emoji: '🏔️', words: ['SABADO', 'AVENTURA', 'EXPLORAR', 'VIAJE', 'CAMINAR', 'NATURALEZA', 'SENDERO', 'DESCUBRIR', 'EXCURSION', 'EXPEDICION', 'SENDERISMO', 'VAGABUNDEAR'] }
  ],
  ja: [
    { day: 0, nameKey: 'theme.sundayFunday', emoji: '🌞', words: ['日曜', '休日', '安心', '平和', '静寂', '穏便', '休息', '安静', '平穏', '静養', '安泰', '閑静'] },
    { day: 1, nameKey: 'theme.mondayMotivation', emoji: '💪', words: ['月曜', '開始', '力量', '活力', '目標', '成功', '達成', '努力', '意欲', '決意', '情熱', '意気'] },
    { day: 2, nameKey: 'theme.tuesdayTrivia', emoji: '🧠', words: ['火曜', '頭脳', '思考', '知恵', '賢明', '知識', '学習', '理解', '思案', '考察', '聡明', '博識'] },
    { day: 3, nameKey: 'theme.wednesdayWisdom', emoji: '📚', words: ['水曜', '読書', '文学', '物語', '詩歌', '小説', '作家', '書物', '文章', '著作', '文献', '古典'] },
    { day: 4, nameKey: 'theme.thursdayThrowback', emoji: '📷', words: ['木曜', '記憶', '過去', '歴史', '遺産', '写真', '回想', '追憶', '懐古', '伝統', '古来', '由緒'] },
    { day: 5, nameKey: 'theme.funFriday', emoji: '🎉', words: ['金曜', '楽園', '祝祭', '舞踏', '音楽', '歓喜', '笑顔', '祝福', '愉快', '娯楽', '快楽', '歓楽'] },
    { day: 6, nameKey: 'theme.saturdayAdventure', emoji: '🏔️', words: ['土曜', '冒険', '探検', '旅行', '自然', '山岳', '森林', '発見', '探索', '野外', '遠足', '放浪'] }
  ]
};

// Holiday themes with date ranges (month is 0-indexed: 0=Jan, 11=Dec)
const holidayThemes = {
  en: [
    // New Year
    { startMonth: 11, startDay: 30, endMonth: 0, endDay: 2, nameKey: 'theme.newYear', emoji: '🎆', words: ['NEWYEAR', 'CELEBRATE', 'COUNTDOWN', 'MIDNIGHT', 'FIREWORK', 'PARTY', 'TOAST', 'CHEERS', 'RESOLUTION', 'CHAMPAGNE', 'FESTIVE', 'SPARKLE'] },
    // Valentine's Day
    { startMonth: 1, startDay: 10, endMonth: 1, endDay: 15, nameKey: 'theme.valentines', emoji: '💕', words: ['VALENTINE', 'LOVE', 'HEART', 'ROMANCE', 'CUPID', 'KISS', 'DATE', 'FLOWER', 'SWEET', 'BELOVED', 'CHOCOLATE', 'AFFECTION'] },
    // St. Patrick's Day
    { startMonth: 2, startDay: 14, endMonth: 2, endDay: 18, nameKey: 'theme.stPatricks', emoji: '☘️', words: ['SHAMROCK', 'LUCKY', 'GREEN', 'IRISH', 'CLOVER', 'GOLD', 'RAINBOW', 'CELTIC', 'CHARM', 'LEPRECHAUN', 'EMERALD', 'BLESSING'] },
    // Easter (approximate - usually March/April)
    { startMonth: 2, startDay: 25, endMonth: 3, endDay: 25, nameKey: 'theme.easter', emoji: '🐰', words: ['EASTER', 'BUNNY', 'EGG', 'SPRING', 'BASKET', 'HUNT', 'CHICK', 'BLOOM', 'LILY', 'CHOCOLATE', 'RENEWAL', 'CELEBRATION'] },
    // Independence Day (US)
    { startMonth: 6, startDay: 1, endMonth: 6, endDay: 5, nameKey: 'theme.independence', emoji: '🇺🇸', words: ['FREEDOM', 'LIBERTY', 'AMERICA', 'PATRIOT', 'FLAG', 'PARADE', 'FIREWORK', 'PRIDE', 'NATION', 'INDEPENDENCE', 'DEMOCRACY', 'CELEBRATION'] },
    // Halloween
    { startMonth: 9, startDay: 25, endMonth: 10, endDay: 1, nameKey: 'theme.halloween', emoji: '🎃', words: ['HALLOWEEN', 'SPOOKY', 'GHOST', 'WITCH', 'PUMPKIN', 'CANDY', 'COSTUME', 'SCARY', 'TRICK', 'TREAT', 'MONSTER', 'HAUNTED'] },
    // Thanksgiving (US - late November)
    { startMonth: 10, startDay: 20, endMonth: 10, endDay: 28, nameKey: 'theme.thanksgiving', emoji: '🦃', words: ['THANKFUL', 'TURKEY', 'FAMILY', 'FEAST', 'GRATEFUL', 'HARVEST', 'AUTUMN', 'BLESSING', 'DINNER', 'GRATITUDE', 'THANKSGIVING', 'TOGETHERNESS'] },
    // Christmas
    { startMonth: 11, startDay: 20, endMonth: 11, endDay: 26, nameKey: 'theme.christmas', emoji: '🎄', words: ['CHRISTMAS', 'SANTA', 'GIFT', 'TREE', 'SNOW', 'JINGLE', 'CAROL', 'MERRY', 'REINDEER', 'STOCKING', 'ORNAMENT', 'CELEBRATION'] }
  ],
  he: [
    // Rosh Hashanah (usually September/October)
    { startMonth: 8, startDay: 15, endMonth: 9, endDay: 15, nameKey: 'theme.roshHashana', emoji: '🍎', words: ['ראש', 'השנה', 'תפוח', 'דבש', 'שופר', 'תשובה', 'סליחה', 'ברכה', 'שנה', 'טובה', 'מתיקות', 'התחדשות'] },
    // Yom Kippur
    { startMonth: 8, startDay: 20, endMonth: 9, endDay: 20, nameKey: 'theme.yomKippur', emoji: '🕊️', words: ['כיפור', 'צום', 'תפילה', 'סליחה', 'תשובה', 'כפרה', 'טהרה', 'קדושה', 'נשמה', 'רוחניות', 'התבוננות', 'מחילה'] },
    // Sukkot
    { startMonth: 8, startDay: 25, endMonth: 9, endDay: 25, nameKey: 'theme.sukkot', emoji: '🌿', words: ['סוכה', 'לולב', 'אתרוג', 'הדס', 'ערבה', 'חג', 'שמחה', 'אורחים', 'סכך', 'ארבעת', 'המינים', 'הושענא'] },
    // Hanukkah (usually December)
    { startMonth: 10, startDay: 25, endMonth: 11, endDay: 31, nameKey: 'theme.hanukkah', emoji: '🕎', words: ['חנוכה', 'נר', 'חנוכיה', 'סביבון', 'סופגניה', 'לביבה', 'שמן', 'נס', 'אור', 'מכבים', 'הדלקה', 'מתנות'] },
    // Purim (usually March)
    { startMonth: 1, startDay: 20, endMonth: 2, endDay: 20, nameKey: 'theme.purim', emoji: '🎭', words: ['פורים', 'תחפושת', 'המן', 'אסתר', 'מרדכי', 'מגילה', 'משלוח', 'מנות', 'רעשן', 'שמחה', 'משתה', 'עוגניות'] },
    // Passover (usually April)
    { startMonth: 2, startDay: 25, endMonth: 3, endDay: 30, nameKey: 'theme.passover', emoji: '🍷', words: ['פסח', 'מצה', 'סדר', 'הגדה', 'יציאת', 'מצרים', 'חירות', 'אפיקומן', 'כרפס', 'חרוסת', 'מרור', 'ארבע'] },
    // Shavuot (usually May/June)
    { startMonth: 4, startDay: 20, endMonth: 5, endDay: 15, nameKey: 'theme.shavuot', emoji: '📜', words: ['שבועות', 'תורה', 'מתן', 'הר', 'סיני', 'חלב', 'גבינה', 'ביכורים', 'לימוד', 'עשרת', 'הדברות', 'מגילת'] },
    // Israeli Independence Day
    { startMonth: 3, startDay: 20, endMonth: 4, endDay: 10, nameKey: 'theme.yomHaatzmaut', emoji: '🇮🇱', words: ['עצמאות', 'ישראל', 'דגל', 'חופש', 'מדינה', 'לאום', 'גאווה', 'חגיגה', 'מנגל', 'זיכרון', 'התקווה', 'ציונות'] }
  ],
  sv: [
    // New Year
    { startMonth: 11, startDay: 30, endMonth: 0, endDay: 2, nameKey: 'theme.newYear', emoji: '🎆', words: ['NYAR', 'FIRA', 'FEST', 'FYRVERKERI', 'MIDNATT', 'SKAL', 'CHAMPAGNE', 'ONSKNINGAR', 'NYARSLOFTEN', 'TOLVSLAGET', 'FESTLIGT', 'GLITTER'] },
    // Easter
    { startMonth: 2, startDay: 25, endMonth: 3, endDay: 25, nameKey: 'theme.easter', emoji: '🐰', words: ['PASK', 'KANIN', 'AGG', 'VAR', 'KYCKLING', 'PASKRIS', 'GODIS', 'PASKLILJA', 'GLAD', 'PASKBORD', 'TRADITIONER', 'PASKAFTON'] },
    // Midsummer (Swedish specialty - late June)
    { startMonth: 5, startDay: 19, endMonth: 5, endDay: 26, nameKey: 'theme.midsummer', emoji: '🌸', words: ['MIDSOMMAR', 'STANG', 'DANS', 'BLOMMA', 'KRANS', 'SILL', 'JORDGUBBAR', 'SOMMAR', 'LJUS', 'TRADITIONER', 'MAJSTANG', 'FOLKDRAKT'] },
    // Lucia (December 13)
    { startMonth: 11, startDay: 10, endMonth: 11, endDay: 14, nameKey: 'theme.lucia', emoji: '🕯️', words: ['LUCIA', 'LJUS', 'SANG', 'LUCIATAG', 'LUSSEKATT', 'PEPPARKAKOR', 'GLÖGG', 'TRADITION', 'ADVENTSLJUS', 'JULMARKNAD', 'VINTERMYS', 'SAFFRANSBULLAR'] },
    // Christmas
    { startMonth: 11, startDay: 20, endMonth: 11, endDay: 26, nameKey: 'theme.christmas', emoji: '🎄', words: ['JULAFTON', 'JULTOMTE', 'JULKLAPP', 'JULGRAN', 'SNO', 'JULSTJARNA', 'JULBORD', 'GLOGG', 'PEPPARKAKOR', 'JULSKINKOR', 'JULMUSIK', 'JULSTAMNING'] }
  ],
  es: [
    // New Year
    { startMonth: 11, startDay: 30, endMonth: 0, endDay: 2, nameKey: 'theme.newYear', emoji: '🎆', words: ['NOCHEVIEJA', 'CELEBRAR', 'FIESTA', 'FUEGOS', 'MEDIANOCHE', 'BRINDIS', 'CHAMPAN', 'DESEOS', 'UVAS', 'FELICIDAD', 'RESOLUCION', 'FESTIVO'] },
    // Three Kings Day
    { startMonth: 0, startDay: 4, endMonth: 0, endDay: 7, nameKey: 'theme.threeKings', emoji: '👑', words: ['REYES', 'MAGOS', 'REGALOS', 'CAMELLO', 'ESTRELLA', 'ORO', 'MIRRA', 'INCIENSO', 'ROSCON', 'CABALGATA', 'TRADICION', 'ILUSIONES'] },
    // Valentine's Day
    { startMonth: 1, startDay: 10, endMonth: 1, endDay: 15, nameKey: 'theme.valentines', emoji: '💕', words: ['AMOR', 'CORAZON', 'ROMANCE', 'CUPIDO', 'BESO', 'CITA', 'FLORES', 'DULCE', 'CARINO', 'CHOCOLATE', 'ENAMORADO', 'PASION'] },
    // Easter
    { startMonth: 2, startDay: 25, endMonth: 3, endDay: 25, nameKey: 'theme.easter', emoji: '🐰', words: ['PASCUA', 'CONEJO', 'HUEVO', 'PRIMAVERA', 'PROCESION', 'SEMANA', 'SANTA', 'PALMA', 'RESURRECCION', 'TRADICION', 'CHOCOLATE', 'BENDICION'] },
    // Day of the Dead (Mexico)
    { startMonth: 10, startDay: 1, endMonth: 10, endDay: 3, nameKey: 'theme.dayOfDead', emoji: '💀', words: ['MUERTOS', 'CATRINA', 'OFRENDA', 'ALTAR', 'CALAVERA', 'FLORES', 'VELAS', 'CEMENTERIO', 'RECUERDO', 'TRADICION', 'CEMPASUCHIL', 'ANCESTROS'] },
    // Christmas
    { startMonth: 11, startDay: 20, endMonth: 11, endDay: 26, nameKey: 'theme.christmas', emoji: '🎄', words: ['NAVIDAD', 'REGALOS', 'ARBOL', 'NIEVE', 'VILLANCICOS', 'BELEN', 'NOCHEBUENA', 'FAMILIA', 'TURRON', 'DECORACION', 'CELEBRACION', 'FELICIDADES'] }
  ],
  ja: [
    // New Year (very important in Japan)
    { startMonth: 11, startDay: 28, endMonth: 0, endDay: 7, nameKey: 'theme.newYear', emoji: '🎍', words: ['正月', '新年', '初詣', '門松', '鏡餅', '年賀', '御節', '初日', '元旦', '年始', '松竹梅', '祝福'] },
    // Setsubun (February 3)
    { startMonth: 1, startDay: 1, endMonth: 1, endDay: 5, nameKey: 'theme.setsubun', emoji: '👹', words: ['節分', '豆撒', '鬼滅', '福招', '恵方', '巻寿', '豆類', '厄除', '春分', '立春', '豆食', '福豆'] },
    // Hinamatsuri - Girls' Day (March 3)
    { startMonth: 2, startDay: 1, endMonth: 2, endDay: 5, nameKey: 'theme.hinamatsuri', emoji: '🎎', words: ['雛祭', '人形', '桃花', '女児', '祝日', '菱餅', '白酒', '雛壇', '内裏', '御雛', '桜餅', '貝合'] },
    // Cherry Blossom Season
    { startMonth: 2, startDay: 20, endMonth: 4, endDay: 10, nameKey: 'theme.sakura', emoji: '🌸', words: ['桜花', '花見', '春風', '満開', '花吹', '花弁', '春景', '花盛', '春光', '花筏', '桜並', '風流'] },
    // Golden Week (late April - early May)
    { startMonth: 3, startDay: 28, endMonth: 4, endDay: 6, nameKey: 'theme.goldenWeek', emoji: '🎌', words: ['連休', '憲法', '緑日', '子供', '祝日', '旅行', '家族', '休暇', '行楽', '黄金', '週間', '休息'] },
    // Tanabata - Star Festival (July 7)
    { startMonth: 6, startDay: 5, endMonth: 6, endDay: 9, nameKey: 'theme.tanabata', emoji: '🎋', words: ['七夕', '織姫', '彦星', '天河', '短冊', '笹竹', '願事', '星祭', '銀河', '天川', '牽牛', '織女'] },
    // Obon (mid-August)
    { startMonth: 7, startDay: 10, endMonth: 7, endDay: 17, nameKey: 'theme.obon', emoji: '🏮', words: ['盆踊', '先祖', '供養', '灯籠', '帰省', '墓参', '精霊', '迎火', '送火', '盆棚', '法要', '仏前'] },
    // Autumn Leaves
    { startMonth: 9, startDay: 15, endMonth: 10, endDay: 30, nameKey: 'theme.autumnLeaves', emoji: '🍁', words: ['紅葉', '秋景', '黄葉', '落葉', '秋晴', '実秋', '秋風', '紅染', '山紅', '秋深', '枯葉', '晩秋'] },
    // Christmas (popular in Japan)
    { startMonth: 11, startDay: 20, endMonth: 11, endDay: 26, nameKey: 'theme.christmas', emoji: '🎄', words: ['聖夜', '降誕', '贈物', '樅木', '聖誕', '祝祭', '冬至', '雪景', '鈴音', '装飾', '祝福', '歓喜'] }
  ]
};

/**
 * Get the current theme based on date and language
 * @param {string} language - Language code (en, he, sv, es, ja)
 * @param {Date} date - Date to check (defaults to current date)
 * @returns {{ nameKey: string, emoji: string, words: string[], isHoliday: boolean }}
 */
function getCurrentTheme(language, date = new Date()) {
  const lang = language || 'en';
  const month = date.getMonth();
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // Check holiday themes first
  const holidays = holidayThemes[lang] || holidayThemes.en;

  for (const holiday of holidays) {
    if (isDateInRange(month, day, holiday)) {
      return {
        nameKey: holiday.nameKey,
        emoji: holiday.emoji,
        words: holiday.words,
        isHoliday: true
      };
    }
  }

  // Fall back to day of week theme
  const dayThemes = dayOfWeekThemes[lang] || dayOfWeekThemes.en;
  const dayTheme = dayThemes.find(t => t.day === dayOfWeek) || dayThemes[0];

  return {
    nameKey: dayTheme.nameKey,
    emoji: dayTheme.emoji,
    words: dayTheme.words,
    isHoliday: false
  };
}

/**
 * Check if a date falls within a holiday range
 * Handles year-wrapping ranges (e.g., Dec 30 - Jan 2)
 */
function isDateInRange(month, day, holiday) {
  const { startMonth, startDay, endMonth, endDay } = holiday;

  // Handle year-wrapping (e.g., Dec 30 - Jan 2)
  if (startMonth > endMonth) {
    // Either in the end of year part OR beginning of year part
    return (month > startMonth || (month === startMonth && day >= startDay)) ||
           (month < endMonth || (month === endMonth && day <= endDay));
  }

  // Same year range
  if (month < startMonth || month > endMonth) return false;
  if (month === startMonth && day < startDay) return false;
  if (month === endMonth && day > endDay) return false;
  return true;
}

/**
 * Get themed words for a specific language and date
 * @param {string} language - Language code
 * @param {number} count - Number of themed words to return
 * @param {number} minLength - Minimum word length
 * @param {number} maxLength - Maximum word length
 * @param {Date} date - Date to check (defaults to current date)
 * @returns {{ theme: { nameKey: string, emoji: string, isHoliday: boolean }, words: string[] }}
 */
function getThemedWords(language, count = 10, minLength = 3, maxLength = 12, date = new Date()) {
  const theme = getCurrentTheme(language, date);

  // Filter words by length
  const filteredWords = theme.words.filter(w => w.length >= minLength && w.length <= maxLength);

  // Shuffle and pick random words
  const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
  const selectedWords = shuffled.slice(0, Math.min(count, shuffled.length));

  return {
    theme: {
      nameKey: theme.nameKey,
      emoji: theme.emoji,
      isHoliday: theme.isHoliday
    },
    words: selectedWords
  };
}

module.exports = {
  getCurrentTheme,
  getThemedWords,
  dayOfWeekThemes,
  holidayThemes
};
