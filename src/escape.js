export function escape(s) {
  return s.replace(/\n/g, "\\n");
}

export function unescape(es) {
  return es.replace(/\\n/g, "\n");
}
