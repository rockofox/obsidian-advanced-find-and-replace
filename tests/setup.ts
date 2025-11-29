import { vi } from "vitest";

// Extend HTMLElement with Obsidian-specific methods
if (typeof HTMLElement !== "undefined") {
	const originalCreateElement = document.createElement.bind(document);
	document.createElement = function (tagName: string, options?: ElementCreationOptions) {
		const element = originalCreateElement(tagName, options);
		
		// Add Obsidian's DOM extensions
		if (element instanceof HTMLElement) {
			(element as any).empty = function() {
				this.innerHTML = "";
				return this;
			};
			
			(element as any).addClass = function(...classes: string[]) {
				classes.forEach(cls => this.classList.add(cls));
				return this;
			};
			
			(element as any).removeClass = function(...classes: string[]) {
				classes.forEach(cls => this.classList.remove(cls));
				return this;
			};
			
			(element as any).createDiv = function(className?: string) {
				const div = document.createElement("div");
				if (className) {
					div.className = className;
				}
				this.appendChild(div);
				return div;
			};
			
			(element as any).createEl = function(tag: string, options?: { text?: string; cls?: string; type?: string; placeholder?: string }) {
				const el = document.createElement(tag);
				if (options) {
					if (options.text) el.textContent = options.text;
					if (options.cls) el.className = options.cls;
					if (options.type && el instanceof HTMLInputElement) el.type = options.type;
					if (options.placeholder && el instanceof HTMLInputElement) el.placeholder = options.placeholder;
				}
				this.appendChild(el);
				return el;
			};
			
			(element as any).createSpan = function(options?: { text?: string; cls?: string }) {
				const span = document.createElement("span");
				if (options) {
					if (options.text) span.textContent = options.text;
					if (options.cls) span.className = options.cls;
				}
				this.appendChild(span);
				return span;
			};
			
			(element as any).setText = function(text: string) {
				this.textContent = text;
				return this;
			};
		}
		
		return element;
	};
}

// Mock obsidian module
vi.mock("obsidian", () => {
	return {
		App: class {},
		Notice: vi.fn(),
		Modal: class {},
		ItemView: class {},
		MarkdownView: class {},
		WorkspaceLeaf: class {},
		TFile: class {},
		Vault: class {},
	};
});

