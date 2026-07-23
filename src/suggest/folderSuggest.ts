import { AbstractInputSuggest, App, TFolder } from "obsidian";

/** Autocompletes vault folder paths in a text input, e.g. for the "default folder" setting. */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(app: App, inputEl: HTMLInputElement, private onSelectFolder: (path: string) => void) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): TFolder[] {
		const q = query.trim().toLowerCase();
		const folders: TFolder[] = [];

		const collect = (folder: TFolder) => {
			folders.push(folder);
			for (const child of folder.children) {
				if (child instanceof TFolder) collect(child);
			}
		};
		collect(this.app.vault.getRoot());

		return folders.filter((folder) => folder.path.toLowerCase().includes(q));
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path === "" ? "/" : folder.path);
	}

	selectSuggestion(folder: TFolder): void {
		this.setValue(folder.path);
		this.onSelectFolder(folder.path);
		this.close();
	}
}
