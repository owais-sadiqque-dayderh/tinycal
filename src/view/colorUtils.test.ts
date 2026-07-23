import { describe, expect, it } from "vitest";
import { getContrastingTextColor, getEventColor } from "./colorUtils";

describe("getContrastingTextColor", () => {
	it("returns black text for light backgrounds", () => {
		expect(getContrastingTextColor("#ffffff")).toBe("#000000");
		expect(getContrastingTextColor("#ffff00")).toBe("#000000");
	});

	it("returns white text for dark backgrounds", () => {
		expect(getContrastingTextColor("#000000")).toBe("#ffffff");
		expect(getContrastingTextColor("#1a1a2e")).toBe("#ffffff");
	});

	it("expands 3-digit hex shorthand", () => {
		expect(getContrastingTextColor("#fff")).toBe("#000000");
		expect(getContrastingTextColor("#000")).toBe("#ffffff");
	});

	it("falls back to black for malformed input", () => {
		expect(getContrastingTextColor("not-a-color")).toBe("#000000");
	});
});

describe("getEventColor", () => {
	it("prefers an explicit tag color when configured", () => {
		const event = { tag: "work", title: "Design Sprint" };
		expect(getEventColor(event, { work: "#123456" })).toBe("#123456");
	});

	it("falls back to a stable palette color keyed by tag when untagged colors aren't set", () => {
		const event = { tag: "work", title: "Design Sprint" };
		expect(getEventColor(event, {})).toBe(getEventColor(event, {}));
	});

	it("keys off title when there's no tag", () => {
		const a = { tag: null, title: "Design Sprint" };
		const b = { tag: null, title: "Design Sprint" };
		expect(getEventColor(a)).toBe(getEventColor(b));
	});

	it("returns a valid hex color", () => {
		const color = getEventColor({ tag: null, title: "Anything" });
		expect(color).toMatch(/^#[0-9a-f]{6}$/);
	});
});
