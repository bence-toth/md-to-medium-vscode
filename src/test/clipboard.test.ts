import { describe, it, expect, vi } from 'vitest';

const copyToClipboard = vi.fn().mockResolvedValue(undefined);

vi.mock('md-to-medium/clipboard', () => ({ copyToClipboard }));

import { copyHtmlToClipboard } from '../clipboard.js';

describe('copyHtmlToClipboard', () => {
  it('delegates to the md-to-medium copyToClipboard function', async () => {
    await copyHtmlToClipboard('<p>hello</p>');
    expect(copyToClipboard).toHaveBeenCalledWith('<p>hello</p>');
  });

  it('propagates errors from the underlying clipboard function', async () => {
    copyToClipboard.mockRejectedValueOnce(new Error('clipboard unavailable'));
    await expect(copyHtmlToClipboard('<p>hello</p>')).rejects.toThrow('clipboard unavailable');
  });
});
