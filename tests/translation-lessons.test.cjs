const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createContext}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const assetSource=fs.readFileSync(path.join(root,'play/assets.js'),'utf8');
const words=[
 ['A','Apple','Яблоко','apple'],
 ['B','Ball','Мяч','ball'],
 ['C','Cat','Кошка','cat'],
 ['D','Dog','Собака','dog'],
 ['E','Egg','Яйцо','egg'],
 ['F','Fish','Рыба','fish'],
 ['G','Goat','Коза','goat'],
 ['H','Hat','Шляпа','hat'],
 ['I','Iguana','Игуана','iguana'],
 ['J','Juice','Сок','juice'],
 ['K','Kite','Воздушный змей','kite'],
 ['L','Lion','Лев','lion'],
 ['M','Monkey','Обезьяна','monkey'],
 ['N','Nest','Гнездо','nest'],
 ['O','Octopus','Осьминог','octopus'],
 ['P','Panda','Панда','panda'],
 ['Q','Queen','Королева','queen'],
 ['R','Rabbit','Кролик','rabbit'],
 ['S','Sun','Солнце','sun'],
 ['T','Tiger','Тигр','tiger'],
 ['U','Umbrella','Зонт','umbrella'],
 ['V','Van','Фургон','van'],
 ['W','Whale','Кит','whale'],
 ['X','Fox','Лиса','fox'],
 ['Y','Yo-yo','Йо-йо','yoyo'],
 ['Z','Zebra','Зебра','zebra']
];
const ghiAudio={G:['g_name','g_sound','g_goat','goat','goat_ru'],H:['h_name','h_sound','h_hat','hat','hat_ru'],I:['i_name','i_sound','i_iguana','iguana','iguana_ru']};
const newAudio={
 J:['j_name','j_sound','j_juice','juice','juice_ru'],K:['k_name','k_sound','k_kite','kite','kite_ru'],L:['l_name','l_sound','l_lion','lion','lion_ru'],
 M:['m_name','m_sound','m_monkey','monkey','monkey_ru'],N:['n_name','n_sound','n_nest','nest','nest_ru'],O:['o_name','o_sound','o_octopus','octopus','octopus_ru'],
 P:['p_name','p_sound','p_panda','panda','panda_ru'],Q:['q_name','q_sound','q_queen','queen','queen_ru'],R:['r_name','r_sound','r_rabbit','rabbit','rabbit_ru'],
 S:['s_name','s_sound','s_sun','sun','sun_ru'],T:['t_name','t_sound','t_tiger','tiger','tiger_ru'],U:['u_name','u_sound','u_umbrella','umbrella','umbrella_ru'],
 V:['v_name','v_sound','v_van','van','van_ru'],W:['w_name','w_sound','w_whale','whale','whale_ru'],X:['x_name','x_sound','x_fox','fox','fox_ru'],
 Y:['y_name','y_sound','y_yoyo','yoyo','yoyo_ru'],Z:['z_name','z_sound','z_zebra','zebra','zebra_ru']
};
const newSounds={J:'dʒ',K:'k',L:'l',M:'m',N:'n',O:'ɒ',P:'p',Q:'kw',R:'r',S:'s',T:'t',U:'ʌ',V:'v',W:'w',X:'ks',Y:'j',Z:'z'};
const fakeButton=answer=>`({dataset:{answer:'${answer}'},classList:{add(){},remove(){}},focus(){}})`;

