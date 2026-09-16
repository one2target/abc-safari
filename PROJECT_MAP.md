# ABC Safari — Project map

Карта объединённого проекта: корневой лендинг и прежний тренажёр A–F в play/. Оба используют обычные HTML, CSS и JavaScript. Все пути ниже — относительно корня этого Git-репозитория. Основная логика и стили находятся в `play/index.html`; ищите по именам функций и CSS-селекторам. Отдельных каталогов компонентов, сборщика и серверной части нет.

## 1. Project entry points

| File | Purpose |
| --- | --- |
| `index.html` | Лендинг ABC Safari из prototype_v3; TRAINER_URL и четыре data-trainer-link ведут на /play/. |
| `play/index.html` | HTML-каркас, общий `<style>`, данные курса и основной встроенный `<script>`. В конце запускается `showScreen()`. |
| `play/assets.js` | Глобальный `MEDIA_ASSETS`: пути аудио и активных изображений, размеры изображений. Загружается до логики приложения. |
| `play/hidden-object-game.js` | ROOM_HOTSPOTS, ROOM_ROUNDS, DEBUG_HOTSPOTS, переиспользуемая механика HiddenObjectGame. |
| `play/hidden-object-game.css` | Сцена комнаты, адаптивные прозрачные кнопки, подсказки и debug-границы. |
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
- Экраны: `renderHome()`, `renderCourse()`, `renderWardrobe()`, `renderReward()`, `renderResults()`. Учебные экраны: `renderLearnLetter()`, `renderWordScreen()`, `questionBody()`, `renderInterlude()`.
- Навигация: `view`, `lastView`, `go()`, `showScreen()`, `openProgress()`. Маршрутизация переключает содержимое `#main`; URL-роутера нет.
- Действия: объект `actions` и делегированный обработчик `document` для кнопок с `data-action` / `data-answer`; кнопки верхней панели имеют отдельные обработчики.
- Кнопки и карточки: `.primary`, `.secondary`, `.icon-button`, `.choice`, `.outfit-option`; карточки одежды строит `outfitOptions()`.
- Модальные окна: `openModal()`, `closeModal()`, `showReset()`, `showParentGate()`, `renderParentView()`; здесь же управление фокусом, Escape и родительский доступ по удержанию.
- Общие стили: начальный `<style>`, переменные `:root`. Responsive: блоки `@media` для 760/650/350 px, коротких экранов и landscape. Дополнительные правила персонажа/гардероба расположены ближе к концу `<style>`; учитывать порядок переопределений.

## 4. Exercise system

Всё в `play/index.html`:

- `letters` — A–F, слова, звуки, emoji, цвета, отвлекающие буквы. Отдельного хранилища готовых заданий нет.
- `CORE_TYPES` — `find`, `letterPicture`, `pictureLetter`; `MINI_TYPES` добавляет `wordPicture`, `FINAL_TYPES` — `lowercase`.
- `GROUP_SIZE`, `MINI_LENGTH`, `FINAL_LENGTH`, `groups` — группы по три буквы, мини-игры по пять вопросов, финал из десяти.
- `startGame()` задаёт последовательность типов; `gamePool()` выбирает набор букв; `getWeightedRandomLetter()` учитывает ошибки и очередь повторений.
- `ensureQuestion()` восстанавливает подходящий вопрос либо вызывает `createQuestion()`; `validQuestion()` проверяет структуру сохранённого вопроса.
- `questionPrompt()` / `questionBody()` выводят вопрос и варианты.
- `checkAnswer()` сравнивает `button.dataset.answer` с `q.letter`, запускает реакцию и блокирует повторное нажатие. Ошибка вызывает `registerMistake()` и повторную попытку; успех — `completeQuestion()` / `registerCorrectAnswer()`.
- Переходы: `nextLessonStep()`, `advanceAfterLetter()`, `advanceAfterMini()`, `completeQuestion()`, затем `go()` / `showScreen()`.

## 5. Progress and state

`play/index.html`: `initialState()`, `AppState`, `loadProgress()`, `saveProgress()`, `resetProgress()`.

