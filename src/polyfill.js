import { splitLines } from './metadir';

/**
 * This find lines in contentFile that match regex lines in patternFile.
 * @name grepPolyfill
 * @function
 * @param {string} contents - The file contents.
 * @param {string} regex - The regular expression in JS format.
 * @param {Boolean} isInverse - Switch for inverse grep or prune.
 * @returns {string} - Search results.
 */
export function grepPolyfill(contentFile, patternFile, isInverse) {
  if (contentFile === undefined || contentFile === '') {
    return '';
  }
  if (patternFile === undefined || patternFile === '') {
    return contentFile;
  }

  const contentLines = splitLines(contentFile);

  const patternLines = splitLines(patternFile);

  if (isInverse) {
    const prunedLines = contentLines.filter(
      (line) => patternLines.every(
        (pattern) => !(new RegExp(pattern)).test(line),
      ),
    );

    return `${prunedLines.join('\n')}\n`;
  }

  const matchedSets = patternLines.map(
    (pattern) => contentLines.filter(
      (line) => new RegExp(pattern).test(line),
    ),
  );

  const matchedLines = [...new Set(matchedSets.flat())];

  return matchedLines.join('\n');
}

/**
 * This generates a UUID.
 * @name randomUUIDPolyfill
 * @function
 * @returns {string} - UUID compliant with RFC 4122.
 */
export function randomUUIDPolyfill() {
  return (
    [1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
    /[018]/g,
    (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16),
  );
}
