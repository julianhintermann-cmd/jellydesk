export function normalizeServerUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (!url.hostname || /\s/.test(trimmed)) return null;
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.protocol}//${url.host}${path}`;
}

export function deriveSeerrUrl(jellyfinUrl: string): string {
  const url = new URL(jellyfinUrl);
  return `${url.protocol}//${url.hostname}:5055`;
}
