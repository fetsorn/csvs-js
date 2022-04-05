import { grep } from '@fetsorn/wasm-grep'
import { digestMessage, digestRandom } from './util'

// cache all metadir csv files as a hashmap
async function fetchCSV(schema, fetch) {

  let schema_props = Object.keys(schema)
  let root = schema_props.find(prop => !schema[prop].hasOwnProperty("parent"))

  var csv = {}
  csv[`${root}_index`] = (await fetch(`metadir/props/${root}/index.csv`)).split('\n')
  for (var i in schema_props) {
    let prop = schema_props[i]
     if (prop != root) {
       let parent = schema[prop]['parent']
       let pair_file = await fetch(`metadir/pairs/${parent}-${prop}.csv`)
       if (pair_file) {
         csv[`${parent}_${prop}_pair_file`] = pair_file
         csv[`${parent}_${prop}_pair`] = csv[`${parent}_${prop}_pair_file`].split('\n')
       }
       let prop_dir = schema[prop]['dir'] ?? prop
       let index_file = await fetch(`metadir/props/${prop_dir}/index.csv`)
       if (index_file) {
         csv[`${prop_dir}_index_file`] = index_file
         csv[`${prop_dir}_index`] = csv[`${prop_dir}_index_file`].split('\n')
       }
     }
  }

  return csv
}

// return root uuids that satisfy search params
async function queryRootUuidsWasm(schema, csv, searchParams, fetch) {

  let schema_props = Object.keys(schema)
  let root = schema_props.find(prop => !schema[prop].hasOwnProperty("parent"))

  var root_uuids = []
  if (searchParams.has('pathrule')) {
    var pathrule = searchParams.get('pathrule')
    let rulefile = await fetch(`metadir/props/pathrule/rules/${pathrule}.rule`)
    let filepath_grep = await grep(csv['filepath_index_file'], rulefile)
    let filepath_lines = filepath_grep.replace(/\n*$/, "").split("\n").filter(line => line != "")
    let filepath_uuids = filepath_lines.map(line => line.slice(0,64))
    let filepath_uuids_list = filepath_uuids.join("\n") + "\n"
    let datum_grep = await grep(csv['datum_filepath_pair_file'], filepath_uuids_list)
    root_uuids = datum_grep.replace(/\n*$/, "").split("\n").map(line => line.slice(0,64))
  } else {
    for (var entry of searchParams.entries()) {
      // if query is not found in the metadir
      // fallback to an impossible regexp
      // so that the filter ouputs empty list
      let prop = entry[0]
      if (prop == "groupBy") { continue }
      let entry_value = entry[1]
      let prop_dir = schema[prop]['dir']
      let prop_grep = await grep(csv[`${prop_dir}_index_file`], `,${entry_value}$\n`)
      let prop_lines = prop_grep.replace(/\n*$/, "").split("\n").filter(line => line != "")
      let prop_uuids = prop_lines.map(line => line.slice(0,64))
      let prop_uuids_list = prop_uuids.join("\n") + "\n"
      let prop_pair_grep
      if (!root_uuids) {
        // find all pairs with one of the prop uuids
        prop_pair_grep = await grep(csv[`${root}_${prop}_pair_file`], prop_uuids_list)
      } else {
        // find all pairs with one of previously found root uuids
        let root_uuids_list = root_uuids.join("\n") + "\n"
        let oldroot_pair_grep = await grep(csv[`${root}_${prop}_pair_file`], root_uuids_list)
        // find all pairs with one of the prop uuids
        prop_pair_grep = await grep(oldroot_pair_grep, prop_uuids_list)
      }
      // get root uuids of all found pairs
      let prop_pair_lines = prop_pair_grep.replace(/\n*$/, "").split("\n").filter(line => line != "")
      root_uuids = prop_pair_lines.map(line => line.slice(0,64))
    }
  }

  return root_uuids
}

