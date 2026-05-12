import path from "path";

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
 * @returns {Promise<void>}
 */
async function _init({ fs, dir }) {
  const versionContent = "csvs,0.0.2\n";

  // takes a dir, checks for .csvs.csv.
  const versionPath = path.join(dir, ".csvs.csv");

  if (await exists(fs, versionPath)) {
    // If exists, console.warn and return.
    console.warn(versionPath, "exists");
  } else {
    // if no version create version
    await fs.promises.writeFile(versionPath, versionContent, "utf8");
  }
}

/**
 * Initialize a new dataset
 *
 * @param {object} args
 * @param {object} args.fs
 * @param {string} [args.dir]
 * @param {boolean} [args.nested = false]
 * @returns {Promise<String>}
 */
export async function init({
  fs,
  bare = false,
  dir,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  if (!bare) {
    if (!(await exists(fs, csvsdir))) {
      await fs.promises.mkdir(csvsdir);
    }
  }

  await _init({ fs, dir: csvsdir });
}
