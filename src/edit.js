function includes(file, line) {
  if (file) {
    return file.includes(line);
  } else {
    return false;
  }
}

function prune(file, regex) {
  if (file) {
    return file.split('\n').filter(line => !(new RegExp(regex)).test(line)).join('\n');
  } else {
    return '';
  }
}

async function digestMessage(message) {
  const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash as buffer
  const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}

// remove event with root_uuid from metadir
export async function deleteEvent(root_uuid, callback, schema_name = 'metadir.json') {

  let schema = JSON.parse(await callback.fetch(schema_name));

  let schema_props = Object.keys(schema);
  let root = schema_props.find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'parent'));
  let props = schema_props.filter(prop => schema[prop].parent == root);

  let index_path = `metadir/props/${root}/index.csv`;
  let index_file = await callback.fetch(index_path);
  if (index_file) {
    await callback.write(index_path,
      prune(index_file, root_uuid));
  }

  for (const i in props) {
    let prop = props[i];
    let pair_path = `metadir/pairs/${root}-${prop}.csv`;
    let pair_file = await callback.fetch(pair_path);
    if (pair_file) {
      await callback.write(pair_path,
        prune(pair_file, root_uuid));
    }
  }
}

// overwrite event in metadir
export async function editEvent(_event, callback, schema_name = 'metadir.json') {

  let event = { ..._event };

  let schema = JSON.parse(await callback.fetch(schema_name));

  let schema_props = Object.keys(schema);
  let root = schema_props.find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'parent'));

  // list event props that match the schema
  let event_keys = Object.keys(event);
  let event_props = [];
  for (const i in event_keys) {
    let key = event_keys[i];
    let prop = schema_props.find(prop => schema[prop].label == key || prop == key);
    if (prop) {
      event_props.push(prop);
    }
  }

  if (!event.UUID) {
    event.UUID = await digestMessage(callback.random());
  }

  let uuids = {};
  for (const i in event_props) {
    let prop = event_props[i];
    let prop_label = schema[prop].label;
    let prop_type = schema[prop].type;
    let prop_value = event[prop] ? event[prop] : event[prop_label];

    let prop_uuid;
    if (prop != root) {
      prop_uuid = await digestMessage(prop_value);
    } else {
      prop_uuid = event.UUID;
    }
    uuids[prop] = prop_uuid;

    if (prop_type != 'hash') {
      let prop_dir = schema[prop]['dir'] ?? prop;
      let index_path = `metadir/props/${prop_dir}/index.csv`;
      let index_file = await callback.fetch(index_path);
      if (prop_type == 'string') {
        prop_value = JSON.stringify(prop_value);
      }
      let index_line = `${prop_uuid},${prop_value}\n`;
      if (!includes(index_file, index_line)) {
        await callback.write(index_path,
          prune(index_file, prop_uuid) + index_line);
      }
    }
    if (prop != root) {
      let parent = schema[prop].parent;
      let parent_uuid = uuids[parent];
      let pair_path = `metadir/pairs/${parent}-${prop}.csv`;
      let pair_file = await callback.fetch(pair_path);
      let pair_line = `${parent_uuid},${prop_uuid}\n`;
      if (!includes(pair_file, pair_line)) {
        await callback.write(pair_path,
          prune(pair_file, parent_uuid) + pair_line);
      }
    }
  }

  return event;
}