- `cursor` хранит `phase`, индекс буквы и шаг. Фазы: `lesson`, `letterReward`, `miniIntro`, `mini`, `miniResult`, `finalIntro`, `final`, `results`.
- `stats` по каждой букве: `attempts`, `correct`, `mistakes`, `mastery`, `skills`, `practiceDebt`. Итоги для родителей вычисляет `renderParentView()`.
- `game`, `question`, `reviews`, `questionSerial` сохраняют позицию игры, вопрос и повторения; `started`, `completed`, `soundEnabled` — общие флаги.
- Награды: `characterState.ownedItems`, стандартные слоты `characterState.equipped`, `completedBlocks`, `claimedRewards`, `rewardFlow`.
- `localStorage`: `alfie-abc-v1`; при `?demo=1` — отдельный `alfie-abc-demo-v1`. Общая версия состояния — 2; загрузчик принимает версии 1 и 2. Инвентарь отдельно мигрирует `migrateRewards()` с `REWARD_STATE_VERSION = 3`.
- При невозможности записи состояние остаётся в памяти вкладки, показывается `#storage-notice`. Сохранение также вызывается при скрытии страницы и `pagehide`. Сброс сохраняет настройку звука.
- `view`, блокировки, таймеры и история выбора стикеров — временные переменные вне сохранения.

## 6. Rewards

`play/index.html`: `ITEM_SLOTS`, `ITEMS`, `itemCatalog`, `rewardConfig`, `finishBlock()`, `ensureRewardFlow()`, `chooseReward()`, `continueReward()`.

`ITEMS` — независимый каталог предметов с `id`, `name`, `slot`, `asset`, `collection` и необязательной иконкой. `rewardConfig` содержит только условия награды и `itemIds`. После A–C и мини-игры выбирается одна куртка; после D–F и мини-игры — один аксессуар. Завершение блока открывает выбор, а `chooseReward()` вызывает общие `unlockItem()` / `equipItem()` и сохраняет выбранную вещь до анимации. Альтернативный предмет остаётся закрытым.

Общие операции: `getItemById()`, `isItemOwned()`, `unlockItem()`, `equipItem()`, `unequipItem()`, `getEquippedItem()`, `loadProgress()`, `saveProgress()`. Поддерживаемые слоты: `outfit`, `head`, `face`, `hand_left`, `hand_right`, `back`, `extra`, `background`.

Звезда буквы в `letterStrip()` соответствует `mastery === 3`: освоены три базовых типа заданий. `celebrate()` создаёт конфетти; `renderInterlude()` и `renderResults()` показывают праздничные звёзды. Отдельных очков, валюты, покупок, счётчика серий ответов или каталога достижений нет.

## 7. Marius

- `play/images/`: полные варианты `giraffe_base.png`, `giraffe_jacket_*.png`; сцены `background_*.png`. Подключение — `play/assets.js` и `characterConfig` в `play/index.html`.
- `renderCharacter()` выводит персонажа на главной, в гардеробе, при награде и в итогах. `buddy()` выводит emoji-жирафика в учебных экранах; `wireMedia()` обрабатывает ошибки загрузки.
- Реакции находятся в `play/images/stickers/`: `marius_success_01.png` … `marius_success_09.png`, `marius_retry_01.png`. Эти пути формируются прямо в `play/index.html`, вне `MEDIA_ASSETS`.
- `SUCCESS_STICKERS`, `RETRY_STICKER`, `pickSuccessSticker()` выбирают реакцию без повторения успешного стикера подряд. `showAnswerFeedback()` вызывается из `checkAnswer()`; `renderCompletionSticker()` — из `renderInterlude()` при завершении буквы.
- `prepareFeedbackSticker()` управляет загрузкой/ошибкой; `preloadFeedbackStickers()` запускает фоновую загрузку после начала игры. Внешний вид — `.feedback-sticker`, `.completion-sticker`, анимации `feedback-pop` / `feedback-soft`.

## 8. Clothing and accessories

Система реализована в `play/index.html` и использует ресурсы `play/images/`, зарегистрированные в `play/assets.js`.

