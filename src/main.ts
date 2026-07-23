import { Notice, Plugin, TFile } from "obsidian";
import { EventIndex } from "./events/eventIndex";
import { EventStore } from "./events/eventStore";
import { StartEventModal } from "./modals/startEventModal";
import { DEFAULT_SETTINGS, TinyCalSettings, TinyCalSettingTab } from "./settings";
import { FM_ID } from "./types";
import { CalendarView, VIEW_TYPE_CALENDAR } from "./view/calendarView";

export default class TinyCalPlugin extends Plugin {
	eventIndex!: EventIndex;
	eventStore!: EventStore;
	settings!: TinyCalSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.eventIndex = new EventIndex(this.app);
		await this.eventIndex.build();
		this.eventIndex.registerVaultEvents(this.registerEvent.bind(this));

		this.eventStore = new EventStore(this.app);

		this.registerView(
			VIEW_TYPE_CALENDAR,
			(leaf) => new CalendarView(leaf, this.eventIndex, this.eventStore, this.settings)
		);

		this.addSettingTab(new TinyCalSettingTab(this.app, this));

		this.addRibbonIcon("calendar-days", "Open tinyCal calendar", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-tinycal-calendar",
			name: "Open tinyCal calendar",
			callback: () => this.activateView(),
		});

		this.addCommand({
			id: "start-tinycal-event-from-note",
			name: "Start tinyCal event from this note",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (!checking) this.startEventFromNote(file);
				return true;
			},
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFile) || file.extension !== "md") return;
				menu.addItem((item) =>
					item
						.setTitle("Start tinyCal event from this note")
						.setIcon("calendar-days")
						.onClick(() => this.startEventFromNote(file))
				);
			})
		);
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)) {
			if (leaf.view instanceof CalendarView) leaf.view.refresh();
		}
	}

	private async activateView(): Promise<void> {
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
		if (existing.length > 0) {
			workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = workspace.getLeaf("tab");
		await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
		workspace.revealLeaf(leaf);
	}

	private startEventFromNote(file: TFile): void {
		const existingId = this.app.metadataCache.getFileCache(file)?.frontmatter?.[FM_ID];
		if (existingId) {
			new Notice("This note is already a tinyCal event.");
			return;
		}

		const knownTags = Array.from(
			new Set([...this.eventIndex.getAllTags(), ...Object.keys(this.settings.tagColors)])
		).sort();

		new StartEventModal(this.app, knownTags, {
			onSubmit: async (fields) => {
				try {
					await this.eventStore.linkNoteAsEvent(file, fields);
					new Notice(`Started tinyCal event for "${file.basename}"`);
				} catch (error) {
					new Notice(error instanceof Error ? error.message : String(error));
				}
			},
		}).open();
	}
}
