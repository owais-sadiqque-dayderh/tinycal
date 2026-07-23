# tinyCal — Development Plan

Based on the finalized decisions in [`brainstorm.md`](./brainstorm.md). All open questions there are resolved:
- Ending an event = calendar-UI action (button/dropdown), not a markdown checkbox.
- Frontmatter on the linked note is the sole source of truth.
- Month + week views, own independent schema, desktop-only, no recurrence, no reminders.
- One note ↔ one event (strict).
- Built-in note template, "tinyCal" name is final.
- Target: eventual Community Plugins submission.

This document turns those decisions into a build order.

## 1. Final data schema

Frontmatter fields added to a note when it becomes an event:

```yaml
---
tinycal-id: "20260723a1b2"     # generated once, never changes, uniquely identifies the event
tinycal-start: "2026-07-23"    # YYYY-MM-DD, no time component (keeps timezone/DST out of scope)
tinycal-end: null              # YYYY-MM-DD or absent/null = still open
tinycal-tag: "work"            # optional, free-text category used for coloring/filtering
---
```

Rules:
- `tinycal-id` presence is what makes a note "an event" to tinyCal. A note without it is invisible to the plugin.
- **One event per note**: any creation/linking flow must check for an existing `tinycal-id` first and refuse (with a `Notice`) if present.
- Dates are plain `YYYY-MM-DD` strings — no timezone math, no time-of-day. Keeps date-range rendering and "today" comparisons simple string/date comparisons.
- All frontmatter reads go through `app.metadataCache.getFileCache(file)?.frontmatter`; all writes go through `app.fileManager.processFrontMatter(file, fn)` — never manual YAML string manipulation (this is the Obsidian-recommended pattern and avoids corrupting user frontmatter).

## 2. Project scaffolding (Phase 0)

- [ ] Clone/copy structure from [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin): `esbuild.config.mjs`, `tsconfig.json`, `package.json`, `.eslintrc`, `version-bump.mjs`.
- [ ] `manifest.json`:
  ```json
  {
    "id": "tinycal",
    "name": "tinyCal",
    "version": "0.1.0",
    "minAppVersion": "1.5.0",
    "description": "A tiny calendar for events that run until you say they're done, linked to your notes.",
    "author": "your-name",
    "isDesktopOnly": true
  }
  ```
- [ ] `versions.json` (maps plugin version → min Obsidian version, required for releases).
- [ ] Set up a local test vault (`.obsidian/plugins/tinycal` symlinked to the build output) for manual testing during development.
- [ ] `npm install`, confirm `npm run dev` builds and the plugin loads in the test vault with no changes yet (sample "hello world" ribbon icon is fine as a smoke test).

**Done when:** empty plugin loads in a real vault via `npm run dev` watch mode, shows up in Community Plugins list (installed, unpacked) with no console errors.

## 3. File/module layout

```
src/
  main.ts                     # Plugin class: onload/onunload, registers view/commands/settings
  settings.ts                 # TinyCalSettings interface, DEFAULT_SETTINGS, TinyCalSettingTab
  types.ts                    # TinyCalEvent, frontmatter field name constants
  events/
    eventIndex.ts             # in-memory event index, built from vault scan + metadataCache
    eventStore.ts             # create/link/end event — all frontmatter read/write logic
  view/
    calendarView.ts           # ItemView subclass, view type "tinycal-calendar-view"
    monthGrid.ts               # month grid rendering + event placement
    weekGrid.ts                 # week grid rendering + event placement
    dateUtils.ts                # month/week range math, "today" helpers
  modals/
    newEventModal.ts            # calendar-first creation (new note or link existing)
    noteSuggestModal.ts         # FuzzySuggestModal over notes without an existing tinycal-id
    endEventModal.ts            # optional "end on a specific date" (else default = today)
  commands/
    registerCommands.ts         # open calendar, start event from current note
  templates/
    eventNoteTemplate.ts        # built-in template string for auto-created event notes
styles.css
manifest.json
versions.json
```

## 4. Build order (phased, each phase manually testable before moving on)

