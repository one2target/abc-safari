# ABC Safari — Project map

Карта объединённого проекта: корневой лендинг и тренажёр A–Z в play/. Оба используют обычные HTML, CSS и JavaScript. Все пути ниже — относительно корня этого Git-репозитория. Основная логика и стили находятся в `play/index.html`; ищите по именам функций и CSS-селекторам. Отдельных каталогов компонентов, сборщика и серверной части нет.

## 1. Project entry points

| File | Purpose |
| --- | --- |
| `index.html` | Лендинг ABC Safari из prototype_v3; TRAINER_URL и четыре data-trainer-link ведут на /play/. |
| `play/index.html` | HTML-каркас, общий `<style>`, данные курса и основной встроенный `<script>`. В конце запускается `showScreen()`. |
| `play/assets.js` | Глобальный `MEDIA_ASSETS`: пути аудио и активных изображений, размеры изображений. Загружается до логики приложения. |
| `play/find-object-scenes.js` | Каталог данных find-object сцен; текущая конфигурация `FIND_OBJECT_SCENES.mariusRoomABC`. |
| `play/hidden-object-game.js` | Универсальные правила, state API, валидация и HTML-шаблон `HiddenObjectGame`. |
| `play/hidden-object-game.css` | Общий адаптивный layout find-object сцен, прозрачные кнопки, подсказки и debug-границы. |
| `play/letter-maze-scenes.js` | Три вертикальных фона D/E/F, индивидуальные процентные клетки/соседства/маршруты и точки letter/word. |
| `play/letter-maze-game.js` | Переиспользуемые правила, state API, геометрия активного раунда, следующая точка, автопроход, валидация и HTML-шаблон. |
| `play/letter-maze-game.css` | Mobile-first вертикальный layout, буквы/SVG на камнях и перемещение общего character stack. |
| `play/balloon-pop-game.js` | Чистые правила трёх этапов G/H/I, генерация безопасного поля и HTML Balloon Pop. |
| `play/balloon-pop-game.css` | Mobile-first игровое поле, движение, pop/shake/hint, частицы и short-height layout. |
| `play/river-crossing-game.js` | Чистые правила 12 заданий J/K/L, четыре этапа, restore, пороги переправы и HTML «Переправы Мариуса». |
| `play/river-crossing-game.css` | Вертикальная mobile-first сцена, пять платформ, три крупные кнопки, прыжок, посадка, сундук и landscape layout. |
| `play/training-config.js` | Единые параметры разблокировки, длины сессии, smart random, шариков, переправы и блица. |
| `play/training-state.js` | Восстановление и запись отдельной тренировочной статистики внутри существующего AppState. |
| `play/training-engine.js` | Чистая сборка вариативной сессии, взвешенный выбор, покрытие пула, distractors и отложенный повтор после ошибки. |
| `play/training.css` | Адаптивные стили CTA на главной, быстрых заданий, блица и итогов тренировки. |
| `play/audio-manager.js` | `createAudioManager()`: воспроизведение записей и речевой fallback. Загружается после каталога ресурсов. |
| `play/manifest.webmanifest` | Название приложения, запуск, область действия, цвета и иконки для установки на домашний экран. |
| `README.md` | Запуск, пользовательские сценарии и описание сохранений. |

## 2. Repository structure

```text
/
├── index.html              # лендинг, адрес /
├── play/                   # тренажёр, адрес /play/
│   ├── index.html
│   ├── assets.js
│   ├── audio-manager.js
│   ├── find-object-scenes.js
│   ├── hidden-object-game.js
│   ├── hidden-object-game.css
│   ├── letter-maze-scenes.js
│   ├── letter-maze-game.js
│   ├── letter-maze-game.css
│   ├── balloon-pop-game.js
│   ├── balloon-pop-game.css
│   ├── river-crossing-game.js
│   ├── river-crossing-game.css
│   ├── training-config.js
│   ├── training-state.js
│   ├── training-engine.js
│   ├── training.css
│   ├── manifest.webmanifest
│   ├── icon-180.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── images/
│   │   └── stickers/
│   └── audio/
├── .nojekyll
├── README.md
├── TESTS.md
├── UPDATE-REPORT.md
├── STICKER-UPDATE.md
└── PROJECT_MAP.md
```

`AGENTS.md` на момент создания карты в репозитории отсутствует. `TESTS.md` описывает проверки, но упомянутые в нём скрипты `work/verify-*.cjs` не входят в этот Git-репозиторий.

## 3. UI

Интерфейс тренажёра — в `play/index.html`. Лендинг имеет собственные стили и скрипт в корневом `index.html`.

- Каркас: `.topbar`, `#main`, `.footer`, `#modal-layer`, `#confetti`.
- Экраны: `renderHome()`, `renderCourse()`, `renderTraining()`, `renderWardrobe()`, `renderReward()`, `renderResults()`. Учебные экраны: `renderLearnLetter()`, `renderWordScreen()`, `renderWordMeaningCard()`, `renderTranslationQuiz()`, `questionBody()`, `renderInterlude()`.
- Навигация: `view`, `lastView`, `go()`, `showScreen()`, `openProgress()`. Маршрутизация переключает содержимое `#main`; URL-роутера нет.
- Действия: объект `actions` и делегированный обработчик `document` для кнопок с `data-action` / `data-answer`; кнопки верхней панели имеют отдельные обработчики.
- Кнопки и карточки: `.primary`, `.secondary`, `.icon-button`, `.choice`, `.outfit-option`; карточки одежды строит `outfitOptions()`.
- Модальные окна: `openModal()`, `closeModal()`, `showReset()`, `showParentGate()`, `renderParentView()`; здесь же управление фокусом, Escape и родительский доступ по удержанию.
- Общие стили: начальный `<style>`, переменные `:root`. Responsive: блоки `@media` для 760/650/350 px, коротких экранов и landscape. Дополнительные правила персонажа/гардероба расположены ближе к концу `<style>`; учитывать порядок переопределений.

