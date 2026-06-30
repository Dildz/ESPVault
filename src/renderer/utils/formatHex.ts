// Render a number as a zero-padded uppercase hex string (e.g. 0x00FF).
// `bytes` is the byte width to pad to. Null in → null out.
export function formatHex(value: number, bytes: number): string;
export function formatHex(value: number | null, bytes: number): string | null;
export function formatHex(value: number | null, bytes: number): string | null {
  if (value === null) {
    return null;
  }

  return `0x${value.toString(16).toUpperCase().padStart(bytes * 2, "0")}`;
}
