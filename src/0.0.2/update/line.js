import csv from "papaparse";

export function parseLine(relations, line) {
  if (line === undefined) {
    // TODO rewrite to sorted insert
    // if flag unset and relation map not fully popped, set flag
    const recordHasNewValues = Object.keys(relations ?? {}).length > 0;

    // don't write tablet if changeset doesn't have anything on it
    // if flag set, append relation map to pruned
    if (recordHasNewValues) {
      // for each key in the changeset
      const keys = Object.keys(relations);

      const relationsNew = keys.reduce((acc, key) => {
        // for each key value in the changeset
        const values = relations[key];

        const keyRelations = values.map((value) => [key, value]);

        const keyRelationsEscaped = keyRelations.map((strings) =>
          strings.map((str) => str.replace(/\n/g, "\\n")),
        );

        return [...keyRelationsEscaped, ...acc];
      }, []);

      const lines = csv.unparse(relationsNew, { newline: "\n" });

      // append remaining relations to output
      return { lines };
    }

    return {};
  }

  if (line === "") return {};

  // csv parse
  const {
    data: [[key, value]],
  } = csv.parse(line);

  const keys = Object.keys(relations ?? {});

  const lineMatchesKey = keys.includes(key);

  if (lineMatchesKey) {
    // prune if line matches a key from relationMap
  } else {
    const dataEscaped = [key, value].map((str) => str.replace(/\n/g, "\\n"));

    const line = csv.unparse([dataEscaped], { newline: "\n" });

    return { lines: [line] };
  }

  return {};
}