## 4. Exercise system

Всё в `play/index.html`:

- `letters` — A–Z, слова, русские значения, звуки, emoji, цвета, отвлекающие буквы и привязки английского/русского аудио. `audioWordKey:'yoyo'` отделяет интерфейсное Yo-yo от имён файлов без дефиса; `wordLetterPosition:'end'` у X/Fox запрещает формулировки про первую букву.
- `lessonSteps()` строит урок из данных буквы: знакомство, английское слово, карточка значения, `translationPicture`, затем прежние три упражнения. Если visual, английская или русская запись отсутствует, два шага значения не добавляются.
- `CORE_TYPES` — `find`, `letterPicture`, `pictureLetter`; `TRANSLATION_TYPE` — отдельная проверка значения без влияния на mastery; старые `MINI_TYPES` и A–I mini-flow сохранены. `REVIEW_TYPES` задаёт шесть типов новых review, включая `soundLetter`, внутри того же question UI.
- `LOCAL_REVIEW_BLOCKS` описывает JKL, MNO, PQR, STU, VWX, YZ; `CUMULATIVE_REVIEW_BLOCKS` — A–O, A–U, A–Z. Каждый блок содержит шесть вопросов.
- После завершения L перед существующим `review_JKL` запускается фаза `river_jkl`: 12 вопросов на названия, звуки, слова Juice/Kite/Lion и смешанный финал. Ошибка не двигает прогресс, а каждые два правильных ответа переводят Мариуса на следующую точку маршрута.
- `startGame()` обслуживает прежние mini; `startReview()` создаёт новый local/cumulative review. В cumulative выбираются шесть уникальных целей: две случайные из последнего блока и четыре случайные из более раннего изученного диапазона. `gamePool()` оставляет весь диапазон доступным для вариантов ответа.
- `ensureQuestion()` восстанавливает подходящий вопрос либо вызывает `createQuestion()`; `validQuestion()` проверяет структуру сохранённого вопроса.
- `questionPrompt()` / `questionBody()` выводят вопрос и варианты.
- `completedTrainingLetters()` использует существующий `mastery === 3`; `TrainingEngine` получает только этот пул. Сессия из 10 этапов содержит 7 быстрых заданий, Balloon Pop, 4-шаговую переправу и блиц из 5 вопросов. Адаптеры передают динамические конфигурации существующим `BalloonPopGame` и `RiverCrossingGame`.
- `checkAnswer()` сравнивает `button.dataset.answer` с `q.letter`, запускает реакцию и блокирует повторное нажатие. В прежних упражнениях ошибка вызывает `registerMistake()`, а успех — `registerCorrectAnswer()`; meaning quiz даёт мягкий retry без статистического штрафа, а при успехе проигрывает русское слово и переходит к прежним упражнениям.
- Переходы: `nextLessonStep()`, `advanceAfterLetter()`, `advanceAfterMini()`, `advanceAfterReview()`, `completeQuestion()`, затем `go()` / `showScreen()`.

## 5. Progress and state

`play/index.html`: `initialState()`, `AppState`, `loadProgress()`, `saveProgress()`, `resetProgress()`.

- `cursor` хранит `phase`, индекс буквы и шаг. К прежним фазам добавлены `reviewIntro`, `review`, `reviewResult`, `cumulativeIntro`, `cumulative`, `cumulativeResult`; `results` теперь открывается после `cumulative_review_AZ`.
- `stats` по каждой букве: `attempts`, `correct`, `mistakes`, `mastery`, `skills`, `practiceDebt`. Итоги для родителей вычисляет `renderParentView()`.
- `game`, `question`, `reviews`, `questionSerial` сохраняют позицию обычных заданий; `balloonPop` хранит phase/target/score/quickOrder/completion; `riverCrossing` хранит 12 созданных вопросов, текущий индекс, число правильных ответов, ошибки текущего задания и completion; `training` хранит активную сессию, историю и адаптивную статистику `letterName` / `sound` / `word`; `started`, `completed`, `soundEnabled` — общие флаги.
- Награды: `characterState.ownedItems`, стандартные слоты `characterState.equipped`, `completedBlocks`, `claimedRewards`, `rewardFlow`.
- `localStorage`: `alfie-abc-v1`; при `?demo=1` — отдельный `alfie-abc-demo-v1`. Общая версия состояния остаётся 3; загрузчик принимает версии 1–3. Для сохранений v1/v2 прежние lesson steps 2–4 сдвигаются на два места. Завершённое A–F продолжает с G, завершённое A–I или сохранение в прежнем финале — с J; статистика, `completedBlocks`, inventory и экипировка сохраняются. Новые `game.poolLetters` / `game.letterOrder` восстанавливают точную позицию review. Инвентарь отдельно мигрирует `migrateRewards()` с `REWARD_STATE_VERSION = 3`.
- При невозможности записи состояние остаётся в памяти вкладки, показывается `#storage-notice`. Сохранение также вызывается при скрытии страницы и `pagehide`. Сброс сохраняет настройку звука.
- `view`, блокировки, таймеры и история выбора стикеров — временные переменные вне сохранения.

## 6. Rewards

`play/index.html`: `ITEM_SLOTS`, `ITEMS`, `itemCatalog`, `rewardConfig`, `finishBlock()`, `ensureRewardFlow()`, `chooseReward()`, `continueReward()`.

