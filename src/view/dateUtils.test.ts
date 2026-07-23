import { describe, expect, it } from "vitest";
import {
	addMonths,
	chunkIntoWeeks,
	formatWeekRange,
	getMonthGridDates,
	getWeekdayLabels,
	getWeekGridDates,
	isSameDay,
	isSameMonth,
	toDateString,
} from "./dateUtils";

describe("getWeekdayLabels", () => {
	it("starts on Sunday when firstDayOfWeek is 0", () => {
		expect(getWeekdayLabels(0)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
	});

	it("starts on Monday when firstDayOfWeek is 1", () => {
		expect(getWeekdayLabels(1)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
	});
});

describe("getMonthGridDates", () => {
	it("returns exactly 42 dates", () => {
		expect(getMonthGridDates(new Date(2026, 6, 23), 0)).toHaveLength(42);
	});

	it("covers the entire month with leading/trailing days from adjacent months (Sunday-first)", () => {
		// July 2026: July 1 is a Wednesday, so with Sunday-first the grid starts Sun Jun 28.
		const dates = getMonthGridDates(new Date(2026, 6, 15), 0);
		expect(toDateString(dates[0])).toBe("2026-06-28");
		expect(toDateString(dates[3])).toBe("2026-07-01");
		expect(toDateString(dates[dates.length - 1])).toBe("2026-08-08");
	});

	it("shifts the grid start when firstDayOfWeek is Monday", () => {
		const dates = getMonthGridDates(new Date(2026, 6, 15), 1);
		expect(toDateString(dates[0])).toBe("2026-06-29");
		expect(toDateString(dates[2])).toBe("2026-07-01");
	});
});

describe("chunkIntoWeeks", () => {
	it("splits 42 dates into 6 rows of 7", () => {
		const dates = getMonthGridDates(new Date(2026, 6, 15), 0);
		const weeks = chunkIntoWeeks(dates);
		expect(weeks).toHaveLength(6);
		for (const week of weeks) expect(week).toHaveLength(7);
		expect(weeks[0][0]).toBe(dates[0]);
		expect(weeks[5][6]).toBe(dates[41]);
	});
});

describe("isSameDay / isSameMonth", () => {
	it("compares calendar day regardless of time", () => {
		expect(isSameDay(new Date(2026, 6, 23, 1), new Date(2026, 6, 23, 23))).toBe(true);
		expect(isSameDay(new Date(2026, 6, 23), new Date(2026, 6, 24))).toBe(false);
	});

	it("compares month and year", () => {
		expect(isSameMonth(new Date(2026, 6, 1), new Date(2026, 6, 30))).toBe(true);
		expect(isSameMonth(new Date(2026, 6, 30), new Date(2026, 7, 1))).toBe(false);
	});
});

describe("getWeekGridDates", () => {
	it("returns exactly 7 dates spanning Sunday-Saturday (Sunday-first)", () => {
		// July 23, 2026 is a Thursday, so with Sunday-first the week is Jul 19 - Jul 25.
		const dates = getWeekGridDates(new Date(2026, 6, 23), 0);
		expect(dates).toHaveLength(7);
		expect(toDateString(dates[0])).toBe("2026-07-19");
		expect(toDateString(dates[6])).toBe("2026-07-25");
	});

	it("shifts the week start when firstDayOfWeek is Monday", () => {
		const dates = getWeekGridDates(new Date(2026, 6, 23), 1);
		expect(toDateString(dates[0])).toBe("2026-07-20");
		expect(toDateString(dates[6])).toBe("2026-07-26");
	});
});

describe("formatWeekRange", () => {
	it("formats the first and last date of the week", () => {
		const dates = getWeekGridDates(new Date(2026, 6, 23), 0);
		expect(formatWeekRange(dates)).toBe("Jul 19, 2026 – Jul 25, 2026");
	});
});

describe("addMonths", () => {
	it("rolls over into the next year", () => {
		const result = addMonths(new Date(2026, 11, 15), 1);
		expect(result.getFullYear()).toBe(2027);
		expect(result.getMonth()).toBe(0);
	});

	it("rolls back into the previous year", () => {
		const result = addMonths(new Date(2026, 0, 15), -1);
		expect(result.getFullYear()).toBe(2025);
		expect(result.getMonth()).toBe(11);
	});
});
