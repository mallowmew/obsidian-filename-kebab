import { CachedMetadata, Plugin, TAbstractFile, TFile } from 'obsidian';
import { kebabCase } from 'lodash';
import * as path from 'path';

export default class FilenameKebab extends Plugin {
	async onload() {
		this.registerEvent(
			this.app.metadataCache.on('changed', async (file, data, cache) => {
				await updateFileName({ plugin: this, file, cache });
			})
		);

		this.registerEvent(
			this.app.vault.on('rename', async (file) => {
				await updateNewFileName({ plugin: this, file});
			})
		);
	}
}

const updateFileName = async ({
	plugin,
	file,
	cache,
}: {
	plugin: FilenameKebab;
	file: TFile;
	cache: CachedMetadata;
}) => {
	const [{ heading: title }] = cache?.headings ?? [{ heading: file.basename }];

	const fileName = `${kebabCase(title)}.md`;
	if (file.basename !== fileName) {
		await plugin.app.fileManager.renameFile(file, fileName);
	}
};

const updateNewFileName = async ({
	plugin,
	file,
}: {
	plugin: FilenameKebab;
	file: TAbstractFile;
}) => {
	const fileName = path.parse(file.name).name;
	const ext = path.parse(file.name).ext;

	const newFileName = `${kebabCase(fileName)}${ext}`;
	if (file.name !== fileName) {
		await plugin.app.fileManager.renameFile(file, newFileName);
	}
};