`ITEMS` — независимый каталог предметов с `id`, `name`, `slot`, `asset`, `collection` и необязательной иконкой. `rewardConfig` содержит только условия награды и `itemIds`. После A–C и мини-игры выбирается одна куртка; после D–F/лабиринта — один аксессуар; после G–H–I, пяти вопросов review и Balloon Pop — одна шляпа. Завершение Balloon Pop сохраняется раньше награды; только success-кнопка открывает прежний reward flow. `chooseReward()` вызывает общие `unlockItem()` / `equipItem()`. Альтернативный предмет остаётся закрытым.

Общие операции: `getItemById()`, `isItemOwned()`, `unlockItem()`, `equipItem()`, `unequipItem()`, `getEquippedItem()`, `loadProgress()`, `saveProgress()`. Поддерживаемые слоты: `outfit`, `head`, `face`, `hand_left`, `hand_right`, `back`, `extra`, `background`.

Звезда буквы в `letterStrip()` соответствует `mastery === 3`: освоены три базовых типа заданий. `celebrate()` создаёт конфетти; `renderInterlude()` и `renderResults()` показывают праздничные звёзды. Отдельных очков, валюты, покупок, счётчика серий ответов или каталога достижений нет.

## 7. Marius

- `play/images/`: полные варианты `giraffe_base.png`, `giraffe_jacket_*.png`; сцены `background_*.png`. Подключение — `play/assets.js` и `characterConfig` в `play/index.html`.
- `renderCharacter()` — единственный renderer inventory-совместимой позы. Он выводит экипировку на главной, в гардеробе, при награде, в итогах, на экранах знакомства с буквой/словом и во вводных/итоговых экранах mini/final. `buddy()` — только компактная обёртка над ним без фона; отдельного состояния персонажа у экранов нет.
- Реакции находятся в `play/images/stickers/`: `marius_success_01.png` … `marius_success_09.png`, `marius_retry_01.png`. Эти пути формируются прямо в `play/index.html`, вне `MEDIA_ASSETS`.
- `SUCCESS_STICKERS`, `RETRY_STICKER`, `pickSuccessSticker()` выбирают реакцию без повторения успешного стикера подряд. `showAnswerFeedback()` вызывается из `checkAnswer()`; `renderCompletionSticker()` — из `renderInterlude()` при завершении буквы.
- `prepareFeedbackSticker()` управляет загрузкой/ошибкой; `preloadFeedbackStickers()` запускает фоновую загрузку после начала игры. Внешний вид — `.feedback-sticker`, `.completion-sticker`, анимации `feedback-pop` / `feedback-soft`.
- Сюжетные изображения не используют inventory overlays: цельная сцена `marius-room-abc.png`, success/retry/completion stickers и три иллюстрации лендинга `marius-captain.png`, `marius-traveler.png`, `marius-surfer.png`. У них другие позы, размеры и системы координат.

## 8. Clothing and accessories

Система реализована в `play/index.html` и использует ресурсы `play/images/`, зарегистрированные в `play/assets.js`.

- База — `play/images/giraffe_base.png`. Куртки — полные изображения `giraffe_jacket_stars.png` / `giraffe_jacket_racer.png`, заменяющие базу.
- Прозрачные аксессуары — `play/images/accessory_bouquet.png`, `play/images/accessory_balloon.png`; head overlays — `play/images/marius_hat_straw_bow.png`, `play/images/marius_hat_adventure.png`; иконки карточек курток — `play/images/reward_icon_jacket_*.png`.
- `renderCharacter(scene, options)` получает предметы стандартных слотов из каталога. `outfit` заменяет полный вариант жирафика, потому что обе активные куртки являются готовыми full-body PNG, а остальные wearable-слоты выводятся прозрачными слоями на том же холсте. `includeBackground:false` создаёт компактный игровой stack и намеренно не применяет inventory-слот `background` к упражнениям.
- Системный порядок `CHARACTER_LAYER_ORDER`: background отдельно → back → body/outfit → face → head → hand_left → hand_right → extra. `renderCharacter()` передаёт выбранные asset keys Canvas compositor в этом порядке; CSS z-index между предметами не используется.
- Большой текущий skin — один `.marius-composite` с intrinsic-размером 1024×1536. Общая для reward и остальных inventory-совместимых экранов функция `renderMariusComposite()` дожидается всех PNG, вызывает `clearRect(0,0,1024,1536)`, затем рисует BODY и overlays только через `drawImage(image,0,0,1024,1536)`. CSS масштабирует уже готовый canvas целиком.
- `characterState.ownedItems` хранит владение; `characterState.equipped` всегда содержит все восемь слотов. Обе куртки занимают `outfit`, букет и шарик — `hand_right`, обе новые шляпы — `head`. Выбранную шляпу можно снять и снова надеть через `outfitOptions()` / `renderWardrobe()`; альтернативная награда остаётся locked.
- Старые `play/images/jacket_*.png` и `play/images/headwear_*.png` остаются в каталоге, но не подключены через `MEDIA_ASSETS`; старые идентификаторы учитывает `migrateRewards()`.

Новый экран с совместимой основной позой должен вызывать `renderCharacter()`; для декоративного компактного Мариуса внутри упражнения — `buddy('inline')` или `buddy('interlude')`. Не создавать отдельные `<img>`-слои большого персонажа и не читать `characterState.equipped` напрямую. Новый overlay должен быть зарегистрирован в `MEDIA_ASSETS`, добавлен в `ITEMS` и подготовлен на совместимом холсте 1024×1536. Сюжетные позы подключаются отдельной иллюстрацией и не проходят через compositor.

## 9. Assets

