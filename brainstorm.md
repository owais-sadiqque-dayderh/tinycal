# tinyCal — Brainstorm

## 1. Elevator pitch

tinyCal is an Obsidian community plugin that gives users a calendar view inside their vault where they can create events, link each event to any note, and — the distinguishing feature — leave an event "open" so it visually stays active/ongoing on the calendar until the user explicitly marks it as ended. It sits at the intersection of calendar plugins (Full Calendar) and task-management plugins (Tasks, Day Planner), but is built around the idea of **duration-less, user-terminated events** rather than fixed start/end blocks.

## 2. The core differentiator

Most calendar tools force you to pick an end time up front. tinyCal's core bet is: **a lot of real work doesn't have a known end time when it starts.** You start a project, a task, a sprint, "learning X" — you don't know when it'll end. So:

- An event can be created with just a start (date/time) and no end.
- While open, it renders as "in progress" (spans from its start to "today", grows day by day, maybe visually distinct — e.g., a different color/pattern, an animated or dashed trailing edge).
- The user ends it manually (click a button, run a command, or check it off), which sets the end date and freezes it in place on the calendar as a completed block.
- Every event is optionally linked to one Obsidian note, so the event's "content" (notes, subtasks, logs) lives in the note, not in plugin-proprietary storage.

This is different from:
- **Recurring events** (they repeat on a schedule, not "run indefinitely").
- **Full Calendar plugin** (events are fixed-schedule, stored as notes/frontmatter/ICS, mirrors Google Calendar UX — no concept of an open-ended running event).
- **Tasks / Day Planner** (checkbox- and time-block-based, live inline in markdown, not on a persistent month/week calendar canvas).

## 3. Competitive landscape (researched)

| Plugin | Model | Storage | Relevant takeaway |
|---|---|---|---|
| **Full Calendar** | FullCalendar.js-based visual calendar; each event = a note with special frontmatter, or entries in daily notes; supports read-only ICS/CalDAV feeds | Frontmatter on notes, or daily-note event lists | Proves the "event = linked note" pattern works well and is the plugin most likely to be compared to tinyCal. tinyCal needs a clear reason to exist alongside it — the open-ended event is that reason. |
| **Tasks** | Inline checkbox tasks anywhere in markdown, with due/start/scheduled/recurring dates, advanced query/filter blocks | Task metadata lives inline in the task line itself | Shows the appeal of "your data is just markdown," and of powerful filtering — but no calendar canvas view. |
| **Day Planner** | Editable time-block calendar for a single day, pulls from daily notes, Tasks plugin, and Dataview clock properties, with pomodoro/live tracking | Reads/writes daily note task lines | Shows real-time "in progress" rendering (highlights current block) — relevant to how tinyCal could render an open event "growing" toward today. |

