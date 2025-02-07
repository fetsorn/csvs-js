import csv from "papaparse";

export function updateSchemaStream(query) {
  return new TransformStream({
    transform() {},
    flush(controller) {
      Object.entries(query)
        .filter(([key]) => key !== "_")
        .sort()
        .forEach(([trunk, leafValue]) => {
          const leaves = Array.isArray(leafValue)
                ? leafValue
                : [leafValue];

          leaves.sort().forEach((leaf) => {
            const line = csv.unparse([[trunk, leaf]], {
              delimiter: ",",
              newline: "\n",
            });

            controller.enqueue(line + "\n");
          });
        });
    },
  });
}
