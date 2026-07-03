// Article content — "Ohad Fisher" persona
// English-only at launch; other locales fall back to EN and are noindex via hasTranslation gate

export type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  sections: Array<{
    title?: string;
    content: string;
  }>;
  backToBlog: string;
  playDaily: string;
  startPracticing: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: 'Free Word Games Online: The Honest Guide (No Pay-to-Win)',
    subtitle: 'A field guide to word games that respect your time, your wallet, and your attention span. Updated for 2026.',
    category: 'Guide',
    readTime: '11 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Has installed and uninstalled more "free" word game apps than he\'d like to admit. Now writes about which ones actually deserve your taps.',
    sections: [
      {
        content: `Here is the dirty secret of "free" word games on the internet: most of them are not free. They are demos. You play three rounds, the app politely informs you that you need to wait six hours for your "energy" to refill, and a banner offers to sell you a refill for $4.99. That is not a game. That is a slot machine wearing a dictionary costume.

I have spent the last five years installing, playing, uninstalling, and quietly hating about forty different word games on my phone. Some of them are genuinely free. Some of them are free the way a timeshare presentation is free. This is my attempt to tell you the difference, in plain language, with no affiliate links and no "top 10" filler.

If you want to skip ahead: the things that matter are no energy systems, no paywalls on words, and a daily mode you can finish in five minutes. Everything else is taste.`,
      },
      {
        title: 'What "Free" Should Actually Mean',
        content: `A free word game should have three properties, and almost none of them do.

First, you should be able to play as much as you want. Energy systems — the ones that limit you to five rounds and then make you wait — were invented by Candy Crush and have since infected the entire mobile gaming ecosystem. They do not exist because they make games better. They exist because they make people pay. A word game with an energy system is a word game that does not trust you to enjoy it on your own terms.

Second, no part of the actual word game should be paywalled. This sounds obvious, and it is the rule that gets broken most often. "Word Radar" that shows you the best move? Paywalled. Tile swaps that let you ditch a bad rack? Paywalled. Extra time on the clock? Paywalled. These features do not enhance the game; they sell you a shortcut around the game. If the developers thought their actual gameplay was good, they would not need to sell you ways to skip it.

Third, ads should be optional or unobtrusive. A single banner at the bottom of the screen is fine. A 30-second unskippable video before every match is not. The honest model is: show me an ad when I open the app, run a small banner while I play, and offer me a one-time payment to remove both. The dishonest model is: show me an ad every time I do anything, and also sell me power-ups.

You can apply these three tests to any word game in about ninety seconds. Most will fail at least one.`,
      },
      {
        title: 'The Daily Puzzle: Five Minutes That Stick',
        content: `The single most successful design pattern in modern word games is the daily puzzle. One puzzle. Once a day. Same puzzle for everyone. It is over in five minutes.

Wordle did not invent this format, but Wordle proved it could be massive. Josh Wardle's original version, before The New York Times bought it, had no ads, no app, no account. You went to a webpage, you played the puzzle, you shared a grid of colored squares with your friends, and you came back tomorrow. The genius was the constraint. You could not binge it. You could not buy your way to a better score. You played the same puzzle as your sister and your boss and a stranger in Helsinki, and that shared experience is what made the colored-square share image go viral.

The daily format works because it respects two things modern apps do not: your time and your attention. You finish in one sitting. You do not get pulled back in. You feel a small accomplishment and you go on with your day. Then tomorrow there is a new one waiting, but only one. The scarcity is the feature.

LexiClash's Word of the Day works on this principle, in five languages including Hebrew with proper right-to-left support. The Hebrew version was the part that took the longest, because the daily puzzle format had no good Hebrew implementation before 2024 — most "Wordle in Hebrew" clones treated the script as an afterthought. We had to think about it from the start. If you read Hebrew, you will notice.`,
      },
      {
        title: 'Real-Time Multiplayer: Humans, Not Bots',
        content: `Most word games marketed as "multiplayer" are actually solo games with a bot playing the other side. The bot has a name like "AlexW87" and makes plausible mistakes and occasionally messages you to say "good game." Then you find out it took your turn at 3am while you were asleep and you realize, slowly, that AlexW87 is not real.

Real-time multiplayer is different. You and another human, both online right now, both staring at the same grid, both racing the same clock. The game ends when the timer hits zero, not when one of you remembers to open the app three days later. The stakes are immediate. The trash talk is immediate. The schadenfreude when you find a seven-letter word they missed is immediate.

This format is harder to build. You need actual servers maintaining state, you need anti-cheat that catches dictionary lookups, you need matchmaking that does not pair beginners against experts. It is also harder to monetize because there are no asynchronous moments to interrupt with ads. So most "multiplayer" games quietly skip it and use bots instead.

If you want to know whether a game's multiplayer is real, look at two things: how fast you get matched, and whether the opponent ever pauses mid-game in a human-like way. Real opponents have weird hesitations. Bots play at suspiciously consistent speeds.`,
      },
      {
        title: 'Word Hunt Modes: Targets Beat Free-for-All',
        content: `Classic Boggle has a problem, which is that staring at a random grid for three minutes is much harder than it sounds. Your brain freezes. You see the same six letters over and over. You write down THE and AND and THAT and feel like an idiot. This is a real failure mode that most word games do not solve.

The fix is target words. Instead of "find every word," the game shows you a small set of specific words to hunt — six-letter words, words starting with a particular letter, words on a theme. Your brain has a goal. It is no longer scanning randomly; it is searching. The cognitive load drops dramatically and the game gets much more fun.

LexiClash Daily Survival escalates this across days, so Day 1 might give you forgiving six-letter targets and Day 30 will hand you eight-letter words with rare letters. The progression matters because it keeps the game from feeling the same every day. The escalation is the loop.

I bring this up because the difference between "find words" and "find these specific words" is the difference between a frustrating game and a satisfying one, and most reviews never mention it. If you are bouncing off classic Boggle-style grids, try a word hunt mode before you decide word games are not for you.`,
      },
      {
        title: 'Family and Classroom Play: The TV Mode Test',
        content: `One thing free word games almost never advertise is whether they work on a TV. This sounds niche until you have tried to play a phone game with your family at Thanksgiving. Everyone leaning over one phone is awful. Passing the phone around is awful. You need a shared screen.

The test is whether the game has any kind of party mode, host mode, or TV view. LexiClash has a party-game architecture where one screen hosts the game and players join from their phones, similar to how Jackbox Party Pack works. This is rare in word games specifically — most word game developers think of the phone as the entire universe.

The same architecture works for classrooms. A teacher displays the game on the smart board, students play on their own devices, and the leaderboard updates in real time. This is the model that actually works for the "educational game" pitch, as opposed to the model where you make the game a worksheet and pretend that is fun.

If you have a family or a classroom you want to play with, ask whether the game has a shared-screen mode. The answer is usually no. When the answer is yes, the game tends to be better for everyone, because the developers had to think about more than a single user.`,
      },
      {
        title: 'Mobile Without the App Store',
        content: `Here is something that nobody tells you: you do not need to install an app to play a word game on your phone. Modern web games run in your phone's browser, install themselves to your home screen if you want, and work offline once they have loaded. This is called a Progressive Web App, or PWA, and it solves a problem the app store has created.

The problem is friction. To install a normal app, you have to go to the app store, search, read reviews, hit install, wait for the download, accept permissions, and find the app in your launcher. Maybe 70% of people drop off at some point in this funnel. With a PWA, you just open a link. The game loads in your browser. If you like it, you tap "Add to Home Screen" and it acts like a regular app from then on. If you do not, you close the tab and forget it ever existed.

PWAs also dodge the worst part of the app store: the "free download, $9.99/month subscription you forgot you signed up for" pattern. Browser games have to convince you to come back. They cannot bury a subscription in a settings menu.

LexiClash runs as a PWA. Most browser-based word games do. If you find yourself reading a review for a word game and feeling that nag about installing yet another app, check whether there is a web version first. There almost always is.`,
      },
      {
        title: 'The Red-Flag Checklist',
        content: `Run any free word game through this list before you commit to it. You will save yourself hours.

First, does it have an energy system? Look for any phrase like "lives," "stars," "hearts," or "wait to play more." If yes, walk away.

Second, does it let you buy power-ups that affect gameplay? Tile swaps, hint reveals, extra time, score multipliers. If you can pay money to play better, the game is selling you the win, not the experience.

Third, how often does it interrupt you with ads? One ad on launch and a banner during play is fine. Ads between every round, especially video ads, mean the game's business model is your attention rather than your enjoyment.

Fourth, does it have a daily mode? A daily puzzle is a signal that the developers trust their game to be worth coming back to. Games without a daily mode usually rely on the energy-system trap to keep you returning.

Fifth, does it support languages other than English? Word games that only ship in English have not thought about scripts that work differently — Hebrew right-to-left, Japanese kanji, Spanish accented characters. A game that supports multiple languages well has probably been thought about more carefully overall.

Five questions, two minutes per app, and you will avoid most of the bad ones. The good ones — and there are not many — tend to pass all five.`,
      },
      {
        title: 'Where to Start',
        content: `If you are starting from zero, here is the order I would try things, in 2026.

Start with a daily puzzle. One small thing, once a day, finishable in five minutes. You will know within a week whether the format suits you. If it does, you have a free habit. If it does not, you have lost five minutes a day for a week and learned something about yourself.

If the daily clicks and you want more, add a hunt mode or a real-time multiplayer game. The hunt mode gives you progression — you can get measurably better at it over time. The multiplayer gives you social stakes. Both are antidotes to the loneliness problem of single-player phone games.

If you have people you want to play with, look for a party mode or a TV-friendly version. Word games are unexpectedly good with families, and the shared-screen format makes them work for people who would never download a word game app on their own.

That is the whole pitch. The good free word games exist. They are not in the top ten lists, because the top ten lists are paid placements. They are mostly browser-based, mostly daily-puzzle-shaped, mostly built by small teams who care about the words.

Try the Word of the Day, see if it sticks. If it does not, you have lost three minutes. If it does, you have a free habit for a year.`,
      },
    ],
    backToBlog: 'Back to Blog',
    playDaily: 'Try the Daily Challenge',
    startPracticing: 'Play Now',
  },
  ru: {
    title: 'Бесплатные словесные игры онлайн: честный гайд (без pay-to-win)',
    subtitle: 'Путеводитель по словесным играм, которые уважают твоё время, кошелёк и внимание. Обновлено на 2026 год.',
    category: 'Гайд',
    readTime: '11 мин',
    authorName: 'Ohad Fisher',
    authorBio: 'Установил и удалил больше «бесплатных» словесных игр, чем готов признать. Теперь пишет о том, какие из них действительно стоят твоих тапов.',
    sections: [
      {
        content: `Вот грязный секрет «бесплатных» словесных игр в интернете: большинство из них не бесплатные. Это демки. Ты играешь три раунда, приложение вежливо сообщает, что надо подождать шесть часов, пока восстановится твоя «энергия», и баннер предлагает докупить её за 4,99 доллара. Это не игра. Это игровой автомат, нарядившийся в костюм словаря.

Я потратил последние пять лет на установку, игру, удаление и тихую ненависть примерно к сорока разным словесным играм на моём телефоне. Некоторые из них действительно бесплатные. Некоторые бесплатные так же, как бесплатная презентация о недвижимости. Я пытаюсь объяснить тебе разницу простым языком, без партнёрских ссылок и без «топ-10» наполнителя.

Если хочешь перейти к сути: важны три вещи — отсутствие систем энергии, отсутствие платежей за слова и ежедневный режим, который можно пройти за пять минут. Остальное — вопрос вкуса.`,
      },
      {
        title: 'Что такое настоящая «бесплатность»',
        content: `Бесплатная словесная игра должна иметь три свойства, и почти ни одна их них не имеет.

Во-первых, ты должен иметь возможность играть столько, сколько захочешь. Системы энергии — те, что ограничивают тебя пятью раундами, а потом заставляют ждать — изобрели в Candy Crush, и с тех пор они заразили весь экосистему мобильных игр. Они существуют не потому что делают игры лучше. Они существуют потому что заставляют людей платить. Словесная игра с системой энергии — это словесная игра, которая не верит, что тебе понравится играть на своих условиях.

Во-вторых, ничего в самой игре не должно быть за платёжной стеной. Это звучит очевидным, и это правило нарушается чаще всего. «Радар слов», который показывает лучший ход? За стеной. Обмены плиток, чтобы избавиться от плохой комбинации? За стеной. Дополнительное время? За стеной. Эти функции не улучшают игру; они продают тебе обход игры. Если бы разработчикам была нужна хорошая механика, они не продавали бы способы её пропустить.

В-третьих, реклама должна быть опциональной или ненавязчивой. Один баннер в нижней части экрана — нормально. 30-секундное видео, которое нельзя пропустить перед каждым матчем — нет. Честная модель: покажи мне рекламу при открытии приложения, небольшой баннер во время игры, и предложи разовый платёж, чтобы удалить оба. Нечестная модель: показывай рекламу каждый раз, когда я что-то делаю, и ещё продавай усиления.

Ты можешь проверить любую словесную игру по этим трём критериям минут за полтора. Большинство не пройдут хотя бы один.`,
      },
      {
        title: 'Ежедневная головоломка: пять минут, которые прилипают',
        content: `Самый успешный паттерн дизайна в современных словесных играх — ежедневная головоломка. Одна головоломка. Один раз в день. Одна и та же для всех. Решается за пять минут.

Wordle не придумал этот формат, но Wordle доказал, что он может быть масштабным. Оригинальная версия Josh Wardle, до того как её купила The New York Times, не имела рекламы, приложения, аккаунта. Ты переходил на веб-страницу, играл в головоломку, делился сеткой цветных квадратов с друзьями, и приходил обратно завтра. Гений был в ограничении. Ты не мог бинжить. Ты не мог купить лучший результат. Ты играл в одну и ту же головоломку со своей сестрой, боссом и незнакомцем из Хельсинки, и именно этот общий опыт сделал картинку с цветными квадратами вирусной.

Ежедневный формат работает потому что уважает две вещи, которые современные приложения не уважают: твоё время и твоё внимание. Ты заканчиваешь за один раз. Тебя не тянут обратно. Ты чувствуешь маленькую победу и идёшь дальше. Завтра новая ждёт, но только одна. Дефицит — это фишка.

Слово дня от LexiClash работает по этому принципу, на пяти языках, включая иврит с нормальной поддержкой справа налево. Версия на иврите была самой сложной, потому что формат ежедневной головоломки не имел хорошей реализации на иврите до 2024 года — большинство клонов «Wordle на иврите» относились к шрифту как к второстепенной задаче. Нам пришлось учитывать это с самого начала. Если ты читаешь на иврите, ты это заметишь.`,
      },
      {
        title: 'Мультиплеер в реальном времени: люди, а не боты',
        content: `Большинство словесных игр, позиционируемых как «мультиплеер», на самом деле одиночные игры, где с другой стороны играет бот. У бота есть имя типа «AlexW87», он делает вероятные ошибки и иногда пишет тебе «хорошая игра». Потом ты узнаёшь, что он взял твой ход в 3 утра, когда ты спал, и медленно понимаешь, что AlexW87 — это не настоящий человек.

Мультиплеер в реальном времени — это другое. Ты и другой человек, оба онлайн прямо сейчас, оба смотрят на одну сетку, оба соревнуются против одних часов. Игра заканчивается, когда таймер обнуляется, а не когда один из вас вспомнит открыть приложение три дня спустя. Ставки сразу. Словесные войны сразу. Злорадство, когда ты находишь семибуквенное слово, которое они пропустили — сразу.

Такой формат сложнее разрабатывать. Нужны настоящие серверы, которые хранят состояние, нужна система защиты от читеров, которая ловит подсматривание в словарь, нужен подбор соперников, чтобы не сталкивать новичков с экспертами. Это также сложнее монетизировать, потому что нет асинхронных моментов, когда можно вставить рекламу. Поэтому большинство «мультиплеер» игр молча отказываются от этого и используют ботов.

Если ты хочешь узнать, настоящий ли мультиплеер в игре, посмотри две вещи: как быстро тебя подбирают, и делает ли противник паузы во время игры как человек. Настоящие противники делают странные колебания. Боты играют с подозрительно равномерной скоростью.`,
      },
      {
        title: 'Режимы поиска слов: целевые слова лучше чем все подряд',
        content: `Классический Богл имеет проблему: смотреть на случайную сетку три минуты намного сложнее, чем кажется. Мозг зависает. Ты видишь одни и те же шесть букв снова и снова. Ты пишешь ТО и И и КОТ и чувствуешь себя идиотом. Это реальная проблема, которую большинство словесных игр не решают.

Решение — целевые слова. Вместо «найди все слова», игра показывает тебе маленький набор конкретных слов для поиска — шестибуквенные слова, слова начинающиеся на определённую букву, слова на тему. У твоего мозга появляется цель. Он больше не сканирует случайно; он ищет целенаправленно. Когнитивная нагрузка резко падает и игра становится намного веселее.

Выживание в LexiClash развивается со дней: День 1 может дать лёгкие шестибуквенные цели, День 30 — восьмибуквенные слова с редкими буквами. Прогрессия важна потому что она не даёт игре быть одинаковой каждый день. Эскалация — это цикл.

Я это упоминаю потому что разница между «найди слова» и «найди эти конкретные слова» — это разница между разочаровывающей и удовлетворяющей игрой, и большинство рецензий это никогда не упоминают. Если ты не можешь справиться с классическими сетками в стиле Boggle, попробуй режим поиска перед тем как решить, что словесные игры не для тебя.`,
      },
      {
        title: 'Игра для семьи и класса: тест TV режима',
        content: `Одно, что бесплатные словесные игры почти никогда не рекламируют — работают ли они на телевизоре. Это звучит узко, пока ты не попробуешь играть в телефонную игру со своей семьёй на День Благодарения. Все наклоняются над одним телефоном — ужасно. Передавать телефон по кругу — ужасно. Нужен общий экран.

Тест — есть ли в игре какой-нибудь режим вечеринки, режим хоста, или TV вид. LexiClash имеет архитектуру игры для вечеринок, где один экран хостит игру, а игроки присоединяются со своих телефонов, похоже как в Jackbox Party Pack. Это редко в словесных играх конкретно — большинство разработчиков думают, что вселенная это телефон.

Та же архитектура работает для классов. Учитель показывает игру на смартборде, ученики играют со своих устройств, и лидерборд обновляется в реальном времени. Это модель, которая действительно работает для питча «образовательная игра», в отличие от модели где ты делаешь игру рабочим листом и притворяешься что это весело.

Если у тебя есть семья или класс, с которыми ты хочешь играть, спроси есть ли в игре режим общего экрана. Ответ обычно нет. Когда ответ да, игра обычно лучше для всех, потому что разработчики должны были думать не только об одном пользователе.`,
      },
      {
        title: 'Мобильная игра без App Store',
        content: `Вот что никто не говорит: тебе не нужно устанавливать приложение, чтобы играть в словесную игру на телефоне. Современные веб-игры работают в браузере телефона, могут установиться на домашний экран если захочешь, и работают офлайн после загрузки. Это называется Progressive Web App, или PWA, и это решает проблему, которую создал App Store.

Проблема — трение. Чтобы установить обычное приложение, ты должен пойти в App Store, поискать, прочитать рецензии, нажать установку, дождаться загрузки, согласиться с разрешениями, найти приложение в лаунчере. Может быть 70% людей отваливаются где-то в этой воронке. С PWA ты просто открываешь ссылку. Игра загружается в браузер. Если нравится, нажимаешь «Добавить на домашний экран» и с этого момента это как обычное приложение. Если нет, закрываешь вкладку и забываешь что это было.

PWA также избегают худшей части App Store: модели «бесплатная загрузка, 9,99 доллара в месяц подписка, которую ты забыл отключить». Браузерные игры должны убедить тебя вернуться. Они не могут спрятать подписку в меню настроек.

LexiClash работает как PWA. Большинство браузерных словесных игр тоже. Если ты читаешь рецензию на словесную игру и чувствуешь назойливость уже устанавливать ещё одно приложение, сначала проверь есть ли веб-версия. Почти всегда есть.`,
      },
      {
        title: 'Чеклист красных флагов',
        content: `Пройди любую бесплатную словесную игру по этому списку перед тем как серьёзно её рассматривать. Сэкономишь часы.

Во-первых, есть ли в ней система энергии? Ищи любые фразы типа «жизни», «звёзды», «сердца», или «ждите чтобы играть дальше». Если да — уходи.

Во-вторых, можно ли купить усиления которые влияют на игру? Обмены плиток, раскрытие подсказок, дополнительное время, умножители очков. Если ты можешь заплатить деньги, чтобы играть лучше — игра продаёт тебе победу, а не впечатление.

В-третьих, как часто она раздражает тебя рекламой? Одна реклама при открытии и баннер во время игры — нормально. Реклама между каждым раундом, особенно видео которую нельзя пропустить — означает что бизнес-модель это твоё внимание, а не твоё удовольствие.

В-четвёртых, есть ли в ней ежедневный режим? Ежедневная головоломка — это сигнал что разработчики верят что их игра стоит возвращения. Игры без ежедневного режима обычно полагаются на ловушку системы энергии.

В-пятых, поддерживает ли она языки кроме английского? Словесные игры только на английском не учитывают что скрипты работают по-разному — иврит справа налево, японский иероглифы, испанский ударения. Игра которая хорошо поддерживает много языков вероятно разработана продуманнее в целом.

Пять вопросов, две минуты на приложение, и ты избежишь большинство плохих. Хорошие — их не много — обычно проходят все пять.`,
      },
      {
        title: 'С чего начать',
        content: `Если начинаешь с нуля, вот в каком порядке я рекомендую пробовать, в 2026 году.

Начни с ежедневной головоломки. Одна маленькая штука, один раз в день, решается за пять минут. За неделю ты узнаешь подходит ли тебе этот формат. Если да — у тебя есть бесплатная привычка. Если нет — ты потратил пять минут в день за неделю и узнал о себе что-то.

Если ежедневный режим нравится и хочешь больше — добавь режим поиска или игру с мультиплеером в реальном времени. Режим поиска даёт прогресс — ты можешь явно улучшаться со временем. Мультиплеер даёт социальные ставки. Оба — средства против одиночества одиночных мобильных игр.

Если у тебя есть люди с которыми ты хочешь играть — ищи режим вечеринки или версию для телевизора. Словесные игры неожиданно хорошо работают для семей, и формат общего экрана делает их работающими для людей которые никогда не скачали бы словесную игру сами.

Вот весь питч. Хорошие бесплатные словесные игры существуют. Они не в топ-10 списках, потому что топ-10 списки — это платные размещения. Они в основном браузерные, в основном в формате ежедневной головоломки, в основном разработаны маленькими командами которым важны слова.

Попробуй Слово дня, посмотри прилипнет ли. Если нет — потратил три минуты. Если да — у тебя есть бесплатная привычка на год.`,
      },
    ],
    backToBlog: 'Вернуться к блогу',
    playDaily: 'Попробуй ежедневный челлендж',
    startPracticing: 'Начать играть',
  },
};
