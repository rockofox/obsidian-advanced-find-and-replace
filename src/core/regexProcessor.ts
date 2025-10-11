import { TFile } from "obsidian";
import { FileContent } from "./fileManager";

export interface MatchResult {
	file: TFile;
	lineNumber: number;
	match: string;
	replacement: string;
	context: string;
	before: string;
	after: string;
}

export interface ProcessResult {
	matches: MatchResult[];
	affectedFiles: TFile[];
	totalMatches: number;
}

export class RegexProcessor {
	private static readonly CONTEXT_LINES = 2;
	private static readonly SNIPPET_LENGTH = 200;

	processFiles(
		fileContents: FileContent[],
		pattern: string,
		replacement: string,
		flags: string = "g",
	): ProcessResult {
		const matches: MatchResult[] = [];
		const affectedFiles: Set<TFile> = new Set();

		let regex: RegExp;
		try {
			regex = new RegExp(pattern, flags);
		} catch (error) {
			return { matches: [], affectedFiles: [], totalMatches: 0 };
		}

		for (const { file, content } of fileContents) {
			const lines = content.split("\n");

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (regex.test(line)) {
					regex.lastIndex = 0;
					const match = line.match(regex);

					if (match) {
						const replacementLine = line.replace(
							regex,
							replacement,
						);
						const context = this.getContext(lines, i);

						matches.push({
							file,
							lineNumber: i + 1,
							match: line,
							replacement: replacementLine,
							context: context.join("\n"),
							before: line,
							after: replacementLine,
						});

						affectedFiles.add(file);
					}
				}
			}
		}

		return {
			matches,
			affectedFiles: Array.from(affectedFiles),
			totalMatches: matches.length,
		};
	}

	applyReplacements(
		fileContents: FileContent[],
		pattern: string,
		replacement: string,
		flags: string = "g",
	): Array<{ file: TFile; newContent: string }> {
		const results: Array<{ file: TFile; newContent: string }> = [];

		let regex: RegExp;
		try {
			regex = new RegExp(pattern, flags);
		} catch (error) {
			return [];
		}

		for (const { file, content } of fileContents) {
			const newContent = content.replace(regex, replacement);

			if (newContent !== content) {
				results.push({ file, newContent });
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
