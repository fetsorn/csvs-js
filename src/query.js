/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
// each prop in the schema
// is seen as a branch on a tree
// a branch can have one trunk and many leaves
// a branch without a trunk is called a root

// find first prop in schema without a trunk
function findSchemaRoot(schema) {
  return Object.keys(schema).find((prop) => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));
}

// find if there's a path from prop to root before reaching schema root
function isBranch(schema, root, prop) {
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
async function fetchCSV(schemaPath, fetchCallback) {
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
function splitLines(str) {
  return str.split('\n').filter((line) => line !== '');
}

// get a line, return a metadir UUID
function takeUUID(line) {
  return line.slice(0, 64);
}

// get a line, return a metadir value
function takeValue(line) {
  return line.slice(65);
}

// get a string of metadir lines, return array of uuids
function takeUUIDs(str) {
  const lines = splitLines(str.replace(/\n*$/, ''));

  const uuids = lines.map((line) => takeUUID(line));

  return uuids;
}

// get a string of metadir lines, return array of uuids
function takeValues(str) {
  const lines = splitLines(str.replace(/\n*$/, ''));

  const uuids = lines.map((line) => takeValue(line));

  return uuids;
}

// return all lines in contentFile that match regex lines in patternFile
export function grep(contentFile, patternFile) {
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

// find trunk uuids until schema root
async function findRootUUIDs({
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

// find root uuids that match searchParams
async function getRootUUIDs({
  root, searchParams, grepCallback, schema, csv,
}) {
  // for each searchParam, take prop uuids, then take corresponding root uuids
  let rootUUIDs = [];

  // console.log("getRootUUIDS", root)

  const searchEntries = Array.from(searchParams.entries()).filter(
    ([key]) => key !== 'groupBy' && key !== 'overviewType',
  );

  // if no search params, return all root uuids
  if (Array.from(searchEntries).length === 0) {
    if (schema[root].type === 'object') {
      const { trunk } = schema[root];

      const rootLines = csv[`metadir/pairs/${trunk}-${root}.csv`];

      rootUUIDs = [...new Set(takeValues(rootLines))];
    } else {
      const rootDir = schema[root].dir ?? root;

      const rootLines = csv[`metadir/props/${rootDir}/index.csv`];

      rootUUIDs = takeUUIDs(rootLines);
    }
  } else {
    for (const searchEntry of searchEntries) {
      const prop = searchEntry[0];

      if (Object.prototype.hasOwnProperty.call(schema, prop)) {
        const propDir = schema[prop].dir ?? prop;

        const propType = schema[prop].type;

        const propValue = propType === 'string' || propType === 'text' ? JSON.stringify(searchEntry[1]) : searchEntry[1];

        const { trunk } = schema[prop];

        let rootUUIDsNew;

        if (trunk === undefined) {
          const indexFile = csv[`metadir/props/${propDir}/index.csv`];

          const propLines = await grepCallback(indexFile, `,${propValue}$\n`);

          rootUUIDsNew = takeUUIDs(propLines);
        } else if (propType === 'rule') {
          const rulefile = csv[`metadir/props/${propDir}/rules/${propValue}.rule`];

          const trunkDir = schema[prop].dir ?? trunk;

          // console.log(`grep ${trunk} in ${trunkDir} index for ${propValue}.rule`)

          const indexFile = csv[`metadir/props/${trunkDir}/index.csv`];

          const trunkLines = await grepCallback(indexFile, rulefile);

          const trunkUUIDs = takeUUIDs(trunkLines);

          rootUUIDsNew = await findRootUUIDs({
            schema, trunk, trunkUUIDs, rootOriginal: root, grepCallback, csv,
          });
        } else if (propType === 'array') {
        // skip
        } else if (schema[trunk]?.type === 'array') {
        // search by UUID
        } else {
        // console.log(`grep ${prop} in ${propDir} index for ,${propValue}$\n`);

          const indexFile = csv[`metadir/props/${propDir}/index.csv`];

          // console.log(`metadir/props/${propDir}/index.csv`, indexFile);

          const propLines = await grepCallback(indexFile, `,${propValue}$\n`);

          const propUUIDs = takeUUIDs(propLines);

          rootUUIDsNew = await findRootUUIDs({
            schema, prop, propUUIDs, rootOriginal: root, grepCallback, csv,
          });
        }

        if (rootUUIDs.length === 0 && rootUUIDsNew !== undefined) {
          rootUUIDs = rootUUIDsNew;
        } else {
        // console.log(`grep ${rootUUIDsNew.length} new uuids ${rootUUIDs.length} uuids\n`);

          const rootLines = await grepCallback(rootUUIDsNew.join('\n'), rootUUIDs.join('\n'));

          rootUUIDs = takeUUIDs(rootLines);
        }
      }
    }
  }

  // console.log("csvs-js root uuids", rootUUIDs);

  return rootUUIDs;
}

// get pairs for every prop in schema
async function getPairs({
  csv, schema, root, rootUUIDs, grepCallback,
}) {
  // type Prop = string
  // type UUID = string
  // uuids: Map<Prop, [UUID]>
  const uuids = new Map();

  // console.log("10", root, rootUUIDs)
  uuids.set(root, rootUUIDs);

  // type UUID = string
  // type Trunk = UUID
  // type Leaf = UUID
  // TrunkLinks = Map<Trunk, Leaf | [Leaf]>
  // pairs: Map<Prop, TrunkLinks>
  const pairs = new Map();

  const schemaProps = Object.keys(schema).filter((p) => isBranch(schema, root, p));

  // console.log(schemaProps);

  // enqueue props whose trunks aren't processed yet
  const queue = [...schemaProps];

  // type Prup = string
  // processed: Map<Prop, Boolean>
  const processed = new Map();

  processed.set(root, true);

  for (const prop of queue) {
    // console.log("11")

    // console.log(`pair for ${prop}`);

    const propType = schema[prop].type;

    // skip root and rule props
    if (prop !== root && propType !== 'rule') {
      const { trunk } = schema[prop];

      // if prop's trunk is not processed, process this prop later
      if (!processed.get(trunk)) {
        // console.log(`${trunk} not processed, readding ${prop}`);

        queue.push(prop);
      } else {
        processed.set(prop, true);

        const pairFile = csv[`metadir/pairs/${trunk}-${prop}.csv`];

        // console.log("12", pairFile)

        if (pairFile) {
          if (schema[trunk].type === 'array') {
            const trunkUUIDs = uuids.get(trunk);

            if (trunkUUIDs && trunkUUIDs !== '') {
              const propUUIDStr = await grepCallback(pairFile, trunkUUIDs.join('\n'));

              if (propUUIDStr) {
                const propUUIDLines = splitLines(propUUIDStr);

                pairs.set(prop, new Map());

                for (const line of propUUIDLines) {
                  const trunkUUID = takeUUID(line);

                  if (pairs.get(prop).get(trunkUUID) === undefined) {
                    pairs.get(prop).set(trunkUUID, []);
                  }

                  const leafUUID = takeValue(line);

                  // console.log(`caching ${leafUUID}-${trunkUUID} link`);

                  pairs.get(prop).get(trunkUUID).push(leafUUID);
                }
                const propUUIDs = propUUIDLines.map((line) => takeValue(line));

                uuids.set(prop, [...new Set(propUUIDs)]);
              }
            }
          } else {
            const trunkUUIDs = uuids.get(trunk);

            if (trunkUUIDs && trunkUUIDs !== '') {
              const propUUIDStr = await grepCallback(pairFile, trunkUUIDs.join('\n'));

              // console.log(`grepped for ${trunkUUIDs} and found ${propUUIDStr}`);

              if (propUUIDStr) {
                const propUUIDLines = splitLines(propUUIDStr);

                // cache trunkUUID of each leafUUID to find rootUUID later
                pairs.set(prop, new Map());

                for (const line of propUUIDLines) {
                  const trunkUUID = takeUUID(line);

                  const leafUUID = takeValue(line);

                  // console.log(`caching ${leafUUID}-${trunkUUID} link`);

                  pairs.get(prop).set(trunkUUID, leafUUID);
                }

                const propUUIDs = propUUIDLines.map((line) => takeValue(line));

                // console.log(`caching ${propUUIDs}`);

                // cache list of leafUUIDs to grep for values later
                uuids.set(prop, [...new Set(propUUIDs)]);
              }
            }
          }
        }
      }
    }
  }

  // console.log("csvs-js: pairs", pairs);

  return { uuids, pairs };
}

// return map of root to all uuids of each prop
function getFields({
  schema, rootUUIDs, root, pairs,
}) {
  // console.log('getFields');

  // console.log('root:', root);

  const schemaProps = Object.keys(schema);

  // type UUID = string
  // type Root = UUID
  // type Leaf = UUID
  // RootLinks: Map<Root, Leaf | [Leaf]>
  // fields: Map<Prop, RootLinks>
  const fields = new Map();

  for (const prop of schemaProps) {
    const trunkLinks = pairs.get(prop);

    // console.log(`prop: ${prop}, trunkToBranchLinks: `, trunkLinks);

    if (trunkLinks) {
      fields.set(prop, new Map());

      for (const rootUUID of rootUUIDs) {
        let { trunk } = schema[prop];
        // console.log('----rootUUID', rootUUID);

        // console.log('------trunk', trunk);
        const path = [];

        while (trunk !== root) {
          // console.log('--------trunk !== root');
          // console.log('--------trunk', trunk);
          // console.log('--------path', path);

          path.unshift(trunk);

          trunk = schema[trunk].trunk;
        }

        // console.log('------path', path);

        let trunkUUID = rootUUID;

        // for every element of prop path from deepest to shallow
        // get the uuid of branch or array of branches
        for (const element of path) {
          // console.log('--------element', element);
          // console.log('--------trunkUUID', trunkUUID);

          trunkUUID = pairs.get(element).get(trunkUUID);

          // console.log('--------trunkUUID new', trunkUUID);
        }

        if (schema[trunk].type === 'array') {
          const propUUIDs = trunkUUID.map((uuid) => pairs.get(prop).get(uuid));

          fields.get(prop).set(rootUUID, propUUIDs);
        } else {
          const propUUID = pairs.get(prop).get(trunkUUID);

          if (propUUID) {
            // console.log(`--------set ${prop} -> ${rootUUID} -> ${propUUID}`);
            fields.get(prop).set(rootUUID, propUUID);
          }
        }
      }
    }
  }

  // console.log('csvs-js: fields', fields);

  return fields;
}

// return map of values of each uuid in schema
async function getValues({
  schema, csv, grepCallback, pairs, fields, uuids, root, rootUUIDs,
}) {
  const schemaProps = Object.keys(schema).filter((p) => p === root || isBranch(schema, root, p));

  // console.log('getValues');

  // type UUID = string
  // type Value = string | object
  // values: Map<UUID, Value>
  const values = new Map();

  for (const prop of schemaProps) {
    // console.log(`1 prop: ${prop}`);

    const propType = schema[prop].type;

    // console.log(`--propType: ${propType}`);

    if (propType !== 'rule' && propType !== 'hash') {
      const propDir = schema[prop].dir ?? prop;

      const indexFile = csv[`metadir/props/${propDir}/index.csv`];

      // console.log(`${prop} index is ${index}`);

      if (indexFile) {
        const propUUIDs = uuids.get(prop);

        // console.log('--no index file');
        if (propUUIDs) {
          const propValuesStr = await grepCallback(indexFile, propUUIDs.join('\n'));

          // console.log(`grepped for ${propUUIDs} and found ${propValuesStr}`);

          const propValuesLines = splitLines(propValuesStr);

          // set value of propUUID of this entry
          for (const line of propValuesLines) {
            const propUUID = takeUUID(line);

            let propValue = takeValue(line);

            if (propType === 'string') {
              propValue = JSON.parse(propValue);
            }

            // console.log(`--set ${propUUID} ${propValue}`);
            values.set(propUUID, propValue);
          }
        }
      }
    }
  }

  // console.log("csvs-js: values", values);

  for (const prop of schemaProps) {
    // console.log(`2 prop: ${prop}`);
    const propLabel = schema[prop].label ?? prop;

    for (const rootUUID of rootUUIDs) {
      // console.log(`--rootUUID: ${rootUUID}`);
      const rootLinks = fields.get(prop);

      if (rootLinks) {
        // console.log('----rootToBranchLinks:', rootLinks);

        const propUUID = rootLinks.get(rootUUID);

        const { trunk } = schema[prop];

        if (schema[prop].type === 'object') {
          // console.log('----prop is object');
          if (Array.isArray(propUUID)) {
            propUUID.forEach((uuid) => {
              // console.log(`----set ${uuid}`, { UUID: uuid, ITEM_NAME: prop });
              values.set(uuid, { UUID: uuid, ITEM_NAME: prop });
            });
          } else if (propUUID) {
            // console.log(`----set ${propUUID}`, { UUID: propUUID, ITEM_NAME: prop });
            values.set(propUUID, { UUID: propUUID, ITEM_NAME: prop });
          }
        } else if (schema[trunk].type === 'object') {
          // console.log('----trunk is object');
          let trunkUUID;

          if (trunk === root) {
            trunkUUID = rootUUID;
          } else {
            const trunkRootLinks = fields.get(trunk);

            trunkUUID = trunkRootLinks.get(rootUUID);
          }

          if (Array.isArray(trunkUUID)) {
            // console.log('------value is array');
            trunkUUID.forEach((uuid) => {
              const propUUIDactual = pairs.get(prop).get(uuid);

              // console.log(`----set values[${uuid}][${propLabel}]`, values.get(propUUIDactual));

              values.get(uuid)[propLabel] = values.get(propUUIDactual);
            });
          } else {
            // console.log('------value is not array');
            if (values.get(trunkUUID) === undefined) {
              // console.log(`----set values[${trunkUUID}]`, { ITEM_NAME: trunk });
              values.set(trunkUUID, { ITEM_NAME: trunk });
            }

            // console.log(`----set values[${trunkUUID}][${propLabel}]`, values.get(propUUID));

            values.get(trunkUUID)[propLabel] = values.get(propUUID);
          }
        }
      }
    }
  }

  // console.log("csvs-js: values", values);

  return values;
}

// return array of objects
function getEntries({
  values, fields, rootUUIDs, schema, root,
}) {
  const schemaProps = Object.keys(schema);

  // console.log('getEntries');

  // type UUID = string
  // type Label = string
  // type Value = string | object
  // type Entry = { [Label]: Value }
  // entries: Map<UUID, Entry>
  const entries = new Map();

  for (const prop of schemaProps) {
    const propLabel = schema[prop].label ?? prop;

    // console.log('--prop:', prop);

    for (const rootUUID of rootUUIDs) {
      const entry = entries.get(rootUUID);

      // console.log('----rootUUID:', rootUUID);

      if (!entry) {
        entries.set(rootUUID, {});
      }

      if (prop === root) {
        // console.log('------prop is root');
        if (schema[prop].type === 'object') {
          entries.set(rootUUID, values.get(rootUUID));

          // console.log('------set root object UUID');
          entries.get(rootUUID).UUID = rootUUID;
        } else {
          entries.get(rootUUID).UUID = rootUUID;

          // console.log('------set root prop UUID');
          entries.get(rootUUID)[propLabel] = values.get(rootUUID);
        }
      } else {
        const rootLinks = fields.get(prop);

        if (rootLinks) {
          const propUUID = rootLinks.get(rootUUID);

          if (schema[prop].type === 'array') {
            // console.log('------prop is array');
            // console.log('------set empty array', rootUUID,
            //             propLabel, { UUID: propUUID, items: [] });
            if (propUUID) {
              entries.get(rootUUID)[propLabel] = { UUID: propUUID, items: [] };
            }
          } else {
            // console.log('------prop is not array');
            const { trunk } = schema[prop];

            const trunkLabel = schema[trunk].label;

            if (schema[trunk].type !== 'object') {
              // console.log('------trunk is not object');
              if (Array.isArray(propUUID)) {
                // console.log('--------value is array');
                propUUID.forEach((uuid) => {
                  const propValue = values.get(uuid);

                  // console.log('------push array item', rootUUID, trunkLabel, propValue);
                  entries.get(rootUUID)[trunkLabel].items.push(propValue);
                });
              } else {
                const propValue = values.get(propUUID);

                if (schema[trunk].type !== 'array') {
                  // console.log('------set prop', rootUUID, propLabel, propValue);
                  entries.get(rootUUID)[propLabel] = propValue;
                }
              }
            }
          }
        }
      }
    }
  }

  // console.log("csvs-js: entries", entries);

  const arr = Array.from(entries.values());

  return arr;
}

// get searchParams and a Map of csv paths/contents, return an array of values
async function query({
  searchParams, schema, csv, root, grepCallback,
}) {
  const rootUUIDs = await getRootUUIDs({
    root, searchParams, grepCallback, schema, csv,
  });
  // console.log('5 rootUUIDs', rootUUIDs);

  const { pairs, uuids } = await getPairs({
    csv, schema, root, rootUUIDs, grepCallback,
  });
  // console.log('6 pairs', pairs);
  // console.log('6 uuids', uuids);

  const fields = getFields({
    schema, rootUUIDs, root, pairs,
  });
  // console.log('7 fields', fields);

  const values = await getValues({
    schema, csv, grepCallback, pairs, fields, uuids, root, rootUUIDs,
  });
  // console.log('8 values', values);

  const entries = getEntries({
    values, fields, rootUUIDs, schema, root,
  });
  // console.log('9 entries', entries);

  return entries;
}

// return an array of entries from metadir that satisfy search params
export async function queryMetadir({ searchParams, callback, rootOriginal }) {
  const schemaPath = 'metadir.json';

  const csv = await fetchCSV(schemaPath, callback.fetch);

  // console.log("1")
  // console.log(csv);

  const schema = JSON.parse(csv[schemaPath]);
  // console.log("2")

  const root = rootOriginal ?? findSchemaRoot(schema);

  // console.log("3")

  const entries = await query({
    searchParams, schema, csv, root, grepCallback: callback.grep,
  });

  return entries;
}

// return an array of unique values of a prop
export async function queryOptions(prop, callback, doGrep = false, schemaPath = 'metadir.json') {
  const schema = JSON.parse(await callback.fetch(schemaPath));

  const propType = schema[prop].type;

  let lines;

  const { trunk } = schema[prop];

  if (propType === 'hash') {
    const pairFile = await callback.fetch(`metadir/pairs/${trunk}-${prop}.csv`);

    lines = pairFile;
  } else if (propType === 'object') {
    // find all UUIDs
    const pairFile = await callback.fetch(`metadir/pairs/${trunk}-${prop}.csv`);

    lines = pairFile;

    const searchParams = new URLSearchParams();

    const queryResult = await queryMetadir({ searchParams, callback, rootOriginal: prop });

    // console.log(queryResult);

    // build objects
    // TODO: refactor to abstract "build object" function
    // common with queryMetadir

    const objs = queryResult;

    return objs;
  } else {
    const propDir = schema[prop].dir ?? prop;

    lines = await callback.fetch(`metadir/props/${propDir}/index.csv`);

    if (trunk && doGrep) {
      const pairFile = await callback.fetch(`metadir/pairs/${trunk}-${prop}.csv`);

      const propUUIDs = takeValues(pairFile);

      lines = await callback.grep(lines, propUUIDs.join('\n'));
    }
  }

  const values = splitLines(lines).map((line) => {
    const valueRaw = takeValue(line);

    if (propType === 'string') {
      const valueUnescaped = JSON.parse(valueRaw);

      return valueUnescaped;
    }
    return valueRaw;
  });

  const valuesUnique = [...new Set(values)];

  return valuesUnique;
}
