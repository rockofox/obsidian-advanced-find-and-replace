import { App, Notice, TFile, MarkdownView } from "obsidian";
import { StateManager } from "../state";
import { FileManager } from "../core/fileManager";
import { RegexProcessor } from "../core/regexProcessor";
import { MatchResult } from "../core/regexProcessor";

export interface FindReplaceActions {
	onClose?: () => void;
}

export class FindReplaceComponent {
	private containerEl: HTMLElement;
	private app: App;
	private stateManager: StateManager;
	private fileManager: FileManager;
	private regexProcessor: RegexProcessor;
	private actions: FindReplaceActions;
	private debounceTimer: NodeJS.Timeout | null = null;
	private replacementSection: HTMLElement | null = null;
	private isReplacementCollapsed = true;

	constructor(
		containerEl: HTMLElement,
		app: App,
		actions: FindReplaceActions = {},
	) {
		this.containerEl = containerEl;
		this.app = app;
		this.actions = actions;
		this.stateManager = new StateManager();
		this.fileManager = new FileManager(app);
		this.regexProcessor = new RegexProcessor();
	}

	onLoad() {
		this.containerEl.empty();
		this.containerEl.addClass("advanced-find-replace");

		this.createInputSection(this.containerEl);
		this.createPreviewSection(this.containerEl);
		this.createActionButtons(this.containerEl);

		this.stateManager.subscribe(() => {
			this.updatePreview();
			this.updateButtonStates();
		});

		this.loadFileContents();

		
		const applyButton = this.containerEl.querySelector(
			"#apply-button",
		) as HTMLButtonElement;
		if (applyButton) {
			applyButton.addClass("hidden");
		}

		
		const toggleBtn = this.containerEl.querySelector(
			".toggle-replace-btn",
		) as HTMLButtonElement;
		if (toggleBtn) {
			toggleBtn.addClass("collapsed");
		}
	}

	onUnload() {
		this.containerEl.empty();
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
	}

