import { grepPolyfill, randomUUIDPolyfill } from './polyfill';

/**
 * This tells if file includes line.
 * @name includes
 * @function
 * @param {string} file - A file with multiple lines.
 * @param {string} line - A line.
 * @returns {Boolean}
 */
function includes(file, line) {
  if (file) {
    return file.includes(line);
  }

  return false;
}

/**
 * This generates a SHA-256 hashsum.
 * @name digestMessage
 * @function
 * @param {string} message - A string.
 * @returns {string} - SHA-256 hashsum.
 */
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

/**
 * This tells if a leaf branch is connected to base branch.
 * @name isLeaf
 * @function
 * @param {object} schema - Database schema.
 * @param {string} base - Base branch name.
 * @param {string} leaf - Leaf branch name.
 * @returns {Boolean}
 */
export function isLeaf(schema, base, leaf) {
  const { trunk } = schema[leaf];

  if (trunk === undefined) {
    // if schema root is reached, leaf is connected to base
    return false;
  } if (trunk === base) {
    // if trunk is base, leaf is connected to base
    return true;
  } if (schema[trunk].type === 'object' || schema[trunk].type === 'array') {
    // if trunk is object or array, leaf is not connected to base
    // because objects and arrays have their own leaves
    return false;
  } if (isLeaf(schema, base, trunk)) {
    // if trunk is connected to base, leaf is also connected to base
    return true;
  }

  // if trunk is not connected to base, leaf is also not connected to base
  return false;
}

/**
 * This finds all branches that are connected to the base branch.
 * @name findLeaves
 * @function
 * @param {object} schema - Database schema.
 * @param {string} base - Base branch name.
 * @returns {string[]} - Array of leaf branches connected to the base branch.
 */
function findLeaves(schema, base) {
  return Object.keys(schema).filter((branch) => isLeaf(schema, base, branch));
}

/**
 * This finds paths to all files required to search for base branch.
 * @name findStorePaths
 * @function
 * @param {object} schema - Database schema.
 * @param {string} base - Base branch name.
 * @returns {string[]} - Array of file paths.
 */
function findStorePaths(schema, base) {
  let filePaths = [];

  const leaves = findLeaves(schema, base);

  leaves.concat([base]).forEach((branch) => {
    const { trunk } = schema[branch];

    if (trunk !== undefined && schema[branch].type !== 'regex') {
      filePaths.push(`metadir/pairs/${trunk}-${branch}.csv`);
    }

    switch (schema[branch].type) {
      case 'hash':
      case 'regex':
        break;

      case 'object':
      case 'array':
        if (branch !== base) {
          filePaths = filePaths.concat(findStorePaths(schema, branch));
        }
        break;

      default:
        filePaths.push(`metadir/props/${schema[branch].dir ?? branch}/index.csv`);
    }
  });

  return filePaths.filter(Boolean).flat();
}

/**
 * This finds the root branch of a database schema.
 * @name findSchemaRoot
 * @function
 * @param {object} schema - Database schema.
 * @returns {string} - Root branch.
 */
function findSchemaRoot(schema) {
  return Object.keys(schema).find((prop) => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));
}

/** Class representing a database entry. */
export default class Entry {
  /**
   * This callback reads db.
   * @callback readFileCallback
   * @param {string} path - The file path.
   * @returns {string} - The file contents
   */

  /**
   * readFile is the callback that reads db.
   * @type {readFileCallback}
   */
  #readFile;

  /**
   * This callback writes db.
   * @callback writeFileCallback
   * @param {string} path - The file path.
   * @param {string} contents - The file contents.
   */

  /**
   * writeFile is the callback that writes db.
   * @type {writeFileCallback}
   */
  #writeFile;

  /**
   * This callback searches files.
   * @callback grepCallback
   * @param {string} contents - The file contents.
   * @param {string} regex - The regular expression in ripgrep format.
   * @returns {string} - The search results
   */

  /**
   * grep is the callback that searches files.
   * @type {grepCallback}
   */
  #grep;

  /**
   * This callback returns a UUID.
   * @callback randomUUIDCallback
   * @returns {string} - UUID compliant with RFC 4122
   */

  /**
   * randomUUID is the callback that returns a UUID.
   * @type {randomUUIDCallback}
   */
  #randomUUID;

  /**
   * schema is the database schema.
   * @type {object}
   */
  #schema;

  /**
   * base is the branch to search for.
   * @type {URLSearchParams}
   */
  #base;

  /**
   * Database entry.
   * @type {object}
   */
  #entry;

  /**
   * store is the map of file paths to file contents.
   * @type {URLSearchParams}
   */
  #store;

  /**
   * Create a database instance.
   * @param {Object} args - Object with callbacks.
   * @param {readFileCallback} args.readFile - The callback that reads db.
   * @param {writeFileCallback} args.writeFile - The callback that writes db.
   * @param {grepCallback} args.grep - The callback that searches files.
   * @param {randomUUIDCallback} args.randomUUID - The callback that returns a UUID.
   * @param {string} args.base - The field to search for.
   * @param {object} args.entry - A database entry.
   */
  constructor({
    readFile, writeFile, grep, randomUUID, entry, base,
  }) {
    this.#entry = entry;
    this.#base = base;
    this.#readFile = readFile;
    this.#writeFile = writeFile;
    this.#grep = grep ?? grepPolyfill;
    this.#randomUUID = randomUUID ?? crypto.randomUUID ?? randomUUIDPolyfill;
  }

