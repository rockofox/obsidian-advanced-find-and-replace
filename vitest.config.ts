import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
		setupFiles: ["./tests/setup.ts"],
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: false,
			},
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"**/*.test.ts",
				"**/tests/**",
				"main.ts",
			],
		},
		// Use happy-dom for UI tests
		environmentMatchGlobs: [
			["src/ui/**/*.test.ts", "happy-dom"],
			["src/**/*.test.ts", "node"],
		],
	},
	resolve: {
		alias: {
			obsidian: resolve(__dirname, "tests/helpers/mockObsidianModule.ts"),
		},
	},
});

