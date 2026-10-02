-- Curriculum word lists v2 (en): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/en.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

UPDATE curriculum_word_lists SET is_active = FALSE WHERE curriculum_standard IN ('MOE-ENG-G3-CORE', 'MOE-ENG-G5-CORE', 'MOE-ENG-G7-CORE', 'MOE-ENG-G3-HE');

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    '7efd3284-348c-50e0-bdc4-927f4b7a34a9', $t$Grade 3 — Everyday Words$t$,
    $t$High-use words for 8–9 year olds: home, school, friends and feelings. Each word has a kid-friendly definition and a sentence to read aloud.$t$,
    'en', 'grade_3', 'english', 'LC-EN-G3-CORE',
    $j$[
      {"word":"apple","definition":"A crunchy fruit with red, green or yellow skin that grows on trees","example":"I packed an apple in my lunch box.","level":"support","canIntegrate":true},
      {"word":"book","definition":"Pages with words or pictures, held together inside a cover, that you read","example":"Mia read a book about sharks before bed.","level":"support","canIntegrate":true},
      {"word":"cat","definition":"A small furry pet with whiskers that purrs when it is happy","example":"Our cat naps in the sunny spot by the window.","level":"support","canIntegrate":true},
      {"word":"dog","definition":"A furry pet that barks, wags its tail and loves to fetch","example":"The dog ran after the ball and brought it back.","level":"support","canIntegrate":true},
      {"word":"house","definition":"A building where a family lives","example":"Their house has a red door and a big yard.","level":"support","canIntegrate":true},
      {"word":"jump","definition":"To push off the ground with your legs so your whole body goes up in the air","example":"Can you jump over the puddle without getting wet?","level":"support","canIntegrate":true},
      {"word":"eat","definition":"To chew and swallow food","example":"We eat dinner together at six o'clock.","level":"core","canIntegrate":true},
      {"word":"friend","definition":"Someone you like, trust and enjoy spending time with","example":"My friend Sam saved me a seat on the bus.","level":"core","canIntegrate":true},
      {"word":"good","definition":"Nice, helpful or done well; the opposite of bad","example":"You did a good job cleaning up the paint.","level":"core","canIntegrate":true},
      {"word":"happy","definition":"Feeling glad, the way you feel when you smile or laugh","example":"Grandpa was happy to see us at the door.","level":"core","canIntegrate":true},
      {"word":"kind","definition":"Gentle and caring; acting in ways that help others feel good","example":"Leo is kind to new kids in our class.","level":"core","canIntegrate":true},
      {"word":"quiet","definition":"Making little or no noise","example":"The library is a quiet place to read.","level":"core","canIntegrate":true},
      {"word":"share","definition":"To let someone else use or have part of something that is yours","example":"Let's share the last slice of pizza.","level":"core","canIntegrate":true},
      {"word":"laugh","definition":"To make happy sounds because something is funny","example":"The puppy's silly tricks made everyone laugh.","level":"core","canIntegrate":true},
      {"word":"brave","definition":"Ready to do something scary or hard even when you feel afraid","example":"The brave firefighter climbed the tall ladder.","level":"challenge","canIntegrate":true},
      {"word":"borrow","definition":"To take something for a short time and then give it back","example":"May I borrow your eraser for a minute?","level":"challenge","canIntegrate":true},
      {"word":"careful","definition":"Paying close attention so you do not make a mistake or get hurt","example":"Be careful when you carry the hot soup.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '9277323c-82fc-51cd-af38-a67d9a482485', $t$Grade 5 — Words for Stories and Life$t$,
    $t$Words 10–11 year olds meet in novels, class discussions and writing prompts, from adventure to opinion.$t$,
    'en', 'grade_5', 'english', 'LC-EN-G5-CORE',
    $j$[
      {"word":"beautiful","definition":"Very lovely to look at or listen to","example":"We watched a beautiful sunset over the lake.","level":"support","canIntegrate":true},
      {"word":"favorite","definition":"Liked the most, more than all the others","example":"Blue is my favorite color.","level":"support","canIntegrate":true},
      {"word":"important","definition":"Mattering a lot; something you should pay attention to","example":"Sleep is important for a growing body.","level":"support","canIntegrate":true},
      {"word":"describe","definition":"To tell what someone or something is like using words","example":"Can you describe the monster in your dream?","level":"support","canIntegrate":true},
      {"word":"explore","definition":"To travel around a place to find out what it is like","example":"We used a map to explore the old castle.","level":"support","canIntegrate":true},
      {"word":"adventure","definition":"An exciting trip or experience full of new things, sometimes with a little danger","example":"Camping in the mountains was a real adventure.","level":"core","canIntegrate":true},
      {"word":"celebrate","definition":"To do something fun and special because of an important day or event","example":"We celebrate my sister's birthday with a picnic.","level":"core","canIntegrate":true},
      {"word":"discover","definition":"To find or learn something for the first time","example":"Divers hope to discover new kinds of fish.","level":"core","canIntegrate":true},
      {"word":"grateful","definition":"Feeling thankful when someone helps you or gives you something","example":"I was grateful when a classmate found my lost jacket.","level":"core","canIntegrate":true},
      {"word":"history","definition":"The study of things that happened in the past","example":"In history class we learned how the pyramids were built.","level":"core","canIntegrate":true},
      {"word":"journey","definition":"A long trip from one place to another","example":"The journey across the ocean took two weeks.","level":"core","canIntegrate":true},
      {"word":"curious","definition":"Wanting to know or learn about something","example":"The curious kitten sniffed every box in the room.","level":"core","canIntegrate":true},
      {"word":"environment","definition":"The air, water, land, plants and animals around us that living things need","example":"Picking up litter helps protect the environment.","level":"challenge","canIntegrate":true},
      {"word":"challenge","definition":"Something hard that tests how strong, smart or skillful you are","example":"Learning the guitar is a fun challenge.","level":"challenge","canIntegrate":true},
      {"word":"opinion","definition":"What you think or believe about something, which others may not agree with","example":"In my opinion, summer is the best season.","level":"challenge","canIntegrate":true},
      {"word":"solution","definition":"The answer to a problem or a way to fix it","example":"Our team found a solution to the puzzle in five minutes.","level":"challenge","canIntegrate":true},
      {"word":"patient","definition":"Able to wait calmly without getting upset","example":"Please be patient while the cookies bake.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '24056a45-f890-5bf1-82a0-0b8478105956', $t$Grade 7 — Academic Words for Every Subject$t$,
    $t$The thinking words middle schoolers see in science labs, essays and test questions: analyze, infer, evaluate and more.$t$,
    'en', 'grade_7', 'english', 'LC-EN-G7-ACAD',
    $j$[
      {"word":"communicate","definition":"To share ideas or feelings by talking, writing, signing or using gestures","example":"Dolphins communicate with clicks and whistles.","level":"support","canIntegrate":true},
      {"word":"technology","definition":"Tools, machines and inventions people create with science to solve problems","example":"New technology lets doctors see inside the body without surgery.","level":"support","canIntegrate":true},
      {"word":"compare","definition":"To look at two or more things to see how they are alike and different","example":"Compare the two maps and list three changes.","level":"support","canIntegrate":true},
      {"word":"predict","definition":"To say what you think will happen before it happens","example":"Can you predict how the story will end?","level":"support","canIntegrate":true},
      {"word":"analyze","definition":"To study something closely, piece by piece, to understand how it works or why it happened","example":"Scientists analyze water samples to check for pollution.","level":"core","canIntegrate":true},
      {"word":"demonstrate","definition":"To show how something works or prove that something is true","example":"The coach will demonstrate the correct way to serve.","level":"core","canIntegrate":true},
      {"word":"investigate","definition":"To search for facts to find out what happened or how something works","example":"The detective came to investigate the missing painting.","level":"core","canIntegrate":true},
      {"word":"summarize","definition":"To retell the main ideas in a few words, leaving out small details","example":"Summarize the chapter in three sentences.","level":"core","canIntegrate":true},
      {"word":"evidence","definition":"Facts or objects that show whether something is true","example":"Footprints in the mud were evidence that a deer had passed.","level":"core","canIntegrate":true},
      {"word":"conclude","definition":"To decide something is true after thinking about all the facts","example":"From the clues, we can conclude that the butler is innocent.","level":"core","canIntegrate":true},
      {"word":"sequence","definition":"The order in which events or steps happen","example":"Put the pictures in the right sequence to tell the story.","level":"core","canIntegrate":true},
      {"word":"evaluate","definition":"To judge how good, useful or correct something is after looking at it carefully","example":"Use the checklist to evaluate your partner's essay.","level":"challenge","canIntegrate":true},
      {"word":"hypothesis","definition":"A possible explanation that you can test with an experiment","example":"Our hypothesis was that plants grow faster with music.","level":"challenge","canIntegrate":true},
      {"word":"perspective","definition":"The way a person sees a situation, shaped by who they are and what they have lived through","example":"The story is told from the perspective of the dog.","level":"challenge","canIntegrate":true},
      {"word":"significant","definition":"Large or important enough to make a real difference","example":"There was a significant drop in temperature overnight.","level":"challenge","canIntegrate":true},
      {"word":"infer","definition":"To figure out something that is not said directly, using clues and what you already know","example":"From his muddy boots, we can infer that Max walked through the field.","level":"challenge","canIntegrate":true},
      {"word":"relevant","definition":"Closely connected to the topic you are talking about","example":"Only include facts that are relevant to your argument.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '96d6761b-bb4c-519d-9169-849ffa39bf86', $t$Grade 2 — Animals and Where They Live$t$,
    $t$Life-science words for 7–8 year olds: animal homes, body coverings and how animals survive the seasons.$t$,
    'en', 'grade_2', 'science', 'LC-EN-G2-ANIMALS',
    $j$[
      {"word":"nest","definition":"A cozy home birds build from twigs, grass and mud to hold their eggs","example":"Two robins built a nest in our apple tree.","level":"support","canIntegrate":true},
      {"word":"pond","definition":"A small, still body of water, smaller than a lake","example":"Frogs and ducks live at the pond behind our school.","level":"support","canIntegrate":true},
      {"word":"forest","definition":"A large area covered with many trees","example":"Bears, deer and owls live in the forest.","level":"support","canIntegrate":true},
      {"word":"ocean","definition":"The huge body of salt water that covers most of Earth","example":"Whales swim thousands of miles across the ocean.","level":"support","canIntegrate":true},
      {"word":"fur","definition":"The thick, soft hair that covers many animals","example":"A polar bear's thick fur keeps it warm on the ice.","level":"support","canIntegrate":true},
      {"word":"burrow","definition":"A hole or tunnel in the ground that an animal digs to live in","example":"The rabbit hid in its burrow when the fox came near.","level":"core","canIntegrate":true},
      {"word":"desert","definition":"A very dry place that gets almost no rain","example":"Camels can walk for days across the desert.","level":"core","canIntegrate":true},
      {"word":"feathers","definition":"The soft, light parts covering a bird's body that help it fly and stay warm","example":"The parrot has bright green feathers.","level":"core","canIntegrate":true},
      {"word":"scales","definition":"Small, hard, flat pieces that cover the skin of fish and snakes","example":"The fish's silver scales shimmered in the sunlight.","level":"core","canIntegrate":true},
      {"word":"herd","definition":"A large group of animals, like cows or elephants, that live and move together","example":"A herd of zebras crossed the river.","level":"core","canIntegrate":true},
      {"word":"tadpole","definition":"A baby frog that lives in water and swims with its tail","example":"The tadpole will slowly grow legs and lose its tail.","level":"core","canIntegrate":true},
      {"word":"shelter","definition":"A place that keeps you safe from bad weather or danger","example":"The cave gave the bats shelter from the storm.","level":"core","canIntegrate":true},
      {"word":"habitat","definition":"The natural home where a plant or animal finds the food, water and shelter it needs","example":"A coral reef is a habitat for colorful fish.","level":"challenge","canIntegrate":true},
      {"word":"hibernate","definition":"To sleep deeply through the cold winter months","example":"Some bears hibernate until spring comes.","level":"challenge","canIntegrate":true},
      {"word":"prey","definition":"An animal that is hunted and eaten by another animal","example":"Mice are prey for owls and hawks.","level":"challenge","canIntegrate":true},
      {"word":"migrate","definition":"To travel far away when the seasons change, usually to find food or warmth","example":"Geese migrate south every fall.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '85e5da63-7e24-5134-8550-7becf3945f54', $t$Grade 3 — Weather and Seasons$t$,
    $t$Earth-science words for talking about the sky, storms and the four seasons, plus a few forecast words for the stretch tier.$t$,
    'en', 'grade_3', 'science', 'LC-EN-G3-WEATHER',
    $j$[
      {"word":"weather","definition":"What the air outside is like right now: sunny, rainy, windy, hot or cold","example":"The weather was perfect for flying kites.","level":"support","canIntegrate":true},
      {"word":"season","definition":"One of the four parts of the year: spring, summer, fall and winter","example":"Spring is the season when flowers bloom.","level":"support","canIntegrate":true},
      {"word":"cloud","definition":"A white or gray shape in the sky made of tiny drops of water","example":"A dark cloud covered the sun.","level":"support","canIntegrate":true},
      {"word":"rainbow","definition":"An arch of colors in the sky when sunlight shines through raindrops","example":"After the rain, a rainbow stretched over the hills.","level":"support","canIntegrate":true},
      {"word":"puddle","definition":"A small pool of water on the ground after it rains","example":"My little brother stomped in every puddle.","level":"support","canIntegrate":true},
      {"word":"thunder","definition":"The loud booming sound you hear after lightning flashes","example":"The thunder was so loud that the windows shook.","level":"core","canIntegrate":true},
      {"word":"lightning","definition":"A bright flash of electricity in the sky during a storm","example":"We counted the seconds between the lightning and the boom.","level":"core","canIntegrate":true},
      {"word":"breeze","definition":"A light, gentle wind","example":"A cool breeze blew through the open window.","level":"core","canIntegrate":true},
      {"word":"freeze","definition":"To turn hard and icy because it is very cold","example":"Ponds freeze in the middle of winter.","level":"core","canIntegrate":true},
      {"word":"melt","definition":"To turn from a solid into a liquid as it warms up","example":"The snowman began to melt in the sun.","level":"core","canIntegrate":true},
      {"word":"autumn","definition":"The season after summer, when leaves change color and drop; also called fall","example":"In autumn, we rake big piles of leaves.","level":"core","canIntegrate":true},
      {"word":"shiver","definition":"To shake a little because you are cold or scared","example":"We started to shiver while waiting for the bus in the snow.","level":"core","canIntegrate":true},
      {"word":"forecast","definition":"A report that says what the weather will probably be like soon","example":"The forecast says it will snow tomorrow.","level":"challenge","canIntegrate":true},
      {"word":"temperature","definition":"How hot or cold something is, measured with a thermometer","example":"The temperature dropped quickly after sunset.","level":"challenge","canIntegrate":true},
      {"word":"drought","definition":"A long time with little or no rain, when the land becomes very dry","example":"During the drought, the farmers' crops dried up.","level":"challenge","canIntegrate":true},
      {"word":"humid","definition":"Damp and sticky because there is a lot of water in the air","example":"It was so humid that my shirt stuck to my back.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '77a8c6bf-5d7f-5247-8a42-6f9713ee5436', $t$Grade 4 — Feelings and Character$t$,
    $t$Social-emotional vocabulary for naming feelings precisely and describing character traits in stories and in class.$t$,
    'en', 'grade_4', 'general', 'LC-EN-G4-FEELINGS',
    $j$[
      {"word":"excited","definition":"Very happy and eager about something that is going to happen","example":"I was too excited to sleep the night before the trip.","level":"support","canIntegrate":true},
      {"word":"nervous","definition":"Worried or a little scared about something","example":"Ava felt nervous before her piano recital.","level":"support","canIntegrate":true},
      {"word":"proud","definition":"Feeling good about something you or someone close to you did well","example":"Dad was proud when I finished the race.","level":"support","canIntegrate":true},
      {"word":"honest","definition":"Always telling the truth and never cheating or stealing","example":"Thank you for being honest about the broken vase.","level":"support","canIntegrate":true},
      {"word":"calm","definition":"Peaceful and not upset or worried","example":"Take a deep breath and stay calm.","level":"support","canIntegrate":true},
      {"word":"jealous","definition":"Upset because someone has something you want","example":"He felt jealous when his friend got a new bike.","level":"core","canIntegrate":true},
      {"word":"lonely","definition":"Sad because you are alone or feel that nobody is with you","example":"On her first day at a new school, Lily felt lonely.","level":"core","canIntegrate":true},
      {"word":"embarrassed","definition":"Feeling silly or shy because others saw you make a mistake","example":"I was embarrassed when I tripped on stage.","level":"core","canIntegrate":true},
      {"word":"confident","definition":"Sure that you can do something well","example":"After lots of practice, she felt confident about the test.","level":"core","canIntegrate":true},
      {"word":"generous","definition":"Happy to give or share what you have with others","example":"Our generous neighbor gave us tomatoes from her garden.","level":"core","canIntegrate":true},
      {"word":"grumpy","definition":"In a bad mood and easily annoyed","example":"I'm always grumpy when I wake up too early.","level":"core","canIntegrate":true},
      {"word":"cheerful","definition":"Happy, bright and full of good spirits","example":"The cheerful bus driver greets every child by name.","level":"core","canIntegrate":true},
      {"word":"respect","definition":"Treating someone as important and caring about their feelings and ideas","example":"We show respect by listening when others speak.","level":"core","canIntegrate":true},
      {"word":"frustrated","definition":"Annoyed and upset because something is not working the way you want","example":"I got frustrated when my kite kept crashing.","level":"challenge","canIntegrate":true},
      {"word":"responsible","definition":"Doing what you are supposed to do, so others can count on you","example":"Being responsible means feeding the fish every day.","level":"challenge","canIntegrate":true},
      {"word":"determined","definition":"Not giving up, even when something is very hard","example":"The determined climber reached the top of the mountain.","level":"challenge","canIntegrate":true},
      {"word":"empathy","definition":"Understanding how someone else feels, as if you were in their place","example":"Showing empathy can make a sad friend feel less alone.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '44b81f17-9940-5d41-b1f2-74fc3e0e47bd', $t$Grade 3 — Math Words$t$,
    $t$The words of operations, shapes and measurement that 3rd graders need to read and explain math problems.$t$,
    'en', 'grade_3', 'math', 'LC-EN-G3-MATH',
    $j$[
      {"word":"add","definition":"To put numbers together to find how many there are in all","example":"If you add 4 and 5, you get 9.","level":"support","canIntegrate":true},
      {"word":"equal","definition":"Exactly the same in amount or size","example":"Two plus two is equal to four.","level":"support","canIntegrate":true},
      {"word":"sum","definition":"The answer you get when you add numbers","example":"The sum of 7 and 8 is 15.","level":"support","canIntegrate":true},
      {"word":"shape","definition":"The outline or form of something, like a circle or a square","example":"A stop sign has the shape of an octagon.","level":"support","canIntegrate":true},
      {"word":"circle","definition":"A perfectly round flat figure with no corners","example":"We sat in a circle on the rug.","level":"support","canIntegrate":true},
      {"word":"subtract","definition":"To take one number away from another","example":"Subtract 3 from 10 to find out how many cookies are left.","level":"core","canIntegrate":true},
      {"word":"multiply","definition":"To find the total of equal groups quickly, like 3 groups of 4 making 12","example":"Multiply 6 by 2 to find how many eggs are in two rows.","level":"core","canIntegrate":true},
      {"word":"divide","definition":"To split an amount into equal groups","example":"Divide 12 apples among 4 friends, and each gets 3.","level":"core","canIntegrate":true},
      {"word":"triangle","definition":"A flat figure with three straight sides and three corners","example":"A slice of pizza looks like a triangle.","level":"core","canIntegrate":true},
      {"word":"measure","definition":"To find the size, length or amount of something","example":"Use a ruler to measure your pencil.","level":"core","canIntegrate":true},
      {"word":"pattern","definition":"Shapes, numbers or colors that repeat in a regular way","example":"Red, blue, red, blue is a simple pattern.","level":"core","canIntegrate":true},
      {"word":"even","definition":"A number that can be split into two equal groups, like 2, 4 or 6","example":"Eight is an even number.","level":"core","canIntegrate":true},
      {"word":"difference","definition":"The answer you get when you take one number away from another","example":"The difference between 9 and 4 is 5.","level":"challenge","canIntegrate":true},
      {"word":"fraction","definition":"A number that names part of a whole, like one half or three quarters","example":"One half is the fraction you get when you cut a pie into two equal parts.","level":"challenge","canIntegrate":true},
      {"word":"estimate","definition":"A smart guess about an amount, made without counting exactly","example":"My estimate is that there are 50 marbles in the jar.","level":"challenge","canIntegrate":true},
      {"word":"digit","definition":"Any one of the ten symbols 0 to 9 used to write numbers","example":"The digit in the tens place of 507 is zero.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '15f10118-c5c6-5a5e-94b4-e765159fbfb4', $t$Grade 6 — Earth and Space$t$,
    $t$Astronomy words for the solar system unit: planets, gravity, eclipses and the tools we use to study the sky.$t$,
    'en', 'grade_6', 'science', 'LC-EN-G6-SPACE',
    $j$[
      {"word":"planet","definition":"A huge round object in space that travels around a star","example":"Mars is the planet known for its red color.","level":"support","canIntegrate":true},
      {"word":"telescope","definition":"A tool that makes faraway objects, like stars, look bigger and closer","example":"Through the telescope, we could see the rings of Saturn.","level":"support","canIntegrate":true},
      {"word":"astronaut","definition":"A person trained to travel and work in space","example":"The astronaut floated inside the space station.","level":"support","canIntegrate":true},
      {"word":"solar","definition":"Having to do with the Sun","example":"Solar panels turn sunlight into electricity.","level":"support","canIntegrate":true},
      {"word":"lunar","definition":"Having to do with the Moon","example":"A lunar month is about 29 days long.","level":"support","canIntegrate":true},
      {"word":"orbit","definition":"To travel in a curved path around a planet or star; also the path itself","example":"The Moon takes about a month to orbit Earth.","level":"core","canIntegrate":true},
      {"word":"gravity","definition":"The invisible pull that draws objects toward each other and keeps our feet on the ground","example":"Gravity makes a dropped apple fall to the ground.","level":"core","canIntegrate":true},
      {"word":"galaxy","definition":"A giant group of billions of stars held together in space","example":"Our solar system is part of a galaxy called the Milky Way.","level":"core","canIntegrate":true},
      {"word":"comet","definition":"A ball of ice and dust that grows a glowing tail when it passes near the Sun","example":"People could see the comet without a telescope.","level":"core","canIntegrate":true},
      {"word":"crater","definition":"A bowl-shaped hole made when a rock from space crashes into a surface","example":"A meteorite left a deep crater in the desert.","level":"core","canIntegrate":true},
      {"word":"rotate","definition":"To spin around a center line, like a top","example":"Earth takes about 24 hours to rotate once.","level":"core","canIntegrate":true},
      {"word":"meteor","definition":"A space rock that burns up in Earth's air as a streak of light; also called a shooting star","example":"We made a wish when we saw a meteor.","level":"core","canIntegrate":true},
      {"word":"atmosphere","definition":"The layer of gases that surrounds a planet","example":"Earth's atmosphere protects us from harmful rays.","level":"challenge","canIntegrate":true},
      {"word":"eclipse","definition":"When one object in space blocks the light of another, as when the Moon hides the Sun","example":"During the eclipse, the sky turned dark at noon.","level":"challenge","canIntegrate":true},
      {"word":"satellite","definition":"An object that travels around a planet, like the Moon or a machine sent into space","example":"A weather satellite takes pictures of clouds from space.","level":"challenge","canIntegrate":true},
      {"word":"axis","definition":"An imaginary line through the middle of a planet that it spins around","example":"Earth is tilted on its axis, which gives us seasons.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'e8466add-1099-52a8-b87e-d94e3eeca6cd', $t$Grade 8 — Government and Citizenship$t$,
    $t$Civics vocabulary for how laws are made, how leaders are chosen and what rights and duties citizens share.$t$,
    'en', 'grade_8', 'history', 'LC-EN-G8-CIVICS',
    $j$[
      {"word":"citizen","definition":"A person who legally belongs to a country and has its rights and duties","example":"Every citizen has the right to a fair trial.","level":"support","canIntegrate":true},
      {"word":"vote","definition":"To make an official choice, for example by marking a ballot","example":"Students will vote for a class president on Friday.","level":"support","canIntegrate":true},
      {"word":"election","definition":"An organized event where people cast ballots to choose leaders","example":"The election will be held in November.","level":"support","canIntegrate":true},
      {"word":"law","definition":"A rule made by a government that everyone must follow","example":"There is a law that drivers must wear seat belts.","level":"support","canIntegrate":true},
      {"word":"freedom","definition":"Being able to act, speak and think without being controlled by others","example":"Freedom of speech lets people share their opinions.","level":"support","canIntegrate":true},
      {"word":"democracy","definition":"A system of government in which people choose their leaders by voting","example":"In a democracy, every adult citizen can vote.","level":"core","canIntegrate":true},
      {"word":"rights","definition":"Freedoms and protections that every person should have","example":"Children have rights, such as going to school and being safe.","level":"core","canIntegrate":true},
      {"word":"justice","definition":"Fair treatment for everyone, especially under the law","example":"The marchers carried signs calling for justice.","level":"core","canIntegrate":true},
      {"word":"debate","definition":"A discussion in which people give reasons for different sides of an issue","example":"The candidates held a debate on television.","level":"core","canIntegrate":true},
      {"word":"tax","definition":"Money people and businesses pay to the government to fund things like schools and roads","example":"A sales tax is added to the price of many things you buy.","level":"core","canIntegrate":true},
      {"word":"candidate","definition":"A person who is trying to be chosen in an election","example":"Each candidate gave a short speech.","level":"core","canIntegrate":true},
      {"word":"protest","definition":"To show publicly that you strongly disagree with something","example":"Hundreds of students gathered to protest peacefully.","level":"core","canIntegrate":true},
      {"word":"constitution","definition":"The written set of basic laws that explains how a country is governed","example":"The constitution protects freedom of speech.","level":"challenge","canIntegrate":true},
      {"word":"legislature","definition":"The group of elected people who make the laws for a country or state","example":"The legislature passed a new law about clean water.","level":"challenge","canIntegrate":true},
      {"word":"amendment","definition":"An official change or addition to a law or a constitution","example":"The amendment gave women the right to vote.","level":"challenge","canIntegrate":true},
      {"word":"veto","definition":"The power of a leader to reject a law that lawmakers have passed","example":"The president used a veto to block the bill.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '9a1b453a-2cd9-581d-ac2a-b17c96aec60e', $t$Grade 10 — Words for Building an Argument$t$,
    $t$The vocabulary of debate, persuasive essays and source analysis for 15–16 year olds. Definitions are precise enough to grade against, and examples come from real classroom tasks.$t$,
    'en', 'grade_10', 'english', 'LC-EN-G10-ARGUE',
    $j$[
      {"word":"claim","definition":"A statement that something is true, which you then have to back up with reasons and evidence","example":"Her claim was that school should start an hour later.","level":"support","canIntegrate":true},
      {"word":"reason","definition":"An explanation of why something is true or why someone acts a certain way","example":"Give one reason the city should build more bike lanes.","level":"support","canIntegrate":true},
      {"word":"source","definition":"A book, article, person or website that information comes from","example":"Always check who wrote a source before you trust it.","level":"support","canIntegrate":true},
      {"word":"audience","definition":"The people who will read, hear or watch what you create","example":"Choose words that suit your audience, whether it is classmates or the city council.","level":"support","canIntegrate":true},
      {"word":"thesis","definition":"The main point an essay sets out to prove, usually stated in the introduction","example":"Your thesis should fit in one clear sentence.","level":"core","canIntegrate":true},
      {"word":"persuade","definition":"To get someone to believe or do something by giving them good reasons","example":"The ad tried to persuade teens to drink more water.","level":"core","canIntegrate":true},
      {"word":"bias","definition":"A one-sided leaning that stops a person or source from treating all sides fairly","example":"The article showed bias because it quoted only one side.","level":"core","canIntegrate":true},
      {"word":"credible","definition":"Trustworthy and believable, usually because of expertise or strong evidence","example":"A peer-reviewed study is more credible than an anonymous post.","level":"core","canIntegrate":true},
      {"word":"logic","definition":"Clear, step-by-step reasoning in which each idea follows from the one before","example":"The logic of his argument broke down in the second paragraph.","level":"core","canIntegrate":true},
      {"word":"valid","definition":"Built on sound reasoning, so the conclusion really follows from the reasons","example":"That is a valid point, but it does not answer the main question.","level":"core","canIntegrate":true},
      {"word":"objective","definition":"Based on facts rather than personal feelings","example":"A news report should be objective, not full of the writer's opinions.","level":"core","canIntegrate":true},
      {"word":"premise","definition":"An idea that an argument accepts as true and builds on","example":"The premise of the debate was that homework helps students learn.","level":"core","canIntegrate":true},
      {"word":"counterclaim","definition":"An argument against your claim, which a strong essay names and then answers","example":"Address the counterclaim that uniforms limit self-expression.","level":"challenge","canIntegrate":true},
      {"word":"rebuttal","definition":"A reply that shows why an opposing argument is wrong or weak","example":"In her rebuttal, Maya pointed out that the survey asked only ten people.","level":"challenge","canIntegrate":true},
      {"word":"fallacy","definition":"A mistake in reasoning that makes an argument seem convincing when it is not","example":"Saying everyone does it is a fallacy, not evidence.","level":"challenge","canIntegrate":true},
      {"word":"concede","definition":"To admit that part of the other side's argument is true","example":"Good debaters concede small points to win bigger ones.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'dd1f4327-21d3-5b40-ae76-cd6574647de0', $t$כיתה ג׳ — אנגלית: מילים מבית הספר$t$,
    $t$מילים באנגלית לתלמידים דוברי עברית: הגדרה בעברית ומשפט לדוגמה באנגלית. משחקים על לוח באנגלית.$t$,
    'en', 'grade_3', 'english', 'LC-EN-G3-HE',
    $j$[
      {"word":"school","definition":"בית ספר — המקום שבו לומדים עם מורים וחברים לכיתה","example":"I walk to school with my brother.","level":"support","canIntegrate":true},
      {"word":"teacher","definition":"מורה — האדם שמלמד אותנו בכיתה","example":"Our teacher reads us a story every Friday.","level":"support","canIntegrate":true},
      {"word":"pencil","definition":"עיפרון — כלי כתיבה שאפשר למחוק את מה שכותבים בו","example":"Can I use your pencil?","level":"support","canIntegrate":true},
      {"word":"family","definition":"משפחה — ההורים, האחים והאחיות, הסבים והסבתות","example":"My family eats dinner together.","level":"support","canIntegrate":true},
      {"word":"water","definition":"מים — הנוזל השקוף שאנחנו שותים כשאנחנו צמאים","example":"Drink some water after you run.","level":"support","canIntegrate":true},
      {"word":"play","definition":"לשחק — לעשות משהו בשביל הכיף, למשל משחק או ספורט","example":"Let's play soccer at recess.","level":"support","canIntegrate":true},
      {"word":"student","definition":"תלמיד או תלמידה — מי שלומד בבית הספר","example":"There is a new student in my class.","level":"core","canIntegrate":true},
      {"word":"notebook","definition":"מחברת — דפים כרוכים יחד שכותבים בהם","example":"Write the new words in your notebook.","level":"core","canIntegrate":true},
      {"word":"food","definition":"אוכל — מה שאוכלים כדי לגדול ולקבל כוח","example":"Pizza is my favorite food.","level":"core","canIntegrate":true},
      {"word":"read","definition":"לקרוא — להסתכל על מילים כתובות ולהבין אותן","example":"I like to read comics in bed.","level":"core","canIntegrate":true},
      {"word":"write","definition":"לכתוב — לרשום אותיות ומילים על דף או במחשב","example":"Please write your name at the top.","level":"core","canIntegrate":true},
      {"word":"ruler","definition":"סרגל — כלי ישר למדידה ולציור קווים","example":"Use a ruler to draw a straight line.","level":"core","canIntegrate":true},
      {"word":"lunch","definition":"ארוחת צהריים — הארוחה שאוכלים באמצע היום","example":"We eat lunch at twelve o'clock.","level":"core","canIntegrate":true},
      {"word":"eraser","definition":"מחק — חפץ קטן שמוחק סימני עיפרון","example":"My eraser fell under the desk.","level":"challenge","canIntegrate":true},
      {"word":"homework","definition":"שיעורי בית — משימות שעושים בבית אחרי הלימודים","example":"I finish my homework before I watch TV.","level":"challenge","canIntegrate":true},
      {"word":"classroom","definition":"כיתה — החדר שבו לומדים","example":"Our classroom has big windows.","level":"challenge","canIntegrate":true}
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
