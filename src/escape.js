// full name to differ from global.escape()
export function escapeNewline(s) {
  return s.replace(/\n/g, "\\n");
}

export function unescapeNewline(es) {
  return es.replace(/\\n/g, "\n");
}
