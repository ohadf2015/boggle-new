/**
 * Date-Themed Words for Board Generation
 *
 * Contains holiday/event word lists for all supported languages,
 * plus day-of-week themes for non-holiday periods.
 *
 * Uses custom Hebrew calendar calculations and date-easter for Easter.
 * All moving holidays are calculated dynamically for any year.
 */

const easter = require('date-easter');

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
    { day: 0, nameKey: 'theme.sundayFunday', emoji: '🌞', words: ['ראשונ', 'שמש', 'מנוחה', 'שלומ', 'רגוע', 'נעימ', 'שקט', 'רוגע', 'נחת', 'שלווה', 'מרגיע', 'נינוח'] },
    { day: 1, nameKey: 'theme.mondayMotivation', emoji: '💪', words: ['שני', 'התחלה', 'כוח', 'אנרגיה', 'מוטיבציה', 'מטרה', 'הצלחה', 'שאיפה', 'נחישות', 'התמדה', 'מרצ', 'עוצמה'] },
    { day: 2, nameKey: 'theme.tuesdayTrivia', emoji: '🧠', words: ['שלישי', 'מוח', 'חכמ', 'פיקח', 'ידע', 'למידה', 'חשיבה', 'תבונה', 'שכל', 'הבנה', 'חוכמה', 'אינטלקט'] },
    { day: 3, nameKey: 'theme.wednesdayWisdom', emoji: '📚', words: ['רביעי', 'ספר', 'קריאה', 'כתיבה', 'סיפור', 'מילימ', 'שירה', 'חכמה', 'תורה', 'לימוד', 'השכלה', 'ספרות'] },
    { day: 4, nameKey: 'theme.thursdayThrowback', emoji: '📷', words: ['חמישי', 'זיכרונ', 'עבר', 'היסטוריה', 'מורשת', 'תמונה', 'אלבומ', 'נוסטלגיה', 'ותיק', 'קלאסי', 'עתיק', 'מסורת'] },
    { day: 5, nameKey: 'theme.funFriday', emoji: '🎉', words: ['שישי', 'שמחה', 'חגיגה', 'ריקוד', 'מוזיקה', 'שיר', 'מסיבה', 'כיפ', 'צחוק', 'עליזות', 'התלהבות', 'אושר'] },
    { day: 6, nameKey: 'theme.saturdayAdventure', emoji: '🏔️', words: ['שבת', 'טיול', 'הרפתקה', 'טבע', 'יער', 'הר', 'נחל', 'שביל', 'מסע', 'גילוי', 'חקירה', 'נדודימ'] }
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
  ],
  // Russian themed words — UPPERCASE Cyrillic to match board convention.
  // Deliberately ё-free and Ъ-free so embedded letters stay inside
  // russianLetterPool (board never shows a tile it can't otherwise generate).
  ru: [
    { day: 0, nameKey: 'theme.sundayFunday', emoji: '🌞', words: ['ОТДЫХ', 'ПОКОЙ', 'ТИШИНА', 'СОН', 'УЮТ', 'ЛЕНЬ', 'НЕГА', 'ДОСУГ', 'СВОБОДА', 'ДРЕМА', 'ПОКОЙНЫЙ', 'СПОКОЙСТВИЕ'] },
    { day: 1, nameKey: 'theme.mondayMotivation', emoji: '💪', words: ['НАЧАЛО', 'СИЛА', 'ЭНЕРГИЯ', 'ЦЕЛЬ', 'УСПЕХ', 'ВОЛЯ', 'МОЩЬ', 'РЫВОК', 'ПОБЕДА', 'ЗАДАЧА', 'УПОРСТВО', 'СТРЕМЛЕНИЕ'] },
    { day: 2, nameKey: 'theme.tuesdayTrivia', emoji: '🧠', words: ['МОЗГ', 'МЫСЛЬ', 'ЗНАНИЕ', 'РАЗУМ', 'ИДЕЯ', 'ЛОГИКА', 'ВОПРОС', 'ОТВЕТ', 'УЧЕБА', 'УМНЫЙ', 'ЗАГАДКА', 'МУДРОСТЬ'] },
    { day: 3, nameKey: 'theme.wednesdayWisdom', emoji: '📚', words: ['КНИГА', 'ЧТЕНИЕ', 'ПИСЬМО', 'РАССКАЗ', 'СТИХ', 'РОМАН', 'АВТОР', 'СЛОВО', 'ПОЭМА', 'ИСТОРИЯ', 'МУДРОСТЬ', 'ЛИТЕРАТУРА'] },
    { day: 4, nameKey: 'theme.thursdayThrowback', emoji: '📷', words: ['ПАМЯТЬ', 'ПРОШЛОЕ', 'ФОТО', 'АЛЬБОМ', 'СТАРИНА', 'НАСЛЕДИЕ', 'ДАВНО', 'РЕТРО', 'ВИНТАЖ', 'ТРАДИЦИЯ', 'ИСТОРИЯ', 'ВОСПОМИНАНИЕ'] },
    { day: 5, nameKey: 'theme.funFriday', emoji: '🎉', words: ['ПЯТНИЦА', 'ВЕСЕЛЬЕ', 'ПРАЗДНИК', 'ТАНЕЦ', 'МУЗЫКА', 'РАДОСТЬ', 'СМЕХ', 'ПЕСНЯ', 'ИГРА', 'СЧАСТЬЕ', 'ВЕЧЕРИНКА', 'ПРАЗДНОВАНИЕ'] },
    { day: 6, nameKey: 'theme.saturdayAdventure', emoji: '🏔️', words: ['ПОХОД', 'ПРИРОДА', 'ЛЕС', 'ГОРА', 'РЕКА', 'ТРОПА', 'ДОРОГА', 'ПОИСК', 'ОТКРЫТИЕ', 'СТРАНСТВИЕ', 'ПРИКЛЮЧЕНИЕ', 'ПУТЕШЕСТВИЕ'] }
  ]
};

