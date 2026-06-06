export async function markdownToMediumHtml(markdown: string): Promise<string> {
  const { convertMarkdown } = await import('md-to-medium/converter');
  return convertMarkdown(markdown, { sanitize: false });
}
