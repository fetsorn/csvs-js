// find first prop in schema without a trunk
export function findSchemaRoot(schema) {
  return Object.keys(schema).find((prop) => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));
}

// find if there's a path from prop to root before reaching schema root
export function isBranch(schema, root, prop) {
  // console.log('isBranch', root, prop);
  if (schema[prop].trunk === undefined) {
    // console.log('isBranch undefined');
    return false;
  } if (schema[prop].trunk === root) {
    // console.log('isBranch schema root');
    return true;
  } if (isBranch(schema, root, schema[prop].trunk)) {
    // console.log('isBranch trunk root');
    return true;
  }

  return false;
}

// return a list of paths to fetch
// function calculateFetch(searchParams) {}

// cache all metadir csv files as a hashmap
// TODO only fetch a subset of files based
export async function fetchCSV(schemaPath, fetchCallback) {
  // console.log('fetchCSV');

  const csv = {};

  const schemaFile = await fetchCallback(schemaPath);

  csv[schemaPath] = schemaFile;

  const schema = JSON.parse(schemaFile);

  const root = findSchemaRoot(schema);

  const rootIndexPath = `metadir/props/${root}/index.csv`;

  try {
    csv[rootIndexPath] = await fetchCallback(rootIndexPath);
  } catch (e) {
    csv[rootIndexPath] = '\n';
  }

  const promises = Object.keys(schema).map(async (prop) => {
    const propType = schema[prop].type;

    // console.log(`fetching ${prop}`, propType);

    if (prop !== root && propType !== 'rule') {
      const { trunk } = schema[prop];

      let pairFile;

      const pairPath = `metadir/pairs/${trunk}-${prop}.csv`;

      try {
        pairFile = await fetchCallback(pairPath);

        if (pairFile) {
          // console.log('writing pair', pairPath);

          csv[pairPath] = pairFile;
        } else {
          throw Error('file is undefined');
        }
      } catch {
        csv[pairPath] = '\n';

        // console.log(`couldn't fetch ${trunk}-${prop} pair`);
      }

      if (propType !== 'hash') {
        const propDir = schema[prop].dir ?? prop;

        let indexFile;

        const indexPath = `metadir/props/${propDir}/index.csv`;

        try {
          indexFile = await fetchCallback(indexPath);

          if (indexFile) {
            // console.log('writing index', indexPath);

            csv[indexPath] = indexFile;
          } else {
            throw Error('file is undefined');
          }
        } catch {
          csv[indexPath] = '\n';

          // console.log(`couldn't fetch ${propDir} index`);
        }
      }
    }
  });

  // console.log(promises);

  await Promise.all(promises);

  return csv;
}

// split string on newlines and filter empty lines
export function splitLines(str) {
  return str.split('\n').filter((line) => line !== '');
}

// get a line, return a metadir UUID
export function takeUUID(line) {
  return line.slice(0, 64);
}

// get a line, return a metadir value
export function takeValue(line) {
  return line.slice(65);
}

// get a string of metadir lines, return array of uuids
export function takeUUIDs(str) {
  const lines = splitLines(str.replace(/\n*$/, ''));

  const uuids = lines.map((line) => takeUUID(line));

  return uuids;
}

// get a string of metadir lines, return array of uuids
export function takeValues(str) {
  const lines = splitLines(str.replace(/\n*$/, ''));

  const uuids = lines.map((line) => takeValue(line));

  return uuids;
}

// find trunk uuids until schema root
export async function findRootUUIDs({
  schema, prop, propUUIDs, rootOriginal, grepCallback, csv,
}) {
  // console.log('findRootUUIDs', prop, propUUIDs);

  const root = rootOriginal ?? findSchemaRoot(schema);

  const { trunk } = schema[prop];

  // find all pairs with one of the prop uuids
  let pairFile;

  try {
    pairFile = csv[`metadir/pairs/${trunk}-${prop}.csv`];
  } catch {
    pairFile = '\n';
  }

  // console.log(`grep ${pairFile.splitLines('\n').length} trunk ${trunk} uuids`
  //             + `against ${propUUIDs.length} ${prop} uuids`, propUUIDs);

  const trunkLines = await grepCallback(pairFile, propUUIDs.join('\n'));

  const trunkUUIDs = takeUUIDs(trunkLines);

  let rootUUIDs;

  if (trunk === root) {
    // console.log('root reached', trunkUUIDs);

    rootUUIDs = trunkUUIDs;
  } else {
    // console.log(`${prop}'s trunk ${trunk} is not root ${root}`);

    rootUUIDs = await findRootUUIDs({
      schema, prop: trunk, propUUIDs: trunkUUIDs, grepCallback, csv,
    });
  }

  return rootUUIDs;
}

// get all search actions required by searchParams
export function tbn8(schema, base) {
  const filePaths = [];

  // TODO: omit files for branches below base branch
  Object.keys(schema).forEach((branch) => {
    const { trunk } = schema[branch];

    if (trunk !== undefined) {
      filePaths.push(`metadir/pairs/${trunk}-${branch}.csv`);
    }

    // TODO: add exception for other branches without index: arrays, objects
    if (schema[branch].type !== 'hash') {
      filePaths.push(`metadir/props/${schema[branch].dir ?? branch}/index.csv`);
    }
  });

  return filePaths;
}

export function tbn12(searchParams, base, schema, store) {
  // TODO: add exception for groupBy and overviewType
  return Array.from(searchParams.entries()).map(([branch, value]) => (
    schema[branch].trunk === base
      ? {
        branch,
        indexPath: `metadir/props/${schema[branch].dir ?? branch}/index.csv`,
        regex: `,${value}$`,
      } : undefined)).filter(Boolean);
}

// get array of all UUIDs of the branch
export function tbn16(store, schema, branch) {
  const { trunk } = schema[branch];

  return trunk !== undefined
    ? takeValues(store[`metadir/pairs/${trunk}-${branch}.csv`])
    : takeUUIDs(store[`metadir/props/${schema[branch].dir ?? branch}/index.csv`]);
}

// return array of branches above base
export function tbn20(base, schema) {
  // TODO: add support for all branches above base
  // only works for direct leaves of base
  return Object.keys(schema).filter((branch) => schema[branch].trunk === base);
}

export function tbn9(schema) {
  return Object.keys(schema).find((prop) => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));
}
