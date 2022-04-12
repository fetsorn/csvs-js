import { grep } from '@fetsorn/wasm-grep'
import { digestMessage, digestRandom } from './util'

// cache all metadir csv files as a hashmap
async function fetchCSV(schema, fetch) {
  // console.log("fetchCSV")

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
       if (schema[prop]['type'] != "hash") {
         let prop_dir = schema[prop]['dir'] ?? prop
         let index_file = await fetch(`metadir/props/${prop_dir}/index.csv`)
         if (index_file) {
           csv[`${prop_dir}_index_file`] = index_file
           csv[`${prop_dir}_index`] = csv[`${prop_dir}_index_file`].split('\n')
         }
       }
     }
  }

  return csv
}

// get a string of metadir lines, return array of uuids
function cutUUIDs(grep) {
  // console.log("cutUUIDs")
  let lines = grep.replace(/\n*$/, "").split("\n").filter(line => line != "")
  let uuids = lines.map(line => line.slice(0,64))
  // console.log(lines, uuids)
  return uuids
}

// find parent uuids until root
async function recurseParents(schema, csv, prop, prop_uuids) {
  // console.log("recurseParents")
  let root = Object.keys(schema).find(prop => !schema[prop].hasOwnProperty("parent"))
  let parent = schema[prop]['parent']
  console.log(`search ${csv[`${parent}_${prop}_pair_file`].split("\n").length} parent ${parent} uuids against ${prop_uuids.length} ${prop} uuids`, prop_uuids)
  // find all pairs with one of the prop uuids
  let parent_lines = await grep(csv[`${parent}_${prop}_pair_file`], prop_uuids.join("\n"))
  let parent_uuids = cutUUIDs(parent_lines)
  if (parent != root) {
    // console.log(`${prop}'s parent ${parent} is not root ${root}`)
    return await recurseParents(schema, csv, parent, parent_uuids)
  } else {
    // console.log("root reached", parent_uuids)
    return parent_uuids
  }
}

// return root uuids that satisfy search params
async function queryRootUuidsWasm(schema, csv, searchParams, fetch) {
  // console.log("queryRootUuidsWasm")

  let schema_props = Object.keys(schema)
  let root = schema_props.find(prop => !schema[prop].hasOwnProperty("parent"))

  // TODO instead of recursing to root on each search param and resolving grep
  // resolve each non-root parent prop first to save time
  var root_uuids
  for (var entry of searchParams.entries()) {
    let prop = entry[0]
    if (prop == "groupBy") { continue }
    let prop_dir = schema[prop]['dir'] ?? prop
    let entry_value = entry[1]
    var root_uuids_new
    if (schema[prop]['type'] == "rule") {
      let rulefile = await fetch(`metadir/props/${prop_dir}/rules/${entry_value}.rule`)
      let parent = schema[prop]['parent']
      let parent_lines = await grep(csv[`${parent}_index_file`], rulefile)
      let parent_uuids = cutUUIDs(parent_lines)
      root_uuids_new = await recurseParents(schema, csv, parent, parent_uuids)
    } else {
      console.log(`grep ${prop} in ${prop_dir}_index_file for ,${entry_value}$\n`)
      let prop_lines = await grep(csv[`${prop_dir}_index_file`], `,${entry_value}$\n`)
      let prop_uuids = cutUUIDs(prop_lines)
      root_uuids_new = await recurseParents(schema, csv, prop, prop_uuids)
    }
    if (!root_uuids) {
      root_uuids = root_uuids_new
    } else {
      root_uuids = await grep(root_uuids_new.join("\n"), root_uuids)
    }
  }

  return root_uuids
}

// return root uuids that satisfy search params
async function queryRootUuids(schema, csv, searchParams, fetch) {

  var root_uuids
  for (var entry of searchParams.entries()) {
    let prop = entry[0]
    if (prop == "groupBy" || schema[prop]['type'] == "rule") { continue }
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

// get a string of metadir lines, return value that corresponds to uuid
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
  console.log(`build ${root_uuids.length} events`)

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

    let uuids = {}
    uuids[root] = root_uuid

    // if query is not found in the metadir
    // fallback to an impossible regexp
    // so that next search on uuid fails
    let falseRegex = "\\b\\B"
    // TODO add queue to support the second level of props out of config order
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
        // console.log(prop, parent, parent_uuid, prop_uuid, prop_value)
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
