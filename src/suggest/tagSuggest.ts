import { AbstractInputSuggest, App } from "obsidian";

/** Autocompletes from a fixed list of known tags, while still allowing free-text entry. */
export class TagSuggest extends AbstractInputSuggest<string> {
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		private tags: string[],
		private onSelectTag: (tag: string) => void
	) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): string[] {
		const q = query.trim().toLowerCase();
		if (!q) return this.tags;
		return this.tags.filter((tag) => tag.toLowerCase().includes(q));
	}

	renderSuggestion(tag: string, el: HTMLElement): void {
		el.setText(tag);
	}

	selectSuggestion(tag: string): void {
		this.setValue(tag);
		this.onSelectTag(tag);
		this.close();
	}
}
