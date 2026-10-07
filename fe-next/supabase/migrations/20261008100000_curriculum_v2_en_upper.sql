-- Curriculum word lists v2 (en): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/en-upper.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    'aecb3b9d-ccf2-5913-96d2-e102758fd9d9', $t$Grade 1 — Things at School$t$,
    $t$Everyday words from the classroom and the schoolyard. Each word has a simple meaning and a sentence to read aloud.$t$,
    'en', 'grade_1', 'english', 'LC-EN-G1-SCHOOL',
    $j$[
      {"word":"pencil","definition":"A tool with graphite inside that you use to write or draw","example":"I sharpened my pencil before the spelling test.","level":"support","canIntegrate":true},
      {"word":"desk","definition":"A table where a student sits and works","example":"My name is written on the top of my desk.","level":"support","canIntegrate":true},
      {"word":"eraser","definition":"A small rubber piece that rubs out pencil marks","example":"Use the eraser if you make a mistake.","level":"support","canIntegrate":true},
      {"word":"friend","definition":"A person you like and enjoy spending time with","example":"My best friend sits next to me at lunch.","level":"support","canIntegrate":true},
      {"word":"crayon","definition":"A stick of colored wax used for drawing","example":"She drew a rainbow with a red crayon.","level":"core","canIntegrate":true},
      {"word":"ruler","definition":"A straight tool used to measure length or draw straight lines","example":"Measure the line with a ruler, not with your fingers.","level":"core","canIntegrate":true},
      {"word":"paper","definition":"Thin sheets used for writing, drawing, or printing","example":"Please put your name at the top of the paper.","level":"core","canIntegrate":true},
      {"word":"lunch","definition":"The meal eaten in the middle of the school day","example":"I packed a cheese sandwich for lunch today.","level":"core","canIntegrate":true},
      {"word":"teacher","definition":"A person who helps students learn at school","example":"Our teacher reads a story every morning.","level":"core","canIntegrate":true},
      {"word":"library","definition":"A room full of books that you can borrow","example":"We visit the library every Friday to choose a book.","level":"core","canIntegrate":true},
      {"word":"chair","definition":"A seat with a back, meant for one person","example":"Please push your chair under the table when you leave.","level":"core","canIntegrate":true},
      {"word":"backpack","definition":"A bag you wear on your back to carry school things","example":"My backpack felt heavy with all my books.","level":"core","canIntegrate":true},
      {"word":"glue","definition":"A sticky liquid that holds paper or other things together","example":"Use a little glue to stick the picture on the card.","level":"core","canIntegrate":true},
      {"word":"recess","definition":"A break from class when children play outside","example":"At recess we played tag on the big field.","level":"challenge","canIntegrate":true},
      {"word":"homework","definition":"Work that students finish at home after school","example":"I finished my homework before dinner.","level":"challenge","canIntegrate":true},
      {"word":"marker","definition":"A pen with thick, colored ink","example":"The teacher wrote the date on the board with a black marker.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '94c416bf-f7b2-5f1b-ac58-f2da9b36d1f7', $t$Grade 9 — How Governments Work$t$,
    $t$Words from civics and history about voting, laws and how countries are run. Each word has a plain meaning and a sentence about a real situation.$t$,
    'en', 'grade_9', 'history', 'LC-EN-G9-CIVICS',
    $j$[
      {"word":"vote","definition":"To choose a leader or make a decision by casting a ballot","example":"Every citizen over eighteen can vote in the election.","level":"support","canIntegrate":true},
      {"word":"law","definition":"A rule that everyone in a country must follow","example":"It is against the law to drive through a red light.","level":"support","canIntegrate":true},
      {"word":"nation","definition":"A large group of people who share a country, history, and language","example":"The nation celebrated its independence with parades.","level":"support","canIntegrate":true},
      {"word":"citizen","definition":"A person who belongs to a country and has its rights","example":"Every citizen has the right to a fair trial.","level":"support","canIntegrate":true},
      {"word":"democracy","definition":"A system where people choose their leaders through voting","example":"In a democracy, the people decide who runs the government.","level":"core","canIntegrate":true},
      {"word":"republic","definition":"A country led by elected leaders instead of a king","example":"The country became a republic after the king gave up power.","level":"core","canIntegrate":true},
      {"word":"constitution","definition":"The basic set of rules that defines how a country is governed","example":"The constitution protects freedom of speech.","level":"core","canIntegrate":true},
      {"word":"amendment","definition":"A change added to a constitution or a law","example":"The amendment gave women the right to vote.","level":"core","canIntegrate":true},
      {"word":"treaty","definition":"A formal agreement signed by two or more countries","example":"The two countries signed a peace treaty in 1919.","level":"core","canIntegrate":true},
      {"word":"colony","definition":"A place ruled by people from another country","example":"The colony wanted to govern itself after many years.","level":"core","canIntegrate":true},
      {"word":"revolution","definition":"A sudden, large change in government, often by force","example":"The revolution changed the country's laws forever.","level":"core","canIntegrate":true},
      {"word":"census","definition":"An official count of all the people living in a country","example":"The census counts how many people live in each city.","level":"core","canIntegrate":true},
      {"word":"legislature","definition":"The group of people in a country who make the laws","example":"The legislature debated the new tax law for weeks.","level":"core","canIntegrate":true},
      {"word":"sovereignty","definition":"The power of a country to govern itself","example":"The country fought hard to protect its sovereignty.","level":"challenge","canIntegrate":true},
      {"word":"ratify","definition":"To officially approve an agreement or a constitution","example":"The states voted to ratify the new constitution.","level":"challenge","canIntegrate":true},
      {"word":"veto","definition":"A leader's power to stop a law from passing","example":"The president decided to veto the bill.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '912fcfd6-cd36-5f97-abd7-f8850e776113', $t$Grade 11 — Words for People and Ideas$t$,
    $t$Precise words for describing character, arguments and thinking. Each word comes with a clear definition and a sentence that shows how it is used.$t$,
    'en', 'grade_11', 'english', 'LC-EN-G11-WORDS',
    $j$[
      {"word":"honest","definition":"Telling the truth and not hiding anything","example":"An honest answer is better than a clever lie.","level":"support","canIntegrate":true},
      {"word":"brief","definition":"Short in length or time","example":"The coach gave a brief talk before the game.","level":"support","canIntegrate":true},
      {"word":"careful","definition":"Paying close attention to avoid mistakes or harm","example":"She was careful not to spill the paint.","level":"support","canIntegrate":true},
      {"word":"calm","definition":"Relaxed and not upset, even under pressure","example":"The pilot stayed calm during the storm.","level":"support","canIntegrate":true},
      {"word":"candid","definition":"Open and direct, even when the truth is uncomfortable","example":"He gave me a candid review of my essay.","level":"core","canIntegrate":true},
      {"word":"eloquent","definition":"Speaking or writing in a clear, graceful, and powerful way","example":"The eloquent speaker won the whole room over.","level":"core","canIntegrate":true},
      {"word":"pragmatic","definition":"Dealing with problems in a practical, realistic way","example":"The team chose a pragmatic plan instead of an ideal one.","level":"core","canIntegrate":true},
      {"word":"resilient","definition":"Able to recover quickly from difficulty","example":"Young children are often more resilient than adults expect.","level":"core","canIntegrate":true},
      {"word":"skeptical","definition":"Doubting a claim until there is good proof","example":"The judge was skeptical of the witness's story.","level":"core","canIntegrate":true},
      {"word":"meticulous","definition":"Showing great attention to every small detail","example":"The engineer was meticulous about every measurement.","level":"core","canIntegrate":true},
      {"word":"persuasive","definition":"Able to convince others to believe or do something","example":"Her persuasive argument changed everyone's mind.","level":"core","canIntegrate":true},
      {"word":"reluctant","definition":"Unwilling to do something and hesitant about it","example":"He was reluctant to admit that he had lost.","level":"core","canIntegrate":true},
      {"word":"concise","definition":"Expressing a lot in only a few words","example":"A good summary is short and concise.","level":"core","canIntegrate":true},
      {"word":"benevolent","definition":"Kind and wanting to help other people","example":"The benevolent old man shared his food with anyone who asked.","level":"challenge","canIntegrate":true},
      {"word":"ubiquitous","definition":"Found everywhere at the same time","example":"Smartphones have become ubiquitous in modern life.","level":"challenge","canIntegrate":true},
      {"word":"lucid","definition":"Clear and easy to understand","example":"The teacher gave a lucid explanation of the theorem.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'cb0d5d54-e4f8-546c-ab75-23f7a1a5ca6b', $t$Grade 12 — Money and the Economy$t$,
    $t$The money words you meet in real life and in economics class, from saving a few coins to national prices. Each word has a clear meaning and a sentence to show it in use.$t$,
    'en', 'grade_12', 'general', 'LC-EN-G12-ECONOMY',
    $j$[
      {"word":"money","definition":"Coins and notes that people use to buy things","example":"I saved my money to buy a new bike.","level":"support","canIntegrate":true},
      {"word":"price","definition":"The amount of money someone pays for something","example":"The price of bread went up this year.","level":"support","canIntegrate":true},
      {"word":"job","definition":"Regular work that a person does to earn money","example":"My aunt got a new job at the hospital.","level":"support","canIntegrate":true},
      {"word":"savings","definition":"Money kept aside for later use","example":"Our savings will pay for the trip next summer.","level":"support","canIntegrate":true},
      {"word":"budget","definition":"A plan for how much money to spend and how much to save","example":"We made a budget for groceries each month.","level":"core","canIntegrate":true},
      {"word":"profit","definition":"Money a business keeps after paying its costs","example":"The shop made a profit this year.","level":"core","canIntegrate":true},
      {"word":"debt","definition":"Money that a person owes to someone else","example":"He finally paid off his debt to the bank.","level":"core","canIntegrate":true},
      {"word":"wage","definition":"Money paid to a worker for their work","example":"The new wage helps families pay the rent.","level":"core","canIntegrate":true},
      {"word":"market","definition":"A place or system where goods are bought and sold","example":"The farmers sold fresh vegetables at the market.","level":"core","canIntegrate":true},
      {"word":"supply","definition":"The amount of a product that is available to buy","example":"When the supply of corn is low, prices rise.","level":"core","canIntegrate":true},
      {"word":"demand","definition":"How many people want to buy a product","example":"High demand for the game sold out the stock.","level":"core","canIntegrate":true},
      {"word":"invest","definition":"To put money into something to earn more money later","example":"She decided to invest in a small company.","level":"core","canIntegrate":true},
      {"word":"interest","definition":"Extra money paid for borrowing or for keeping money in a bank","example":"The bank paid interest on my savings account.","level":"core","canIntegrate":true},
      {"word":"inflation","definition":"A general rise in prices over time","example":"Inflation means your money buys less than it did before.","level":"challenge","canIntegrate":true},
      {"word":"tariff","definition":"A tax on goods brought into a country from abroad","example":"The government added a tariff on imported steel.","level":"challenge","canIntegrate":true},
      {"word":"deficit","definition":"A situation where spending is larger than the money coming in","example":"The country ran a deficit after the expensive war.","level":"challenge","canIntegrate":true}
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
