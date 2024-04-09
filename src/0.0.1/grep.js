import { splitLines, takeKey, takeValue } from "./metadir.js";

function binarySearch(list, key) {
  let indexLow = 0;

  let indexHigh = list.length - 1;

  while (indexLow <= indexHigh) {
    const mid = Math.floor((indexLow + indexHigh) / 2);

    const line = list[mid];

    const isMatch = new RegExp(`^${key}`).test(line);

    if (isMatch) {
      return mid;
    }

    const lineKey = takeKey(line);

    if (lineKey.localeCompare(key) > 0) {
      indexHigh = mid - 1;
    } else {
      indexLow = mid + 1;
    }
  }

  return -1;
}

export function lookup(contentFile, key, isBulk = false) {
  const lines = splitLines(contentFile);

  const index = binarySearch(lines, key);

  if (index === -1) {
    return "";
  }

  // find neigbouring lines with the same key
  if (isBulk) {
    let indexLow = index;

    for (let i = index; i >= 0; i -= 1) {
      if (new RegExp(`^${key}`).test(lines[i])) {
        indexLow = i;
      } else {
        break;
      }
    }

    let indexHigh = index;

    for (let i = index; i < lines.length; i += 1) {
      if (new RegExp(`^${key}`).test(lines[i])) {
        indexHigh = i;
      } else {
        break;
      }
    }

    if (indexLow === indexHigh) {
      return lines[index];
    }

    const matches = `${lines.slice(indexLow, indexHigh + 1).join("\n")}\n`;

    return matches;
  }

  const line = lines[index];

  return line;
}

export function prune(contentFile, key) {
  const lines = splitLines(contentFile);

  const index = binarySearch(lines, key);

  if (index === -1) {
    return contentFile;
  }

  let indexLow = index;

  for (let i = index; i >= 0; i -= 1) {
    if (new RegExp(`^${key}`).test(lines[i])) {
      indexLow = i;
    } else {
      break;
    }
  }

  let indexHigh = index;

  for (let i = index; i < lines.length; i += 1) {
    if (new RegExp(`^${key}`).test(lines[i])) {
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

  const contentFilePruned = lines.join("\n");

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
  if (contentFile === undefined || contentFile === "") {
    return "";
  }
  if (patternFile === undefined || patternFile === "") {
    return contentFile;
  }

  const contentLines = splitLines(contentFile);

  const patternLines = splitLines(patternFile);

  if (isInverse) {
    const prunedLines = contentLines.filter((line) =>
      patternLines.every((pattern) => !new RegExp(pattern).test(line)),
    );

    return `${prunedLines.join("\n")}\n`;
  }

  const matchedSets = patternLines.map((pattern) =>
    contentLines.filter((line) => new RegExp(pattern).test(line)),
  );

  const matchedLines = [...new Set(matchedSets.flat())];

  return `${matchedLines.join("\n")}\n`;
}

export function pruneValue(contentFile, value) {
  const lines = splitLines(contentFile);

  const index = binarySearchValue(lines, value);

  if (index === -1) {
    return contentFile;
  }

  let indexLow = index;

  for (let i = index; i >= 0; i -= 1) {
    if (new RegExp(`,${value}$`).test(lines[i])) {
      indexLow = i;
    } else {
      break;
    }
  }

  let indexHigh = index;

  for (let i = index; i < lines.length; i += 1) {
    if (new RegExp(`,${value}$`).test(lines[i])) {
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

  const contentFilePruned = lines.join("\n");

  return contentFilePruned;
}

function binarySearchValue(listUnsorted, value) {
  // TODO: sort once elsewhere or grep instead of binary search
  const list = listUnsorted.sort((a, b) =>
    takeValue(a).localeCompare(takeValue(b)),
  );

  let indexLow = 0;

  let indexHigh = list.length - 1;

  while (indexLow <= indexHigh) {
    const mid = Math.floor((indexLow + indexHigh) / 2);

    const line = list[mid];

    const isMatch = new RegExp(`,${value}$`).test(line);

    if (isMatch) {
      return mid;
    }

    const lineValue = takeValue(line);

    if (lineValue.localeCompare(value) > 0) {
      indexHigh = mid - 1;
    } else {
      indexLow = mid + 1;
    }
  }

  return -1;
}
