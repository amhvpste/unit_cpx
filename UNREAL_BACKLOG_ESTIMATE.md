# UNITS CPX - Unreal Development Backlog And Estimate

Date: 2026-05-14

## Goal

Rebuild the current web prototype as an Unreal Engine product suitable for live demonstration and further production development.

The target product is not a game shop loop. It is a CPX / tactical session tool where an instructor prepares a battle order, sides receive tasks, units are displayed on a tactical map, and a quick demo session can be generated without manual setup.

## Estimate Assumptions

- Target platform for MVP: Windows PC build.
- Unreal version: UE 5.x.
- First production target: playable vertical slice, not full operational simulator.
- Visual direction: tactical map with relief, APP-6 / NATO unit symbols first, 3D unit models later.
- Session mode for MVP: hotseat / one machine, as in the current prototype.
- Multiplayer, accounts, room management, persistence backend, and full instructor moderation tools are separate phases.
- Currency: USD.
- Budget uses blended hourly rates:
  - low / lean outsource: 45 USD/hour;
  - realistic mixed team: 65 USD/hour;
  - senior-heavy / agency: 90 USD/hour.

## Recommended Team

Minimum demo team:

- 1 Unreal gameplay developer.
- 1 Unreal UI / tools developer.
- 1 technical artist / map and visualization specialist.
- 0.5 UI/UX designer.
- 0.25 producer / analyst.
- 0.5 QA from the middle of the project.

Recommended vertical-slice team:

- 1 tech lead / Unreal architect.
- 2 Unreal developers.
- 1 UI/UX designer.
- 1 technical artist.
- 1 QA.
- 0.5 producer / product analyst.
- Optional backend developer when persistence or multiplayer starts.

## Delivery Scenarios

| Scenario | Scope | Time | Hours | Budget at 45/h | Budget at 65/h | Budget at 90/h |
|---|---|---:|---:|---:|---:|---:|
| Demo rebuild | Fast Unreal demo of current core flow | 6-8 weeks | 700-1,100 | 31k-50k | 46k-72k | 63k-99k |
| MVP vertical slice | Stable instructor + two-side session | 10-14 weeks | 1,600-2,400 | 72k-108k | 104k-156k | 144k-216k |
| Production alpha | Save/load, better tools, fog/support/comms basics | 4-6 months | 3,500-5,500 | 158k-248k | 228k-358k | 315k-495k |
| Networked product | Accounts, rooms, multiplayer tables, backend, admin | 6-9 months | 6,000-10,000 | 270k-450k | 390k-650k | 540k-900k |

Recommended target for the next external team: **MVP vertical slice, 10-14 weeks, 1,600-2,400 hours**.

## Phase Backlog

### Phase 0 - Discovery And Technical Design

Estimate: 1-2 weeks, 120-220 hours.

Tasks:

- Audit the current web prototype and extract feature requirements.
- Define Unreal architecture: gameplay framework, data assets, UI framework, save model.
- Define unit data schema: type, side, symbol, stats, movement, command/control, supply.
- Define battle order data schema: situation, ORBAT, tasks, end state, support, intelligence.
- Define map coordinate system: grid cells, world coordinates, relief sampling.
- Prepare risk spikes:
  - tactical map texture to terrain height;
  - APP-6 symbol rendering;
  - large 100x100 grid interaction;
  - UI readability on large tactical map.

Deliverables:

- Unreal technical design document.
- Feature backlog with priorities.
- Data model draft.
- Prototype migration plan.

### Phase 1 - Unreal Project Foundation

Estimate: 2-3 weeks, 250-400 hours.

Tasks:

- Create Unreal project structure.
- Add core game mode / session state.
- Implement side roles: Side 1, Side 2, Instructor.
- Implement hotseat turn/session state.
- Implement data assets for unit types.
- Implement basic logging/event journal.
- Implement camera controls for tactical map.
- Implement build pipeline for Windows demo.

Acceptance:

- Project opens and builds.
- Session can switch active side.
- Basic map scene loads.
- Data assets can define units without code changes.

### Phase 2 - Tactical Map And Relief

Estimate: 3-5 weeks, 350-650 hours.

Tasks:

- Import tactical map texture.
- Generate terrain relief from map/height data.
- Implement 100x100 tactical grid.
- Implement cell picking on relief.
- Keep units grounded on terrain surface.
- Add map layers:
  - grid;
  - tasks;
  - support;
  - communications;
  - fog-of-war placeholder.
- Add layer visibility panel.
- Add camera presets:
  - full map;
  - active task;
  - selected unit;
  - instructor overview.

Acceptance:

- Clicked cell matches visible grid cell.
- Unit icons stand on relief without sinking.
- Map can be zoomed and inspected comfortably.
- Grid and task layers can be toggled.

### Phase 3 - Unit System

Estimate: 2-4 weeks, 250-500 hours.

Tasks:

- Implement unit entity actor.
- Implement APP-6 / NATO symbol rendering.
- Implement team coloring.
- Implement unit stats:
  - hitpoints;
  - firepower;
  - movement;
  - unit type;
  - communication flag;
  - supply state placeholder.
