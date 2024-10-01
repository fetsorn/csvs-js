import csv from "papaparse";

function toLines(relations, keys) {
  return keys.sort().reduce((withLine, key) => {
    const value = relations[key];

    const values = Array.isArray(value) ? value : [value];

    const relationsNew = values.sort().map((item) => [key, item]);

    const lines = relationsNew.map((relation) =>
      csv.unparse([relation], { delimiter: ",", newline: "\n" }),
    );

    return [...withLine, ...lines];
  }, []);
}

export function step(relations, previous, next) {
  // find key of relations between previous and next
  const entries = Object.entries(relations);

  const { entries: entriesNew, keys: keysBetween } = entries.reduce(
    ({ entries: entriesWithEntry, keys: keysWithEntry }, [key, value]) => {
      const isAfter = previous === undefined || previous.localeCompare(key) < 1;

      const isBefore = next === undefined || key.localeCompare(next) === -1;

      const isBetween = isAfter && isBefore;

      const entryPartial = isBetween ? [] : [[key, value]];

      const keyPartial = isBetween ? [key] : [];

      return {
        entries: [...entriesWithEntry, ...entryPartial],
        keys: [...keysWithEntry, ...keyPartial],
      };
    },
    { entries: [], keys: [] },
  );

  const lines = keysBetween.length > 0 ? toLines(relations, keysBetween) : [];

  const relationsNew = Object.fromEntries(entriesNew);

  return { relations: relationsNew, lines };
}
