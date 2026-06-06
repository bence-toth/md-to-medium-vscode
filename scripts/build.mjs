import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  // vscode is provided by the extension host at runtime
  external: [
    'vscode',
    // md-to-medium and its deps are shipped in node_modules inside the VSIX
    // and loaded via dynamic import() so they stay ESM-native
    'md-to-medium',
    'md-to-medium/converter',
    'md-to-medium/clipboard',
    'marked',
    'marked-gfm-heading-id',
  ],
  sourcemap: true,
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('Watching for changes…');
} else {
  await esbuild.build(options);
}
