// Path helpers used across search/expand/render.
// We use a JSON-Pointer-like escaping for segments so keys can safely contain '.' or '/'.

export type PathSegment = string | number;

export function encodePathSegment(seg: PathSegment): string {
  const s = String(seg);
  // JSON Pointer escaping: ~ -> ~0, / -> ~1
  return s.replace(/~/g, "~0").replace(/\//g, "~1");
}

export function decodePathSegment(seg: string): string {
  // Reverse JSON Pointer escaping: ~1 -> /, ~0 -> ~
  // Order matters.
  return seg.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function joinPath(basePath: string, child: PathSegment): string {
  const enc = encodePathSegment(child);
  return basePath ? `${basePath}/${enc}` : enc;
}

export function splitPath(path: string): string[] {
  return path ? path.split("/") : [];
}

export function buildAncestorPaths(path: string): Set<string> {
  const parts = splitPath(path);
  const out = new Set<string>();
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    out.add(current);
  }
  return out;
}

export function getNextChildKey(
  currentPath: string,
  targetPath: string
): string | null {
  // Returns the immediate child segment (decoded) of currentPath on the way to targetPath.
  const prefix = currentPath ? `${currentPath}/` : "";
  if (!targetPath.startsWith(prefix)) return null;
  const remainder = targetPath.slice(prefix.length);
  const seg = remainder.split("/")[0];
  if (!seg) return null;
  return decodePathSegment(seg);
}

export function pathToMatchElementId(
  path: string,
  type: "key" | "value"
): string {
  // Keep it readable while still safe-ish (path is escaped already).
  return `match-${path}-${type}`;
}
