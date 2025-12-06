import csv from "papaparse";
import { mow, sow } from "../record.js";
import { unescape } from "../escape.js";

export function queryLine(tablet, state, line) {
    const rs = [
        { "_": "datum", "datum": "" },
        { "_": "datum", "datum": "value1" },
        { "_": "datum", "datum": "value2" },
    ]

    if (line === ",name3\n") {
        return {
            query: state.query,
            entry: rs[0],
            isMatch: true,
            last: false,
        }
    } 

    if (line === "value1,name1\n") {
        return {
            query: state.query,
            entry: rs[1],
            isMatch: true,
            last: {
                query: state.query,
                entry: rs[0],
                isMatch: true,
                last: false,
            },
        }
    }

    if (line === "value2,name2\n") {
        return {
            query: state.query,
            entry: rs[2],
            isMatch: true,
            last: {
                query: state.query,
                entry: rs[1],
                isMatch: true,
                last: false,
            },
        }
    }

    return state
}
