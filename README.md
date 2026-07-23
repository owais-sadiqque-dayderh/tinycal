# tinyCal

A tiny calendar for [Obsidian](https://obsidian.md) that tracks events which stay **open** until you say they're done — instead of every event needing a fixed end date up front.

Every event is just frontmatter on a real note in your vault. Start something today, keep working on the note, and its bar on the calendar keeps growing day by day until you explicitly end it. No recurrence, no reminders, no external sync — just a lightweight, note-linked way to see what's currently in progress.

## Why

Most calendar plugins assume you know when something ends before it starts. tinyCal is built around the opposite case: ongoing work — a project, a trip, a "currently reading" — where the end date is the *last* thing you know, not the first. Ending an event is a deliberate action from the calendar UI, not something you have to remember to type into the note.

## Features

- **Open-ended events**: start an event with no end date; it visually extends to "today" on every render until you close it.
- **Month and week views**, toggleable, with prev/next navigation.
- **Two ways to create an event**:
  - From the calendar: click a day (or "+ New Event") to create a brand-new note or link an existing one.
  - From a note: "Start tinyCal event from this note" turns the currently open note into an event.
- **Ending an event**: right-click an event on the calendar → "End event today" or "End event on…".
- **Per-tag colors**: assign a color to a tag in Settings, or let tinyCal auto-assign a stable color per event so different events stay visually distinct with zero configuration.
- **Folder and tag autocomplete**: the default-folder setting and every tag field suggest from your vault's actual folders and tags already in use, while still accepting new ones.
- Settings changes (default folder, first day of week, tag colors) apply immediately to any open calendar tab — no reload required.

## How events are stored

Every event is plain frontmatter on a note — nothing is stored outside your vault:

```yaml
---
tinycal-id: "20260723a1b2"     # generated once, identifies the event
tinycal-start: "2026-07-23"    # YYYY-MM-DD
tinycal-end: null              # YYYY-MM-DD, or absent/null = still open
tinycal-tag: "work"            # optional, free-text
---
```

`tinycal-id` is what makes a note "an event" to tinyCal — a note without it is invisible to the plugin, and any note can only be linked to one event. Dates are plain `YYYY-MM-DD` strings with no time component.

## Installation

tinyCal isn't yet on the Community Plugins list. Until then, install manually:

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest).
2. In your vault, create the folder `<vault>/.obsidian/plugins/tinycal/` and place those three files inside it.
3. In Obsidian: **Settings → Community plugins**, make sure "Restricted mode" is off, then find and enable **tinyCal**.

tinyCal is desktop-only.

## Usage

- Open the calendar via the ribbon icon (calendar-days) or the command palette: **"Open tinyCal calendar"**.
- Click any day to create a new event on that date, or use **"+ New Event"** for today.
- Right-click an event bar to end it or open its note; left-click to open its note directly.
- From any note, run **"Start tinyCal event from this note"** (command palette or the note's context menu) to turn that note into an event.
- Configure default note folder, first day of week, and tag colors under **Settings → tinyCal**.

## Development

### Requirements

- [Node.js](https://nodejs.org) 16+ and npm.
- A local Obsidian vault to test against.

### Setup

```bash
git clone https://github.com/owais-sadiqque-dayderh/tinycal.git
cd tinycal
npm install
```

### Build

```bash
npm run dev     # esbuild in watch mode, rebuilds main.js on save
npm run build   # type-checks (tsc --noEmit) then produces a production build
```

### Test

```bash
npm run test    # runs the Vitest unit test suite
```

Tests cover the pure logic modules (`src/events/eventLogic.ts`, `src/view/dateUtils.ts`, `src/view/colorUtils.ts`) — date-range math, event status/lane assignment, and color resolution. UI code (views, modals) is verified manually against a real vault, since it depends on the Obsidian API.

### Testing against a real vault

Symlink (or copy) the repo's build output into a test vault's plugin folder so `npm run dev` rebuilds are picked up live:

```bash
mkdir -p /path/to/test-vault/.obsidian/plugins/tinycal
ln -s "$(pwd)/main.js" "$(pwd)/manifest.json" "$(pwd)/styles.css" /path/to/test-vault/.obsidian/plugins/tinycal/
```

Then in Obsidian, enable tinyCal under **Settings → Community plugins**, and use **Ctrl/Cmd+R** to reload the app after each rebuild (or install the [Hot-Reload](https://github.com/pjeby/hot-reload) plugin to skip manual reloads).

### Project layout

```
src/
  main.ts              # Plugin class: onload/onunload, commands, settings wiring
  settings.ts           # TinyCalSettings, DEFAULT_SETTINGS, TinyCalSettingTab
  types.ts               # TinyCalEvent, frontmatter field name constants
  events/
    eventIndex.ts          # in-memory event index, built from vault scan + metadataCache
    eventStore.ts           # create/link/end event — all frontmatter read/write logic
    eventLogic.ts             # pure logic: status, lanes, date-range overlap (unit tested)
  view/
    calendarView.ts             # ItemView subclass
    monthGrid.ts / weekGrid.ts   # grid layout for each view mode
    dayRow.ts                     # shared per-week event rendering (pill + line + lanes)
    dateUtils.ts                   # month/week range math (unit tested)
    colorUtils.ts                   # tag-color resolution + contrast text color (unit tested)
  modals/
    newEventModal.ts    # calendar-first creation (new note or link existing)
    startEventModal.ts   # note-first creation
    endEventModal.ts      # "end on a specific date"
    noteSuggestModal.ts    # FuzzySuggestModal over notes without an existing tinycal-id
  suggest/
    folderSuggest.ts    # AbstractInputSuggest for vault folder autocomplete
    tagSuggest.ts         # AbstractInputSuggest for known-tag autocomplete
styles.css
manifest.json
versions.json
```

### Releasing a new version

```bash
npm version <patch|minor|major>   # bumps package.json, runs version-bump.mjs (manifest.json + versions.json)
```

Then tag a GitHub release with `main.js`, `manifest.json`, and `styles.css` attached, per [Obsidian's release format](https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions).

### Contributing

Issues and PRs are welcome. Before opening a PR, please run `npm run build` and `npm run test` and make sure both pass.

## Explicitly out of scope

Recurring events, reminders/notifications, mobile support, external calendar sync (ICS/CalDAV), time-tracking, multiple events per note, and Tasks-plugin interoperability are intentionally not part of tinyCal — see `brainstorm.md` for the reasoning.

## License

[MIT](./LICENSE)
