const assert=require('node:assert/strict');
const {createContext}=require('./support/trainer-harness.cjs');

const app=createContext();
app.run("AppState.started=true;AppState.stats.A.skills=['find'];AppState.stats.A.mastery=1;AppState.student.starBalance=7;saveProgress()");
const stateBefore=app.run('JSON.stringify(AppState)');
const homeMarkup=app.run('renderHome()');

assert.ok(homeMarkup.includes('Продолжить'));
assert.ok(homeMarkup.includes('Мой Мариус'));
assert.ok(homeMarkup.includes('Тренировка'));
assert.ok(homeMarkup.includes('⚙ Настройки'));
assert.ok(!homeMarkup.includes('Начать заново'));
assert.ok(homeMarkup.indexOf('data-action="start-training"')<homeMarkup.indexOf('data-action="settings"'));

app.run('showSettings()');
let modal=app.nodes.get('#modal-layer').innerHTML;
assert.ok(modal.includes('settings-modal'));
assert.ok(modal.includes('Настройки'));
assert.ok(modal.includes('Сбросить прогресс'));
assert.ok(!modal.includes('data-action="confirm-reset"'));
assert.equal(app.run('JSON.stringify(AppState)'),stateBefore,'opening settings must not reset progress');

app.run('showReset()');
modal=app.nodes.get('#modal-layer').innerHTML;
assert.ok(modal.includes('Сбросить весь прогресс?'));
assert.ok(modal.includes('Изученные буквы, награды и прогресс обучения будут удалены.'));
assert.ok(modal.includes('data-action="close-modal">Отмена'));
assert.ok(modal.includes('class="danger-button" data-action="confirm-reset">Сбросить'));
assert.equal(app.run('JSON.stringify(AppState)'),stateBefore,'opening confirmation must not reset progress');

app.run('closeModal()');
assert.equal(app.nodes.get('#modal-layer').hidden,true);
assert.equal(app.run('JSON.stringify(AppState)'),stateBefore,'cancelling must preserve progress');

app.run('showSettings();showReset();resetProgress()');
assert.equal(app.run('AppState.started'),false);
assert.equal(app.run('AppState.stats.A.mastery'),0);
assert.equal(app.run('AppState.student.starBalance'),0);
assert.equal(app.nodes.get('#modal-layer').hidden,true);

console.log(JSON.stringify({
  passed:true,
  homeOrder:['Продолжить','Мой Мариус','Тренировка','Настройки'],
  twoStepReset:true,
  cancelPreservesProgress:true,
  existingResetFunction:true,
  destructiveActionStyled:true
},null,2));
