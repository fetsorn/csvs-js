/* eslint-disable no-restricted-syntax */

function prune(file, regex) {
  if (file) {
    return file.split('\n').filter((line) => !(new RegExp(regex)).test(line)).join('\n');
  }

  return '';
}

// remove entry with rootUUID from metadir
export async function deleteEntry(rootUUID, callback, schemaPath = 'metadir.json') {
  const schema = JSON.parse(await callback.readFile(schemaPath));

  const schemaProps = Object.keys(schema);

  const root = schemaProps.find((prop) => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));

  const props = schemaProps.filter((prop) => schema[prop].trunk === root);

  const indexPath = `metadir/props/${root}/index.csv`;

  let indexFile;

  try {
    indexFile = await callback.readFile(indexPath);
  } catch {
    // continue regardless of error
  }

  if (indexFile) {
    await callback.writeFile(

      indexPath,

      prune(indexFile, rootUUID),

    );
  }

  Object.values(props).forEach(async (prop) => {
    const pairPath = `metadir/pairs/${root}-${prop}.csv`;

    let pairFile;

    try {
      pairFile = await callback.readFile(pairPath);
    } catch {
      // continue regardless of error
    }

    if (pairFile) {
      await callback.writeFile(
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
export async function editEntry(entryOriginal, callback, schemaPath = 'metadir.json') {
  const entry = { ...entryOriginal };

  const schema = JSON.parse(await callback.readFile(schemaPath));

  const root = Object.keys(schema).find((prop) => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));

  // find props for each label in the entry
  const entryProps = Object.keys(entry).map(
    (label) => Object.keys(schema).find(
      (prop) => schema[prop].label === label || prop === label,
    ),
  ).filter(Boolean);

  if (!entry.UUID) {
    const random = callback.randomUUID ?? crypto.randomUUID;

    const entryUUID = await digestMessage(random());

    entry.UUID = entryUUID;
  }

  const uuids = {};

  uuids[root] = entry.UUID;

  const queue = [...Object.keys(schema)];

  const processed = new Map();

  for (const prop of queue) {
    const propLabel = schema[prop].label;

    const propType = schema[prop].type;

    const { trunk } = schema[prop];

    if (!processed.get(trunk) && prop !== root) {
      queue.push(prop);
    } else {
      processed.set(prop, true);

      if (!entryProps.includes(prop)) {
        if (schema[prop].trunk === root) {
          // prune pairs file for trunk UUID
          const trunkUUID = uuids[trunk];

          const pairPath = `metadir/pairs/${root}-${prop}.csv`;

          try {
            // if file, prune it for trunk UUID
            const pairFile = await callback.readFile(pairPath);

            if (pairFile) {
              const pairPruned = prune(pairFile, trunkUUID);

              await callback.writeFile(pairPath, pairPruned);
            }
          } catch {
            // do nothing
          }
        } else {
          // do nothing
        }
      } else if (schema[prop].type === 'array') {
        if (!entry[propLabel].UUID) {
          const random = callback.randomUUID ?? crypto.randomUUID;

          const arrayUUID = await digestMessage(random());

          entry[propLabel].UUID = arrayUUID;
        }

        const propUUID = entry[propLabel].UUID;

        // write pair datum-export_tags / root-array_group
        const trunkUUID = uuids[trunk];

        const pairLine = `${trunkUUID},${propUUID}\n`;

        const pairPath = `metadir/pairs/${trunk}-${prop}.csv`;

        let pairFile;

        try {
          pairFile = await callback.readFile(pairPath);
        } catch {
          pairFile = '';
        }

        if (!includes(pairFile, pairLine)) {
          const pairPruned = prune(pairFile, trunkUUID);

          const pairEdited = pairPruned + pairLine;

          await callback.writeFile(pairPath, pairEdited);
        }

        // prune every branch of array prop
        // to rewrite a fresh array in the next step
        const propBranches = Object.keys(schema).filter((p) => schema[p].trunk === prop);

        for (const propBranch of propBranches) {
          const propBranchPairPath = `metadir/pairs/${prop}-${propBranch}.csv`;

          let propBranchPairFile;

          try {
            propBranchPairFile = await callback.readFile(propBranchPairPath);
          } catch {
            propBranchPairFile = '';
          }

          const propBranchPairPruned = prune(propBranchPairFile, propUUID);

          await callback.writeFile(propBranchPairPath, propBranchPairPruned);
        }

        const arrayItems = JSON.parse(JSON.stringify(entry[propLabel].items));

        // for each array items
        for (const item of arrayItems) {
          const itemProp = item.item_name;

          // get or generate UUID
          if (!item.UUID) {
            const random = callback.randomUUID ?? crypto.randomUUID;

            const itemUUID = await digestMessage(random());

            item.UUID = itemUUID;
          }

          const itemPropUUID = item.UUID;

          // write pair for export_tags-export1_tag / array_group-array_item
          const itemPairLine = `${propUUID},${itemPropUUID}\n`;

          const itemPairPath = `metadir/pairs/${prop}-${itemProp}.csv`;

          let itemPairFile;

          try {
            itemPairFile = (await callback.readFile(itemPairPath)) ?? '';
          } catch {
            itemPairFile = '';
          }

          if (!includes(itemPairFile, itemPairLine)) {
            const itemPairEdited = itemPairFile + itemPairLine;

            await callback.writeFile(itemPairPath, itemPairEdited);
          }

          delete item.item_name;

          delete item.UUID;

          const itemFieldLabels = Object.keys(item);

          // for each field of array item
          for (const itemFieldLabel of itemFieldLabels) {
            const itemFieldProp = Object.keys(schema).find(
              (p) => schema[p].label === itemFieldLabel || p === itemFieldLabel,
            ) ?? itemFieldLabel;

            // get value
            let itemFieldPropValue = item[itemFieldLabel];

            // digest UUID
            const itemFieldPropUUID = await digestMessage(itemFieldPropValue);

            // write pair for export1_tag-export1_channel / array_item-prop
            const itemFieldPairLine = `${itemPropUUID},${itemFieldPropUUID}\n`;

            const itemFieldPairPath = `metadir/pairs/${itemProp}-${itemFieldProp}.csv`;

            let itemFieldPairFile;

            try {
              itemFieldPairFile = await callback.readFile(itemFieldPairPath);
            } catch {
              itemFieldPairFile = '';
            }

            if (!includes(itemFieldPairFile, itemFieldPairLine)) {
              const itemFieldPairPruned = prune(itemFieldPairFile, itemPropUUID);

              const itemFieldPairEdited = itemFieldPairPruned + itemFieldPairLine;

              await callback.writeFile(itemFieldPairPath, itemFieldPairEdited);
            }

            // write prop for export1_channel / prop
            const itemFieldPropDir = schema[itemFieldProp].dir ?? itemFieldProp;

            const indexPath = `metadir/props/${itemFieldPropDir}/index.csv`;

            let indexFile;
            try {
              indexFile = await callback.readFile(indexPath);
            } catch {
              indexFile = '';
            }

            const itemFieldPropType = schema[itemFieldProp].type;

            if (itemFieldPropType === 'string') {
              itemFieldPropValue = JSON.stringify(itemFieldPropValue);
            }

            const indexLine = `${itemFieldPropUUID},${itemFieldPropValue}\n`;

            if (!includes(indexFile, indexLine)) {
              const indexPruned = prune(indexFile, itemFieldPropUUID);

              const indexEdited = indexPruned + indexLine;

              await callback.writeFile(indexPath, indexEdited);
            }
          }
        }
      } else {
        let propUUID;

        let propValue = JSON.parse(JSON.stringify(entry[prop] ?? entry[propLabel]));

        if (prop !== root) {
          propUUID = await digestMessage(propValue);
        } else {
          propUUID = entry.UUID;
        }

        uuids[prop] = propUUID;

        if (hasPropsDir(propType)) {
          const propDir = schema[prop].dir ?? prop;

          const indexPath = `metadir/props/${propDir}/index.csv`;

          let indexFile;

          try {
            indexFile = await callback.readFile(indexPath);
          } catch {
            indexFile = '';
          }

          if (propType === 'string') {
            propValue = JSON.stringify(propValue);
          }

          const indexLine = `${propUUID},${propValue}\n`;

          if (!includes(indexFile, indexLine)) {
            const indexPruned = prune(indexFile, propUUID);

            const indexEdited = indexPruned + indexLine;

            await callback.writeFile(indexPath, indexEdited);
          }
        }

        if (prop !== root) {
          const trunkUUID = uuids[trunk];

          const pairLine = `${trunkUUID},${propUUID}\n`;

          const pairPath = `metadir/pairs/${trunk}-${prop}.csv`;

          let pairFile;

          try {
            pairFile = await callback.readFile(pairPath);
          } catch {
            pairFile = '';
          }

          if (!includes(pairFile, pairLine)) {
            const pairPruned = prune(pairFile, trunkUUID);

            const pairEdited = pairPruned + pairLine;

            await callback.writeFile(pairPath, pairEdited);
          }
        }
      }
    }
  }

  return entry;
}

async function writeCSV(callback) {}
