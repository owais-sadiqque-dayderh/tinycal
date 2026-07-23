import { ItemView, Menu, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { EventIndex } from "../events/eventIndex";
import { getEventStatus, todayString } from "../events/eventLogic";
import { EventStore } from "../events/eventStore";
import { EndEventModal } from "../modals/endEventModal";
import { NewEventModal } from "../modals/newEventModal";
import { TinyCalSettings } from "../settings";
import { TinyCalEvent } from "../types";
import {
	addDays,
	addMonths,
	formatMonthYear,
	formatWeekRange,
	getMonthGridDates,
	getWeekGridDates,
	toDateString,
} from "./dateUtils";
import { renderMonthGrid } from "./monthGrid";
import { renderWeekGrid } from "./weekGrid";

export const VIEW_TYPE_CALENDAR = "tinycal-calendar-view";

const DAY_ROLLOVER_CHECK_INTERVAL_MS = 60 * 1000;

type ViewMode = "month" | "week";

export class CalendarView extends ItemView {
	private focusedDate: Date = new Date();
	private lastKnownToday: string = todayString();
	private viewMode: ViewMode = "month";

	private headerLabelEl!: HTMLElement;
	private viewToggleBtnEl!: HTMLButtonElement;
	private gridEl!: HTMLElement;
	private unsubscribeFromIndex: (() => void) | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private eventIndex: EventIndex,
		private eventStore: EventStore,
		private settings: TinyCalSettings
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_CALENDAR;
	}

	getDisplayText(): string {
		return "tinyCal";
	}

	getIcon(): string {
		return "calendar-days";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("tinycal-view");

		const header = container.createDiv({ cls: "tinycal-header" });

		const prevBtn = header.createEl("button", { text: "‹", cls: "tinycal-nav-btn" });
		prevBtn.addEventListener("click", () => this.shiftPeriod(-1));

		this.headerLabelEl = header.createDiv({ cls: "tinycal-header-label" });

		const nextBtn = header.createEl("button", { text: "›", cls: "tinycal-nav-btn" });
		nextBtn.addEventListener("click", () => this.shiftPeriod(1));

		this.viewToggleBtnEl = header.createEl("button", {
			text: "Week",
			cls: "tinycal-view-toggle-btn",
		});
		this.viewToggleBtnEl.addEventListener("click", () => this.toggleViewMode());

		const newEventBtn = header.createEl("button", {
			text: "+ New Event",
			cls: "tinycal-new-event-btn",
		});
		newEventBtn.addEventListener("click", () => this.openNewEventModal(todayString()));

		this.gridEl = container.createDiv({ cls: "tinycal-grid-container" });

		this.unsubscribeFromIndex = this.eventIndex.onChange(() => this.render());
		this.registerInterval(window.setInterval(() => this.checkDayRollover(), DAY_ROLLOVER_CHECK_INTERVAL_MS));

		this.render();
	}

	async onClose(): Promise<void> {
		this.unsubscribeFromIndex?.();
		this.unsubscribeFromIndex = null;
	}

	/** Re-renders using the latest settings (called after the settings tab saves a change). */
	refresh(): void {
		this.render();
	}

	private shiftPeriod(delta: number): void {
		this.focusedDate =
			this.viewMode === "month" ? addMonths(this.focusedDate, delta) : addDays(this.focusedDate, delta * 7);
		this.render();
	}

	private toggleViewMode(): void {
		this.viewMode = this.viewMode === "month" ? "week" : "month";
		this.viewToggleBtnEl.setText(this.viewMode === "month" ? "Week" : "Month");
		this.render();
	}

	private checkDayRollover(): void {
		const today = todayString();
		if (today !== this.lastKnownToday) {
			this.lastKnownToday = today;
			this.render();
		}
	}

	private openEventNote(event: TinyCalEvent): void {
		const file = this.app.vault.getAbstractFileByPath(event.notePath);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf("tab").openFile(file);
		}
	}

	private showEventContextMenu(event: TinyCalEvent, mouseEvent: MouseEvent): void {
		const file = this.app.vault.getAbstractFileByPath(event.notePath);
		if (!(file instanceof TFile)) return;

		const menu = new Menu();
		menu.addItem((item) =>
			item
				.setTitle("Open note")
				.setIcon("file-text")
				.onClick(() => this.openEventNote(event))
		);

		if (getEventStatus(event, todayString()) !== "closed") {
			menu.addItem((item) =>
				item
					.setTitle("End event today")
					.setIcon("check-circle")
					.onClick(() => this.endEvent(file, todayString()))
			);
			menu.addItem((item) =>
				item
					.setTitle("End event on…")
					.setIcon("calendar")
					.onClick(() => {
						new EndEventModal(this.app, todayString(), {
							onSubmit: (endDate) => this.endEvent(file, endDate),
						}).open();
					})
			);
		}

		menu.showAtMouseEvent(mouseEvent);
	}

	private async endEvent(file: TFile, endDate: string): Promise<void> {
		try {
			await this.eventStore.endEvent(file, endDate);
			new Notice(`Ended event "${file.basename}"`);
		} catch (error) {
			new Notice(error instanceof Error ? error.message : String(error));
		}
	}

	private openNewEventModal(prefillDate: string): void {
		const knownTags = Array.from(
			new Set([...this.eventIndex.getAllTags(), ...Object.keys(this.settings.tagColors)])
		).sort();

		new NewEventModal(this.app, prefillDate, knownTags, {
			onCreateNew: async (fields) => {
				try {
					await this.eventStore.createEventNote({ ...fields, folder: this.settings.defaultFolder || undefined });
					new Notice(`Created event "${fields.title}"`);
				} catch (error) {
					new Notice(error instanceof Error ? error.message : String(error));
				}
			},
			onLinkExisting: async (file, fields) => {
				try {
					await this.eventStore.linkNoteAsEvent(file, fields);
					new Notice(`Linked "${file.basename}" as an event`);
				} catch (error) {
					new Notice(error instanceof Error ? error.message : String(error));
				}
			},
		}).open();
	}

	private render(): void {
		const gridDates =
			this.viewMode === "month"
				? getMonthGridDates(this.focusedDate, this.settings.firstDayOfWeek)
				: getWeekGridDates(this.focusedDate, this.settings.firstDayOfWeek);
		const rangeStart = toDateString(gridDates[0]);
		const rangeEnd = toDateString(gridDates[gridDates.length - 1]);
		const events = this.eventIndex.getEventsInRange(rangeStart, rangeEnd);

		const sharedOptions = {
			focusedDate: this.focusedDate,
			firstDayOfWeek: this.settings.firstDayOfWeek,
			events,
			onDayClick: (date: Date) => this.openNewEventModal(toDateString(date)),
			onEventClick: (event: TinyCalEvent) => this.openEventNote(event),
			onEventContextMenu: (event: TinyCalEvent, mouseEvent: MouseEvent) =>
				this.showEventContextMenu(event, mouseEvent),
			tagColors: this.settings.tagColors,
		};

		if (this.viewMode === "month") {
			this.headerLabelEl.setText(formatMonthYear(this.focusedDate));
			renderMonthGrid(this.gridEl, sharedOptions);
		} else {
			this.headerLabelEl.setText(formatWeekRange(gridDates));
			renderWeekGrid(this.gridEl, sharedOptions);
		}
	}
}
