import { parseItem } from "./item.js";

export function step(tablet, state, trait, thing) {
  console.log(
    "step",
    tablet.filename,
    state.record._,
    "\n",
    trait,
    thing,
    "\n",
    JSON.stringify(state, undefined, 2),
  );

  const { _: base, ...record } = state.record;

  const entries = Object.entries(record);

  // reduce each key-value pair to match trait and set thing
  const stateEntries = entries.reduce((accEntry, [key, value]) => {
    let values = Array.isArray(value) ? value : [value];

    // remove values of given key to rewrite later
    const { [key]: omitted, ...recordWithoutKey } = accEntry.record;

    // reduce each value item to match trait and set thing
    const stateValues = values.reduce(
      (accItem, item) => {
        return parseItem(tablet, accItem, trait, thing, key, item, omitted);
      },
      {
        ...accEntry,
        record: recordWithoutKey,
      },
    );

    // TODO can values length be 0?
    // [key]: valuesNew.length === 1 ? valuesNew[0] : valuesNew,

    console.log(
      "step values",
      tablet.filename,
      state.record._,
      "\n",
      key,
      value,
      "\n",
      JSON.stringify(stateValues, undefined, 2),
    );

    return { ...accEntry, ...stateValues };
  }, state);

  console.log(
    "step entries",
    tablet.filename,
    state.record._,
    "\n",
    trait,
    thing,
    "\n",
    JSON.stringify(stateEntries, undefined, 2),
  );

  return stateEntries;
}