  // overwrite entry in metadir
  async update() {
    this.#schema = await this.#readSchema();

    // if no base is provided, find schema root
    this.#base = this.#base ?? findSchemaRoot(this.#schema);

    // get a map of database file contents
    this.#store = await this.#readStore(this.#base);

    ///

    // find props for each label in the this.#entry
    const entryProps = Object.keys(this.#entry).map(
      (label) => Object.keys(this.#schema).find(
        (prop) => this.#schema[prop].label === label || prop === label,
      ),
    ).filter(Boolean);

    if (!this.#entry.UUID) {
      const random = this.#randomUUID ?? crypto.randomUUID;

      const entryUUID = await digestMessage(random());

      this.#entry.UUID = entryUUID;
    }

    const uuids = {};

    uuids[this.#base] = this.#entry.UUID;

    const queue = [...Object.keys(this.#schema)];

    const processed = new Map();

    for (const prop of queue) {
      const propLabel = this.#schema[prop].label;

      const propType = this.#schema[prop].type;

      const { trunk } = this.#schema[prop];

      if (!processed.get(trunk) && prop !== this.#base) {
        queue.push(prop);
      } else {
        processed.set(prop, true);

        if (!entryProps.includes(prop)) {
          if (this.#schema[prop].trunk === this.#base) {
          // prune pairs file for trunk UUID
            const trunkUUID = uuids[trunk];

            const pairPath = `metadir/pairs/${this.#base}-${prop}.csv`;

            try {
              // if file, prune it for trunk UUID
              const pairFile = await this.#readFile(pairPath);

              if (pairFile) {
                const pairPruned = await this.#grep(pairFile, trunkUUID, true);

                await this.#writeFile(pairPath, pairPruned);
              }
            } catch {
            // do nothing
            }
          } else {
          // do nothing
          }
        } else if (this.#schema[prop].type === 'array') {
          if (!this.#entry[propLabel].UUID) {
            const random = this.#randomUUID ?? crypto.randomUUID;

            const arrayUUID = await digestMessage(random());

            this.#entry[propLabel].UUID = arrayUUID;
          }

          const propUUID = this.#entry[propLabel].UUID;

          // write pair datum-export_tags / root-array_group
          const trunkUUID = uuids[trunk];

          const pairLine = `${trunkUUID},${propUUID}\n`;

          const pairPath = `metadir/pairs/${trunk}-${prop}.csv`;

          let pairFile;

          try {
            pairFile = await this.#readFile(pairPath);
          } catch {
            pairFile = '';
          }

          if (!includes(pairFile, pairLine)) {
            const pairPruned = await this.#grep(pairFile, trunkUUID, true);

            const pairEdited = pairPruned + pairLine;

            await this.#writeFile(pairPath, pairEdited);
          }

          // prune every branch of array prop
          // to rewrite a fresh array in the next step
          const propBranches = Object.keys(this.#schema)
            .filter((p) => this.#schema[p].trunk === prop);

          for (const propBranch of propBranches) {
            const propBranchPairPath = `metadir/pairs/${prop}-${propBranch}.csv`;

            let propBranchPairFile;

            try {
              propBranchPairFile = await this.#readFile(propBranchPairPath);
            } catch {
              propBranchPairFile = '';
            }

            const propBranchPairPruned = await this.#grep(propBranchPairFile, propUUID, true);

            await this.#writeFile(propBranchPairPath, propBranchPairPruned);
          }

          const arrayItems = JSON.parse(JSON.stringify(this.#entry[propLabel].items));

          // for each array items
          for (const item of arrayItems) {
            const itemProp = item.item_name;

            // get or generate UUID
            if (!item.UUID) {
              const random = this.#randomUUID ?? crypto.randomUUID;

              const itemUUID = await digestMessage(random());

              item.UUID = itemUUID;
            }

            const itemPropUUID = item.UUID;

            // write pair for export_tags-export1_tag / array_group-array_item
            const itemPairLine = `${propUUID},${itemPropUUID}\n`;

            const itemPairPath = `metadir/pairs/${prop}-${itemProp}.csv`;

            let itemPairFile;

            try {
              itemPairFile = (await this.#readFile(itemPairPath)) ?? '';
            } catch {
              itemPairFile = '';
            }

            if (!includes(itemPairFile, itemPairLine)) {
              const itemPairEdited = itemPairFile + itemPairLine;

              await this.#writeFile(itemPairPath, itemPairEdited);
            }

            delete item.item_name;

            delete item.UUID;

            const itemFieldLabels = Object.keys(item);

            // for each field of array item
            for (const itemFieldLabel of itemFieldLabels) {
              const itemFieldProp = Object.keys(this.#schema).find(
                (p) => this.#schema[p].label === itemFieldLabel || p === itemFieldLabel,
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
                itemFieldPairFile = await this.#readFile(itemFieldPairPath);
              } catch {
                itemFieldPairFile = '';
              }

              if (!includes(itemFieldPairFile, itemFieldPairLine)) {
                const itemFieldPairPruned = await this.#grep(itemFieldPairFile, itemPropUUID, true);

                const itemFieldPairEdited = itemFieldPairPruned + itemFieldPairLine;

                await this.#writeFile(itemFieldPairPath, itemFieldPairEdited);
              }

              // write prop for export1_channel / prop
              const itemFieldPropDir = this.#schema[itemFieldProp].dir ?? itemFieldProp;

              const indexPath = `metadir/props/${itemFieldPropDir}/index.csv`;

              let indexFile;
              try {
                indexFile = await this.#readFile(indexPath);
              } catch {
                indexFile = '';
              }

              const itemFieldPropType = this.#schema[itemFieldProp].type;

              if (itemFieldPropType === 'string') {
                itemFieldPropValue = JSON.stringify(itemFieldPropValue);
              }

              const indexLine = `${itemFieldPropUUID},${itemFieldPropValue}\n`;

              if (!includes(indexFile, indexLine)) {
                const indexPruned = await this.#grep(indexFile, itemFieldPropUUID, true);

                const indexEdited = indexPruned + indexLine;

                await this.#writeFile(indexPath, indexEdited);
              }
            }
          }
        } else {
          let propUUID;

          let propValue = JSON.parse(JSON.stringify(this.#entry[prop] ?? this.#entry[propLabel]));

          if (prop !== this.#base) {
            propUUID = await digestMessage(propValue);
          } else {
            propUUID = this.#entry.UUID;
          }

          uuids[prop] = propUUID;

          if (propType !== 'hash') {
            const propDir = this.#schema[prop].dir ?? prop;

            const indexPath = `metadir/props/${propDir}/index.csv`;

            let indexFile;

            try {
              indexFile = await this.#readFile(indexPath);
            } catch {
              indexFile = '';
            }

            if (propType === 'string') {
              propValue = JSON.stringify(propValue);
            }

            const indexLine = `${propUUID},${propValue}\n`;

            if (!includes(indexFile, indexLine)) {
              const indexPruned = await this.#grep(indexFile, propUUID, true);

              const indexEdited = indexPruned + indexLine;

              await this.#writeFile(indexPath, indexEdited);
            }
          }

          if (prop !== this.#base) {
            const trunkUUID = uuids[trunk];

            const pairLine = `${trunkUUID},${propUUID}\n`;

            const pairPath = `metadir/pairs/${trunk}-${prop}.csv`;

            let pairFile;

            try {
              pairFile = await this.#readFile(pairPath);
            } catch {
              pairFile = '';
            }

            if (!includes(pairFile, pairLine)) {
              const pairPruned = await this.#grep(pairFile, trunkUUID, true);

              const pairEdited = pairPruned + pairLine;

              await this.#writeFile(pairPath, pairEdited);
            }
          }
        }
      }
    }

    ///
    return this.#entry;
  }

  // remove entry with rootUUID from metadir
  async delete() {
    this.#schema = await this.#readSchema();

    // if no base is provided, find schema root
    this.#base = this.#base ?? findSchemaRoot(this.#schema);

    // get a map of database file contents
    this.#store = await this.#readStore(this.#base);

    try {
      const indexPath = `metadir/props/${this.#base}/index.csv`;

      const indexFile = await this.#readFile(indexPath);

      if (indexFile) {
        await this.#writeFile(
          indexPath,
          await this.#grep(indexFile, this.#entry.UUID, true),
        );
      }
    } catch {
    // continue regardless of error
    }

    const leaves = Object.keys(this.#schema)
      .filter((prop) => this.#schema[prop].trunk === this.#base);

    await Promise.all(leaves.map(async (branch) => {
    // for (const branch of leaves) {
      try {
        const pairPath = `metadir/pairs/${this.#base}-${branch}.csv`;

        const pairFile = await this.#readFile(pairPath);

        if (pairFile) {
          await this.#writeFile(
            pairPath,
            await this.#grep(pairFile, this.#entry.UUID, true),
          );
        }
      } catch {
      // continue regardless of error
      }
    }));
  }

  /**
   * This returns the database schema.
   * @name readSchema
   * @function
   * @returns {object} - database schema.
   */
  async #readSchema() {
    return JSON.parse(await this.#readFile('metadir.json'));
  }

  /**
   * This returns a map of database file contents.
   * @name readStore
   * @function
   * @param {string} base - Base branch.
   * @returns {Map} - Map of file paths to file contents.
   */
  async #readStore(base) {
    // get array of all filepaths required to search for base branch
    const filePaths = findStorePaths(this.#schema, base);

    const store = {};

    await Promise.all(filePaths.map(async (filePath) => {
      store[filePath] = (await this.#readFile(filePath)) ?? '\n';
    }));

    return store;
  }
}
