# UNITS CPX - беклог і оцінка розробки на Unreal Engine

Дата: 2026-05-14

## Мета

Перезібрати поточний веб-прототип UNITS CPX як продукт на Unreal Engine, придатний для демонстрації, подальшої розробки та масштабування.

Це не магазин і не звичайний ігровий цикл. Цільовий продукт - CPX / тактичний інструмент, де інструктор готує бойовий наказ, сторони отримують задачі, підрозділи відображаються на тактичній карті, а для демонстрації можна однією кнопкою згенерувати готову сесію.

## Припущення для оцінки

- Цільова платформа MVP: Windows PC build.
- Рушій: Unreal Engine 5.x.
- Перший результат: playable vertical slice, а не повний військовий симулятор.
- Візуальний напрям: тактична карта з рельєфом, APP-6 / NATO умовні знаки в першу чергу, 3D-моделі підрозділів пізніше.
- Режим сесії для MVP: hotseat / один комп'ютер, як у поточному прототипі.
- Multiplayer, акаунти, кімнати, серверна синхронізація, бекенд і повні інструкторські moderation tools - окремі фази.
- Валюта оцінки: USD.
- Розрахунок бюджету зроблений за blended hourly rate:
  - lean outsource: 45 USD/год;
  - реалістична змішана команда: 65 USD/год;
  - senior-heavy / agency: 90 USD/год.

## Рекомендована команда

Мінімальна команда для демо:

- 1 Unreal gameplay developer.
- 1 Unreal UI / tools developer.
- 1 technical artist / спеціаліст з карти та візуалізації.
- 0.5 UI/UX designer.
- 0.25 producer / product analyst.
- 0.5 QA з середини проєкту.

Рекомендована команда для vertical slice:

- 1 tech lead / Unreal architect.
- 2 Unreal developers.
- 1 UI/UX designer.
- 1 technical artist.
- 1 QA.
- 0.5 producer / product analyst.
- Optional backend developer, коли починається persistence або multiplayer.

## Сценарії розробки

| Сценарій | Обсяг | Час | Години | Бюджет 45/h | Бюджет 65/h | Бюджет 90/h |
|---|---|---:|---:|---:|---:|---:|
| Demo rebuild | Швидке Unreal-демо поточного core flow | 6-8 тижнів | 700-1,100 | 31k-50k | 46k-72k | 63k-99k |
| MVP vertical slice | Стабільна сесія: інструктор + дві сторони | 10-14 тижнів | 1,600-2,400 | 72k-108k | 104k-156k | 144k-216k |
| Production alpha | Save/load, кращі tools, базові fog/support/comms | 4-6 місяців | 3,500-5,500 | 158k-248k | 228k-358k | 315k-495k |
| Networked product | Акаунти, кімнати, multiplayer tables, backend, admin | 6-9 місяців | 6,000-10,000 | 270k-450k | 390k-650k | 540k-900k |

Рекомендована ціль для зовнішньої команди: **MVP vertical slice, 10-14 тижнів, 1,600-2,400 годин**.

## Phase 0 - Discovery і технічне проєктування

Оцінка: 1-2 тижні, 120-220 годин.

Задачі:

- Провести аудит поточного веб-прототипу.
- Визначити Unreal-архітектуру: gameplay framework, data assets, UI framework, save model.
- Описати schema для unit data: тип, сторона, символ, параметри, рух, зв'язок, забезпечення.
- Описати schema для battle order: обстановка, ORBAT, задачі, кінцевий стан, забезпечення, розвіддані.
- Визначити map coordinate system: клітинки, world coordinates, relief sampling.
- Зробити risk spikes:
  - tactical map texture to terrain height;
  - APP-6 symbol rendering;
  - взаємодія з 100x100 grid;
  - читабельність UI на великій тактичній карті.

Deliverables:

- Unreal technical design document.
- Feature backlog з пріоритетами.
- Draft data model.
- Migration plan з поточного прототипу.

## Phase 1 - Unreal project foundation

Оцінка: 2-3 тижні, 250-400 годин.

Задачі:

- Створити структуру Unreal-проєкту.
- Додати core game mode / session state.
- Реалізувати ролі: Side 1, Side 2, Instructor.
- Реалізувати hotseat turn/session state.
- Реалізувати Data Assets для типів підрозділів.
- Реалізувати базовий event journal.
- Реалізувати camera controls для tactical map.
- Налаштувати Windows build pipeline.

Acceptance:

