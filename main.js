import * as d3 from 'd3';
import { randomRectangleTrack, helixTrack, lollipopTrack } from '/src/tracks.js';



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
  const hel0 = helixTrack(svg, positions, x, y1)
  const rec1 = randomRectangleTrack(svg, positions, x, y2, "steelblue", 3, 0.32);
  const rec2 = randomRectangleTrack(svg, positions, x, y3, "darkorange", 5, 0.5);

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
    // rs.k > 2.5 ? hel0.unwind() : hel0.wind();  // Simple zoom-dependent helix winding
    hel0.attr("transform", `translate(${rs.x}) scale(${rs.k}, 1)`)
    rec1.attr("transform", `translate(${rs.x}) scale(${rs.k}, 1)`)
    rec2.attr("transform", `translate(${rs.x}) scale(${rs.k}, 1)`)
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