// ============================================================================
// DYNAMIC HOLIDAY CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Easter Sunday date for a given year (Western/Gregorian)
 */
function getEasterDate(year) {
  const e = easter.easter(year);
  return new Date(e.year, e.month - 1, e.day); // month is 1-indexed in date-easter
}

/**
 * Calculate US Thanksgiving (4th Thursday of November)
 */
function getThanksgivingDate(year) {
  const nov1 = new Date(year, 10, 1); // November 1st
  const dayOfWeek = nov1.getDay();
  // Find first Thursday (day 4)
  // If Nov 1 is Thursday (4), first Thursday is Nov 1
  // If Nov 1 is Friday (5), first Thursday is Nov 7 (6 days later)
  let firstThursday;
  if (dayOfWeek <= 4) {
    firstThursday = 1 + (4 - dayOfWeek);
  } else {
    firstThursday = 1 + (7 - dayOfWeek + 4);
  }
  // 4th Thursday is 21 days after the first Thursday
  const thanksgiving = firstThursday + 21;
  return new Date(year, 10, thanksgiving);
}

/**
 * Calculate Swedish Midsummer (Saturday between June 20-26)
 */
function getMidsummerDate(year) {
  const june20 = new Date(year, 5, 20);
  const dayOfWeek = june20.getDay();
  // Find next Saturday (day 6)
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  return new Date(year, 5, 20 + daysUntilSaturday);
}

/**
 * Hebrew Calendar Calculations
 * Based on the algorithm for computing Hebrew dates from Gregorian dates
 */

// Check if a Hebrew year is a leap year (13 months)
function isHebrewLeapYear(hebrewYear) {
  return ((7 * hebrewYear + 1) % 19) < 7;
}

// Get the number of days in a Hebrew month
function hebrewMonthDays(hebrewYear, month) {
  // Month: 1=Tishrei, 2=Cheshvan, 3=Kislev, 4=Tevet, 5=Shevat, 6=Adar I
  // In leap years: 7=Adar II, otherwise 7=Nisan
  // 8=Nisan (or 7 in non-leap), etc.

  const monthLengths = {
    1: 30,  // Tishrei
    2: 29,  // Cheshvan (can be 30)
    3: 30,  // Kislev (can be 29)
    4: 29,  // Tevet
    5: 30,  // Shevat
    6: 30,  // Adar I (only in leap year, otherwise regular Adar = 29)
    7: 29,  // Adar II in leap year, or Nisan otherwise
  };

  // Simplified - actual calculation is more complex based on year type
  return monthLengths[month] || 30;
}

// Calculate Rosh Hashanah (1 Tishrei) for a Hebrew year
// Returns the Julian Day Number
function roshHashanahJD(hebrewYear) {
  // Molad calculation (simplified from the actual Hebrew calendar algorithm)
  const monthsElapsed = Math.floor((235 * hebrewYear - 234) / 19);
  const partsElapsed = 12084 + 13753 * monthsElapsed;
  const day = Math.floor(monthsElapsed * 29 + partsElapsed / 25920);

  // Postponement rules (dehiyyot)
  const mod = (day % 7);
  let roshHashanah = day;

  // If Molad falls on Sunday, Wednesday, or Friday - postpone
  if (mod === 0 || mod === 3 || mod === 5) {
    roshHashanah++;
  }

  return roshHashanah + 347997; // Add offset to get Julian Day Number
}

