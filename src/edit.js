function prune(file, regex) {
  if (file) {
    return file.split('\n').filter((line) => !(new RegExp(regex)).test(line)).join('\n');
  }

  return '';
}

// remove entry with rootUUID from metadir
export async function deleteEntry(rootUUID, callback, schemaPath = 'metadir.json') {
  const schema = JSON.parse(await callback.fetch(schemaPath));

  const schemaProps = Object.keys(schema);

  const root = schemaProps.find((prop) => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));

  const props = schemaProps.filter((prop) => schema[prop].trunk === root);

  const indexPath = `metadir/props/${root}/index.csv`;

  const indexFile = await callback.fetch(indexPath);

  if (indexFile) {
    await callback.write(

      indexPath,

      prune(indexFile, rootUUID),

    );
  }

  Object.values(props).forEach(async (prop) => {
    const pairPath = `metadir/pairs/${root}-${prop}.csv`;

    const pairFile = await callback.fetch(pairPath);

    if (pairFile) {
      await callback.write(
        pairPath,
        prune(pairFile, rootUUID),
      );
    }
  });
}

function includes(file, line) {
  if (file) {
    return file.includes(line);
  }

  return false;
}

export async function digestMessage(message) {
  // encode as (utf-8) Uint8Array
  const msgUint8 = new TextEncoder().encode(message);

  // hash as buffer
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);

  // convert buffer to byte array
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // convert bytes to hex string
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

// overwrite entry in metadir
export async function editEntry(entryEdited, callback, schemaPath = 'metadir.json') {
  const entry = { ...entryEdited };

  const schema = JSON.parse(await callback.fetch(schemaPath));

  const root = Object.keys(schema).find((prop) => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));

  // list entry props that match the schema
  const entryLabels = Object.keys(entry);

  const entryProps = [];

  for (const i in entryLabels) {
    const entryLabel = entryLabels[i];

    const prop = Object.keys(schema).find(
      (p) => schema[p].label === entryLabel || p === entryLabel,
    );

    if (prop) {
      entryProps.push(prop);
    }
  }

  // TODO: fix ordering and use instead
  // const entryProps = Object.keys(schema).filter(
  //   (prop) => Object.keys(entry).find(
  //     (key) => schema[prop].label === key || prop === key,
  //   ),
  // );

  if (!entry.UUID) {
    const random = callback.random ?? crypto.randomUUID;

    const uuid = await digestMessage(random());

    entry.UUID = uuid;
  }

  const uuids = {};

  uuids[root] = entry.UUID;

  // TODO add queue for props whose trunk is not yet processed
  for (const i in entryProps) {
    const prop = entryProps[i];

    const propLabel = schema[prop].label;

    const propType = schema[prop].type;

    let propValue = entry[prop] ? entry[prop] : entry[propLabel];

    let propUUID;

    if (prop !== root) {
      propUUID = await digestMessage(propValue);
    } else {
      propUUID = entry.UUID;
    }

    uuids[prop] = propUUID;

    if (propType !== 'hash') {
      const propDir = schema[prop].dir ?? prop;

      const indexPath = `metadir/props/${propDir}/index.csv`;

      const indexFile = await callback.fetch(indexPath);

      if (propType === 'string') {
        propValue = JSON.stringify(propValue);
      }

      const indexLine = `${propUUID},${propValue}\n`;

      if (!includes(indexFile, indexLine)) {
        const indexPruned = prune(indexFile, propUUID);

        const indexEdited = indexPruned + indexLine;

        await callback.write(indexPath, indexEdited);
      }
    }

    if (prop !== root) {
      const { trunk } = schema[prop];

      const trunkUUID = uuids[trunk];

      const pairLine = `${trunkUUID},${propUUID}\n`;

      const pairPath = `metadir/pairs/${trunk}-${prop}.csv`;

      const pairFile = await callback.fetch(pairPath);

      if (!includes(pairFile, pairLine)) {
        const pairPruned = prune(pairFile, trunkUUID);

        const pairEdited = pairPruned + pairLine;

        await callback.write(pairPath, pairEdited);
      }
    }
  }

  return entry;
}
