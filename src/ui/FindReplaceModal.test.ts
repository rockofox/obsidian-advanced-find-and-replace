import { describe, it, expect, beforeEach, vi } from "vitest";
import { FindReplaceModal } from "./FindReplaceModal";
import { createMockApp } from "../../tests/helpers/mockObsidian";

describe("FindReplaceModal", () => {
	let modal: FindReplaceModal;
	let mockApp: ReturnType<typeof createMockApp>;

	beforeEach(() => {
		mockApp = createMockApp([]);
		modal = new FindReplaceModal(mockApp);
	});

	describe("constructor", () => {
		it("should create a modal instance", () => {
			expect(modal).toBeInstanceOf(FindReplaceModal);
		});
	});

	describe("onOpen", () => {
		it("should create and initialize FindReplaceComponent", () => {
			// Create a mock contentEl
			const contentEl = document.createElement("div");
			modal.contentEl = contentEl;

			modal.onOpen();

			expect(contentEl.children.length).toBeGreaterThan(0);
			expect(contentEl.classList.contains("advanced-find-replace")).toBe(true);
		});

		it("should set up onClose callback", () => {
			const contentEl = document.createElement("div");
			modal.contentEl = contentEl;
			// Add close method to modal for testing
			(modal as any).close = vi.fn();

			modal.onOpen();

			// The component should be initialized
			expect(modal["component"]).not.toBeNull();
		});
	});

	describe("onClose", () => {
		it("should clean up component when closing", () => {
			const contentEl = document.createElement("div");
			modal.contentEl = contentEl;

			modal.onOpen();
			expect(modal["component"]).not.toBeNull();

			modal.onClose();
			expect(modal["component"]).toBeNull();
		});

		it("should handle closing when component is null", () => {
			modal["component"] = null;
			expect(() => modal.onClose()).not.toThrow();
		});
	});
});

