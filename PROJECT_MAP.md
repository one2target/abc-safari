# ABC Safari — Project map

Карта объединённого проекта: корневой лендинг и тренажёр A–I в play/. Оба используют обычные HTML, CSS и JavaScript. Все пути ниже — относительно корня этого Git-репозитория. Основная логика и стили находятся в `play/index.html`; ищите по именам функций и CSS-селекторам. Отдельных каталогов компонентов, сборщика и серверной части нет.

## 1. Project entry points

| File | Purpose |
| --- | --- |
| `index.html` | Лендинг ABC Safari из prototype_v3; TRAINER_URL и четыре data-trainer-link ведут на /play/. |
| `play/index.html` | HTML-каркас, общий `<style>`, данные курса и основной встроенный `<script>`. В конце запускается `showScreen()`. |
| `play/assets.js` | Глобальный `MEDIA_ASSETS`: пути аудио и активных изображений, размеры изображений. Загружается до логики приложения. |
| `play/find-object-scenes.js` | Каталог данных find-object сцен; текущая конфигурация `FIND_OBJECT_SCENES.mariusRoomABC`. |
| `play/hidden-object-game.js` | Универсальные правила, state API, валидация и HTML-шаблон `HiddenObjectGame`. |
| `play/hidden-object-game.css` | Общий адаптивный layout find-object сцен, прозрачные кнопки, подсказки и debug-границы. |
| `play/letter-maze-scenes.js` | Данные вертикального лабиринта D/E/F: background, процентные клетки, соседства, буквы и маршруты. |
| `play/letter-maze-game.js` | Переиспользуемые правила, state API, выбор следующей буквы, сегменты автопрохода, валидация и HTML-шаблон letter maze. |
| `play/letter-maze-game.css` | Mobile-first вертикальный layout, буквы на камнях, перемещение общего character stack. |
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
- Экраны: `renderHome()`, `renderCourse()`, `renderWardrobe()`, `renderReward()`, `renderResults()`. Учебные экраны: `renderLearnLetter()`, `renderWordScreen()`, `renderWordMeaningCard()`, `renderTranslationQuiz()`, `questionBody()`, `renderInterlude()`.
- Навигация: `view`, `lastView`, `go()`, `showScreen()`, `openProgress()`. Маршрутизация переключает содержимое `#main`; URL-роутера нет.
- Действия: объект `actions` и делегированный обработчик `document` для кнопок с `data-action` / `data-answer`; кнопки верхней панели имеют отдельные обработчики.
- Кнопки и карточки: `.primary`, `.secondary`, `.icon-button`, `.choice`, `.outfit-option`; карточки одежды строит `outfitOptions()`.
- Модальные окна: `openModal()`, `closeModal()`, `showReset()`, `showParentGate()`, `renderParentView()`; здесь же управление фокусом, Escape и родительский доступ по удержанию.
- Общие стили: начальный `<style>`, переменные `:root`. Responsive: блоки `@media` для 760/650/350 px, коротких экранов и landscape. Дополнительные правила персонажа/гардероба расположены ближе к концу `<style>`; учитывать порядок переопределений.

## 4. Exercise system

Всё в `play/index.html`:

- `letters` — A–I, слова, русские значения, звуки, emoji, цвета, отвлекающие буквы и привязки английского/русского аудио. Отдельного хранилища готовых заданий нет.
- `lessonSteps()` строит урок из данных буквы: знакомство, английское слово, карточка значения, `translationPicture`, затем прежние три упражнения. Если visual, английская или русская запись отсутствует, два шага значения не добавляются.
- `CORE_TYPES` — `find`, `letterPicture`, `pictureLetter`; `TRANSLATION_TYPE` — отдельная проверка значения без влияния на mastery; `MINI_TYPES` добавляет `wordPicture`, `FINAL_TYPES` — `lowercase`.
- `GROUP_SIZE`, `MINI_LENGTH`, `FINAL_LENGTH`, `groups` — группы по три буквы, мини-игры по пять вопросов, финал из десяти.
- `startGame()` задаёт последовательность типов; `gamePool()` выбирает набор букв; `getWeightedRandomLetter()` учитывает ошибки и очередь повторений.
- `ensureQuestion()` восстанавливает подходящий вопрос либо вызывает `createQuestion()`; `validQuestion()` проверяет структуру сохранённого вопроса.
- `questionPrompt()` / `questionBody()` выводят вопрос и варианты.
- `checkAnswer()` сравнивает `button.dataset.answer` с `q.letter`, запускает реакцию и блокирует повторное нажатие. В прежних упражнениях ошибка вызывает `registerMistake()`, а успех — `registerCorrectAnswer()`; meaning quiz даёт мягкий retry без статистического штрафа, а при успехе проигрывает русское слово и переходит к прежним упражнениям.
- Переходы: `nextLessonStep()`, `advanceAfterLetter()`, `advanceAfterMini()`, `completeQuestion()`, затем `go()` / `showScreen()`.

