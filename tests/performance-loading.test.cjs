const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createContext } = require('./support/trainer-harness.cjs');

const root = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'play/index.html'), 'utf8');
const audioSource = fs.readFileSync(path.join(root, 'play/audio-manager.js'), 'utf8');

test('late mini-game images are wired only for the active course phase', () => {
  assert.match(indexSource, /function wireActiveGameAssets\(\)/);
  assert.match(indexSource, /AppState\.cursor\.phase==='fruit_rain'/);
  assert.match(indexSource, /AppState\.cursor\.phase==='bubble_cannon'/);
  assert.match(indexSource, /AppState\.cursor\.phase==='treehouse_stu'/);
  assert.doesNotMatch(
    indexSource,
    /wireMedia\(\);wireFruitRainAssets\(\);wireBubbleCannonAssets\(\);wireTreehouseAssets\(\)/
  );
  for (const game of ['FruitRain', 'BubbleCannon', 'Treehouse']) {
    assert.match(indexSource, new RegExp(
      `function wire${game}Assets\\(root=document\\)\\{const images=\\[\\.\\.\\.root\\.querySelectorAll`
    ));
  }
});

test('start does not warm feedback stickers before the first assignment', () => {
  const begin = indexSource.match(/function begin\(\)\{[^}]+\}/)?.[0] || '';
  assert.ok(begin);
  assert.doesNotMatch(begin, /preloadFeedbackStickers/);
  assert.doesNotMatch(indexSource, /function preloadFeedbackStickers/);
});

test('river WAV effects stay network-lazy through the first audio unlock', async () => {
  const app = createContext();
  assert.equal(app.loaded.length, 0);

  app.run('unlockAudio()');
  assert.equal(app.loaded.length, 1 + app.run('RIVER_EFFECT_KEYS.length'));
  assert.ok(app.loaded.every(item => item.src.startsWith('data:audio/wav;base64,')));

  app.run("EffectsManager.play('river_correct')");
  await app.micro();
  assert.match(app.loaded.at(-1).src, /river-correct\.wav\?v=/);
  assert.match(app.played.at(-1).src, /river-correct\.wav\?v=/);
  assert.match(audioSource, /player\.preload = 'none'/);
});

test('voice waits for a prepared Blob, retries network errors and keeps stale sequences cancelable', () => {
  assert.match(audioSource, /loader\.prepareAudio\(src/);
  assert.match(audioSource, /retries:1/);
  assert.match(audioSource, /playableSource\.startsWith\('blob:'\)/);
  assert.match(audioSource, /armWatchdog\(8000\)/);
  assert.match(audioSource, /player\.onplaying = \(\) =>/);
  assert.match(audioSource, /\['missing', 'playback-timeout'\]\.includes\(outcome\)/);
  assert.doesNotMatch(audioSource, /armWatchdog\(3500\)/);
});

test('prepared voice bytes are handed to the media element without a second network URL', async () => {
  const app = createContext();
  app.run("globalThis.ResourceLoader={prepareAudio:async src=>'blob:prepared-'+src}");
  app.run("unlockAudio();AudioManager.play({key:'new_letter'})");
  await app.micro();
  assert.match(app.played.at(-1).src,/^blob:prepared-\.\/audio\/03_new_letter\.mp3$/);
  assert.equal(app.warnings.length,0);
});
