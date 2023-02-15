/* eslint-disable no-console */
import {
  describe, beforeEach, expect, test,
} from '@jest/globals';
import { TextEncoder, TextDecoder, promisify } from 'util';
import fs from 'fs';
import crypto from 'crypto';
import { exec } from 'child_process';
import {
  Query, Entry,
} from '../src/index';
import mocks from './mocks';

// node polyfills for browser APIs
// used in csvs_js.digestMessage for hashes
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.crypto = {
  subtle: crypto.webcrypto.subtle,
  randomUUID: crypto.randomUUID,
};

function sortObject(a) {
  return Object.keys(a).sort().reduce(
    (obj, key) => ({ ...obj, [key]: a[key] }),
    {},
  );
}

let callback;

let counter = 0;

const callbackOriginal = {
  readFile: (path) => mocks.metadirDefault[path],
  randomUUID: () => {
    counter += 1;

    // backwards compatibility with old tests
    if (counter === 1) {
      return '5ff1e403-da6e-430d-891f-89aa46b968bf';
    }

    return counter;
  },
};

async function grepCLI(contentFile, patternFile, isInverse) {
  const contentFilePath = `/tmp/${crypto.randomUUID()}`;

  const patternFilePath = `/tmp/${crypto.randomUUID()}`;

  await fs.promises.writeFile(contentFilePath, contentFile);

  await fs.promises.writeFile(patternFilePath, patternFile);

  let output = '';

  try {
    const { stdout, stderr } = await promisify(exec)(
      `rg ${isInverse ? '-v' : ''} -f ${patternFilePath} ${contentFilePath}`,
    );

    if (stderr) {
      console.log('grep cli failed', stderr);
    } else {
      output = stdout;
    }
  } catch (e) {
    // console.log('grep returned empty', e, contentFile, patternFile);
  }

  await fs.promises.unlink(contentFilePath);

  await fs.promises.unlink(patternFilePath);

  return output;
}

describe('Query.select() no ripgrep', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };
  });

  test('queries name1', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2001)]);
    });
  });

  test('queries name2', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name3', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name3');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2003Unedited)]);
    });
  });

  test('queries name2 with out-of-order schema', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    callback.readFile = (path) => mocks.metadirUnordered[path];

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name1 with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    callback.readFile = (path) => mocks.metadirArray[path];

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      // array is unordered, order for reproducible test
      data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('returns empty when query does not match', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'nomatch');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      expect(data).toStrictEqual([]);
    });
  });

  test('queries name1 by UUID', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', '9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2001)]);
    });
  });
});

describe('Query.select() ripgrep', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    callback.grep = grepCLI;
  });

  test('queries name1', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2001)]);
    });
  });

  test('queries name2', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name3', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name3');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2003Unedited)]);
    });
  });

  test('queries name1 with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    callback.readFile = (path) => mocks.metadirArrayAdded[path];

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      // array is unordered, order for reproducible test
      data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('queries value2 with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('datum', 'value1');

    callback.readFile = (path) => mocks.metadirArrayAdded[path];

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      // array is unordered, order for reproducible test
      data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('queries export1_key with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('export1_key', 'longkey1');

    callback.readFile = (path) => mocks.metadirArrayAdded[path];

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      // array is unordered, order for reproducible test
      data.forEach((item) => item.export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1)));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('queries name1 with regexp', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name.*');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      const dataSorted = data.map(sortObject)
        .sort((a, b) => (a.saydate < b.saydate ? -1 : 1));

      expect(dataSorted).toStrictEqual([
        sortObject(mocks.entry2001),
        sortObject(mocks.entry2002),
        sortObject(mocks.entry2003Unedited),
      ]);
    });
  });

  test('queries moddate', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('moddate', '2001-01-01');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => expect(data).toStrictEqual([
      sortObject(mocks.entry2001),
    ]));
  });

  test('queries moddate regex', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('moddate', '.*-01-01');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => {
      const dataSorted = data.map(sortObject)
        .sort((a, b) => (a.saydate < b.saydate ? -1 : 1));

      expect(dataSorted).toStrictEqual([
        sortObject(mocks.entry2001),
        sortObject(mocks.entry2002),
      ]);
    });
  });

  test('queries two queries', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name.*');

    searchParams.set('actdate', '2001-01-01');

    const query = new Query({ searchParams, ...callback });

    return query.select().then((data) => expect(data).toStrictEqual([
      sortObject(mocks.entry2001),
    ]));
  });

  test('queries export1_tag with export1_key', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('export1_key', 'longkey1');

    callback.readFile = (path) => mocks.metadirArrayAdded[path];

    const query = new Query({ '|': 'export1_tag', searchParams, ...callback });

    return query.select().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entryExport1Tag)]);
    });
  });

  test('queries unlinked export1_tag with export1_key', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('export1_key', 'longkey1');

    callback.readFile = (path) => mocks.metadirDeletedArrayItem[path];

    const query = new Query({ '|': 'export1_tag', searchParams, ...callback });

    return query.select().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entryExport1Tag)]);
    });
  });
});