// return root uuids that satisfy search params
async function queryRootUuids(schema, csv, searchParams, fetch) {

  var root_uuids
  for (var entry of searchParams.entries()) {
    let prop = entry[0]
    if (prop == "groupBy") { continue }
    let entry_value = entry[1]
    let entry_value_regexp = new RegExp("," + entry_value + "$")
    let prop_dir = schema[prop]['dir']
    let prop_line = csv[`${prop_dir}_index`].find(line => entry_value_regexp.test(line))
    let prop_uuid = prop_line.slice(0,64)
    let parent = schema[prop]['parent']
    if (!root_uuids) {
      root_uuids = csv[`${parent}_${prop}_pair`]
        .filter(line => (new RegExp(prop_uuid)).test(line))
        .map(line => line.slice(0,64))
    } else {
      // find all pairs with one of previously found root uuids
      oldroot_pairs = csv[`${parent}_${prop}_pair`]
        .filter(line => root_uuids.includes(line.slice(0,64)))
      // find all pairs with one of the prop uuids
      prop_pairs = oldroot_pairs
        .filter(line => (new RegExp(prop_uuid)).test(line))
      // get root uuids of all found pairs
      root_uuids = prop_pairs.map(line => line.slice(0,64))
    }
  }

  return root_uuids

}

function lookup(lines, uuid) {
  let line = lines.find(line => (new RegExp(uuid)).test(line))
  if (line) {
    let value = line.slice(65)
    return value
  } else {
    return undefined
  }
}

// build an event for every root uuid
async function buildEvents(schema, csv, searchParams, root_uuids) {

  let schema_props = Object.keys(schema)
  let root = schema_props.find(prop => !schema[prop].hasOwnProperty("parent"))

  var events = []
  // for every datum_uuid build an event
  for(var i in root_uuids) {

    let root_uuid = root_uuids[i]

    let event = {}

    event.UUID = root_uuid
    let root_value = lookup(csv[`${root}_index`],root_uuid)
    let root_label = schema[root]['label']
    if (root_value != "") {
      root_value = JSON.parse(root_value)
      event[root_label] = root_value
    }

    // TODO can this not be hardcoded?
    if (searchParams.has('pathrule')) {
      let filepath_uuid = lookup(csv['datum_filepath_pair'],root_uuid)
      let moddate_uuid = lookup(csv['filepath_moddate_pair'],filepath_uuid)
      // if datum doesn't have a date to group by, skip it
      if (moddate_uuid === "") {
        continue
      }
      let moddate = lookup(csv['date_index'],moddate_uuid)
      let filepath_escaped = lookup(csv['filepath_index'],filepath_uuid)
      let filepath = JSON.parse(filepath_escaped)
      event.FILE_PATH = filepath
      event.GUEST_DATE = moddate
      event.HOST_DATE = moddate
      event.GUEST_NAME = "fetsorn"
      event.HOST_NAME = "fetsorn"
    } else {

      let uuids = {}
      uuids[root] = root_uuid

      // if query is not found in the metadir
      // fallback to an impossible regexp
      // so that next search on uuid fails
      let falseRegex = "\\b\\B"
      // TODO add queue to support the second level of props
      for (var i in schema_props) {
        let prop = schema_props[i]
        if (prop != root) {
          let parent = schema[prop]['parent']
          let pair = csv[`${parent}_${prop}_pair`] ?? ['']
          let parent_uuid = uuids[parent]
          let prop_uuid = lookup(pair, parent_uuid) ?? falseRegex
          uuids[prop] = prop_uuid
          let prop_dir = schema[prop]['dir'] ?? prop
          let index = csv[`${prop_dir}_index`] ?? []
          let prop_value = lookup(index, prop_uuid)
          // console.log("get", prop, prop_uuid, parent, parent_uuid, prop_value)
          if ( prop_value != undefined ) {
            let prop_type = schema[prop]['type']
            if (prop_type == "string") {
              // console.log("try to parse", prop, prop_value)
              prop_value = JSON.parse(prop_value)
            }
            let label = schema[prop]['label'] ?? prop
            // console.log("set", prop, prop_uuid, parent, parent_uuid, prop_value)
            event[label] = prop_value
          }
        }
      }
    }

    // console.log(event)
    // {"UUID": "", "HOST_DATE": "", "HOST_NAME": "", "DATUM": ""}
    events.push(event)
  }

  return events
}

