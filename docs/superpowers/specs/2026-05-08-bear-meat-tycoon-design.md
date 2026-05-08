# Bear Meat Tycoon — Design Doc

- **Date:** 2026-05-08
- **Status:** Draft, pending user review
- **Scope:** MVP, full concept loop (см. Decisions ниже)
- **Branch:** `claude/install-superpowers-skill-rfdP9` (для дизайн-фазы); реализация — в `feat/game-mvp`

## Концепт

Аркада-кликер в духе idle-tycoon, вдохновлённая рекламным креативом игры **Tile Survive**. Запускается как PWA на iPhone (Safari → Add to Home Screen → standalone), без публикации в App Store.

Ядро петли:

1. База игрока окружена деревянным забором.
2. На базу нападают медведи; ломают забор, могут пройти и атаковать игрока.
3. Игрок ходит по джойстику; авто-рубит ближайшего медведя топором.
4. Из убитого медведя выпадают raw-куски мяса, авто-подбираются на стопку у игрока за спиной.
5. Игрок несёт стопку к костру → стопка переливается в очередь готовки.
6. Кусок готовится за фиксированное время → cooked-кусок выпадает на пол рядом с костром.
7. Игрок подбирает cooked, несёт к прилавку → стопка переливается на counter.
8. Покупатели спавнятся с края карты, встают в очередь, забирают по куску с counter, оставляют рядом money-pile, уходят.
9. Игрок собирает money-piles → пополняет pocket.
10. У трёх стационарных upgrade-падов (возле забора, костра, кассы) можно «вкачать» деньги, чтобы получить эффект: repair-fence, hire-cook, hire-cashier.

## Decisions, принятые в brainstorm

| # | Вопрос | Решение |
|---|---|---|
| 1 | Scope MVP | **B.** Полный цикл концепта + 3 пада прокачки + волны медведей с простым scaling-ом |
| 2 | Угроза | **C.** Забор разрушим (HP per segment) **и** игрок имеет HP |
| 3 | При смерти игрока | **A.** Респавн в центре базы через 2с, теряется стопка мяса (дропается на месте смерти как raw/cooked), деньги/найм/прокачка сохраняются |
| 4 | Арт | **B.** Бесплатные CC0 модели (Kenney Animated Characters, Quaternius Animals/Survival Kit) с встроенными скелетными анимациями. Импорт через GLTFLoader. |
| 5 | Прокачки | **C.** Три пада, разложенные пространственно: `repair-fence` у забора, `hire-cook` у костра, `hire-cashier` у кассы |
| 6 | Архитектура | **A.** Vite + ES-модули + Vitest. PWA через `vite-plugin-pwa`. Деплой на GitHub Pages. |

---

## Section 1 — Project structure & build

```
mobile-game/
├── index.html              # точка входа, viewport meta, manifest link
├── package.json
├── vite.config.js          # base path для GitHub Pages, vite-plugin-pwa
├── public/
│   ├── manifest.webmanifest # PWA-манифест
│   ├── icons/              # 192/512/maskable PNG для iOS home screen
│   └── models/             # CC0 .glb (Kenney/Quaternius)
├── src/
│   ├── main.js             # bootstrap: renderer, scene, RAF loop
│   ├── world.js            # world-state factory + save/load в LocalStorage
│   ├── loop.js             # фиксированный dt, requestAnimationFrame
│   ├── balance.js          # ВСЕ магические числа в одном файле
│   ├── input.js            # виртуальный джойстик (touch events)
│   ├── camera.js           # follow-camera 3/4 ракурс
│   ├── assets.js           # GLTFLoader, кэш моделей и анимаций
│   ├── audio.js            # SFX (Web Audio API)
│   ├── ui.js               # HUD: счётчик денег, HP, лейблы падов
│   └── systems/            # каждый exports update(world, dt), не импортирует Three.js
│       ├── player.js
│       ├── bear.js
│       ├── fence.js
│       ├── meat.js
│       ├── fire.js
│       ├── customer.js
│       ├── register.js
│       ├── money.js
│       ├── upgrade-pad.js
│       └── employee.js
├── tests/                  # Vitest, чистая логика
│   └── systems/...
├── docs/superpowers/
│   ├── specs/              # design-doc (этот файл)
│   └── plans/              # implementation-plan (после writing-plans)
└── .github/workflows/
    └── deploy.yml          # CI: тесты + билд + deploy gh-pages
```

