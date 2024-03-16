export async function detectVersion(readFile) {
  try {
    const is2 = await readFile(".csvs.csv")

    if (is2) {
      return "0.0.2"
    }
  } catch {
    //
  }

  try {
    const is1 = await readFile("metadir.json");

    return "0.0.1"
  } catch {
    //
  }
}