- Проєкт відкривається і збирається.
- Сесія перемикає активну сторону.
- Базова карта завантажується.
- Unit types можна налаштовувати без зміни коду.

## Phase 2 - Тактична карта і рельєф

Оцінка: 3-5 тижнів, 350-650 годин.

Задачі:

- Імпортувати tactical map texture.
- Згенерувати terrain relief з map/height data.
- Реалізувати 100x100 tactical grid.
- Реалізувати cell picking на рельєфі.
- Тримати юніти на поверхні рельєфу без провалювання.
- Додати map layers:
  - grid;
  - tasks;
  - support;
  - communications;
  - fog-of-war placeholder.
- Додати layer visibility panel.
- Додати camera presets:
  - full map;
  - active task;
  - selected unit;
  - instructor overview.

Acceptance:

- Клікнута клітинка відповідає видимій клітинці grid.
- Unit icons стоять на рельєфі і не провалюються.
- Карту можна комфортно наближати і оглядати.
- Grid і task layers можна вмикати/вимикати.

## Phase 3 - Unit system

Оцінка: 2-4 тижні, 250-500 годин.

Задачі:

- Реалізувати unit entity actor.
- Реалізувати APP-6 / NATO symbol rendering.
- Реалізувати team coloring.
- Реалізувати параметри підрозділів:
  - hitpoints;
  - firepower;
  - movement;
  - unit type;
  - communication flag;
  - supply state placeholder.
- Реалізувати selection юніта.
- Реалізувати selected unit side panel.
- Реалізувати movement by cells.
- Реалізувати basic combat placeholder.
- Реалізувати unit editor:
  - назва;
  - тип;
  - параметри;
  - icon/symbol;
  - image/model reference.

Acceptance:

- Юніти можна створювати, вибирати, рухати та переглядати.
- Unit panel показує коректну інформацію.
- Unit icons читабельні на tactical map.

## Phase 4 - Battle order interface

Оцінка: 4-6 тижнів, 450-750 годин.

Задачі:

- Побудувати instructor battle order interface:
  - обстановка;
  - сценарій;
  - інформація про противника для кожної сторони;
  - readiness control;
  - quick demo generation.
- Побудувати side battle order interface:
  - ORBAT;
  - tasks;
  - end state;
  - support.
- Реалізувати global role switch:
  - Side 1;
  - Side 2;
  - Instructor.
- Реалізувати readiness flow:
  - сторони натискають ready;
  - instructor starts session.
- Реалізувати generated text summary для наказу.
- Реалізувати compact map-first task editing mode.

Acceptance:

- Інструктор не виглядає як третій гравець.
- Сторони бачать тільки релевантні дані.
- Battle order формується без метафори магазину.

## Phase 5 - Task і end-state editor

Оцінка: 3-5 тижнів, 350-650 годин.

Задачі:

- Реалізувати task tags:
  - seize;
  - hold;
  - defend;
  - recon;
  - move by route;
  - block;
  - cover;
  - passage;
  - command post;
  - supply point;
  - danger zone.
- Реалізувати geometry tools:
  - point;
  - line;
  - area.
- Реалізувати saved task list:
  - select;
  - highlight on map;
  - edit;
  - delete.
- Реалізувати task numbering on map.
- Реалізувати task visibility by side.
- Реалізувати end-state conditions:
  - controlled area;
  - held line;
  - open route;
  - enemy blocked;
  - unit preserved;
  - supply maintained.
- Реалізувати compact side task briefing during session.

Acceptance:

- Користувач може створити кілька задач без плутанини.
- Active task чітко виділена на карті.
- Опис задач не перекриває карту.

## Phase 6 - Quick demo session generator

Оцінка: 1-2 тижні, 120-220 годин.

Задачі:

- Рандомно обирати attacker/defender.
- Генерувати objective area.
- Генерувати ORBAT для обох сторін.
- Спавнити units у правдоподібних tactical positions.
- Генерувати attack і defense tasks.
- Генерувати end states.
- Стартувати сесію напряму в battle phase.
- Додати deterministic seed для повторюваних демо.
- Додати presets:
  - assault;
  - defense;
  - recon;
  - route opening;
  - urban objective.

Acceptance:

- Один клік створює демонстраційну сесію.
- Не потрібні ручні налаштування перед показом.
- Згенеровані підрозділи видимі і читабельні.

## Phase 7 - Session gameplay loop

Оцінка: 3-6 тижнів, 400-800 годин.

Задачі:

- Реалізувати turn flow.
- Реалізувати movement limits.
- Реалізувати basic combat resolution.
- Реалізувати instructor overview.
- Реалізувати selected unit panel.
- Реалізувати event log.
- Реалізувати map layer controls during session.
- Реалізувати simple victory assessment from end-state data.

Acceptance:

- Сесію можна грати кілька ходів.
- Active side чітко зрозуміла.
- Opponent panel прихована від player view.
- Instructor бачить всю активність.

## Phase 8 - Support, communications, fog of war

Оцінка: 4-8 тижнів, 600-1,100 годин.

Задачі:

- Support system:
  - base radius;
  - supply state per unit;
  - support layer visualization.
- Communications system:
  - radio-equipped units;
  - communication radius;
  - loss of control outside network;
  - communications layer.
- Fog of war:
  - unit vision radius;
  - side-limited visibility;
  - degraded enemy information;
  - instructor full visibility.

Acceptance:

- Support і communication впливають на стан/контроль юніта.
- Fog of war змінює те, що бачить кожна сторона.
- Instructor має full visibility.

## Phase 9 - Persistence і backend

Оцінка: 3-6 тижнів для local persistence, 8-14 тижнів для network backend.

Задачі local persistence:

- Save/load scenarios.
- Save/load unit catalog.
- Save/load generated sessions.
- Export/import battle order JSON.

Задачі backend:

- User accounts.
- Instructor rooms.
- Side assignments.
- Server-authoritative session state.
- Multi-table / multi-room support.
- Audit/event history.
- Deployment and monitoring.

Acceptance:

- Підготовлену сесію можна відкрити повторно.
- Demo scenarios можна передавати.
- Network version підтримує окремі rooms і sides.

## Phase 10 - Polish, QA і delivery

Оцінка: 3-5 тижнів, 350-700 годин.

Задачі:

- UX pass on battle order flow.
- Performance pass for map and symbols.
- Visual polish для terrain, icons, labels.
- Input pass для mouse/keyboard.
- QA test matrix.
- Bug fixing.
- Build packaging.
- Demo script and operator guide.

Acceptance:

- Build стабільний для live demonstration.
- Новий користувач може створити demo session менше ніж за 1 хвилину.
- Instructor може пояснити flow без ручних workaround.

## MVP priority list

Must have:

- Tactical map with relief and 100x100 grid.
- Readable APP-6 / NATO unit symbols.
- Quick demo generator.
- Instructor / Side 1 / Side 2 roles.
- ORBAT setup.
- Task setup with point/line/area.
- Saved task list with map highlighting.
- Side task briefing during session.
- Basic turn flow.
- Selected unit panel.
- Windows demo build.

Should have:

- Unit editor.
- End-state editor.
- Support table.
- Layer controls.
- Generated battle order text.
- Basic combat placeholder.
- Scenario save/load.

Could have:

- 3D unit models.
- Animated movement.
- Better terrain generation.
- Preset scenario library.
- Export to PDF / report.

Not MVP:

- Full multiplayer.
- Real accounts.
- Complex ballistics.
- AI opponent.
- Full logistics simulation.
- Full fog-of-war intelligence model.

## Основні ризики

1. Relief і grid precision.
   Якщо terrain і grid picking не збігаються, продукт одразу виглядає зламаним.

2. UI complexity.
   Battle order setup може стати занадто важким для live demo. Quick generation і step validation обов'язкові.

3. APP-6 readability.
   Symbols мають залишатися читабельними на різних zoom levels.

4. Scope creep у full simulation.
   Support, communications, fog і combat можуть стати великими системами. Починати треба зі спрощених mechanics.

5. Multiplayer too early.
   Network rooms і accounts варто починати тільки після стабілізації local session loop.

## Рекомендований перший контрактний scope

Ціль контракту: **Unreal MVP vertical slice**.

Тривалість: 12 тижнів.

Команда:

- 1 Unreal tech lead.
- 1 Unreal gameplay/UI developer.
- 1 technical artist.
- 0.5 UI/UX designer.
- 0.5 QA.
- 0.25 producer/analyst.

Оцінка годин: 1,800-2,200.

Оцінка бюджету:

- Lean: 81k-99k USD.
- Realistic: 117k-143k USD.
- Senior-heavy: 162k-198k USD.

Deliverables:

- Unreal Windows build.
- One-click generated demo session.
- Battle order editor.
- Tactical relief map.
- Unit symbols and unit panel.
- Task creation/editing/highlighting.
- Side-specific task briefing.
- Basic turn loop.
- Demo operator guide.

