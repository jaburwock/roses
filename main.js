import * as d3 from 'd3';
import { randomRectangleTrack, helixTrack, lollipopTrack } from '/src/tracks.js';
import { intervalsFromBed, tracksFromUniprotJSON } from './src/intervalParsers.js';
import TrackPlot from '/src/TrackPlot.js';


const TEST_INTERVALS_BRCA2 = `chr13	32315507	32315667	BRCA2	.	+
chr13	32316421	32316527	BRCA2	.	+
chr13	32319076	32319325	BRCA2	.	+
chr13	32325075	32325184	BRCA2	.	+
chr13	32326100	32326150	BRCA2	.	+
chr13	32326241	32326282	BRCA2	.	+
chr13	32326498	32326613	BRCA2	.	+
chr13	32329442	32329492	BRCA2	.	+
chr13	32330918	32331030	BRCA2	.	+
chr13	32332271	32333387	BRCA2	.	+
chr13	32336264	32341196	BRCA2	.	+
chr13	32344557	32344653	BRCA2	.	+
chr13	32346826	32346896	BRCA2	.	+
chr13	32354860	32355288	BRCA2	.	+
chr13	32356427	32356609	BRCA2	.	+
chr13	32357741	32357929	BRCA2	.	+
chr13	32362522	32362693	BRCA2	.	+
chr13	32363178	32363533	BRCA2	.	+
chr13	32370401	32370557	BRCA2	.	+
chr13	32370955	32371100	BRCA2	.	+
chr13	32376669	32376791	BRCA2	.	+
chr13	32379316	32379515	BRCA2	.	+
chr13	32379749	32379913	BRCA2	.	+
chr13	32380006	32380145	BRCA2	.	+
chr13	32394688	32394933	BRCA2	.	+
chr13	32396897	32397044	BRCA2	.	+
chr13	32398161	32400268	BRCA2	.	+`;

const TEST_INTERVALS_FIVE = `chr13	1000	1100	BRCA2	.	+
chr13	32316421	32316527	BRCA2	.	+
chr13	32319076	32319425	BRCA2	.	+
chr13	32325075	32325184	BRCA2	.	+
chr13	32398161	32400268	BRCA2	.	+`;

const TEST_BED_SIMPLE_00 = `chr13	0	10	BRCA2	.	+
chr13	15	20	BRCA2	.	+
`;
const TEST_BED_SIMPLE_01 = `chr13	100	110	BRCA2	.	+
chr13	115	120	BRCA2	.	+
`;


// Plots list of variant objects with:
// Required fields: {chr, pos}
// Optional fields: {palette, thorns, leaves, height}
// Palette defaults to blue, thorns to 0, leaves to 0 and height to randomly vary and avoid overlaps
function roseTrack(svg, variants, x, y, lowerY) {
  // Paths of rose petals from the bottom up
  const petalPaths = [ "M45-45C33-47 24-45-7-27S-45 22-44 41C-36 40-31 42-20 36 11 19 60-22 45-45", "M58-14C47 9 50 4 43 27S-30 17-25 3-6-31 24-30 50-23 58-14", "M17-57C24-45 34-42 39-33 50-10 11 24-1 21S-16-11-11-36C-10-42-6-60 17-57", "M-23-55C-9-55-6-52 1-44 9-36 26 6 10 18-6 28-34-3-31-36-29-47-26-48-23-55", "M-49-24C-54 0-48 9-40 13S17 28 29 8-3-68-49-24", "M-48 27C-47 16-51 16-48 7-39-16-22-33 25-24 59-17 19 16 0 25-19 34-28 41-48 27", "M8 58C-1 58-15 45-24 44-35 43-29-20-2-31 34-43 38 12 36 32 36 45 29 46 25 49 20 52 17 58 8 58", "M-6 13C-34 8-36-18-27-35-21-46-8-50 1-42 7-37 21-39 26-31 31-21 15-17 11-9 5 0 5 15-6 13", "M18-20C-9-44-37-16-41-8-47 7-31 16-24 32-16 41-7 45 5 34 12 28 31 27 25-7 23-16 22-16 18-20", "M-10-13C-33 13-6 42 8 43 17 44 23 34 38 28 51 21 49 11 44 0 41-20 37-26 3-20-6-18-6-17-10-13", "M-7-8C-32 10-14 32 0 32S32 20 32 2 16-39-7-8", "M4 3C-10 10-21 8-26 0S-19-29-4-29 15-17 15-7C13-4 10 0 4 3", "M-10 0C-16-7-11-19 0-19S19-6 19 0 8 18 0 18-13 12-13 7-11 3-10 0", "M5 0A1 1 0 00-6 0 1 1 0 005 0", ];
  const roseColours = {
    roseRed: d3.scaleSequential([8, -1], d3.interpolateReds),
    roseBlue: d3.scaleSequential([-6,  2], d3.interpolateBlues),
    roseGreen: d3.scaleSequential([-6,  3], d3.interpolateGreens),
  };
}