- База — `play/images/giraffe_base.png`. Куртки — полные изображения `giraffe_jacket_stars.png` / `giraffe_jacket_racer.png`, заменяющие базу.
- Прозрачные аксессуары — `play/images/accessory_bouquet.png`, `play/images/accessory_balloon.png`; иконки карточек курток — `play/images/reward_icon_jacket_*.png`.
- `renderCharacter()` получает предметы стандартных слотов из каталога. `outfit` заменяет полный вариант жирафика, `background` заменяет фон сцены, остальные слоты выводятся прозрачными слоями на общем холсте. CSS `.character-stage`, `.character-actor`, `.character-layer` задаёт сцену 2:3 и порядок слоёв.
- `characterState.ownedItems` хранит владение; `characterState.equipped` всегда содержит все восемь слотов. Обе куртки занимают `outfit`, букет и шарик — `hand_right`. Менять через общие inventory-функции; отображение выбора — `outfitOptions()` / `renderWardrobe()`.
- Старые `play/images/jacket_*.png` и `play/images/headwear_*.png` остаются в каталоге, но не подключены через `MEDIA_ASSETS`; старые идентификаторы учитывает `migrateRewards()`.

## 9. Assets

- `play/images/` — сцены, персонаж, одежда, аксессуары и изображения карточек; `play/images/stickers/` — реакции.
- `play/audio/` — 60 MP3: нумерованные русские реплики, английские названия/звуки букв, слова и сочетания «буква — слово».
- `play/assets.js` — каталог активных изображений и аудио. Стикеры перечисляются отдельно в `play/index.html`.
- Учебные буквы выводятся текстом, картинки слов сейчас — emoji (`letters[].image === null`, `media()`). Иконки управления — встроенные SVG в `icons` и emoji; иконки установки — корневые `play/icon-*.png`.
- Отдельной фоновой музыки и отдельного каталога изображений букв нет.

## 10. Audio

`play/audio-manager.js`: `createAudioManager()` создаёт один переиспользуемый `Audio`; `unlock()` подготавливает его по жесту пользователя, `play()` / `playSequence()` воспроизводят очередь, `stop()` отменяет её, `setEnabled()` управляет звуком. `setInstruction()` / `repeatLastInstruction()` запоминают и повторяют инструкцию. При отсутствии/ошибке файла используется `speechSynthesis`, если у реплики есть текст.

`play/index.html`: `announceScreen()` озвучивает экран/задание, `checkAnswer()` — ошибку или похвалу, `toggleSound()` — настройку звука, действие `repeat` — повтор. `AUDIO_TEXT`, `ru()`, `enName()`, `enSound()`, `enWord()` задают тексты и ключи файлов из `MEDIA_ASSETS.audio`. Между репликами по умолчанию 500 мс; смена экрана останавливает старую очередь.

## 11. Important functions and modules

| Function / Module | File | Purpose |
| --- | --- | --- |
| `letters`, `CORE_TYPES`, `rewardConfig` | `play/index.html` | Данные курса, типы вопросов и условия подарков. |
| `ITEM_SLOTS`, `ITEMS`, `itemCatalog` | `play/index.html` | Слоты и единый каталог всех предметов. |
| `ensureQuestion()`, `createQuestion()` | `play/index.html` | Восстановление/генерация текущего задания. |
| `checkAnswer()`, `completeQuestion()` | `play/index.html` | Ответ, обратная связь, статистика и следующий этап. |
| `getWeightedRandomLetter()`, `registerMistake()` | `play/index.html` | Повторение букв с учётом ошибок. |
| `go()`, `showScreen()`, `actions` | `play/index.html` | Переходы, отрисовка и действия кнопок. |
| `loadProgress()`, `saveProgress()`, `migrateRewards()` | `play/index.html` | Сохранение и совместимость старого прогресса. |
| `getItemById()`, `unlockItem()`, `equipItem()`, `unequipItem()` | `play/index.html` | Общие операции владения и экипировки. |
| `finishBlock()`, `chooseReward()` | `play/index.html` | Условия и выдача наград уроков через inventory API. |
| `renderCharacter()`, `showAnswerFeedback()` | `play/index.html` | Сцена персонажа и реакции на ответ. |
| `announceScreen()` | `play/index.html` | Последовательности озвучки текущего экрана. |
| `MEDIA_ASSETS` | `play/assets.js` | Реальные пути медиа. |
| `createAudioManager()` | `play/audio-manager.js` | Загрузка, очередь, отмена, повтор и fallback аудио. |

## 12. Common modification paths

### Where to look when changing...

