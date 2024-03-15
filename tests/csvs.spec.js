/* eslint-disable no-console */
import {
  describe, beforeEach, expect, test,
} from '@jest/globals';
import { TextEncoder, TextDecoder, promisify } from 'util';
import fs from 'fs';
import crypto from 'crypto';
import { exec } from 'child_process';
import stream from 'stream';
import { CSVS } from '../src/index';
import { loadMocks } from './mocks';
const pipeline = promisify(stream.pipeline);

const mocks = loadMocks()


const testCasesSelect = [
  {
    name: "queries name1",
    query: "actname=name1",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2001]
  },
  {
    name: "queries name2",
    query:, "actname=name2",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2002]
  },
  {
    name: "queries name3",
    query:, "actname=name3",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2003Unedited]
  },
  {
    name: "queries name2 with out-of-order schema",
    query: "actname=name2",
    initial: mocks.metadirUnordered,
    expected: [mocks.entry2002]
  },
  {
    name: "queries name1 with array of tags",
    query: "actname=name1",
    initial: mocks.metadirArray,
    expected: [mocks.entryArray]
  },
  {
    name: "queries name1 by UUID",
    query: "actname=9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2001]
  },
  {
    name: "queries value2 with array of tags",
    query: "datum=value1",
    initial: mocks.metadirArrayAdded,
    expected: [mocks.entryArray]
  },
  {
    name: "queries export1_key with array of tags",
    query: "export1_key=longkey1",
    initial: mocks.metadirArrayAdded,
    expected: [mocks.entryArray]
  },
  {
    name: "queries name1 with regexp",
    query: "actname=name.*",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2001,mocks.entry2002,mocks.entry2003Unedited]
  },
  {
    name: "queries moddate regex",
    query: "moddate=.*-01-01",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2001,mocks.entry2002]
  },
  {
    name: "queries two queries",
    query: "actname=name.*&actdate=2001-01-01",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2001]
  },
  {
    name: "queries export1_tag with export1_key",
    query: "_=export1_tag&export1_key=longkey1",
    initial: mocks.metadirArrayAdded,
    expected: [mocks.entryExport1Tag]
  },
  {
    name: "queries unlinked export1_tag with export1_key",
    query: "_=export1_tag&export1_key=longkey1",
    initial: mocks.metadirDeletedArrayItem,
    expected: [mocks.entryExport1Tag]
  },
  {
    name: "queries name",
    query: "_=actname",
    initial: mocks.metadirDefault,
    expected: [mocks.optionsActname]
  },
  {
    name: "queries date",
    query: "_=actdate",
    initial: mocks.metadirDefault,
    expected: [mocks.optionsActdate]
  },
  {
    name: "queries sayname with grep",
    query: "_=sayname",
    initial: mocks.metadirDefault,
    expected: [mocks.optionsSayname]
  },
  {
    name: "queries saydate with grep",
    query: "_=saydate",
    initial: mocks.metadirDefault,
    expected: [mocks.optionsSaydate]
  },
  {
    name: "queries object",
    query: "_=export1_tag",
    initial: mocks.metadirDefault,
    expected: [mocks.optionsExport1Tag]
  },
]

const testCasesUpdate = [
  {
    name: "does nothing on no change",
    query: mocks.entry2001,
    initial: mocks.metadirDefault,
    expected: mocks.metadirDefault
  },
  {
    name: "edits entry",
    query: mocks.entry2003Edited,
    initial: mocks.metadirDefault,
    expected: mocks.metadirEdited
  },
  {
    name: "adds entry",
    query: mocks.entryAdded,
    initial: mocks.metadirDefault,
    expected: mocks.metadirAdded
  },
  {
    name: "adds entry with random uuid",
    query: mocks.entryAdded,
    initial: mocks.metadirDefault,
    expected: mocks.metadirAdded
  },
  {
    name: "falls back to random UUID if callback is not specified",
    query: mocks.entryAdded,
    initial: mocks.metadirDefault,
    expected: mocks.metadirAdded
  },
  {
    name: "adds entry with array",
    query: mocks.entryArrayAdded,
    initial: mocks.metadirDefault,
    expected: mocks.metadirArrayAdded
  },
  {
    name: "adds entry with array to empty metadir",
    query: mocks.entryArray,
    initial: mocks.metadirArrayEmpty
    expected: mocks.metadirArray
  },
  {
    name: "adds array item to entry",
    query: mocks.entryAddedArrayItem,
    initial: mocks.metadirDefault
    expected: mocks.metadirAddedArrayItem
  },
  {
    name: "edits array item",
    query: mocks.entryEditedArrayItem,
    initial: mocks.metadirDefault
    expected: mocks.metadirEditedArrayItem
  },
  {
    name: "removes array item",
    query: mocks.entryDeletedArrayItem,
    initial: mocks.metadirDefault
    expected: mocks.metadirDeletedArrayItem
  },
  {
    name: "edits array item of type object",
    query: mocks.entryEditedArrayItemObject,
    initial: mocks.metadirDefault,
    expected: mocks.metadirEditedArrayItemObject
  }
]

const testCasesDelete = [
  {
    name: "deletes entry",
    query: mocks.entry2003Unedited,
    initial: mocks.metadirDefault,
    expected: mocks.metadirDeleted
  }
]

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

    return `${counter}`;
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

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2001)]);
    });
  });

  test('queries name2', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name3', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name3');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2003Unedited)]);
    });
  });

  test('queries name2 with out-of-order schema', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    callback.readFile = (path) => mocks.metadirUnordered[path];

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name1 with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    callback.readFile = (path) => mocks.metadirArray[path];

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      // array is unordered, order for reproducible test
      data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('returns empty when query does not match', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'nomatch');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual([]);
    });
  });

  test('queries name1 by UUID', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', '9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2001)]);
    });
  });
});

