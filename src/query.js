// cache all metadir csv files as a hashmap
async function fetchCSV(schema, callback) {
  // console.log("fetchCSV")

  let schema_props = Object.keys(schema);
  let root = schema_props.find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'parent'));

  let csv = {};
  csv[`${root}_index_file`] = await callback.fetch(`metadir/props/${root}/index.csv`);
  csv[`${root}_index`] = csv[`${root}_index_file`].split('\n');
  for (const i in schema_props) {
    let prop = schema_props[i];
    let prop_type = schema[prop]['type'];
    if (prop != root && prop_type != 'rule') {
      let branch = schema[prop]['parent'];
      let pair_file;
      try {
        pair_file = await callback.fetch(`metadir/pairs/${branch}-${prop}.csv`);
      } catch {
        console.log(`couldn't fetch ${branch}-${prop} pair`);
      }
      if (pair_file) {
        csv[`${branch}_${prop}_pair_file`] = pair_file;
        csv[`${branch}_${prop}_pair`] = csv[`${branch}_${prop}_pair_file`].split('\n');
      }
      if (prop_type != 'hash') {
        let prop_dir = schema[prop]['dir'] ?? prop;
        let index_file;
        try {
          index_file = await callback.fetch(`metadir/props/${prop_dir}/index.csv`);
        } catch {
          console.log(`couldn't fetch ${prop_dir} index`);
        }
        if (index_file) {
          csv[`${prop_dir}_index_file`] = index_file;
          csv[`${prop_dir}_index`] = csv[`${prop_dir}_index_file`].split('\n');
        }
      }
    }
  }

  return csv;
}

// TODO: replace all `.split('\n').filter(line => line != '')`
function split(str) {
  return str.split('\n').filter(line => line != '')
  // const lines = str.split('\n')
  // if (lines[-1] === '') {
  //   lines.pop()
  // }
  // return lines
}

function killUUID(line) {
  return line.slice(0,64);
}

function killValue(line) {
  return line.slice(65);
}

// get a string of metadir lines, return array of uuids
function cutUUIDs(str) {
  // console.log("cutUUIDs", str)
  let lines = str.replace(/\n*$/, '').split('\n').filter(line => line != '');
  let uuids = lines.map(line => line.slice(0,64));
  // console.log(lines, uuids)
  return uuids;
}

// get a string of metadir lines, return array of values
function cutValues(str) {
  // console.log("cutUUIDs", str)
  let lines = str.replace(/\n*$/, '').split('\n').filter(line => line != '');
  let uuids = lines.map(line => line.slice(65));
  // console.log(lines, uuids)
  return uuids;
}

export function grep(contentFile, patternFile) {
  const contentLines = contentFile.split('\n').filter(line => line != '');
  const patternLines = patternFile.split('\n').filter(line => line != '');
  const searchLines = patternLines.map(pattern => contentLines.filter(line => (new RegExp(pattern)).test(line)));
  const matches = [...new Set(searchLines.flat())].join('\n');
  return matches;
}

// find branch uuids until root
async function recurseBranches(schema, csv, prop, prop_uuids, callback) {
  // console.log("recurseBranches")
  let root = Object.keys(schema).find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'parent'));
  let branch = schema[prop]['parent'];
  // console.log(`grep ${csv[`${branch}_${prop}_pair_file`].split("\n").length} branch ${branch} uuids against ${prop_uuids.length} ${prop} uuids`, prop_uuids)
  // find all pairs with one of the prop uuids
  let branch_lines = await callback.grep(csv[`${branch}_${prop}_pair_file`], prop_uuids.join('\n'));
  let branch_uuids = cutUUIDs(branch_lines);
  if (branch != root) {
    // console.log(`${prop}'s branch ${branch} is not root ${root}`)
    return await recurseBranches(schema, csv, branch, branch_uuids, callback);
  } else {
    // console.log("root reached", branch_uuids)
    return branch_uuids;
  }
}

