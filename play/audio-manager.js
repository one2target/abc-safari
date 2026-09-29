'use strict';
/* AUDIO — one reusable media element, cancelable sequences, recorded voices first.
   iPhone/Safari: the same audio element is explicitly primed from the first user gesture. */
function createAudioManager({assets, enabled=true, debug=false, gap=500}) {
  const player = new Audio();
  player.preload = 'metadata';
  player.id = 'voice-player';
  player.hidden = true;
  player.setAttribute('playsinline', '');
  document.body.appendChild(player);

  // Tiny silent WAV. Calling load() on this source from the first real tap
  // primes the SAME HTMLAudioElement for later programmatic playback on iOS Safari.
  const SILENT_WAV =
    'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

  player.src = SILENT_WAV;

  const warned = new Set();
  let epoch = 0, settle = null, unlocked = false;

  const manager = {
    currentAudio: player,
    queue: [],
    enabled,
    lastInstruction: [],

    unlock() {
      if (unlocked) return;
      // WebKit requires load() or play() to be called once from a user gesture
      // for each audio element. load() is silent and does not interrupt the UI.
      try { player.load(); } catch (_) {}
      unlocked = true;
    },

    stop() {
      epoch++;
      if (settle) settle('cancelled');
      settle = null;
      try { player.pause(); } catch (_) {}
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      manager.queue = [];
    },

    setEnabled(value) {
      manager.enabled = Boolean(value);
      manager.stop();
    },

    play(item) {
      return manager.playSequence([item], {remember:false});
    },

    async playSequence(items, {remember=false}={}) {
      manager.stop();
      const sequence = items.map(item =>
        typeof item === 'string' ? {key:item} : {...item}
      );
      if (remember) manager.lastInstruction = sequence;

      const token = epoch;
      manager.queue = [...sequence];

      if (!active(token)) {
        manager.queue = [];
        return false;
      }

      for (let i=0; i<sequence.length; i++) {
        if (!active(token)) return false;

        const item = sequence[i];

        if (i && !(await pause(item.pauseBefore ?? gap, token))) return false;
        if (!active(token)) return false;

        const file = assets[item.key]?.src;
        const outcome = file ? await playFile(file, token) : 'missing';

        if (!active(token)) return false;

        if (outcome === 'missing') {
          warn(item.key, 'Audio asset is missing');
          if (item.text) {
            await speakFallback(item.text, item.lang || 'ru-RU', token);
          }
        }

        if (token === epoch) manager.queue.shift();
      }

      return active(token);
    },

    repeatLastInstruction() {
      return manager.playSequence(manager.lastInstruction);
    },

    setInstruction(items) {
      return manager.playSequence(items, {remember:true});
    }
  };

  const active = token =>
    token === epoch && unlocked && manager.enabled;

  function warn(key, message) {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn('[Alfie audio]', message, key);
  }

  function pause(ms, token) {
    if (!active(token)) return Promise.resolve(false);

    return new Promise(resolve => {
      let timer;
      const finish = result => {
        clearTimeout(timer);
        if (settle === finish) settle = null;
        resolve(result === true && active(token));
      };
      settle = finish;
      timer = setTimeout(() => finish(true), ms);
    });
  }

  function playFile(src, token) {
    return new Promise(resolve => {
      if (!active(token)) {
        resolve('cancelled');
        return;
      }

      let done = false;
      let watchdog;

      const finish = outcome => {
        if (done) return;
        done = true;
        clearTimeout(watchdog);
        player.onended = null;
        player.onerror = null;
        player.oncanplay = null;
        if (settle === finish) settle = null;
        resolve(outcome);
      };

      settle = finish;

      player.onended = () => finish('ended');
      player.onerror = () => {
        warn(src, 'Audio could not be loaded');
        finish('missing');
      };

      // Shorter watchdog: do not freeze a lesson for 20 seconds on a bad request.
      watchdog = setTimeout(() => {
        warn(src, 'Audio timed out');
        try { player.pause(); } catch (_) {}
        finish('timeout');
      }, 8000);

      player.src = src;

      if (debug) console.log('[Alfie audio]', src);

      try {
        // Calling load() after swapping src makes Safari begin the new resource
        // deterministically instead of waiting for its own preload heuristics.
        player.load();
        const result = player.play();

        if (result?.catch) {
          result.catch(error => {
            if (done || !active(token)) return;

            if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
              warn(src, 'Playback was blocked/interrupted');
              finish('blocked');
            } else {
              warn(src, 'Audio could not be played');
              finish('missing');
            }
          });
        }
      } catch (_) {
        warn(src, 'Audio could not be played');
        finish('blocked');
      }
    });
  }

  function speakFallback(text, lang, token) {
    if (!active(token) || !('speechSynthesis' in window)) {
      return Promise.resolve(false);
    }

    return new Promise(resolve => {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.lang = lang;
      utterance.rate = .82;

      const voices = synth.getVoices();
      const voice =
        voices.find(v => v.lang === lang && v.localService) ||
        voices.find(v => v.lang === lang) ||
        voices.find(v => v.lang.startsWith(lang.slice(0,2)));

      if (voice) utterance.voice = voice;

      let done = false;
      let watchdog;

      const finish = result => {
        if (done) return;
        done = true;
        clearTimeout(watchdog);
        if (settle === finish) settle = null;
        resolve(result === true);
      };

      settle = finish;
      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);

      watchdog = setTimeout(() => {
        finish(false);
        if (token === epoch) synth.cancel();
      }, Math.max(5000, text.length * 150));

      try {
        synth.speak(utterance);
      } catch (_) {
        finish(false);
      }
    });
  }

  return manager;
}

