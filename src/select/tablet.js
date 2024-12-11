import { sow, mow } from "../record.js";

export function step(tablet, query, entry, trait, thing) {
  const isSchema = tablet.filename === "_-_.csv";

  if (isSchema)
    return {
      isMatch: true,
      entry: {
        ...entry,
        [trait]:
          entry[trait] === undefined ? [thing] : [entry[trait], thing].flat(),
      },
    };

  const grains = mow(query, tablet.trait, tablet.thing);

  const grainNew = {
    _: tablet.trait,
    [tablet.trait]: trait,
    [tablet.thing]: thing,
  };

  const { isMatch, grains: grainsNew } = grains.reduce(
    (withGrain, grain) => {
      const isMatch = tablet.traitIsRegex
        ? new RegExp(grain[tablet.trait]).test(trait)
        : grain[tablet.trait] === trait;

      const isMatchPartial = {
        isMatch: withGrain.isMatch ? withGrain.isMatch : isMatch,
      };

      const grainPartial = {
        grains: isMatch ? [...withGrain.grains, grainNew] : withGrain.grains,
      };

      return { ...isMatchPartial, ...grainPartial };
    },
    { isMatch: false, grains: [] },
  );

  const entryNew = grainsNew.reduce(
    (withGrain, grain) => sow(withGrain, grain, tablet.trait, tablet.thing),
    entry,
  );

  return { isMatch, entry: entryNew };
}