### Phase 1 — Event index (data layer, no UI)
- [ ] `types.ts`: define `TinyCalEvent { id, notePath, start, end, tag }` and frontmatter key constants (`FM_ID`, `FM_START`, `FM_END`, `FM_TAG`).
- [ ] `eventIndex.ts`:
  - On plugin load, scan `app.vault.getMarkdownFiles()`, read frontmatter via `metadataCache`, build `Map<id, TinyCalEvent>`.
  - Subscribe to `metadataCache.on('changed', file => ...)` to re-index a single file on edit.
  - Subscribe to `vault.on('delete', file => ...)` and `vault.on('rename', (file, oldPath) => ...)` to keep `notePath` accurate and drop events for deleted notes.
  - Expose `getEventsInRange(start, end)`, `getEvent(id)`, `onChange(callback)` (so the view can re-render reactively).
- [ ] Write a handful of Vitest unit tests against the pure date/range logic (this part doesn't need the Obsidian runtime).

**Done when:** with no UI at all, a debug console command can dump the current event index and it accurately reflects frontmatter in the test vault, including after manual edits/renames/deletes.

### Phase 2 — Static calendar shell
- [ ] `calendarView.ts`: register an `ItemView` with `getViewType()`, `getDisplayText()`, `getIcon()`; open it via a ribbon icon and a command ("Open tinyCal calendar").
- [ ] Header: month/year label, prev/next buttons, month↔week toggle, "+ New Event" button (non-functional placeholder for now).
- [ ] `monthGrid.ts`: render a static 6×7 day grid for the current month, no events yet.
- [ ] `dateUtils.ts`: month range calculation, "which cells does this month need," first-day-of-week handling.

**Done when:** the calendar view opens in a workspace tab and correctly renders any given month, navigable with prev/next, no events plotted yet.

### Phase 3 — Plot events on the grid
- [ ] Wire `monthGrid.ts` to `eventIndex.getEventsInRange()`.
- [ ] Render closed events as a fixed bar from `start` to `end`.
- [ ] Render open events (`end` is null/absent) as a bar from `start` to **today**, visually distinct (per brainstorm §7 — different color/pattern; today's edge can have a subtle highlight).
- [ ] Re-render the visible range whenever `eventIndex` fires a change, and once per day-rollover (open events need to grow even with no vault edits — e.g. check on view focus/interval whether "today" has changed since last render).
- [ ] Click an event bar → `workspace.getLeaf().openFile(file)`.

**Done when:** events created manually (by hand-editing frontmatter in the test vault) show up correctly on the calendar, open events visibly differ from closed ones, and clicking one opens its note.

### Phase 4 — Calendar-first event creation
- [ ] `newEventModal.ts`: title, start date (defaults to the clicked day), optional end date, and a choice: **Create new note** (default) or **Link existing note**.
  - Create new note → `eventStore.createEventNote()`: creates the file in the configured folder using `templates/eventNoteTemplate.ts`, stamps frontmatter with a freshly generated `tinycal-id`.
  - Link existing note → opens `noteSuggestModal.ts` (a `FuzzySuggestModal<TFile>` over `getMarkdownFiles()`, **excluding files that already have `tinycal-id`** — enforces one-event-per-note at the picker level, not just on save).
- [ ] Clicking an empty day cell opens this modal pre-filled with that date.
- [ ] "+ New Event" button opens it pre-filled with today.

**Done when:** creating an event from the calendar (both new-note and link-existing paths) results in correct frontmatter and an immediate re-render showing the new event; attempting to link a note that's already an event is impossible via the picker.

### Phase 5 — Ending an event
- [ ] Event bar gets a right-click context menu (`Menu` API) or a small button on hover: "End event today," "End event on…" (opens `endEventModal.ts` with a date field), "Open note."
- [ ] `eventStore.endEvent(file, endDate)` → `processFrontMatter` sets `tinycal-end`.
- [ ] Confirm an ended event freezes in place (no longer extends to "today" on subsequent renders).

**Done when:** ending an event via the calendar UI correctly writes `tinycal-end` and the bar stops growing; verified by leaving it open for a day (or forcing a date-change in a debug helper) — a still-open event should visibly extend, an ended one should not.

### Phase 6 — Note-first event creation
- [ ] Command "Start tinyCal event from this note": reads active file's frontmatter; if `tinycal-id` already present, show a `Notice` ("This note is already a tinyCal event") and stop.
- [ ] Otherwise, open a small modal (start date default = today, optional end date, optional tag) and on submit call the same `eventStore` function Phase 4 uses for linking, applied to the active file.
- [ ] Add this command to the note's context menu / command palette (per brainstorm §4, this should feel symmetric with calendar-first creation, not like a secondary path).

**Done when:** turning an existing note into an event from within the note works, immediately appears on the calendar without needing to reopen the view, and is blocked with a clear message if the note is already linked.

### Phase 7 — Week view
- [ ] `weekGrid.ts`: same event-plotting logic as month grid, reused via shared helpers in `dateUtils.ts`/a shared "plot events onto N day columns" function — avoid duplicating the open/closed bar rendering logic between month and week.
- [ ] Toggle in the header switches between month and week, preserving the currently focused date.

**Done when:** week view shows the same events correctly, toggling back and forth doesn't lose the current date context.

### Phase 8 — Settings
- [ ] `settings.ts` + `TinyCalSettingTab`: default folder for new event notes, first day of week (Sunday/Monday), optional per-tag color mapping.
- [ ] Wire `defaultFolder` into `eventStore.createEventNote()`, `firstDayOfWeek` into `dateUtils.ts`, tag colors into the grid rendering.

**Done when:** changing a setting immediately affects new events / the current render without requiring a plugin reload.

### Phase 9 — Polish & edge cases
- [ ] Styling pass (`styles.css`) respecting Obsidian's theme CSS variables (so it looks correct in both light and dark themes, and with community themes — don't hardcode colors except for user-chosen tag colors).
- [ ] Handle: note deleted while its event is displayed (index drops it cleanly, no dangling references); note renamed (index updates `notePath`, calendar keeps working); malformed/partial frontmatter (e.g. `tinycal-id` present but `tinycal-start` missing or invalid — skip the event and don't crash the index); empty vault / zero events (calendar still renders, no errors).
- [ ] Confirm nothing breaks if two events happen to land on the same day (stacking behavior in the grid cell).
- [ ] Keyboard/accessibility basics for modals (focus first field, Escape to close, Enter to submit).

**Done when:** manually running through the edge-case list above in the test vault produces no console errors and no visibly broken state.

### Phase 10 — Release prep
- [ ] README with install instructions, a short GIF/screenshot of the open-event concept (this is the plugin's one distinctive feature — make sure it's visually obvious in the README).
- [ ] Bump `manifest.json`/`versions.json`, tag a GitHub release with `main.js`, `manifest.json`, `styles.css` attached (per Obsidian's release format).
- [ ] Run through the [plugin submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins) checklist (naming, no bundled unnecessary dependencies, no telemetry, correct `isDesktopOnly` flag, etc.) before opening a PR to `obsidian-releases`.

## 5. Commands (final list for MVP)

| Command | Effect |
|---|---|
| Open tinyCal calendar | Opens/focuses the `ItemView` |
| Start tinyCal event from this note | Turns the active note into an event (blocked if already one) |

## 6. Key Obsidian API surfaces this plugin relies on

`Plugin`, `ItemView`, `Modal`, `FuzzySuggestModal`, `PluginSettingTab`, `Vault` (`getMarkdownFiles`, `create`, event listeners), `MetadataCache` (`getFileCache`, `on('changed')`), `FileManager.processFrontMatter`, `Workspace` (`getLeaf().openFile`), `Menu`, `Notice`.

## 7. Explicitly not building (confirmed out of scope)

Recurring events, reminders/notifications, mobile support, external calendar sync (ICS/CalDAV), time-tracking, multiple events per note, checkbox/Tasks-plugin interoperability, user-configurable templates. All deferred or dropped per `brainstorm.md` §8–9 — revisit only if there's real demand after MVP ships.

## 8. Next step

Start Phase 0 (scaffolding) and Phase 1 (event index) — these have no UI and can be built and unit-tested before any rendering work begins.