describe('Query.select() base', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    callback.readFile = async (path) => mocks.metadirAdded[path];
  });

  test('queries name', () => (new Query({ '|': 'actname', ...callback })).select().then((data) => {
    expect(data).toStrictEqual(mocks.optionsActname);
  }));

  test('queries date', () => (new Query({ '|': 'actdate', ...callback })).select().then((data) => {
    expect(data).toStrictEqual(mocks.optionsActdate);
  }));

  test('queries sayname with grep', () => (new Query({ '|': 'sayname', ...callback })).select().then((data) => {
    expect(data).toStrictEqual(mocks.optionsSayname);
  }));

  test('queries saydate with grep', () => (new Query({ '|': 'saydate', ...callback })).select().then((data) => {
    expect(data).toStrictEqual(mocks.optionsSaydate);
  }));

  test('queries object', async () => {
    callback.readFile = async (path) => mocks.metadirArray[path];

    const query = new Query({ '|': 'export1_tag', ...callback });

    const data = await query.select();

    expect(data).toStrictEqual(mocks.optionsExport1Tag);
  });
});

describe('Entry.update()', () => {
  let editedFiles;

  beforeEach(() => {
    callback = { ...callbackOriginal };

    editedFiles = { ...mocks.metadirDefault };

    async function writeFileMock(path, contents) {
      editedFiles[path] = contents;
    }

    callback.writeFile = writeFileMock;

    callback.readFile = async (path) => editedFiles[path];

    counter = 0;
  });

  test('does nothing on no change', () => (new Entry({ entry: mocks.entry2001, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDefault);
    }));

  test('edits entry', () => (new Entry({ entry: mocks.entry2003Edited, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirEdited);
    }));

  test('adds entry', () => (new Entry({ entry: mocks.entryAdded, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirAdded);
    }));

  test('adds entry when metadir files are empty', () => {
    const editedFilesCustom = { ...mocks.metadirEmpty };

    callback.readFile = (path) => editedFilesCustom[path];

    callback.writeFile = (path, contents) => { editedFilesCustom[path] = contents; };

    return (new Entry({ entry: mocks.entryAdded, ...callback })).update()
      .then(() => {
        expect(editedFilesCustom).toStrictEqual(mocks.metadirEmptyAdded);
      });
  });

  test('adds entry with random uuid', () => {
    callback.randomUUID = crypto.randomUUID;

    return (new Entry({ entry: mocks.entryAdded, ...callback })).update()
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.metadirAdded);
      });
  });

  test('falls back to random UUID if callback is not specified', () => {
    delete callback.randomUUID;

    return (new Entry({ entry: mocks.entryAdded, ...callback })).update()
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.metadirAdded);
      });
  });
});

describe('Entry.update(), arrays', () => {
  let editedFiles;

  beforeEach(() => {
    callback = { ...callbackOriginal };

    editedFiles = { ...mocks.metadirArray };

    async function writeFileMock(path, contents) {
      editedFiles[path] = contents;
    }

    callback.writeFile = writeFileMock;

    callback.readFile = async (path) => editedFiles[path];

    counter = 0;
  });

  test('adds entry with array', () => (new Entry({ entry: mocks.entryArrayAdded, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirArrayAdded);
    }));

  test('adds entry with array to empty metadir', () => {
    callback.randomUUID = crypto.randomUUID;

    const editedFilesCustom = { ...mocks.metadirArrayEmpty };

    callback.readFile = (path) => editedFilesCustom[path];

    callback.writeFile = (path, contents) => { editedFilesCustom[path] = contents; };

    return (new Entry({ entry: mocks.entryArray, ...callback })).update()
      .then(() => {
        expect(editedFilesCustom).toStrictEqual(mocks.metadirArray);
      });
  });

  test('adds array item to entry', () => (new Entry({ entry: mocks.entryAddedArrayItem, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirAddedArrayItem);
    }));

  test('edits array item', () => (new Entry({ entry: mocks.entryEditedArrayItem, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirEditedArrayItem);
    }));

  test('removes array item', () => (new Entry({ entry: mocks.entryDeletedArrayItem, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDeletedArrayItem);
    }));
});

describe('Entry.delete()', () => {
  let editedFiles;

  beforeEach(() => {
    callback = { ...callbackOriginal };

    editedFiles = { ...mocks.metadirDefault };

    async function writeFileMock(path, contents) {
      editedFiles[path] = contents;
    }

    callback.writeFile = writeFileMock;
  });

  test('deletes entry', () => (new Entry({ entry: mocks.entry2003Unedited, ...callback })).delete()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDeleted);
    }));

  test('deletes entry ripgrep', () => {
    callback.grep = grepCLI;

    const entry = new Entry({ entry: mocks.entry2003Unedited, ...callback });

    return entry.delete()
      .then(() => {
        expect(editedFiles).toStrictEqual(mocks.metadirDeleted);
      });
  });
});
