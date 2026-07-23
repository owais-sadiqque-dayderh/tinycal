import { App, EventRef, TAbstractFile, TFile } from "obsidian";
import { TinyCalEvent } from "../types";
import { eventOverlapsRange, frontmatterToEvent, todayString } from "./eventLogic";

type ChangeListener = () => void;
type RegisterEvent = (eventRef: EventRef) => void;

/** In-memory index of tinyCal events, built from vault frontmatter and kept in sync via
 * metadataCache/vault events. This is the sole read path the calendar view renders from —
 * it never re-scans the vault on every render. */
export class EventIndex {
	private app: App;
	private events: Map<string, TinyCalEvent> = new Map(); // id -> event
	private pathToId: Map<string, string> = new Map(); // notePath -> id
	private listeners: Set<ChangeListener> = new Set();

	constructor(app: App) {
		this.app = app;
	}

	async build(): Promise<void> {
		this.events.clear();
		this.pathToId.clear();
		for (const file of this.app.vault.getMarkdownFiles()) {
			this.indexFile(file, { silent: true });
		}
	}

	/** Wires vault/metadataCache subscriptions through the given register function
	 * (pass `plugin.registerEvent.bind(plugin)` so listeners are cleaned up on unload). */
	registerVaultEvents(register: RegisterEvent): void {
		register(
			this.app.metadataCache.on("changed", (file) => {
				if (file instanceof TFile) this.indexFile(file);
			})
		);

		register(
			this.app.vault.on("delete", (file: TAbstractFile) => {
				this.removeByPath(file.path);
			})
		);

		register(
			this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
				if (!(file instanceof TFile)) return;
				const id = this.pathToId.get(oldPath);
				if (!id) return;
				const event = this.events.get(id);
				if (!event) return;

				this.pathToId.delete(oldPath);
				event.notePath = file.path;
				event.title = file.basename;
				this.pathToId.set(file.path, id);
				this.notifyChange();
			})
		);
	}

	private indexFile(file: TFile, opts: { silent?: boolean } = {}): void {
		const cache = this.app.metadataCache.getFileCache(file);
		const event = frontmatterToEvent(cache?.frontmatter, file.path, file.basename);

		const previousId = this.pathToId.get(file.path);
		if (previousId && previousId !== event?.id) {
			this.events.delete(previousId);
			this.pathToId.delete(file.path);
		}

		if (event) {
			this.events.set(event.id, event);
			this.pathToId.set(file.path, event.id);
		}

		if (!opts.silent) this.notifyChange();
	}

	private removeByPath(path: string): void {
		const id = this.pathToId.get(path);
		if (!id) return;
		this.events.delete(id);
		this.pathToId.delete(path);
		this.notifyChange();
	}

	getEvent(id: string): TinyCalEvent | undefined {
		return this.events.get(id);
	}

	getEventByPath(path: string): TinyCalEvent | undefined {
		const id = this.pathToId.get(path);
		return id ? this.events.get(id) : undefined;
	}

	getAllEvents(): TinyCalEvent[] {
		return Array.from(this.events.values());
	}

	/** Unique, sorted tags currently in use across all indexed events. */
	getAllTags(): string[] {
		const tags = new Set<string>();
		for (const event of this.events.values()) {
			if (event.tag) tags.add(event.tag);
		}
		return Array.from(tags).sort();
	}

	getEventsInRange(rangeStart: string, rangeEnd: string): TinyCalEvent[] {
		const today = todayString();
		return this.getAllEvents().filter((event) =>
			eventOverlapsRange(event, rangeStart, rangeEnd, today)
		);
	}

	/** Returns an unsubscribe function. */
	onChange(listener: ChangeListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notifyChange(): void {
		for (const listener of this.listeners) listener();
	}
}
