# YZ — «Воздушная экспедиция Мариуса»

YZ интегрирована в основной маршрут ABC Safari. Принятая физика, управление, 12 заданий, доставка, финальный автопилот и экран «Алфавит покорён!» сохранены.

## Точки входа

- Production: игра открывается из курса автоматически после `cumulative_review_AZ`.
- Demo: `/play/?demo=1&screen=flight_yz`.
- Debug: `/play/?demo=1&screen=flight_yz&flightDebug=1`.

Demo/debug используют отдельный demo-контекст и не записывают production-прогресс. В debug доступны `Skip to final task` и `Reset YZ session`; второй сбрасывает только текущую YZ-сессию.

## Реальное место в курсе

Финальная часть маршрута:

`review_VWX → railway_vwx → урок Y → урок Z → review_YZ → cumulative_review_AZ → flight_yz → results`

Таким образом, существующие уроки Y/Z, локальное повторение и итоговое A–Z повторение не пропускаются. После закрытия завершённой экспедиции используется существующий экран `results`; новый фиктивный урок не создаётся.

Старое сохранение версии 8, уже завершившее прежний A–Z маршрут, мигрирует в `flight_yz`. Пользователь с незавершёнными буквами продолжает с первой неосвоенной буквы, как и раньше.

## Архитектура

- `play/flight-yz-game.js` — разметка, учебный state machine, восстановление сессии, Pointer Events, физика, magnetic assist, resize и полный `destroy()`.
- `play/flight-yz-game.css` — mobile-first сцена, HUD, доставка, приближение города, финальный автопилот, принятый экран награды и debug UI.
- `play/index.html` — production-маршрут, адаптер сохранения, аудио, completion, звёзды, achievement и lifecycle.
- `play/student-domain.js` — общие idempotent-транзакции звёзд и achievement `alphabet_conqueror`.
- `play/images/flight-yz/` — существующие PNG сцены.
- `play/images/giraffe_base.png` — существующий прозрачный ассет Мариуса.
- `play/images/railway-vwx/railway-cargo-01.png` — существующий ассет посылки.

Логический холст остаётся 941×1672. Вся сцена масштабируется общей cover-трансформацией, а pointer-координаты переводятся обратно в логическую систему.

## Учебные этапы

`EDUCATION.stages`:

1. `letterNames` — названия Y/Z;
2. `letterSounds` — звуки Y/Z;
3. `words` — четыре доставки Yo-yo/Zebra;
4. `finalExpedition` — четыре итоговых задания.

Общий прогресс — 12. Финальные задания: название Y/Z, звук второй буквы, слово Y/Z и `X — Fox` среди `W — Whale`, `X — Fox`, `Y — Yo-yo`.

Принятые настройки находятся в `PHYSICS`, `LANDING_ZONES`, `FINAL_LANDING_ZONE`, `CONFIG.start`, `CONFIG.planeSize`, `ISLANDS` и `MARIUS`. Во время интеграции они не менялись.

## Сохранение

Схема приложения обновлена до `APP_STATE_VERSION = 9`. Данные YZ находятся в `AppState.flightYZ` и явно разделены:

```text
flightYZ
├── version: 1
├── session
│   ├── stage / stageIndex / stageProgress
│   ├── tasks / taskIndex / taskId / taskType
│   ├── target / assignment / audioType / answerMode
│   ├── totalProgress / journeyProgress / errors
│   └── status / parcelState / lastOutcome / lastIslandId
└── permanent
    ├── completed
    └── completedAt
```

В session не сохраняются координаты самолёта, velocity, bank, pointer, RAF, particles или текущая анимация.

После восстановления runtime всегда начинает из `CONFIG.start`: скорость и крен равны нулю, pointer неактивен, autopilot выключен. Сформированные `tasks` и текущее `assignment` сохраняются, поэтому shuffle сессии не меняется.

Правила восстановления transient-состояний:

- незавершённый landing возвращается к текущему заданию без начисления;
- закрытие во время delivery возвращает word-task с прикреплённой посылкой;
- завершённая delivery/respawn продолжает со следующего задания;
- `transitioning` открывает первый task нового этапа;
- `journeyProgress` 0–4 восстанавливает степень приближения города;
- `finalFlight`, `finalCelebration` или progress 12 восстанавливают готовый финальный экран.

Текущий target проигрывается через существующий `AudioManager`. При блокировке autoplay сохраняется штатный повтор после первого пользовательского жеста.

## Completion, звёзды и награда

Успешное завершение фиксируется сразу после подтверждённого правильного ответа №12, до декоративного `finalFlight`.

- permanent completion: `AppState.flightYZ.permanent.completed`;
- глобальное завершение: `AppState.completed`;
- три звезды: общая `StudentDomain.awardStars()` с source id `minigame:flight-yz`;
- achievement: `alphabet_conqueror`, заголовок «Покоритель алфавита»;
- существующий финальный destination: `results`.

Повторная выдача защищена на трёх уровнях: permanent-флаг, уникальный `sourceId` star-транзакции и уникальный achievement id. Refresh, повторный callback, replay и второе прохождение не создают дубликатов.

Кнопка «Ещё раз» создаёт новую session с `letterNames` и progress 0/12, но не удаляет permanent completion, звёзды или achievement. Повторное прохождение снова показывает финальный экран без повторной награды.

## Lifecycle

`showScreen()`, `visibilitychange` и `pagehide` вызывают `clearFlightYZRuntime()`. Controller удаляет timers, RAF, Pointer Events, resize observer, delivery ghosts и временный DOM. Audio останавливается через общий менеджер. Повторное открытие сначала уничтожает предыдущий controller, поэтому listeners и RAF не накапливаются.

## Тесты

- `tests/flight-yz-game.test.cjs` — state machine, физика, restore transient-состояний, sequence/assignment, word parcel и finalFlight.
- `tests/flight-yz-integration.test.cjs` — production route, session restore, completion на №12, три звезды, achievement, replay, demo isolation и миграция v8.
- `tests/course-regression.test.cjs` — полный маршрут A–Z до `flight_yz` и `results`.
- `tests/alphabet-reviews.test.cjs` — переход `cumulative_review_AZ → flight_yz`.

## Локальный запуск

Из корня проекта:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Проверка production-входа: `/play/` с обычным сохранением курса. Demo/debug URL остаются доступны для ручной приёмки.
