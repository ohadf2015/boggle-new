-- Curriculum word lists v2 (en): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/en-grade3.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    '34aafa7e-5a4b-5981-84ef-2fb1cccc2a4f', $t$Grade 3 — Plants, Animals and Our Earth$t$,
    $t$Life- and earth-science words 8–9 year olds read in science units: plant parts, animal groups, volcanoes and how living things survive.$t$,
    'en', 'grade_3', 'science', 'LC-EN-G3-NATURE',
    $j$[
      {"word":"insect","definition":"A tiny animal with six legs and a body in three parts","example":"A ladybug is an insect with red wings and black spots.","level":"support","canIntegrate":true},
      {"word":"soil","definition":"The dark, loose dirt that plants grow in","example":"We pressed the bean seeds into the wet soil.","level":"support","canIntegrate":true},
      {"word":"root","definition":"The part of a plant that grows underground and drinks up water","example":"The carrot is the root of the plant, so we eat it.","level":"support","canIntegrate":true},
      {"word":"seed","definition":"The small part of a plant that a new plant grows from","example":"Mia planted a sunflower seed in a paper cup.","level":"support","canIntegrate":true},
      {"word":"valley","definition":"Low land between hills or mountains, often with a river","example":"Our bus drove down into a green valley full of farms.","level":"support","canIntegrate":true},
      {"word":"mammal","definition":"A warm-blooded animal with hair that feeds its babies milk","example":"A whale lives in the sea, but it is a mammal, not a fish.","level":"core","canIntegrate":true},
      {"word":"reptile","definition":"A cold-blooded animal with dry, scaly skin, like a snake or lizard","example":"The turtle is a reptile that can hide inside its shell.","level":"core","canIntegrate":true},
      {"word":"fossil","definition":"Rock holding the shape of a plant or animal from long ago","example":"Ben found a fossil of a tiny shell at the beach.","level":"core","canIntegrate":true},
      {"word":"volcano","definition":"A mountain that can blow out hot melted rock, ash and smoke","example":"The volcano rumbled, and red lava poured down its side.","level":"core","canIntegrate":true},
      {"word":"harvest","definition":"To pick and gather crops when they are ready to eat","example":"In the fall, farmers harvest pumpkins from the fields.","level":"core","canIntegrate":true},
      {"word":"pollen","definition":"Yellow dust in flowers that bees carry from plant to plant","example":"The bee's fuzzy legs were covered in pollen.","level":"core","canIntegrate":true},
      {"word":"survive","definition":"To stay alive, even when things are hard or dangerous","example":"Camels can survive many days in the desert without water.","level":"core","canIntegrate":true},
      {"word":"recycle","definition":"To turn used things like cans and paper into something new","example":"We recycle our milk jugs so they can become new bottles.","level":"core","canIntegrate":true},
      {"word":"energy","definition":"The power that makes things move, grow, light up or warm up","example":"Plants get energy from sunlight to help them grow.","level":"core","canIntegrate":true},
      {"word":"island","definition":"A piece of land with water all around it","example":"We took a boat to a small island in the middle of the lake.","level":"core","canIntegrate":true},
      {"word":"predator","definition":"An animal that hunts and eats other animals","example":"The owl is a predator that hunts mice at night.","level":"challenge","canIntegrate":true},
      {"word":"extinct","definition":"No longer living anywhere on Earth","example":"Dinosaurs became extinct millions of years ago.","level":"challenge","canIntegrate":true},
      {"word":"adapt","definition":"To change over time to fit a new place","example":"Animals adapt to cold places by growing thick fur.","level":"challenge","canIntegrate":true},
      {"word":"erosion","definition":"The slow wearing away of land by water, wind or ice","example":"Waves cause erosion that slowly eats away the cliff.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '0c4f0537-7bc0-5299-9047-b1587db0bc4f', $t$Grade 3 — Communities and Places$t$,
    $t$Social-studies words for 3rd graders: who lives where, the places a town shares and the people who keep it running.$t$,
    'en', 'grade_3', 'geography', 'LC-EN-G3-COMMUNITY',
    $j$[
      {"word":"village","definition":"A small group of houses and shops, smaller than a town","example":"Everyone in the village came to the summer fair.","level":"support","canIntegrate":true},
      {"word":"city","definition":"A very large, busy town where many people live and work","example":"The city has tall buildings, busy streets and a big zoo.","level":"support","canIntegrate":true},
      {"word":"map","definition":"A drawing that shows where places, roads and rivers are","example":"We used a map to find the way to the park.","level":"support","canIntegrate":true},
      {"word":"market","definition":"A place where people buy and sell food and other goods","example":"Grandma buys fresh peaches at the market every Saturday.","level":"support","canIntegrate":true},
      {"word":"neighbor","definition":"A person who lives next door or close to you","example":"Our neighbor waters our plants when we go away.","level":"support","canIntegrate":true},
      {"word":"bridge","definition":"A road or path built over a river, road or valley","example":"We walked across the bridge and watched the boats below.","level":"support","canIntegrate":true},
      {"word":"community","definition":"People who live in the same area and help each other","example":"Our community planted trees along Main Street.","level":"core","canIntegrate":true},
      {"word":"library","definition":"A building where you can borrow books for free","example":"I took home three books about dragons from the library.","level":"core","canIntegrate":true},
      {"word":"museum","definition":"A building where people look at art or old, special things","example":"At the museum we saw a giant dinosaur skeleton.","level":"core","canIntegrate":true},
      {"word":"mayor","definition":"The leader chosen to run a town or city","example":"The mayor cut the ribbon to open the new playground.","level":"core","canIntegrate":true},
      {"word":"country","definition":"A land with its own people, leaders and flag","example":"Canada is a big country with lots of lakes and forests.","level":"core","canIntegrate":true},
      {"word":"factory","definition":"A building where workers and machines make things","example":"The chocolate factory makes thousands of candy bars a day.","level":"core","canIntegrate":true},
      {"word":"volunteer","definition":"A person who helps without getting paid for it","example":"Dad is a volunteer who reads stories at the hospital.","level":"core","canIntegrate":true},
      {"word":"continent","definition":"One of the seven giant areas of land on Earth","example":"Africa is the continent where wild lions and giraffes live.","level":"core","canIntegrate":true},
      {"word":"population","definition":"The number of people who live in a place","example":"Our town's population grew when the new houses were built.","level":"challenge","canIntegrate":true},
      {"word":"tradition","definition":"Something a family or group has done the same way for years","example":"Making pancakes on Sunday is a tradition in our house.","level":"challenge","canIntegrate":true},
      {"word":"rural","definition":"In the countryside, with farms and open land, far from cities","example":"My cousin lives in a rural area with cows and corn fields.","level":"challenge","canIntegrate":true},
      {"word":"urban","definition":"In a city, with lots of buildings and people close together","example":"Urban parks give city kids a place to run and play.","level":"challenge","canIntegrate":true},
      {"word":"ancestor","definition":"A family member who lived a long, long time ago","example":"My ancestor sailed across the ocean over a hundred years ago.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'a78fc7cd-80a3-5f60-8857-d4e5ea667101', $t$Grade 3 — Words for Thinking and Learning$t$,
    $t$The words 3rd graders hear in every lesson and see on worksheets: observe, explain, solve, revise and more.$t$,
    'en', 'grade_3', 'english', 'LC-EN-G3-THINK',
    $j$[
      {"word":"idea","definition":"A thought or plan that comes into your mind","example":"Lily had a great idea for our class art project.","level":"support","canIntegrate":true},
      {"word":"question","definition":"Something you ask when you want to know or find out","example":"Raise your hand if you have a question about the story.","level":"support","canIntegrate":true},
      {"word":"answer","definition":"What you say or write back when someone asks you something","example":"Write your answer in the box below the math problem.","level":"support","canIntegrate":true},
      {"word":"choose","definition":"To pick one thing from a group of things","example":"You may choose a red, blue or green folder.","level":"support","canIntegrate":true},
      {"word":"notice","definition":"To see or hear something and pay attention to it","example":"Did you notice the bird's nest in the tree?","level":"support","canIntegrate":true},
      {"word":"remember","definition":"To keep something in your mind or bring it back later","example":"Remember to bring your library book back tomorrow.","level":"support","canIntegrate":true},
      {"word":"explain","definition":"To tell about something clearly so others understand it","example":"Can you explain how you got the answer?","level":"core","canIntegrate":true},
      {"word":"imagine","definition":"To make a picture of something in your mind","example":"Imagine you could fly over your school like a bird.","level":"core","canIntegrate":true},
      {"word":"observe","definition":"To watch something carefully to learn about it","example":"We observe the caterpillar every day to see how it changes.","level":"core","canIntegrate":true},
      {"word":"practice","definition":"To do something again and again to get better at it","example":"I practice my spelling words before every test.","level":"core","canIntegrate":true},
      {"word":"problem","definition":"Something hard or wrong that needs to be worked out or fixed","example":"Our problem was that the boat kept sinking, so we added foam.","level":"core","canIntegrate":true},
      {"word":"detail","definition":"A small fact or piece of information about something","example":"Add one more detail about how the dragon looked.","level":"core","canIntegrate":true},
      {"word":"solve","definition":"To find the answer or the way to fix something","example":"It took us ten minutes to solve the riddle.","level":"core","canIntegrate":true},
      {"word":"decide","definition":"To make up your mind and choose what to do","example":"We could not decide whether to play tag or soccer.","level":"core","canIntegrate":true},
      {"word":"topic","definition":"What a story, talk or piece of writing is mostly about","example":"The topic of my report is sea turtles.","level":"core","canIntegrate":true},
      {"word":"research","definition":"To look for facts in books or online to learn about something","example":"We will research penguins and share three facts with the class.","level":"challenge","canIntegrate":true},
      {"word":"organize","definition":"To put things neatly in order so they are easy to find","example":"Let's organize the crayons by color.","level":"challenge","canIntegrate":true},
      {"word":"paragraph","definition":"A group of sentences about one main idea","example":"Start a new paragraph when you write about the next day.","level":"challenge","canIntegrate":true},
      {"word":"revise","definition":"To change your writing to make it clearer or better","example":"After reading it aloud, I decided to revise my ending.","level":"challenge","canIntegrate":true}
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