## 5. Progress and state

`play/index.html`: `initialState()`, `AppState`, `loadProgress()`, `saveProgress()`, `resetProgress()`.

- `cursor` хранит `phase`, индекс буквы и шаг. Фазы: `lesson`, `letterReward`, `miniIntro`, `mini`, `miniResult`, `finalIntro`, `final`, `results`.
- `stats` по каждой букве: `attempts`, `correct`, `mistakes`, `mastery`, `skills`, `practiceDebt`. Итоги для родителей вычисляет `renderParentView()`.
- `game`, `question`, `reviews`, `questionSerial` сохраняют позицию игры, вопрос и повторения; `started`, `completed`, `soundEnabled` — общие флаги.
- Награды: `characterState.ownedItems`, стандартные слоты `characterState.equipped`, `completedBlocks`, `claimedRewards`, `rewardFlow`.
- `localStorage`: `alfie-abc-v1`; при `?demo=1` — отдельный `alfie-abc-demo-v1`. Общая версия состояния — 3; загрузчик принимает версии 1–3. Для сохранений v1/v2 прежние lesson steps 2–4 сдвигаются на два места, сохраняя точное упражнение. Завершённое либо находившееся в прежнем финале сохранение A–F продолжает с G; статистика, награды и экипировка A–F сохраняются. Инвентарь отдельно мигрирует `migrateRewards()` с `REWARD_STATE_VERSION = 3`.
- При невозможности записи состояние остаётся в памяти вкладки, показывается `#storage-notice`. Сохранение также вызывается при скрытии страницы и `pagehide`. Сброс сохраняет настройку звука.
- `view`, блокировки, таймеры и история выбора стикеров — временные переменные вне сохранения.

## 6. Rewards

`play/index.html`: `ITEM_SLOTS`, `ITEMS`, `itemCatalog`, `rewardConfig`, `finishBlock()`, `ensureRewardFlow()`, `chooseReward()`, `continueReward()`.

`ITEMS` — независимый каталог предметов с `id`, `name`, `slot`, `asset`, `collection` и необязательной иконкой. `rewardConfig` содержит только условия награды и `itemIds`. После A–C и мини-игры выбирается одна куртка; после D–F/лабиринта — один аксессуар; после G–H–I и пяти вопросов review — одна шляпа. Завершение блока открывает выбор, а `chooseReward()` вызывает общие `unlockItem()` / `equipItem()` и сохраняет выбранную вещь до анимации. Альтернативный предмет остаётся закрытым.

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
- Системный порядок `CHARACTER_LAYER_ORDER`: background (0) → back (1) → body/outfit (2) → face (3) → head (4) → hand_left (5) → hand_right (6) → extra (7). Порядок записывается в `data-layer-order` / `--character-layer`, а не задаётся отдельными правилами экрана.
- CSS `.character-stage`, `.character-actor`, `.character-layer` задаёт единую несжимаемую сцену 2:3. Base/outfit и все overlays находятся внутри одного `.character-actor`, поэтому `translate(-3%, 0)` и адаптивный scale применяются ко всем слоям вместе. Full-canvas изображения заполняют точные границы слоя; это не позволяет intrinsic-размеру отдельного PNG создать собственный fit внутри final flex-card.
- `characterState.ownedItems` хранит владение; `characterState.equipped` всегда содержит все восемь слотов. Обе куртки занимают `outfit`, букет и шарик — `hand_right`, обе новые шляпы — `head`. Выбранную шляпу можно снять и снова надеть через `outfitOptions()` / `renderWardrobe()`; альтернативная награда остаётся locked.
- Старые `play/images/jacket_*.png` и `play/images/headwear_*.png` остаются в каталоге, но не подключены через `MEDIA_ASSETS`; старые идентификаторы учитывает `migrateRewards()`.

