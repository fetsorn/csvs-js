/**
 * This splits string on newlines and filters empty lines.
 * @name splitLines
 * @function
 * @param {string} str - Newline separated lines.
 * @returns {string[]} - Array of lines.
 */
export function splitLines(str) {
  return str.split("\n").filter((line) => line !== "");
}

/**
 * This takes a key from a dataset record.
 * @name takeKey
 * @export function
 * @param {string} line - Record line.
 * @returns {string} - key.
 */
export function takeKey(line) {
  return line.slice(0, 64);
}

/**
 * This takes a value from a dataset record.
 * @name takeValue
 * @export function
 * @param {string} line - Record line.
 * @returns {string} - Value.
 */
export function takeValue(line) {
  return line.slice(65).replace(/\n*$/, "");
}

/**
 * This takes keys from dataset records.
 * @name takeKeys
 * @export function
 * @param {string} line - Newline separated record lines.
 * @returns {string[]} - Keys.
 */
export function takeKeys(str) {
  const lines = splitLines(str.replace(/\n*$/, ""));

  const keys = lines.map((line) => takeKey(line));

  return keys;
}

/**
 * This takes values from dataset records.
 * @name takeValues
 * @export function
 * @param {string} line - Newline separated record lines.
 * @returns {string[]} - Values.
 */
export function takeValues(str) {
  const lines = splitLines(str.replace(/\n*$/, ""));

  const keys = lines.map((line) => takeValue(line));

  return keys;
}
