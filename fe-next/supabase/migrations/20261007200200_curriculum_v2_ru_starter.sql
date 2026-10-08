-- Curriculum word lists v2 (ru): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/ru-starter.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    'bf9e5ebe-ebb1-59cc-8a27-7d90755c9ced', $t$2 класс — Первые слова$t$,
    $t$Слова из дома, школы и природы для первоклассников и второклассников. Каждое слово с простым объяснением и предложением для чтения вслух.$t$,
    'ru', 'grade_2', 'general', 'LC-RU-G2-FIRST',
    $j$[
      {"word":"дом","definition":"Здание, в котором живут люди","example":"Наш дом стоит у самой реки.","level":"support","canIntegrate":true},
      {"word":"семья","definition":"Люди, которые живут вместе и заботятся друг о друге","example":"Вечером вся семья собирается за столом.","level":"challenge","canIntegrate":true},
      {"word":"школа","definition":"Здание, где дети учатся и играют на перемене","example":"Школа находится рядом с нашим домом.","level":"core","canIntegrate":true},
      {"word":"книга","definition":"Много листов с текстом и картинками, которые читают","example":"Новая книга лежит на столе.","level":"core","canIntegrate":true},
      {"word":"собака","definition":"Домашнее животное, которое лает и любит гулять","example":"Соседская собака громко лает у калитки.","level":"support","canIntegrate":true},
      {"word":"кошка","definition":"Домашнее животное, которое мурлычет и ловит мышей","example":"Наша кошка спит на подоконнике.","level":"support","canIntegrate":true},
      {"word":"молоко","definition":"Белый напиток, который дают коровы","example":"Молоко стоит в холодильнике.","level":"core","canIntegrate":true},
      {"word":"хлеб","definition":"Продукт из муки, который пекут в печи","example":"Мама купила свежий хлеб в булочной.","level":"core","canIntegrate":true},
      {"word":"солнце","definition":"Яркая звезда, которая светит и греет днём","example":"Сегодня солнце греет очень сильно.","level":"core","canIntegrate":true},
      {"word":"дерево","definition":"Большое растение с стволом и ветками","example":"Во дворе растёт высокое дерево.","level":"core","canIntegrate":true},
      {"word":"ручка","definition":"Предмет, которым пишут чернилами или пастой","example":"Моя ручка синяя, а не красная.","level":"core","canIntegrate":true},
      {"word":"мяч","definition":"Круглая игрушка, которой играют и бросают","example":"Мяч покатился под стол.","level":"support","canIntegrate":true},
      {"word":"окно","definition":"Проём в стене, через который видно улицу","example":"Я смотрю в окно на дождь.","level":"core","canIntegrate":true},
      {"word":"вода","definition":"Прозрачная жидкость, которую мы пьём","example":"Вода в реке очень холодная.","level":"core","canIntegrate":true},
      {"word":"друг","definition":"Человек, с которым приятно играть и дружить","example":"Мой лучший друг живёт в соседнем доме.","level":"challenge","canIntegrate":true},
      {"word":"сад","definition":"Место, где растут цветы, деревья и овощи","example":"Наш сад полон цветов.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '436b4a71-9cc5-5ebb-9dc2-bddcf09e319f', $t$4 класс — Природа вокруг$t$,
    $t$Лес, вода, погода и животные: слова из природоведения для четвероклассников.$t$,
    'ru', 'grade_4', 'science', 'LC-RU-G4-NATURE',
    $j$[
      {"word":"лес","definition":"Большой участок земли, где растёт много деревьев","example":"Лес у реки очень густой и тихий.","level":"support","canIntegrate":true},
      {"word":"река","definition":"Текущая вода, которая впадает в море или озеро","example":"Река течёт через весь город.","level":"core","canIntegrate":true},
      {"word":"гора","definition":"Очень высокая часть земли с крутыми склонами","example":"Зимой гора у дороги покрыта снегом.","level":"core","canIntegrate":true},
      {"word":"облако","definition":"Скопление капель воды или льда в небе","example":"Белое облако медленно плывёт над полем.","level":"core","canIntegrate":true},
      {"word":"дождь","definition":"Вода, которая падает с неба каплями","example":"Дождь шёл весь день.","level":"support","canIntegrate":true},
      {"word":"снег","definition":"Белые кристаллы льда, которые падают зимой","example":"Утром снег лежал на крыше.","level":"support","canIntegrate":true},
      {"word":"птица","definition":"Животное с перьями и крыльями, которое умеет летать","example":"Во дворе ходила птица с яркими перьями.","level":"core","canIntegrate":true},
      {"word":"рыба","definition":"Животное, которое живёт в воде и дышит жабрами","example":"В озере плавала большая рыба.","level":"core","canIntegrate":true},
      {"word":"цветок","definition":"Часть растения, которая бывает яркой и пахнет","example":"В саду распустился первый цветок.","level":"core","canIntegrate":true},
      {"word":"ветер","definition":"Движение воздуха, которое мы чувствуем кожей","example":"Сильный ветер сдул мою шапку.","level":"challenge","canIntegrate":true},
      {"word":"озеро","definition":"Водоём, окружённый со всех сторон сушей","example":"Озеро зимой покрывается льдом.","level":"core","canIntegrate":true},
      {"word":"поле","definition":"Открытый участок земли, где выращивают злаки","example":"Поле пшеницы колышется на ветру.","level":"core","canIntegrate":true},
      {"word":"туман","definition":"Облако у самой земли, из-за которого плохо видно","example":"Утром над рекой висел густой туман.","level":"challenge","canIntegrate":true},
      {"word":"радуга","definition":"Разноцветная дуга в небе после дождя","example":"После дождя над полем появилась радуга.","level":"challenge","canIntegrate":true},
      {"word":"корень","definition":"Подземная часть растения, из которой оно пьёт воду","example":"Корень моркови растёт под землёй.","level":"support","canIntegrate":true},
      {"word":"гром","definition":"Раскатистый звук, который слышно после молнии","example":"Гром прогремел над самой крышей.","level":"core","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'cba78c53-2d70-5b16-9724-f94d3be58a98', $t$6 класс — Тело и здоровье$t$,
    $t$Органы, системы и привычки здоровья: словарь для шестиклассников по биологии.$t$,
    'ru', 'grade_6', 'science', 'LC-RU-G6-BODY',
    $j$[
      {"word":"сердце","definition":"Орган, который гонит кровь по всему телу","example":"Сердце стучит быстрее, когда мы бегаем.","level":"core","canIntegrate":true},
      {"word":"кость","definition":"Твёрдая часть скелета, из которой состоит каркас тела","example":"Ребёнок упал и сломал кость руки.","level":"support","canIntegrate":true},
      {"word":"мышца","definition":"Ткань, которая сокращается и помогает телу двигаться","example":"От долгой прогулки устала мышца ноги.","level":"core","canIntegrate":true},
      {"word":"кровь","definition":"Красная жидкость, которая переносит кислород и питательные вещества","example":"Кровь течёт по сосудам без остановки.","level":"core","canIntegrate":true},
      {"word":"кожа","definition":"Внешний слой тела, который защищает от внешней среды","example":"Кожа на коленке покрылась ссадиной.","level":"support","canIntegrate":true},
      {"word":"мозг","definition":"Главный орган нервной системы, который управляет телом и мыслями","example":"Мозг помогает нам думать и запоминать.","level":"challenge","canIntegrate":true},
      {"word":"желудок","definition":"Орган, в котором переваривается пища","example":"После обеда желудок работает около часа.","level":"core","canIntegrate":true},
      {"word":"зрение","definition":"Способность видеть окружающий мир глазами","example":"Хорошее зрение помогает читать мелкий шрифт.","level":"challenge","canIntegrate":true},
      {"word":"слух","definition":"Способность воспринимать звуки ушами","example":"Слух помогает нам слышать музыку.","level":"core","canIntegrate":true},
      {"word":"дыхание","definition":"Вдох и выдох, с помощью которых в тело поступает кислород","example":"Дыхание становится быстрее после бега.","level":"core","canIntegrate":true},
      {"word":"пульс","definition":"Количество ударов сердца за одну минуту","example":"Мой пульс замедлился после отдыха.","level":"support","canIntegrate":true},
      {"word":"организм","definition":"Живое существо или целое тело как единая система","example":"Каждый организм состоит из клеток.","level":"challenge","canIntegrate":true},
      {"word":"питание","definition":"Процесс, при котором организм получает пищу и вещества","example":"Здоровое питание нужно каждому человеку.","level":"core","canIntegrate":true},
      {"word":"скелет","definition":"Совокупность костей, которая держит тело","example":"Скелет человека состоит из множества костей.","level":"core","canIntegrate":true},
      {"word":"клетка","definition":"Самая маленькая единица живого","example":"Каждая клетка тела живёт своей жизнью.","level":"challenge","canIntegrate":true},
      {"word":"витамин","definition":"Вещество, которое нужно организму в небольших количествах","example":"Витамин C есть в апельсинах.","level":"support","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'd1f8a7b9-b224-53ea-bfd6-34026724daf1', $t$8 класс — История и общество$t$,
    $t$Государство, торговля и повседневная жизнь прошлых веков: слова для восьмиклассников.$t$,
    'ru', 'grade_8', 'history', 'LC-RU-G8-HISTORY',
    $j$[
      {"word":"царь","definition":"Правитель, который управлял страной, часто по наследству","example":"Царь издал новый указ о налогах.","level":"support","canIntegrate":true},
      {"word":"война","definition":"Вооружённая борьба между государствами или народами","example":"Война длилась много лет.","level":"core","canIntegrate":true},
      {"word":"торговля","definition":"Обмен товарами и деньгами между людьми и странами","example":"Торговля по реке приносила городу богатство.","level":"support","canIntegrate":true},
      {"word":"крестьянин","definition":"Человек, который работает на земле и выращивает хлеб","example":"Крестьянин вспахал поле до самого вечера.","level":"core","canIntegrate":true},
      {"word":"закон","definition":"Правило, которое обязательно для всех и принято государством","example":"Новый закон защищает права ремесленников.","level":"challenge","canIntegrate":true},
      {"word":"налог","definition":"Деньги, которые граждане платят государству","example":"Налог собирали два раза в год.","level":"core","canIntegrate":true},
      {"word":"армия","definition":"Вооружённые силы государства","example":"Армия защищала границы страны.","level":"core","canIntegrate":true},
      {"word":"ремесло","definition":"Работа мастера, который делает вещи вручную","example":"Ремесло кузнеца ценилось высоко.","level":"core","canIntegrate":true},
      {"word":"столица","definition":"Главный город государства, где находится правительство","example":"Столица переехала в новый город.","level":"core","canIntegrate":true},
      {"word":"граница","definition":"Линия, которая отделяет одно государство от другого","example":"Граница проходила по реке.","level":"challenge","canIntegrate":true},
      {"word":"государство","definition":"Организованное общество с властью и территорией","example":"Государство собирало налоги с крестьян.","level":"support","canIntegrate":true},
      {"word":"монастырь","definition":"Жилище монахов, где они молятся и трудятся","example":"Монастырь стоял на холме над рекой.","level":"core","canIntegrate":true},
      {"word":"летопись","definition":"Старинная запись о событиях прошлого","example":"Летопись описывает поход князя.","level":"challenge","canIntegrate":true},
      {"word":"князь","definition":"Правитель отдельного княжества на Руси","example":"Князь пригласил купцов в свой город.","level":"core","canIntegrate":true},
      {"word":"пошлина","definition":"Плата за ввоз и вывоз товаров через границу","example":"Пошлина на соль была высокой.","level":"challenge","canIntegrate":true},
      {"word":"рынок","definition":"Место, где продают и покупают товары","example":"Рынок в городе работает каждое утро.","level":"core","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '4e9173f8-940b-5b24-b345-8cfa29ba0dac', $t$10 класс — Экология и климат$t$,
    $t$Климат, природа и ресурсы: слова для десятиклассников о том, как человек влияет на планету.$t$,
    'ru', 'grade_10', 'geography', 'LC-RU-G10-ECOLOGY',
    $j$[
      {"word":"климат","definition":"Погода конкретного места, наблюдаемая за многие годы","example":"Климат на севере холоднее, чем на юге.","level":"core","canIntegrate":true},
      {"word":"загрязнение","definition":"Попадание вредных веществ в воздух, воду или почву","example":"Загрязнение реки стало заметным летом.","level":"core","canIntegrate":true},
      {"word":"экосистема","definition":"Сообщество живых организмов и среды, в которой они живут","example":"Лес — это сложная экосистема.","level":"challenge","canIntegrate":true},
      {"word":"переработка","definition":"Превращение отходов в новые материалы","example":"Переработка бумаги спасает леса.","level":"core","canIntegrate":true},
      {"word":"отходы","definition":"Всё, что остаётся после использования и выбрасывается","example":"Отходы нужно разделять по контейнерам.","level":"support","canIntegrate":true},
      {"word":"ресурс","definition":"Природное богатство, которое использует человек","example":"Вода — важный природный ресурс.","level":"core","canIntegrate":true},
      {"word":"энергия","definition":"Способность совершать работу, например давать тепло или свет","example":"Энергия ветра чистая и не загрязняет воздух.","level":"support","canIntegrate":true},
      {"word":"засуха","definition":"Долгое отсутствие дождей, из-за которого земля сохнет","example":"Засуха погубила урожай пшеницы.","level":"challenge","canIntegrate":true},
      {"word":"наводнение","definition":"Затопление суши водой, которая вышла из берегов","example":"Наводнение залило улицы города.","level":"core","canIntegrate":true},
      {"word":"заповедник","definition":"Территория, где природа охраняется государством","example":"Заповедник охраняет редких птиц.","level":"core","canIntegrate":true},
      {"word":"биосфера","definition":"Часть Земли, где существует жизнь","example":"Биосфера включает океаны и леса.","level":"challenge","canIntegrate":true},
      {"word":"плотина","definition":"Стена, которая перегораживает реку","example":"Плотина перегородила реку.","level":"core","canIntegrate":true},
      {"word":"ледник","definition":"Огромная масса льда, которая медленно движется по суше","example":"Ледник в горах тает каждое лето.","level":"core","canIntegrate":true},
      {"word":"вырубка","definition":"Уничтожение леса, когда деревья срубают","example":"Вырубка леса меняет климат района.","level":"core","canIntegrate":true},
      {"word":"охрана","definition":"Защита природы или людей от вреда","example":"Охрана природы — дело каждого.","level":"support","canIntegrate":true},
      {"word":"устойчивость","definition":"Способность системы сохранять себя, не разрушаясь","example":"Устойчивость экосистемы зависит от разнообразия.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '8885a2e3-a5b4-5976-b5e0-745bd7f6aaf3', $t$12 класс — Общество и мысль$t$,
    $t$Свобода, совесть и право: понятия обществознания и философии для выпускников.$t$,
    'ru', 'grade_12', 'general', 'LC-RU-G12-SOCIETY',
    $j$[
      {"word":"свобода","definition":"Возможность самому выбирать свои действия и взгляды","example":"Свобода слова важна в любом обществе.","level":"support","canIntegrate":true},
      {"word":"совесть","definition":"Внутреннее чувство того, что правильно, а что нет","example":"Совесть не позволила ему солгать.","level":"core","canIntegrate":true},
      {"word":"истина","definition":"То, что соответствует действительности","example":"Для учёного важна истина.","level":"core","canIntegrate":true},
      {"word":"мораль","definition":"Нормы поведения, которые считаются правильными в обществе","example":"Мораль басни учит честности.","level":"support","canIntegrate":true},
      {"word":"логика","definition":"Наука о правильном мышлении и выводах","example":"Логика учит правильно делать выводы.","level":"challenge","canIntegrate":true},
      {"word":"аргумент","definition":"Довод, который подтверждает мысль","example":"Сильный аргумент опирается на факты.","level":"core","canIntegrate":true},
      {"word":"критика","definition":"Разбор и оценка чего-либо с указанием достоинств и недостатков","example":"Критика статьи была честной и полезной.","level":"core","canIntegrate":true},
      {"word":"идеал","definition":"Образец совершенства, к которому стремятся","example":"Для неё идеал — честный и добрый человек.","level":"challenge","canIntegrate":true},
      {"word":"культура","definition":"Совокупность знаний, обычаев, искусства и традиций народа","example":"Культура города — это театры и музеи.","level":"core","canIntegrate":true},
      {"word":"честность","definition":"Качество человека, который говорит правду и держит слово","example":"Честность важна в любой дружбе.","level":"support","canIntegrate":true},
      {"word":"традиция","definition":"Обычай, который передаётся из поколения в поколение","example":"Семейная традиция — печь пироги на Новый год.","level":"core","canIntegrate":true},
      {"word":"смысл","definition":"Главное значение чего-либо, то, ради чего оно существует","example":"В этой истории есть глубокий смысл.","level":"challenge","canIntegrate":true},
      {"word":"личность","definition":"Человек как отдельная индивидуальность со своими чертами","example":"Каждая личность уникальна.","level":"core","canIntegrate":true},
      {"word":"общество","definition":"Большая группа людей, связанных общими законами и культурой","example":"Общество меняется вместе с новыми технологиями.","level":"core","canIntegrate":true},
      {"word":"гражданин","definition":"Человек, который состоит в государстве и имеет права и обязанности","example":"Каждый гражданин может голосовать на выборах.","level":"core","canIntegrate":true},
      {"word":"демократия","definition":"Власть народа, при которой граждане выбирают своих представителей","example":"Демократия даёт гражданам право выбора.","level":"core","canIntegrate":true}
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
