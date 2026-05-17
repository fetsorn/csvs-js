import path from "path";
import { updateVersion } from "../version/index.js";

async function exists(fs, filepath) {
  try {
    await fs.promises.stat(filepath);
    return true;
  } catch (err) {
    if (
      err.code === "ENOENT" ||
      err.code === "ENOTDIR" ||
      (err.code || "").includes("ENS")
    ) {
      return false;
    } else {
      console.log('Unhandled error in "FileSystem.exists()" function', err);
      throw err;
    }
  }
}

/**
 * Initialize a new bare dataset
 *
 * @param {object} args
 * @param {object} args.fs
 * @param {string} [args.dir]
 * @param {object} [args.version] - key-value pairs for .csvs.csv (e.g. { uuid: "..." })
 * @returns {Promise<void>}
 */
async function _init({ fs, dir, version }) {
  const versionPath = path.join(dir, ".csvs.csv");

  if (await exists(fs, versionPath)) {
    // If exists, console.warn and return.
    console.warn(versionPath, "exists");
  } else {
    const query = { _: ".", csvs: "0.0.4", ...version };

    await updateVersion({ fs, bare: true, dir, query });
  }
}

/**
 * Initialize a new dataset
 *
 * @param {object} args
 * @param {object} args.fs
 * @param {string} [args.dir]
 * @param {boolean} [args.bare = false]
 * @param {object} [args.version] - key-value pairs for .csvs.csv (e.g. { uuid: "..." })
 * @returns {Promise<void>}
 */
export async function init({
  fs,
  bare = false,
  dir,
  version,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  if (!bare) {
    if (!(await exists(fs, csvsdir))) {
      await fs.promises.mkdir(csvsdir);
    }
  }

  await _init({ fs, dir: csvsdir, version });
}