function setupFilePicker() {
  const picker = d3.select("#filepicker");
  picker.on("change", () => {
    const reader = new FileReader();
    const file = picker.node().files[0];
    // Add reader load callback to dispatch to format parser and add to plot object
    // TODO: Check format extension
    reader.addEventListener("load", () => {
      const intervals = intervalsFromBed(reader.result);
      // TODO: Call function to plot intervals as track somehow (see notes below, maybe above)
    })
    file && reader.readAsText(file);
  })
}


async function main() {
  const plotTarget = "#app";
  // TODO: Then like, setupFilePicker(plot);



  const mainPlot = new TrackPlot(plotTarget, {gapPadding: 0});
  // await new Promise(r => setTimeout(r, 2000));
  // mainPlot.addTrack("Track1", intervalsFromBed(TEST_BED_SIMPLE_00), {colour: "darkorange"});
  // await new Promise(r => setTimeout(r, 1000));
  // mainPlot.addTrack("Track2", intervalsFromBed(TEST_BED_SIMPLE_01));
  // await new Promise(r => setTimeout(r, 2000));
  // mainPlot.addTrack("PALB2", intervalsFromBed(TEST_INTERVALS_FIVE), {colour: "darkorange"});
  // await new Promise(r => setTimeout(r, 2000));
  // mainPlot.addTrack("BRCA2", intervalsFromBed(TEST_INTERVALS_BRCA2), {colour: "slategrey", yFraction: 2, yOrder: -1, type: "span"});
  // mainPlot.initializeZoom();
  // await new Promise(r => setTimeout(r, 2000));
  // mainPlot.addTrack("PALB2", intervalsFromBed(TEST_INTERVALS_FIVE));
  // mainPlot.draw();




  // const trackScale = d3.scaleSequential([-1, 7], d3.interpolateViridis);
  const trackScale = d3.scaleOrdinal(d3.schemeDark2);
  const uniprotTestJSON = await d3.text('data/CHEK2_uniprot_feature_info.json');
  const uniprotTestTracks = tracksFromUniprotJSON(uniprotTestJSON);
  // console.log(uniprotTestTracks.slice(0, 4));
  for (const i in uniprotTestTracks.slice(0, 4)) {
    const track = uniprotTestTracks[i];
    mainPlot.addTrack(track.name, track.intervals, {colour: trackScale(i)});
    await new Promise(r => setTimeout(r, 600));
  }
  // await new Promise(r => setTimeout(r, 2000));
  // mainPlot.addTrack("BRCA2", intervalsFromBed(TEST_INTERVALS_BRCA2));



  // Adding redraw on window resize
  d3.select(window).on("resize", () => mainPlot.draw());
  mainPlot.initializeZoom();


  // TODO 2: Pass reference to plot object to filepicker setup so filepicker can call plot.addTrack(intervals) after parsing
  setupFilePicker();
}


document.addEventListener("DOMContentLoaded", main);