// Convert Julian Day Number to Gregorian date
function jdToGregorian(jd) {
  const z = Math.floor(jd - 1721118.5);
  const r = jd - 1721118.5 - z;
  const g = z - 0.25;
  const a = Math.floor(g / 36524.25);
  const b = a - Math.floor(a / 4);
  const year = Math.floor((b + g) / 365.25);
  const c = b + z - Math.floor(365.25 * year);
  const month = Math.floor((5 * c + 456) / 153);
  const day = c - Math.floor((153 * month - 457) / 5) + r;

  let finalYear = year;
  let finalMonth = month;

  if (month > 12) {
    finalYear++;
    finalMonth = month - 12;
  }

  return new Date(finalYear, finalMonth - 1, Math.floor(day));
}

// Get approximate Hebrew holiday dates for a Gregorian year
// Uses approximation based on average Hebrew calendar patterns
function getHebrewHolidayDates(year) {
  const holidays = {};

  // Hebrew year 5785 = Gregorian 2024-2025
  // The Hebrew year that starts in fall of Gregorian year N is 3761 + N (or 3760 + N+1)
  const hebrewYearFall = year + 3761;  // For fall holidays
  const hebrewYearSpring = year + 3760; // For spring holidays

  // Calculate Rosh Hashanah using the algorithm
  // Fall back to approximation if needed

  // Rosh Hashanah typically falls between Sep 5 - Oct 5
  // Use known data points to extrapolate
  const knownRH = {
    2024: new Date(2024, 9, 2),   // Oct 2, 2024 (5785)
    2025: new Date(2025, 8, 22),  // Sep 22, 2025 (5786)
    2026: new Date(2026, 8, 11),  // Sep 11, 2026 (5787)
    2027: new Date(2027, 9, 1),   // Oct 1, 2027 (5788)
    2028: new Date(2028, 8, 20),  // Sep 20, 2028 (5789)
    2029: new Date(2029, 8, 9),   // Sep 9, 2029 (5790)
    2030: new Date(2030, 8, 27),  // Sep 27, 2030 (5791)
  };

  // If we have the known date, use it; otherwise approximate
  let roshHashanahDate = knownRH[year];
  if (!roshHashanahDate) {
    // Approximation based on 19-year metonic cycle
    const baseYear = 2024;
    const cyclePosition = ((year - baseYear) % 19 + 19) % 19;
    const baseDate = new Date(2024, 9, 2); // Oct 2, 2024
    // Each year shifts by approximately 11 days back, with leap year adjustments
    const dayShift = (cyclePosition * 11) % 30 - 10;
    roshHashanahDate = new Date(year, 8, 25 + dayShift); // Around late September
  }

  const rh = roshHashanahDate;

  // Rosh Hashanah (1-2 Tishrei) - 2 days
  holidays.roshHashanah = {
    start: new Date(rh),
    end: new Date(rh.getFullYear(), rh.getMonth(), rh.getDate() + 1)
  };

  // Yom Kippur (10 Tishrei) - 9 days after Rosh Hashanah
  holidays.yomKippur = {
    start: new Date(rh.getFullYear(), rh.getMonth(), rh.getDate() + 9),
    end: new Date(rh.getFullYear(), rh.getMonth(), rh.getDate() + 9)
  };

  // Sukkot (15-22 Tishrei) - 14 days after Rosh Hashanah, lasts 8 days
  holidays.sukkot = {
    start: new Date(rh.getFullYear(), rh.getMonth(), rh.getDate() + 14),
    end: new Date(rh.getFullYear(), rh.getMonth(), rh.getDate() + 21)
  };

  // Hanukkah (25 Kislev) - approximately 84 days after Rosh Hashanah
  // Varies: can be late Nov to late Dec
  const hanukkahOffset = 84; // Approximation
  const hanukkahStart = new Date(rh.getFullYear(), rh.getMonth(), rh.getDate() + hanukkahOffset);
  holidays.hanukkah = {
    start: hanukkahStart,
    end: new Date(hanukkahStart.getFullYear(), hanukkahStart.getMonth(), hanukkahStart.getDate() + 7)
  };

  // Spring holidays - use known Passover dates for accuracy
  // Passover 15 Nisan in the Hebrew year that ends in 'year'
  const knownPassover = {
    2024: new Date(2024, 3, 22),  // April 22, 2024
    2025: new Date(2025, 3, 12),  // April 12, 2025
    2026: new Date(2026, 3, 1),   // April 1, 2026
    2027: new Date(2027, 3, 21),  // April 21, 2027
    2028: new Date(2028, 3, 10),  // April 10, 2028
    2029: new Date(2029, 2, 30),  // March 30, 2029
    2030: new Date(2030, 3, 17),  // April 17, 2030
  };

  // Get Passover date - use known if available, otherwise approximate
  let passoverStart = knownPassover[year];
  if (!passoverStart) {
    // For unknown years, get Rosh Hashanah of previous year and calculate
    let prevRH = knownRH[year - 1];
    if (!prevRH) {
      const baseYear = 2024;
      const cyclePosition = ((year - 1 - baseYear) % 19 + 19) % 19;
      const dayShift = (cyclePosition * 11) % 30 - 10;
      prevRH = new Date(year - 1, 8, 25 + dayShift);
    }
    // Passover is approximately 201 days after Rosh Hashanah in a leap year, 172 in regular
    const hebrewYear = year + 3760;
    const isLeap = isHebrewLeapYear(hebrewYear);
    const passoverOffset = isLeap ? 201 : 172;
    passoverStart = new Date(prevRH.getFullYear(), prevRH.getMonth(), prevRH.getDate() + passoverOffset);
  }

  holidays.passover = {
    start: passoverStart,
    end: new Date(passoverStart.getFullYear(), passoverStart.getMonth(), passoverStart.getDate() + 7)
  };

  // Purim (14 Adar) - 30 days before Passover
  const purimDate = new Date(passoverStart.getFullYear(), passoverStart.getMonth(), passoverStart.getDate() - 30);
  holidays.purim = {
    start: purimDate,
    end: new Date(purimDate.getFullYear(), purimDate.getMonth(), purimDate.getDate() + 1)
  };

  // Yom Ha'atzmaut (5 Iyar) - approximately 20 days after Passover starts
  const yomHaatzmautDate = new Date(passoverStart.getFullYear(), passoverStart.getMonth(), passoverStart.getDate() + 23);
  holidays.yomHaatzmaut = {
    start: yomHaatzmautDate,
    end: yomHaatzmautDate
  };

  // Shavuot (6-7 Sivan) - 50 days after Passover starts (Counting of the Omer)
  const shavuotStart = new Date(passoverStart.getFullYear(), passoverStart.getMonth(), passoverStart.getDate() + 50);
  holidays.shavuot = {
    start: shavuotStart,
    end: new Date(shavuotStart.getFullYear(), shavuotStart.getMonth(), shavuotStart.getDate() + 1)
  };

  return holidays;
}

