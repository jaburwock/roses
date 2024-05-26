import * as d3 from 'd3';
import { randomRectangleTrack, helixTrack, lollipopTrack } from '/src/tracks.js';




// Plots list of variant objects with:
// Required fields: {chr, pos}
// Optional fields: {palette, thorns, leaves, height}
// Palette defaults to blue, thorns to 0, leaves to 0 and height to randomly vary and avoid overlaps
function roseTrack(svg, variants, x, y, lowerY) {

}

// Plots list of interval objects with:
// Required fields: {chr, start, stop}
// Optional fields: {name, colour, tooltips?}
function intervalTrack(svg, intervals, x, y) {

}


function drawPlot(targetDiv) {
  const element = d3.select(targetDiv);
  element.style("background-color", "var(--pico-card-background-color)");
  // element.style("background-color", "red");
  const width  = element.node().offsetWidth;
  const height = element.node().offsetHeight;
  const margin = {top: 40, bottom: 40, left: 40, right: 40};
  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewbox", [0, 0, width, height]);

  // TODO: Define intervals to later be plotted first in preparation for user/API input
  // TODO: Calculate plot positions from given list of intervals (bed format, 0-based, half-open)

  // Stand in for nucleotide positions
  const positions = d3.range(1, 101);
  const xPadding = 2;

  const x = d3.scaleLinear()
    .domain([0 - xPadding, d3.max(positions) + xPadding])
    .range([margin.left, width - margin.right]);

  // Generate stacked y axes with a given array of proportions
  const yProportions = [0.5, 0.2, 0.15, 0.15];
  const yHeights = yProportions.map(d => d * (height - margin.top - margin.bottom));
  const yCoords = d3.pairs(d3.cumsum([margin.top].concat(yHeights)));
  const yAxes = yCoords.map(d => 
    d3.scaleLinear()
      .domain([-1, 1])
      .range([d[1], d[0]])
  );
  // Deconstruct and assign generated axes
  const [y0, y1, y2, y3] = yAxes;

  const [lps, stems] = lollipopTrack(svg, positions, x, y0, y1)
  // Draw tracks onto axes with track functions
  const rec1 = randomRectangleTrack(svg, positions, x, y1, "steelblue", 3, 0.4);
  const rec2 = randomRectangleTrack(svg, positions, x, y2, "darkorange", 5, 0.5);
  const rec3 = randomRectangleTrack(svg, positions, x, y3, "slategrey", 5, 0.5);

  // Draw top track x axis
  const mainX = svg.append("g")
    .attr("transform", `translate(0, ${y3(-1)})`)
    .call(d3.axisBottom(x))

  // Track zoom handling function
  const minScale = 1;
  const maxScale = 10;
  function zoomed(event) {
    const xz = event.transform.rescaleX(x);
    // Calculate rescaled scale (k), x and y values (from default scale of 1)
    const rs = event.transform.scale(1);
    rec1.attr("transform", `translate(${rs.x}) scale(${rs.k}, 1)`)
    rec2.attr("transform", `translate(${rs.x}) scale(${rs.k}, 1)`)
    rec3.attr("transform", `translate(${rs.x}) scale(${rs.k}, 1)`)
    lps.attr("transform", d => `translate(${xz(d.position)}, ${y0(d.height)}) scale(${d.size})`)
    stems.attr("transform", d => `translate(${xz(d.position)})`)
    mainX.call(d3.axisBottom(xz));
  }

  // Setting up zoom handling
  const zoom = d3.zoom()
    .scaleExtent([minScale, maxScale])
    .extent([[margin.left, 0], [width - margin.right, height]])
    .translateExtent([[margin.left, -Infinity], [width - margin.right, Infinity]])
    .on("zoom", zoomed);

  // Register zoom handling function
  svg.call(zoom)
    // Optional: Set initial zoom with a transition
    // .transition().delay(4000).duration(2000)
    // .call(zoom.scaleTo, 2);

  element.node().append(svg.node());
}



function main() {
  const plotTarget = "#app";
  drawPlot(plotTarget);
}


document.addEventListener("DOMContentLoaded", main);
