export async function copyHtmlToClipboard(html: string): Promise<void> {
  const { copyToClipboard } = await import('md-to-medium/clipboard');
  return copyToClipboard(html);
}
