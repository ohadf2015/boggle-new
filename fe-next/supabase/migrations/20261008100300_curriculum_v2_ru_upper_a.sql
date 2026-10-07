-- Curriculum word lists v2 (ru): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/ru-upper-a.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    'ff1b9bd5-97cd-5787-be12-d57eb5c940f8', $t$1 класс — Вещи в школе$t$,
    $t$Слова из класса и школьного двора для первоклассников. Каждое слово с простым объяснением и предложением, которое можно прочитать вслух.$t$,
    'ru', 'grade_1', 'general', 'LC-RU-G1-SCHOOL',
    $j$[
      {"word":"карандаш","definition":"Тонкая палочка с грифелем, которой пишут и рисуют","example":"Я заточил карандаш перед диктантом.","level":"support","canIntegrate":true},
      {"word":"парта","definition":"Стол, за которым сидят ученики в классе","example":"Парта у окна самая светлая.","level":"support","canIntegrate":true},
      {"word":"тетрадь","definition":"Сшитые листы бумаги для письма и записей","example":"Запиши домашнее задание в тетрадь.","level":"support","canIntegrate":true},
      {"word":"друг","definition":"Человек, которому доверяешь и с которым весело","example":"Мой друг сидит рядом со мной на обеде.","level":"support","canIntegrate":true},
      {"word":"линейка","definition":"Прямая пластина для измерения длины и проведения линий","example":"Линейка помогла провести прямую линию.","level":"core","canIntegrate":true},
      {"word":"ластик","definition":"Кусочек резины, которым стирают карандаш","example":"Если ошибся, возьми ластик.","level":"core","canIntegrate":true},
      {"word":"рюкзак","definition":"Сумка, которую носят за спиной, чтобы нести вещи","example":"Мой рюкзак тяжёлый от учебников.","level":"core","canIntegrate":true},
      {"word":"урок","definition":"Занятие в школе, на котором учитель объясняет новый материал","example":"Сегодня урок был интересным, мы читали сказку.","level":"core","canIntegrate":true},
      {"word":"перемена","definition":"Короткий перерыв между уроками, когда можно отдохнуть","example":"Перемена была короткой, и мы играли во дворе.","level":"core","canIntegrate":true},
      {"word":"доска","definition":"Большая гладкая поверхность в классе, на которой пишут мелом","example":"Доска была чистой перед уроком.","level":"core","canIntegrate":true},
      {"word":"мел","definition":"Мягкая белая палочка для письма на доске","example":"Мел оставил белые следы на руках.","level":"core","canIntegrate":true},
      {"word":"ножницы","definition":"Инструмент с двумя лезвиями для резки бумаги","example":"Возьми ножницы и вырежи фигуру.","level":"core","canIntegrate":true},
      {"word":"клей","definition":"Липкое вещество, которым склеивают бумагу","example":"Дай мне клей, пожалуйста.","level":"core","canIntegrate":true},
      {"word":"пенал","definition":"Коробочка для ручек и карандашей","example":"Пенал лежит в рюкзаке.","level":"challenge","canIntegrate":true},
      {"word":"библиотека","definition":"Место, где много книг, которые можно взять почитать","example":"Библиотека открыта до шести часов.","level":"challenge","canIntegrate":true},
      {"word":"портфель","definition":"Школьная сумка с ручкой, в которой носят учебники","example":"Портфель стоит у двери.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '41e86f7a-5a4d-5562-9cf2-3784a0691a70', $t$3 класс — Природа вокруг нас$t$,
    $t$Слова о растениях, животных и погоде, которые видно за окном. Каждое слово с понятным объяснением и примером из жизни.$t$,
    'ru', 'grade_3', 'science', 'LC-RU-G3-NATURE',
    $j$[
      {"word":"дерево","definition":"Большое растение со стволом и ветками","example":"Во дворе растёт высокое дерево.","level":"support","canIntegrate":true},
      {"word":"цветок","definition":"Растение с яркими лепестками","example":"Пчела села на красивый цветок.","level":"support","canIntegrate":true},
      {"word":"птица","definition":"Животное с перьями, которое умеет летать","example":"Птица пела на верхушке дерева.","level":"support","canIntegrate":true},
      {"word":"вода","definition":"Прозрачная жидкость без цвета и запаха, нужная всем живым существам","example":"Вода в реке была холодной.","level":"support","canIntegrate":true},
      {"word":"животное","definition":"Живой организм, который двигается и ест","example":"Кошка — домашнее животное.","level":"core","canIntegrate":true},
      {"word":"растение","definition":"Живое существо, которое растёт на месте и тянется к свету","example":"Растение тянется к солнцу.","level":"core","canIntegrate":true},
      {"word":"облако","definition":"Белое или серое скопление капель в небе","example":"Над нами плыло большое облако.","level":"core","canIntegrate":true},
      {"word":"дождь","definition":"Капли воды, которые падают с неба","example":"Сегодня идёт сильный дождь.","level":"core","canIntegrate":true},
      {"word":"ветер","definition":"Движение воздуха по земле","example":"Сильный ветер сдул мою шапку.","level":"core","canIntegrate":true},
      {"word":"корень","definition":"Нижняя часть растения, которая тянет воду из земли","example":"Корень дерева уходит глубоко в землю.","level":"core","canIntegrate":true},
      {"word":"семя","definition":"Часть растения, из которой вырастает новое растение","example":"Семя проросло и стало большим подсолнухом.","level":"core","canIntegrate":true},
      {"word":"гриб","definition":"Живой организм, который растёт в лесу и не имеет листьев","example":"В лесу мы нашли красивый гриб.","level":"core","canIntegrate":true},
      {"word":"трава","definition":"Низкие зелёные растения, которые растут на земле","example":"Трава в парке зелёная и мокрая.","level":"core","canIntegrate":true},
      {"word":"почва","definition":"Верхний слой земли, в котором растут растения","example":"Почва после дождя стала влажной.","level":"challenge","canIntegrate":true},
      {"word":"испарение","definition":"Переход воды из жидкого состояния в пар","example":"Испарение воды делает воздух влажным.","level":"challenge","canIntegrate":true},
      {"word":"пыльца","definition":"Мелкие частицы, которые переносят пчёлы между цветами","example":"Пыльца прилипла к лапкам пчелы.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '812d0bb5-cd01-525f-9f40-06ebec08e1e1', $t$5 класс — Земля и карта$t$,
    $t$Слова из географии: формы суши, воды и климата, которые помогают читать карту. Каждое слово с простым объяснением и примером.$t$,
    'ru', 'grade_5', 'geography', 'LC-RU-G5-GEOGRAPHY',
    $j$[
      {"word":"карта","definition":"Рисунок, который показывает местность сверху","example":"Карта показывает, где находится наш город.","level":"support","canIntegrate":true},
      {"word":"гора","definition":"Очень высокий участок земли с крутыми склонами","example":"Гора покрыта снегом круглый год.","level":"support","canIntegrate":true},
      {"word":"река","definition":"Поток воды, который течёт к морю или озеру","example":"Река протекает через весь город.","level":"support","canIntegrate":true},
      {"word":"море","definition":"Большой водоём с солёной водой","example":"Летом мы поехали на море.","level":"support","canIntegrate":true},
      {"word":"материк","definition":"Большой участок суши, окружённый водой","example":"Африка — это материк.","level":"core","canIntegrate":true},
      {"word":"океан","definition":"Огромный водоём, который покрывает большую часть Земли","example":"Тихий океан самый большой на Земле.","level":"core","canIntegrate":true},
      {"word":"остров","definition":"Участок суши, со всех сторон окружённый водой","example":"Остров был маленьким и зелёным.","level":"core","canIntegrate":true},
      {"word":"пустыня","definition":"Очень сухое место с песком и малым количеством дождей","example":"Пустыня жаркая и сухая.","level":"core","canIntegrate":true},
      {"word":"равнина","definition":"Ровная местность, почти без холмов и гор","example":"Вдали простиралась широкая равнина.","level":"core","canIntegrate":true},
      {"word":"климат","definition":"Погода, которая обычно бывает в одном месте много лет","example":"Климат на севере холоднее, чем на юге.","level":"core","canIntegrate":true},
      {"word":"компас","definition":"Прибор со стрелкой, которая показывает на север","example":"Компас помог нам найти дорогу.","level":"core","canIntegrate":true},
      {"word":"долина","definition":"Низина между горами или холмами","example":"Долина зелёная, и деревня стоит у реки.","level":"core","canIntegrate":true},
      {"word":"широта","definition":"Расстояние от экватора до точки на Земле, в градусах","example":"Широта Москвы довольно большая.","level":"core","canIntegrate":true},
      {"word":"экватор","definition":"Воображаемая линия, которая делит Землю на два полушария","example":"Экватор проходит через самую жаркую часть Земли.","level":"challenge","canIntegrate":true},
      {"word":"меридиан","definition":"Воображаемая линия от полюса до полюса","example":"Нулевой меридиан проходит через Гринвич.","level":"challenge","canIntegrate":true},
      {"word":"полуостров","definition":"Участок суши, который почти полностью окружён водой","example":"Крым — полуостров на Чёрном море.","level":"challenge","canIntegrate":true}
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
