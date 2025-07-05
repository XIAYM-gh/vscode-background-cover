import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/extension.ts'],

	splitting: false,
	sourcemap: false,
	clean: true,
	minify: true,
	outDir: 'out',

	format: 'cjs',
	target: 'esnext',

	external: ['vscode']
});
