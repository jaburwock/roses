import * as d3 from 'd3';


// Parse bed format into internal interval structure
function intervalsFromBed(data) {
  // TODO: Don't imply optional fields beyond first three required for bed format
  return d3.tsvParseRows(data, d => {
    return {
      chrom: d[0],
      start: parseInt(d[1]),
      stop: parseInt(d[2]),
      featureName: d[3],
      strand: d[5],
    };
  });
}

// TODO: Everything basically assumes intervals are on the same contig at the moment, implement multiple contig handling

export default class TrackPlot {
    // Config object with default values
    config = {
        marginLeft:   40,
        marginRight:  40,
        marginTop:    40,
        marginBottom: 40,
        maxPocketGap: 20,
        gapPadding:   20,
    }

    constructor(targetDiv, config={}) {
        // List of tracks, each track being an object of structure accessed by a unique name
        // {intervals: a list of interval objects, yFraction: number, used to calculate proportion of plot yspace the track spans}
        // TODO: Maybe instead of name-accessed objects store tracks as an array of objects with an additional property (yOrder)
        //       keep track array sorted by yOrder (arbitrary integer) so all updates/draws can just zip and iterate
        //       also maybe store ySelection in these objects too (created when track added, destroyed when removed)
        this.tracks = [];
        // this.tracks = {};
        this.pockets = [];
        this.container = d3.select(targetDiv);
        this.container.size() == 1 || console.error("TrackPlot constructor error, target div selector non-unique.");
        // Replace config defaults with any user defined config values
        // TODO: Extend this and link to interface elements
        this.config = {...this.config, ...config};
        this.width  = this.container.node().offsetWidth;
        this.height = this.container.node().offsetHeight;

        this.plotStart = 0;
        this.plotEnd = 0;
        this.xCoords = [];
        this.gCoords = [];
        this.xcMaps = {};  // Collect maps/sparse-arrays translating from different coordinate systems to positions on plot x axis
        this.xScale = undefined;
        // Maybe yScales should be a d3 selection of tagged g elements holding the y axes
        // That way can use the enter/update/exit pattern to manipulate yAxes using a data join on this.tracks
        this.yScales = [];

        this.svg = this.container.append("svg");
        // this.xContainer = this.svg.append("g");
        this.xTop    = this.svg.append("g");
        this.xBottom = this.svg.append("g");
    }

    addTrack(trackName, intervals, trackConfig={}) {
        const trackDefaults = {
            type: "span",  // "point"
            colour: "steelblue",
            yFraction: 1,
            yOrder: 1,
        }
        this.tracks.push({
            ...trackDefaults,
            ...trackConfig,
            name: trackName,
            intervals: intervals,
            yContainer: this.svg.append("g"),
            trackContainer: this.svg.append("g"),
        });  // ?
        this.tracks.sort((a, b) => a.yOrder - b.yOrder);
        this.recalculatePockets();
        // this.updateYs();
        // this.updateX();
        // So when do the tracks actually get drawn/updated?
        // In draw I reckon (so can probably remove above updateX since draw just calls it straightaway)
        // Also maybe make draw optional so can add a number of tracks then draw all at once
        this.draw();
    }

    // Draw/update plot details (also for window resize)
    draw() {
        this.width  = this.container.node().offsetWidth;
        this.height = this.container.node().offsetHeight;
        this.svg
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("viewbox", [0, 0, this.width, this.height]);
        this.updateYs();
        this.updateX();
        // this.svg.style("background-color", "grey");
        for (const [track, y] of d3.zip(this.tracks, this.yScales)) {
            if (track.type == "span") {
                const height = 0.5;
                const recHeight = Math.abs(y(-height) - y(height));
                track.trackContainer.selectAll("rect")
                    .data(track.intervals, d => d.start)
                    .join("rect")
                    .attr("y", y(1))
                    .transition().duration(600)
                    .attr("x", d => this.xScale(this.gCoords[d.start]))
                    .attr("fill", track.colour)
                    .attr("height", recHeight)
                    .attr("width", d => this.xScale(this.gCoords[d.stop]) - this.xScale(this.gCoords[d.start]))
            } else if (track.type == "point") {
                console.log("point tracks not yet implemented.")
            }
        }
    }