- `play/images/` — сцены, персонаж, одежда, аксессуары и изображения карточек; `play/images/stickers/` — реакции.
- `play/images/character-assets.sha256.json` фиксирует SHA-256 ключевых body/head/hand PNG; `tests/character-assets.test.cjs` проверяет наличие, Git tracking и точное совпадение хэшей. Перед диагностикой renderer сначала проверить фактический asset path, SHA-256 и Git tracking. При намеренной замене PNG manifest обновляется вместе с файлом.
- `play/audio/` — 166 MP3: прежние 81 плюс 85 файлов J–Z (по пять на букву), и шесть PCM WAV переправы.
- `play/images/river-crossing-background.png` — неизменённая копия предоставленного `rivar back.png` 941×1672. Пять `stone_*.png` также сохранены и зарегистрированы; сцена использует уже нарисованные в фоне камни и прозрачные route anchors, поэтому отдельные PNG не накладываются второй раз.
- `play/river-crossing-assets.sha256.json` фиксирует точные SHA-256 фона, пяти камней и шести WAV. `tests/river-crossing-engine.test.cjs` проверяет bytes, PNG/RIFF signatures, PCM codec, registry и Git tracking.
- `play/assets.js` — каталог активных изображений и аудио. Стикеры перечисляются отдельно в `play/index.html`.
- Учебные буквы выводятся текстом, картинки слов сейчас — семантические emoji (`letters[].image === null`, `media()`), включая все слова G–Z. Отдельных raster-файлов слов в `play/images/` нет. Иконки управления — встроенные SVG в `icons` и emoji; иконки установки — корневые `play/icon-*.png`.
- Отдельной фоновой музыки и отдельного каталога изображений букв нет.

## 10. Audio

`play/audio-manager.js`: `createAudioManager()` создаёт один переиспользуемый голосовой `Audio`; `unlock()` подготавливает его по жесту пользователя, `play()` / `playSequence()` воспроизводят очередь, `stop()` отменяет её, `setEnabled()` управляет звуком. `setInstruction()` / `repeatLastInstruction()` запоминают и повторяют инструкцию. При отсутствии/ошибке файла используется `speechSynthesis`, если у реплики есть текст. `createSoundEffectManager()` отдельно предзагружает шесть коротких WAV, использует один player на эффект и не позволяет смене речевой инструкции обрывать игровой звук.

`play/index.html`: `announceScreen()` озвучивает экран/задание, `checkAnswer()` — ошибку или похвалу, `toggleSound()` — настройку звука, действие `repeat` — повтор. `AUDIO_TEXT`, `ru()`, `enName()`, `enSound()`, `enLetterWord()`, `enWord()`, `translatedWord()` задают ключи файлов из `MEDIA_ASSETS.audio`. Новые word-intro используют `g_goat.mp3`, `h_hat.mp3`, `i_iguana.mp3`; фонетика I отдельно использует `i_sound.mp3` для /ɪ/, тогда как `i_name.mp3` остаётся названием /aɪ/. Карточка значения проигрывает English → пауза 500 мс → Russian; meaning quiz при входе произносит английское слово, а при правильном выборе — только готовую русскую запись. У translation item намеренно нет TTS-текста: отсутствующий русский файл не подменяется синтезом. Смена экрана останавливает старую очередь.

«Переправа Мариуса» использует те же `j/k/l_name`, `j/k/l_sound`, `juice`, `kite`, `lion`. `RIVER_EFFECT_AUDIO` связывает действия с `river_correct`, `river_wrong`, `river_jump`, `river_land`, `river_chest`, `river_victory`. `EffectsManager` воспроизводит их независимо от голосовой очереди, а `toggleSound()` синхронно переключает оба менеджера.

## 11. Important functions and modules

| Function / Module | File | Purpose |
| --- | --- | --- |
| `letters`, `lessonSteps()`, `CORE_TYPES`, `rewardConfig` | `play/index.html` | Данные курса, последовательность урока, типы вопросов и условия подарков. |
| `ITEM_SLOTS`, `ITEMS`, `itemCatalog` | `play/index.html` | Слоты и единый каталог всех предметов. |
| `ensureQuestion()`, `createQuestion()` | `play/index.html` | Восстановление/генерация текущего задания. |
| `checkAnswer()`, `completeQuestion()` | `play/index.html` | Ответ, обратная связь, статистика и следующий этап. |
| `getWeightedRandomLetter()`, `registerMistake()` | `play/index.html` | Повторение букв с учётом ошибок. |
| `go()`, `showScreen()`, `actions` | `play/index.html` | Переходы, отрисовка и действия кнопок. |
| `loadProgress()`, `saveProgress()`, `migrateRewards()` | `play/index.html` | Сохранение и совместимость старого прогресса. |
| `getItemById()`, `unlockItem()`, `equipItem()`, `unequipItem()` | `play/index.html` | Общие операции владения и экипировки. |
| `finishBlock()`, `chooseReward()` | `play/index.html` | Условия и выдача наград уроков через inventory API. |
| `renderCharacter()`, `buddy()`, `CHARACTER_LAYER_ORDER` | `play/index.html` | Единый character stack, compact-режим и порядок слоёв. |
| `HiddenObjectGame` | `play/hidden-object-game.js` | Валидация config, изолированное состояние, выбор/hint/progress/round/completion и общий HTML find-object игры. |
| `FIND_OBJECT_SCENES` | `play/find-object-scenes.js` | Изображения, объекты, процентные hotspots, раунды и тексты конкретных сцен. |
| `FIND_OBJECT_COURSE` | `play/index.html` | Связь scene ID с существующей фазой курса и следующим экраном. |
| `LetterMazeGame` | `play/letter-maze-game.js` | Следующая контрольная точка letter/word, индивидуальная геометрия раундов, автопроход по пустому сегменту, порядок, restore и общий HTML лабиринта. |
| `LETTER_MAZE_SCENES` | `play/letter-maze-scenes.js` | Три background 941×1672, отдельные клетки/маршруты D/E/F, типы точек, SVG и аудиоключи. |
| `LETTER_MAZE_COURSE` | `play/index.html` | Фаза `maze` после F и переход к существующей награде D/E/F. |
| `showAnswerFeedback()`, `renderCompletionSticker()` | `play/index.html` | Отдельные сюжетные реакции, несовместимые с inventory overlays. |
| `announceScreen()` | `play/index.html` | Последовательности озвучки текущего экрана. |
| `MEDIA_ASSETS` | `play/assets.js` | Реальные пути медиа. |
| `createAudioManager()` | `play/audio-manager.js` | Загрузка, очередь, отмена, повтор и fallback аудио. |
| `RiverCrossingGame` | `play/river-crossing-game.js` | Двенадцать заданий J/K/L, сохранение, hint, пороги 2/4/6/8/10/12 и шаблон сцены. |
| River course adapter | `play/index.html` | Фаза `river_jkl`, общий renderer Мариуса, аудио, частицы, дуговой прыжок, блокировка ввода и переход в `review_JKL`. |

