import { describe, expect, it } from "vitest";
import {
	assignEventLanes,
	eventCoversDate,
	eventOverlapsRange,
	frontmatterToEvent,
	generateEventId,
	getEventStatus,
	isValidDateString,
} from "./eventLogic";
import { TinyCalEvent } from "../types";

describe("isValidDateString", () => {
	it("accepts YYYY-MM-DD", () => {
		expect(isValidDateString("2026-07-23")).toBe(true);
	});

	it("rejects other formats", () => {
		expect(isValidDateString("2026/07/23")).toBe(false);
		expect(isValidDateString("July 23, 2026")).toBe(false);
		expect(isValidDateString("2026-7-23")).toBe(false);
		expect(isValidDateString("")).toBe(false);
	});
});

describe("frontmatterToEvent", () => {
	it("returns null when frontmatter is missing", () => {
		expect(frontmatterToEvent(undefined, "note.md", "note")).toBeNull();
	});

	it("returns null when tinycal-id is missing", () => {
		expect(
			frontmatterToEvent({ "tinycal-start": "2026-07-23" }, "note.md", "note")
		).toBeNull();
	});

	it("returns null when tinycal-start is missing or malformed", () => {
		expect(frontmatterToEvent({ "tinycal-id": "abc" }, "note.md", "note")).toBeNull();
		expect(
			frontmatterToEvent(
				{ "tinycal-id": "abc", "tinycal-start": "not-a-date" },
				"note.md",
				"note"
			)
		).toBeNull();
	});

	it("builds an open event when tinycal-end is absent", () => {
		const event = frontmatterToEvent(
			{ "tinycal-id": "abc", "tinycal-start": "2026-07-23" },
			"note.md",
			"note"
		);
		expect(event).toEqual({
			id: "abc",
			notePath: "note.md",
			title: "note",
			start: "2026-07-23",
			end: null,
			tag: null,
		});
	});

	it("builds a closed event when tinycal-end is present", () => {
		const event = frontmatterToEvent(
			{
				"tinycal-id": "abc",
				"tinycal-start": "2026-07-01",
				"tinycal-end": "2026-07-10",
				"tinycal-tag": "work",
			},
			"note.md",
			"note"
		);
		expect(event).toEqual({
			id: "abc",
			notePath: "note.md",
			title: "note",
			start: "2026-07-01",
			end: "2026-07-10",
			tag: "work",
		});
	});

	it("treats a malformed tinycal-end as absent rather than throwing", () => {
		const event = frontmatterToEvent(
			{ "tinycal-id": "abc", "tinycal-start": "2026-07-01", "tinycal-end": "invalid" },
			"note.md",
			"note"
		);
		expect(event?.end).toBeNull();
	});
});

describe("eventOverlapsRange", () => {
	const baseEvent: TinyCalEvent = {
		id: "abc",
		notePath: "note.md",
		title: "note",
		start: "2026-07-10",
		end: "2026-07-15",
		tag: null,
	};

	it("matches a closed event fully inside the range", () => {
		expect(eventOverlapsRange(baseEvent, "2026-07-01", "2026-07-31", "2026-07-20")).toBe(
			true
		);
	});

	it("matches a closed event partially overlapping the range", () => {
		expect(eventOverlapsRange(baseEvent, "2026-07-12", "2026-07-20", "2026-07-20")).toBe(
			true
		);
	});

	it("excludes a closed event entirely before the range", () => {
		expect(eventOverlapsRange(baseEvent, "2026-07-16", "2026-07-31", "2026-07-20")).toBe(
			false
		);
	});

	it("excludes a closed event entirely after the range", () => {
		expect(eventOverlapsRange(baseEvent, "2026-07-01", "2026-07-09", "2026-07-20")).toBe(
			false
		);
	});

	it("treats an open event as extending to today", () => {
		const openEvent: TinyCalEvent = { ...baseEvent, end: null };
		expect(eventOverlapsRange(openEvent, "2026-07-18", "2026-07-25", "2026-07-20")).toBe(
			true
		);
		expect(eventOverlapsRange(openEvent, "2026-07-21", "2026-07-25", "2026-07-20")).toBe(
			false
		);
	});
});

describe("generateEventId", () => {
	it("prefixes with the compact date and stays 12 characters", () => {
		const id = generateEventId(new Date(2026, 6, 23));
		expect(id.startsWith("20260723")).toBe(true);
		expect(id).toHaveLength(12);
	});

	it("produces different ids across calls", () => {
		const a = generateEventId(new Date(2026, 6, 23));
		const b = generateEventId(new Date(2026, 6, 23));
		expect(a).not.toBe(b);
	});
});