/* Short gameplay effects use their own preloaded players. They must not be
   cancelled when the voice manager advances to the next instruction. */
function createSoundEffectManager({assets, keys=[], enabled=true, debug=false}) {
  const warned = new Set();
  const players = new Map();
  let unlocked = false;

  function warn(key, message, error) {
    const signature = `${key}:${message}`;
    if (warned.has(signature)) return;
    warned.add(signature);
    console.warn('[Alfie effects]', message, key, error || '');
  }

  for (const key of keys) {
    const src = assets[key]?.src;
    if (!src) {
      warn(key, 'Audio asset is missing');
      continue;
    }
    const player = new Audio();
    player.preload = 'auto';
    player.setAttribute('playsinline', '');
    player.src = src;
    player.onerror = () => warn(key, 'Audio could not be loaded');
    players.set(key, player);
    try { player.load(); } catch (error) { warn(key, 'Audio could not be preloaded', error); }
  }

  const manager = {
    players,
    enabled: Boolean(enabled),

    unlock() {
      if (unlocked) return;
      // Re-loading from the first gesture primes every distinct element on
      // mobile Safari without producing a sound.
      for (const [key, player] of players) {
        try { player.load(); } catch (error) { warn(key, 'Audio could not be unlocked', error); }
      }
      unlocked = true;
    },

    setEnabled(value) {
      manager.enabled = Boolean(value);
      if (!manager.enabled) manager.stopAll();
    },

    stopAll() {
      for (const player of players.values()) {
        try {
          player.pause();
          player.currentTime = 0;
        } catch (_) {}
      }
    },

    play(key) {
      if (!manager.enabled || !unlocked) return Promise.resolve(false);
      const player = players.get(key);
      if (!player) {
        warn(key, 'Audio asset is missing');
        return Promise.resolve(false);
      }
      try {
        // One player per effect prevents the same sound from piling up while
        // still allowing a landing effect to overlap the end of a jump.
        player.pause();
        player.currentTime = 0;
        if (debug) console.log('[Alfie effects]', player.src);
        const result = player.play();
        return result?.then ? result.then(() => true).catch(error => {
          warn(key, 'Audio could not be played', error);
          return false;
        }) : Promise.resolve(true);
      } catch (error) {
        warn(key, 'Audio could not be played', error);
        return Promise.resolve(false);
      }
    }
  };

  return manager;
}