**Ключевой принцип разделения:** `systems/` оперирует чистыми данными `world` и не импортирует Three.js. `main.js` и `render/`-биты (camera, ui, assets) делают синхронизацию Three.js-объектов с `world` каждый кадр. Это даёт юнит-тесты без headless-браузера.

**Деплой:** GitHub Actions на push в `main` → `npm ci && npm test && npm run build` → publish `dist/` на GitHub Pages. URL: `https://damboskill-blip.github.io/mobile-game/`. Открыл в Safari → Share → Add to Home Screen → запускается полноэкранно.

---

## Section 2 — World state & system contract

### Структура `world`

```js
{
  time:     { elapsed, dt, frameCount },
  base:     { center: {x, z}, radius },
  player:   { pos, rot, hp, hpMax, state: 'alive'|'dead', respawnTimer,
              speed, axe: { range, damage, cooldown, cooldownTimer },
              stack: { type: 'raw'|'cooked'|null, count, max } },
  bears:    [{ id, pos, rot, hp, state, target, attackCD }],
  fence:    { segments: [{ id, pos, rot, hp, broken }] },
  meatRaw:  [{ id, pos, despawnTimer }],
  meatCooked: [{ id, pos, despawnTimer }],
  fire:     { pos, cooking: [{ id, timer }], capacity },
  register: { pos, counterStack, moneyPiles: [{ id, pos, amount }] },
  customers: [{ id, pos, state, target }],
  money:    { pocket },
  upgradePads: [{ id, type, pos, cost, deposited, completed }],
  employees: [{ id, type, pos, state, carrying }],
  rng:      seed,
  nextId:   monotonic_int,
}
```

### Контракт системы

Каждый файл из `src/systems/` экспортирует одну функцию:

```js
export function update(world, dt) { /* мутирует world */ }
```

Никакого Three.js. Все системы тестируются на Vitest без браузера.

Порядок вызова в `loop.js`:

1. `input` → пишет вектор движения в `player.input.move`
2. `systems/player.update` (движение, авто-атака, респавн)
3. `systems/bear.update` (AI: к ближайшему сегменту → ломает → ищет игрока)
4. `systems/fence.update` (HP, broken-сегменты)
5. `systems/meat.update` (despawn таймер, авто-подбор)
6. `systems/fire.update` (cookTimer, спавн cooked)
7. `systems/customer.update` (спавн, путь, покупка, уход)
8. `systems/register.update` (списание со стопки, спавн денег)
9. `systems/money.update` (авто-подбор)
10. `systems/upgrade-pad.update` (приём денег, спавн NPC при completion)
11. `systems/employee.update` (cook ferries fire→counter, cashier buff)

### Save / Load (LocalStorage)

Ключ: `bmt:save:v1`. Структура версионирована, при несовместимом изменении балансовых формул save обнуляется с уведомлением.

Сохраняется (медленно меняющееся):

- `money.pocket`
- `fence.segments[].hp` и `.broken`
- `upgradePads[].deposited` и `.completed`
- `employees` (список нанятых, без позиций)
- `time.elapsed` (для difficulty-scaling)

Эфемерное (медведи, мясо, очередь покупателей, money-piles) при загрузке регенерируется с нуля.

### IDs

Один монотонный счётчик `world.nextId`. Любое создание сущности: `id = ++world.nextId`. Дешёвая дедупликация и стабильные логи.

---

## Section 3 — Subsystems (правила)

### Player

- Скорость = вектор джойстика × `player.speed`. Поворот → к вектору движения.
- **Auto-attack:** каждый кадр ищет ближайшего медведя в `axe.range`. Если `cooldownTimer ≤ 0` → отнимает `axe.damage` HP, ставит `cooldownTimer = axe.cooldown`.
- **Auto-pickup:** при столкновении с raw / cooked / money-pile подбирает, если в стопке место (или это деньги).
- **Auto-drop:** пересечение триггера `fire` с raw-стопкой → переливание в `fire.cooking` (учитывая `capacity`, остаток ждёт). Пересечение триггера `register` с cooked-стопкой → переливание в `register.counterStack`.
- **Death:** HP=0 → `state='dead'`, ставится `respawnTimer=2s`, текущая стопка дропается на земле как raw/cooked. На таймауте respawn в `base.center`, `hp = hpMax`, стопка пуста.

