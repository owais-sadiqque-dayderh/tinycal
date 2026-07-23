import { App, normalizePath, TFile } from "obsidian";
import { buildEventNoteContent } from "../templates/eventNoteTemplate";
import { FM_END, FM_ID, FM_START, FM_TAG } from "../types";
import { generateEventId } from "./eventLogic";

export interface EventFields {
	start: string;
	end?: string | null;
	tag?: string | null;
}

export interface CreateEventNoteOptions extends EventFields {
	title: string;
	folder?: string;
}

/** Creates and links notes as tinyCal events. All frontmatter writes go through
 * `fileManager.processFrontMatter` per the schema rules in plan.md — never manual YAML editing. */
export class EventStore {
	constructor(private app: App) {}

	async createEventNote(options: CreateEventNoteOptions): Promise<TFile> {
		const folder = options.folder?.trim();
		const fileName = `${options.title}.md`;
		const path = normalizePath(folder ? `${folder}/${fileName}` : fileName);

		if (this.app.vault.getAbstractFileByPath(path)) {
			throw new Error(`A note already exists at "${path}".`);
		}

		if (folder) {
			const normalizedFolder = normalizePath(folder);
			if (!this.app.vault.getAbstractFileByPath(normalizedFolder)) {
				await this.app.vault.createFolder(normalizedFolder);
			}
		}

		const file = await this.app.vault.create(path, buildEventNoteContent(options.title));
		await this.stampFrontmatter(file, options);
		return file;
	}

	async linkNoteAsEvent(file: TFile, fields: EventFields): Promise<void> {
		const existingId = this.app.metadataCache.getFileCache(file)?.frontmatter?.[FM_ID];
		if (existingId) {
			throw new Error(`"${file.basename}" is already a tinyCal event.`);
		}
		await this.stampFrontmatter(file, fields);
	}

	async endEvent(file: TFile, endDate: string): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter[FM_END] = endDate;
		});
	}

	private async stampFrontmatter(file: TFile, fields: EventFields): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter[FM_ID] = generateEventId();
			frontmatter[FM_START] = fields.start;
			if (fields.end) frontmatter[FM_END] = fields.end;
			if (fields.tag) frontmatter[FM_TAG] = fields.tag;
		});
	}
}