// return root uuids that satisfy search params
async function queryRootUuids(schema, csv, searchParams, callback) {
  // console.log("queryRootUuidsWasm")

  // let schema_props = Object.keys(schema);
  // let root = schema_props.find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'parent'));

  // TODO instead of recursing to root on each search param and resolving grep
  // resolve each non-root branch prop first to save time
  let root_uuids;
  for (const entry of searchParams.entries()) {
    let prop = entry[0];
    if (prop == 'groupBy') { continue; }
    let prop_dir = schema[prop]['dir'] ?? prop;
    let prop_value = entry[1];
    let root_uuids_new;
    if (schema[prop]['type'] == 'rule') {
      let rulefile = await callback.fetch(`metadir/props/${prop_dir}/rules/${prop_value}.rule`);
      let branch = schema[prop]['parent'];
      let branch_dir = schema[prop]['parent'] ?? branch;
      // console.log(`grep ${branch} in ${branch_dir}_index_file for ${prop_value}.rule`)
      let branch_lines = await callback.grep(csv[`${branch_dir}_index_file`], rulefile);
      let branch_uuids = cutUUIDs(branch_lines);
      root_uuids_new = await recurseBranches(schema, csv, branch, branch_uuids, callback);
    } else {
      // console.log(`grep ${prop} in ${prop_dir}_index_file for ,${prop_value}$\n`)
      let prop_lines = await callback.grep(csv[`${prop_dir}_index_file`], `,${prop_value}$\n`);
      let prop_uuids = cutUUIDs(prop_lines);
      root_uuids_new = await recurseBranches(schema, csv, prop, prop_uuids, callback);
    }
    if (!root_uuids) {
      root_uuids = root_uuids_new;
    } else {
      // console.log(`grep ${root_uuids_new.length} new uuids ${root_uuids.length} uuids\n`)
      let root_lines = await callback.grep(root_uuids_new.join('\n'), root_uuids.join('\n'));
      root_uuids = cutUUIDs(root_lines);
    }
  }

  return root_uuids;
}

// get a string of metadir lines, return value that corresponds to uuid
function lookup(lines, uuid) {
  let line = lines.find(line => (new RegExp(uuid)).test(line));
  if (line) {
    let value = line.slice(65);
    return value;
  } else {
    return undefined;
  }
}

async function buildEvents_(schema, csv, searchParams, root_uuids, callback) {

  let schema_props = Object.keys(schema);
  let root = schema_props.find(
    prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'parent')
  );

  // type Prop = string
  // type UUID = string
  // uuids: Map<Prop, [UUID]>
  const uuids = new Map();
  uuids.set(root, root_uuids);

  // type UUID = string
  // type Branch = UUID
  // type Leaf = UUID
  // Links = Map<Leaf, Branch>
  // pairs: Map<Prop, Links>
  const pairs = new Map();

  // TODO add queue for out-of-order schema
  for (const prop of schema_props) {
    // console.log(`pair for ${prop}`);
    const prop_type = schema[prop]['type'];
    // skip root and rule props
    if (prop != root && prop_type != 'rule') {
      let branch = schema[prop]['parent'];
      let pair = csv[`${branch}_${prop}_pair_file`];
      // console.log(`${branch}-${prop} pair is ${pair}`);
      if (pair) {
        let branch_uuids = uuids.get(branch);
        if (branch_uuids) {
          let prop_uuid_grep = await callback.grep(pair, branch_uuids.join('\n'));
          // console.log(`grepped for ${branch_uuids} and found ${prop_uuid_grep}`);
          if (prop_uuid_grep) {
            let prop_uuid_lines = split(prop_uuid_grep);

            // cache branch_uuid of each leaf_uuid to find root_uuid later
            pairs.set(prop, new Map());
            for (const line of prop_uuid_lines) {
              const branch_uuid = killUUID(line);
              const leaf_uuid = killValue(line);
              // console.log(`caching ${leaf_uuid}-${branch_uuid} link`);
              pairs.get(prop).set(leaf_uuid, branch_uuid);
            }
            let prop_uuids = prop_uuid_lines.map((line) => killValue(line)) ;
            // console.log(`caching ${prop_uuids}`);
            // cache list of leaf_uuids to grep for values later
            uuids.set(prop, prop_uuids);
          }
        }
      }
    }
  }

  // type Event = { [string]: Value }
  // events: Map<string, [Event]>
  let events = new Map();

  for (const prop of schema_props) {
    // console.log(`index for ${prop}`);
    const prop_type = schema[prop]['type'];
    if (prop_type != 'rule') {
      const prop_dir = schema[prop]['dir'] ?? prop;
      const index = csv[`${prop_dir}_index_file`];
      // console.log(`${prop} index is ${index}`);
      if (index) {
        const prop_uuids = uuids.get(prop);
        if (prop_uuids) {
          const prop_values_grep = await callback.grep(index, prop_uuids.join('\n'));
          // console.log(`grepped for ${prop_uuids} and found ${prop_values_grep}`);
          const prop_values_lines = split(prop_values_grep);

          // set value of prop_uuid of this event
          const prop_label = schema[prop]['label'] ?? prop;
          for (const line of prop_values_lines) {
            const prop_uuid = killUUID(line);
            let prop_value = killValue(line);
            if (prop_type == 'string') {
              prop_value = JSON.parse(prop_value);
            }
            // console.log(`processing ${prop_uuid}-${prop_value} link`);

            //
            let root_uuid;
            if (prop == root) {
              // console.log(`prop ${prop} is root: ${root_uuid}`);
              root_uuid = prop_uuid;
            } else {
              let leaf = prop;
              let leaf_uuid = prop_uuid;
              let branch = schema[prop]['parent'];
              let branch_uuid;
              while (branch != root) {
                branch_uuid = pairs.get(leaf).get(leaf_uuid);
                // console.log(`branch ${branch} is not root: ${branch_uuid}`);
                leaf = branch;
                leaf_uuid = branch_uuid;
                branch = schema[branch]['parent'];
              }
              root_uuid = pairs.get(leaf).get(leaf_uuid);
              // console.log(`prop ${branch} is root: ${root_uuid}`);
            }

            const event = events.get(root_uuid);
            if (!event) {
              events.set(root_uuid, {});
            }

            if (prop == root) {
              events.get(root_uuid)['UUID'] = root_uuid;
            }

            // console.log(`caching event field ${prop_label}: ${prop_value}`);
            events.get(root_uuid)[prop_label] = prop_value;
          }
        }
      }
    }
  }

  const arr = Array.from(events.values());

  return arr;
}

