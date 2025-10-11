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
		flags = "g",
	): ProcessResult {
		const matches: MatchResult[] = [];
		const affectedFiles: Set<TFile> = new Set();
		let totalMatches = 0;

		let regex: RegExp;
		try {
			regex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
		} catch (error) {
			return { matches: [], affectedFiles: [], totalMatches: 0 };
		}

		for (const { file, content } of fileContents) {
			const lines = content.split("\n");
			let fileHasMatch = false;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				let lineMatch: RegExpExecArray | null;

				while ((lineMatch = regex.exec(line)) !== null) {
					if (lineMatch[0] === "" && regex.lastIndex > lineMatch.index) {
						continue;
					}
					
					const context = this.getContext(lines, i);
					const replacementText = replacement ? lineMatch[0].replace(new RegExp(pattern, flags), replacement) : lineMatch[0];

					matches.push({
						file,
						lineNumber: i + 1,
						match: lineMatch[0],
						replacement: replacementText,
						context: context.join("\n"),
						before: line.substring(0, lineMatch.index),
						after: line.substring(lineMatch.index + lineMatch[0].length),
					});
					totalMatches++;
					fileHasMatch = true;
				}
			}
			if (fileHasMatch) {
				affectedFiles.add(file);
			}
		}

		return {
			matches,
			affectedFiles: Array.from(affectedFiles),
			totalMatches,
		};
	}

	applyReplacements(
		fileContents: FileContent[],
		pattern: string,
		replacement: string,
		flags = "g",
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