- Главный экран → `play/index.html`: `renderHome()`, `.home`, `.hero-scene`.
- Упражнение/учебный материал → `play/index.html`: `letters`, типы вопросов, `ensureQuestion()`, `questionBody()`.
- Проверка ответа → `play/index.html`: `checkAnswer()`, `registerMistake()`, `registerCorrectAnswer()`, `completeQuestion()`.
- Реакция Marius → `play/index.html`: `showAnswerFeedback()`, `pickSuccessSticker()`, `renderCompletionSticker()`; `play/images/stickers/`.
- Добавление предмета → `play/images/`, `play/assets.js`, затем один объект в `ITEMS`; для учебной награды добавить его ID в `rewardConfig.itemIds`.
- Мобильная вёрстка → `play/index.html`: соответствующий CSS-селектор и все его переопределения в `@media`.
- Награды → `play/index.html`: `ITEMS`, `rewardConfig`, `finishBlock()`, `chooseReward()`, `migrateRewards()`.
- Сохранение → `play/index.html`: `initialState()`, `loadProgress()`, `saveProgress()`.
- Звуки → `play/audio/`, `play/assets.js`, `play/audio-manager.js`; события озвучки — `announceScreen()` в `play/index.html`.

## 13. Sensitive areas

- `AppState`, ключи/версии сохранения и `migrateRewards()` связывают учебную позицию, статистику и владение вещами: изменение схемы влияет на существующий прогресс. Не переиспользовать старые ID и не обходить inventory-функции при выдаче наград.
- `letters`, типы вопросов и размеры групп используются генератором, загрузчиком сохранений, статистикой и условиями наград; изменение курса требует согласованности этих мест.
- `checkAnswer()`, `completeQuestion()`, `answerLocked`, `viewEpoch`, `transitionTimer` связывают ответ, немедленное сохранение, аудио и отложенный переход; нарушение порядка может повторно засчитать ответ или показать старый экран.
- `go()` / `showScreen()` обслуживают все экраны и незавершённый выбор подарка.
- `:root`, общие кнопки, `.character-actor` и поздние `@media` влияют на несколько экранов и совмещение аксессуаров с персонажем.
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
Marius → play/index.html: renderCharacter / showAnswerFeedback; play/images/stickers/
Assets → play/assets.js; play/images/; play/audio/
Inventory → play/index.html: ITEM_SLOTS / ITEMS / itemCatalog / equipItem
Rewards → play/index.html: rewardConfig / chooseReward / finishBlock
Progress → play/index.html: initialState / loadProgress / saveProgress
Mobile CSS → play/index.html: <style> / @media / .character-actor
Audio → play/audio-manager.js; play/index.html: announceScreen; play/assets.js
Deployment → README.md; index.html; .nojekyll; play/manifest.webmanifest
```

## 16. Комната Мариуса (A/B/C)

Порядок: `lesson` A → B → C → `letterReward` C → **`room`** → прежние `miniIntro` / `mini` (5 вопросов) → награда → D. Фаза `room` использует тот же `view='course'`, `go()`, `showScreen()`, `saveProgress()` и AudioManager.

- `play/hidden-object-game.js`: `DEBUG_HOTSPOTS`, `ROOM_HOTSPOTS` (проценты от изображения), `ROOM_ROUNDS`, `MARIUS_ROOM`; `HiddenObjectGame.initialState/restore/choose/hint/next/render`.
- `play/images/marius-room-abc.png`: цельная предоставленная иллюстрация; зарегистрирована в `play/assets.js` как `marius_room_abc`.
- `play/index.html`: `renderRoom`, `wireRoomScene`, `updateRoomView`, `selectRoomObject`, `nextRoomRound`, `continueAfterRoom`, `replayRoom`; обработчики `room-*` в существующем `actions`.
- `AppState.roomABC`: `currentRound`, `foundObjects`, `wrongAttempts`, `gameCompleted`. Сохраняется вместе с курсом в прежних ключах. `loadProgress` валидирует данные; старый `miniIntro` A/B/C при продолжении открывает комнату, начатый тест и последующие уроки сохраняют позицию.
- Игра не вызывает `registerMistake`, `registerCorrectAnswer`, `finishBlock` и не выдаёт награды: это практика перед проверкой. Финиш и явная кнопка переводят в существующий `miniIntro`.
- `tests/room.test.cjs`: новая механика, сохранения, повтор, старые данные и расчёт размеров зон. `tests/course-regression.test.cjs`: прежние полные проверки курса с добавленным проходом комнаты; адаптер DOM/audio — `tests/support/trainer-harness.cjs`.
- `tests/inventory.test.cjs`: обязательные поля каталога, восемь слотов, общие операции, перезагрузка и миграция rewardStateVersion 2 → 3.
