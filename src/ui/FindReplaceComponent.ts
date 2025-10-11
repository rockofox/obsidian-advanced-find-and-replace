import { App, Notice } from "obsidian";
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

		this.stateManager.subscribe((state) => {
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
			text: "Replace",
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
		}
	}

	private handleEnterKey() {
		const state = this.stateManager.getState();
		if (!state.regex || !this.regexProcessor.validateRegex(state.regex)) {
			return;
		}

		if (this.isReplacementCollapsed || !state.replacement) {
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
		resultsEl.style.display = "none";
	}

	private createActionButtons(container: HTMLElement) {
		const buttonContainer = container.createDiv("regex-actions");

		
		const actionContainer = buttonContainer.createDiv("action-buttons");

		const replaceBtn = actionContainer.createEl("button", {
			text: "Replace",
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
			statusEl.innerHTML = "<span>Searching...</span>";
			resultsEl.style.display = "none";
			return;
		}

		if (state.error) {
			statusEl.innerHTML = `<span class="error">${state.error}</span>`;
			resultsEl.style.display = "none";
			return;
		}

		if (!state.scanResults) {
			statusEl.innerHTML =
				"<span>Enter a regex pattern to see results</span>";
			resultsEl.style.display = "none";
			return;
		}

		const { matches, totalMatches } = state.scanResults;

		if (totalMatches === 0) {
			statusEl.innerHTML = "<span>No results</span>";
			resultsEl.style.display = "none";
			return;
		}

		statusEl.innerHTML = `<span>${totalMatches} results in ${state.scanResults.affectedFiles.length} file${state.scanResults.affectedFiles.length !== 1 ? "s" : ""}</span>`;

		resultsEl.empty();
		resultsEl.style.display = "block";

		const fileGroups = this.groupMatchesByFile(matches);

		for (const [filePath, fileMatches] of fileGroups) {
			const fileEl = resultsEl.createDiv("file-result");

			const fileHeader = fileEl.createDiv("file-header");
			fileHeader.createSpan({ text: filePath, cls: "file-path" });
			fileHeader.createSpan({
				text: `${fileMatches.length} match${fileMatches.length !== 1 ? "es" : ""}`,
				cls: "match-count",
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
		} catch (error: unknown) {
			new Notice("Error applying changes");
		}
	}
}
