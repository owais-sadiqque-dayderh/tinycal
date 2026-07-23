import { App, PluginSettingTab, Setting } from "obsidian";
import type TinyCalPlugin from "./main";
import { FolderSuggest } from "./suggest/folderSuggest";
import { TagSuggest } from "./suggest/tagSuggest";
import { FirstDayOfWeek } from "./view/dateUtils";

export interface TinyCalSettings {
	defaultFolder: string;
	firstDayOfWeek: FirstDayOfWeek;
	/** tag -> hex color, e.g. { work: "#4a90d9" }. */
	tagColors: Record<string, string>;
}

export const DEFAULT_SETTINGS: TinyCalSettings = {
	defaultFolder: "",
	firstDayOfWeek: 0,
	tagColors: {},
};

export class TinyCalSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: TinyCalPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Default folder for new events")
			.setDesc('Where "+ New Event" creates notes. Leave empty for the vault root.')
			.addText((text) => {
				text
					.setPlaceholder("e.g. Events")
					.setValue(this.plugin.settings.defaultFolder)
					.onChange(async (value) => {
						this.plugin.settings.defaultFolder = value.trim();
						await this.plugin.saveSettings();
					});
				new FolderSuggest(this.app, text.inputEl, async (path) => {
					this.plugin.settings.defaultFolder = path;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("First day of week")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("0", "Sunday")
					.addOption("1", "Monday")
					.setValue(String(this.plugin.settings.firstDayOfWeek))
					.onChange(async (value) => {
						this.plugin.settings.firstDayOfWeek = (value === "1" ? 1 : 0) as FirstDayOfWeek;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Tag colors")
			.setDesc("Optional per-tag color used for event bars on the calendar.")
			.addButton((btn) =>
				btn.setButtonText("Add tag color").onClick(async () => {
					this.plugin.settings.tagColors[""] = "#4a90d9";
					await this.plugin.saveSettings();
					this.display();
				})
			);

		for (const [tag, color] of Object.entries(this.plugin.settings.tagColors)) {
			this.renderTagColorRow(containerEl, tag, color);
		}
	}

	private renderTagColorRow(containerEl: HTMLElement, tag: string, color: string): void {
		const knownTags = this.plugin.eventIndex.getAllTags();

		new Setting(containerEl)
			.addText((text) => {
				text
					.setPlaceholder("Tag name")
					.setValue(tag)
					.onChange(async (newTag) => {
						const trimmed = newTag.trim();
						const currentColor = this.plugin.settings.tagColors[tag] ?? color;
						delete this.plugin.settings.tagColors[tag];
						if (trimmed) this.plugin.settings.tagColors[trimmed] = currentColor;
						tag = trimmed;
						await this.plugin.saveSettings();
					});
				if (knownTags.length > 0) {
					new TagSuggest(this.app, text.inputEl, knownTags, async (selected) => {
						const currentColor = this.plugin.settings.tagColors[tag] ?? color;
						delete this.plugin.settings.tagColors[tag];
						this.plugin.settings.tagColors[selected] = currentColor;
						tag = selected;
						await this.plugin.saveSettings();
						this.display();
					});
				}
			})
			.addColorPicker((picker) =>
				picker.setValue(color).onChange(async (newColor) => {
					this.plugin.settings.tagColors[tag] = newColor;
					await this.plugin.saveSettings();
				})
			)
			.addExtraButton((btn) =>
				btn
					.setIcon("trash")
					.setTooltip("Remove")
					.onClick(async () => {
						delete this.plugin.settings.tagColors[tag];
						await this.plugin.saveSettings();
						this.display();
					})
			);
	}
}
