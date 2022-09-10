// cache all metadir csv files as a hashmap
async function fetchCSV(schema, callback) {
  // console.log("fetchCSV")

  let schema_props = Object.keys(schema);
  let root = schema_props.find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'parent'));

  let csv = {};
  csv[`${root}_index`] = (await callback.fetch(`metadir/props/${root}/index.csv`)).split('\n');
  for (const i in schema_props) {
    let prop = schema_props[i];
    let prop_type = schema[prop]['type'];
    if (prop != root && prop_type != 'rule') {
      let parent = schema[prop]['parent'];
      let pair_file;
      try {
        pair_file = await callback.fetch(`metadir/pairs/${parent}-${prop}.csv`);
      } catch {
        console.log(`couldn't fetch ${parent}-${prop} pair`);
      }
      if (pair_file) {
        csv[`${parent}_${prop}_pair_file`] = pair_file;
        csv[`${parent}_${prop}_pair`] = csv[`${parent}_${prop}_pair_file`].split('\n');
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

// get a string of metadir lines, return array of uuids
function cutUUIDs(str) {
  // console.log("cutUUIDs", str)
  let lines = str.replace(/\n*$/, '').split('\n').filter(line => line != '');
  let uuids = lines.map(line => line.slice(0,64));
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

// find parent uuids until root
async function recurseParents(schema, csv, prop, prop_uuids, callback) {
  // console.log("recurseParents")
  let root = Object.keys(schema).find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'parent'));
  let parent = schema[prop]['parent'];
  // console.log(`grep ${csv[`${parent}_${prop}_pair_file`].split("\n").length} parent ${parent} uuids against ${prop_uuids.length} ${prop} uuids`, prop_uuids)
  // find all pairs with one of the prop uuids
  let parent_lines = await callback.grep(csv[`${parent}_${prop}_pair_file`], prop_uuids.join('\n'));
  let parent_uuids = cutUUIDs(parent_lines);
  if (parent != root) {
    // console.log(`${prop}'s parent ${parent} is not root ${root}`)
    return await recurseParents(schema, csv, parent, parent_uuids, callback);
  } else {
    // console.log("root reached", parent_uuids)
    return parent_uuids;
  }
}

// return root uuids that satisfy search params
async function queryRootUuids(schema, csv, searchParams, callback) {
  // console.log("queryRootUuidsWasm")

  // let schema_props = Object.keys(schema);
  // let root = schema_props.find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'parent'));

  // TODO instead of recursing to root on each search param and resolving grep
  // resolve each non-root parent prop first to save time
  let root_uuids;
  for (const entry of searchParams.entries()) {
    let prop = entry[0];
    if (prop == 'groupBy') { continue; }
    let prop_dir = schema[prop]['dir'] ?? prop;
    let prop_value = entry[1];
    let root_uuids_new;
    if (schema[prop]['type'] == 'rule') {
      let rulefile = await callback.fetch(`metadir/props/${prop_dir}/rules/${prop_value}.rule`);
      let parent = schema[prop]['parent'];
      let parent_dir = schema[prop]['parent'] ?? parent;
      // console.log(`grep ${parent} in ${parent_dir}_index_file for ${prop_value}.rule`)
      let parent_lines = await callback.grep(csv[`${parent_dir}_index_file`], rulefile);
      let parent_uuids = cutUUIDs(parent_lines);
      root_uuids_new = await recurseParents(schema, csv, parent, parent_uuids, callback);
    } else {
      // console.log(`grep ${prop} in ${prop_dir}_index_file for ,${prop_value}$\n`)
      let prop_lines = await callback.grep(csv[`${prop_dir}_index_file`], `,${prop_value}$\n`);
      let prop_uuids = cutUUIDs(prop_lines);
      root_uuids_new = await recurseParents(schema, csv, prop, prop_uuids, callback);
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
        let parent = schema[prop]['parent'];
        let pair = csv[`${parent}_${prop}_pair`] ?? [''];
        let parent_uuid = uuids[parent];
        let prop_uuid = lookup(pair, parent_uuid) ?? falseRegex;
        uuids[prop] = prop_uuid;
        let prop_dir = schema[prop]['dir'] ?? prop;
        let index = csv[`${prop_dir}_index`] ?? [];
        let prop_value = lookup(index, prop_uuid);
        // console.log(prop, parent, parent_uuid, prop_uuid, prop_value)
        // console.log("get", prop, prop_uuid, parent, parent_uuid, prop_value)
        if ( prop_value != undefined ) {
          if (prop_type == 'string') {
            // console.log("try to parse", prop, prop_value)
            prop_value = JSON.parse(prop_value);
          }
          let label = schema[prop]['label'] ?? prop;
          // console.log("set", prop, prop_uuid, parent, parent_uuid, prop_value)
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

  const events = buildEvents(schema, csv, searchParams, root_uuids);

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
    let parent = schema[prop]['parent'];
    index_file = await callback.fetch(`metadir/pairs/${parent}-${prop}.csv`);
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
