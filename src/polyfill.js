/**
 * This splits string on newlines and filters empty lines.
 * @name splitLines
 * @function
 * @param {string} str - Newline separated lines.
 * @returns {string[]} - Array of lines.
 */
function splitLines(str) {
  return str.split('\n').filter((line) => line !== '');
}

// return all lines in contentFile that match regex lines in patternFile
export function grepPolyfill(contentFile, patternFile) {
  const contentLines = splitLines(contentFile);

  const patternLines = splitLines(patternFile);

  const searchLines = patternLines.map(
    (pattern) => contentLines.filter(
      (line) => new RegExp(pattern).test(line),
    ),
  );

  const matches = [...new Set(searchLines.flat())].join('\n');

  return matches;
}

export function randomUUIDPolyfill() {
  return (
    [1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
    /[018]/g,
    (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16),
  );
}
