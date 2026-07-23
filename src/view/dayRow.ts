import { assignEventLanes, eventCoversDate, getEventStatus, todayString } from "../events/eventLogic";
import { TinyCalEvent } from "../types";
import { getContrastingTextColor, getEventColor } from "./colorUtils";
import { toDateString } from "./dateUtils";

export interface DayRowOptions {
	/** The days in this row, in display order (7 for both a month-grid week and the week grid). */
	dates: Date[];
	/** Events overlapping the visible range (a superset is fine — filtered internally to this row). */
	events: TinyCalEvent[];
	onDayClick?: (date: Date) => void;
	onEventClick?: (event: TinyCalEvent) => void;
	onEventContextMenu?: (event: TinyCalEvent, mouseEvent: MouseEvent) => void;
	/** Extra CSS classes for a given day's cell (e.g. "outside month", "today"). */
	cellClassesFor?: (date: Date) => string[];
	/** Optional tag -> hex color overrides for event bars, from settings. */
	tagColors?: Record<string, string>;
}

/**
 * Renders one row of day-cells with events stacked into lanes. Each event shows a colored
 * name "pill" only on its actual start day (never repeated on later rows), and a thin colored
 * line — vertically centered in the same fixed-height slot, so it stays level across cells —
 * on every other day it's still active. Closed events render both at reduced opacity. Shared
 * by the month grid (called once per visible week row) and the week grid (called once for the
 * whole row), so the lane assignment and rendering logic lives in exactly one place.
 */
export function renderDayRow(container: HTMLElement, options: DayRowOptions): void {
	const todayStr = todayString();
	const rowStart = toDateString(options.dates[0]);
	const rowEnd = toDateString(options.dates[options.dates.length - 1]);

	const rowEvents = options.events.filter((event) => {
		const effectiveEnd = event.end ?? todayStr;
		return event.start <= rowEnd && effectiveEnd >= rowStart;
	});
	const lanes = assignEventLanes(rowEvents, todayStr);
	const laneCount = lanes.reduce((max, l) => Math.max(max, l.lane + 1), 0);

	const cells = options.dates.map(() => container.createDiv({ cls: "tinycal-day-cell" }));

	options.dates.forEach((date, dayIndex) => {
		const cell = cells[dayIndex];
		for (const cls of options.cellClassesFor?.(date) ?? []) {
			cell.addClass(cls);
		}
		cell.createDiv({ cls: "tinycal-day-number", text: String(date.getDate()) });

		if (options.onDayClick) {
			const onDayClick = options.onDayClick;
			// Event slot clicks call stopPropagation, so this only fires for clicks on empty cell space.
			cell.addEventListener("click", () => onDayClick(date));
		}

		const dateStr = toDateString(date);
		const eventsContainer = cell.createDiv({ cls: "tinycal-day-events" });

		for (let lane = 0; lane < laneCount; lane++) {
			const laneEntry = lanes.find((l) => l.lane === lane && eventCoversDate(l.event, dateStr, todayStr));

			if (!laneEntry) {
				eventsContainer.createDiv({ cls: "tinycal-event-slot tinycal-event-slot-empty" });
				continue;
			}

			const event = laneEntry.event;
			const status = getEventStatus(event, todayStr);
			const isStartDay = dateStr === event.start;
			const color = getEventColor(event, options.tagColors);

			const slot = eventsContainer.createDiv({ cls: "tinycal-event-slot" });
			if (status === "closed") slot.addClass("tinycal-event-slot-faded");

			if (isStartDay) {
				const pill = slot.createDiv({ cls: "tinycal-event-pill", text: event.title });
				pill.style.backgroundColor = color;
				pill.style.color = getContrastingTextColor(color);
			} else {
				const line = slot.createDiv({ cls: "tinycal-event-line" });
				line.style.backgroundColor = color;
				if (status === "open" && dateStr === todayStr) {
					line.style.boxShadow = `0 0 4px 1px ${color}`;
				}
			}

			if (options.onEventClick) {
				const onEventClick = options.onEventClick;
				slot.addEventListener("click", (evt) => {
					evt.stopPropagation();
					onEventClick(event);
				});
			}

			if (options.onEventContextMenu) {
				const onEventContextMenu = options.onEventContextMenu;
				slot.addEventListener("contextmenu", (evt) => {
					evt.preventDefault();
					evt.stopPropagation();
					onEventContextMenu(event, evt);
				});
			}
		}
	});
}
