/** Saves a calendar file from the browser. Never throws: a blocked download leaves the Google link as the way in. */
export function downloadIcs(content: string, filename: string): void {
  try {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // Download blocked: the Google link is still there.
  }
}
