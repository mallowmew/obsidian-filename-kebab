import { App, Plugin, PluginSettingTab, Setting, TAbstractFile } from 'obsidian';
import { kebabCase } from 'lodash';
import * as path from 'path';

interface FilenameKebabSettings {
	changeFolderNames: boolean,
	changeOtherFileNames: boolean,
	excludeByPrefix: boolean,
	exclusionPrefix: string,
}

const DEFAULT_SETTINGS: FilenameKebabSettings = {
	changeFolderNames: true,
	changeOtherFileNames: false,
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

		// breaks image embeds
		// this.registerEvent(
		// 	this.app.vault.on('create', async (file) => {
		// 		await this.updateFileName(file);
		// 	})
		// );
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	
	async saveSettings() {
		await this.saveData(this.settings);
	}

	async updateFileName( file: TAbstractFile) {
		if (this.isExcluded(file)) return;

		const folder = path.parse(file.path).dir;
		const fileName = path.parse(file.path).name;
		const ext = path.parse(file.path).ext;

		const newFileName = path.join(folder, `${kebabCase(fileName)}${ext}`);

		if (file.name !== newFileName) {
			await this.reTryCatch(async (tries: number) => {
				let newNewFileName = newFileName;
				if (tries > 0) {
					newNewFileName = `${kebabCase(fileName)}-${tries}${ext}`;
				}
				await this.app.vault.rename(file, newNewFileName)
			});
		}
	}

	async reTryCatch(callback: (tries: number) => Promise<void>, makeAttempts = 99, tries = 0): Promise<void> {
		try {
			return await callback(tries)
		} catch (e) {
			if (makeAttempts > 0) {
				return await this.reTryCatch(callback, makeAttempts - 1, tries + 1)
			} else {
				throw e
			}
		}
	}

	isExcluded(file: TAbstractFile): boolean {
		if (file.path.startsWith('.')) {
			// The plugin will not try to rename Unix-style hidden files.
			return true;
		}
		
		if (this.settings.excludeByPrefix && file.path.startsWith(this.settings.exclusionPrefix)) {
			return true;
		}

		const ext:string = path.parse(file.name).ext;
		if (!this.settings.changeFolderNames && ext == '') {
			return true;
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
			.setName('Change Folder Names')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.changeFolderNames)
				.onChange(async (value) => {
					this.plugin.settings.changeFolderNames = value;
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
