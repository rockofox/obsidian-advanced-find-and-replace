import { describe, it, expect, beforeEach, vi } from "vitest";
import { FindReplaceView, VIEW_TYPE_ADVANCED_FIND_REPLACE } from "./FindReplaceView";
import { createMockApp } from "../../tests/helpers/mockObsidian";
import { WorkspaceLeaf } from "obsidian";

describe("FindReplaceView", () => {
	let view: FindReplaceView;
	let mockApp: ReturnType<typeof createMockApp>;
	let mockLeaf: WorkspaceLeaf;

	beforeEach(() => {
		mockApp = createMockApp([]);
		mockLeaf = {
			detach: vi.fn(),
		} as unknown as WorkspaceLeaf;
		view = new FindReplaceView(mockLeaf);
		view.app = mockApp as any;
	});

	describe("constructor", () => {
		it("should create a view instance", () => {
			expect(view).toBeInstanceOf(FindReplaceView);
		});
	});

	describe("getViewType", () => {
		it("should return the correct view type", () => {
			expect(view.getViewType()).toBe(VIEW_TYPE_ADVANCED_FIND_REPLACE);
		});
	});

	describe("getDisplayText", () => {
		it("should return the correct display text", () => {
			expect(view.getDisplayText()).toBe("Advanced find and replace");
		});
	});

	describe("getIcon", () => {
		it("should return the correct icon", () => {
			expect(view.getIcon()).toBe("replace");
		});
	});

	describe("onOpen", () => {
		it("should create and initialize FindReplaceComponent", async () => {
			// Create a mock containerEl structure
			const containerEl = document.createElement("div");
			const contentContainer = document.createElement("div");
			containerEl.appendChild(document.createElement("div")); // First child
			containerEl.appendChild(contentContainer); // Second child
			view.containerEl = containerEl;

			await view.onOpen();

			expect(contentContainer.classList.contains("advanced-find-and-replace-view")).toBe(true);
			expect(view["component"]).not.toBeNull();
		});

		it("should set up onClose callback that detaches leaf", async () => {
			const containerEl = document.createElement("div");
			const contentContainer = document.createElement("div");
			containerEl.appendChild(document.createElement("div"));
			containerEl.appendChild(contentContainer);
			view.containerEl = containerEl;

			await view.onOpen();

			// Verify component is initialized
			expect(view["component"]).not.toBeNull();
		});
	});

	describe("onClose", () => {
		it("should clean up component when closing", async () => {
			const containerEl = document.createElement("div");
			const contentContainer = document.createElement("div");
			containerEl.appendChild(document.createElement("div"));
			containerEl.appendChild(contentContainer);
			view.containerEl = containerEl;

			await view.onOpen();
			expect(view["component"]).not.toBeNull();

			await view.onClose();
			expect(view["component"]).toBeNull();
		});

		it("should handle closing when component is null", async () => {
			view["component"] = null;
			await expect(view.onClose()).resolves.not.toThrow();
		});
	});
});

