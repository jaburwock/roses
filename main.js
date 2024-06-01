import * as d3 from 'd3';
import { randomRectangleTrack, helixTrack, lollipopTrack } from '/src/tracks.js';
import TrackPlot from '/src/TrackPlot.js';


const TEST_INTERVALS = `chr13	32315507	32315667	BRCA2	.	+
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


// Parse bed format into internal interval structure
function intervalsFromBed(data) {
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


function stitchIntervals(intervals, padding=0) {
  let cpos = 0;  // Variable to keep track of 0-based stitched position
  // Return a map of plot positions to genomic positions
  let pMap = {};
  const stitchedIntervals = intervals.map(d => {
    const featureLength = d.stop - d.start;
    const gOffset = d.start - padding;
    // Map over the range of the feature length creating genomic position lookups
    d3.range(featureLength + padding * 2).map(d => {
      pMap[cpos + d] = gOffset + d;
    })
    // Create stitched record with pStart and pStop coordinates corresponding to the 0-based stiched range
    //   including padding. Also pass through corresponding genomic start and and stop positions for axis labeling
    cpos += padding;
    const record =  {
      chrom: d.chrom,
      pStart: cpos,
      pStop : cpos + featureLength,
      gStart: d.start,
      gStop: d.stop,
      featureName: d.featureName,
      strand: d.strand,
    };
    cpos += featureLength + padding;
    return record;
  });
  return [stitchedIntervals, pMap];
}


// Plots list of interval objects with:
// Required fields: {chr, start, stop}
// Optional fields: {name, colour, tooltips?}
// TODO: Update descriptionto accomodate new interval format having 
//       separate position (p) and genomic (g) start and stop coordinates
function intervalTrack(svg, intervals, x, y) {
  const height = 0.5;
  const recHeight = y(-height) - y(height);
  const track = svg.append("g").selectAll("rect")
    .data(intervals)
    .join("rect")
    .attr("fill", "darkorange")
    // .attr("stroke", "var(--pico-color)")
    .attr("height", recHeight)
    .attr("width", d => x(d.pStop) - x(d.pStart))
    .attr("x", d => x(d.pStart))
    .attr("y", y(height));
  return track;
}


function drawPlot(targetDiv) {
  // -------- SVG Container Setup --------
  const element = d3.select(targetDiv);
  element.style("background-color", "var(--pico-card-background-color)");
  element.style("box-shadow", "var(--pico-box-shadow)");
  const width  = element.node().offsetWidth;
  const height = element.node().offsetHeight;
  const margin = {top: 40, bottom: 40, left: 40, right: 40};
  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewbox", [0, 0, width, height]);

  // -------- Processing Interval Data --------
  // TODO: Define intervals to later be plotted first in preparation for user/API input
  // TODO: Calculate plot positions from given list of intervals (bed format, 0-based, half-open)
  const intervals = intervalsFromBed(TEST_INTERVALS);
  // const minInterval = d3.min(intervals, d => d.start);
  // const maxInterval = d3.max(intervals, d => d.stop);
  // Stitch intervals onto a shared scale
  const stitchPadding = 5;
  const [stitchedIntervals, positionMap] = stitchIntervals(intervals, stitchPadding);
  const minInterval = d3.min(stitchedIntervals, d => d.pStart);
  const maxInterval = d3.max(stitchedIntervals, d => d.pStop);
  // console.log(Object.keys(positionMap).length);

  // -------- Setting Up X/Y Scales --------
  const xPadding = 100;
  const x = d3.scaleLinear()
    .domain([minInterval - xPadding, maxInterval + xPadding])
    .range([margin.left, width - margin.right]);
  // Generate stacked y axes with a given array of proportions
  const yProportions = [0.5, 0.25, 0.25];
  const yHeights = yProportions.map(d => d * (height - margin.top - margin.bottom));
  const yCoords = d3.pairs(d3.cumsum([margin.top].concat(yHeights)));
  const yAxes = yCoords.map(d => 
    d3.scaleLinear()
      .domain([-1, 1])
      .range([d[1], d[0]])
  );
  // Deconstruct and assign generated axes
  const [y0, y1, y2] = yAxes;

  // -------- Drawing Tracks --------
  // const roses = roseTrack(svg, [], x, y0, y1);
  const track00 = intervalTrack(svg, stitchedIntervals, x, y1);

  // -------- Drawing Axis Marks --------
  // Main track x axis
  // TODO: Need function mapping p coords to g coords for axis display
  const xTickFormatGenomicFunc = d => "g." + positionMap[d];
  // Draw axis with genomic coord ticks
  // TODO: Exclude stitched interval padding from relative coords
  const mainX = svg.append("g")
    .attr("transform", `translate(0, ${y2(-1)})`)
    .call(d3.axisBottom(x).tickFormat(xTickFormatGenomicFunc))
  // Draw axis with relative feature position coord ticks
  const relX = svg.append("g")
    .attr("transform", `translate(0, ${y2(-1)})`)
    .call(d3.axisTop(x))
  // Draw all y axis marks
  const yDivs = yAxes.map(d =>
    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(d))
  );

  // -------- Plot Zoom Handling --------
  // Track zoom handling function
  const minScale = 1;
  const maxScale = 800;
  function zoomed(event) {
    const xz = event.transform.rescaleX(x);
    // Calculate rescaled scale (k), x and y values (from default scale of 1)
    const rs = event.transform.scale(1);
    track00.attr("transform", `translate(${rs.x}) scale(${rs.k}, 1)`)
    mainX.call(d3.axisBottom(xz).tickFormat(xTickFormatGenomicFunc))
    relX.call(d3.axisTop(xz))
  }

  // Setting up zoom handling using zoom handling function
  const zoom = d3.zoom()
    .scaleExtent([minScale, maxScale])
    .extent([[margin.left, 0], [width - margin.right, height]])
    .translateExtent([[margin.left, -Infinity], [width - margin.right, Infinity]])
    .on("zoom", zoomed);

  // Register zoom handling function
  svg.call(zoom)
    // Optional: Set initial zoom with a transition
    // .transition().duration(2000)
    // .call(zoom.scaleTo, 2);

  element.node().append(svg.node());
}



async function main() {
  const plotTarget = "#app";
  // TODO: Turn plot into a class, return class from drawPlot
  // TODO: So like, const plot = TrackPlot.initialise("#app");
  // TODO: Then like, setupFilePicker(plot);
  // drawPlot(plotTarget);

  const mainPlot = new TrackPlot(plotTarget, {gapPadding: 4});
  mainPlot.addTrack("Track1", intervalsFromBed(TEST_BED_SIMPLE_00), {colour: "pink"});
  mainPlot.addTrack("Track2", intervalsFromBed(TEST_BED_SIMPLE_01));
  // await new Promise(r => setTimeout(r, 2000));
  // mainPlot.addTrack("BRCA2", intervalsFromBed(TEST_INTERVALS));
  // await new Promise(r => setTimeout(r, 2000));
  // mainPlot.addTrack("PALB2", intervalsFromBed(TEST_INTERVALS_FIVE), {colour: "darkorange"});
  // await new Promise(r => setTimeout(r, 2000));
  // mainPlot.addTrack("BRCA2", intervalsFromBed(TEST_INTERVALS), {colour: "slategrey", yFraction: 2, yOrder: -1, type: "span"});
  mainPlot.initializeZoom();
  // await new Promise(r => setTimeout(r, 2000));
  // mainPlot.addTrack("PALB2", intervalsFromBed(TEST_INTERVALS_FIVE));
  // mainPlot.draw();

  // Adding redraw on window resize
  d3.select(window).on("resize", () => mainPlot.draw());




  // TODO 2: Pass reference to plot object to filepicker setup so filepicker can call plot.addTrack(intervals) after parsing
  setupFilePicker();
}


document.addEventListener("DOMContentLoaded", main);
