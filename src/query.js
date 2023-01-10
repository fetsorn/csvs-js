// each prop can have one trunk and many branches
// prop without a trunk is root
function findRoot(schema) {
  return Object.keys(schema).find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));
}

// cache all metadir csv files as a hashmap
async function fetchCSV(schemaPath, callback) {
  // console.log('fetchCSV');
  const csv = {};

  const schemaFile = await callback.fetch(schemaPath);
  csv[schemaPath] = schemaFile;
  const schema = JSON.parse(schemaFile);
  const schemaProps = Object.keys(schema);
  const root = findRoot(schema);

  const rootIndexPath = `metadir/props/${root}/index.csv`;
  csv[rootIndexPath] = await callback.fetch(rootIndexPath);
  for (const i in schemaProps) {
    const prop = schemaProps[i];
    const propType = schema[prop]['type'];
    if (prop != root && propType != 'rule') {
      const trunk = schema[prop]['trunk'];
      let pairFile;
      const pairPath = `metadir/pairs/${trunk}-${prop}.csv`;
      try {
        pairFile = await callback.fetch(pairPath);
        if (pairFile) {
          csv[pairPath] = pairFile;
        } else {
          throw('file is undefined');
        }
      } catch {
        csv[pairPath] = '\n';
        // console.log(`couldn't fetch ${trunk}-${prop} pair`);
      }
      if (propType != 'hash') {
        const propDir = schema[prop]['dir'] ?? prop;
        let indexFile;
        const indexPath = `metadir/props/${propDir}/index.csv`;
        try {
          indexFile = await callback.fetch(indexPath);
          if (indexFile) {
            csv[indexPath] = indexFile;
          } else {
            throw('file is undefined');
          }
        } catch {
          csv[indexPath] = '\n';
          // console.log(`couldn't fetch ${propDir} index`);
        }
      }
    }
  }

  return csv;
}

function split(str) {
  return str.split('\n').filter(line => line != '');
}

function takeUUID(line) {
  return line.slice(0,64);
}

function takeValue(line) {
  return line.slice(65);
}

// get a string of metadir lines, return array of uuids
function takeUUIDs(str) {
  const lines = split(str.replace(/\n*$/, ''));
  const uuids = lines.map(line => takeUUID(line));
  return uuids;
}

// get a string of metadir lines, return array of uuids
function takeValues(str) {
  const lines = split(str.replace(/\n*$/, ''));
  const uuids = lines.map(line => takeValue(line));
  return uuids;
}

export function grep(contentFile, patternFile) {
  const contentLines = split(contentFile);
  const patternLines = split(patternFile);
  const searchLines = patternLines.map(pattern => contentLines.filter(line => (new RegExp(pattern)).test(line)));
  const matches = [...new Set(searchLines.flat())].join('\n');
  return matches;
}

// find trunk uuids until root
async function findRootUUIDs(schema, prop, propUUIDs, callback) {
  // console.log("recurseTrunkes")
  const root = findRoot(schema);
  const trunk = schema[prop]['trunk'];
  // find all pairs with one of the prop uuids
  const pairFile = await callback.fetch(`metadir/pairs/${trunk}-${prop}.csv`);
  // console.log(`grep ${pairFile.split("\n").length} trunk ${trunk} uuids against ${propUUIDs.length} ${prop} uuids`, propUUIDs)
  const trunkLines = await callback.grep(pairFile, propUUIDs.join('\n'));
  const trunkUUIDs = takeUUIDs(trunkLines);
  let rootUUIDs;
  if (trunk == root) {
    // console.log("root reached", trunkUUIDs)
    rootUUIDs = trunkUUIDs;
  } else {
    // console.log(`${prop}'s trunk ${trunk} is not root ${root}`)
    rootUUIDs = await findRootUUIDs(schema, trunk, trunkUUIDs, callback);
  }
  return rootUUIDs;
}

