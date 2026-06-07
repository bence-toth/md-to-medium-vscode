import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/out/**', '**/test/integration/**'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/test/**'],
    },
  },
});
