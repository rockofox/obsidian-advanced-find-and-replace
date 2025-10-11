import { ProcessResult } from "./core/regexProcessor";
import { FileContent } from "./core/fileManager";

export interface PluginState {
	regex: string;
	replacement: string;
	flags: string;
	isScanning: boolean;
	scanResults: ProcessResult | null;
	fileContents: FileContent[] | null;
	error: string | null;
}

export class StateManager {
	private state: PluginState = {
		regex: "",
		replacement: "",
		flags: "g",
		isScanning: false,
		scanResults: null,
		fileContents: null,
		error: null,
	};

	private listeners: Array<(state: PluginState) => void> = [];

	getState(): PluginState {
		return { ...this.state };
	}

	setState(updates: Partial<PluginState>): void {
		this.state = { ...this.state, ...updates };
		this.notifyListeners();
	}

	setRegex(regex: string): void {
		this.setState({ regex, error: null });
	}

	setReplacement(replacement: string): void {
		this.setState({ replacement });
	}

	setFlags(flags: string): void {
		this.setState({ flags });
	}

	setScanning(isScanning: boolean): void {
		this.setState({ isScanning });
	}

	setScanResults(results: ProcessResult | null): void {
		this.setState({ scanResults: results });
	}

	setFileContents(fileContents: FileContent[] | null): void {
		this.setState({ fileContents });
	}

	setError(error: string | null): void {
		this.setState({ error });
	}

	subscribe(listener: (state: PluginState) => void): () => void {
		this.listeners.push(listener);
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index > -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	private notifyListeners(): void {
		for (const listener of this.listeners) {
			listener(this.getState());
		}
	}

	reset(): void {
		this.state = {
			regex: "",
			replacement: "",
			flags: "g",
			isScanning: false,
			scanResults: null,
			fileContents: null,
			error: null,
		};
		this.notifyListeners();
	}
}
