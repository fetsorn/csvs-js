/* eslint-disable no-restricted-syntax */

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

function hasPropsDir(propType) {
  return propType !== 'hash';
}

// overwrite entry in metadir
export async function editEntry(entryEdited, callback, schemaPath = 'metadir.json') {
  const entry = { ...entryEdited };

  const schema = JSON.parse(await callback.fetch(schemaPath));

  const root = Object.keys(schema).find((prop) => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));

  // find props for each label in the entry
  const entryProps = Object.keys(entry).map(
    (label) => Object.keys(schema).find(
      (prop) => schema[prop].label === label || prop === label,
    ),
  ).filter(Boolean);

  if (!entry.UUID) {
    const random = callback.random ?? crypto.randomUUID;

    const uuid = await digestMessage(random());

    entry.UUID = uuid;
  }

  const uuids = {};

  uuids[root] = entry.UUID;

  const queue = [...entryProps];

  const processed = new Map();

  for (const prop of queue) {
    console.log(prop);

    const propLabel = schema[prop].label;

    const propType = schema[prop].type;

    let propValue = entry[prop] ? entry[prop] : entry[propLabel];

    const { trunk } = schema[prop];

    if (!processed.get(trunk) && prop !== root) {
      queue.push(prop);
    } else {
      processed.set(prop, true);

      if (schema[prop].type === 'array') {
        if (!entry[propLabel].UUID) {
          const random = callback.random ?? crypto.randomUUID;

          const uuid = await digestMessage(random());

          entry[propLabel].UUID = uuid;
        }

        const propUUID = entry[propLabel].UUID;

        // write pair datum-export_tags / root-array_group


        // for each array items

        // get or generate UUID

        // write pair for export_tags-export1_tag / array_group-array_item


        // for each field of array item

        // digest UUID

        // write pair for export1_tag-export1_channel / array_item-prop

        // write prop for export1_channel / prop
      } else {
        let propUUID;

        if (prop !== root) {
          propUUID = await digestMessage(propValue);
        } else {
          propUUID = entry.UUID;
        }

        uuids[prop] = propUUID;

        if (hasPropsDir(propType)) {
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
    }
  }

  return entry;
}
