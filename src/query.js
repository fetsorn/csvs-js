function findRoot(schema) {
  return Object.keys(schema).find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'parent'));
}

// cache all metadir csv files as a hashmap
async function fetchCSV(schema, callback) {
  // console.log("fetchCSV")

  const schemaProps = Object.keys(schema);
  const root = findRoot(schema);

  const csv = {};
  const rootIndexPath = `metadir/props/${root}/index.csv`;
  csv[rootIndexPath] = await callback.fetch(rootIndexPath);
  for (const i in schemaProps) {
    const prop = schemaProps[i];
    const propType = schema[prop]['type'];
    if (prop != root && propType != 'rule') {
      const branch = schema[prop]['parent'];
      let pairFile;
      const pairPath = `metadir/pairs/${branch}-${prop}.csv`;
      try {
        pairFile = await callback.fetch(pairPath);
      } catch {
        console.log(`couldn't fetch ${branch}-${prop} pair`);
      }
      if (pairFile) {
        csv[pairPath] = pairFile;
      }
      if (propType != 'hash') {
        const propDir = schema[prop]['dir'] ?? prop;
        let indexFile;
        const indexPath = `metadir/props/${propDir}/index.csv`;
        try {
          indexFile = await callback.fetch(indexPath);
        } catch {
          console.log(`couldn't fetch ${propDir} index`);
        }
        if (indexFile) {
          csv[indexPath] = indexFile;
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

export function grep(contentFile, patternFile) {
  const contentLines = split(contentFile);
  const patternLines = split(patternFile);
  const searchLines = patternLines.map(pattern => contentLines.filter(line => (new RegExp(pattern)).test(line)));
  const matches = [...new Set(searchLines.flat())].join('\n');
  return matches;
}

// find branch uuids until root
async function recurseBranches(schema, prop, propUUIDs, callback) {
  // console.log("recurseBranches")
  const root = findRoot(schema);
  const branch = schema[prop]['parent'];
  // find all pairs with one of the prop uuids
  const pairFile = await callback.fetch(`metadir/pairs/${branch}-${prop}.csv`);
  // console.log(`grep ${pairFile.split("\n").length} branch ${branch} uuids against ${propUUIDs.length} ${prop} uuids`, propUUIDs)
  const branchLines = await callback.grep(pairFile, propUUIDs.join('\n'));
  const branchUUIDs = takeUUIDs(branchLines);
  if (branch != root) {
    // console.log(`${prop}'s branch ${branch} is not root ${root}`)
    return await recurseBranches(schema, branch, branchUUIDs, callback);
  } else {
    // console.log("root reached", branchUUIDs)
    return branchUUIDs;
  }
}

// return an array of events from metadir that satisfy search params
export async function queryMetadir(searchParams, callback, prefetch = true, schemaPath = 'metadir.json') {

  const schema = JSON.parse(await callback.fetch(schemaPath));

  if (prefetch == true) {
    const csv = await fetchCSV(schema, callback);
    const _fetch = callback.fetch;
    callback.fetch = async (path) => {
      const cache = csv[path];
      if (cache) {
        return cache;
      } else {
        return await _fetch(path);
      }
    };
  }

  const root = findRoot(schema);

  // for each searchParam, take prop uuids, then take corresponding root uuids
  let rootUUIDs;

  // if no search params, return all root uuids
  if (!searchParams.entries().length) {
    console.log('empty search');
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
        const branch = schema[prop]['parent'];
        const branchDir = schema[prop]['dir'] ?? branch;
        // console.log(`grep ${branch} in ${branchDir} index for ${propValue}.rule`)
        const indexFile = await callback.fetch(`metadir/props/${branchDir}/index.csv`);
        const branchLines = await callback.grep(indexFile, rulefile);
        const branchUUIDs = takeUUIDs(branchLines);
        rootUUIDsNew = await recurseBranches(schema, branch, branchUUIDs, callback);
      } else {
        // console.log(`grep ${prop} in ${propDir} index for ,${propValue}$\n`)
        const indexFile = await callback.fetch(`metadir/props/${propDir}/index.csv`);
        const propLines = await callback.grep(indexFile, `,${propValue}$\n`);
        const propUUIDs = takeUUIDs(propLines);
        rootUUIDsNew = await recurseBranches(schema, prop, propUUIDs, callback);
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
  // type Branch = UUID
  // type Leaf = UUID
  // BranchLinks = Map<Branch, Leaf>
  // pairs: Map<Prop, BranchLinks>
  const pairs = new Map();

  const schemaProps = Object.keys(schema);

  // enqueue props whose branches aren't processed yet
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
      const branch = schema[prop]['parent'];
      // if prop's branch is not processed, process this prop later
      if (!processed.get(branch)) {
        queue.push(prop);
      } else {
        processed.set(prop, true);
        const pairFile = await callback.fetch(`metadir/pairs/${branch}-${prop}.csv`);
        if (pairFile) {
          const branchUUIDs = uuids.get(branch);
          if (branchUUIDs && branchUUIDs != '') {
            const propUUIDStr = await callback.grep(pairFile, branchUUIDs.join('\n'));
            // console.log(`grepped for ${branchUUIDs} and found ${propUUIDStr}`);
            if (propUUIDStr) {
              const propUUIDLines = split(propUUIDStr);

              // cache branchUUID of each leafUUID to find rootUUID later
              pairs.set(prop, new Map());
              for (const line of propUUIDLines) {
                const branchUUID = takeUUID(line);
                const leafUUID = takeValue(line);
                // console.log(`caching ${leafUUID}-${branchUUID} link`);
                pairs.get(prop).set(branchUUID, leafUUID);
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
    const branchLinks = pairs.get(prop);
    if (branchLinks) {
      fields.set(prop, new Map());
      for (const rootUUID of rootUUIDs) {
        let branch = schema[prop]['parent'];
        const path = [];
        while (branch != root) {
          path.push(branch);
          branch = schema[branch]['parent'];
        }
        let branchUUID = rootUUID;
        for (const element of path) {
          branchUUID = pairs.get(element).get(branchUUID);
        }
        const propUUID = pairs.get(prop).get(branchUUID);
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
export async function queryOptions(prop, callback, schemaPath = 'metadir.json') {

  const schema = JSON.parse(await callback.fetch(schemaPath));

  const propType = schema[prop]['type'];

  let indexFile;
  if (propType != 'hash') {
    const propDir = schema[prop]['dir'] ?? prop;
    indexFile = await callback.fetch(`metadir/props/${propDir}/index.csv`);
  } else {
    const branch = schema[prop]['parent'];
    indexFile = await callback.fetch(`metadir/pairs/${branch}-${prop}.csv`);
  }

  const values = split(indexFile)
    .map(line => {
      const vEscaped = takeValue(line);
      if (propType == 'string') {
        return JSON.parse(vEscaped);
      } else {
        return vEscaped;
      }
    });

  const valuesUnique = [...new Set(values)];

  return valuesUnique;
}
