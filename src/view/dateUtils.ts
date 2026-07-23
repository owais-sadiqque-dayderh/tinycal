export type FirstDayOfWeek = 0 | 1; // 0 = Sunday, 1 = Monday

const WEEKDAY_LABELS_SUNDAY_FIRST = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday header labels in display order for the given first-day-of-week setting. */
export function getWeekdayLabels(firstDayOfWeek: FirstDayOfWeek): string[] {
	return [
		...WEEKDAY_LABELS_SUNDAY_FIRST.slice(firstDayOfWeek),
		...WEEKDAY_LABELS_SUNDAY_FIRST.slice(0, firstDayOfWeek),
	];
}

export function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function isSameMonth(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function addMonths(date: Date, delta: number): Date {
	return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function addDays(date: Date, delta: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

export function formatMonthYear(date: Date): string {
	return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function toDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Returns the 6x7 grid of dates (42 days) to render for the month containing `focusedDate`,
 * including leading/trailing days from adjacent months so every week row is full.
 */
export function getMonthGridDates(focusedDate: Date, firstDayOfWeek: FirstDayOfWeek): Date[] {
	const firstOfMonth = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1);
	const firstWeekday = firstOfMonth.getDay(); // 0-6, Sunday-based
	const leadingDays = (firstWeekday - firstDayOfWeek + 7) % 7;
	const gridStart = addDays(firstOfMonth, -leadingDays);

	const dates: Date[] = [];
	for (let i = 0; i < 42; i++) {
		dates.push(addDays(gridStart, i));
	}
	return dates;
}

/** Chunks a flat list of grid dates into week-long rows (7 dates each). */
export function chunkIntoWeeks(dates: Date[]): Date[][] {
	const weeks: Date[][] = [];
	for (let i = 0; i < dates.length; i += 7) {
		weeks.push(dates.slice(i, i + 7));
	}
	return weeks;
}

/** Returns the 7 dates of the week containing `focusedDate`, per `firstDayOfWeek`. */
export function getWeekGridDates(focusedDate: Date, firstDayOfWeek: FirstDayOfWeek): Date[] {
	const leadingDays = (focusedDate.getDay() - firstDayOfWeek + 7) % 7;
	const weekStart = addDays(focusedDate, -leadingDays);

	const dates: Date[] = [];
	for (let i = 0; i < 7; i++) {
		dates.push(addDays(weekStart, i));
	}
	return dates;
}

/** Header label for a week view, e.g. "Jul 20, 2026 – Jul 26, 2026". */
export function formatWeekRange(dates: Date[]): string {
	const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
	return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
}