## 12. Common modification paths

### Where to look when changing...

- Главный экран → `play/index.html`: `renderHome()`, `.home`, `.hero-scene`.
- Упражнение/учебный материал → `play/index.html`: `letters`, типы вопросов, `ensureQuestion()`, `questionBody()`.
- Карточка значения / meaning quiz → `play/index.html`: `lessonSteps()`, `renderWordMeaningCard()`, `renderTranslationQuiz()`, `translatedWord()`.
- Проверка ответа → `play/index.html`: `checkAnswer()`, `registerMistake()`, `registerCorrectAnswer()`, `completeQuestion()`.
- Inventory-совместимый Marius → `play/index.html`: `renderCharacter()`, `buddy()`, `CHARACTER_LAYER_ORDER`, `.character-stage`.
- Сюжетная реакция Marius → `play/index.html`: `showAnswerFeedback()`, `pickSuccessSticker()`, `renderCompletionSticker()`; `play/images/stickers/`.
- Добавление предмета → `play/images/`, `play/assets.js`, затем один объект в `ITEMS`; для учебной награды добавить его ID в `rewardConfig.itemIds`.
- Find-object сцена → данные в `play/find-object-scenes.js`; общий state/render/click flow — `play/hidden-object-game.js`; подключение к фазе курса — `FIND_OBJECT_COURSE` в `play/index.html`.
- Мобильная вёрстка → `play/index.html`: соответствующий CSS-селектор и все его переопределения в `@media`.
- Награды → `play/index.html`: `ITEMS`, `rewardConfig`, `finishBlock()`, `chooseReward()`, `migrateRewards()`.
- Сохранение → `play/index.html`: `initialState()`, `loadProgress()`, `saveProgress()`.
- Звуки → `play/audio/`, `play/assets.js`, `play/audio-manager.js`; события озвучки — `announceScreen()` в `play/index.html`.
- Переправа J/K/L → правила и HTML в `play/river-crossing-game.js`; layout в `play/river-crossing-game.css`; курс/аудио/анимация в `play/index.html` по `river_jkl`.

## 13. Sensitive areas

- `AppState`, ключи/версии сохранения и `migrateRewards()` связывают учебную позицию, статистику и владение вещами: изменение схемы влияет на существующий прогресс. Не переиспользовать старые ID и не обходить inventory-функции при выдаче наград.
- `letters`, типы вопросов и размеры групп используются генератором, загрузчиком сохранений, статистикой и условиями наград; изменение курса требует согласованности этих мест.
- `checkAnswer()`, `completeQuestion()`, `answerLocked`, `viewEpoch`, `transitionTimer` связывают ответ, немедленное сохранение, аудио и отложенный переход; нарушение порядка может повторно засчитать ответ или показать старый экран.
- `go()` / `showScreen()` обслуживают все экраны и незавершённый выбор подарка.
- `FIND_OBJECT_COURSE`, `AppState.findObjectGames` и миграция прежнего `roomABC` связывают find-object state с курсом. Не переиспользовать `scene.id` для другой сцены и не хранить найденные объекты вне словаря по ID.
- `:root`, общие кнопки, `.character-stage`, `.gameplay-marius` и поздние `@media` влияют на несколько экранов. `.marius-composite` разрешено масштабировать только целиком; координаты исходных PNG задаются исключительно Canvas compositor.
- `createAudioManager()` общий для всех реплик; подготовка одного аудиоэлемента по пользовательскому жесту важна для Safari. Отмена очереди предотвращает наложение старых инструкций на новый экран.
- `riverAnimating`, `answerLocked`, `viewEpoch`, `riverTimers` и `riverAnimations` совместно запрещают двойной ответ и устаревшее завершение прыжка после смены экрана. Состояние переправы сохраняется сразу после ответа, до визуальной анимации.

## 14. Deployment-related files

- Корневой `index.html` — лендинг по https://abcsafari.ru/. Все CTA тренажёра ведут на `/play/`.
- `play/index.html` — тренажёр по https://abcsafari.ru/play/; соседние файлы подключаются прежними относительными путями.
- `play/manifest.webmanifest` и `play/icon-*.png` — метаданные установки тренажёра. Относительные start_url, scope и пути иконок разрешаются внутри /play/.
- Netlify автоматически публикует существующий проект из GitHub. Перенос не меняет настройки Netlify, DNS, домен или ветку публикации; специальных redirects для существующего каталога /play/ не добавлено.
- `.nojekyll` сохранён как прежний файл репозитория. Старые отчёты о GitHub Pages являются историей и не определяют нынешний production.
- `README.md` — актуальные адреса и запуск локального HTTP-сервера из корня проекта.

В репозитории нет workflow-файлов, package.json, сборщика, service worker или конфигурации Netlify. Все 92 файла тренажёра перенесены без изменения содержимого; ключи и схема localStorage остаются прежними на том же origin.

## 15. Quick navigation for Codex