describe('CSVS.select(searchParams) ripgrep', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    callback.grep = grepCLI;
  });

  test('queries name1', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2001)]);
    });
  });

  test('queries name2', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name3', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name3');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2003Unedited)]);
    });
  });

  test('queries name1 with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    callback.readFile = (path) => mocks.metadirArrayAdded[path];

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      // array is unordered, order for reproducible test
      data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('queries value2 with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('datum', 'value1');

    callback.readFile = (path) => mocks.metadirArrayAdded[path];

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      // array is unordered, order for reproducible test
      data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('queries export1_key with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('export1_key', 'longkey1');

    callback.readFile = (path) => mocks.metadirArrayAdded[path];

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      // array is unordered, order for reproducible test
      data.forEach((item) => item.export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1)));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('queries name1 with regexp', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name.*');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
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

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => expect(data).toStrictEqual([
      sortObject(mocks.entry2001),
    ]));
  });

  test('queries moddate regex', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('moddate', '.*-01-01');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
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

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => expect(data).toStrictEqual([
      sortObject(mocks.entry2001),
    ]));
  });

  test('queries export1_tag with export1_key', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('_', 'export1_tag');

    searchParams.set('export1_key', 'longkey1');

    callback.readFile = (path) => mocks.metadirArrayAdded[path];

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entryExport1Tag)]);
    });
  });

  test('queries unlinked export1_tag with export1_key', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('_', 'export1_tag');

    searchParams.set('export1_key', 'longkey1');

    callback.readFile = (path) => mocks.metadirDeletedArrayItem[path];

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entryExport1Tag)]);
    });
  });
});

describe('CSVS.select(searchParams) base', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    callback.readFile = async (path) => mocks.metadirAdded[path];
  });

  test('queries name', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('_', 'actname');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual(mocks.optionsActname);
    });
  });

  test('queries date', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('_', 'actdate');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      expect(data).toStrictEqual(mocks.optionsActdate);
    });
  });

  test('queries sayname with grep', () => {
    callback.grep = grepCLI;

    const searchParams = new URLSearchParams();

    searchParams.set('_', 'sayname');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      const dataSorted = data.map(sortObject)
        .sort((a, b) => (a.sayname < b.sayname ? -1 : 1));

      expect(dataSorted).toStrictEqual(mocks.optionsSayname);
    });
  });

  test('queries saydate with grep', () => {
    callback.grep = grepCLI;

    const searchParams = new URLSearchParams();

    searchParams.set('_', 'saydate');

    const query = new CSVS(callback);

    return query.select(searchParams).then((data) => {
      const dataSorted = data.map(sortObject)
        .sort((a, b) => (a.saydate < b.saydate ? -1 : 1));

      expect(dataSorted).toStrictEqual(mocks.optionsSaydate);
    });
  });

  test('queries object', async () => {
    callback.readFile = async (path) => mocks.metadirArray[path];

    const searchParams = new URLSearchParams();

    searchParams.set('_', 'export1_tag');

    const query = new CSVS(callback);

    const data = await query.select(searchParams);

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

  test('does nothing on no change', () => (new CSVS(callback)).update(mocks.entry2001)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDefault);
    }));

  test('edits entry', () => (new CSVS(callback)).update(mocks.entry2003Edited)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirEdited);
    }));

  test('adds entry', () => (new CSVS(callback)).update(mocks.entryAdded)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirAdded);
    }));

  test('adds entry when metadir files are empty', () => {
    const editedFilesCustom = { ...mocks.metadirEmpty };

    callback.readFile = (path) => editedFilesCustom[path];

    callback.writeFile = (path, contents) => { editedFilesCustom[path] = contents; };

    return (new CSVS(callback)).update(mocks.entryAdded)
      .then(() => {
        expect(editedFilesCustom).toStrictEqual(mocks.metadirEmptyAdded);
      });
  });

  test('adds entry with random uuid', () => {
    callback.randomUUID = crypto.randomUUID;

    return (new CSVS(callback)).update(mocks.entryAdded)
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.metadirAdded);
      });
  });

  test('falls back to random UUID if callback is not specified', () => {
    delete callback.randomUUID;

    return (new CSVS(callback)).update(mocks.entryAdded)
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

  test('adds entry with array', () => (new CSVS(callback)).update(mocks.entryArrayAdded)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirArrayAdded);
    }));

  test('adds entry with array to empty metadir', () => {
    callback.randomUUID = crypto.randomUUID;

    const editedFilesCustom = { ...mocks.metadirArrayEmpty };

    callback.readFile = (path) => editedFilesCustom[path];

    callback.writeFile = (path, contents) => { editedFilesCustom[path] = contents; };

    return (new CSVS(callback)).update(mocks.entryArray)
      .then(() => {
        expect(editedFilesCustom).toStrictEqual(mocks.metadirArray);
      });
  });

  test('adds array item to entry', () => (new CSVS(callback)).update(mocks.entryAddedArrayItem)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirAddedArrayItem);
    }));

  test('edits array item', () => (new CSVS(callback)).update(mocks.entryEditedArrayItem)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirEditedArrayItem);
    }));

  test('removes array item', () => (new CSVS(callback)).update(mocks.entryDeletedArrayItem)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDeletedArrayItem);
    }));

  test('edits array item of type object', () => (new CSVS(callback)).update(mocks.entryEditedArrayItemObject)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirEditedArrayItemObject);
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

  test('deletes entry', () => (new CSVS(callback)).delete(mocks.entry2003Unedited)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDeleted);
    }));
});

