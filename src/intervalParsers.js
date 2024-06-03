// Contains functions to parse a variety of formats into an interval structure for plotting
import * as d3 from 'd3';


// Parse JSON from uniprot API into collection of tracks based on feature type
export function tracksFromUniprotJSON(stringJSON) {
    const jsn = JSON.parse(stringJSON);
    const features = d3.group(jsn.features, d => d.type);
    let tracks = [];
    // Each track is: {name: "name", array_of_intervals: []}
    for (const fk of features.keys()) {
        const intervals = features.get(fk).map(d => {
            return {
                chrom: "CODING_GENE",
                start: d.location.start.value,
                stop: d.location.end.value,
                featureName: d.description,
                strand: "+"
            };
        });
        tracks.push({name: fk, intervals: intervals})
    }
    return tracks;
}


// Parse bed format into internal interval structure
export function intervalsFromBed(data) {
  // TODO: Don't imply optional fields beyond first three required for bed format
  const rows = d3.tsvParseRows(data, d => {
    return {
      chrom: d[0],
      start: parseInt(d[1]),
      stop: parseInt(d[2]),
      featureName: d[3],
      strand: d[5],
    };
  });
  return rows;
}