```text
TASK → START HERE

Landing → index.html: TRAINER_URL / data-trainer-link / <style>
Trainer UI change → play/index.html: renderHome / renderCourse / <style>
Exercise logic → play/index.html: letters / ensureQuestion / checkAnswer
Equipped Marius → play/index.html: renderCharacter / buddy / CHARACTER_LAYER_ORDER
Story Marius → play/index.html: showAnswerFeedback / renderCompletionSticker; play/images/stickers/
Assets → play/assets.js; play/images/; play/audio/
Inventory → play/index.html: ITEM_SLOTS / ITEMS / itemCatalog / equipItem
Rewards → play/index.html: rewardConfig / chooseReward / finishBlock
Progress → play/index.html: initialState / loadProgress / saveProgress
Mobile CSS → play/index.html: <style> / @media / .character-stage
Audio → play/audio-manager.js; play/index.html: announceScreen; play/assets.js
River crossing J/K/L → play/river-crossing-game.js; play/river-crossing-game.css; play/index.html: river_jkl
Find-object game → play/hidden-object-game.js; play/find-object-scenes.js; play/index.html: FIND_OBJECT_COURSE
Letter maze → play/letter-maze-game.js; play/letter-maze-scenes.js; play/letter-maze-game.css; play/index.html: LETTER_MAZE_COURSE
Word meaning → play/index.html: letters / lessonSteps / renderWordMeaningCard / renderTranslationQuiz; play/audio/*_ru.mp3
Deployment → README.md; index.html; .nojekyll; play/manifest.webmanifest
```

## 16. Комната Мариуса (A/B/C)

Порядок: `lesson` A → B → C → `letterReward` C → **`room`** → прежние `miniIntro` / `mini` (5 вопросов) → награда → D. Фаза `room` использует тот же `view='course'`, `go()`, `showScreen()`, `saveProgress()` и AudioManager.

- Общий движок — `play/hidden-object-game.js`: `HiddenObjectGame.validate/initialState/restore/currentRound/getObject/progress/remaining/roundComplete/hint/choose/next/render`. В нём нет данных комнаты или маршрута курса.
- Конфигурации — `play/find-object-scenes.js`. Текущая `FIND_OBJECT_SCENES.mariusRoomABC` содержит стабильный `id`, изображение и alt, `objects[]`, `rounds[]`, `copy` и `completion`.
- `play/images/marius-room-abc.png`: цельная предоставленная иллюстрация; зарегистрирована в `play/assets.js` как `marius_room_abc`.
- `play/index.html`: `FIND_OBJECT_COURSE` связывает фазу `room` с config и `nextPhase`; `renderFindObjectGame`, `wireFindObjectScene`, `updateFindObjectView`, `selectFindObject`, `nextFindObjectRound`, `continueFindObjectGame`, `replayFindObjectGame` являются общим course adapter. Делегированные действия имеют префикс `find-object-*`.
- `AppState.findObjectGames[scene.id]`: `{gameId,currentRound,foundObjects,wrongAttempts,gameCompleted}`. `gameId` не позволяет применить state одной сцены к другой. `loadProgress` переносит прежнее `roomABC` в `findObjectGames['marius-room-abc']`; старый `miniIntro` A/B/C при продолжении открывает комнату, начатый тест и последующие уроки сохраняют позицию.
- Каждый `object` имеет `id`, `label`, необязательный ключ `audio` и `hotspot:{x,y,width,height}`. Все четыре величины — проценты от полного исходного изображения. Кнопка позиционируется внутри того же responsive wrapper, поэтому одна геометрия применяется на desktop, mobile и landscape.
- Каждый `round` имеет стабильный `id`, `targets[]` из существующих object ID и текст `instruction`. Поле `letter` текущей сцены используется существующим AudioManager для курса A/B/C.
- Игра не вызывает `registerMistake`, `registerCorrectAnswer`, `finishBlock` и не выдаёт награды: это практика перед проверкой. Финиш и явная кнопка переводят в существующий `miniIntro`.
- Последний правильный выбор возвращает из движка `game-complete` и ставит `state.gameCompleted=true`. `HiddenObjectGame.render()` выводит completion UI и действие `find-object-continue`; `continueFindObjectGame()` читает `nextPhase` из `FIND_OBJECT_COURSE` и вызывает прежний `go('course')`.
- Комната остаётся сюжетной цельной иллюстрацией, несовместимой с inventory overlays. Renderer из разделов 7–8 не меняется: `outfit` выбирает готовое полное изображение Мариуса, а `head`, `face`, `hand_left`, `hand_right`, `back`, `extra` остаются прозрачными слоями поверх него.

Минимальная новая конфигурация выглядит так (реальная вторая fixture находится в `tests/find-object-engine.test.cjs` и не включена в курс):

```js
{
  id: 'find-park',
  title: 'Park',
  image: {src:'./images/park.png',width:800,height:600},
  objects: [
    {id:'kite',label:'Kite',hotspot:{x:10,y:5,width:20,height:25}}
  ],
  rounds: [
    {id:'outdoors',targets:['kite'],instruction:'Find the kite!'}
  ]
}
```

Чтобы добавить живую сцену: зарегистрировать её изображение в `MEDIA_ASSETS`, добавить config в `FIND_OBJECT_SCENES`, затем добавить связь phase/config/`courseIndex`/`nextPhase` в `FIND_OBJECT_COURSE` и направить существующий переход курса в эту фазу. HTML/CSS/click/state логику копировать не нужно. Новую систему маршрутизации создавать не требуется.