### Bears

- Spawn на радиусе `base.radius + 6` от центра, угол случайный, с периодом `bear.spawnPeriod` (см. balance).
- AI state machine:
  - `approaching` — идёт к ближайшему **не-broken** сегменту забора. Если сегмент ломается на пути — переход в `through`.
  - `attacking-fence` — стоит перед сегментом, бьёт каждые `attackCD` секунд по 10 HP.
  - `through` — нашёл сломанный сегмент, идёт к игроку.
  - `attacking-player` — бьёт игрока по `attackCD` (damage = `bear.damage`).
- Death: HP=0 → удаляется, на позиции спавнятся 3 куска `meatRaw` с разбросом по углу.

### Fence

- 16 сегментов равномерно по окружности `base`. Каждый: `hp = 100`, `broken = false`.
- При получении урона: `hp -= damage`. Если `hp ≤ 0` → `broken = true`, сегмент визуально падает.
- Repair pad: восстанавливает `hp = 100` и `broken = false` всем сегментам сразу.

### Meat

- `meatRaw[]` и `meatCooked[]` — куски на полу. Авто-подбор при `dist(player, piece) < pickupRadius` и стопка не переполнена. `despawnTimer = 60s` чтобы не было засора.
- Тип определяется массивом, в котором кусок лежит.

### Fire

- `fire.cooking[]` — `[{id, timer}]`. timer убывает на dt; на 0 → спавн `meatCooked` на пол в дуге вокруг костра, кусок удаляется из cooking.
- `fire.capacity = 5`. Переливание стопки игрока в `cooking[]` идёт по одному куску, пока есть место. Лишнее остаётся в `player.stack` — игрок ждёт пока освободится или возвращается через минуту. Внутренняя очередь `fire.queue` не заводится — `player.stack` уже служит этой ролью.

### Customers & Register

- `register.counterStack` — число. Визуально — стопка cooked-моделей сверху counter.
- Customer спавнится на краю карты раз в `customer.spawnInterval`, **если** `counterStack > 0` ИЛИ `customers.length < queue.softMin`. Это даёт ощущение перманентной очереди.
- AI: `entering → queuing (позиция = counter + offset*(-i)) → buying (1с, counterStack--) → leaving (к краю карты, despawn)`. На каждый buy спавнится `moneyPile` с amount = `pricePerPiece` рядом с прилавком.

### Money

- `moneyPile{ pos, amount }` — авто-подбор → `money.pocket += amount`.
- Никогда не despawn. Если на полу копится слишком много — это симптом неуспеваемости игрока, дизайнерски норм.

### Upgrade Pads

- 3 пада, расположенных пространственно:
  - `repair-fence` (рядом с забором, например у северного сегмента) — стоимость $200, **многоразово**, эффект: heal all segments.
  - `hire-cook` (рядом с костром) — стоимость $500, **разово**, эффект: спавн cook NPC.
  - `hire-cashier` (рядом с кассой) — стоимость $800, **разово**, эффект: спавн cashier NPC.
- Логика депозита: пока игрок стоит на паде с `pocket > 0`, каждый кадр `pocket -= rate*dt; pad.deposited += rate*dt` (например `rate = 50/s`, визуально — поток купюр).
- Семантика completion:
  - **One-shot** пады (`hire-cook`, `hire-cashier`): при `deposited >= cost` → `completed = true`, эффект применяется один раз, дальше пад «погашен» (визуально серый, депозит игнорируется).
  - **Multi-use** пад (`repair-fence`): при `deposited >= cost` → эффект применяется, `deposited = 0`, `completed` остаётся `false` навсегда. Можно депозитить снова сразу.

### Employees

- **Cook**: state machine `idle → walk-to-cooked (ближайший meatCooked у костра) → pickup (carrying = piece id) → walk-to-counter → drop (counterStack++) → idle`. Скорость и параметры в `balance.js`. Один cook (max 1 в MVP).
- **Cashier**: стоит у кассы, не двигается. Эффект: `customer.buyDuration *= 0.5`. Один cashier (max 1).

---

## Section 4 — Controls, camera, UI

### Управление

