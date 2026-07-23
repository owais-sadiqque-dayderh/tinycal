import { App, Modal, Notice, Setting } from "obsidian";
import { todayString } from "../events/eventLogic";
import { TagSuggest } from "../suggest/tagSuggest";

export interface StartEventFormFields {
	start: string;
	end: string | null;
	tag: string | null;
}

export interface StartEventModalCallbacks {
	onSubmit: (fields: StartEventFormFields) => void | Promise<void>;
}

/** Note-first event creation: turns the active note into a tinyCal event.
 * Mirrors NewEventModal's link-existing fields, minus the title (the note already has one). */
export class StartEventModal extends Modal {
	private start: string = todayString();
	private end = "";
	private tag = "";

	constructor(app: App, private knownTags: string[], private callbacks: StartEventModalCallbacks) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Start tinyCal event from this note" });

		this.scope.register(null, "Enter", () => {
			this.handleSubmit();
			return false;
		});

		new Setting(contentEl).setName("Start date").addText((text) => {
			text.inputEl.type = "date";
			text.setValue(this.start);
			text.onChange((value) => (this.start = value));
			window.setTimeout(() => text.inputEl.focus());
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

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Start event")
				.setCta()
				.onClick(() => this.handleSubmit())
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private handleSubmit(): void {
		if (!this.start) {
			new Notice("Start date is required.");
			return;
		}
		this.callbacks.onSubmit({
			start: this.start,
			end: this.end || null,
			tag: this.tag.trim() || null,
		});
		this.close();
	}
}
