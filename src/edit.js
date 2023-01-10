function prune(file, regex) {
  if (file) {
    return file.split('\n').filter(line => !(new RegExp(regex)).test(line)).join('\n');
  } else {
    return '';
  }
}

// remove entry with rootUUID from metadir
export async function deleteEntry(rootUUID, callback, schemaPath = 'metadir.json') {

  let schema = JSON.parse(await callback.fetch(schemaPath));

  let schemaProps = Object.keys(schema);
  let root = schemaProps.find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));
  let props = schemaProps.filter(prop => schema[prop]['trunk'] == root);

  let indexPath = `metadir/props/${root}/index.csv`;
  let indexFile = await callback.fetch(indexPath);
  if (indexFile) {
    await callback.write(indexPath,
      prune(indexFile, rootUUID));
  }

  for (const i in props) {
    let prop = props[i];
    let pairPath = `metadir/pairs/${root}-${prop}.csv`;
    let pairFile = await callback.fetch(pairPath);
    if (pairFile) {
      await callback.write(pairPath,
        prune(pairFile, rootUUID));
    }
  }
}

function includes(file, line) {
  if (file) {
    return file.includes(line);
  } else {
    return false;
  }
}

export async function digestMessage(message) {
  const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash as buffer
  const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}

// overwrite entry in metadir
export async function editEntry(entryEdited, callback, schemaPath = 'metadir.json') {

  let entry = { ...entryEdited };

  let schema = JSON.parse(await callback.fetch(schemaPath));

  let schemaProps = Object.keys(schema);
  let root = schemaProps.find(prop => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));

  // list entry props that match the schema
  let entryKeys = Object.keys(entry);
  let entryProps = [];
  for (const i in entryKeys) {
    let key = entryKeys[i];
    let prop = schemaProps.find(prop => schema[prop].label == key || prop == key);
    if (prop) {
      entryProps.push(prop);
    }
  }

  if (!entry.UUID) {
    const random = callback.random ?? crypto.randomUUID;
    const uuid = await digestMessage(random());
    entry.UUID = uuid;
  }

  let uuids = {};
  uuids[root] = entry.UUID;

  // TODO add queue for props whose trunk is not yet processed
  for (const i in entryProps) {
    let prop = entryProps[i];
    let propLabel = schema[prop]['label'];
    let propType = schema[prop]['type'];
    let propValue = entry[prop] ? entry[prop] : entry[propLabel];

    let propUUID;
    if (prop != root) {
      propUUID = await digestMessage(propValue);
    } else {
      propUUID = entry.UUID;
    }
    uuids[prop] = propUUID;

    if (propType != 'hash') {
      let propDir = schema[prop]['dir'] ?? prop;
      let indexPath = `metadir/props/${propDir}/index.csv`;
      let indexFile = await callback.fetch(indexPath);
      if (propType == 'string') {
        propValue = JSON.stringify(propValue);
      }
      let indexLine = `${propUUID},${propValue}\n`;
      if (!includes(indexFile, indexLine)) {
        const indexPruned = prune(indexFile, propUUID);
        const indexEdited = indexPruned + indexLine;
        await callback.write(indexPath, indexEdited);
      }
    }
    if (prop != root) {
      let trunk = schema[prop]['trunk'];
      let trunkUUID = uuids[trunk];
      let pairLine = `${trunkUUID},${propUUID}\n`;
      let pairPath = `metadir/pairs/${trunk}-${prop}.csv`;
      let pairFile = await callback.fetch(pairPath);
      if (!includes(pairFile, pairLine)) {
        const pairPruned = prune(pairFile, trunkUUID);
        const pairEdited = pairPruned + pairLine;
        await callback.write(pairPath, pairEdited);
      }
    }
  }

  return entry;
}
