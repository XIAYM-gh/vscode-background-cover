import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/extension.ts', 'src/uninstall.ts'],
	splitting: false,
	sourcemap: false,
	clean: true,
	format: 'cjs',
	minify: true,
	outDir: 'out',
	external: ['vscode']
});
