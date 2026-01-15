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
  const versionContent = "csvs,0.0.2";
  // if dir exists, check for .csvs.csv
  if (await exists(fs, dir)) {
    if (bare) {
      const versionPath = path.join(dir, ".csvs.csv");

      if (await exists(fs, versionPath)) {
        // if version exists return bare dir
        return dir;
      } else {
        // if no version create version
        await fs.promises.writeFile(versionPath, versionContent, "utf8");
      }
    } else {
      const nestedPath = path.join(dir, "csvs");

      // if nested dir exists
      if (await exists(fs, nestedPath)) {
        const versionPath = path.join(nestedPath, ".csvs.csv");

        if (await exists(fs, versionPath)) {
          // if version exists return nested dir
          return nestedPath;
        } else {
          // if no version create version
          await fs.promises.writeFile(versionPath, versionContent, "utf8");
        }
      } else {
        // if no nested dir create nested dir
        await fs.promises.mkdir(nestedPath);

        const versionPath = path.join(nestedPath, ".csvs.csv");

        // if no nested dir create version
        await fs.promises.writeFile(versionPath, versionContent, "utf8");
      }
    }
  }
}