Новый экран с совместимой основной позой должен вызывать `renderCharacter()`; для декоративного компактного Мариуса внутри упражнения — `buddy('inline')` или `buddy('interlude')`. Не копировать разметку `.character-layer` в экран и не читать `characterState.equipped` напрямую. Новый overlay должен быть зарегистрирован в `MEDIA_ASSETS`, добавлен в `ITEMS` и подготовлен на совместимом холсте 1024×1536. Сюжетные позы подключаются отдельной иллюстрацией и не проходят через renderer.

## 9. Assets

- `play/images/` — сцены, персонаж, одежда, аксессуары и изображения карточек; `play/images/stickers/` — реакции.
- `play/images/character-assets.sha256.json` фиксирует SHA-256 ключевых body/head/hand PNG; `tests/character-assets.test.cjs` проверяет наличие, Git tracking и точное совпадение хэшей. Перед диагностикой renderer сначала проверить фактический asset path, SHA-256 и Git tracking. При намеренной замене PNG manifest обновляется вместе с файлом.
- `play/audio/` — 81 MP3: прежние 66 записей плюс по пять файлов для Goat, Hat и Iguana.
- `play/assets.js` — каталог активных изображений и аудио. Стикеры перечисляются отдельно в `play/index.html`.
- Учебные буквы выводятся текстом, картинки слов сейчас — семантические emoji (`letters[].image === null`, `media()`), включая Goat/Hat/Iguana. Отдельных raster-файлов слов в `play/images/` нет. Иконки управления — встроенные SVG в `icons` и emoji; иконки установки — корневые `play/icon-*.png`.
- Отдельной фоновой музыки и отдельного каталога изображений букв нет.

## 10. Audio

`play/audio-manager.js`: `createAudioManager()` создаёт один переиспользуемый `Audio`; `unlock()` подготавливает его по жесту пользователя, `play()` / `playSequence()` воспроизводят очередь, `stop()` отменяет её, `setEnabled()` управляет звуком. `setInstruction()` / `repeatLastInstruction()` запоминают и повторяют инструкцию. При отсутствии/ошибке файла используется `speechSynthesis`, если у реплики есть текст.

`play/index.html`: `announceScreen()` озвучивает экран/задание, `checkAnswer()` — ошибку или похвалу, `toggleSound()` — настройку звука, действие `repeat` — повтор. `AUDIO_TEXT`, `ru()`, `enName()`, `enSound()`, `enLetterWord()`, `enWord()`, `translatedWord()` задают ключи файлов из `MEDIA_ASSETS.audio`. Новые word-intro используют `g_goat.mp3`, `h_hat.mp3`, `i_iguana.mp3`; фонетика I отдельно использует `i_sound.mp3` для /ɪ/, тогда как `i_name.mp3` остаётся названием /aɪ/. Карточка значения проигрывает English → пауза 500 мс → Russian; meaning quiz при входе произносит английское слово, а при правильном выборе — только готовую русскую запись. У translation item намеренно нет TTS-текста: отсутствующий русский файл не подменяется синтезом. Смена экрана останавливает старую очередь.

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
| `LetterMazeGame` | `play/letter-maze-game.js` | Следующая буква, автопроход по пустому сегменту, проверка порядка, раунды, restore и общий HTML лабиринта. |
| `LETTER_MAZE_SCENES` | `play/letter-maze-scenes.js` | Background 941×1672, 36 клеток, D/E/F и правильные маршруты. |
| `LETTER_MAZE_COURSE` | `play/index.html` | Фаза `maze` после F и переход к существующей награде D/E/F. |
| `showAnswerFeedback()`, `renderCompletionSticker()` | `play/index.html` | Отдельные сюжетные реакции, несовместимые с inventory overlays. |
| `announceScreen()` | `play/index.html` | Последовательности озвучки текущего экрана. |
| `MEDIA_ASSETS` | `play/assets.js` | Реальные пути медиа. |
| `createAudioManager()` | `play/audio-manager.js` | Загрузка, очередь, отмена, повтор и fallback аудио. |

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

## 13. Sensitive areas