// return an array of events from metadir that satisfy search params
export async function queryMetadir(searchParams, callback, prefetch = true, schemaPath = 'metadir.json') {

  if (prefetch === true) {
    const csv = await fetchCSV(schemaPath, callback);
    const _fetch = callback.fetch;
    callback.fetch = async (path) => {
      const cache = csv[path];
      if (cache) {
        return cache;
      } else {
        console.log('actual fetch', path);
        return await _fetch(path);
      }
    };
  }

  const schemaFile = await callback.fetch(schemaPath);
  const schema = JSON.parse(schemaFile);

  const root = findRoot(schema);

  // for each searchParam, take prop uuids, then take corresponding root uuids
  let rootUUIDs;

  // if no search params, return all root uuids
  if (Array.from(searchParams.entries()).length === 0) {
    const rootDir = schema[root]['dir'] ?? root;
    const rootLines = await callback.fetch(`metadir/props/${rootDir}/index.csv`);
    rootUUIDs = takeUUIDs(rootLines);
  } else {
    for (const entry of searchParams.entries()) {
      const prop = entry[0];
      if (prop == 'groupBy') { continue; }
      const propDir = schema[prop]['dir'] ?? prop;
      const propValue = entry[1];
      let rootUUIDsNew;
      if (schema[prop]['type'] == 'rule') {
        const rulefile = await callback.fetch(`metadir/props/${propDir}/rules/${propValue}.rule`);
        const trunk = schema[prop]['trunk'];
        const trunkDir = schema[prop]['dir'] ?? trunk;
        // console.log(`grep ${trunk} in ${trunkDir} index for ${propValue}.rule`)
        const indexFile = await callback.fetch(`metadir/props/${trunkDir}/index.csv`);
        const trunkLines = await callback.grep(indexFile, rulefile);
        const trunkUUIDs = takeUUIDs(trunkLines);
        rootUUIDsNew = await findRootUUIDs(schema, trunk, trunkUUIDs, callback);
      } else {
        // console.log(`grep ${prop} in ${propDir} index for ,${propValue}$\n`)
        const indexFile = await callback.fetch(`metadir/props/${propDir}/index.csv`);
        const propLines = await callback.grep(indexFile, `,${propValue}$\n`);
        const propUUIDs = takeUUIDs(propLines);
        rootUUIDsNew = await findRootUUIDs(schema, prop, propUUIDs, callback);
      }
      if (!rootUUIDs) {
        rootUUIDs = rootUUIDsNew;
      } else {
        // console.log(`grep ${rootUUIDsNew.length} new uuids ${rootUUIDs.length} uuids\n`)
        const rootLines = await callback.grep(rootUUIDsNew.join('\n'), rootUUIDs.join('\n'));
        rootUUIDs = takeUUIDs(rootLines);
      }
    }
  }

  // type Prop = string
  // type UUID = string
  // uuids: Map<Prop, [UUID]>
  const uuids = new Map();
  uuids.set(root, rootUUIDs);

  // type UUID = string
  // type Trunk = UUID
  // type Leaf = UUID
  // TrunkLinks = Map<Trunk, Leaf>
  // pairs: Map<Prop, TrunkLinks>
  const pairs = new Map();

  const schemaProps = Object.keys(schema);

  // enqueue props whose trunkes aren't processed yet
  const queue = [...schemaProps];
  // type Prup = string
  // processed: Map<Prop, Boolean>
  const processed = new Map();
  processed.set(root, true);

  for (const prop of queue) {
    // console.log(`pair for ${prop}`);
    const propType = schema[prop]['type'];
    // skip root and rule props
    if (prop != root && propType != 'rule') {
      const trunk = schema[prop]['trunk'];
      // if prop's trunk is not processed, process this prop later
      if (!processed.get(trunk)) {
        queue.push(prop);
      } else {
        processed.set(prop, true);
        const pairFile = await callback.fetch(`metadir/pairs/${trunk}-${prop}.csv`);
        if (pairFile) {
          const trunkUUIDs = uuids.get(trunk);
          if (trunkUUIDs && trunkUUIDs != '') {
            const propUUIDStr = await callback.grep(pairFile, trunkUUIDs.join('\n'));
            // console.log(`grepped for ${trunkUUIDs} and found ${propUUIDStr}`);
            if (propUUIDStr) {
              const propUUIDLines = split(propUUIDStr);

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

  // type UUID = string
  // type Root = UUID
  // type Leaf = UUID
  // RootLinks: Map<Root, Leaf>
  // fields: Map<Prop, RootLinks>
  const fields = new Map();

  for (const prop of schemaProps) {
    const trunkLinks = pairs.get(prop);
    if (trunkLinks) {
      fields.set(prop, new Map());
      for (const rootUUID of rootUUIDs) {
        let trunk = schema[prop]['trunk'];
        const path = [];
        while (trunk != root) {
          path.push(trunk);
          trunk = schema[trunk]['trunk'];
        }
        let trunkUUID = rootUUID;
        for (const element of path) {
          trunkUUID = pairs.get(element).get(trunkUUID);
        }
        const propUUID = pairs.get(prop).get(trunkUUID);
        fields.get(prop).set(rootUUID, propUUID);
      }
    }
  }

  // type UUID = string
  // type Value = string
  // values: Map<UUID, Value>
  const values = new Map();

  for (const prop of schemaProps) {
    // console.log(`index for ${prop}`);
    const propType = schema[prop]['type'];
    if (propType != 'rule' && propType != 'hash') {
      const propDir = schema[prop]['dir'] ?? prop;
      const indexFile = await callback.fetch(`metadir/props/${propDir}/index.csv`);
      // console.log(`${prop} index is ${index}`);
      if (indexFile) {
        const propUUIDs = uuids.get(prop);
        if (propUUIDs) {
          const propValuesStr = await callback.grep(indexFile, propUUIDs.join('\n'));
          // console.log(`grepped for ${propUUIDs} and found ${propValuesStr}`);
          const propValuesLines = split(propValuesStr);

          // set value of propUUID of this event
          for (const line of propValuesLines) {
            const propUUID = takeUUID(line);
            let propValue = takeValue(line);
            if (propType == 'string') {
              propValue = JSON.parse(propValue);
            }
            values.set(propUUID, propValue);
          }
        }
      }
    }
  }

  // type Event = { [string]: Value }
  // events: Map<string, [Event]>
  const events = new Map();

  for (const prop of schemaProps) {
    const propLabel = schema[prop]['label'] ?? prop;
    for (const rootUUID of rootUUIDs) {
      const event = events.get(rootUUID);
      if (!event) {
        events.set(rootUUID, {});
      }

      if (prop == root) {
        events.get(rootUUID)['UUID'] = rootUUID;
        events.get(rootUUID)[propLabel] = values.get(rootUUID);
      } else {
        const rootLinks = fields.get(prop);
        if (rootLinks) {
          const propUUID = rootLinks.get(rootUUID);
          const propValue = values.get(propUUID);
          events.get(rootUUID)[propLabel] = propValue;
        }
      }
    }
  }

  const arr = Array.from(events.values());

  return arr;
}

// return an array of unique values of a prop
export async function queryOptions(prop, callback, doGrep = false, schemaPath = 'metadir.json') {

  const schema = JSON.parse(await callback.fetch(schemaPath));

  const propType = schema[prop]['type'];

  let lines;

  const trunk = schema[prop]['trunk'];
  const pairFile = await callback.fetch(`metadir/pairs/${trunk}-${prop}.csv`);
  if (propType === 'hash') {
    lines = pairFile;
  } else {
    const propDir = schema[prop]['dir'] ?? prop;
    lines = await callback.fetch(`metadir/props/${propDir}/index.csv`);
    if (doGrep) {
      const propUUIDs = takeValues(pairFile);
      lines = await callback.grep(lines, propUUIDs.join('\n'));
    }
  }

  const values = split(lines)
    .map(line => {
      const valueRaw = takeValue(line);
      if (propType == 'string') {
        const valueUnescaped = JSON.parse(valueRaw);
        return valueUnescaped;
      } else {
        return valueRaw;
      }
    });

  const valuesUnique = [...new Set(values)];

  return valuesUnique;
}
