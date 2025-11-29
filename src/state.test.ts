import { describe, it, expect, beforeEach } from "vitest";
import { StateManager } from "./state";
import { ProcessResult } from "./core/regexProcessor";
import { FileContent } from "./core/fileManager";
import { createMockTFile } from "../tests/helpers/mockObsidian";

describe("StateManager", () => {
	let stateManager: StateManager;

	beforeEach(() => {
		stateManager = new StateManager();
	});

	describe("Initial state", () => {
		it("should have correct default values", () => {
			const state = stateManager.getState();
			expect(state.regex).toBe("");
			expect(state.replacement).toBe("");
			expect(state.flags).toBe("g");
			expect(state.adjustCase).toBe(false);
			expect(state.isScanning).toBe(false);
			expect(state.scanResults).toBeNull();
			expect(state.fileContents).toBeNull();
			expect(state.error).toBeNull();
		});
	});

	describe("State immutability", () => {
		it("getState should return a copy of the state", () => {
			const state1 = stateManager.getState();
			stateManager.setRegex("test");
			const state2 = stateManager.getState();

			expect(state1.regex).toBe("");
			expect(state2.regex).toBe("test");
			expect(state1).not.toBe(state2);
		});
	});

	describe("setRegex", () => {
		it("should update regex and clear error", () => {
			stateManager.setError("Some error");
			stateManager.setRegex("test-pattern");

			const state = stateManager.getState();
			expect(state.regex).toBe("test-pattern");
			expect(state.error).toBeNull();
		});
	});

	describe("setReplacement", () => {
		it("should update replacement", () => {
			stateManager.setReplacement("new-text");

			const state = stateManager.getState();
			expect(state.replacement).toBe("new-text");
		});
	});

	describe("setFlags", () => {
		it("should update flags", () => {
			stateManager.setFlags("gi");

			const state = stateManager.getState();
			expect(state.flags).toBe("gi");
		});
	});

	describe("setAdjustCase", () => {
		it("should update adjustCase to true", () => {
			stateManager.setAdjustCase(true);

			const state = stateManager.getState();
			expect(state.adjustCase).toBe(true);
		});

		it("should update adjustCase to false", () => {
			stateManager.setAdjustCase(true);
			stateManager.setAdjustCase(false);

			const state = stateManager.getState();
			expect(state.adjustCase).toBe(false);
		});
	});

	describe("setScanning", () => {
		it("should update isScanning to true", () => {
			stateManager.setScanning(true);

			const state = stateManager.getState();
			expect(state.isScanning).toBe(true);
		});

		it("should update isScanning to false", () => {
			stateManager.setScanning(true);
			stateManager.setScanning(false);

			const state = stateManager.getState();
			expect(state.isScanning).toBe(false);
		});
	});

	describe("setScanResults", () => {
		it("should update scanResults", () => {
			const results: ProcessResult = {
				matches: [],
				affectedFiles: [],
				totalMatches: 0,
			};

			stateManager.setScanResults(results);

			const state = stateManager.getState();
			expect(state.scanResults).toBe(results);
		});

		it("should set scanResults to null", () => {
			const results: ProcessResult = {
				matches: [],
				affectedFiles: [],
				totalMatches: 0,
			};

			stateManager.setScanResults(results);
			stateManager.setScanResults(null);

			const state = stateManager.getState();
			expect(state.scanResults).toBeNull();
		});
	});

	describe("setFileContents", () => {
		it("should update fileContents", () => {
			const fileContents: FileContent[] = [
				{ file: createMockTFile("test.md"), content: "test content" },
			];

			stateManager.setFileContents(fileContents);

			const state = stateManager.getState();
			expect(state.fileContents).toBe(fileContents);
		});

		it("should set fileContents to null", () => {
			const fileContents: FileContent[] = [
				{ file: createMockTFile("test.md"), content: "test content" },
			];

			stateManager.setFileContents(fileContents);
			stateManager.setFileContents(null);

			const state = stateManager.getState();
			expect(state.fileContents).toBeNull();
		});
	});

	describe("setError", () => {
		it("should update error", () => {
			stateManager.setError("Test error");

			const state = stateManager.getState();
			expect(state.error).toBe("Test error");
		});

		it("should set error to null", () => {
			stateManager.setError("Test error");
			stateManager.setError(null);

			const state = stateManager.getState();
			expect(state.error).toBeNull();
		});
	});

	describe("subscribe", () => {
		it("should notify listeners when state changes", () => {
			let notifiedState = null;
			stateManager.subscribe((state) => {
				notifiedState = state;
			});

			stateManager.setRegex("test");

			expect(notifiedState).not.toBeNull();
			expect(notifiedState?.regex).toBe("test");
		});

		it("should notify multiple listeners", () => {
			let count1 = 0;
			let count2 = 0;

			stateManager.subscribe(() => {
				count1++;
			});
			stateManager.subscribe(() => {
				count2++;
			});

			stateManager.setRegex("test");

			expect(count1).toBe(1);
			expect(count2).toBe(1);
		});

		it("should allow unsubscribing", () => {
			let notificationCount = 0;

			const unsubscribe = stateManager.subscribe(() => {
				notificationCount++;
			});

			stateManager.setRegex("test1");
			expect(notificationCount).toBe(1);

			unsubscribe();
			stateManager.setRegex("test2");
			expect(notificationCount).toBe(1); // Should not increment
		});

		it("should pass current state to listener", () => {
			stateManager.setRegex("initial");

			let receivedState = null;
			stateManager.subscribe((state) => {
				receivedState = state;
			});

			stateManager.setReplacement("new");

			expect(receivedState?.regex).toBe("initial");
			expect(receivedState?.replacement).toBe("new");
		});
	});

	describe("reset", () => {
		it("should reset all state to defaults", () => {
			stateManager.setRegex("test");
			stateManager.setReplacement("replace");
			stateManager.setFlags("gi");
			stateManager.setAdjustCase(true);
			stateManager.setScanning(true);
			stateManager.setError("error");
			stateManager.setScanResults({
				matches: [],
				affectedFiles: [],
				totalMatches: 0,
			});

			stateManager.reset();

			const state = stateManager.getState();
			expect(state.regex).toBe("");
			expect(state.replacement).toBe("");
			expect(state.flags).toBe("g");
			expect(state.adjustCase).toBe(false);
			expect(state.isScanning).toBe(false);
			expect(state.scanResults).toBeNull();
			expect(state.fileContents).toBeNull();
			expect(state.error).toBeNull();
		});

		it("should notify listeners on reset", () => {
			let notifiedState = null;
			stateManager.subscribe((state) => {
				notifiedState = state;
			});

			stateManager.setRegex("test");
			stateManager.reset();

			expect(notifiedState).not.toBeNull();
			expect(notifiedState?.regex).toBe("");
		});
	});
});