- `AppState`, ключи/версии сохранения и `migrateRewards()` связывают учебную позицию, статистику и владение вещами: изменение схемы влияет на существующий прогресс. Не переиспользовать старые ID и не обходить inventory-функции при выдаче наград.
- `letters`, типы вопросов и размеры групп используются генератором, загрузчиком сохранений, статистикой и условиями наград; изменение курса требует согласованности этих мест.
- `checkAnswer()`, `completeQuestion()`, `answerLocked`, `viewEpoch`, `transitionTimer` связывают ответ, немедленное сохранение, аудио и отложенный переход; нарушение порядка может повторно засчитать ответ или показать старый экран.
- `go()` / `showScreen()` обслуживают все экраны и незавершённый выбор подарка.
- `FIND_OBJECT_COURSE`, `AppState.findObjectGames` и миграция прежнего `roomABC` связывают find-object state с курсом. Не переиспользовать `scene.id` для другой сцены и не хранить найденные объекты вне словаря по ID.
- `:root`, общие кнопки, `.character-actor`, `.gameplay-marius` и поздние `@media` влияют на несколько экранов и совмещение аксессуаров с персонажем. Не масштабировать слои внутри actor независимо.
- `createAudioManager()` общий для всех реплик; подготовка одного аудиоэлемента по пользовательскому жесту важна для Safari. Отмена очереди предотвращает наложение старых инструкций на новый экран.

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
Mobile CSS → play/index.html: <style> / @media / .character-actor
Audio → play/audio-manager.js; play/index.html: announceScreen; play/assets.js
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
- `tests/course-regression.test.cjs`: два полных прохода A–I с комнатой, лабиринтом, G/H/I review, тремя наградами и миграцией завершённого A–F; адаптер DOM/audio — `tests/support/trainer-harness.cjs`.
- `tests/inventory.test.cjs`: шесть предметов, восемь слотов, ownership/lock новой награды, head equip/unequip, перезагрузка и миграция rewardStateVersion 2 → 3.
- `tests/character-assets.test.cjs`: manifest, наличие, Git tracking и SHA-256 семи ключевых character PNG; также автоматически запускается из `tests/character-renderer.test.cjs`.
- `tests/character-renderer.test.cjs`: общий stack на игровых экранах, порядок слоёв, замена outfit/head/hand_right, full-canvas hat overlays, снятие, reload и изоляция сюжетных иллюстраций.

## 17. Лабиринт D/E/F

Порядок второго блока: D → E → F → `maze` → существующая награда `reward_def` → G. Прежняя D/E/F mini-проверка заменена лабиринтом; A/B/C mini из пяти вопросов и финальная игра из десяти вопросов остаются прежними, но финал теперь начинается после G/H/I.

- `play/images/marius-letter-maze-def.png` — предоставленный пользователем неизменённый portrait PNG 941 × 1672. Он зарегистрирован как `MEDIA_ASSETS.images.marius_letter_maze_def` и служит основным фоном, а не референсом.
- `play/letter-maze-scenes.js` — `LETTER_MAZE_SCENES.campDEF`. Каждая клетка имеет стабильный `id`, `x/y` в процентах и симметричный список `neighbors`; при необходимости `labelOffsetX/labelOffsetY` в процентных пунктах калибруют только видимую букву относительно нарисованного камня. Раунд задаёт `targetLetter`, `instruction`, разреженный словарь из 12 букв и проверенный `path` от `start` к `finish`; пустая строка означает обычную проходную плитку. `hitArea` задаёт единую расширенную область tap без offsets клеток.
- `play/letter-maze-game.js` — `LetterMazeGame.validate/initialState/restore/currentRound/letterAtPoint/nextLetterCell/pathSegmentTo/move/next/render`. Игрок выбирает только буквы: движок находит следующую контрольную букву в существующем `round.path`, запрещает перескочить её, проходит до неё только через промежуточные пустые клетки и атомарно сохраняет конечную позицию. Неверная буква не перемещает героя. Координатный hit-test выбирает ближайшую видимую букву; пустые клетки не создают кнопки и не перехватывают tap.
- `AppState.mazeGames['marius-camp-def']` хранит раунд, текущую клетку, посещённые клетки, мягкие ошибки и completion. Каждый ход сохраняется в прежнем localStorage key.
- `renderLetterMazeGame()` передаёт в движок `renderCharacter('gameplay', {includeBackground:false, className:'gameplay-marius letter-maze-marius'})`. Stage с body/outfit и всеми transparent overlays позиционируется целиком, поэтому экипировка движется вместе с Мариусом; `animateLetterMazeSegment()` быстро и последовательно переставляет весь stack по клеткам принятого сегмента, блокируя новый ввод на время движения. Maze CSS принудительно убирает фон, скругление, рамку и тень wrapper.
- `play/letter-maze-game.css` сохраняет полное изображение через исходный aspect ratio, использует компактный maze mode без footer и рассчитывает ширину от `svh`. Отдельной горизонтальной сцены или mobile/desktop координат нет.
- `continueLetterMazeGame()` переводит курс в `miniResult`, вызывает прежний `finishBlock()` и тем самым открывает неизменённую награду второго блока.
- `tests/letter-maze-engine.test.cjs` проверяет asset, targets только на буквах, автопроход нескольких пустых клеток одним ответом, последовательную анимацию, запрет пропуска следующей буквы, nearest-target hit-test, неверную букву, аудио D/E/F, mute, D → E → F, restore и completion; course regression подтверждает переход к `reward_def` и сохранение общего прогресса.