// build an event for every root uuid
function buildEvents(schema, csv, searchParams, root_uuids) {
  // console.log(`build ${root_uuids.length} events`)

  let schema_props = Object.keys(schema);
  let root = schema_props.find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'parent'));

  let events = [];
  // for every datum_uuid build an event
  for (const i in root_uuids) {

    let root_uuid = root_uuids[i];

    let event = {};

    event.UUID = root_uuid;
    let root_value = lookup(csv[`${root}_index`],root_uuid);
    let root_label = schema[root]['label'];
    if (root_value != '') {
      root_value = JSON.parse(root_value);
      event[root_label] = root_value;
    }

    let uuids = {};
    uuids[root] = root_uuid;

    // if query is not found in the metadir
    // fallback to an impossible regexp
    // so that next search on uuid fails
    let falseRegex = '\\b\\B';
    // TODO add queue to support the second level of props out of config order
    for (const i in schema_props) {
      let prop = schema_props[i];
      let prop_type = schema[prop]['type'];
      if (prop != root && prop_type != 'rule') {
        let branch = schema[prop]['parent'];
        let pair = csv[`${branch}_${prop}_pair`] ?? [''];
        let branch_uuid = uuids[branch];
        let prop_uuid = lookup(pair, branch_uuid) ?? falseRegex;
        uuids[prop] = prop_uuid;
        let prop_dir = schema[prop]['dir'] ?? prop;
        let index = csv[`${prop_dir}_index`] ?? [];
        let prop_value = lookup(index, prop_uuid);
        // console.log(prop, branch, branch_uuid, prop_uuid, prop_value)
        // console.log("get", prop, prop_uuid, branch, branch_uuid, prop_value)
        if ( prop_value != undefined ) {
          if (prop_type == 'string') {
            // console.log("try to parse", prop, prop_value)
            prop_value = JSON.parse(prop_value);
          }
          let label = schema[prop]['label'] ?? prop;
          // console.log("set", prop, prop_uuid, branch, branch_uuid, prop_value)
          event[label] = prop_value;
        }
      }
    }

    // console.log(event)
    // {"UUID": "", "HOST_DATE": "", "HOST_NAME": "", "DATUM": ""}
    events.push(event);
  }

  return events;
}

// return an array of events from metadir that satisfy search params
export async function queryMetadir(searchParams, callback, schema_name = 'metadir.json') {

  let schema = JSON.parse(await callback.fetch(schema_name));

  const csv = await fetchCSV(schema, callback);

  const root_uuids = await queryRootUuids(schema, csv, searchParams, callback);

  const events = buildEvents_(schema, csv, searchParams, root_uuids, callback);

  return events;
}

// return an array of unique values of a prop
export async function queryOptions(prop, callback, schema_name = 'metadir.json') {

  let schema = JSON.parse(await callback.fetch(schema_name));

  let prop_type = schema[prop]['type'];

  let index_file;
  if (prop_type != 'hash') {
    let prop_dir = schema[prop]['dir'] ?? prop;
    index_file = await callback.fetch(`metadir/props/${prop_dir}/index.csv`);
  } else {
    let branch = schema[prop]['parent'];
    index_file = await callback.fetch(`metadir/pairs/${branch}-${prop}.csv`);
  }

  let values = index_file.split('\n')
    .filter(line => (line != ''))
    .map(line => {
      let v_escaped = line.slice(65);
      if (prop_type == 'string') {
        return JSON.parse(v_escaped);
      } else {
        return v_escaped;
      }
    });

  let values_unique = [...new Set(values)];

  return values_unique;
}