	private createInputSection(container: HTMLElement) {
		const inputContainer = container.createDiv("regex-input-section");

		
		const findContainer = inputContainer.createDiv("input-row");
		findContainer.createSpan({ text: "Find:", cls: "input-label" });

		const findInput = findContainer.createEl("input", {
			type: "text",
			placeholder: "e.g., \\bTODO\\b",
			cls: "find-input",
		});
		findInput.value = this.stateManager.getState().regex;
		findInput.addEventListener("input", (e) => {
			const value = (e.target as HTMLInputElement).value;
			this.stateManager.setRegex(value);
			this.debouncedScan();
		});
		findInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				this.handleEnterKey();
			}
		});

		
		const flagsContainer = inputContainer.createDiv("input-row");
		flagsContainer.createSpan({ text: "Flags:", cls: "input-label" });

		const flagsInput = flagsContainer.createEl("input", {
			type: "text",
			placeholder: "gi",
			cls: "flags-input",
		});
		flagsInput.value = this.stateManager.getState().flags;
		flagsInput.addEventListener("input", (e) => {
			const value = (e.target as HTMLInputElement).value;
			this.stateManager.setFlags(value);
			this.debouncedScan();
		});

		
		const toggleReplace = inputContainer.createDiv("toggle-row");
		const toggleBtn = toggleReplace.createEl("div", {
			text: "Replace options",
			cls: "toggle-replace-btn collapsed",
		});
		toggleBtn.onclick = () => this.toggleReplacementSection();

		
		this.replacementSection = inputContainer.createDiv(
			"replacement-section hidden",
		);

		const replaceContainer = this.replacementSection.createDiv("input-row");
		replaceContainer.createSpan({ text: "Replace:", cls: "input-label" });

		const replaceInput = replaceContainer.createEl("input", {
			type: "text",
			placeholder: "e.g., DONE",
			cls: "replace-input",
		});
		replaceInput.value = this.stateManager.getState().replacement;
		replaceInput.addEventListener("input", (e) => {
			const value = (e.target as HTMLInputElement).value;
			this.stateManager.setReplacement(value);
			this.debouncedScan();
		});
		replaceInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				this.handleEnterKey();
			}
		});
		
		const caseAdjustContainer = this.replacementSection.createDiv("case-adjust-container");
		const caseAdjustCheckbox = caseAdjustContainer.createEl("input", {
			type: "checkbox",
			cls: "case-adjust-checkbox",
		});
		caseAdjustCheckbox.checked = this.stateManager.getState().adjustCase;
		caseAdjustCheckbox.addEventListener("change", (e) => {
			const checked = (e.target as HTMLInputElement).checked;
			this.stateManager.setAdjustCase(checked);
			this.debouncedScan();
		});
		
		const caseAdjustLabel = caseAdjustContainer.createEl("label", {
			text: "Match case of original text",
			cls: "case-adjust-label",
		});
		caseAdjustLabel.addEventListener("click", () => {
			caseAdjustCheckbox.checked = !caseAdjustCheckbox.checked;
			this.stateManager.setAdjustCase(caseAdjustCheckbox.checked);
			this.debouncedScan();
		});
	}

	private toggleReplacementSection() {
		if (!this.replacementSection) return;

		this.isReplacementCollapsed = !this.isReplacementCollapsed;
		const toggleBtn = this.containerEl.querySelector(
			".toggle-replace-btn",
		) as HTMLElement;

		if (this.isReplacementCollapsed) {
			this.replacementSection.addClass("hidden");
			if (toggleBtn) {
				toggleBtn.addClass("collapsed");
			}
			const replaceBtn = this.containerEl.querySelector(
				"#apply-button",
			) as HTMLButtonElement;
			if (replaceBtn) {
				replaceBtn.addClass("hidden");
			}
		} else {
			this.replacementSection.removeClass("hidden");
			if (toggleBtn) {
				toggleBtn.removeClass("collapsed");
			}
			const replaceBtn = this.containerEl.querySelector(
				"#apply-button",
			) as HTMLButtonElement;
			if (replaceBtn) {
				replaceBtn.removeClass("hidden");
			}

			// Trigger a scan to update the preview when opening the replacement section
			this.debouncedScan();
		}
	}

	private handleEnterKey() {
		const state = this.stateManager.getState();
		if (!state.regex || !this.regexProcessor.validateRegex(state.regex)) {
			return;
		}

		if (this.isReplacementCollapsed) {
			this.searchOnly();
		} else {
			this.applyChanges();
		}
	}

	private createPreviewSection(container: HTMLElement) {
		const previewContainer = container.createDiv("regex-preview-section");

		const statusEl = previewContainer.createDiv("scan-status");
		statusEl.createSpan({ text: "Enter a regex pattern to see results" });

		const resultsEl = previewContainer.createDiv("scan-results");
		resultsEl.id = "regex-results";
		resultsEl.addClass("hidden");
	}

	private createActionButtons(container: HTMLElement) {
		const buttonContainer = container.createDiv("regex-actions");

		
		const actionContainer = buttonContainer.createDiv("action-buttons");

		const replaceBtn = actionContainer.createEl("button", {
			text: "Replace all",
			cls: "replace-btn mod-cta",
		});
		replaceBtn.id = "apply-button";
		replaceBtn.onclick = () => this.applyChanges();

		
		replaceBtn.addClass("hidden");
	}

	private async loadFileContents() {
		this.stateManager.setScanning(true);
		try {
			const fileContents = await this.fileManager.getAllMarkdownFiles();
			this.stateManager.setFileContents(fileContents);
		} catch (error) {
			this.stateManager.setError("Failed to load vault files");
			new Notice("Error loading vault files");
		} finally {
			this.stateManager.setScanning(false);
		}
	}

	private async refreshFileContents() {
		try {
			const fileContents = await this.fileManager.getAllMarkdownFiles();
			this.stateManager.setFileContents(fileContents);
		} catch (error) {
			this.stateManager.setError("Failed to refresh vault files");
			new Notice("Error refreshing vault files");
		}
	}

	private debouncedScan() {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.performScan();
		}, 300);
	}

	private async performScan() {
		const state = this.stateManager.getState();

		if (!state.regex || !state.fileContents) {
			this.stateManager.setScanResults(null);
			return;
		}

		if (!this.regexProcessor.validateRegex(state.regex)) {
			this.stateManager.setError("Invalid regular expression");
			return;
		}

		this.stateManager.setScanning(true);
		this.stateManager.setError(null);

		try {
			const results = this.regexProcessor.processFiles(
				state.fileContents,
				state.regex,
				state.replacement,
				state.flags,
				state.adjustCase,
			);
			this.stateManager.setScanResults(results);
		} catch (error) {
			this.stateManager.setError("Error scanning files");
		} finally {
			this.stateManager.setScanning(false);
		}
	}

	private updatePreview() {
		const state = this.stateManager.getState();
		const statusEl = this.containerEl.querySelector(".scan-status");
		const resultsEl = this.containerEl.querySelector(
			"#regex-results",
		) as HTMLElement;

		if (!statusEl || !resultsEl) return;

		if (state.isScanning) {
			statusEl.empty();
			statusEl.createSpan({ text: "Searching..." });
			resultsEl.removeClass("visible");
			resultsEl.addClass("hidden");
			return;
		}

		if (state.error) {
			statusEl.empty();
			const errorSpan = statusEl.createSpan({ text: state.error });
			errorSpan.addClass("error");
			resultsEl.removeClass("visible");
			resultsEl.addClass("hidden");
			return;
		}

		if (!state.regex || !state.fileContents) {
			statusEl.empty();
			statusEl.createSpan({ text: "Enter a regex pattern to see results" });
			resultsEl.removeClass("visible");
			resultsEl.addClass("hidden");
			return;
		}

		if (!state.scanResults) {
			statusEl.empty();
			statusEl.createSpan({ text: "Enter a regex pattern to see results" });
			resultsEl.removeClass("visible");
			resultsEl.addClass("hidden");
			return;
		}

		const { matches, totalMatches } = state.scanResults;

		if (totalMatches === 0) {
			statusEl.empty();
			statusEl.createSpan({ text: "No results" });
			resultsEl.removeClass("visible");
			resultsEl.addClass("hidden");
			return;
		}

		statusEl.empty();
		statusEl.createSpan({
			text: `${totalMatches} results in ${state.scanResults.affectedFiles.length} file${state.scanResults.affectedFiles.length !== 1 ? "s" : ""}`
		});

		resultsEl.empty();
		resultsEl.removeClass("hidden");
		resultsEl.addClass("visible");

		const fileGroups = this.groupMatchesByFile(matches);

		for (const [filePath, fileMatches] of fileGroups) {
			const fileEl = resultsEl.createDiv("file-result");

			const fileHeader = fileEl.createDiv("file-header");
			fileHeader.createSpan({ text: filePath, cls: "file-path" });
			fileHeader.createSpan({
				text: `${fileMatches.length} match${fileMatches.length !== 1 ? "es" : ""}`,
				cls: "match-count",
			});

			// Make file header clickable to open the file
			fileHeader.addEventListener("click", () => {
				const fileContent = state.fileContents?.find(f => f.file.path === filePath);
				if (fileContent?.file) {
					this.openFile(fileContent.file, fileMatches[0]?.lineNumber ?? 1);
				}
			});

			for (const match of fileMatches.slice(0, 10)) {
				const matchEl = fileEl.createDiv("match-result");

				const lineInfo = matchEl.createDiv("line-info");
				lineInfo.createSpan({
					text: `:${match.lineNumber}`,
					cls: "line-number",
				});

				const contentEl = matchEl.createDiv("match-content");
				contentEl.createSpan({ text: match.before });
				contentEl.createEl("mark", { text: match.match });
				contentEl.createSpan({ text: match.after });

				// Make match content clickable to open the file at the specific line
				matchEl.addEventListener("click", () => {
					const fileContent = state.fileContents?.find(f => f.file.path === filePath);
					if (fileContent?.file) {
						this.openFile(fileContent.file, match.lineNumber);
					}
				});

				if (!this.isReplacementCollapsed) {
					const replacedEl = matchEl.createDiv("replaced-content");
					replacedEl.createSpan({ text: match.before });
					replacedEl.createEl("mark", { text: match.replacement, cls: "replaced" });
					replacedEl.createSpan({ text: match.after });

					// Add individual replace button with better styling
					const buttonContainer = matchEl.createDiv("replace-button-container");
					const replaceBtn = buttonContainer.createEl("button", {
						text: "Replace this",
						cls: "replace-single-btn mod-cta",
					});
					replaceBtn.onclick = (e) => {
						e.stopPropagation();
						// Add visual feedback that replacement is in progress
						replaceBtn.setText("Replacing...");
						replaceBtn.disabled = true;
						this.replaceSingleMatch(match, replaceBtn);
					};
				}
			}

			if (fileMatches.length > 10) {
				const moreEl = fileEl.createDiv("more-matches");
				moreEl.createSpan({
					text: `+${fileMatches.length - 10} more`,
				});
			}
		}
	}

	private groupMatchesByFile(
		matches: MatchResult[],
	): Map<string, MatchResult[]> {
		const groups = new Map<string, MatchResult[]>();

		for (const match of matches) {
			const path = match.file.path;
			let group = groups.get(path);
			if (!group) {
				group = [];
				groups.set(path, group);
			}
			group.push(match);
		}

		return groups;
	}

	private updateButtonStates() {
		const state = this.stateManager.getState();
		const applyButton = this.containerEl.querySelector(
			"#apply-button",
		) as HTMLButtonElement;

		if (!applyButton) return;

		const hasValidInput =
			state.regex && this.regexProcessor.validateRegex(state.regex);
		const hasMatches =
			state.scanResults && state.scanResults.totalMatches > 0;
		const isScanning = state.isScanning;

		
		if (this.isReplacementCollapsed) {
			applyButton.addClass("hidden");
		} else {
			applyButton.removeClass("hidden");
		}

		
		if (!this.isReplacementCollapsed) {
			applyButton.disabled = !hasValidInput || !hasMatches || isScanning;
		}
	}

	private searchOnly() {
		
		const state = this.stateManager.getState();

		if (state.scanResults && state.scanResults.totalMatches > 0) {
			new Notice(
				`Found ${state.scanResults.totalMatches} matches in ${state.scanResults.affectedFiles.length} files`,
			);
		} else {
			new Notice("No matches found");
		}
	}

	private async openFile(file: TFile, lineNumber: number) {
		// Open the file in a new leaf
		const leaf = this.app.workspace.getLeaf(true);
		await leaf.openFile(file);
		
		// Scroll to the specific line
		const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (editor) {
			const line = Math.max(0, lineNumber - 1); // Convert to 0-based index
			editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
			editor.setCursor({ line, ch: 0 });
		}
	}

	private async applyChanges() {
		const state = this.stateManager.getState();

		if (!state.fileContents || !state.regex) {
			return;
		}

		const modifications = this.regexProcessor.applyReplacements(
			state.fileContents,
			state.regex,
			state.replacement,
			state.flags,
			state.adjustCase,
		);

		if (modifications.length === 0) {
			new Notice("No changes to apply");
			return;
		}

		try {
			await this.fileManager.batchModifyFiles(modifications);
			new Notice(
				`Successfully updated ${modifications.length} file${modifications.length !== 1 ? "s" : ""}`,
			);

			// Refresh file contents to reflect the changes
			await this.refreshFileContents();

			// Rescan to update the preview after changes
			this.performScan();
		} catch (error: unknown) {
			new Notice("Error applying changes");
		}
	}

	private async replaceSingleMatch(match: MatchResult, button?: HTMLButtonElement) {
		const state = this.stateManager.getState();

		if (!state.fileContents || !state.regex) {
			if (button) {
				button.setText("Replace this");
				button.disabled = false;
			}
			return;
		}

		try {
			// Read the current file content directly from disk to ensure we have the latest version
			const currentContent = await this.app.vault.read(match.file);
			const currentLines = currentContent.split("\n");
			const lineIndex = match.lineNumber - 1; // Convert to 0-based index

			if (lineIndex >= currentLines.length) {
				new Notice("Line not found");
				if (button) {
					button.setText("Replace this");
					button.disabled = false;
				}
				return;
			}

			// Get the current line
			const line = currentLines[lineIndex];

			// Verify that the match still exists at the expected position
			if (line.length < match.endIndex ||
				line.substring(match.startIndex, match.endIndex) !== match.match) {
				new Notice("Match not found at expected position - file may have changed");
				if (button) {
					button.setText("Replace this");
					button.disabled = false;
				}
				// Rescan to update the preview
				this.performScan();
				return;
			}

			// Apply case adjustment if needed
			let replacementText = match.replacement;
			if (state.adjustCase && state.replacement) {
				replacementText = this.regexProcessor["adjustCase"](match.match, match.replacement);
			}

			// Replace only this specific match on this line using position information
			const newLine = line.substring(0, match.startIndex) +
						  replacementText +
						  line.substring(match.endIndex);

			currentLines[lineIndex] = newLine;
			const newContent = currentLines.join("\n");

			// Save the modified content
			await this.fileManager.modifyFile(match.file, newContent);

			new Notice("Match replaced successfully");

			// Provide visual feedback on success
			if (button) {
				button.setText("Replaced!");
				button.addClass("replaced-success");
				// Reset button after a delay
				setTimeout(() => {
					if (button.parentNode) { // Check if button still exists in DOM
						button.setText("Replace this");
						button.removeClass("replaced-success");
						button.disabled = false;
					}
				}, 1000);
			}

			// Refresh file contents to reflect the changes
			await this.refreshFileContents();

			// Rescan to update the preview
			this.performScan();
		} catch (error) {
			console.error("Error replacing single match:", error);
			new Notice("Error replacing match");
			// Reset button on error
			if (button) {
				button.setText("Replace this");
				button.disabled = false;
			}
		}
	}
}
