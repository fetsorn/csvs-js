import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { toSchema } from "../schema.js";
import { selectTabletStream } from "./tablet.js";
import { planValues, planOptions, planQuery, planSchema } from "./strategy.js";

/**
 * This returns a Transform stream
 * @name selectSchemaStream
 * @function
 * @returns {Transform}
 */
// TODO remove this
export async function selectSchemaStream({ fs, dir }) {
  return new TransformStream({
    async transform(query, controllerOuter) {
      // NOTE this passes record but selectRecordStream passes query
      const queryStream = ReadableStream.from([{ record: query }]);

      const schemaStrategy = planSchema();

      const promises = schemaStrategy.map((tablet) =>
        selectTabletStream(fs, dir, tablet),
      );

      const streams = await Promise.all(promises);

      const leaderStream = new TransformStream({
        transform(state, controllerInner) {
          // TODO account for nested leader
          // TODO account for a list of leader values
          if (state.record) {
            controllerInner.enqueue(state.record);
          }
        },
      });

      const schemaStream = [...streams, leaderStream].reduce(
        (withStream, stream) => withStream.pipeThrough(stream),
        queryStream,
      );

      await schemaStream.pipeTo(new WritableStream({
        async write(record) {
          controllerOuter.enqueue(record)
        }
      }))
    }
  })
}

/**
 * This returns a list with schema record
 * @name selectSchema
 * @function
 * @returns {Object[]}
 */
export async function selectSchema({ fs, dir }) {
  const schemaStream = await selectSchemaStream({ fs, dir });

  const queryStream = ReadableStream.from([{ _: "_" }]);

  var records = [];

  const collectStream = new WritableStream({
    write(record) {
      records.push(record);
    },
  });

  await queryStream.pipeThrough(schemaStream).pipeTo(collectStream);

  return records;
}

/**
 * This returns a Transform stream
 * @name selectRecordStream
 * @function
 * @returns {Transform}
 */
export async function selectRecordStream({ fs, dir }) {
  const [schemaRecord] = await selectSchema({ fs, dir });

  const schema = toSchema(schemaRecord);

  return new TransformStream({
    async transform(query, controllerOuter) {
      // there can be only one root base in search query
      // TODO: validate against arrays of multiple bases, do not return [], throw error
      const base = query._;

      // if no base is provided, return empty
      if (base === undefined) return undefined;

      const queryStream = ReadableStream.from([{ query }]);

      const queryStrategy = planQuery(schema, query);

      const baseStrategy =
            queryStrategy.length > 0 ? queryStrategy : planOptions(schema, base);

      const valueStrategy = planValues(schema, query);

      const strategy = [...baseStrategy, ...valueStrategy];

      const streams = strategy.map((tablet) =>
        selectTabletStream(fs, dir, tablet),
      );

      const leader = query.__;

      const leaderStream = new TransformStream({
        transform(state, controllerInner) {
          const record =
                leader && leader !== base ? state.record[leader] : state.record;

          // TODO account for nested leader
          // TODO account for a list of leader values
          if (record) {
            controllerInner.enqueue(record);
          }
        },
      });

      const schemaStream = [...streams, leaderStream].reduce(
        (withStream, stream) => withStream.pipeThrough(stream),
        queryStream,
      );

      await schemaStream.pipeTo(new WritableStream({
        async write(record) {
          controllerOuter.enqueue(record)
        }
      }))
    }
  })
}

/**
 * This returns a list of base records
 * @name selectBase
 * @function
 * @returns {Object[]}
 */
export async function selectBase({ fs, dir, query }) {
  // there can be only one root base in search query
  // TODO: validate against arrays of multiple bases, do not return [], throw error
  const base = query._;

  // if no base is provided, return empty
  if (base === undefined) return [];

  const [schemaRecord] = await selectSchema({ fs, dir });

  if (base === "_") return [schemaRecord];

  const schema = toSchema(schemaRecord);

  const queryStream = ReadableStream.from([{ query }]);

  const queryStrategy = planQuery(schema, query);

  const strategy =
    queryStrategy.length > 0 ? queryStrategy : planOptions(schema, base);

  const promises = strategy.map((tablet) =>
    selectTabletStream(fs, dir, tablet),
  );

  const streams = await Promise.all(promises);

  const leader = query.__;

  // preserve leader for building values later
  const leaderStream = new TransformStream({
    transform(state, controller) {
      const record =
        leader && leader !== base
          ? { ...state.record, __: leader }
          : state.record;

      // TODO account for nested leader
      // TODO account for a list of leader values
      if (record !== undefined) {
        controller.enqueue(record);
      }
    },
  });

  var records = [];

  const collectStream = new WritableStream({
    write(record) {
      records.push(record);
    },
  });

  const selectStream = [...streams, leaderStream].reduce(
    (withStream, stream) => withStream.pipeThrough(stream),
    queryStream,
  );

  await selectStream.pipeTo(collectStream);

  return records;
}

/**
 * This returns a list of complete records
 * @name selectBody
 * @function
 * @returns {Object[]}
 */
export async function selectBody({ fs, dir, query }) {
  const base = query._;

  const [schemaRecord] = await selectSchema({ fs, dir });

  if (base === "_") return schemaRecord;

  const schema = toSchema(schemaRecord);

  const queryStream = ReadableStream.from([{ record: query }]);

  const strategy = planValues(schema, query);

  const promises = strategy.map((tablet) =>
    selectTabletStream(fs, dir, tablet),
  );

  const streams = await Promise.all(promises);

  const leader = query.__;

  const leaderStream = new TransformStream({
    transform(state, controller) {
      const record =
        leader && leader !== base ? state.record[leader] : state.record;

      if (record !== undefined) {
        // TODO account for nested leader
        // TODO account for a list of leader values
        controller.enqueue(record);
      }
    },
  });

  var records = [];

  const collectStream = new WritableStream({
    objectMode: true,

    write(record) {
      records.push(record);
    },
  });

  const selectStream = [...streams, leaderStream].reduce(
    (withStream, stream) => withStream.pipeThrough(stream),
    queryStream,
  );

  await selectStream.pipeTo(collectStream);

  // takes record with base
  // returns record with values
  return records[0];
}

/**
 * This returns a list of records
 * @name selectRecord
 * @function
 * @returns {Object[]}
 */
export async function selectRecord({ fs, dir, query }) {
  // exit if record is undefined
  if (query === undefined) return;

  const queries = Array.isArray(query) ? query : [query];

  // TODO find base value if _ is object or array
  // TODO exit if no base field or invalid base value
  const base = queries[0]._;

  const selectStream = base === "_"
        ? await selectSchemaStream({ fs, dir })
        : await selectRecordStream({ fs, dir });

  const records = [];

  await ReadableStream.from(queries).pipeThrough(selectStream).pipeTo(
    new WritableStream({
      write(record) {
        records.push(record);
      },
    })
  );

  return records;
}