- **Виртуальный джойстик** в левом нижнем углу: статичная база радиус ~70px, стик внутри, мертвая зона 15%. Touch event only.
- Никаких других кнопок. Всё взаимодействие — через proximity-триггеры (рубка, подбор, дроп, депозит).
- Multi-touch не нужен. Первый touch — джойстик, остальные игнорируем.

### Камера

- **Perspective**, FOV 35°, угол наклона ~55° от горизонтали. Дистанция от игрока ~18 юнитов.
- Follow с smoothing: `lookAtTarget = lerp(lookAtTarget, player.pos, 0.08)` каждый кадр.
- Без вращения, без зума пользователем.
- Лёгкий screen shake (0.05 юнита, 0.2с) при ударе медведя по забору.

### HUD (HTML overlay)

Поверх `<canvas>` лежит `<div id="hud">` с `position: fixed`. Дёшево и без Three.js-UI:

- **Top bar**: 💰 pocket money | ❤️ player HP bar
- **Bottom-left**: virtual joystick
- **Floating labels** в мире (CSS-3D или sprite билборды) над каждым падом: `🪓 Hire Cook · $500 · ▓▓▓░░ 60%`
- **Над сегментом забора при HP < 50%**: красная HP-полоса
- **🔇 toggle SFX** в правом верхнем углу — единственная настройка в MVP

### iOS-адаптация

- `viewport`: `width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no`
- iOS safe areas через `env(safe-area-inset-*)`. Джойстик и HUD не лезут под notch / home indicator.
- DPR clamp: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` — иначе iPhone Pro рендерит 3x и тормозит.
- `visibilitychange` → пауза цикла, чтобы не накапливать dt в фоне.
- `manifest.orientation: "portrait"`. Если игрок повернёт — overlay с просьбой повернуть обратно.

### Принципиально не делаем (YAGNI)

- Никаких меню настроек, шопов, диалоговых окон.
- Никаких слайдеров громкости, только on/off SFX.
- Никаких внутриигровых туториалов — geometry читается без слов.

---

## Section 5 — Balance & difficulty scaling

### `src/balance.js` — все цифры в одном месте

| Категория | Параметр | Значение |
|---|---|---|
| Player | speed | 5 ед/с |
| | hpMax | 100 |
| | axe.range | 1.8 |
| | axe.damage | 35 |
| | axe.cooldown | 0.4 с |
| | stack.max | 10 |
| | respawn | 2 с |
| | pickupRadius | 1.0 ед |
| Bear | hp (база) | 70 |
| | speed | 2.5 ед/с |
| | damageFence (база) | 10 |
| | damagePlayer | 15 (фикс) |
| | attackCD | 1.0 с |
| | meat drops | 3 |
| Fence | сегментов | 16 |
| | hp сегмента | 100 |
| Fire | capacity | 5 |
| | cookTimer | 2.0 с |
| Meat | despawn | 60 с (raw и cooked одинаково) |
| Customer | spawnInterval | 3.0 с |
| | buyDuration | 1.0 с |
| | pricePerPiece | $5 |
| | queue.softMin | 2 |
| | queue.max | 5 |
| Pads | repair-fence | $200, многоразово |
| | hire-cook | $500, разово |
| | hire-cashier | $800, разово |
| | depositRate | $50/с |

### Difficulty scaling

`m = time.elapsed / 60` (минут с начала сессии)

```js
bear.spawnPeriod = clamp(4.0 - 0.3 * m, 1.0, 4.0)   // 4с → 1с к 10й минуте
bear.hp          = 70 + 5 * m                        // +5 HP/мин
bear.damageFence = clamp(10 + 1 * m, 10, 20)         // потолок +100%
// bear.damagePlayer = 15 — НЕ масштабируется. Risk-of-death и так растёт через
// возросший спавн и HP медведей; масштабирование damagePlayer создало бы too-spiky экшен.
```

Игрок не качает свои стат в MVP — компенсация через апгрейды цикла:

- `repair-fence` поддерживает забор живым.
- `hire-cook` ≈ удвоение throughput → +$200/мин.
- `hire-cashier` ≈ удвоение скорости продажи.

В какой-то момент медведи перерастут забор — это нормально для endless idle. Игрок просто играет «насколько хватит». `time.elapsed` сохраняется в save, scaling сохраняется при возврате.

### Точки чувствительности (что точно поменяется при тестинге)

- `bear.spawnPeriod`-кривая: если на старте слишком пусто — занизить начальное.
- `pricePerPiece × customer.spawnInterval`: задают $/мин, влияет на скорость открытия падов.
- Стоимости падов: должны достигаться на дистанции ~2 / ~5 / ~10 минут соответственно.
- `axe.damage` vs `bear.hp`: на старте 2 удара, после 1 минуты 3 удара. Контролирует ощущение скорости рубки.

### Versioning

`balance.js` экспортирует `BALANCE_VERSION = 1`. Save хранит `version` поле. При несовместимом изменении формул — стираем save с alert. MVP-уровень, без миграций.

---

## Section 6 — Testing, PWA, delivery

### Tests (Vitest, TDD)

```
tests/
├── world.test.js
├── balance.test.js
└── systems/
    ├── player.test.js
    ├── bear.test.js
    ├── fence.test.js
    ├── meat.test.js
    ├── fire.test.js
    ├── customer.test.js
    ├── register.test.js
    ├── money.test.js
    ├── upgrade-pad.test.js
    └── employee.test.js
