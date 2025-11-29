import { describe, it, expect, beforeEach } from "vitest";
import { FileManager } from "./fileManager";
import {
	createMockApp,
	createMockTFile,
	createTestFileContent,
} from "../../tests/helpers/mockObsidian";

describe("FileManager", () => {
	let fileManager: FileManager;
	let mockApp: ReturnType<typeof createMockApp>;

	beforeEach(() => {
		const testFiles = [
			createTestFileContent("file1.md", "Content of file 1"),
			createTestFileContent("file2.md", "Content of file 2"),
			createTestFileContent("subfolder/file3.md", "Content of file 3"),
		];

		mockApp = createMockApp(testFiles);
  fileManager = new FileManager(mockApp as any);
	});

	describe("getAllMarkdownFiles", () => {
		it("should return all markdown files with their contents", async () => {
			const result = await fileManager.getAllMarkdownFiles();

			expect(result.length).toBe(3);
			expect(result[0].file.path).toBe("file1.md");
			expect(result[0].content).toBe("Content of file 1");
			expect(result[1].file.path).toBe("file2.md");
			expect(result[1].content).toBe("Content of file 2");
			expect(result[2].file.path).toBe("subfolder/file3.md");
			expect(result[2].content).toBe("Content of file 3");
		});

		it("should handle empty vault", async () => {
			const emptyApp = createMockApp([]);
    const emptyFileManager = new FileManager(emptyApp as any);

			const result = await emptyFileManager.getAllMarkdownFiles();

			expect(result.length).toBe(0);
		});

		it("should read file contents correctly", async () => {
			const result = await fileManager.getAllMarkdownFiles();

			expect(result[0].content).toBe("Content of file 1");
			expect(typeof result[0].content).toBe("string");
		});

		it("should include file objects", async () => {
			const result = await fileManager.getAllMarkdownFiles();

			expect(result[0].file).toBeDefined();
			expect(result[0].file.path).toBe("file1.md");
			expect(result[0].file.extension).toBe("md");
		});
	});

	describe("modifyFile", () => {
		it("should update file content", async () => {
			const file = createMockTFile("file1.md");
			const newContent = "Updated content";

			await fileManager.modifyFile(file, newContent);

			// Verify by reading the file back
			const updatedContent = await mockApp.vault.read(file);
			expect(updatedContent).toBe(newContent);
		});

		it("should handle empty content", async () => {
			const file = createMockTFile("file1.md");

			await fileManager.modifyFile(file, "");

			const updatedContent = await mockApp.vault.read(file);
			expect(updatedContent).toBe("");
		});

		it("should handle multiline content", async () => {
			const file = createMockTFile("file1.md");
			const newContent = "Line 1\nLine 2\nLine 3";

			await fileManager.modifyFile(file, newContent);

			const updatedContent = await mockApp.vault.read(file);
			expect(updatedContent).toBe(newContent);
		});
	});

	describe("batchModifyFiles", () => {
		it("should modify multiple files", async () => {
			const modifications = [
				{ file: createMockTFile("file1.md"), newContent: "Updated 1" },
				{ file: createMockTFile("file2.md"), newContent: "Updated 2" },
			];

			await fileManager.batchModifyFiles(modifications);

			const content1 = await mockApp.vault.read(modifications[0].file);
			const content2 = await mockApp.vault.read(modifications[1].file);

			expect(content1).toBe("Updated 1");
			expect(content2).toBe("Updated 2");
		});

		it("should handle single file modification", async () => {
			const modifications = [
				{ file: createMockTFile("file1.md"), newContent: "Updated" },
			];

			await fileManager.batchModifyFiles(modifications);

			const content = await mockApp.vault.read(modifications[0].file);
			expect(content).toBe("Updated");
		});

		it("should handle empty modifications array", async () => {
			await expect(
				fileManager.batchModifyFiles([]),
			).resolves.not.toThrow();
		});

		it("should process modifications in order", async () => {
			const file = createMockTFile("file1.md");
			const modifications = [
				{ file, newContent: "First" },
				{ file, newContent: "Second" },
				{ file, newContent: "Third" },
			];

			await fileManager.batchModifyFiles(modifications);

			// Last modification should be the final content
			const content = await mockApp.vault.read(file);
			expect(content).toBe("Third");
		});
	});

	describe("Error handling", () => {
		it("should handle empty vault", async () => {
			const emptyApp = createMockApp([]);
    const emptyFileManager = new FileManager(emptyApp as any);

			await expect(
				emptyFileManager.getAllMarkdownFiles(),
			).resolves.toEqual([]);
		});

		it("should allow modifying non-existent files (creates new file)", async () => {
			const nonExistentFile = createMockTFile("nonexistent.md");
			const emptyApp = createMockApp([]);
    const emptyFileManager = new FileManager(emptyApp as any);

			// Obsidian's modify doesn't throw - it creates the file if it doesn't exist
			await expect(
				emptyFileManager.modifyFile(nonExistentFile, "content"),
			).resolves.not.toThrow();

			// Verify the file was created
			const content = await emptyApp.vault.read(nonExistentFile);
			expect(content).toBe("content");
		});
	});
});

