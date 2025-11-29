import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { FindReplaceComponent } from "./FindReplaceComponent";
import {
	createMockApp,
	createMockTFile,
	createTestFileContent,
} from "../../tests/helpers/mockObsidian";
import { StateManager } from "../state";
import { FileManager } from "../core/fileManager";
import { RegexProcessor } from "../core/regexProcessor";
import { MatchResult, ProcessResult } from "../core/regexProcessor";
import { App, Notice, MarkdownView, WorkspaceLeaf } from "obsidian";

// Obsidian is mocked globally in tests/setup.ts

describe("FindReplaceComponent", () => {
	let component: FindReplaceComponent;
	let containerEl: HTMLElement;
	let mockApp: ReturnType<typeof createMockApp>;
	let mockStateManager: StateManager;
	let mockFileManager: FileManager;
	let mockRegexProcessor: RegexProcessor;

	beforeEach(() => {
		// Setup DOM
		containerEl = document.createElement("div");
		document.body.appendChild(containerEl);

		// Setup mocks
		const testFiles = [
			createTestFileContent("file1.md", "Hello world\nThis is a test\nAnother line"),
			createTestFileContent("file2.md", "Test content\nMore text here"),
		];
		mockApp = createMockApp(testFiles);

		// Create component
		component = new FindReplaceComponent(containerEl, mockApp, {});
		mockStateManager = component["stateManager"];
		mockFileManager = component["fileManager"];
		mockRegexProcessor = component["regexProcessor"];

		// Mock Notice
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (component) {
			component.onUnload();
		}
		if (containerEl && containerEl.parentNode) {
			containerEl.parentNode.removeChild(containerEl);
		}
		vi.clearAllTimers();
	});

	describe("constructor", () => {
		it("should initialize with container and app", () => {
			expect(component["containerEl"]).toBe(containerEl);
			expect(component["app"]).toBe(mockApp);
		});

		it("should create StateManager, FileManager, and RegexProcessor", () => {
			expect(component["stateManager"]).toBeInstanceOf(StateManager);
			expect(component["fileManager"]).toBeInstanceOf(FileManager);
			expect(component["regexProcessor"]).toBeInstanceOf(RegexProcessor);
		});

		it("should initialize with actions", () => {
			const onClose = vi.fn();
			const componentWithActions = new FindReplaceComponent(
				containerEl,
				mockApp,
				{ onClose },
			);
			expect(componentWithActions["actions"].onClose).toBe(onClose);
		});
	});

	describe("onLoad", () => {
		it("should empty container and add class", () => {
			containerEl.innerHTML = "<div>existing content</div>";
			component.onLoad();

			expect(containerEl.classList.contains("advanced-find-replace")).toBe(true);
		});

		it("should create input section", () => {
			component.onLoad();

			const findInput = containerEl.querySelector(".find-input") as HTMLInputElement;
			expect(findInput).not.toBeNull();
			expect(findInput.type).toBe("text");
		});

		it("should create preview section", () => {
			component.onLoad();

			const previewSection = containerEl.querySelector(".regex-preview-section");
			expect(previewSection).not.toBeNull();
		});

		it("should create action buttons", () => {
			component.onLoad();

			const applyButton = containerEl.querySelector("#apply-button") as HTMLButtonElement;
			expect(applyButton).not.toBeNull();
			expect(applyButton.classList.contains("hidden")).toBe(true);
		});

		it("should subscribe to state changes", () => {
			const subscribeSpy = vi.spyOn(mockStateManager, "subscribe");
			component.onLoad();

			expect(subscribeSpy).toHaveBeenCalled();
		});

		it("should load file contents", async () => {
			const getAllMarkdownFilesSpy = vi.spyOn(mockFileManager, "getAllMarkdownFiles");
			component.onLoad();

			// Wait for async operations
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(getAllMarkdownFilesSpy).toHaveBeenCalled();
		});
	});

	describe("onUnload", () => {
		it("should empty container", () => {
			component.onLoad();
			component.onUnload();

			expect(containerEl.innerHTML).toBe("");
		});

		it("should clear debounce timer", () => {
			component.onLoad();
			component["debounceTimer"] = setTimeout(() => {}, 1000) as NodeJS.Timeout;
			const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

			component.onUnload();

			expect(clearTimeoutSpy).toHaveBeenCalled();
		});
	});

	describe("input handling", () => {
		beforeEach(() => {
			component.onLoad();
		});

		it("should update regex on find input change", () => {
			const findInput = containerEl.querySelector(".find-input") as HTMLInputElement;
			const setRegexSpy = vi.spyOn(mockStateManager, "setRegex");

			findInput.value = "test";
			findInput.dispatchEvent(new Event("input"));

			expect(setRegexSpy).toHaveBeenCalledWith("test");
		});

		it("should update flags on flags input change", () => {
			const flagsInput = containerEl.querySelector(".flags-input") as HTMLInputElement;
			const setFlagsSpy = vi.spyOn(mockStateManager, "setFlags");

			flagsInput.value = "gi";
			flagsInput.dispatchEvent(new Event("input"));

			expect(setFlagsSpy).toHaveBeenCalledWith("gi");
		});

		it("should update replacement on replace input change", () => {
			// First toggle replacement section
			const toggleBtn = containerEl.querySelector(".toggle-replace-btn") as HTMLElement;
			toggleBtn.click();

			const replaceInput = containerEl.querySelector(".replace-input") as HTMLInputElement;
			const setReplacementSpy = vi.spyOn(mockStateManager, "setReplacement");

			replaceInput.value = "replacement";
			replaceInput.dispatchEvent(new Event("input"));

			expect(setReplacementSpy).toHaveBeenCalledWith("replacement");
		});

		it("should update adjustCase on checkbox change", () => {
			const toggleBtn = containerEl.querySelector(".toggle-replace-btn") as HTMLElement;
			toggleBtn.click();

			const caseCheckbox = containerEl.querySelector(
				".case-adjust-checkbox",
			) as HTMLInputElement;
			const setAdjustCaseSpy = vi.spyOn(mockStateManager, "setAdjustCase");

			caseCheckbox.checked = true;
			caseCheckbox.dispatchEvent(new Event("change"));

			expect(setAdjustCaseSpy).toHaveBeenCalledWith(true);
		});

		it("should debounce scan on input", async () => {
			vi.useFakeTimers();
			const performScanSpy = vi.spyOn(component as any, "performScan");

			const findInput = containerEl.querySelector(".find-input") as HTMLInputElement;
			findInput.value = "test";
			findInput.dispatchEvent(new Event("input"));

			expect(performScanSpy).not.toHaveBeenCalled();

			vi.advanceTimersByTime(300);
			await Promise.resolve();

			expect(performScanSpy).toHaveBeenCalled();
			vi.useRealTimers();
		});
	});

	describe("toggleReplacementSection", () => {
		beforeEach(() => {
			component.onLoad();
		});

		it("should show replacement section when toggled", () => {
			const toggleBtn = containerEl.querySelector(".toggle-replace-btn") as HTMLElement;
			const replacementSection = containerEl.querySelector(
				".replacement-section",
			) as HTMLElement;

			expect(replacementSection.classList.contains("hidden")).toBe(true);

			toggleBtn.click();

			expect(replacementSection.classList.contains("hidden")).toBe(false);
			expect(component["isReplacementCollapsed"]).toBe(false);
		});

		it("should hide replacement section when toggled again", () => {
			const toggleBtn = containerEl.querySelector(".toggle-replace-btn") as HTMLElement;
			const replacementSection = containerEl.querySelector(
				".replacement-section",
			) as HTMLElement;

			toggleBtn.click();
			expect(replacementSection.classList.contains("hidden")).toBe(false);

			toggleBtn.click();
			expect(replacementSection.classList.contains("hidden")).toBe(true);
			expect(component["isReplacementCollapsed"]).toBe(true);
		});

		it("should show apply button when replacement section is open", () => {
			const toggleBtn = containerEl.querySelector(".toggle-replace-btn") as HTMLElement;
			const applyButton = containerEl.querySelector("#apply-button") as HTMLButtonElement;

			toggleBtn.click();

			expect(applyButton.classList.contains("hidden")).toBe(false);
		});

		it("should hide apply button when replacement section is closed", () => {
			const toggleBtn = containerEl.querySelector(".toggle-replace-btn") as HTMLElement;
			const applyButton = containerEl.querySelector("#apply-button") as HTMLButtonElement;

			toggleBtn.click();
			expect(applyButton.classList.contains("hidden")).toBe(false);

			toggleBtn.click();
			expect(applyButton.classList.contains("hidden")).toBe(true);
		});
	});

	describe("handleEnterKey", () => {
		beforeEach(() => {
			component.onLoad();
		});

		it("should do nothing with invalid regex", () => {
			mockStateManager.setRegex("[invalid");
			const searchOnlySpy = vi.spyOn(component as any, "searchOnly");
			const applyChangesSpy = vi.spyOn(component as any, "applyChanges");

			component["handleEnterKey"]();

			expect(searchOnlySpy).not.toHaveBeenCalled();
			expect(applyChangesSpy).not.toHaveBeenCalled();
		});

		it("should call searchOnly when replacement is collapsed", () => {
			mockStateManager.setRegex("test");
			const searchOnlySpy = vi.spyOn(component as any, "searchOnly");

			component["handleEnterKey"]();

			expect(searchOnlySpy).toHaveBeenCalled();
		});

		it("should call applyChanges when replacement is open", async () => {
			mockStateManager.setRegex("test");
			const toggleBtn = containerEl.querySelector(".toggle-replace-btn") as HTMLElement;
			toggleBtn.click();

			const applyChangesSpy = vi.spyOn(component as any, "applyChanges").mockResolvedValue(
				undefined,
			);

			component["handleEnterKey"]();

			expect(applyChangesSpy).toHaveBeenCalled();
		});
	});

	describe("updatePreview", () => {
		beforeEach(() => {
			component.onLoad();
		});

		it("should show scanning message when scanning", () => {
			mockStateManager.setScanning(true);
			component["updatePreview"]();

			const statusEl = containerEl.querySelector(".scan-status");
			expect(statusEl?.textContent).toContain("Searching...");
		});

		it("should show error message when error exists", () => {
			mockStateManager.setError("Test error");
			component["updatePreview"]();

			const statusEl = containerEl.querySelector(".scan-status");
			expect(statusEl?.textContent).toContain("Test error");
		});

		it("should show default message when no regex", () => {
			mockStateManager.setRegex("");
			component["updatePreview"]();

			const statusEl = containerEl.querySelector(".scan-status");
			expect(statusEl?.textContent).toContain("Enter a regex pattern");
		});

		it("should show no results message when no matches", () => {
			mockStateManager.setRegex("test");
			mockStateManager.setFileContents([
				createTestFileContent("file.md", "no match here"),
			]);
			mockStateManager.setScanResults({
				matches: [],
				affectedFiles: [],
				totalMatches: 0,
			});
			component["updatePreview"]();

			const statusEl = containerEl.querySelector(".scan-status");
			expect(statusEl?.textContent).toContain("No results");
		});

		it("should display matches when results exist", () => {
			const testFile = createMockTFile("test.md");
			const matches: MatchResult[] = [
				{
					file: testFile,
					lineNumber: 1,
					match: "test",
					replacement: "replaced",
					context: "This is a test",
					before: "This is a ",
					after: "",
					startIndex: 10,
					endIndex: 14,
				},
			];
			const results: ProcessResult = {
				matches,
				affectedFiles: [testFile],
				totalMatches: 1,
			};

			mockStateManager.setRegex("test");
			mockStateManager.setFileContents([
				{ file: testFile, content: "This is a test" },
			]);
			mockStateManager.setScanResults(results);
			component["updatePreview"]();

			const resultsEl = containerEl.querySelector("#regex-results");
			expect(resultsEl?.classList.contains("visible")).toBe(true);
			expect(resultsEl?.textContent).toContain("test.md");
		});
	});

	describe("updateButtonStates", () => {
		beforeEach(() => {
			component.onLoad();
		});

		it("should disable button when scanning", () => {
			const toggleBtn = containerEl.querySelector(".toggle-replace-btn") as HTMLElement;
			toggleBtn.click();

			mockStateManager.setScanning(true);
			mockStateManager.setRegex("test");
			mockStateManager.setScanResults({
				matches: [],
				affectedFiles: [],
				totalMatches: 1,
			});
			component["updateButtonStates"]();

			const applyButton = containerEl.querySelector("#apply-button") as HTMLButtonElement;
			expect(applyButton.disabled).toBe(true);
		});

		it("should disable button when no matches", () => {
			const toggleBtn = containerEl.querySelector(".toggle-replace-btn") as HTMLElement;
			toggleBtn.click();

			mockStateManager.setRegex("test");
			mockStateManager.setScanResults({
				matches: [],
				affectedFiles: [],
				totalMatches: 0,
			});
			component["updateButtonStates"]();

			const applyButton = containerEl.querySelector("#apply-button") as HTMLButtonElement;
			expect(applyButton.disabled).toBe(true);
		});

		it("should enable button when valid input and matches exist", () => {
			const toggleBtn = containerEl.querySelector(".toggle-replace-btn") as HTMLElement;
			toggleBtn.click();

			mockStateManager.setRegex("test");
			mockStateManager.setScanning(false);
			mockStateManager.setScanResults({
				matches: [],
				affectedFiles: [],
				totalMatches: 1,
			});
			component["updateButtonStates"]();

			const applyButton = containerEl.querySelector("#apply-button") as HTMLButtonElement;
			expect(applyButton.disabled).toBe(false);
		});
	});

	describe("performScan", () => {
		beforeEach(() => {
			component.onLoad();
		});

		it("should set scan results to null when no regex", () => {
			mockStateManager.setRegex("");
			component["performScan"]();

			expect(mockStateManager.getState().scanResults).toBeNull();
		});

		it("should set error when regex is invalid", () => {
			mockStateManager.setRegex("[invalid");
			component["performScan"]();

			expect(mockStateManager.getState().error).toBe("Invalid regular expression");
		});

		it("should process files and set results", () => {
			const testFile = createMockTFile("test.md");
			mockStateManager.setRegex("test");
			mockStateManager.setFileContents([
				{ file: testFile, content: "This is a test" },
			]);

			component["performScan"]();

			const state = mockStateManager.getState();
			expect(state.scanResults).not.toBeNull();
			expect(state.isScanning).toBe(false);
		});

		it("should handle errors during scanning", () => {
			vi.spyOn(mockRegexProcessor, "processFiles").mockImplementation(() => {
				throw new Error("Processing error");
			});

			mockStateManager.setRegex("test");
			mockStateManager.setFileContents([
				{ file: createMockTFile("test.md"), content: "test" },
			]);

			component["performScan"]();

			expect(mockStateManager.getState().error).toBe("Error scanning files");
		});
	});

	describe("applyChanges", () => {
		beforeEach(() => {
			component.onLoad();
		});

		it("should do nothing when no file contents", async () => {
			mockStateManager.setFileContents(null);
			const batchModifySpy = vi.spyOn(mockFileManager, "batchModifyFiles");

			await component["applyChanges"]();

			expect(batchModifySpy).not.toHaveBeenCalled();
		});

		it("should apply changes to files", async () => {
			const testFile = createMockTFile("test.md");
			mockStateManager.setRegex("test");
			mockStateManager.setReplacement("replaced");
			mockStateManager.setFileContents([
				{ file: testFile, content: "This is a test" },
			]);

			const batchModifySpy = vi.spyOn(mockFileManager, "batchModifyFiles").mockResolvedValue(
				undefined,
			);
			const refreshSpy = vi.spyOn(component as any, "refreshFileContents").mockResolvedValue(
				undefined,
			);
			const performScanSpy = vi.spyOn(component as any, "performScan");

			// Mock applyReplacements to return modifications
			vi.spyOn(mockRegexProcessor, "applyReplacements").mockReturnValue([
				{ file: testFile, newContent: "This is a replaced" },
			]);

			await component["applyChanges"]();

			expect(batchModifySpy).toHaveBeenCalled();
			expect(refreshSpy).toHaveBeenCalled();
			expect(performScanSpy).toHaveBeenCalled();
		});

		it("should show notice when no changes to apply", async () => {
			mockStateManager.setRegex("test");
			mockStateManager.setFileContents([
				{ file: createMockTFile("test.md"), content: "no match" },
			]);

			vi.spyOn(mockRegexProcessor, "applyReplacements").mockReturnValue([]);

			await component["applyChanges"]();

			expect(Notice).toHaveBeenCalledWith("No changes to apply");
		});

		it("should handle errors during apply", async () => {
			const testFile = createMockTFile("test.md");
			mockStateManager.setRegex("test");
			mockStateManager.setFileContents([
				{ file: testFile, content: "test" },
			]);

			vi.spyOn(mockRegexProcessor, "applyReplacements").mockReturnValue([
				{ file: testFile, newContent: "replaced" },
			]);
			vi.spyOn(mockFileManager, "batchModifyFiles").mockRejectedValue(
				new Error("File error"),
			);

			await component["applyChanges"]();

			expect(Notice).toHaveBeenCalledWith("Error applying changes");
		});
	});

	describe("searchOnly", () => {
		beforeEach(() => {
			component.onLoad();
		});

		it("should show notice with match count when matches exist", () => {
			mockStateManager.setScanResults({
				matches: [],
				affectedFiles: [createMockTFile("test.md")],
				totalMatches: 5,
			});

			component["searchOnly"]();

			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining("Found 5 matches"),
			);
		});

		it("should show notice when no matches", () => {
			mockStateManager.setScanResults({
				matches: [],
				affectedFiles: [],
				totalMatches: 0,
			});

			component["searchOnly"]();

			expect(Notice).toHaveBeenCalledWith("No matches found");
		});
	});

	describe("groupMatchesByFile", () => {
		it("should group matches by file path", () => {
			const file1 = createMockTFile("file1.md");
			const file2 = createMockTFile("file2.md");

			const matches: MatchResult[] = [
				{
					file: file1,
					lineNumber: 1,
					match: "test1",
					replacement: "",
					context: "",
					before: "",
					after: "",
					startIndex: 0,
					endIndex: 5,
				},
				{
					file: file1,
					lineNumber: 2,
					match: "test2",
					replacement: "",
					context: "",
					before: "",
					after: "",
					startIndex: 0,
					endIndex: 5,
				},
				{
					file: file2,
					lineNumber: 1,
					match: "test3",
					replacement: "",
					context: "",
					before: "",
					after: "",
					startIndex: 0,
					endIndex: 5,
				},
			];

			const groups = component["groupMatchesByFile"](matches);

			expect(groups.size).toBe(2);
			expect(groups.get("file1.md")?.length).toBe(2);
			expect(groups.get("file2.md")?.length).toBe(1);
		});
	});
});

