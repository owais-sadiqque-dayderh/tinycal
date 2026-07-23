export const FM_ID = "tinycal-id";
export const FM_START = "tinycal-start";
export const FM_END = "tinycal-end";
export const FM_TAG = "tinycal-tag";

export interface TinyCalEvent {
	id: string;
	notePath: string;
	title: string;
	start: string; // YYYY-MM-DD
	end: string | null; // YYYY-MM-DD, or null if still open
	tag: string | null;
}
