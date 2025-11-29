// This file mocks the obsidian module for testing
// It exports all the types and classes that are used in the codebase

export class App {
	vault: any;
	workspace: any;
	constructor() {}
}

export class Notice {
	constructor(message: string) {}
}

export class Modal {
	app: App;
	contentEl: HTMLElement;
	constructor(app: App) {
		this.app = app;
		this.contentEl = document.createElement("div");
	}
	onOpen() {}
	onClose() {}
	close() {
		this.onClose();
	}
}

export class ItemView {
	app: App;
	containerEl: HTMLElement;
	leaf: any;
	constructor(leaf: any) {
		this.leaf = leaf;
		this.containerEl = document.createElement("div");
	}
	getViewType(): string {
		return "";
	}
	getDisplayText(): string {
		return "";
	}
	getIcon(): string {
		return "";
	}
	async onOpen() {}
	async onClose() {}
}

export class MarkdownView {
	editor: any;
	constructor() {
		this.editor = {
			scrollIntoView: () => {},
			setCursor: () => {},
		};
	}
}

export class WorkspaceLeaf {
	openFile: (file: any) => Promise<void>;
	detach: () => void;
	constructor() {
		this.openFile = async () => {};
		this.detach = () => {};
	}
}

export interface TFile {
	path: string;
	name: string;
	basename: string;
	extension: string;
	stat: {
		ctime: number;
		mtime: number;
		size: number;
	};
	parent: any;
	vault: any;
}

export interface Vault {
	getMarkdownFiles: () => TFile[];
	read: (file: TFile) => Promise<string>;
	modify: (file: TFile, data: string) => Promise<void>;
}

