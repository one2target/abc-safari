'use strict';

/* One place for the duration, unlock rule and smart-random tuning. */
const TRAINING_CONFIG=Object.freeze({
  minCompletedLetters:3,
  sessionLength:10,
  answerCount:4,
  coverageRatio:.65,
  maxSameLetterInARow:2,
  hintAfterMistakes:2,
  retryAfterMin:2,
  retryAfterMax:4,
  mistakeWeight:.22,
  skillMistakeWeight:.32,
  balloon:Object.freeze({
    targetHits:4,
    duration:20,
    targetProbability:.38,
    targetMaxWaitMs:2800
  }),
  river:Object.freeze({steps:4}),
  blitz:Object.freeze({questions:5})
});
