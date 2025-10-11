import { App, TFile } from "obsidian";

export interface FileContent {
	file: TFile;
	content: string;
}

export class FileManager {
	constructor(private app: App) {}

	async getAllMarkdownFiles(): Promise<FileContent[]> {
		const files = this.app.vault.getMarkdownFiles();
		const fileContents: FileContent[] = [];

		for (const file of files) {
			const content = await this.app.vault.read(file);
			fileContents.push({ file, content });
		}

		return fileContents;
	}

	async modifyFile(file: TFile, newContent: string): Promise<void> {
		await this.app.vault.modify(file, newContent);
	}

	async batchModifyFiles(
		modifications: Array<{ file: TFile; newContent: string }>,
	): Promise<void> {
		for (const { file, newContent } of modifications) {
			await this.modifyFile(file, newContent);
		}
	}
}
