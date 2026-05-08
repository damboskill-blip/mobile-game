# Mobile Game — Bear Meat Tycoon (рабочее название)

## Концепт

Аркада-кликер в духе idle-tycoon, вдохновлённая рекламным креативом игры **Tile Survive**.

**Игровой цикл:**
1. База игрока окружена деревянным забором.
2. На базу нападают медведи.
3. Персонаж вооружён топором; при приближении к медведю автоматически рубит его.
4. Из убитого медведя выпадает несколько кусков мяса.
5. Куски мяса крепятся стопкой к спине игрока (визуально — растущая башенка).
6. Игрок несёт мясо к костру; стопка автоматически перекладывается на костёр и жарится.
7. Жареные куски выпадают на пол рядом с костром — их можно подобрать и отнести к кассе.
8. У кассы всегда стоит очередь NPC-покупателей.
9. Сложенное у кассы мясо покупатели разбирают и оставляют деньги рядом.
10. Игрок собирает деньги.
11. Рядом с кассой есть зона апгрейда: если донести туда достаточно денег, на кассе появляется
    NPC-сотрудник, который сам носит мясо с костра к кассе.

**Дальнейший рост (предположительно — уточнить на /brainstorm):**
- Апгрейды забора, топора, скорости передвижения.
- Найм NPC-рубщиков, NPC-поваров.
- Новые типы врагов, новые продукты.

## Технические решения

| Параметр | Решение |
|---|---|
| Стек | **Three.js** (3D-сцена, top-down камера, как в креативе Tile Survive) |
| Платформа | Веб, **PWA** с `manifest.json` + service worker |
| Запуск на iPhone | Safari → "Добавить на экран Домой" → полноэкранный режим (`display: "standalone"`, `apple-mobile-web-app-capable`) |
| Управление | Тач-джойстик на экране (виртуальный стик слева снизу) |
| Без App Store | Да, никакой публикации в сторах |
| Хостинг | TBD на следующей сессии (вероятно GitHub Pages для лёгкого тестирования с iPhone) |

## Процесс разработки

Используем скиллы **superpowers** от Jesse Vincent (obra), завендоренные прямо в
репозиторий: `.claude/skills/<skill-name>/SKILL.md`. Источник —
[github.com/obra/superpowers](https://github.com/obra/superpowers), MIT-лицензия
скопирована в `.claude/skills/SUPERPOWERS-LICENSE`.

Завендорено 14 скиллов: `using-superpowers`, `brainstorming`, `writing-plans`,
`executing-plans`, `subagent-driven-development`, `dispatching-parallel-agents`,
`test-driven-development`, `systematic-debugging`, `verification-before-completion`,
`receiving-code-review`, `requesting-code-review`, `writing-skills`,
`using-git-worktrees`, `finishing-a-development-branch`.

Рекомендуемый порядок работы:
1. **brainstorming** — добить недостающие детали геймплея, баланс, прогрессия,
   получить согласованный design-doc.
2. **writing-plans** — формальный план реализации (этапы, файлы, зависимости).
3. **executing-plans** или **subagent-driven-development** — пошаговая реализация.
4. **test-driven-development** + **verification-before-completion** — на каждом
   этапе писать тесты раньше кода и проверять прохождение перед коммитом.

Скиллы вызываются через инструмент **Skill** (например, `Skill(skill: "brainstorming")`).
Если в сессии доступны как slash-команды (`/brainstorm` и т.п.) — используй их.

## Branch

Разработка ведётся на `claude/install-superpowers-skill-rfdP9` (создана при установке superpowers).
Для непосредственной работы над игрой логично создать новую ветку, например
`feat/game-mvp`, после `/write-plan`.
