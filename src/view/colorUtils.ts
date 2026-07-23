/** Picks black or white text so it stays readable against an arbitrary user-chosen hex background. */
export function getContrastingTextColor(hexColor: string): string {
	const hex = hexColor.replace("#", "");
	const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
	if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return "#000000";

	const r = parseInt(full.slice(0, 2), 16);
	const g = parseInt(full.slice(2, 4), 16);
	const b = parseInt(full.slice(4, 6), 16);

	// Perceived luminance (ITU-R BT.601).
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.6 ? "#000000" : "#ffffff";
}

/** Fallback palette for events without an explicit tag color, so distinct events/tags stay
 * visually distinguishable on the calendar without requiring any settings configuration. */
const EVENT_COLOR_PALETTE = [
	"#6c5ce7",
	"#16a085",
	"#f06595",
	"#4c6ef5",
	"#f59f00",
	"#12b886",
	"#e64980",
	"#7048e8",
];

function hashString(value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 31 + value.charCodeAt(i)) | 0;
	}
	return Math.abs(hash);
}

/** Resolves the display color for an event: an explicit tag color from settings if one is
 * configured, otherwise a stable color auto-picked from a fixed palette — keyed by tag, or by
 * title when untagged — so different events stay visually distinguishable by default. */
export function getEventColor(
	event: { tag: string | null; title: string },
	tagColors?: Record<string, string>
): string {
	if (event.tag && tagColors?.[event.tag]) return tagColors[event.tag];
	const key = event.tag ?? event.title;
	return EVENT_COLOR_PALETTE[hashString(key) % EVENT_COLOR_PALETTE.length];
}