describe("eventCoversDate", () => {
	const closedEvent: TinyCalEvent = {
		id: "abc",
		notePath: "note.md",
		title: "note",
		start: "2026-07-10",
		end: "2026-07-15",
		tag: null,
	};
	const openEvent: TinyCalEvent = { ...closedEvent, id: "def", end: null };

	it("is true within a closed event's range, false outside it", () => {
		expect(eventCoversDate(closedEvent, "2026-07-10", "2026-07-20")).toBe(true);
		expect(eventCoversDate(closedEvent, "2026-07-15", "2026-07-20")).toBe(true);
		expect(eventCoversDate(closedEvent, "2026-07-09", "2026-07-20")).toBe(false);
		expect(eventCoversDate(closedEvent, "2026-07-16", "2026-07-20")).toBe(false);
	});

	it("extends an open event's coverage to today but not beyond", () => {
		expect(eventCoversDate(openEvent, "2026-07-20", "2026-07-20")).toBe(true);
		expect(eventCoversDate(openEvent, "2026-07-21", "2026-07-20")).toBe(false);
	});
});

describe("getEventStatus", () => {
	const base: TinyCalEvent = {
		id: "abc",
		notePath: "note.md",
		title: "note",
		start: "2026-07-10",
		end: null,
		tag: null,
	};

	it("is 'open' when no end date is set", () => {
		expect(getEventStatus(base, "2026-07-20")).toBe("open");
	});

	it("is 'scheduled' when the end date is in the future", () => {
		expect(getEventStatus({ ...base, end: "2026-07-25" }, "2026-07-20")).toBe("scheduled");
	});

	it("is 'closed' when the end date is today or in the past", () => {
		expect(getEventStatus({ ...base, end: "2026-07-20" }, "2026-07-20")).toBe("closed");
		expect(getEventStatus({ ...base, end: "2026-07-15" }, "2026-07-20")).toBe("closed");
	});
});

describe("assignEventLanes", () => {
	const today = "2026-07-20";

	it("gives non-overlapping events the same lane", () => {
		const a: TinyCalEvent = {
			id: "a",
			notePath: "a.md",
			title: "a",
			start: "2026-07-01",
			end: "2026-07-05",
			tag: null,
		};
		const b: TinyCalEvent = {
			id: "b",
			notePath: "b.md",
			title: "b",
			start: "2026-07-06",
			end: "2026-07-10",
			tag: null,
		};
		const lanes = assignEventLanes([a, b], today);
		expect(lanes.find((l) => l.event.id === "a")?.lane).toBe(0);
		expect(lanes.find((l) => l.event.id === "b")?.lane).toBe(0);
	});

	it("gives overlapping events different lanes", () => {
		const a: TinyCalEvent = {
			id: "a",
			notePath: "a.md",
			title: "a",
			start: "2026-07-01",
			end: "2026-07-10",
			tag: null,
		};
		const b: TinyCalEvent = {
			id: "b",
			notePath: "b.md",
			title: "b",
			start: "2026-07-05",
			end: "2026-07-15",
			tag: null,
		};
		const lanes = assignEventLanes([a, b], today);
		expect(lanes.find((l) => l.event.id === "a")?.lane).toBe(0);
		expect(lanes.find((l) => l.event.id === "b")?.lane).toBe(1);
	});

	it("reuses a freed lane once its event has ended", () => {
		const a: TinyCalEvent = {
			id: "a",
			notePath: "a.md",
			title: "a",
			start: "2026-07-01",
			end: "2026-07-05",
			tag: null,
		};
		const b: TinyCalEvent = {
			id: "b",
			notePath: "b.md",
			title: "b",
			start: "2026-07-01",
			end: "2026-07-10",
			tag: null,
		};
		const c: TinyCalEvent = {
			id: "c",
			notePath: "c.md",
			title: "c",
			start: "2026-07-06",
			end: "2026-07-08",
			tag: null,
		};
		const lanes = assignEventLanes([a, b, c], today);
		expect(lanes.find((l) => l.event.id === "a")?.lane).toBe(0);
		expect(lanes.find((l) => l.event.id === "b")?.lane).toBe(1);
		// c starts after a has ended, so it can reuse lane 0 instead of opening a third lane.
		expect(lanes.find((l) => l.event.id === "c")?.lane).toBe(0);
	});

	it("treats an open event's lane as occupied through today", () => {
		const openEvent: TinyCalEvent = {
			id: "open",
			notePath: "open.md",
			title: "open",
			start: "2026-07-01",
			end: null,
			tag: null,
		};
		const later: TinyCalEvent = {
			id: "later",
			notePath: "later.md",
			title: "later",
			start: "2026-07-19",
			end: "2026-07-25",
			tag: null,
		};
		const lanes = assignEventLanes([openEvent, later], today);
		expect(lanes.find((l) => l.event.id === "open")?.lane).toBe(0);
		expect(lanes.find((l) => l.event.id === "later")?.lane).toBe(1);
	});
});
