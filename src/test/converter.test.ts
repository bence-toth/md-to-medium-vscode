import { describe, it, expect } from 'vitest';
import { markdownToMediumHtml } from '../converter.js';

describe('markdownToMediumHtml', () => {
  it('converts an h1 to a Medium-style heading', async () => {
    const html = await markdownToMediumHtml('# Hello');
    expect(html).toContain('graf--h1');
  });

  it('converts a paragraph', async () => {
    const html = await markdownToMediumHtml('Hello world');
    expect(html).toContain('graf--p');
    expect(html).toContain('Hello world');
  });
});
