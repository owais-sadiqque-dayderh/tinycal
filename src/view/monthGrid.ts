import { TinyCalEvent } from "../types";
import {
	chunkIntoWeeks,
	FirstDayOfWeek,
	getMonthGridDates,
	getWeekdayLabels,
	isSameDay,
	isSameMonth,
} from "./dateUtils";
import { renderDayRow } from "./dayRow";

export interface MonthGridOptions {
	focusedDate: Date;
	firstDayOfWeek: FirstDayOfWeek;
	/** Events overlapping the visible grid range (not just the focused month). */
	events: TinyCalEvent[];
	onDayClick?: (date: Date) => void;
	onEventClick?: (event: TinyCalEvent) => void;
	onEventContextMenu?: (event: TinyCalEvent, mouseEvent: MouseEvent) => void;
	tagColors?: Record<string, string>;
}

/** Renders a 6x7 month grid into `container`, with event bars plotted per week row. */
export function renderMonthGrid(container: HTMLElement, options: MonthGridOptions): void {
	container.empty();
	container.addClass("tinycal-month-grid");

	const today = new Date();
	const dates = getMonthGridDates(options.focusedDate, options.firstDayOfWeek);
	const weeks = chunkIntoWeeks(dates);
	const labels = getWeekdayLabels(options.firstDayOfWeek);

	const headerRow = container.createDiv({ cls: "tinycal-month-grid-header" });
	for (const label of labels) {
		headerRow.createDiv({ cls: "tinycal-weekday-label", text: label });
	}

	const body = container.createDiv({ cls: "tinycal-month-grid-body" });

	for (const week of weeks) {
		renderDayRow(body, {
			dates: week,
			events: options.events,
			onDayClick: options.onDayClick,
			onEventClick: options.onEventClick,
			onEventContextMenu: options.onEventContextMenu,
			tagColors: options.tagColors,
			cellClassesFor: (date) => {
				const classes: string[] = [];
				if (!isSameMonth(date, options.focusedDate)) classes.push("tinycal-day-cell-outside-month");
				if (isSameDay(date, today)) classes.push("tinycal-day-cell-today");
				return classes;
			},
		});
	}
}