```

- Запуск: `npm test` (watch), `npm run test:ci` (single).
- TDD-цикл: failing test → реализация → рефакторинг.
- Целевое покрытие: >80% логики `systems/`. Без фанатизма.
- Игнорируем headless-браузер тесты — manual test на iPhone каждый milestone полезнее.

### PWA

`index.html`:

```html
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

`manifest.webmanifest`:

```json
{
  "name": "Bear Meat Tycoon",
  "short_name": "BearMeat",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1a1410",
  "theme_color": "#1a1410",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Service worker через `vite-plugin-pwa`:

- Precache бандлов и моделей `.glb` → офлайн-режим после первой загрузки.
- `CacheFirst` для ассетов, `NetworkFirst` для `index.html` (апдейты подхватываются).

### Deploy

`.github/workflows/deploy.yml`:

- Trigger: push в `main`.
- Steps: checkout → setup-node → `npm ci` → `npm test` (gate) → `npm run build` → upload `dist/` → publish via `actions/deploy-pages`.
- `vite.config.js`: `base: '/mobile-game/'` — нужно для GitHub Pages subpath.
- Public URL: `https://damboskill-blip.github.io/mobile-game/`.

### Iteration loop (mobile-only dev)

Поскольку разработка идёт через Claude Code на iPhone (без локального компа), классический LAN-HMR недоступен. Цикл итерации:

1. Claude вносит правки на feature-ветке (`feat/game-mvp`).
2. Push → CI билдит и публикует preview через GitHub Pages (либо deploy ветки `feat/game-mvp` под `pr-preview/<branch>` поддиректорию).
3. Открываем URL preview в Safari на iPhone → перезагрузка страницы → проверяем фичу.
4. Сообщаем Claude баги/фидбек, итерируем.

Скорость итерации ≈ 1-2 минуты на цикл (build + deploy). Это медленнее чем HMR, но приемлемо для регулярной работы.

### Acceptance criteria для MVP

«MVP готов» когда на iPhone:

1. Открывается по URL в Safari, добавляется на главный экран.
2. Из иконки запускается полноэкранно (без хрома Safari).
3. Игровая петля проходится end-to-end: рубка → стопка → костёр → cooked → прилавок → клиенты → деньги → депозит на паде → найм NPC.
4. Все три пада работают (`repair-fence`, `hire-cook`, `hire-cashier`) и корректно влияют.
5. Прогресс сохраняется в LocalStorage и восстанавливается при следующем запуске.
6. Стабильные 60 fps на iPhone 11 и новее.
7. Все unit-тесты проходят в CI.

---

## Out of scope (явный YAGNI для MVP)

- Multiple bear types (только один тип).
- Player stat upgrades (axe damage / speed / stack max — только дефолтные значения).
- Multi-tier employees (cook и cashier — каждый максимум 1, без апгрейда уровня).
- Day/night cycle.
- Music tracks (только SFX).
- Multiple maps / arenas.
- Achievements, leaderboards, accounts.
- Cloud sync (только LocalStorage).
- Touch tutorial / onboarding.
- Подменю настроек (только SFX on/off).

Эти фичи могут быть добавлены инкрементально после того как core loop валидирован на iPhone.