// return an array of events from metadir that satisfy search params
async function queryMetadir(searchParams, callback, useWasm = false, schema_name = "metadir.json") {

  let schema = JSON.parse(await callback.fetch(schema_name))

  var csv = await fetchCSV(schema, callback.fetch)

  var root_uuids = useWasm
      ? await queryRootUuidsWasm(schema, csv, searchParams, callback.fetch)
      : await queryRootUuids(schema, csv, searchParams, callback.fetch)

  var events = await buildEvents(schema, csv, searchParams, root_uuids)

  return events
}

function includes(file, line) {
  return file.includes(line)
}
function prune(file, regex) {
  return file.split('\n').filter(line => !(new RegExp(regex)).test(line)).join('\n')
}

// remove event with root_uuid from metadir
async function deleteEvent(root_uuid, callback, schema_name = "metadir.json") {

  let schema = JSON.parse(await callback.fetch(schema_name))

  let schema_props = Object.keys(schema)
  let root = schema_props.find(prop => !schema[prop].hasOwnProperty("parent"))
  let props = schema_props.filter(prop => schema[prop].parent == root)

  let index_path = `metadir/props/${root}/index.csv`
  let index_file = await callback.fetch(index_path)
  if (index_file) {
    await callback.write(index_path,
                         prune(index_file, root_uuid))
  }

  for (var i in props) {
    let prop = props[i]
    let pair_path = `metadir/pairs/${root}-${prop}.csv`
    let pair_file = await callback.fetch(pair_path)
    if (pair_file) {
      await callback.write(pair_path,
                           prune(pair_file, root_uuid))
    }
  }
}

// overwrite event in metadir
async function editEvent(event, callback, schema_name = "metadir.json") {

  let schema = JSON.parse(await callback.fetch(schema_name))

  let schema_props = Object.keys(schema)
  let root = schema_props.find(prop => !schema[prop].hasOwnProperty("parent"))

  // list event props that match the schema
  let event_keys = Object.keys(event)
  var event_props = []
  for (var i in event_keys) {
    let key = event_keys[i]
    let prop = schema_props.find(prop => schema[prop].label == key || prop == key)
    if (prop) {
      event_props.push(prop)
    }
  }

  if (!event.UUID) {
    // allow to mock digestRandom for testing
    // if (!callback.digestRandom) {
      // callback.digestRandom = digestRandom
    // }
    event.UUID = await digestRandom()
  }

  var uuids = {}
  for (var i in event_props) {
    let prop = event_props[i]
    let prop_label = schema[prop].label
    let prop_type = schema[prop].type
    let prop_value = event[prop] ? event[prop] : event[prop_label]

    let prop_uuid
    if (prop != root) {
      prop_uuid = await digestMessage(prop_value)
    } else {
      prop_uuid = event.UUID
    }
    uuids[prop] = prop_uuid

    if (prop_type != "hash") {
      let prop_dir = schema[prop]['dir'] ?? prop
      let index_path = `metadir/props/${prop_dir}/index.csv`
      let index_file = await callback.fetch(index_path)
      if (prop_type == "string") {
        prop_value = JSON.stringify(prop_value)
      }
      let index_line = `${prop_uuid},${prop_value}\n`
      if (!includes(index_file, index_line)) {
        await callback.write(index_path,
                             prune(index_file, prop_uuid) + index_line)
      }
    }
    if (prop != root) {
      let parent = schema[prop].parent
      let parent_uuid = uuids[parent]
      let pair_path = `metadir/pairs/${parent}-${prop}.csv`
      let pair_file = await callback.fetch(pair_path)
      let pair_line = `${parent_uuid},${prop_uuid}\n`
      if (!includes(pair_file, pair_line)) {
        await callback.write(pair_path,
                             prune(pair_file, parent_uuid) + pair_line)
      }
    }
  }

  return event

}

export {
  queryMetadir,
  editEvent,
  deleteEvent
}