/**
 * Check if a date is within a range (with buffer days)
 */
function isDateInDynamicRange(checkDate, startDate, endDate, bufferDays = 1) {
  const checkTime = checkDate.getTime();
  const startTime = new Date(startDate).getTime() - (bufferDays * 24 * 60 * 60 * 1000);
  const endTime = new Date(endDate).getTime() + (bufferDays * 24 * 60 * 60 * 1000);
  return checkTime >= startTime && checkTime <= endTime;
}

/**
 * Check if date is near a fixed holiday (month/day based)
 */
function isNearFixedDate(checkDate, month, day, bufferDays = 1) {
  const year = checkDate.getFullYear();
  const holidayDate = new Date(year, month, day);
  const startTime = holidayDate.getTime() - (bufferDays * 24 * 60 * 60 * 1000);
  const endTime = holidayDate.getTime() + (bufferDays * 24 * 60 * 60 * 1000);
  return checkDate.getTime() >= startTime && checkDate.getTime() <= endTime;
}

/**
 * Check New Year (spans year boundary: Dec 31 - Jan 2)
 */
function isNewYear(date) {
  const month = date.getMonth();
  const day = date.getDate();
  return (month === 11 && day >= 31) || (month === 0 && day <= 2);
}

// ============================================================================
// HOLIDAY WORD LISTS (static, used with dynamic dates)
// ============================================================================

