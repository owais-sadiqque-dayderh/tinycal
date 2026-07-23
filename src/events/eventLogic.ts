import { FM_END, FM_ID, FM_START, FM_TAG, TinyCalEvent } from "../types";

/** YYYY-MM-DD format check. Doesn't validate calendar correctness (e.g. Feb 30 passes) —
 * cheap, and matches the plain lexical string comparisons used elsewhere for date ranges. */
export function isValidDateString(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function todayString(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/** Generates a fresh, effectively-unique tinycal-id: today's date (compact) + 4 random base36 chars. */
export function generateEventId(now: Date = new Date()): string {
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const random = Math.random().toString(36).slice(2, 6).padEnd(4, "0");
	return `${year}${month}${day}${random}`;
}

/** Turns a note's frontmatter into a TinyCalEvent, or null if the note isn't a valid tinyCal event
 * (missing/malformed tinycal-id or tinycal-start). Malformed events are silently skipped rather than
 * thrown, so one bad note can't break the whole index. */
export function frontmatterToEvent(
	frontmatter: Record<string, unknown> | undefined,
	notePath: string,
	title: string
): TinyCalEvent | null {
	if (!frontmatter) return null;

	const id = frontmatter[FM_ID];
	if (typeof id !== "string" || id.length === 0) return null;

	const start = frontmatter[FM_START];
	if (typeof start !== "string" || !isValidDateString(start)) return null;

	const rawEnd = frontmatter[FM_END];
	const end = typeof rawEnd === "string" && isValidDateString(rawEnd) ? rawEnd : null;

	const rawTag = frontmatter[FM_TAG];
	const tag = typeof rawTag === "string" && rawTag.length > 0 ? rawTag : null;

	return { id, notePath, title, start, end, tag };
}

/** Does the event's [start, end ?? today] span overlap [rangeStart, rangeEnd]?
 * All dates are plain YYYY-MM-DD strings, so lexical comparison is a valid stand-in for date comparison. */
export function eventOverlapsRange(
	event: TinyCalEvent,
	rangeStart: string,
	rangeEnd: string,
	today: string
): boolean {
	const effectiveEnd = event.end ?? today;
	return event.start <= rangeEnd && effectiveEnd >= rangeStart;
}

/** The date a bar for this event should visually end on: its own end, or "today" while open. */
export function effectiveEnd(event: TinyCalEvent, today: string): string {
	return event.end ?? today;
}

/** Does the event's bar cover this specific date? */
export function eventCoversDate(event: TinyCalEvent, date: string, today: string): boolean {
	return event.start <= date && effectiveEnd(event, today) >= date;
}

export type EventStatus = "open" | "scheduled" | "closed";

/**
 * "open" = no end date set, still growing toward today.
 * "scheduled" = end date set but in the future — has a defined range but hasn't finished yet.
 * "closed" = end date set and has already passed (or is today) — actually completed.
 * Only "closed" should render as the dull/completed style; "scheduled" is still active.
 */
export function getEventStatus(event: TinyCalEvent, today: string): EventStatus {
	if (event.end === null) return "open";
	return event.end <= today ? "closed" : "scheduled";
}

export interface EventLane {
	event: TinyCalEvent;
	lane: number;
}

/**
 * Assigns each event a vertical "lane" (0, 1, 2...) so overlapping events never share a lane,
 * using a greedy interval-scheduling pack. Intended to be called once per visible week row so
 * a multi-day event renders as a contiguous, aligned bar across that row's day cells — the same
 * approach month-view calendars (e.g. Google Calendar) use for stacking.
 */
export function assignEventLanes(events: TinyCalEvent[], today: string): EventLane[] {
	const sorted = [...events].sort((a, b) => {
		if (a.start !== b.start) return a.start < b.start ? -1 : 1;
		return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
	});

	const laneEnds: string[] = []; // laneEnds[i] = effectiveEnd of the event currently occupying lane i
	const result: EventLane[] = [];

	for (const event of sorted) {
		const end = effectiveEnd(event, today);
		let lane = laneEnds.findIndex((occupiedUntil) => occupiedUntil < event.start);
		if (lane === -1) {
			lane = laneEnds.length;
			laneEnds.push(end);
		} else {
			laneEnds[lane] = end;
		}
		result.push({ event, lane });
	}

	return result;
}
