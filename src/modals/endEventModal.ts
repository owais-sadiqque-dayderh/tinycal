import { App, Modal, Notice, Setting } from "obsidian";

export interface EndEventModalCallbacks {
	onSubmit: (endDate: string) => void | Promise<void>;
}

/** "End event on…" — a single date field, defaulting to today. */
export class EndEventModal extends Modal {
	private endDate: string;

	constructor(app: App, defaultEndDate: string, private callbacks: EndEventModalCallbacks) {
		super(app);
		this.endDate = defaultEndDate;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "End event" });

		this.scope.register(null, "Enter", () => {
			this.handleSubmit();
			return false;
		});

		new Setting(contentEl).setName("End date").addText((text) => {
			text.inputEl.type = "date";
			text.setValue(this.endDate);
			text.onChange((value) => (this.endDate = value));
			window.setTimeout(() => text.inputEl.focus());
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("End event")
				.setCta()
				.onClick(() => this.handleSubmit())
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private handleSubmit(): void {
		if (!this.endDate) {
			new Notice("End date is required.");
			return;
		}
		this.callbacks.onSubmit(this.endDate);
		this.close();
	}
}
