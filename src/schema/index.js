import path from "path";
import csv from "papaparse";
import { isEmpty, chunksToLines } from "../stream.js";
import { toSchema } from "../schema.js";

export async function selectSchema({ fs, dir }) {
    const filepath = path.join(dir, "_-_.csv");

    const lineStream = await isEmpty(fs, filepath) ? [] : chunksToLines(fs.createReadStream(filepath));

    let entry = { _: "_" };

    for await (const line of lineStream) {
        if (line === "") continue;

        const {
            data: [[trunk, leaf]],
        } = csv.parse(line, { delimiter: "," });

        const leaves = entry[trunk];

        const leavesNew = leaves === undefined
              ? [leaf]
              : [leaves, leaf].flat();

        entry[trunk] = leavesNew;
    }

    return entry;
}

export async function buildSchema({ fs, dir }) {
    const schemaRecord = await selectSchema({ fs, dir });

    const schema = toSchema(schemaRecord);

    return schema;
}