- `tests/find-object-engine.test.cjs`: две разные конфигурации, валидация, изоляция state, относительные координаты, counter/remaining и completion signal.
- `tests/room.test.cjs`: текущая механика, сохранения и миграция `roomABC`, повтор, старые данные, загрузка изображения и расчёт размеров зон.
- `tests/course-regression.test.cjs`: два полных прохода A–Z с комнатой, лабиринтом, G/H/I review, Balloon Pop, тремя прежними наградами, девятью новыми review и миграцией завершённых A–F/A–I; адаптер DOM/audio — `tests/support/trainer-harness.cjs`.
- `tests/lesson-continue.test.cjs`: единое состояние card-кнопки `waitingForAudio` → `readyToContinue` для `letter`, `word` и `wordMeaning`, отдельный reset каждого слайда, блокировка перехода до завершения Promise обязательной аудиоочереди, повтор без повторной блокировки, mute/reset, A/B/M/Z и responsive/animation CSS.
- `tests/alphabet-reviews.test.cjs`: порядок A–Z, конфигурации всех review, шесть разных типов, диапазоны, уникальный cumulative sampling, переходы, restore review и сохранение inventory при A–I → J.
- `tests/balloon-pop-engine.test.cjs`: цели/дистракторы, обязательный target, score и переходы, persistence, reward gate, demo isolation и responsive CSS.
- `tests/inventory.test.cjs`: шесть предметов, восемь слотов, ownership/lock новой награды, head equip/unequip, перезагрузка и миграция rewardStateVersion 2 → 3.
- `tests/character-assets.test.cjs`: manifest, наличие, Git tracking и SHA-256 семи ключевых character PNG; также автоматически запускается из `tests/character-renderer.test.cjs`.
- `tests/character-renderer.test.cjs`: Canvas compositor на игровых экранах, порядок draw calls, замена outfit/head/hand_right, снятие, reload и изоляция сюжетных иллюстраций.

## 17. Лабиринт D/E/F

Порядок второго блока: D → E → F → `maze` → существующая награда `reward_def` → G. Прежняя D/E/F mini-проверка заменена лабиринтом; A/B/C mini из пяти вопросов остаётся прежней. Старый финал A–I заменён продолжением курса с J.

- `play/images/maze-d.png`, `maze-e.png`, `maze-f.png` — три предоставленных пользователем неизменённых portrait PNG 941 × 1672. Они зарегистрированы как отдельные `MEDIA_ASSETS.images.maze_*`; старый `marius-letter-maze-def.png` сохранён, но лабиринтом больше не загружается.
- `play/images/maze-dog.svg`, `maze-egg.svg`, `maze-fish.svg` — отдельные безымянные предметные иконки для контрольных точек Dog/Egg/Fish.
- `play/letter-maze-scenes.js` — `LETTER_MAZE_SCENES.campDEF`. Каждый раунд содержит собственные `background`, `cells`, `neighbors`, `path`, `startCell`, `finishCell` и `hitArea`. Контрольная точка задаёт `type: letter|word`, значение, аудиоключ и для слова SVG. Координаты — проценты от конкретного полного PNG.
- `play/letter-maze-game.js` — `LetterMazeGame.validate/initialState/restore/currentRound/layout/checkpointAtPoint/nextCheckpointCell/pathSegmentTo/move/next/render`. Движок выбирает геометрию активного раунда, находит следующую букву или картинку, запрещает перескочить её и автоматически проходит пустые промежуточные клетки. Неверная точка не перемещает героя. Координатный hit-test выбирает ближайшую видимую точку; декоративные SVG и пустые клетки не перехватывают tap.
- `AppState.mazeGames['marius-camp-def']` хранит раунд, текущую клетку, посещённые клетки, мягкие ошибки и completion. Каждый ход сохраняется в прежнем localStorage key.
- `renderLetterMazeGame()` передаёт в движок `renderCharacter('gameplay', {includeBackground:false, className:'gameplay-marius letter-maze-marius'})`. Stage с body/outfit и всеми transparent overlays позиционируется целиком, поэтому экипировка движется вместе с Мариусом; `animateLetterMazeSegment()` быстро и последовательно переставляет весь stack по клеткам принятого сегмента, блокируя новый ввод на время движения. Maze CSS принудительно убирает фон, скругление, рамку и тень wrapper.
- `play/letter-maze-game.css` сохраняет полное изображение через исходный aspect ratio, использует компактный maze mode без footer и рассчитывает ширину от `svh`. Отдельной горизонтальной сцены или mobile/desktop координат нет.
- `continueLetterMazeGame()` переводит курс в `miniResult`, вызывает прежний `finishBlock()` и тем самым открывает неизменённую награду второго блока.
- `tests/letter-maze-engine.test.cjs` проверяет asset, targets только на буквах, автопроход нескольких пустых клеток одним ответом, последовательную анимацию, запрет пропуска следующей буквы, nearest-target hit-test, неверную букву, аудио D/E/F, mute, D → E → F, restore и completion; course regression подтверждает переход к `reward_def` и сохранение общего прогресса.

## 18. Значение слов A–Z

В каждом доступном уроке после прежнего English word intro добавляются два шага: карточка значения и meaning quiz. На карточке остаются существующая картинка/emoji и английское слово без видимого русского перевода; звук идёт `word.mp3` → 500 мс → `word_ru.mp3`. В quiz английское слово сопровождается тремя перемешанными visuals: правильным и двумя словами курса.