- Implement unit selection.
- Implement selected unit side panel.
- Implement movement by cells.
- Implement basic combat placeholder.
- Implement unit editor:
  - name;
  - type;
  - parameters;
  - icon/symbol;
  - image/model reference.

Acceptance:

- Units can be spawned, selected, moved, and inspected.
- Unit panel shows correct task-relevant information.
- Unit icons are readable on the tactical map.

### Phase 4 - Battle Order Interface

Estimate: 4-6 weeks, 450-750 hours.

Tasks:

- Build instructor battle order interface:
  - situation;
  - scenario;
  - intelligence for each side;
  - readiness control;
  - quick demo generation.
- Build side battle order interface:
  - ORBAT;
  - tasks;
  - end state;
  - support.
- Implement global role switch:
  - Side 1;
  - Side 2;
  - Instructor.
- Implement readiness flow:
  - sides press ready;
  - instructor starts session.
- Implement generated text summary for the order.
- Implement compact map-first task editing mode.

Acceptance:

- Instructor does not act as a third player.
- Sides see only their relevant order data.
- Battle order can be completed without using a shop metaphor.

### Phase 5 - Task And End-State Editor

Estimate: 3-5 weeks, 350-650 hours.

Tasks:

- Implement task tags:
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
- Implement geometry tools:
  - point;
  - line;
  - area.
- Implement saved task list:
  - select;
  - highlight on map;
  - edit;
  - delete.
- Implement task numbering on map.
- Implement task visibility by side.
- Implement end-state conditions:
  - controlled area;
  - held line;
  - open route;
  - enemy blocked;
  - unit preserved;
  - supply maintained.
- Implement compact side task briefing during session.

Acceptance:

- User can create several tasks without ambiguity.
- Active task is visually clear on map.
- Task descriptions do not block map interaction.

### Phase 6 - Quick Demo Session Generator

Estimate: 1-2 weeks, 120-220 hours.

Tasks:

- Generate attacker/defender randomly.
- Generate objective area.
- Generate ORBAT for both sides.
- Spawn units in plausible tactical positions.
- Generate attack and defense tasks.
- Generate end states.
- Start session directly in battle phase.
- Add deterministic seed option for repeatable demos.
- Add presets:
  - assault;
  - defense;
  - recon;
  - route opening;
  - urban objective.

Acceptance:

- One click creates a demonstrable session.
- No manual setup is required before showing the product.
- Generated units are visible and readable.

### Phase 7 - Session Gameplay Loop

Estimate: 3-6 weeks, 400-800 hours.

Tasks:

- Implement turn flow.
- Implement movement limits.
- Implement basic combat resolution.
- Implement instructor overview.
- Implement selected unit panel.
- Implement event log.
- Implement map layer controls during session.
- Implement simple victory assessment from end-state data.

Acceptance:

- Session can be played for several turns.
- Active side is clear.
- Opponent panel is hidden from player view.
- Instructor can observe all activity.

### Phase 8 - Support, Communications, Fog Of War

Estimate: 4-8 weeks, 600-1,100 hours.

Tasks:

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

- Support and communication affect unit control/state.
- Fog of war changes what each side sees.
- Instructor can override or inspect full state.

### Phase 9 - Persistence And Backend

Estimate: 3-6 weeks for local persistence, 8-14 weeks for network backend.

Tasks for local persistence:

- Save/load scenarios.
- Save/load unit catalog.
- Save/load generated sessions.
- Export/import battle order JSON.

Tasks for backend:

- User accounts.
- Instructor rooms.
- Side assignments.
- Server-authoritative session state.
- Multi-table / multi-room support.
- Audit/event history.
- Deployment and monitoring.

Acceptance:

- A prepared session can be reopened.
- Demo scenarios can be shared.
- Network version can support separate rooms and sides.

### Phase 10 - Polish, QA, And Delivery

Estimate: 3-5 weeks, 350-700 hours.

Tasks:

- UX pass on battle order flow.
- Performance pass for map and symbols.
- Visual polish for terrain, icons, labels.
- Input pass for mouse/keyboard.
- QA test matrix.
- Bug fixing.
- Build packaging.
- Demo script and operator guide.

Acceptance:

- Build is stable for live demonstration.
- New user can generate and run a demo session in under 1 minute.
- Instructor can explain the flow without manual workarounds.

## MVP Priority List

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

## Main Risks

1. Relief and grid precision.
   If terrain and grid picking do not match, the product feels broken immediately.

2. UI complexity.
   Battle order setup can become too heavy for live demo. Quick generation and step validation are mandatory.

3. APP-6 readability.
   Symbols must remain readable at zoom levels used during demonstration.

4. Scope creep into full simulation.
   Support, communications, fog, and combat can become large systems. They should start as clear simplified mechanics.

5. Multiplayer too early.
   Network rooms and accounts should wait until the local session loop is stable.

## Recommended First Contract Scope

Contract target: **Unreal MVP vertical slice**.

Duration: 12 weeks.

Team:

- 1 Unreal tech lead.
- 1 Unreal gameplay/UI developer.
- 1 technical artist.
- 0.5 UI/UX designer.
- 0.5 QA.
- 0.25 producer/analyst.

Estimated hours: 1,800-2,200.

Estimated budget:

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

