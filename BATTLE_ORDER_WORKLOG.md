# UNITS CPX - Battle Order UI Worklog

Last updated: 2026-05-06 23:38 +03:00

## Current Branch

- Active deploy branch: `air-version`
- Feature source branch: `codex/nato-order-ui`
- Checkpoint branch with physical 3D model prototype: `codex/physical-models-checkpoint`
- Checkpoint commit: `6501d46` (`Checkpoint physical model prototype`)
- Do not push unless explicitly requested.
- `references/` is intentionally untracked and should stay out of normal commits.

## Product Direction

The order setup screen is not a shop. It is a scenario / battle order editor for a military CPX-style prototype.

The current UI must be reshaped around the logic from `UNITS CPX Demo Pitch.pdf`:

1. Situation setup.
2. ORBAT / available combat means.
3. Mission tasks assigned through tags and map geometry.
4. Desired end state.
5. Support / sustainment parameters.

NATO / APP-6 symbols are the current visual direction instead of 3D unit models.

## Source Logic From Pitch

Extracted from `C:\Users\vladyslav\Downloads\UNITS CPX Demo Pitch.pdf`:

- Area of interest: selected on the map.
- Area of operations / task execution area: selected on the map.
- Scenario editor configures objects inside the task area.
- Each commander can receive their own situation picture.
- Instructor can set the percentage of enemy information shown in the battle order.
- Composition and quantity of combat means are shown in an interface/table and are available for manipulation.
- Tasks are formulated through tags and assigned to objects on the map.
- Execution text is generated from configured task data.
- Desired end state is configured through tags according to the mission.
- Support is configured through unit tables and support parameters.

## Current Implemented State

- [x] Created branch `codex/physical-models-checkpoint`.
- [x] Committed physical 3D model prototype to checkpoint branch.
- [x] Created working branch `codex/nato-order-ui`.
- [x] Replaced map unit visuals with flat NATO / APP-6 style symbols.
- [x] Replaced unit card model previews with generated NATO / APP-6 previews.
- [x] Removed runtime dependency on STL / GLB loaders in `index.html`.
- [x] Kept task selection on map working.
- [x] Added expanded task tags:
  - `Захопити`
  - `Утримати`
  - `Обороняти`
  - `Розвідати`
  - `Маршрут`
  - `Рубіж`
  - `Вогневий рубіж`
  - `Прохід`
  - `СП/НП`
  - `КП/КСП`
  - `Мед/евак`
  - `Постачання`
  - `Небезпечна зона`
- [x] Added temporary PCC / readiness checklist block.
- [x] Verified `npm.cmd run check`.
- [x] Verified in browser:
  - no console errors;
  - APP-6 cards are visible;
  - `Маршрут` task can be assigned to a map cell;
  - PCC checklist buttons toggle.

## Problem To Fix

- [ ] Current battle order still feels like a unit shop plus checklist.
- [ ] PCC / readiness is too prominent and does not match the main pitch logic.
- [ ] Static order summary in `index.html` is not driven by `sessionOrder`.
- [ ] Mission task editor only stores point cells, but pitch needs objects, areas, lines, and task geometry.
- [ ] There is no proper separation between instructor setup and commander-visible order.
- [ ] Enemy information visibility percentage is not implemented.
- [ ] Desired end state is not implemented as its own block.
- [ ] Support is not implemented as a structured table.

## Target UI Structure

### 1. Situation

- [ ] Select area of interest on map.
- [ ] Select task execution area on map.
- [ ] Add key objects inside the area:
  - settlement;
  - road;
  - crossing;
  - bridge;
  - observation point;
  - command post;
  - supply point;
  - danger zone.
- [ ] Add instructor control: enemy information visibility percentage.
- [ ] Show commander-specific situation preview.

### 2. ORBAT / Combat Means

- [ ] Replace "unit shop" language with ORBAT language.
- [ ] Show table/cards for available means by side.
- [ ] Use NATO / APP-6 symbol preview per unit type.
- [ ] Store quantity per side.
- [ ] Store readiness/state per unit type.
- [ ] Support quick add/remove for each side.

### 3. Tasks

- [ ] Select side.
- [ ] Select task action tag:
  - seize;
  - hold;
  - defend;
  - recon;
  - move by route;
  - block;
  - cover;
  - secure passage.
- [ ] Select geometry type:
  - point;
  - line;
  - area.
- [ ] Assign task to map geometry.
- [ ] Assign task to a named object when applicable.
- [ ] Generate execution text from task data.
- [ ] Preserve existing map-click task assignment while upgrading data shape.

### 4. Desired End State

- [ ] Add end-state tags:
  - area controlled;
  - line held;
  - route open;
  - enemy fixed / blocked;
  - recon completed;
  - unit preserved;
  - supply maintained.
- [ ] Bind end-state tags to side and geometry/object.
- [ ] Prepare this data to become victory conditions later.

### 5. Support / Sustainment

- [ ] Add side-level support table:
  - ammunition;
  - fuel;
  - medical evacuation;
  - repair;
  - communications;
  - reserve;
  - supply point.
