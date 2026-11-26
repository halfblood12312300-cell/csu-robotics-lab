/** A stable public path within the repository's media directory. */
export function normalizeRepositoryMediaPath(value: string): string | undefined {
  if (!value.startsWith("/media/") || /[?#\\\u0000-\u001f\u007f]/.test(value)) return undefined;
  const segments = value.slice("/media/".length).split("/");
  if (!segments.length || segments.some((segment) => !segment)) return undefined;
  try {
    const decoded = segments.map((segment) => decodeURIComponent(segment));
    if (decoded.some((segment) => segment === "." || segment === ".." ||
      /[/\\?#%\u0000-\u001f\u007f]/.test(segment))) return undefined;
    return "/media/" + decoded.map((segment) => encodeURIComponent(segment)
      .replace(/[!'()*]/g, (character) => "%" + character.charCodeAt(0).toString(16).toUpperCase())).join("/");
  } catch { return undefined; }
}
