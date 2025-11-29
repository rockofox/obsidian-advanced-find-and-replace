import { ProcessResult } from "./core/regexProcessor";
import { FileContent } from "./core/fileManager";

export interface PluginState {
	regex: string;
	replacement: string;
	flags: string;
	adjustCase: boolean;
	isScanning: boolean;
	scanResults: ProcessResult | null;
	fileContents: FileContent[] | null;
	error: string | null;
	progressCurrent: number;
	progressTotal: number;
	progressMessage: string | null;
}

export class StateManager {
	private state: PluginState = {
		regex: "",
		replacement: "",
		flags: "g",
		adjustCase: false,
		isScanning: false,
		scanResults: null,
		fileContents: null,
		error: null,
		progressCurrent: 0,
		progressTotal: 0,
		progressMessage: null,
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

	setAdjustCase(adjustCase: boolean): void {
		this.setState({ adjustCase });
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

	setProgress(
		current: number,
		total: number,
		message: string | null = null,
	): void {
		this.setState({
			progressCurrent: current,
			progressTotal: total,
			progressMessage: message,
		});
	}

	clearProgress(): void {
		this.setState({
			progressCurrent: 0,
			progressTotal: 0,
			progressMessage: null,
		});
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
			adjustCase: false,
			isScanning: false,
			scanResults: null,
			fileContents: null,
			error: null,
			progressCurrent: 0,
			progressTotal: 0,
			progressMessage: null,
		};
		this.notifyListeners();
	}
}
