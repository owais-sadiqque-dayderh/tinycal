/** Built-in starter content for notes created via the calendar's "create new note" path.
 * Frontmatter itself is stamped separately via `fileManager.processFrontMatter`. */
export function buildEventNoteContent(title: string): string {
	return `# ${title}\n`;
}
