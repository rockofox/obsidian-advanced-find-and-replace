import { App, TFile } from "obsidian";

export interface FileContent {
	file: TFile;
	content: string;
}

export type ProgressCallback = (
	current: number,
	total: number,
	message?: string,
) => void;

export class FileManager {
	private static readonly BATCH_SIZE = 25;

	constructor(private app: App) {}

	async getAllMarkdownFiles(
		onProgress?: ProgressCallback,
	): Promise<FileContent[]> {
		const files = this.app.vault.getMarkdownFiles();
		const fileContents: FileContent[] = [];
		const total = files.length;

		for (let i = 0; i < files.length; i += FileManager.BATCH_SIZE) {
			const batch = files.slice(i, i + FileManager.BATCH_SIZE);

			for (const file of batch) {
				const content = await this.app.vault.read(file);
				fileContents.push({ file, content });
			}

			// Yield control to UI after each batch
			if (i + FileManager.BATCH_SIZE < files.length) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}

			// Report progress
			if (onProgress) {
				onProgress(
					Math.min(i + FileManager.BATCH_SIZE, total),
					total,
					`Loading files...`,
				);
			}
		}

		return fileContents;
	}

	async modifyFile(file: TFile, newContent: string): Promise<void> {
		await this.app.vault.modify(file, newContent);
	}

	async batchModifyFiles(
		modifications: Array<{ file: TFile; newContent: string }>,
		onProgress?: ProgressCallback,
	): Promise<void> {
		const total = modifications.length;

		for (let i = 0; i < modifications.length; i += FileManager.BATCH_SIZE) {
			const batch = modifications.slice(i, i + FileManager.BATCH_SIZE);

			for (const { file, newContent } of batch) {
				await this.modifyFile(file, newContent);
			}

			// Yield control to UI after each batch
			if (i + FileManager.BATCH_SIZE < modifications.length) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}

			// Report progress
			if (onProgress) {
				onProgress(
					Math.min(i + FileManager.BATCH_SIZE, total),
					total,
					`Writing files...`,
				);
			}
		}
	}
}
