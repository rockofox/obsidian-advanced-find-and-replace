import { ItemView, WorkspaceLeaf } from "obsidian";
import { FindReplaceComponent } from "./FindReplaceComponent";

export const VIEW_TYPE_ADVANCED_FIND_REPLACE = "advanced-find-and-replace-view";

export class FindReplaceView extends ItemView {
	private component: FindReplaceComponent | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_ADVANCED_FIND_REPLACE;
	}

	getDisplayText() {
		return "Advanced Find and Replace";
	}

	getIcon() {
		return "scan";
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("advanced-find-and-replace-view");

		this.component = new FindReplaceComponent(container, this.app, {
			onClose: () => {
				this.leaf.detach();
			},
		});

		this.component.onLoad();
	}

	async onClose() {
		if (this.component) {
			this.component.onUnload();
			this.component = null;
		}
	}
}
