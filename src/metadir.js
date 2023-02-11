/**
 * This splits string on newlines and filters empty lines.
 * @name splitLines
 * @function
 * @param {string} str - Newline separated lines.
 * @returns {string[]} - Array of lines.
 */
export function splitLines(str) {
  return str.split('\n').filter((line) => line !== '');
}

/**
 * This takes a UUID from a database entry.
 * @name takeUUID
 * @export function
 * @param {string} line - Entry line.
 * @returns {string} - UUID.
 */
export function takeUUID(line) {
  return line.slice(0, 64);
}

/**
 * This takes a value from a database entry.
 * @name takeValue
 * @export function
 * @param {string} line - Entry line.
 * @returns {string} - Value.
 */
export function takeValue(line) {
  return line.slice(65).replace(/\n*$/, '');
}

/**
 * This takes UUIDs from database entries.
 * @name takeUUIDs
 * @export function
 * @param {string} line - Newline separated entry lines.
 * @returns {string[]} - UUIDs.
 */
export function takeUUIDs(str) {
  const lines = splitLines(str.replace(/\n*$/, ''));

  const uuids = lines.map((line) => takeUUID(line));

  return uuids;
}

/**
 * This takes values from database entries.
 * @name takeValues
 * @export function
 * @param {string} line - Newline separated entry lines.
 * @returns {string[]} - Values.
 */
export function takeValues(str) {
  const lines = splitLines(str.replace(/\n*$/, ''));

  const uuids = lines.map((line) => takeValue(line));

  return uuids;
}