(async()=>{
 const audioRegistrySource=assetSource.split('"audio": {')[1].split('\n  },\n  "images"')[0];
 const audioRegistryKeys=[...audioRegistrySource.matchAll(/^    "([^"]+)": \{$/gm)].map(match=>match[1]);
 assert.equal(audioRegistryKeys.length,new Set(audioRegistryKeys).size,'duplicate audio registry key');
 assert.equal(new Set(Object.values(newAudio).flat()).size,85);
 for(const [,word,,key] of words){
  const file=path.join(root,'play/audio',`${key}_ru.mp3`);
  assert.ok(fs.existsSync(file),`${word}: missing ${key}_ru.mp3`);
  assert.ok(fs.statSync(file).size>1000,`${word}: empty Russian audio`);
 }
 for(const keys of Object.values(newAudio))for(const key of keys){
  const file=path.join(root,'play/audio',`${key}.mp3`);
  assert.ok(fs.existsSync(file),`missing ${key}.mp3`);
  assert.ok(fs.statSync(file).size>1000,`empty ${key}.mp3`);
 }

 const data=createContext();
 assert.equal(data.run('STORAGE_KEY'),'alfie-abc-v1');
 assert.equal(data.run('AppState.version'),3);
 for(const [letter,word,translation,key] of words){
  assert.equal(data.run(`byLetter.get('${letter}').translation`),translation);
  assert.equal(data.run(`byLetter.get('${letter}').translationAudio`),`./audio/${key}_ru.mp3`);
  assert.equal(data.run(`byLetter.get('${letter}').word`),word);
  assert.deepEqual(
   JSON.parse(data.run(`JSON.stringify(lessonSteps(byLetter.get('${letter}')).map(step=>step.id))`)),
   ['letter','word','wordMeaning','translationPicture','find','letterPicture','pictureLetter']
  );
 }
 for(const [letter,keys] of Object.entries({...ghiAudio,...newAudio}))for(const key of keys)assert.equal(data.run(`MEDIA_ASSETS.audio.${key}.src`),`./audio/${key}.mp3`,`${letter}: ${key}`);
 for(const [letter,sound] of Object.entries(newSounds))assert.equal(data.run(`byLetter.get('${letter}').sound`),sound,`${letter}: sound`);
 assert.equal(data.run("byLetter.get('G').letterWordAudio"),'./audio/g_goat.mp3');
 assert.equal(data.run("byLetter.get('H').letterWordAudio"),'./audio/h_hat.mp3');
 assert.equal(data.run("byLetter.get('I').letterWordAudio"),'./audio/i_iguana.mp3');
 assert.equal(data.run("byLetter.get('I').sound"),'ɪ');
 assert.equal(data.run("enName(byLetter.get('I')).key"),'i_name');
 assert.equal(data.run("enSound(byLetter.get('I')).key"),'i_sound');
 assert.equal(data.run("byLetter.get('X').word"),'Fox');
 assert.equal(data.run("byLetter.get('X').wordLetterPosition"),'end');
 assert.equal(data.run("renderWordLabel(byLetter.get('X'))"),'Fo<strong>x</strong>');
 assert.ok(data.run("questionPrompt({type:'pictureLetter',letter:'X'})").includes('Fox'));
 assert.ok(!data.run("questionPrompt({type:'pictureLetter',letter:'X'})").includes('начинается'));
 assert.equal(data.run("byLetter.get('Y').word"),'Yo-yo');
 assert.equal(data.run("enLetterWord(byLetter.get('Y')).key"),'y_yoyo');
 assert.equal(data.run("enWord(byLetter.get('Y')).key"),'yoyo');
 assert.equal(data.run("translatedWord(byLetter.get('Y')).key"),'yoyo_ru');
 assert.deepEqual(JSON.parse(data.run("JSON.stringify(['G','H','I'].map(letter=>({image:byLetter.get(letter).image,emoji:byLetter.get(letter).emoji})))")),[
  {image:null,emoji:'🐐'},{image:null,emoji:'🎩'},{image:null,emoji:'🦎'}
 ]);

 for(const [index,key] of [[6,'g_goat'],[7,'h_hat'],[8,'i_iguana']]){
  const wordCue=createContext();
  wordCue.run(`begin();stopAudio();AppState.cursor={phase:'lesson',index:${index},step:1};showScreen()`);
  await wordCue.tick(1200);
  assert.deepEqual(wordCue.played.slice(-2).map(item=>item.src),['./audio/13_listen_word.mp3',`./audio/${key}.mp3`]);
 }
 const iCue=createContext();
 iCue.run("AppState.cursor={phase:'lesson',index:8,step:0};begin()");
 await iCue.tick(2600);
 assert.deepEqual(iCue.played.map(item=>item.src),['./audio/03_new_letter.mp3','./audio/i_name.mp3','./audio/i_sound.mp3','./audio/iguana.mp3']);
 assert.deepEqual(
  JSON.parse(data.run(`JSON.stringify(lessonSteps({emoji:'🦒',wordAudio:'./audio/game.mp3',translationAudio:'./audio/game_ru.mp3'}).map(step=>step.id))`)),
  ['letter','word','wordMeaning','translationPicture','find','letterPicture','pictureLetter']
 );
 assert.deepEqual(
  JSON.parse(data.run(`JSON.stringify(lessonSteps({emoji:'🦒',wordAudio:'./audio/game.mp3',translationAudio:null}).map(step=>step.id))`)),
  ['letter','word','find','letterPicture','pictureLetter']
 );

 const meaning=createContext();
 meaning.run('begin();AppState.cursor.step=2;showScreen()');
 await meaning.tick(1000);
 const meaningHTML=meaning.nodes.get('#main').innerHTML;
 assert.ok(meaningHTML.includes('data-word-meaning'));
 assert.ok(meaningHTML.includes('🍎'));
 assert.ok(meaningHTML.includes('APPLE'));
 assert.ok(!meaningHTML.includes('Яблоко'));
 assert.deepEqual(meaning.played.slice(-2).map(item=>item.src),['./audio/apple.mp3','./audio/apple_ru.mp3']);
 const repeatStart=meaning.played.length;
 meaning.run('repeatInstruction()');
 await meaning.tick(1000);
 assert.deepEqual(meaning.played.slice(repeatStart).map(item=>item.src),['./audio/apple.mp3','./audio/apple_ru.mp3']);
 assert.equal(meaning.spoken.length,0);

 const quiz=createContext();
 quiz.run('begin();AppState.cursor.step=3;showScreen()');
 await quiz.tick(10);
 const quizHTML=quiz.nodes.get('#main').innerHTML;
 assert.ok(quizHTML.includes('data-translation-quiz'));
 assert.equal((quizHTML.match(/class="choice translation-choice"/g)||[]).length,3);
 assert.equal((quizHTML.match(/data-answer="A"/g)||[]).length,1);
 assert.ok(quizHTML.includes('APPLE'));
 for(const [,,translation] of words)assert.ok(!quizHTML.includes(translation));
 assert.equal(quiz.played.at(-1).src,'./audio/apple.mp3');

 const positions=new Set();
 for(let i=0;i<80;i++)positions.add(data.run(`createQuestion(TRANSLATION_TYPE,letters[0],letters,true).options.indexOf('A')`));
 assert.ok(positions.size>1,'correct picture position should be shuffled');

 const wrong=createContext();
 wrong.run(`begin();AppState.cursor.step=3;showScreen();var wrongStats=JSON.stringify(AppState.stats);checkAnswer(${fakeButton('B')})`);
 assert.equal(wrong.run('AppState.cursor.step'),3);
 assert.equal(wrong.run('JSON.stringify(AppState.stats)'),wrong.run('wrongStats'));
 assert.equal(wrong.played.some(item=>item.src==='./audio/apple_ru.mp3'),false);
 assert.equal(wrong.played.at(-1).src,'./audio/15_try_again.mp3');
 await wrong.tick(700);
 assert.equal(wrong.run('answerLocked'),false);
 assert.equal(wrong.run('AppState.cursor.step'),3);

 const correct=createContext();
 correct.run(`begin();AppState.cursor.step=3;showScreen();var correctStats=JSON.stringify(AppState.stats);checkAnswer(${fakeButton('A')})`);
 assert.equal(correct.run('AppState.cursor.step'),4);
 assert.equal(correct.run('JSON.stringify(AppState.stats)'),correct.run('correctStats'));
 assert.equal(correct.played.at(-1).src,'./audio/apple_ru.mp3');
 assert.equal(correct.played.filter(item=>item.src==='./audio/apple_ru.mp3').length,1);
 await correct.tick(1100);
 assert.equal(correct.run('answerLocked'),false);
 assert.equal(correct.run('currentLessonStep().type'),'find');

 const muted=createContext();
 muted.run('begin();toggleSound();AppState.cursor.step=3;showScreen()');
 const mutedStart=muted.played.length;
 muted.run(`checkAnswer(${fakeButton('A')})`);
 await muted.tick(1100);
 assert.equal(muted.run('AppState.cursor.step'),4);
 assert.equal(muted.played.length,mutedStart);

 const legacyBase=createContext();
 const legacy=JSON.parse(legacyBase.run('JSON.stringify(AppState)'));
 legacy.version=2;
 legacy.started=true;
 legacy.cursor={phase:'lesson',index:0,step:2};
 legacy.question={type:'find',letter:'A',options:['A','M','S'],hadMistake:false,serial:0};
 const migrated=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});
 assert.equal(migrated.run('AppState.version'),3);
 assert.equal(migrated.run('AppState.cursor.step'),4);
 assert.equal(migrated.run('AppState.question.type'),'find');

 console.log(JSON.stringify({
  passed:true,
  translations:words.length,
  newAudioFiles:Object.values(newAudio).flat().length,
  combinedWordCues:['g_goat','h_hat','i_iguana'],
  iPhonicsSound:'i_sound.mp3 /ɪ/',
  lessonStepsPerLetter:7,
  meaningSequence:['english','pause','russian'],
  quizChoices:3,
  shuffledCorrectPosition:true,
  wrongAnswerNoProgress:true,
  correctRussianAudio:true,
  mute:true,
  legacyStepMigration:'2 -> 4',
  noTranslationTTS:true
 },null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
