import { App, Modal } from "obsidian";
import { FindReplaceComponent } from "./FindReplaceComponent";

export class FindReplaceModal extends Modal {
	private component: FindReplaceComponent | null = null;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		this.component = new FindReplaceComponent(this.contentEl, this.app, {
			onClose: () => this.close(),
		});
		this.component.onLoad();
	}

	onClose() {
		if (this.component) {
			this.component.onUnload();
			this.component = null;
		}
	}
}
