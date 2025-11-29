// Types are defined here to avoid importing from obsidian during tests
// The actual obsidian module is mocked in setup.ts
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

export interface WorkspaceLeaf {
	openFile: (file: TFile) => Promise<void>;
	detach: () => void;
}

export interface MarkdownView {
	editor: {
		scrollIntoView: (options: any, center?: boolean) => void;
		setCursor: (pos: { line: number; ch: number }) => void;
	};
}

export interface App {
	vault: Vault;
	workspace: {
		getLeaf: (split?: boolean) => WorkspaceLeaf;
		getActiveViewOfType: <T>(viewType: any) => T | null;
	};
}

/**
 * Creates a mock TFile object for testing
 */
export function createMockTFile(
	path: string,
	name?: string,
	basename?: string,
): TFile {
	return {
		path,
		name: name || path.split("/").pop() || path,
		basename: basename || path.split("/").pop()?.replace(/\.[^/.]+$/, "") || path,
		extension: path.split(".").pop() || "md",
		stat: {
			ctime: Date.now(),
			mtime: Date.now(),
			size: 0,
		},
		parent: null,
		vault: null as any,
	} as TFile;
}

/**
 * Creates a mock Vault object for testing
 */
export function createMockVault(
	files: Array<{ file: TFile; content: string }> = [],
): Vault {
	const fileMap = new Map<string, string>();
	for (const { file, content } of files) {
		fileMap.set(file.path, content);
	}

	return {
		getMarkdownFiles: () => files.map((f) => f.file),
		read: async (file: TFile): Promise<string> => {
			const content = fileMap.get(file.path);
			if (content === undefined) {
				throw new Error(`File not found: ${file.path}`);
			}
			return content;
		},
		modify: async (file: TFile, data: string): Promise<void> => {
			fileMap.set(file.path, data);
		},
	} as Vault;
}

/**
 * Creates a mock App object for testing
 */
export function createMockApp(
	files: Array<{ file: TFile; content: string }> = [],
): App {
	const vault = createMockVault(files);

	const mockLeaf = {
		openFile: async (file: TFile) => Promise.resolve(),
	} as WorkspaceLeaf;

	const mockEditor = {
		scrollIntoView: () => {},
		setCursor: () => {},
	} as unknown as any;

	const mockMarkdownView = {
		editor: mockEditor,
	} as MarkdownView;

	return {
		vault,
		workspace: {
			getLeaf: () => mockLeaf,
			getActiveViewOfType: (viewType: any) => {
				// In tests, always return the mock MarkdownView when requested
				// This works because MarkdownView is a class in the mocked obsidian module
				return mockMarkdownView;
			},
		},
	} as App;
}

/**
 * Helper to create test file contents
 */
export function createTestFileContent(
	path: string,
	content: string,
): { file: TFile; content: string } {
	return {
		file: createMockTFile(path),
		content,
	};
}

