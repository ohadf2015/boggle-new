-- Curriculum word lists v2 (he): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/he-upper.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    '2f47d9af-be0d-5086-94c4-cea7c63fd455', $t$כיתה ז׳ — חום, אור וחשמל$t$,
    $t$מילים מפיזיקה וכימיה לכיתות ז׳-ח׳: חומר, אנרגיה וכוח. לכל מילה הסבר פשוט ומשפט לדוגמה.$t$,
    'he', 'grade_7', 'science', 'LC-HE-G7-ENERGY',
    $j$[
      {"word":"חום","definition":"אנרגיה שעוברת מגוף חם לגוף קר","example":"בקיץ יש הרבה חום, לכן שותים הרבה מים.","level":"support","canIntegrate":true},
      {"word":"אור","definition":"צורת אנרגיה שמאפשרת לנו לראות","example":"בחדר החשוך לא היה אור בכלל.","level":"support","canIntegrate":true},
      {"word":"מים","definition":"נוזל שקוף, בלי צבע וטעם","example":"שתיתי כוס מים קרה אחרי המשחק.","level":"support","canIntegrate":true},
      {"word":"אוויר","definition":"תערובת הגזים שסביבנו ומאפשרת לנשום","example":"בהר, אוויר דליל וקר יותר.","level":"support","canIntegrate":true},
      {"word":"אנרגיה","definition":"היכולת לעשות עבודה או לגרום לשינוי","example":"הסוללה נותנת אנרגיה למכשיר.","level":"core","canIntegrate":true},
      {"word":"חשמל","definition":"זרם של מטענים שמפעיל מכשירים","example":"המנורה נדלקה כי הגיע חשמל לחדר.","level":"core","canIntegrate":true},
      {"word":"כוח","definition":"השפעה שגורמת לגוף לזוז, להאיץ או להשתנות","example":"הדחיפה נתנה לעגלה כוח לזוז קדימה.","level":"core","canIntegrate":true},
      {"word":"תנועה","definition":"שינוי מקום של גוף לאורך הזמן","example":"הרכבת עמדה ואז חזרה, תנועה חדשה.","level":"core","canIntegrate":true},
      {"word":"חמצן","definition":"גז בלתי נראה שאנחנו נושמים","example":"הצמחים מוציאים חמצן לאוויר.","level":"core","canIntegrate":true},
      {"word":"נוזל","definition":"חומר שזורם ומקבל את צורת הכלי שבו הוא נמצא","example":"הדבש הוא נוזל סמיך ומתוק.","level":"core","canIntegrate":true},
      {"word":"מוצק","definition":"חומר בעל צורה קבועה, כמו אבן או עץ","example":"הקרח הוא מוצק, אבל כשהוא נמס הוא נהיה נוזל.","level":"core","canIntegrate":true},
      {"word":"מגנט","definition":"גוף שמושך חומרים מסוימים כמו ברזל","example":"תלינו את התמונה על המקרר עם מגנט קטן.","level":"core","canIntegrate":true},
      {"word":"אטום","definition":"החלק הקטן ביותר של יסוד כימי","example":"בתוך כל חומר יש אטום שמורכב מחלקיקים.","level":"core","canIntegrate":true},
      {"word":"קרינה","definition":"אנרגיה שנפלטת מגוף בצורת גלים או חלקיקים","example":"השמש שולחת קרינה לכדור הארץ.","level":"challenge","canIntegrate":true},
      {"word":"תאוצה","definition":"קצב השינוי במהירות של גוף","example":"תאוצה גבוהה הביאה את המכונית למהירות תוך שניות.","level":"challenge","canIntegrate":true},
      {"word":"מולקולה","definition":"קבוצה של אטומים שקשורים זה לזה","example":"מים הם מולקולה שמורכבת משני מימנים וחמצן.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'c9c8761c-85a8-5104-9409-087e1a6b0e78', $t$כיתה ט׳ — מדינה, חוק ושלטון$t$,
    $t$מילים מאזרחות והיסטוריה על בחירות, חוקים ודרך הנהלת מדינה. לכל מילה הסבר ברור ומשפט לדוגמה.$t$,
    'he', 'grade_9', 'history', 'LC-HE-G9-STATE',
    $j$[
      {"word":"חוק","definition":"כלל שכולם במדינה צריכים לשמור עליו","example":"לפי חוק המדינה אסור לגנוב מחנויות.","level":"support","canIntegrate":true},
      {"word":"אומה","definition":"קבוצה גדולה של אנשים שחולקים שפה, היסטוריה ותרבות","example":"אומה שלמה חגגה בכיכר את יום העצמאות.","level":"support","canIntegrate":true},
      {"word":"מדינה","definition":"ארץ עם שלטון וגבולות משלה","example":"לכל מדינה בעולם יש דגל ושלטון.","level":"support","canIntegrate":true},
      {"word":"אזרח","definition":"אדם ששייך למדינה ויש לו בה זכויות וחובות","example":"כל אזרח זכאי להצביע בבחירות.","level":"support","canIntegrate":true},
      {"word":"דמוקרטיה","definition":"שלטון שבו האנשים בוחרים את מנהיגיהם בבחירות","example":"דמוקרטיה נותנת לאזרחים קול בהחלטות.","level":"core","canIntegrate":true},
      {"word":"רפובליקה","definition":"מדינה שבה מנהיגיה נבחרים ואין בה מלך","example":"הארץ הפכה רפובליקה אחרי שהמלך ויתר על השלטון.","level":"core","canIntegrate":true},
      {"word":"חוקה","definition":"מסמך שמגדיר את דרך השלטון ואת זכויות האזרחים","example":"חוקה מגנה על חופש הביטוי של כולם.","level":"core","canIntegrate":true},
      {"word":"תיקון","definition":"שינוי שמוסיפים לחוקה או לחוק קיים","example":"תיקון נתן לנשים זכות בחירה.","level":"core","canIntegrate":true},
      {"word":"הסכם","definition":"מסמך רשמי שבו שתי מדינות או יותר מתחייבות לכללים משותפים","example":"שתי המדינות חתמו על הסכם שלום.","level":"core","canIntegrate":true},
      {"word":"מושבה","definition":"אזור שנשלט על ידי מדינה זרה","example":"מושבה רצתה לנהל את עצמה אחרי שנים רבות.","level":"core","canIntegrate":true},
      {"word":"מהפכה","definition":"שינוי פתאומי וגדול בשלטון, לעיתים בכוח","example":"מהפכה שינתה את חוקי הארץ לתמיד.","level":"core","canIntegrate":true},
      {"word":"ממשלה","definition":"הגוף שמנהל את המדינה ומקבל החלטות","example":"ממשלה חדשה הציגה תוכנית לחינוך.","level":"core","canIntegrate":true},
      {"word":"מפלגה","definition":"קבוצת אנשים שמתאחדת כדי להשפיע על השלטון","example":"מפלגה חדשה זכתה במספר רב של קולות.","level":"core","canIntegrate":true},
      {"word":"ריבונות","definition":"הזכות של מדינה לשלוט בעצמה","example":"הכרזה על ריבונות מלאה שינתה את הגבולות.","level":"challenge","canIntegrate":true},
      {"word":"אשרור","definition":"אישור רשמי של הסכם או חוקה","example":"הפרלמנט הצביע על אשרור החוקה החדשה.","level":"challenge","canIntegrate":true},
      {"word":"וטו","definition":"הזכות של מנהיג לעצור חוק שעבר","example":"הנשיא החליט להטיל וטו על ההצעה.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '197a545e-a7be-544d-a361-f6a7ee16faa8', $t$כיתה י״א — מילים לאופי ולדיון$t$,
    $t$מילים מדויקות לתיאור אופי, טיעון וחשיבה. לכל מילה הסבר ברור ומשפט שמראה איך משתמשים בה.$t$,
    'he', 'grade_11', 'hebrew', 'LC-HE-G11-CHARACTER',
    $j$[
      {"word":"ישר","definition":"שאומר את האמת ולא מסתיר דבר","example":"הוא ילד ישר ואמין.","level":"support","canIntegrate":true},
      {"word":"זהיר","definition":"שמקפיד להיזהר ולשים לב כדי לא לטעות","example":"הנהג היה זהיר בכל הפניות.","level":"support","canIntegrate":true},
      {"word":"רגוע","definition":"שקט ושלו, ולא נסער גם בלחץ","example":"הים היה רגוע וחלק כל הבוקר.","level":"support","canIntegrate":true},
      {"word":"קצר","definition":"לא ארוך, באורך או בזמן","example":"הנאום היה קצר וברור.","level":"support","canIntegrate":true},
      {"word":"כנה","definition":"שמדבר בגילוי לב ואומר מה שהוא חושב","example":"הביקורת שקיבלתי הייתה כנה ושימושית.","level":"core","canIntegrate":true},
      {"word":"מתמיד","definition":"שממשיך לעשות דבר גם כשקשה","example":"ספורטאי מתמיד התאמן כל יום.","level":"core","canIntegrate":true},
      {"word":"משכנע","definition":"שמצליח לגרום לאחרים להאמין או לעשות דבר","example":"הוא נשמע משכנע מאוד בדיון.","level":"core","canIntegrate":true},
      {"word":"תמציתי","definition":"שאומר הרבה במעט מילים","example":"תקציר טוב הוא תמציתי וברור.","level":"core","canIntegrate":true},
      {"word":"מהוסס","definition":"שלא בטוח אם לעשות דבר ומתלבט","example":"הילד היה מהוסס לפני שקפץ למים.","level":"core","canIntegrate":true},
      {"word":"מדויק","definition":"שמקפיד על כל פרט קטן ואינו טועה","example":"המודד היה מדויק מאוד במדידה.","level":"core","canIntegrate":true},
      {"word":"חרוץ","definition":"שעובד בשקדנות וביעילות","example":"הוא ילד חרוץ וסיים את כל התרגילים.","level":"core","canIntegrate":true},
      {"word":"שקול","definition":"שחושב לפני שהוא מחליט ומאזן בין הדברים","example":"הוא היה שקול ולא קיבל החלטות בפזיזות.","level":"core","canIntegrate":true},
      {"word":"נבון","definition":"חכם ומבין, שיודע לשפוט נכון","example":"הוא אדם נבון ותמיד יודע מה לומר.","level":"core","canIntegrate":true},
      {"word":"נדיב","definition":"שמוכן לתת לאחרים ולעזור להם בשמחה","example":"הקשיש נדיב, חילק אוכל לכל מי שביקש.","level":"challenge","canIntegrate":true},
      {"word":"בהיר","definition":"ברור וקל להבנה","example":"ההסבר של המורה היה בהיר ופשוט.","level":"challenge","canIntegrate":true},
      {"word":"נפוץ","definition":"שנמצא בכל מקום, מוכר וקיים בהרבה מקומות","example":"הטלפון החכם נפוץ מאוד בימינו.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'a0cb4770-442f-5a79-bd40-e15c13297c0f', $t$כיתה י״ב — כסף וכלכלה$t$,
    $t$מילים מכלכלה ומהחיים האמיתיים: מחיר, חיסכון, הלוואה ושוק. לכל מילה הסבר פשוט ומשפט שמראה את השימוש בה.$t$,
    'he', 'grade_12', 'general', 'LC-HE-G12-ECONOMY',
    $j$[
      {"word":"כסף","definition":"מטבעות ושטרות שאנשים משתמשים בהם לקנייה","example":"חסכתי כסף כדי לקנות אופניים חדשים.","level":"support","canIntegrate":true},
      {"word":"מחיר","definition":"הסכום שמשלמים עבור דבר","example":"מחיר הלחם עלה השנה.","level":"support","canIntegrate":true},
      {"word":"עבודה","definition":"פעילות קבועה שאדם עושה כדי להרוויח כסף","example":"אמא שלי מצאה עבודה חדשה בבית חולים.","level":"support","canIntegrate":true},
      {"word":"חיסכון","definition":"כסף ששומרים בצד לשימוש בעתיד","example":"חיסכון שלנו יממן את הטיול בקיץ הבא.","level":"support","canIntegrate":true},
      {"word":"תקציב","definition":"תוכנית לגבי כמה כסף מוציאים וכמה חוסכים","example":"הכנו תקציב קבוע לקניות בכל חודש.","level":"core","canIntegrate":true},
      {"word":"רווח","definition":"הכסף שעסק נשאר בידיו אחרי שהחזיר את ההוצאות","example":"החנות הרוויחה רווח נאה השנה.","level":"core","canIntegrate":true},
      {"word":"חוב","definition":"סכום כסף שאדם חייב למישהו","example":"הוא סוף סוף סילק חוב לבנק.","level":"core","canIntegrate":true},
      {"word":"שכר","definition":"כסף ששולמים לעובד עבור עבודתו","example":"שכר חדש עוזר למשפחות לשלם שכירות.","level":"core","canIntegrate":true},
      {"word":"שוק","definition":"מקום או מערכת שבה קונים ומוכרים סחורות","example":"שוק העיר היה מלא אנשים ביום שישי.","level":"core","canIntegrate":true},
      {"word":"היצע","definition":"כמות המוצר שזמינה למכירה","example":"כאשר היצע של תירס קטן, המחירים עולים.","level":"core","canIntegrate":true},
      {"word":"ביקוש","definition":"כמה אנשים רוצים לקנות מוצר מסוים","example":"ביקוש גבוה למשחק מכר את כל המלאי.","level":"core","canIntegrate":true},
      {"word":"השקעה","definition":"הכנסת כסף לדבר כדי להרוויח בעתיד","example":"היא החליטה לעשות השקעה בחברה קטנה.","level":"core","canIntegrate":true},
      {"word":"ריבית","definition":"כסף נוסף שמשלמים על הלוואה או מקבלים על חיסכון","example":"הבנק שילם ריבית על החיסכון שלי.","level":"core","canIntegrate":true},
      {"word":"אינפלציה","definition":"עלייה כללית ומתמשכת במחירים","example":"אינפלציה גבוהה גורמת לכסף לקנות פחות.","level":"challenge","canIntegrate":true},
      {"word":"מכס","definition":"מס על מוצרים שמביאים ממדינה אחרת","example":"הממשלה הטילה מכס על ברזל מיובא.","level":"challenge","canIntegrate":true},
      {"word":"גירעון","definition":"מצב שההוצאות גדולות מההכנסות","example":"המדינה סבלה גירעון גדול אחרי המלחמה.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  language = EXCLUDED.language,
  grade_level = EXCLUDED.grade_level,
  subject = EXCLUDED.subject,
  curriculum_standard = EXCLUDED.curriculum_standard,
  words = EXCLUDED.words,
  is_active = TRUE;
