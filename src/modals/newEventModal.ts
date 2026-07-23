import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { TagSuggest } from "../suggest/tagSuggest";
import { NoteSuggestModal } from "./noteSuggestModal";

export interface NewEventFormFields {
	start: string;
	end: string | null;
	tag: string | null;
}

export interface NewEventModalCallbacks {
	onCreateNew: (fields: NewEventFormFields & { title: string }) => void | Promise<void>;
	onLinkExisting: (file: TFile, fields: NewEventFormFields) => void | Promise<void>;
}

/** Calendar-first event creation: either stamps a brand new note, or links an existing
 * note picked via NoteSuggestModal. Both paths share the same start/end/tag fields. */
export class NewEventModal extends Modal {
	private title = "";
	private start: string;
	private end = "";
	private tag = "";

	constructor(
		app: App,
		prefillDate: string,
		private knownTags: string[],
		private callbacks: NewEventModalCallbacks
	) {
		super(app);
		this.start = prefillDate;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "New tinyCal event" });

		// Enter submits the CTA ("Create new note"); linking an existing note stays a deliberate click.
		this.scope.register(null, "Enter", () => {
			this.handleCreateNew();
			return false;
		});

		new Setting(contentEl)
			.setName("Title")
			.setDesc("Used as the new note's filename. Ignored when linking an existing note.")
			.addText((text) => {
				text.onChange((value) => (this.title = value));
				window.setTimeout(() => text.inputEl.focus());
			});

		new Setting(contentEl).setName("Start date").addText((text) => {
			text.inputEl.type = "date";
			text.setValue(this.start);
			text.onChange((value) => (this.start = value));
		});

		new Setting(contentEl)
			.setName("End date")
			.setDesc("Leave empty to create an open event.")
			.addText((text) => {
				text.inputEl.type = "date";
				text.onChange((value) => (this.end = value));
			});

		new Setting(contentEl)
			.setName("Tag")
			.setDesc("Optional.")
			.addText((text) => {
				text.onChange((value) => (this.tag = value));
				if (this.knownTags.length > 0) {
					new TagSuggest(this.app, text.inputEl, this.knownTags, (tag) => {
						this.tag = tag;
						text.setValue(tag);
					});
				}
			});

		new Setting(contentEl)
			.addButton((btn) => btn.setButtonText("Link existing note").onClick(() => this.handleLinkExisting()))
			.addButton((btn) =>
				btn
					.setButtonText("Create new note")
					.setCta()
					.onClick(() => this.handleCreateNew())
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private validateStart(): boolean {
		if (!this.start) {
			new Notice("Start date is required.");
			return false;
		}
		return true;
	}

	private handleCreateNew(): void {
		if (!this.title.trim()) {
			new Notice("Title is required to create a new note.");
			return;
		}
		if (!this.validateStart()) return;

		this.callbacks.onCreateNew({
			title: this.title.trim(),
			start: this.start,
			end: this.end || null,
			tag: this.tag.trim() || null,
		});
		this.close();
	}

	private handleLinkExisting(): void {
		if (!this.validateStart()) return;

		const fields: NewEventFormFields = {
			start: this.start,
			end: this.end || null,
			tag: this.tag.trim() || null,
		};
		new NoteSuggestModal(this.app, (file) => this.callbacks.onLinkExisting(file, fields)).open();
		this.close();
	}
}
