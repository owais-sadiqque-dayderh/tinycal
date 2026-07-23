import { TinyCalEvent } from "../types";
import { FirstDayOfWeek, getWeekdayLabels, getWeekGridDates, isSameDay } from "./dateUtils";
import { renderDayRow } from "./dayRow";

export interface WeekGridOptions {
	focusedDate: Date;
	firstDayOfWeek: FirstDayOfWeek;
	/** Events overlapping the visible grid range (not just this week). */
	events: TinyCalEvent[];
	onDayClick?: (date: Date) => void;
	onEventClick?: (event: TinyCalEvent) => void;
	onEventContextMenu?: (event: TinyCalEvent, mouseEvent: MouseEvent) => void;
	tagColors?: Record<string, string>;
}

/** Renders a single 1x7 week row into `container`, reusing the same day-row/lane logic as the month grid. */
export function renderWeekGrid(container: HTMLElement, options: WeekGridOptions): void {
	container.empty();
	container.addClass("tinycal-week-grid");

	const today = new Date();
	const dates = getWeekGridDates(options.focusedDate, options.firstDayOfWeek);
	const labels = getWeekdayLabels(options.firstDayOfWeek);

	const headerRow = container.createDiv({ cls: "tinycal-week-grid-header" });
	for (const label of labels) {
		headerRow.createDiv({ cls: "tinycal-weekday-label", text: label });
	}

	const body = container.createDiv({ cls: "tinycal-week-grid-body" });

	renderDayRow(body, {
		dates,
		events: options.events,
		onDayClick: options.onDayClick,
		onEventClick: options.onEventClick,
		onEventContextMenu: options.onEventContextMenu,
		tagColors: options.tagColors,
		cellClassesFor: (date) => (isSameDay(date, today) ? ["tinycal-day-cell-today"] : []),
	});
}
