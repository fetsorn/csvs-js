/* eslint-disable import/extensions */
import { splitLines, takeKey, takeValue } from './metadir.js';

function escape(value) {
  return value.replace(/\//g, '\\/')
              .replace(/\+/g, '\\+')
              .replace(/\[/g, '\\[')
              .replace(/\)/g, '\\)')
              .replace(/\(/g, '\\(')
}

function binarySearchKey(listUnsorted, key) {
  const keyEscaped = escape(key)

  // TODO: sort once elsewhere or grep instead of binary search
  const list = listUnsorted.sort((a, b) => takeKey(a).localeCompare(takeKey(b)))

  let indexLow = 0;

  let indexHigh = list.length - 1;

  while (indexLow <= indexHigh) {
    const mkey = Math.floor((indexLow + indexHigh) / 2);

    const line = list[mkey];

    const isMatch = (new RegExp(`^${keyEscaped},`)).test(line);

    if (isMatch) {
      return mkey;
    }

    const lineKey = takeKey(line);

    if (lineKey.localeCompare(key) > 0) {
      indexHigh = mkey - 1;
    } else {
      indexLow = mkey + 1;
    }
  }

  return -1;
}

function binarySearchValue(listUnsorted, value) {
  const valueEscaped = escape(value)

  // TODO: sort once elsewhere or grep instead of binary search
  const list = listUnsorted.sort((a, b) => takeValue(a).localeCompare(takeValue(b)))

  let indexLow = 0;

  let indexHigh = list.length - 1;

  while (indexLow <= indexHigh) {
    const mkey = Math.floor((indexLow + indexHigh) / 2);

    const line = list[mkey];

    const isMatch = (new RegExp(`,${valueEscaped}$`)).test(line);

    if (isMatch) {
      return mkey;
    }

    const lineValue = takeValue(line);

    if (lineValue.localeCompare(value) > 0) {
      indexHigh = mkey - 1;
    } else {
      indexLow = mkey + 1;
    }
  }

  return -1;
}

export function lookup(contentFile, key, isBulk = false) {
  const keyEscaped = escape(key)

  const lines = splitLines(contentFile);

  const index = binarySearchKey(lines, key);

  if (index === -1) {
    return '';
  }

  // find neigbouring lines with the same key
  if (isBulk) {
    let indexLow = index;

    for (let i = index; i >= 0; i -= 1) {
      if ((new RegExp(`^${keyEscaped},`)).test(lines[i])) {
        indexLow = i;
      } else {
        break;
      }
    }

    let indexHigh = index;

    for (let i = index; i < lines.length; i += 1) {
      if ((new RegExp(`^${keyEscaped},`)).test(lines[i])) {
        indexHigh = i;
      } else {
        break;
      }
    }

    if (indexLow === indexHigh) {
      return lines[index];
    }

    const matches = `${lines.slice(indexLow, indexHigh + 1).join('\n')}\n`;

    return matches;
  }

  const line = lines[index];

  return line;
}

export function pruneValue(contentFile, value) {
  const valueEscaped = escape(value)

  const lines = splitLines(contentFile);

  const index = binarySearchValue(lines, value);

  if (index === -1) {
    return contentFile;
  }

  let indexLow = index;

  for (let i = index; i >= 0; i -= 1) {
    if ((new RegExp(`,${valueEscaped}$`)).test(lines[i])) {
      indexLow = i;
    } else {
      break;
    }
  }

  let indexHigh = index;

  for (let i = index; i < lines.length; i += 1) {
    if ((new RegExp(`,${valueEscaped}$`)).test(lines[i])) {
      indexHigh = i;
    } else {
      break;
    }
  }

  if (indexLow === indexHigh) {
    lines.splice(index, 1);
  } else {
    lines.splice(indexLow, indexHigh - indexLow + 1);
  }

  const contentFilePruned = lines.join('\n');

  return contentFilePruned;
}

export function pruneKey(contentFile, key) {
  const keyEscaped = escape(key)

  const lines = splitLines(contentFile);

  const index = binarySearchKey(lines, key);

  if (index === -1) {
    return contentFile;
  }

  let indexLow = index;

  for (let i = index; i >= 0; i -= 1) {
    if ((new RegExp(`^${keyEscaped},`)).test(lines[i])) {
      indexLow = i;
    } else {
      break;
    }
  }

  let indexHigh = index;

  for (let i = index; i < lines.length; i += 1) {
    if ((new RegExp(`^${keyEscaped},`)).test(lines[i])) {
      indexHigh = i;
    } else {
      break;
    }
  }

  if (indexLow === indexHigh) {
    lines.splice(index, 1);
  } else {
    lines.splice(indexLow, indexHigh - indexLow + 1);
  }

  const contentFilePruned = lines.join('\n');

  return contentFilePruned;
}

/**
 * This find lines in contentFile that match regex lines in patternFile.
 * @name grep
 * @function
 * @param {string} contents - The file contents.
 * @param {string} regex - The regular expression in JS format.
 * @param {Boolean} isInverse - Switch for inverse grep or prune.
 * @returns {string} - Search results.
 */
export function grep(contentFile, patternFile, isInverse) {
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

  return `${matchedLines.join('\n')}\n`;
}
