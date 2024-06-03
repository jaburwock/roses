import * as d3 from 'd3';


// Global TODO:
// - Finish implementing point/variant tracks
// - Write some very simple test tracks/intervals to check coordinate systems/positioning
//    - Confirm intervals match expected locations based on source formats (bed/gff/gtf)
// - Everything basically assumes intervals are on the same contig at the moment, implement multiple contig handling
export default class TrackPlot {
    // Config object with default values
    config = {
        marginLeft:   60,
        marginRight:  40,
        marginTop:    40,
        marginBottom: 40,
        maxPocketGap: 20,
        // Pocket gaps get messed up when gapPadding > 90?
        // TODO: Also seems to error when gapPadding = 0. Fixed, range generation was off by one. Not fixed again.
        gapPadding: 0,
        gapPaddingType: "fixed",  // TODO: Add option to make gap padding proportional to absolute distance between pockets
        addTrackLabels: true,
        addIntervalLabels: true,
    }

    constructor(targetDiv, config={}) {
        // List of tracks, each track being an object of structure accessed by a unique name
        this.tracks = [];
        this.pockets = [];
        this.container = d3.select(targetDiv);
        this.container.size() == 1 || console.error("TrackPlot constructor error, target div selector non-unique.");
        // Replace config defaults with any user defined config values
        // TODO: Extend this and link to interface elements
        this.config = {...this.config, ...config};
        this.width  = this.container.node().offsetWidth;
        this.height = this.container.node().offsetHeight;

        // TODO: I think the below arrays/lookups can be grouped into
        // - Tick coordinate lookups mapping from a given plot coordinate to some other coordinate system. Genomic, track, etc.
        // - Scale coordinate lookups for mapping from other coordinate systems to positions on the x scale/domain.
        //   Effectively the inverse of tick coordinate lookups.
        // Tick coordinate lookups can either be simple dense arrays equal to the length of the x domain or maps if they
        //   only partially cover the x domain. Both returning a coordinate value for a given set of x domain indices.
        // Scale coordinate lookups are probably best as maps or objects as other coordinate systems will vary and generally be sparse
        //    relative to the domain.
        this.xCoords = [];  // Plot coordinate    => genomic coordinate
        this.fCoords = new Map();  // Plot coordinate => top track interval-relative coordinate
        this.gCoords = [];  // Genomic coordinate => plot coordinate (sparse array)
        this.xCoordMaps = {};  // TODO: Collect maps/sparse-arrays translating from different coordinate systems to positions on plot x axis
        this.xScale = d3.scaleLinear();
        this.tickFunctions = {
            contig: d => (this.xCoords[d] ? 'g.' : '') + (this.xCoords[d] ?? ''),   // This is just awful, switch to maps and check membership gracefully
            track: d => this.fCoords.has(d) ? 'c.' + (this.fCoords.get(d) + 0) : '',  // 0-based top track-relative coords
        };
        this.yScales = [];

        // Adding all plot element group elements here to set overall draw order
        this.svg = this.container.append("svg");
        this.xTop    = this.svg.append("g");
        this.xBottom = this.svg.append("g");
        this.trackContainerGroup = this.svg.append("g");
        this.pocketContainer = this.svg.append("g");
        this.pocketMarks = undefined;
        this.labelContainer = this.svg.append("g");
    }

    addTrack(trackName, intervals, trackConfig={}) {
        const trackDefaults = {
            type: "span",  // "point"
            colour: "steelblue",
            yFraction: 1,
            yOrder: 1,
        }
        // TODO: Store point tracks in a separate array? So they can be coalesced into a single upper track
        this.tracks.push({
            ...trackDefaults,
            ...trackConfig,
            name: trackName,
            intervals: intervals,
            yContainer: this.svg.append("g"),
            trackContainer: this.trackContainerGroup.append("g"),
        });
        this.tracks.sort((a, b) => a.yOrder - b.yOrder);
        this.recalculatePockets();
        // TODO: Maybe make draw optional so can add a number of tracks then draw all at once
        this.draw();
    }

