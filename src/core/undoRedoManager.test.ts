import { describe, it, expect, beforeEach } from "vitest";
import { UndoRedoManager, HistoryEntry } from "./undoRedoManager";
import { createMockTFile } from "../../tests/helpers/mockObsidian";

function makeEntry(description: string): HistoryEntry {
	const file = createMockTFile("test.md");
	return {
		description,
		snapshots: [{ file, before: "before", after: "after" }],
		timestamp: Date.now(),
	};
}

describe("UndoRedoManager", () => {
	let manager: UndoRedoManager;

	beforeEach(() => {
		manager = new UndoRedoManager();
	});

	describe("basic round-trip", () => {
		it("should return the pushed entry on undo, then on redo", () => {
			const entry = makeEntry("replace all");
			manager.push(entry);

			const undone = manager.undo();
			expect(undone).toBe(entry);

			const redone = manager.redo();
			expect(redone).toBe(entry);
		});
	});

	describe("canUndo / canRedo at boundaries", () => {
		it("should have both false on an empty stack", () => {
			expect(manager.canUndo()).toBe(false);
			expect(manager.canRedo()).toBe(false);
		});

		it("should have canUndo true and canRedo false after a push", () => {
			manager.push(makeEntry("A"));
			expect(manager.canUndo()).toBe(true);
			expect(manager.canRedo()).toBe(false);
		});

		it("should have canUndo false and canRedo true after undoing the only entry", () => {
			manager.push(makeEntry("A"));
			manager.undo();
			expect(manager.canUndo()).toBe(false);
			expect(manager.canRedo()).toBe(true);
		});
	});

	describe("max stack size", () => {
		it("should drop the oldest entry when the stack exceeds maxSize", () => {
			const smallManager = new UndoRedoManager(10);
			const firstEntry = makeEntry("entry-0");
			smallManager.push(firstEntry);

			for (let i = 1; i <= 10; i++) {
				smallManager.push(makeEntry(`entry-${i}`));
			}

			// Undo all the way back — should reach 10 entries, not 11
			const collected: (HistoryEntry | null)[] = [];
			while (smallManager.canUndo()) {
				collected.push(smallManager.undo());
			}

			expect(collected.length).toBe(10);
			// The first entry pushed (entry-0) should have been dropped
			expect(collected.every(e => e?.description !== "entry-0")).toBe(true);
			// Surviving entries should be exactly entry-10 down to entry-1 (newest first)
			const expectedOrder = Array.from({ length: 10 }, (_, i) => `entry-${10 - i}`);
			expect(collected.map(e => e?.description)).toEqual(expectedOrder);
		});
	});

	describe("multi-undo boundary", () => {
		it("should return entries in reverse push order and null when exhausted", () => {
			const entryA = makeEntry("A");
			const entryB = makeEntry("B");
			const entryC = makeEntry("C");

			manager.push(entryA);
			manager.push(entryB);
			manager.push(entryC);

			expect(manager.undo()).toBe(entryC);
			expect(manager.undo()).toBe(entryB);
			expect(manager.undo()).toBe(entryA);

			// Fourth undo should return null and canUndo should be false
			expect(manager.undo()).toBeNull();
			expect(manager.canUndo()).toBe(false);
		});
	});

	describe("redo branch truncation", () => {
		it("should clear the redo branch when a new entry is pushed after undo", () => {
			const entryA = makeEntry("A");
			const entryB = makeEntry("B");
			const entryC = makeEntry("C");

			manager.push(entryA);
			manager.push(entryB);
			manager.undo(); // back to A
			manager.push(entryC); // B is gone, C is the new tip

			expect(manager.canRedo()).toBe(false);
			expect(manager.redo()).toBeNull();

			// Undo should give C, then A
			expect(manager.undo()).toBe(entryC);
			expect(manager.undo()).toBe(entryA);
		});
	});

	describe("clear()", () => {
		it("should reset canUndo and canRedo to false", () => {
			manager.push(makeEntry("A"));
			manager.push(makeEntry("B"));
			manager.clear();

			expect(manager.canUndo()).toBe(false);
			expect(manager.canRedo()).toBe(false);
		});

		it("should return null for undo and redo after clear", () => {
			manager.push(makeEntry("A"));
			manager.clear();

			expect(manager.undo()).toBeNull();
			expect(manager.redo()).toBeNull();
		});
	});
});
