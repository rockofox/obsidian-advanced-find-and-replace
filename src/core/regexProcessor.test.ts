import { describe, it, expect, beforeEach } from "vitest";
import { RegexProcessor } from "./regexProcessor";
import { FileContent } from "./fileManager";
import { createMockTFile, createTestFileContent } from "../../tests/helpers/mockObsidian";

describe("RegexProcessor", () => {
	let processor: RegexProcessor;
	let testFiles: FileContent[];

	beforeEach(() => {
		processor = new RegexProcessor();
		testFiles = [
			createTestFileContent("file1.md", "Hello world\nThis is a test\nAnother line"),
			createTestFileContent("file2.md", "Test content\nMore text here"),
		];
	});

	describe("validateRegex", () => {
		it("should return true for valid regex patterns", () => {
			expect(processor.validateRegex("test")).toBe(true);
			expect(processor.validateRegex("\\bword\\b")).toBe(true);
			expect(processor.validateRegex("[0-9]+")).toBe(true);
			expect(processor.validateRegex("(test|example)")).toBe(true);
		});

		it("should return false for invalid regex patterns", () => {
			expect(processor.validateRegex("[")).toBe(false);
			expect(processor.validateRegex("(test")).toBe(false);
			expect(processor.validateRegex("\\")).toBe(false);
		});

		it("should handle empty string", () => {
			expect(processor.validateRegex("")).toBe(true);
		});
	});

	describe("processFiles - basic matching", () => {
		it("should find simple text matches", async () => {
			const result = await processor.processFiles(
				testFiles,
				"test",
				"",
				"g",
			);

			// "test" matches once in file1.md ("This is a test")
			// but not in file2.md ("Test content" - capital T, case-sensitive)
			expect(result.totalMatches).toBe(1);
			expect(result.affectedFiles.length).toBe(1);
			expect(result.matches.length).toBe(1);
		});

		it("should find multiple matches in a single file", async () => {
			const files = [
				createTestFileContent("file.md", "test test test"),
			];

			const result = await processor.processFiles(files, "test", "", "g");

			expect(result.totalMatches).toBe(3);
			expect(result.affectedFiles.length).toBe(1);
		});

		it("should return empty results when no matches found", async () => {
			const result = await processor.processFiles(
				testFiles,
				"nonexistent",
				"",
				"g",
			);

			expect(result.totalMatches).toBe(0);
			expect(result.affectedFiles.length).toBe(0);
			expect(result.matches.length).toBe(0);
		});

		it("should handle empty pattern", async () => {
			const result = await processor.processFiles(testFiles, "", "", "g");

			expect(result.totalMatches).toBe(0);
		});
	});

	describe("processFiles - regex flags", () => {
		it("should respect case-insensitive flag (i)", async () => {
			const files = [createTestFileContent("file.md", "Test TEST test")];

			const result = await processor.processFiles(files, "test", "", "gi");

			expect(result.totalMatches).toBe(3);
		});

		it("should respect case-sensitive matching without i flag", async () => {
			const files = [createTestFileContent("file.md", "Test TEST test")];

			const result = await processor.processFiles(files, "test", "", "g");

			expect(result.totalMatches).toBe(1);
		});

		it("should handle multiline flag (m)", async () => {
			const files = [
				createTestFileContent("file.md", "Line 1\nLine 2\nLine 3"),
			];

			const result = await processor.processFiles(files, "^Line", "", "gm");

			expect(result.totalMatches).toBe(3);
		});
	});

	describe("processFiles - match details", () => {
		it("should include correct line numbers", async () => {
			const files = [
				createTestFileContent("file.md", "Line 1\nLine 2 test\nLine 3"),
			];

			const result = await processor.processFiles(files, "test", "", "g");

			expect(result.matches[0].lineNumber).toBe(2);
		});

		it("should include match text", async () => {
			const result = await processor.processFiles(
				testFiles,
				"test",
				"",
				"g",
			);

			expect(result.matches[0].match).toBe("test");
		});

		it("should include before and after context", async () => {
			const files = [
				createTestFileContent("file.md", "before test after"),
			];

			const result = await processor.processFiles(files, "test", "", "g");

			expect(result.matches[0].before).toBe("before ");
			expect(result.matches[0].after).toBe(" after");
		});

		it("should include start and end indices", async () => {
			const files = [
				createTestFileContent("file.md", "before test after"),
			];

			const result = await processor.processFiles(files, "test", "", "g");

			expect(result.matches[0].startIndex).toBe(7);
			expect(result.matches[0].endIndex).toBe(11);
		});

		it("should include context lines", async () => {
			const files = [
				createTestFileContent(
					"file.md",
					"Line 1\nLine 2\nLine 3 test\nLine 4\nLine 5",
				),
			];

			const result = await processor.processFiles(files, "test", "", "g");

			const context = result.matches[0].context;
			expect(context).toContain("Line 1");
			expect(context).toContain("Line 3 test");
			expect(context).toContain("Line 5");
		});
	});

	describe("processFiles - case adjustment", () => {
		it("should adjust case for uppercase original", async () => {
			const files = [createTestFileContent("file.md", "TEST")];

			const result = await processor.processFiles(
				files,
				"TEST",
				"replacement",
				"g",
				true,
			);

			expect(result.matches[0].replacement).toBe("REPLACEMENT");
		});

		it("should adjust case for lowercase original", async () => {
			const files = [createTestFileContent("file.md", "test")];

			const result = await processor.processFiles(
				files,
				"test",
				"REPLACEMENT",
				"g",
				true,
			);

			expect(result.matches[0].replacement).toBe("replacement");
		});

		it("should adjust case for title case original", async () => {
			const files = [createTestFileContent("file.md", "Test")];

			const result = await processor.processFiles(
				files,
				"Test",
				"replacement",
				"g",
				true,
			);

			expect(result.matches[0].replacement).toBe("Replacement");
		});

		it("should not adjust case when adjustCase is false", async () => {
			const files = [createTestFileContent("file.md", "TEST")];

			const result = await processor.processFiles(
				files,
				"TEST",
				"replacement",
				"g",
				false,
			);

			expect(result.matches[0].replacement).toBe("replacement");
		});

		it("should handle mixed case without adjustment", async () => {
			const files = [createTestFileContent("file.md", "TeSt")];

			const result = await processor.processFiles(
				files,
				"TeSt",
				"replacement",
				"g",
				true,
			);

			// Mixed case should return as-is
			expect(result.matches[0].replacement).toBe("replacement");
		});
	});

	describe("processFiles - edge cases", () => {
		it("should handle invalid regex gracefully", async () => {
			const result = await processor.processFiles(testFiles, "[", "", "g");

			expect(result.totalMatches).toBe(0);
			expect(result.affectedFiles.length).toBe(0);
		});

		it("should handle empty file contents", async () => {
			const emptyFiles: FileContent[] = [];

			const result = await processor.processFiles(emptyFiles, "test", "", "g");

			expect(result.totalMatches).toBe(0);
			expect(result.affectedFiles.length).toBe(0);
		});

		it("should handle files with empty content", async () => {
			const files = [createTestFileContent("file.md", "")];

			const result = await processor.processFiles(files, "test", "", "g");

			expect(result.totalMatches).toBe(0);
		});

		it("should handle zero-width matches without infinite loops", async () => {
			const files = [createTestFileContent("file.md", "test")];

			// Using a pattern that matches zero-width (start of string)
			const result = await processor.processFiles(files, "^", "", "g");

			// Should handle gracefully - may match once at start, but not infinitely
			expect(result.totalMatches).toBeGreaterThanOrEqual(0);
			expect(result.totalMatches).toBeLessThanOrEqual(1);
		});
	});

	describe("applyReplacements - basic replacement", () => {
		it("should replace matches in file content", async () => {
			const files = [createTestFileContent("file.md", "test content")];

			const result = await processor.applyReplacements(files, "test", "replaced", "g");

			expect(result.length).toBe(1);
			expect(result[0].newContent).toBe("replaced content");
		});

		it("should replace multiple occurrences", async () => {
			const files = [createTestFileContent("file.md", "test test test")];

			const result = await processor.applyReplacements(files, "test", "replaced", "g");

			expect(result.length).toBe(1);
			expect(result[0].newContent).toBe("replaced replaced replaced");
		});

		it("should not modify files with no matches", async () => {
			const files = [createTestFileContent("file.md", "no match here")];

			const result = await processor.applyReplacements(files, "test", "replaced", "g");

			expect(result.length).toBe(0);
		});

		it("should handle empty replacement", async () => {
			const files = [createTestFileContent("file.md", "test content")];

			const result = await processor.applyReplacements(files, "test", "", "g");

			expect(result.length).toBe(1);
			expect(result[0].newContent).toBe(" content");
		});
	});

	describe("applyReplacements - case adjustment", () => {
		it("should adjust case when enabled", async () => {
			const files = [createTestFileContent("file.md", "TEST")];

			const result = await processor.applyReplacements(
				files,
				"TEST",
				"replacement",
				"g",
				true,
			);

			expect(result[0].newContent).toBe("REPLACEMENT");
		});

		it("should not adjust case when disabled", async () => {
			const files = [createTestFileContent("file.md", "TEST")];

			const result = await processor.applyReplacements(
				files,
				"TEST",
				"replacement",
				"g",
				false,
			);

			expect(result[0].newContent).toBe("replacement");
		});
	});

	describe("applyReplacements - multiple files", () => {
		it("should process multiple files", async () => {
			const files = [
				createTestFileContent("file1.md", "test content"),
				createTestFileContent("file2.md", "test content"),
			];

			const result = await processor.applyReplacements(files, "test", "replaced", "g");

			expect(result.length).toBe(2);
			expect(result[0].file.path).toBe("file1.md");
			expect(result[1].file.path).toBe("file2.md");
		});

		it("should only return files that were modified", async () => {
			const files = [
				createTestFileContent("file1.md", "test content"),
				createTestFileContent("file2.md", "no match"),
			];

			const result = await processor.applyReplacements(files, "test", "replaced", "g");

			expect(result.length).toBe(1);
			expect(result[0].file.path).toBe("file1.md");
		});
	});

	describe("applyReplacements - edge cases", () => {
		it("should handle invalid regex gracefully", async () => {
			const files = [createTestFileContent("file.md", "test")];

			const result = await processor.applyReplacements(files, "[", "replaced", "g");

			expect(result.length).toBe(0);
		});

		it("should handle empty file list", async () => {
			const result = await processor.applyReplacements([], "test", "replaced", "g");

			expect(result.length).toBe(0);
		});

		it("should handle regex with capture groups", async () => {
			const files = [createTestFileContent("file.md", "Hello world")];

			const result = await processor.applyReplacements(
				files,
				"(\\w+) (\\w+)",
				"$2 $1",
				"g",
			);

			expect(result.length).toBe(1);
			expect(result[0].newContent).toBe("world Hello");
		});
	});
});