- [ ] Allow support parameters to affect scenario constraints later.
- [ ] Move PCC / readiness under this section or a secondary "Readiness" sub-block.

## Data Model Direction

Current:

```js
sessionOrder = {
  environment,
  mission,
  commandMode,
  activeTaskSide,
  activeTaskTag,
  tasks,
  readiness
}
```

Target:

```js
sessionOrder = {
  situation: {
    areaOfInterest,
    executionArea,
    objects,
    enemyInfoPercentBySide
  },
  orbat: {
    1: [],
    2: []
  },
  tasks: [],
  endState: [],
  support: {
    1: {},
    2: {}
  },
  ui: {
    activeTab,
    activeSide,
    activeTool,
    activeTaskTag,
    activeGeometry
  }
}
```

Task object target:

```js
{
  id,
  side,
  tag,
  geometry,
  cells,
  objectId,
  generatedText
}
```

## Implementation Checklist

- [x] Refactor `sessionOrder` into the target structure while keeping compatibility with current placement flow.
- [x] Add tabbed order UI:
  - `Обстановка`;
  - `ORBAT`;
  - `Завдання`;
  - `Кінцевий стан`;
  - `Забезпечення`.
- [x] Replace current `updateShopUI()` markup with tab-specific render methods:
  - `renderSituationTab()`;
  - `renderOrbatTab()`;
  - `renderTasksTab()`;
  - `renderEndStateTab()`;
  - `renderSupportTab()`.
- [x] Rename visible text away from shop terminology.
- [x] Keep NATO / APP-6 unit cards in ORBAT tab.
- [x] Move PCC checklist into Support / Readiness.
- [x] Add enemy-info percent controls.
- [x] Add end-state tag controls.
- [x] Upgrade task assignment so map clicks preserve geometry type.
- [x] Update order markers to use task tag color and geometry label.
- [x] Update static header summary to read from `sessionOrder`.
- [x] Run `npm.cmd run check`.
- [x] Verify in browser:
  - order tabs render;
  - ORBAT add buttons work;
  - task assignment to map works;
  - end-state toggles work;
  - support controls work;
  - no console errors.
- [x] Add global role switch for order setup:
  - `Сторона 1`;
  - `Сторона 2`;
  - `Інструктор`.
- [x] Remove side selection controls from lower task/end-state panels.
- [x] Add side readiness flow:
  - side 1 marks ready;
  - side 2 marks ready;
  - instructor starts the game after both are ready.
- [x] Scope player editing by active global role.
- [x] Keep instructor-only setup for situation and enemy information visibility.

## Event Log

- 2026-05-06 23:38 +03:00 - User confirmed direction: rebuild battle order UI around pitch logic and create a durable checklist / event log for continuation.
- 2026-05-06 23:38 +03:00 - Current branch checked: `codex/nato-order-ui`; modified files are `.gitignore`, `game.js`, `index.html`; `references/` remains untracked.
- 2026-05-06 23:38 +03:00 - Created this worklog as the continuation anchor.
- 2026-05-06 23:55 +03:00 - Refactored `sessionOrder` into `situation`, `orbat`, `tasks`, `endState`, `support`, and `ui`.
- 2026-05-06 23:55 +03:00 - Replaced the old monolithic order panel with tabs: `Обстановка`, `ORBAT`, `Завдання`, `Кінцевий стан`, `Забезпечення`.
- 2026-05-06 23:55 +03:00 - Moved NATO / APP-6 unit cards into ORBAT and moved PCC into Support / Readiness.
- 2026-05-06 23:55 +03:00 - Added enemy information percent sliders, end-state tags, support controls, and geometry-aware task data.
- 2026-05-06 23:55 +03:00 - Verified `npm.cmd run check` and browser flow: tabs render, ORBAT visible, `Маршрут` task assigns to map, situation area assigns to map, support tab renders, no console errors.
- 2026-05-07 - Added global role switch in the battle order header: `Сторона 1`, `Сторона 2`, `Інструктор`.
- 2026-05-07 - Removed lower side selector rendering from task/end-state tabs; tasks now use the active global side role.
- 2026-05-07 - Added readiness flow: sides press `Готовий`; instructor can press `Стартувати гру` only after both sides are ready.
- 2026-05-07 - Browser-verified role flow: role buttons render, no lower side handlers render, both sides can mark ready, instructor start button enables, no console errors.

## Resume Point

The tabbed battle order editor is implemented and verified at a basic level.

Next concrete coding step:

1. Add proper per-role visibility and permissions:
   - player sees only own editable data;
   - instructor sees both sides and scenario controls;
   - future network accounts can map directly to these roles.
2. Make geometry assignment real:
   - point: one click;
   - line: two or more cells;
   - area: rectangular or multi-cell area.
3. Add named map objects inside `situation.objects`.
4. Allow tasks and end states to bind to named objects, not only cells.
5. Improve generated execution text so it reads like a battle-order fragment.
