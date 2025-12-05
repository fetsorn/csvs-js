import csv from "papaparse";

export async function updateSchema(fs, query, tmpPath) {
    let lines = [];

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

                lines.push(line + "\n");
            });
        });

    for (const line of lines) {
        await fs.promises.appendFile(tmpPath, line);
    }
}