const holidayWords = {
  newYear: {
    en: ['NEWYEAR', 'CELEBRATE', 'COUNTDOWN', 'MIDNIGHT', 'FIREWORK', 'PARTY', 'TOAST', 'CHEERS', 'RESOLUTION', 'CHAMPAGNE', 'FESTIVE', 'SPARKLE'],
    sv: ['NYAR', 'FIRA', 'FEST', 'FYRVERKERI', 'MIDNATT', 'SKAL', 'CHAMPAGNE', 'ONSKNINGAR', 'NYARSLOFTEN', 'TOLVSLAGET', 'FESTLIGT', 'GLITTER'],
    es: ['NOCHEVIEJA', 'CELEBRAR', 'FIESTA', 'FUEGOS', 'MEDIANOCHE', 'BRINDIS', 'CHAMPAN', 'DESEOS', 'UVAS', 'FELICIDAD', 'RESOLUCION', 'FESTIVO'],
    ja: ['正月', '新年', '初詣', '門松', '鏡餅', '年賀', '御節', '初日', '元旦', '年始', '松竹梅', '祝福']
  },
  valentines: {
    en: ['VALENTINE', 'LOVE', 'HEART', 'ROMANCE', 'CUPID', 'KISS', 'DATE', 'FLOWER', 'SWEET', 'BELOVED', 'CHOCOLATE', 'AFFECTION'],
    es: ['AMOR', 'CORAZON', 'ROMANCE', 'CUPIDO', 'BESO', 'CITA', 'FLORES', 'DULCE', 'CARINO', 'CHOCOLATE', 'ENAMORADO', 'PASION']
  },
  stPatricks: {
    en: ['SHAMROCK', 'LUCKY', 'GREEN', 'IRISH', 'CLOVER', 'GOLD', 'RAINBOW', 'CELTIC', 'CHARM', 'LEPRECHAUN', 'EMERALD', 'BLESSING']
  },
  easter: {
    en: ['EASTER', 'BUNNY', 'EGG', 'SPRING', 'BASKET', 'HUNT', 'CHICK', 'BLOOM', 'LILY', 'CHOCOLATE', 'RENEWAL', 'CELEBRATION'],
    sv: ['PASK', 'KANIN', 'AGG', 'VAR', 'KYCKLING', 'PASKRIS', 'GODIS', 'PASKLILJA', 'GLAD', 'PASKBORD', 'TRADITIONER', 'PASKAFTON'],
    es: ['PASCUA', 'CONEJO', 'HUEVO', 'PRIMAVERA', 'PROCESION', 'SEMANA', 'SANTA', 'PALMA', 'RESURRECCION', 'TRADICION', 'CHOCOLATE', 'BENDICION']
  },
  independence: {
    en: ['FREEDOM', 'LIBERTY', 'AMERICA', 'PATRIOT', 'FLAG', 'PARADE', 'FIREWORK', 'PRIDE', 'NATION', 'INDEPENDENCE', 'DEMOCRACY', 'CELEBRATION']
  },
  halloween: {
    en: ['HALLOWEEN', 'SPOOKY', 'GHOST', 'WITCH', 'PUMPKIN', 'CANDY', 'COSTUME', 'SCARY', 'TRICK', 'TREAT', 'MONSTER', 'HAUNTED']
  },
  thanksgiving: {
    en: ['THANKFUL', 'TURKEY', 'FAMILY', 'FEAST', 'GRATEFUL', 'HARVEST', 'AUTUMN', 'BLESSING', 'DINNER', 'GRATITUDE', 'THANKSGIVING', 'TOGETHERNESS']
  },
  christmas: {
    en: ['CHRISTMAS', 'SANTA', 'GIFT', 'TREE', 'SNOW', 'JINGLE', 'CAROL', 'MERRY', 'REINDEER', 'STOCKING', 'ORNAMENT', 'CELEBRATION'],
    sv: ['JULAFTON', 'JULTOMTE', 'JULKLAPP', 'JULGRAN', 'SNO', 'JULSTJARNA', 'JULBORD', 'GLOGG', 'PEPPARKAKOR', 'JULSKINKOR', 'JULMUSIK', 'JULSTAMNING'],
    es: ['NAVIDAD', 'REGALOS', 'ARBOL', 'NIEVE', 'VILLANCICOS', 'BELEN', 'NOCHEBUENA', 'FAMILIA', 'TURRON', 'DECORACION', 'CELEBRACION', 'FELICIDADES'],
    ja: ['聖夜', '降誕', '贈物', '樅木', '聖誕', '祝祭', '冬至', '雪景', '鈴音', '装飾', '祝福', '歓喜']
  },
  threeKings: {
    es: ['REYES', 'MAGOS', 'REGALOS', 'CAMELLO', 'ESTRELLA', 'ORO', 'MIRRA', 'INCIENSO', 'ROSCON', 'CABALGATA', 'TRADICION', 'ILUSIONES']
  },
  dayOfDead: {
    es: ['MUERTOS', 'CATRINA', 'OFRENDA', 'ALTAR', 'CALAVERA', 'FLORES', 'VELAS', 'CEMENTERIO', 'RECUERDO', 'TRADICION', 'CEMPASUCHIL', 'ANCESTROS']
  },
  midsummer: {
    sv: ['MIDSOMMAR', 'STANG', 'DANS', 'BLOMMA', 'KRANS', 'SILL', 'JORDGUBBAR', 'SOMMAR', 'LJUS', 'TRADITIONER', 'MAJSTANG', 'FOLKDRAKT']
  },
  lucia: {
    sv: ['LUCIA', 'LJUS', 'SANG', 'LUCIATAG', 'LUSSEKATT', 'PEPPARKAKOR', 'GLOGG', 'TRADITION', 'ADVENTSLJUS', 'JULMARKNAD', 'VINTERMYS', 'SAFFRANSBULLAR']
  },
  // Hebrew holidays
  roshHashana: {
    he: ['ראש', 'השנה', 'תפוח', 'דבש', 'שופר', 'תשובה', 'סליחה', 'ברכה', 'שנה', 'טובה', 'מתיקות', 'התחדשות']
  },
  yomKippur: {
    he: ['כיפור', 'צומ', 'תפילה', 'סליחה', 'תשובה', 'כפרה', 'טהרה', 'קדושה', 'נשמה', 'רוחניות', 'התבוננות', 'מחילה']
  },
  sukkot: {
    he: ['סוכה', 'לולב', 'אתרוג', 'הדס', 'ערבה', 'חג', 'שמחה', 'אורחימ', 'סככ', 'ארבעת', 'המינימ', 'הושענא']
  },
  hanukkah: {
    he: ['חנוכה', 'נר', 'חנוכיה', 'סביבונ', 'סופגניה', 'לביבה', 'שמנ', 'נס', 'אור', 'מכבימ', 'הדלקה', 'מתנות']
  },
  purim: {
    he: ['פורימ', 'תחפושת', 'המנ', 'אסתר', 'מרדכי', 'מגילה', 'משלוח', 'מנות', 'רעשנ', 'שמחה', 'משתה', 'עוגניות']
  },
  passover: {
    he: ['פסח', 'מצה', 'סדר', 'הגדה', 'יציאת', 'מצרימ', 'חירות', 'אפיקומנ', 'כרפס', 'חרוסת', 'מרור', 'ארבע']
  },
  shavuot: {
    he: ['שבועות', 'תורה', 'מתנ', 'הר', 'סיני', 'חלב', 'גבינה', 'ביכורימ', 'לימוד', 'עשרת', 'הדברות', 'מגילת']
  },
  yomHaatzmaut: {
    he: ['עצמאות', 'ישראל', 'דגל', 'חופש', 'מדינה', 'לאומ', 'גאווה', 'חגיגה', 'מנגל', 'זיכרונ', 'התקווה', 'ציונות']
  },
  // Japanese holidays
  setsubun: {
    ja: ['節分', '豆撒', '鬼滅', '福招', '恵方', '巻寿', '豆類', '厄除', '春分', '立春', '豆食', '福豆']
  },
  hinamatsuri: {
    ja: ['雛祭', '人形', '桃花', '女児', '祝日', '菱餅', '白酒', '雛壇', '内裏', '御雛', '桜餅', '貝合']
  },
  sakura: {
    ja: ['桜花', '花見', '春風', '満開', '花吹', '花弁', '春景', '花盛', '春光', '花筏', '桜並', '風流']
  },
  goldenWeek: {
    ja: ['連休', '憲法', '緑日', '子供', '祝日', '旅行', '家族', '休暇', '行楽', '黄金', '週間', '休息']
  },
  tanabata: {
    ja: ['七夕', '織姫', '彦星', '天河', '短冊', '笹竹', '願事', '星祭', '銀河', '天川', '牽牛', '織女']
  },
  obon: {
    ja: ['盆踊', '先祖', '供養', '灯籠', '帰省', '墓参', '精霊', '迎火', '送火', '盆棚', '法要', '仏前']
  },
  autumnLeaves: {
    ja: ['紅葉', '秋景', '黄葉', '落葉', '秋晴', '実秋', '秋風', '紅染', '山紅', '秋深', '枯葉', '晩秋']
  }
};

