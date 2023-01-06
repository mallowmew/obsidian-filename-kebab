import { App, Plugin, PluginSettingTab, Setting, TAbstractFile } from 'obsidian';
import { kebabCase } from 'lodash';
import * as path from 'path';

interface FilenameKebabSettings {
	onlyNotes: boolean,
	excludeByPrefix: boolean,
	exclusionPrefix: string,
}

const DEFAULT_SETTINGS: FilenameKebabSettings = {
	onlyNotes: false,
	excludeByPrefix: true,
	exclusionPrefix: '_',
}

export default class FilenameKebab extends Plugin {
	settings: FilenameKebabSettings;
	
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FilenameKebabSettingsTab(this.app, this));

		this.registerEvent(
			this.app.vault.on('rename', async (file) => {
				await this.updateFileName(file);
			})
		);

		this.registerEvent(
			this.app.vault.on('create', async (file) => {
				await this.updateFileName(file);
			})
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	
	async saveSettings() {
		await this.saveData(this.settings);
	}

	async updateFileName( file: TAbstractFile) {
		if (this.isExcluded(file)) return;

		const dir = path.parse(file.path).dir
		const fileName = path.parse(file.path).name;
		const ext = path.parse(file.path).ext;

		const newFileName = path.join(dir, `${kebabCase(fileName)}${ext}`);
		if (file.name !== fileName) {
			await this.app.fileManager.renameFile(file, newFileName);
		}
	}

	isExcluded(file: TAbstractFile): boolean {
		if (file.path.startsWith('.')) {
			// The plugin will not try to rename UNix-style hidden files.
			return true;
		}
		
		if (this.settings.excludeByPrefix && file.path.startsWith(this.settings.exclusionPrefix)) {
			return true;
		}

		if (this.settings.onlyNotes) {
			const ext = path.parse(file.name).ext;
			return ext !== '.md';
		}

		return false;
	}
}

class FilenameKebabSettingsTab extends PluginSettingTab {
	plugin: FilenameKebab;

	constructor(app: App, plugin: FilenameKebab) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for Filename Kebab plugin.' });

		new Setting(containerEl)
			.setName('Only change notes')
			.setDesc('The plugin will only change the filenames of notes.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.onlyNotes)
				.onChange(async (value) => {
					this.plugin.settings.onlyNotes = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Exclude files with prefix')
			.setDesc("The plugin will not change the filenames of Unix-style hidden files.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.excludeByPrefix)
				.onChange(async (value) => {
					this.plugin.settings.excludeByPrefix = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Prefix:')
			.setDesc('Filenames beginning with this prefix will not be changed.')
			.addText(text => text
				.setValue(this.plugin.settings.exclusionPrefix)
				.onChange(async (value) => {
					this.plugin.settings.exclusionPrefix = value;
					await this.plugin.saveSettings();
				}));
	}
}