Sources:
- [Full Calendar plugin (GitHub)](https://github.com/obsidian-community/obsidian-full-calendar)
- [Full Calendar community listing](https://community.obsidian.md/plugins/obsidian-full-calendar)
- [Day Planner (GitHub)](https://github.com/ivan-lednev/obsidian-day-planner)
- [Obsidian Tasks plugin ecosystem overview](https://www.obsidianstats.com/tags/task-management)

## 4. Proposed feature set

### MVP
- Custom calendar view (month + week, switchable) opened via ribbon icon / command palette, as an Obsidian `ItemView` in a workspace leaf/tab.
- Create event, two symmetric paths:
  - **From the calendar:** click a day (or command) → modal with title, start date(/time), optional end date, optional "link to note" (existing note search, or "create new note" which stamps a built-in template + frontmatter link back to the event).
  - **From a note:** command/button ("Start tinyCal event from this note") that tags the current note with the same frontmatter schema and adds it to the calendar.
- Event linked to a note via frontmatter (`tinycal-id`, `tinycal-start`, `tinycal-end`) so the note is the source of truth and the plugin just indexes it — same trust model as Full Calendar/Dataview.
- Open (no end date) events render distinctly and visually extend to "today" each time the view renders.
- "End event" action lives on the calendar UI — a button on the event card, or a "Mark as done" / "End event" option in a right-click/dropdown menu — which sets `tinycal-end`. Not tied to a markdown checkbox in the note.
- Click event → open linked note; click "+" on event → create/link a note.
- Settings tab: default note folder for new event-notes, first day of week, color per "category"/tag.

### V1.x (after MVP validated)
- Day/agenda views in addition to month/week.
- Tag/category coloring, filtering, multiple calendars (e.g., "Work" vs "Personal") toggled on/off.
- Drag to reschedule, drag the open edge to bulk-close ranges of days.
- Search/command to jump to an event by linked note.
- Recurring events (daily/weekly fixed-cadence) — deliberately deferred past MVP so the open-ended/calendar-ended concept ships and gets validated on its own first.
- User-configurable note templates (beyond the MVP's fixed built-in template).
- Mobile-friendly layout (deferred from v1 by decision, but frontmatter-based data model is kept mobile-compatible in principle to avoid a rewrite).

### Possibly later / explicitly out of scope for MVP
- Notifications/reminders (Obsidian has no reliable background push, especially on mobile; would need to be opt-in desktop-only via `Notification` API) — leaning toward deferring, pending confirmation.
- External calendar sync (ICS/CalDAV/Google) — Full Calendar already does this well; not a reason for tinyCal to exist.
- Time-tracking/pomodoro — Day Planner's territory.

## 5. Data model (decided: frontmatter on the linked note)

```yaml
---
tinycal-id: 20260723-a1b2
tinycal-start: 2026-07-23
tinycal-end: null   # absent/null = still open; set by the calendar UI's "End event" action
tinycal-tag: work
---
```
Vault-native, portable, syncs with any sync solution, note is the single source of truth. Plugin builds its in-memory event index by scanning vault frontmatter via `metadataCache` (never hand-parsing YAML), reacting to `metadataCache.on('changed'/'resolved')` and vault rename/delete events to keep the calendar in sync. `Plugin.loadData()/saveData()` is used only for plugin *settings* (default folder, first day of week, etc.), never for event data itself.

Open question still pending (§9): whether `tinycal-id` should support an array on a single note if the "multiple events per note" question is answered "allowed."

## 6. Tech stack (proposed)

- **Language:** TypeScript (standard for Obsidian plugins; official `obsidian.d.ts` type definitions).
- **Build:** esbuild, based on the official [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) template (`npm run dev` watch mode → `main.js`).
- **UI framework inside the view:** plain TypeScript + DOM to start (keeps bundle small, matches most popular plugins), OR Svelte if the calendar grid gets complex enough to want componentization — Svelte compiles to small vanilla-JS bundles and is what several popular Obsidian plugins (e.g. Day Planner, various Dataview-adjacent tools) use. React is heavier and less common in this ecosystem; not recommended unless you're already fluent in it.
- **Calendar rendering:** either (a) hand-roll month + week grids (full control, matches the "tiny" branding, smaller bundle, natively supports open-ended/no-end-date events), or (b) embed **FullCalendar.js** like the Full Calendar plugin does (week view essentially free, drag-and-drop built in, but heavier bundle and its event model assumes fixed end times — open-ended events aren't its native use case, per FullCalendar's own docs on `displayEventEnd`/event objects, so you'd be working against the grain for tinyCal's core feature).
  - **Recommendation:** hand-roll both month and week views for MVP. Since week view is now in scope from day one (not deferred), this is more upfront UI work than a month-only MVP, but it avoids fighting a library whose event model assumes fixed end times, and keeps the plugin small/dependency-light — relevant for community-plugin review and long-term maintenance.
- **Storage:** Obsidian `Vault`/`MetadataCache` API as above; `Plugin.loadData()/saveData()` only for plugin *settings*, not event data.
- **Testing:** minimal unit tests (e.g. Vitest) for the date/event-index logic; manual testing in a real vault for UI (Obsidian plugins are hard to unit-test end-to-end since they need the Obsidian runtime). Given the Community Plugins release goal, budget real time for testing edge cases: file renames, deletes, vault sync race conditions, and malformed/missing frontmatter.
- **Distribution:** community plugin submission (`manifest.json`, `versions.json`, GitHub releases with `main.js`/`manifest.json`/`styles.css` attached), following Obsidian's [plugin submission guidelines](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins) — required since this is targeting public release, not just personal use.

Sources:
- [Obsidian sample plugin template](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian plugin dev getting-started docs](https://deepwiki.com/obsidianmd/obsidian-developer-docs/2.1-getting-started-with-plugin-development)
- [FullCalendar event object / displayEventEnd docs](https://fullcalendar.io/docs/event-object)

## 7. UI concept (rough sketch, to refine)

```
┌─────────────────────────────────────────────┐
│  ‹  July 2026  ›            [+ New Event]    │
├───┬───┬───┬───┬───┬───┬───┬─────────────────┤
│Sun│Mon│Tue│Wed│Thu│Fri│Sat│                  │
├───┼───┼───┼───┼───┼───┼───┤                  │
│   │   │   │▓▓▓│▓▓▓│▓▓▓│▓▓▓│  ▓ = open event   │
│   │   │   │   │   │   │   │    "Ship tinyCal" │
│   │▓▓▓│▓▓▓│▓▓▓│▓▓▓│▓▓▓│▓▓▓│  ░ = closed event │
│   │░░░│░░░│░░░│   │   │   │    "Q2 planning"  │
└───┴───┴───┴───┴───┴───┴───┴─────────────────┘
```
- Clicking a filled cell opens the linked note in the main pane (or a hover preview, Obsidian-style).
- Open events could pulse/have a subtle animated edge on "today's" cell to signal "still running."
- A small badge or right-click menu on the event offers "End event today" / "End event on…".

## 8. Decisions made (locked in)

- **Open-event behavior:** Task-completion tied, ended via calendar UI. Ending an event is triggered from the calendar itself — a button on the event card or a "Mark as done" / "End event" option in a right-click/dropdown menu — not by editing a markdown checkbox inside the note. Clicking it sets `tinycal-end` in the note's frontmatter to today (or a chosen date) and freezes the event's rendering. This keeps the note's own markdown content untouched by the plugin and puts the primary interaction surface on the calendar, matching the "tiny/simple" framing.
- **Note linking:** Symmetric — support creating an event from the calendar (auto-generates/attaches a note from a template) **and** starting an event from within an existing note (a command/button that tags the current note and adds it to the calendar). Both paths converge on the same frontmatter schema.
- **Schema/interoperability:** Own independent schema for MVP (`tinycal-id`, `tinycal-start`, `tinycal-end`, etc.) rather than reusing Full Calendar's or Tasks' conventions. Avoids coupling to another plugin's format; interoperability can be revisited later if there's demand.
- **Project scope:** Building for eventual **Community Plugins release**, not just personal use. This raises the bar on: a real settings tab, sensible defaults, handling file renames/deletes gracefully, avoiding data loss on vault sync race conditions, a clean `manifest.json`/README, and following the [plugin submission guidelines](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins) before submitting.
- **Storage model:** Frontmatter on the linked note. Vault-native, portable, note is the source of truth.
- **MVP views:** Month + week from day one.
- **Platform target:** Desktop-only for v1. Mobile support deferred (but since this is a public-release plugin, the frontmatter-based data model should stay mobile-compatible in principle even if the UI isn't built for it yet — worth keeping in mind so v2 mobile support isn't a rewrite).

Recurring events are deferred past v1 — MVP ships the open-ended, calendar-ended event concept alone, since that's the novel/unproven part worth validating first. Note creation uses a simple built-in template (title + frontmatter) baked into the plugin rather than a user-configurable template system — fast to build, refine later if there's demand. **"tinyCal" is final** — safe to use as the plugin ID (`tinycal`) in `manifest.json` and as the frontmatter field prefix (`tinycal-id`, `tinycal-start`, `tinycal-end`) going forward.

## 9. Remaining open questions — resolved

1. **Reminders/notifications:** No. Out of scope entirely, not just deferred.
2. **Visual identity:** "tiny" is just the name — no constraint to a minimal/sidebar widget. Room for the full-tab, richer calendar view sketched in §7.
3. **Multiple events per note:** No — one event per note. A note already linked to an open or closed tinyCal event cannot be attached to a second event; "start event from this note" should be blocked/disabled if `tinycal-id` already exists in that note's frontmatter (creating a new note is the path for a second event).

All brainstorming questions are now closed. See `plan.md` for the build plan.