// ============================================================================
// MAIN THEME DETECTION FUNCTION
// ============================================================================

/**
 * Get the current theme based on date and language
 * Uses dynamic date calculation for moving holidays
 */
function getCurrentTheme(language, date = new Date()) {
  const lang = language || 'en';
  const year = date.getFullYear();

  // Get dynamically calculated dates
  const easterDate = getEasterDate(year);
  const thanksgivingDate = getThanksgivingDate(year);
  const midsummerDate = getMidsummerDate(year);
  const hebrewHolidays = getHebrewHolidayDates(year);

  // Helper to get words for a holiday, falling back to English
  const getWords = (holidayKey) => {
    return holidayWords[holidayKey][lang] || holidayWords[holidayKey].en || [];
  };

  // ========== Check holidays in priority order ==========

  // NEW YEAR (all languages)
  if (isNewYear(date)) {
    return {
      nameKey: 'theme.newYear',
      emoji: lang === 'ja' ? '🎍' : '🎆',
      words: getWords('newYear'),
      isHoliday: true
    };
  }

  // HEBREW HOLIDAYS (for Hebrew language)
  if (lang === 'he') {
    if (isDateInDynamicRange(date, hebrewHolidays.roshHashanah.start, hebrewHolidays.roshHashanah.end)) {
      return { nameKey: 'theme.roshHashana', emoji: '🍎', words: getWords('roshHashana'), isHoliday: true };
    }
    if (isDateInDynamicRange(date, hebrewHolidays.yomKippur.start, hebrewHolidays.yomKippur.end)) {
      return { nameKey: 'theme.yomKippur', emoji: '🕊️', words: getWords('yomKippur'), isHoliday: true };
    }
    if (isDateInDynamicRange(date, hebrewHolidays.sukkot.start, hebrewHolidays.sukkot.end)) {
      return { nameKey: 'theme.sukkot', emoji: '🌿', words: getWords('sukkot'), isHoliday: true };
    }
    if (isDateInDynamicRange(date, hebrewHolidays.hanukkah.start, hebrewHolidays.hanukkah.end)) {
      return { nameKey: 'theme.hanukkah', emoji: '🕎', words: getWords('hanukkah'), isHoliday: true };
    }
    if (isDateInDynamicRange(date, hebrewHolidays.purim.start, hebrewHolidays.purim.end)) {
      return { nameKey: 'theme.purim', emoji: '🎭', words: getWords('purim'), isHoliday: true };
    }
    if (isDateInDynamicRange(date, hebrewHolidays.passover.start, hebrewHolidays.passover.end)) {
      return { nameKey: 'theme.passover', emoji: '🍷', words: getWords('passover'), isHoliday: true };
    }
    if (isDateInDynamicRange(date, hebrewHolidays.yomHaatzmaut.start, hebrewHolidays.yomHaatzmaut.end)) {
      return { nameKey: 'theme.yomHaatzmaut', emoji: '🇮🇱', words: getWords('yomHaatzmaut'), isHoliday: true };
    }
    if (isDateInDynamicRange(date, hebrewHolidays.shavuot.start, hebrewHolidays.shavuot.end)) {
      return { nameKey: 'theme.shavuot', emoji: '📜', words: getWords('shavuot'), isHoliday: true };
    }
  }

  // VALENTINE'S DAY (Feb 14) - English, Spanish
  if ((lang === 'en' || lang === 'es') && isNearFixedDate(date, 1, 14)) {
    return { nameKey: 'theme.valentines', emoji: '💕', words: getWords('valentines'), isHoliday: true };
  }

  // ST. PATRICK'S DAY (Mar 17) - English only
  if (lang === 'en' && isNearFixedDate(date, 2, 17)) {
    return { nameKey: 'theme.stPatricks', emoji: '☘️', words: getWords('stPatricks'), isHoliday: true };
  }

  // THREE KINGS DAY (Jan 6) - Spanish only
  if (lang === 'es' && isNearFixedDate(date, 0, 6)) {
    return { nameKey: 'theme.threeKings', emoji: '👑', words: getWords('threeKings'), isHoliday: true };
  }

  // SETSUBUN (Feb 3) - Japanese only
  if (lang === 'ja' && isNearFixedDate(date, 1, 3)) {
    return { nameKey: 'theme.setsubun', emoji: '👹', words: getWords('setsubun'), isHoliday: true };
  }

  // HINAMATSURI (Mar 3) - Japanese only
  if (lang === 'ja' && isNearFixedDate(date, 2, 3)) {
    return { nameKey: 'theme.hinamatsuri', emoji: '🎎', words: getWords('hinamatsuri'), isHoliday: true };
  }

  // EASTER (dynamic) - English, Swedish, Spanish
  if ((lang === 'en' || lang === 'sv' || lang === 'es') && isDateInDynamicRange(date, easterDate, easterDate)) {
    return { nameKey: 'theme.easter', emoji: '🐰', words: getWords('easter'), isHoliday: true };
  }

  // SAKURA SEASON (late March - early April) - Japanese only
  if (lang === 'ja') {
    const sakuraStart = new Date(year, 2, 28); // Mar 28
    const sakuraEnd = new Date(year, 3, 10); // Apr 10
    if (date >= sakuraStart && date <= sakuraEnd) {
      return { nameKey: 'theme.sakura', emoji: '🌸', words: getWords('sakura'), isHoliday: true };
    }
  }

  // GOLDEN WEEK (Apr 29 - May 5) - Japanese only
  if (lang === 'ja') {
    const gwStart = new Date(year, 3, 28); // Apr 28
    const gwEnd = new Date(year, 4, 6); // May 6
    if (date >= gwStart && date <= gwEnd) {
      return { nameKey: 'theme.goldenWeek', emoji: '🎌', words: getWords('goldenWeek'), isHoliday: true };
    }
  }

  // MIDSUMMER (dynamic) - Swedish only
  if (lang === 'sv' && isDateInDynamicRange(date, midsummerDate, midsummerDate)) {
    return { nameKey: 'theme.midsummer', emoji: '🌸', words: getWords('midsummer'), isHoliday: true };
  }

  // INDEPENDENCE DAY (Jul 4) - English only
  if (lang === 'en' && isNearFixedDate(date, 6, 4)) {
    return { nameKey: 'theme.independence', emoji: '🇺🇸', words: getWords('independence'), isHoliday: true };
  }

  // TANABATA (Jul 7) - Japanese only
  if (lang === 'ja' && isNearFixedDate(date, 6, 7)) {
    return { nameKey: 'theme.tanabata', emoji: '🎋', words: getWords('tanabata'), isHoliday: true };
  }

  // OBON (Aug 13-16) - Japanese only
  if (lang === 'ja') {
    const obonStart = new Date(year, 7, 12);
    const obonEnd = new Date(year, 7, 16);
    if (date >= obonStart && date <= obonEnd) {
      return { nameKey: 'theme.obon', emoji: '🏮', words: getWords('obon'), isHoliday: true };
    }
  }

  // HALLOWEEN (Oct 31) - English only
  if (lang === 'en' && isNearFixedDate(date, 9, 31)) {
    return { nameKey: 'theme.halloween', emoji: '🎃', words: getWords('halloween'), isHoliday: true };
  }

  // DAY OF THE DEAD (Nov 1-2) - Spanish only
  if (lang === 'es' && (isNearFixedDate(date, 10, 1) || isNearFixedDate(date, 10, 2, 0))) {
    return { nameKey: 'theme.dayOfDead', emoji: '💀', words: getWords('dayOfDead'), isHoliday: true };
  }

  // AUTUMN LEAVES (Nov 15-25) - Japanese only
  if (lang === 'ja') {
    const autumnStart = new Date(year, 10, 14);
    const autumnEnd = new Date(year, 10, 26);
    if (date >= autumnStart && date <= autumnEnd) {
      return { nameKey: 'theme.autumnLeaves', emoji: '🍁', words: getWords('autumnLeaves'), isHoliday: true };
    }
  }

  // THANKSGIVING (dynamic - 4th Thursday of November) - English only
  if (lang === 'en' && isDateInDynamicRange(date, thanksgivingDate, thanksgivingDate)) {
    return { nameKey: 'theme.thanksgiving', emoji: '🦃', words: getWords('thanksgiving'), isHoliday: true };
  }

  // LUCIA (Dec 13) - Swedish only
  if (lang === 'sv' && isNearFixedDate(date, 11, 13)) {
    return { nameKey: 'theme.lucia', emoji: '🕯️', words: getWords('lucia'), isHoliday: true };
  }

  // CHRISTMAS (Dec 25) - All languages
  if (isNearFixedDate(date, 11, 25)) {
    return { nameKey: 'theme.christmas', emoji: '🎄', words: getWords('christmas'), isHoliday: true };
  }

  // ========== Fall back to day of week theme ==========
  const dayOfWeek = date.getDay();
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
 * Get themed words for a specific language and date
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
  // Export for testing
  getEasterDate,
  getThanksgivingDate,
  getMidsummerDate,
  getHebrewHolidayDates
};