    // Recalculate/update yscales from track yProportions
    // Called on addition or vertical resizing of track
    updateYs(drawYs=true) {
        // Loop through this.tracks
        // Sum trackFraction values and calculate proportions as trackFraction / totalFractions
        // Rescale and transform y axes to new heights and positions
        const fractionTotal = d3.sum(this.tracks, d => d.yFraction);
        const yProportions = this.tracks.map(d => d.yFraction / fractionTotal);
        const yHeights = yProportions.map(d => d * (this.height - this.config.marginTop - this.config.marginBottom));
        const yCoords = d3.pairs(d3.cumsum([this.config.marginTop].concat(yHeights)));
        this.yScales = yCoords.map(d => 
          d3.scaleLinear()
            .domain([-1, 1])
            .range([d[1], d[0]]));
        // Optionally draw/update y axis marks
        // TODO: Remove already drawn y axes from containers if drawYs is false
        drawYs && d3.zip(this.tracks, this.yScales).map(t =>
          t[0].yContainer.transition().duration(600)
            .attr("transform", `translate(${this.config.marginLeft}, 0)`)
            .call(d3.axisLeft(t[1]))
        );
    }

    // Recalculate pockets from tracks and maxPocketGap (number of positions between intervals/features to create a new pocket)
    // Also recalculates plotEnd, xScale and relative coordinate-spaces relative to the new pockets
    recalculatePockets() {
        // Loop through this.tracks
        // And all the intervals in each track
        // And determine the bounds of the plot view pockets
        let newPockets = [];
        // Aggregate intervals
        let allIntervals = [];
        for (const track of this.tracks) {
            allIntervals.push(...track.intervals);
        }
        // Sort by contig start position
        allIntervals.sort((a, b) => a.start - b.start);

        // Loop through interval positions
        // Keep track of the highest last seen end position
        // If a start position is greater than this.config.maxPocketGap away from the last highest seen end position
        // Close the last pocket, push to array and open a new pocket starting at that start position
        // console.log("again");
        let lastHighestStop = 0;
        let pocketStart = 0;
        for (const it of allIntervals) {
            if (it.start > (lastHighestStop + this.config.maxPocketGap)) {
                newPockets.push([pocketStart, lastHighestStop]);
                pocketStart = it.start;
            }
            lastHighestStop = it.stop > (lastHighestStop + this.config.maxPocketGap) ? it.stop : lastHighestStop;
        }
        // Push final trailing pocket and remove erroneous [0, 0] pocket indicating no intervals near contig 0
        newPockets.push([pocketStart, lastHighestStop]);
        newPockets = newPockets[0][0] == 0 && newPockets[0][1] == 0 ? newPockets.slice(1) : newPockets;
        this.pockets = newPockets;
        // xCoords is an array equal to plot length containing corresponding genomic coordinates at each position
        this.xCoords = this.pockets.map(d => d3.range(d[0] - this.config.gapPadding, d[1] + this.config.gapPadding)).flat();

        // Sparse array mapping gCoords to xCoords
        this.gCoords = new Array();
        this.xCoords.forEach((e, i) => this.gCoords[e] = i);
        // console.log(gCoords.length);
        // Also create an array containing the index of the contig coordinate at the beginning of each pocket
        //   (can also use this to visually indicate breakpoints)
        // This index array can then be used to binary search the location of a given genomic coordinate in the plot array
        //     TODO: Write lookup method for this for later plotting of variants
        // Or use sparse array/map to hold genomic > plot coordinate mappings
    }

    updateX(drawX=false) {
        // So now we have an array of pairs of [start, stop] defining the contiguous contig regions to be plotted
        // Next, calculate the total length (N) of this space (plus any defined visual padding between pockets, though maybe maxPocketGap defines padding? Though nah cause you might want gapped elements to be plotted together but still have some visual padding between pockets)
        // Now create an array (A) of length N with the corresponding contig coordinates at each index
        // Also create an array containing the index of the contig coordinate at the beginning of each pocket
        //   (can also use this to visually indicate breakpoints)
        // This index array can then be used to binary search the location of a given genomic coordinate in the plot array
        //     TODO: Write lookup method for this for later plotting of variants

        // xScale is just a map, doesn't hold any references to anything so can replace it
        this.xScale = d3.scaleLinear()
            .domain([0, this.xCoords.length])
            .range([this.config.marginLeft, this.width - this.config.marginRight]);

        // Draw axis with genomic coord ticks
        const xTickFuncContig = d => 'g.' + this.xCoords[d];
        // TODO: Exclude stitched interval padding from relative coords
        this.xBottom
          .attr("transform", `translate(0, ${this.height - this.config.marginBottom - 0})`)
          .call(d3.axisBottom(this.xScale).tickFormat(xTickFuncContig));
        // Draw axis with relative feature position coord ticks
        this.xTop
          .attr("transform", `translate(0, ${this.height - this.config.marginBottom})`)
          .call(d3.axisTop(this.xScale));
    }

