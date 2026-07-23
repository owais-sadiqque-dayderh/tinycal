import { App, FuzzySuggestModal, TFile } from "obsidian";
import { FM_ID } from "../types";

/** Picks any note that isn't already a tinyCal event — enforces one-event-per-note at the
 * picker level (in addition to EventStore's own check) by excluding notes with an existing id. */
export class NoteSuggestModal extends FuzzySuggestModal<TFile> {
	constructor(app: App, private onChoose: (file: TFile) => void) {
		super(app);
		this.setPlaceholder("Link an existing note as a tinyCal event…");
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles().filter((file) => {
			const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
			return !frontmatter?.[FM_ID];
		});
	}

	getItemText(file: TFile): string {
		return file.basename;
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file);
	}
}