- Данные находятся в `letters[]`: `translation` и `translationAudio` дополняют прежние `word`, `image`/`emoji` и `wordAudio`. `translation` не выводится в интерфейсе, а хранит смысловую связь и используется тестами/будущим контентом.
- `lessonSteps()` условно добавляет `wordMeaning` и `translationPicture`; renderer и переходы не ветвятся вручную по буквам.
- Пустой/ошибочный русский audio asset не вызывает speech synthesis, чтобы ребёнок не слышал системный голос вместо подготовленной записи.
- Неверная картинка не меняет прогресс, статистику, lives или mastery; правильная проигрывает соответствующий `*_ru.mp3` и возвращает урок к прежним трём упражнениям. Mute обрабатывается общим AudioManager.
- J–Z используют те же карточку значения, shuffled meaning quiz и мягкий retry, что A–I. X связан с Fox и выделяет X в конце слова; Y показывает Yo-yo, но использует файловый ключ `yoyo`.
- `tests/translation-lessons.test.cjs` проверяет 26 переводов, все 85 новых MP3 и привязок, особые случаи X/Y, English → Russian, repeat, отсутствие русского текста, три shuffled visuals, retry без прогресса, correct Russian audio, mute, отсутствие TTS и миграцию v2.

## 19. Блок G/H/I и head-награда

Порядок третьего блока: G/Goat → H/Hat → I/Iguana → `miniIntro` → review из пяти вопросов по G/H/I → `balloon_ghi` → `reward_ghi` → J. `advanceAfterMini()` отправляет normal flow в Balloon Pop; уже полученные старые head-награды не отзываются.

- `reward_ghi.itemIds`: `hat_straw_bow`, `hat_adventure`. Оба предмета имеют `slot:'head'`; `chooseReward()` разблокирует и экипирует только выбранный ID.
- `marius_hat_straw_bow.png` и `marius_hat_adventure.png` зарегистрированы как 1024×1536. Выбранный head asset передаётся compositor после BODY и рисуется тем же `drawImage(...,0,0,1024,1536)`, без индивидуальных координат, crop или transform.
- Reward/wardrobe preview-карточки изолированы от большого renderer: head использует отдельный `renderItemPreview()`, а hand_right сохраняет authored crop `.accessory-art`. Изменения `.marius-composite` не должны влиять на их геометрию.
- Нажатие на выбранную head-вещь в гардеробе вызывает общий `unequipItem()`; повторный выбор owned-вещи снова вызывает `equipItem()`. Одновременно в `equipped.head` хранится один ID.
- `tests/balloon-pop-engine.test.cjs`, `tests/course-regression.test.cjs`, `tests/inventory.test.cjs`, `tests/translation-lessons.test.cjs`, `tests/character-renderer.test.cjs` и `tests/character-assets.test.cjs` покрывают Balloon Pop, flow, звуки/переводы, ownership/lock, equip/unequip, миграцию A–F, Canvas compositor и целостность character assets.

## 20. Буквы J–Z и повторение

Полный новый поток после награды GHI: J → K → L → `river_jkl` → `review_JKL` → M → N → O → `review_MNO` → `cumulative_review_AO` → P → Q → R → `review_PQR` → S → T → U → `review_STU` → `cumulative_review_AU` → V → W → X → `review_VWX` → Y → Z → `review_YZ` → `cumulative_review_AZ` → `results`.

- Уроки J–Z создаёт прежний `lessonSteps()` из `letters[]`; отдельная переправа J/K/L не добавляет reward screen или предмет.
- Local review использует только буквы своего блока. Все шесть `REVIEW_TYPES` появляются ровно по одному разу; буквы перемешиваются и равномерно повторяются.
- Cumulative review хранит полный доступный range в `game.poolLetters`, а шесть уникальных целей — в `game.letterOrder`. Две цели берутся из только что изученного блока, четыре — из более ранних букв; оба набора и общий порядок перемешиваются при новом прохождении.
- `completeQuestion()` переводит review в result-фазу после шестого ответа; `advanceAfterReview()` открывает следующий урок, cumulative block либо итоговый A–Z экран.

## 21. Переправа Мариуса J/K/L

После `letterReward` буквы L свежий курс открывает `river_jkl`, а после 12-го правильного ответа и кнопки продолжения — прежний `review_JKL`, затем урок M. Награда за переправу не определена, поэтому игра не добавляет предмет и не вызывает `finishBlock()`.

- Движок: `play/river-crossing-game.js`. Этапы: name J/K/L, sound J/K/L, word Juice/Kite/Lion, смешанный финал с J/K/L и всеми тремя типами. Варианты всегда состоят из J/K/L и перемешиваются.
- Состояние: `AppState.riverCrossing`. Ошибка увеличивает только `wrongAttempts`; с третьей ошибки `hint()` разрешает мягкую подсветку. Correct/questionIndex увеличиваются только при правильном ответе.
- Маршрут: семь нормализованных точек — старт, пять камней, дальний берег. `platformIndex()` даёт переходы на 2/4/6/8/10/12 правильных ответах. `animateRiverMarius()` перемещает один общий Canvas stack по дуге; outfit/head/hand overlays остаются внутри renderer.
- Аудио: текущее задание собирает `riverAudioItems()` и повторяет через общий AudioManager. Любая смена задания отменяет прежнюю очередь; mute отключает и задания, и эффекты.
- UI: три ответа находятся в отдельной крупной touch-grid и не перекрывают actor. Word-вопросы показывают семантические emoji, уже используемые уроками, без английского текста. Фон масштабируется внутри сцены с исходным соотношением 941:1672 без растяжения. Мариус занимает 19–22% ширины сцены; apex прыжка ограничен 19%, чтобы увеличенный renderer не обрезался. Финал использует детерминированный слой ровно из трёх звёзд: вылет снизу, сборка в центре, пульсация и fade, плюс восемь небольших искр; общий случайный `celebrate()` для переправы не вызывается.
- Ассеты: `river_crossing_background` обязателен и служит единой сценой. При ошибке загрузки показывается диагностируемое сообщение вместо CSS-заглушки. Пять прозрачных route anchors совмещены с нарисованными камнями; отдельные `stone_*.png` хранятся как оригинальные authored-ассеты без визуального удвоения.
- Тест: `node tests/river-crossing-engine.test.cjs`; полный курс также проходит через переправу в `tests/course-regression.test.cjs`.
