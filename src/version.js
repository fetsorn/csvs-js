  /**
   * This determines the version of a csvs dataset
   * @name detectVersion
   * @function
   * @param {readFileCallback} readFile - The callback that reads db.
   * @returns {string} - A dataset record.
   */
export async function detectVersion(readFile) {
  try {
    const is2 = await readFile(".csvs.csv");

    if (is2) {
      return "0.0.2";
    }
  } catch {
    //
  }

  try {
    const is1 = await readFile("metadir.json");

    if (is1) {
      return "0.0.1";
    }
  } catch {
    //
  }
}
