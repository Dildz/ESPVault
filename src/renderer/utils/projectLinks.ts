// The main process only opens http/https URLs externally (it throws otherwise),
// so the renderer guards the "Open repository" button with the same rule.
export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
