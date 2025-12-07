import csv from "papaparse";

export function selectSchemaStream({ query }) {
  let state = {
    entry: { _: "_" },
  };

  return new TransformStream({
    async transform(line, controller) {
      if (line === "") return;

      const {
        data: [[trunk, leaf]],
      } = csv.parse(line, { delimiter: "," });

      const leaves = state.entry[trunk];

      const leavesNew = leaves === undefined ? [leaf] : [leaves, leaf].flat();

      state.entry = {
        ...state.entry,
        [trunk]: leavesNew,
      };
    },

    flush(controller) {
      controller.enqueue({ query, entry: state.entry });
    },
  });
}
