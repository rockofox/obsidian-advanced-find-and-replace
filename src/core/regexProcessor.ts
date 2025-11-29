import { TFile } from "obsidian";
import { FileContent, ProgressCallback } from "./fileManager";

export interface MatchResult {
	file: TFile;
	lineNumber: number;
	match: string;
	replacement: string;
	context: string;
	before: string;
	after: string;
	startIndex: number; // Position of the match within the line
	endIndex: number;   // End position of the match within the line
}

export interface ProcessResult {
	matches: MatchResult[];
	affectedFiles: TFile[];
	totalMatches: number;
}

export enum CaseMode {
	None = "none",
	LowerCase = "lower",
	UpperCase = "upper",
	TitleCase = "title",
	SentenceCase = "sentence"
}

export class RegexProcessor {
	private static readonly CONTEXT_LINES = 2;
	private static readonly SNIPPET_LENGTH = 200;
	private static readonly BATCH_SIZE = 25;

	private adjustCase(original: string, replacement: string): string {
		if (!original || !replacement) return replacement;

		// Check if original is all uppercase
		if (original === original.toUpperCase() && original !== original.toLowerCase()) {
			return replacement.toUpperCase();
		}
		
		// Check if original is all lowercase
		if (original === original.toLowerCase() && original !== original.toUpperCase()) {
			return replacement.toLowerCase();
		}
		
		// Check if original is title case (first letter capitalized)
		if (original.charAt(0) === original.charAt(0).toUpperCase() && 
			original.slice(1) === original.slice(1).toLowerCase()) {
			return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
		}
		
		// Default: return as is
		return replacement;
	}

	async processFiles(
		fileContents: FileContent[],
		pattern: string,
		replacement: string,
		flags = "g",
		adjustCase = false,
		onProgress?: ProgressCallback,
	): Promise<ProcessResult> {
		const matches: MatchResult[] = [];
		const affectedFiles: Set<TFile> = new Set();
		let totalMatches = 0;

		let regex: RegExp;
		try {
			regex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
		} catch {
			return { matches: [], affectedFiles: [], totalMatches: 0 };
		}

		const total = fileContents.length;

		for (let batchStart = 0; batchStart < fileContents.length; batchStart += RegexProcessor.BATCH_SIZE) {
			const batch = fileContents.slice(batchStart, batchStart + RegexProcessor.BATCH_SIZE);

			for (const { file, content } of batch) {
				const lines = content.split("\n");
				let fileHasMatch = false;

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					// Reset lastIndex for each line to prevent issues with global regex
					regex.lastIndex = 0;
					let lineMatch: RegExpExecArray | null;
					let lastMatchIndex = -1;

					while ((lineMatch = regex.exec(line)) !== null) {
						// Prevent infinite loops with zero-width matches
						if (lineMatch[0] === "") {
							// If we matched at the same position twice, advance to prevent infinite loop
							if (regex.lastIndex === lastMatchIndex) {
								regex.lastIndex++;
							}
							// Skip empty matches that don't advance the position
							if (regex.lastIndex <= lineMatch.index) {
								regex.lastIndex = lineMatch.index + 1;
								continue;
							}
						}
						
						// Update lastMatchIndex for non-empty matches or successfully handled empty matches
						lastMatchIndex = regex.lastIndex;
						
						const context = this.getContext(lines, i);
						let replacementText = lineMatch[0].replace(new RegExp(pattern, flags), replacement || "");
						
						// Adjust case if needed
						if (adjustCase && replacement) {
							replacementText = this.adjustCase(lineMatch[0], replacementText);
						}

						matches.push({
							file,
							lineNumber: i + 1,
							match: lineMatch[0],
							replacement: replacementText,
							context: context.join("\n"),
							before: line.substring(0, lineMatch.index),
							after: line.substring(lineMatch.index + lineMatch[0].length),
							startIndex: lineMatch.index,
							endIndex: lineMatch.index + lineMatch[0].length,
						});
						totalMatches++;
						fileHasMatch = true;
					}
				}
				if (fileHasMatch) {
					affectedFiles.add(file);
				}
			}

			// Yield control to UI after each batch
			if (batchStart + RegexProcessor.BATCH_SIZE < fileContents.length) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}

			// Report progress
			if (onProgress) {
				onProgress(
					Math.min(batchStart + RegexProcessor.BATCH_SIZE, total),
					total,
					`Scanning files...`,
				);
			}
		}

		return {
			matches,
			affectedFiles: Array.from(affectedFiles),
			totalMatches,
		};
	}

	async applyReplacements(
		fileContents: FileContent[],
		pattern: string,
		replacement: string,
		flags = "g",
		adjustCase = false,
		onProgress?: ProgressCallback,
	): Promise<Array<{ file: TFile; newContent: string }>> {
		const results: Array<{ file: TFile; newContent: string }> = [];

		let regex: RegExp;
		try {
			regex = new RegExp(pattern, flags);
		} catch {
			return [];
		}

		const total = fileContents.length;

		for (let batchStart = 0; batchStart < fileContents.length; batchStart += RegexProcessor.BATCH_SIZE) {
			const batch = fileContents.slice(batchStart, batchStart + RegexProcessor.BATCH_SIZE);

			for (const { file, content } of batch) {
				let newContent: string;
				
				if (adjustCase && replacement) {
					// For case adjustment, we need to process each match individually
					newContent = content.replace(regex, (match) => {
						const replacementText = match.replace(new RegExp(pattern, flags), replacement);
						return this.adjustCase(match, replacementText);
					});
				} else {
					newContent = content.replace(regex, replacement);
				}

				if (newContent !== content) {
					results.push({ file, newContent });
				}
			}

			// Yield control to UI after each batch
			if (batchStart + RegexProcessor.BATCH_SIZE < fileContents.length) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}

			// Report progress
			if (onProgress) {
				onProgress(
					Math.min(batchStart + RegexProcessor.BATCH_SIZE, total),
					total,
					`Computing replacements...`,
				);
			}
		}

		return results;
	}

	private getContext(lines: string[], lineIndex: number): string[] {
		const start = Math.max(0, lineIndex - RegexProcessor.CONTEXT_LINES);
		const end = Math.min(
			lines.length - 1,
			lineIndex + RegexProcessor.CONTEXT_LINES,
		);
		const context = [];

		for (let i = start; i <= end; i++) {
			let line = lines[i];
			if (line.length > RegexProcessor.SNIPPET_LENGTH) {
				line = line.substring(0, RegexProcessor.SNIPPET_LENGTH) + "...";
			}
			context.push(line);
		}

		return context;
	}

	validateRegex(pattern: string): boolean {
		try {
			new RegExp(pattern);
			return true;
		} catch {
			return false;
		}
	}
}
