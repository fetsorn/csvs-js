import { parse } from 'csv-parse/lib/sync';

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
 * This takes a Key from a dataset record.
 * @name takeKey
 * @export function
 * @param {string} line - Record line.
 * @returns {string} - Key.
 */
export function takeKey(line) {
  const parser = parse(line)

  for (const [trunk,leaf] of parser) {
    return trunk
  }
}

/**
 * This takes a value from a dataset record.
 * @name takeValue
 * @export function
 * @param {string} line - Record line.
 * @returns {string} - Value.
 */
export function takeValue(line) {
  const parser = parse(line)

  for (const [trunk,leaf] of parser) {
    return leaf.replace(/\n*$/, '')
  }
}

/**
 * This takes Keys from dataset records.
 * @name takeKeys
 * @export function
 * @param {string} str - Newline separated record lines.
 * @returns {string[]} - Keys.
 */
export function takeKeys(str) {
  const lines = splitLines(str.replace(/\n*$/, ''));

  return lines.map((line) => takeKey(line));
}

/**
 * This takes values from dataset records.
 * @name takeValues
 * @export function
 * @param {string} line - Newline separated record lines.
 * @returns {string[]} - Values.
 */
export function takeValues(str) {
  const lines = splitLines(str.replace(/\n*$/, ''));

  return lines.map((line) => takeValue(line));
}