## 18. Значение слов A–I

В каждом доступном уроке после прежнего English word intro добавляются два шага: карточка значения и meaning quiz. На карточке остаются существующая картинка/emoji и английское слово без видимого русского перевода; звук идёт `word.mp3` → 500 мс → `word_ru.mp3`. В quiz английское слово сопровождается тремя перемешанными visuals: правильным и двумя словами курса.

- Данные находятся в `letters[]`: `translation` и `translationAudio` дополняют прежние `word`, `image`/`emoji` и `wordAudio`. `translation` не выводится в интерфейсе, а хранит смысловую связь и используется тестами/будущим контентом.
- `lessonSteps()` условно добавляет `wordMeaning` и `translationPicture`; renderer и переходы не ветвятся вручную по A–I.
- Пустой/ошибочный русский audio asset не вызывает speech synthesis, чтобы ребёнок не слышал системный голос вместо подготовленной записи.
- Неверная картинка не меняет прогресс, статистику, lives или mastery; правильная проигрывает соответствующий `*_ru.mp3` и возвращает урок к прежним трём упражнениям. Mute обрабатывается общим AudioManager.
- G/H/I используют Goat/Коза, Hat/Шляпа, Iguana/Игуана и те же карточку значения, shuffled meaning quiz и мягкий retry, что A–F.
- `tests/translation-lessons.test.cjs` проверяет девять переводов, все 15 новых файлов и привязок, отдельный `i_sound.mp3` для /ɪ/, English → Russian, repeat, отсутствие русского текста, три shuffled visuals, retry без прогресса, correct Russian audio, mute, отсутствие TTS и миграцию v2.

## 19. Блок G/H/I и head-награда

Порядок третьего блока: G/Goat → H/Hat → I/Iguana → `miniIntro` → review из пяти вопросов по G/H/I → `reward_ghi` → общий финал A–I. Переход после `reward_def` использует прежний `advanceAfterMini()`; отдельного маршрутизатора или mini-game для блока нет.

- `reward_ghi.itemIds`: `hat_straw_bow`, `hat_adventure`. Оба предмета имеют `slot:'head'`; `chooseReward()` разблокирует и экипирует только выбранный ID.
- `marius_hat_straw_bow.png` и `marius_hat_adventure.png` зарегистрированы как 1024×1536. `renderCharacter()` выводит выбранный asset обычным `character-layer` с `data-slot="head"`, `inset:0`, `width/height:100%` и без индивидуальных координат, crop или transform.
- В reward/wardrobe карточках head и hand_right предметы также показываются через `renderCharacter('item-preview')`: `itemOverrides` подставляет только preview-предмет без изменения inventory. Поэтому карточки и основной персонаж используют один actor coordinate space 2:3; сырые full-canvas overlay PNG отдельно в коротком `.outfit-art` не масштабируются.
- Нажатие на выбранную head-вещь в гардеробе вызывает общий `unequipItem()`; повторный выбор owned-вещи снова вызывает `equipItem()`. Одновременно в `equipped.head` хранится один ID.
- `tests/course-regression.test.cjs`, `tests/inventory.test.cjs`, `tests/translation-lessons.test.cjs`, `tests/character-renderer.test.cjs` покрывают flow, звуки/переводы, ownership/lock, equip/unequip, миграцию A–F и full-canvas overlay.