    // Update minimal plot details on window resize
    updateSVG() {
        this.width  = this.container.node().offsetWidth;
        this.height = this.container.node().offsetHeight;
        this.svg
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("viewbox", [0, 0, this.width, this.height]);
        this.updateX();
        // this.svg.style("background-color", "grey");
    }


    removeTrack(trackName) {
    }

}


// function drawPlot(targetDiv) {
//   // -------- SVG Container Setup --------
//   const element = d3.select(targetDiv);
//   element.style("background-color", "var(--pico-card-background-color)");
//   element.style("box-shadow", "var(--pico-box-shadow)");
//   const width  = element.node().offsetWidth;
//   const height = element.node().offsetHeight;
//   const margin = {top: 40, bottom: 40, left: 40, right: 40};
//   const svg = d3.create("svg")
//     .attr("width", width)
//     .attr("height", height)
//     .attr("viewbox", [0, 0, width, height]);

//   // -------- Processing Interval Data --------
//   // TODO: Define intervals to later be plotted first in preparation for user/API input
//   // TODO: Calculate plot positions from given list of intervals (bed format, 0-based, half-open)
//   const intervals = intervalsFromBed(TEST_INTERVALS);
//   // const minInterval = d3.min(intervals, d => d.start);
//   // const maxInterval = d3.max(intervals, d => d.stop);
//   // Stitch intervals onto a shared scale
//   const stitchPadding = 5;
//   const [stitchedIntervals, positionMap] = stitchIntervals(intervals, stitchPadding);
//   const minInterval = d3.min(stitchedIntervals, d => d.pStart);
//   const maxInterval = d3.max(stitchedIntervals, d => d.pStop);
//   // console.log(Object.keys(positionMap).length);

//   // -------- Setting Up X/Y Scales --------
//   const xPadding = 100;
//   const x = d3.scaleLinear()
//     .domain([minInterval - xPadding, maxInterval + xPadding])
//     .range([margin.left, width - margin.right]);
//   // Generate stacked y axes with a given array of proportions
//   const yProportions = [0.5, 0.25, 0.25];
//   const yHeights = yProportions.map(d => d * (height - margin.top - margin.bottom));
//   const yCoords = d3.pairs(d3.cumsum([margin.top].concat(yHeights)));
//   const yAxes = yCoords.map(d => 
//     d3.scaleLinear()
//       .domain([-1, 1])
//       .range([d[1], d[0]])
//   );
//   // Deconstruct and assign generated axes
//   const [y0, y1, y2] = yAxes;

//   // -------- Drawing Tracks --------
//   // const roses = roseTrack(svg, [], x, y0, y1);
//   const track00 = intervalTrack(svg, stitchedIntervals, x, y1);

//   // -------- Drawing Axis Marks --------
//   // Main track x axis
//   // TODO: Need function mapping p coords to g coords for axis display
//   const xTickFormatGenomicFunc = d => "g." + positionMap[d];
//   // Draw axis with genomic coord ticks
//   // TODO: Exclude stitched interval padding from relative coords
//   const mainX = svg.append("g")
//     .attr("transform", `translate(0, ${y2(-1)})`)
//     .call(d3.axisBottom(x).tickFormat(xTickFormatGenomicFunc))
//   // Draw axis with relative feature position coord ticks
//   const relX = svg.append("g")
//     .attr("transform", `translate(0, ${y2(-1)})`)
//     .call(d3.axisTop(x))
//   // Draw all y axis marks
//   const yDivs = yAxes.map(d =>
//     svg.append("g")
//       .attr("transform", `translate(${margin.left}, 0)`)
//       .call(d3.axisLeft(d))
//   );

//   // -------- Plot Zoom Handling --------
//   // Track zoom handling function
//   const minScale = 1;
//   const maxScale = 800;
//   function zoomed(event) {
//     const xz = event.transform.rescaleX(x);
//     // Calculate rescaled scale (k), x and y values (from default scale of 1)
//     const rs = event.transform.scale(1);
//     track00.attr("transform", `translate(${rs.x}) scale(${rs.k}, 1)`)
//     mainX.call(d3.axisBottom(xz).tickFormat(xTickFormatGenomicFunc))
//     relX.call(d3.axisTop(xz))
//   }

//   // Setting up zoom handling using zoom handling function
//   const zoom = d3.zoom()
//     .scaleExtent([minScale, maxScale])
//     .extent([[margin.left, 0], [width - margin.right, height]])
//     .translateExtent([[margin.left, -Infinity], [width - margin.right, Infinity]])
//     .on("zoom", zoomed);

//   // Register zoom handling function
//   svg.call(zoom)
//     // Optional: Set initial zoom with a transition
//     // .transition().duration(2000)
//     // .call(zoom.scaleTo, 2);

//   element.node().append(svg.node());
// }