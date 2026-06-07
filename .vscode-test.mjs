import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/integration/**/*.integration.test.js',
  workspaceFolder: './src/test/integration/workspace',
  mocha: {
    timeout: 30000,
  },
});
