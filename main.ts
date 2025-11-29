import { Plugin, WorkspaceLeaf } from "obsidian";
import { FindReplaceModal } from "./src/ui/FindReplaceModal";
import {
	FindReplaceView,
	VIEW_TYPE_ADVANCED_FIND_REPLACE,
} from "./src/ui/FindReplaceView";

export default class AdvancedFindReplacePlugin extends Plugin {
	onload() {
		this.registerView(
			VIEW_TYPE_ADVANCED_FIND_REPLACE,
			(leaf) => new FindReplaceView(leaf)
		);

		this.addCommand({
			id: "modal",
			name: "Advanced find and replace (modal)",
			callback: () => {
				new FindReplaceModal(this.app).open();
			},
		});

		this.addCommand({
			id: "split",
			name: "Advanced find and replace (split view)",
			callback: () => {
				void this.activateView();
			},
		});

		this.addRibbonIcon("replace", "Advanced find and replace", () => {
			void this.activateView();
		});
	}

	onunload() {}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_ADVANCED_FIND_REPLACE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getLeftLeaf(false);
			await leaf?.setViewState({
				type: VIEW_TYPE_ADVANCED_FIND_REPLACE,
				active: true,
			});
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