    // Master function to draw/update plot details (also for window resize)
    draw() {
        this.width  = this.container.node().offsetWidth;
        this.height = this.container.node().offsetHeight;
        this.svg
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("viewbox", [0, 0, this.width, this.height]);
        this.updateYs();
        this.updateX();
        this.#drawPockets();
        this.config.addTrackLabels && this.#drawLabels();
        // Loop through tracks and yScales drawing/updating track content
        for (const [track, y] of d3.zip(this.tracks, this.yScales)) {
            if (track.type == "span") {
                this.#drawSpans(track, y, this.xScale);
            } else if (track.type == "point") {
                this.#drawPoints(track, y);
                // console.log("point tracks not yet implemented.")
            }
        }
    }

    #drawLabels() {
        this.labelContainer
            .selectAll("text")
            .data(d3.zip(this.tracks, this.yScales), d => d[0].name)
            .join("text").transition().duration(500)
              .attr("text-anchor", "middle")
              .attr("transform", d => `translate(${this.xScale(0) - 32}, ${d[1](0)}) rotate(-75)`)
              .text(d => d[0].name)
    }

    // Draw and update lines to indicate x-coordinate breaks of pockets
    // TODO: Draw as rectangles instead that can optionally shade the areas of the gaps
    // TODO: Maybe #drawGaps() is a more descriptive name
    #drawPockets(type="line") {
        const top = this.yScales[0](0.5);
        const bottom = this.yScales[this.yScales.length - 1](-0.5);
        // Create array with start of each pocket as an identifer and it's end position mapped to the x coordinate space
        const markCoords = this.pockets.map(p => {
            return [p[0], this.gCoords[p[1] - 1] + this.config.gapPadding];
        });
        this.pocketMarks = this.pocketContainer
            .selectAll("line")
            .data(markCoords, d => d[0])
            .join("line");
        this.pocketMarks
            .transition().duration(600)
              .attr("stroke", "var(--pico-color)")
              .attr("stroke-width", 1)
              .attr("opacity", 0.8)
              .attr("y1", top)
              .attr("y2", bottom)
              .attr("x1", d => this.xScale(d[1]))
              .attr("x2", d => this.xScale(d[1]))
    }

    // TODO: Implement
    #drawPoints(track, y) {
        const pointDefaults = {
            pointType: "circle",  // One of: circle, square, star, flower, rose
            pointHeight: 0,       // One of: number between -1 and 1, "dodge", "random"
            stem: "line",         // One of: line, curve, randomCurve
        }
        // Set point config as defaults overriden with any values optionally passed through via the addTrack function
        const pointConfig = {...pointDefaults, ...track};
    }

    // Draw track information as spanning rectangles track container, return reference to selection of elements
    // TODO: Optionally add transition animation
    #drawSpans(track, y, xScale) {
        const height = 0.5;
        const recHeight = Math.abs(y(-height) - y(height));
        const tracks = track.trackContainer.selectAll("rect")
            .data(track.intervals, d => d.start)
            .join("rect")
            // .transition().duration(600)
              .attr("y", y(height))
              .attr("x", d => xScale(this.gCoords[d.start]))
              .attr("fill", track.colour)
              .attr("height", recHeight)
              .attr("width", d => {
                // console.log((this.gCoords[d.stop]) - xScale(this.gCoords[d.start]));
                // Interval coordinates 0-based, half open. Subtract 1 from stop when calculating width
                return xScale(this.gCoords[d.stop - 1]) - xScale(this.gCoords[d.start]);
              })
        this.config.addIntervalLabels && track.trackContainer
            .selectAll("text")
            .data(track.intervals, d => [d.featureName, d.start])
            .join("text")
              .attr("font-size", 12)
              .attr("transform", d => `translate(${xScale(this.gCoords[d.start])}, ${y(0)}) rotate(0)`)
            //   .text("transform", d => `translate(400, 400)`)
              .text(d => d.featureName)

        return tracks;
    }

    // Recalculate/update yscales from track yProportions
    // Called on addition or vertical resizing of track
    updateYs(drawYs=false) {
        // Loop through this.tracks
        // Sum yFraction values and calculate proportions as trackFraction / totalFractions
        // Rescale and transform y axes to new heights and positions
        const fractionTotal = d3.sum(this.tracks, d => d.yFraction);
        const yProportions = this.tracks.map(d => d.yFraction / fractionTotal);
        const yHeights = yProportions.map(d => d * (this.height - this.config.marginTop - this.config.marginBottom));
        const yCoords = d3.pairs(d3.cumsum([this.config.marginTop].concat(yHeights)));
        this.yScales = yCoords.map(d => 
            d3.scaleLinear()
                .domain([-1, 1])
                .range([d[1], d[0]])
        );
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
        let lastHighestStop = allIntervals[0].stop;
        let pocketStart = allIntervals[0].start;
        let newPockets = [];
        for (const it of allIntervals.slice(1)) {
            if (it.start > (lastHighestStop + this.config.maxPocketGap)) {
                newPockets.push([pocketStart, lastHighestStop]);
                pocketStart = it.start;
            }
            lastHighestStop = it.stop > lastHighestStop ? it.stop : lastHighestStop;
        }
        // Push final trailing pocket
        newPockets.push([pocketStart, lastHighestStop]);
        this.pockets = newPockets;
        // xCoords is an array equal to plot length containing corresponding genomic coordinates at each position
        this.xCoords = this.pockets.map(d => d3.range(d[0] - this.config.gapPadding, d[1] + this.config.gapPadding)).flat();
        // Sparse array mapping gCoords to xCoords
        this.gCoords = new Array();  // Genomic/contig coordinate map
        this.xCoords.forEach((e, i) => this.gCoords[e] = i);
        // TODO: Add coordinate map for feature-relative tick function and data mapping
        // TODO: Also probably put coordinate maps in an object like the tick functions
        // Feature coordinate map relative to top track intervals
        const fCoords = new Map();
        let count = 0;
        this.tracks[0].intervals.forEach(d => {
            this.gCoords.slice(d.start, d.stop).forEach(e => {
                fCoords.set(e, count);
                count += 1;
            });
        });
        this.fCoords = fCoords;
    }

    updateX(drawX=false) {
        // xScale is just a map, doesn't hold any references to anything so can replace it
        this.xScale = d3.scaleLinear()
            .domain([0, this.xCoords.length])
            .range([this.config.marginLeft, this.width - this.config.marginRight]);
        this.updateXmarks(this.xScale);
    }

    updateXmarks(xs) {
        // Function to update x axis marks based on passed x scale
        // Used for both initial draw and zoom updates
        // Top axis marks are relative to top track intervals
        this.xTop
            .attr("transform", `translate(0, ${this.height - this.config.marginBottom - 0})`)
            .call(d3.axisTop(xs).ticks(20).tickFormat(this.tickFunctions.track));
        // Bottom axis marks are relative to start/stop coordinates of pockets (genomic/contig-relative)
        this.xBottom
            .attr("transform", `translate(0, ${this.height - this.config.marginBottom - 0})`)
            .call(d3.axisBottom(xs).ticks().tickFormat(this.tickFunctions.contig));
    }

    removeTrack(trackName) {
    }

    #zoomed(event) {
        const xz = event.transform.rescaleX(this.xScale);
        // Calculate rescaled scale (k), x and y values (from default scale of 1)
        const rs = event.transform.scale(1);
        for (const [track, y] of d3.zip(this.tracks, this.yScales)) {
            if (track.type == "span") {
                this.#drawSpans(track, y, xz);

            } else if (track.type == "point") {
                // console.log("Zooming for point tracks not yet implemented.")
            }
        }
        this.pocketMarks
            .attr("x1", d => xz(d[1]))
            .attr("x2", d => xz(d[1]));
        this.updateXmarks(xz);
    }

    initializeZoom() {
        // -------- Plot Zoom Handling --------
        // Track zoom handling function
        const minScale = 1;
        const maxScale = 1000;

        // Setting up zoom handling using zoom handling function
        const zoom = d3.zoom()
            .scaleExtent([minScale, maxScale])
            .extent([[this.config.marginLeft, 0], [this.width - this.config.marginLeft, this.height]])
            .translateExtent([[this.config.marginLeft, -Infinity], [this.width - this.config.marginRight, Infinity]])
            .on("zoom", event => this.#zoomed(event));

        // Register zoom handling function
        this.svg.call(zoom)
            // Optional: Set initial zoom with a transition
            // .transition().duration(2000)
            .call(zoom.scaleTo, 1);
    }
}
