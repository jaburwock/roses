import * as d3 from 'd3';


const ROSE_PATHS = [
  "M45-45C33-47 24-45-7-27S-45 22-44 41C-36 40-31 42-20 36 11 19 60-22 45-45",
  "M58-14C47 9 50 4 43 27S-30 17-25 3-6-31 24-30 50-23 58-14",
  "M17-57C24-45 34-42 39-33 50-10 11 24-1 21S-16-11-11-36C-10-42-6-60 17-57",
  "M-23-55C-9-55-6-52 1-44 9-36 26 6 10 18-6 28-34-3-31-36-29-47-26-48-23-55",
  "M-49-24C-54 0-48 9-40 13S17 28 29 8-3-68-49-24",
  "M-48 27C-47 16-51 16-48 7-39-16-22-33 25-24 59-17 19 16 0 25-19 34-28 41-48 27",
  "M8 58C-1 58-15 45-24 44-35 43-29-20-2-31 34-43 38 12 36 32 36 45 29 46 25 49 20 52 17 58 8 58",
  "M-6 13C-34 8-36-18-27-35-21-46-8-50 1-42 7-37 21-39 26-31 31-21 15-17 11-9 5 0 5 15-6 13",
  "M18-20C-9-44-37-16-41-8-47 7-31 16-24 32-16 41-7 45 5 34 12 28 31 27 25-7 23-16 22-16 18-20",
  "M-10-13C-33 13-6 42 8 43 17 44 23 34 38 28 51 21 49 11 44 0 41-20 37-26 3-20-6-18-6-17-10-13",
  "M-7-8C-32 10-14 32 0 32S32 20 32 2 16-39-7-8",
  "M4 3C-10 10-21 8-26 0S-19-29-4-29 15-17 15-7C13-4 10 0 4 3",
  "M-10 0C-16-7-11-19 0-19S19-6 19 0 8 18 0 18-13 12-13 7-11 3-10 0",
  "M5 0A1 1 0 00-6 0 1 1 0 005 0",
];


class Track {
  // Track config defaults
  config = {
    type: "span",  // "point"
    colour: "steelblue",
    yFraction: 1,
    yOrder: 1,
  }

  constructor(container, name, intervals, config) {
    this.config = {...this.config, ...config};
  }
}


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
    coordinateTrack: 1,
  }

  constructor(targetDiv, config={}) {
    // Replace config defaults with any user defined config values
    // TODO: Link to interface elements
    this.config = {...this.config, ...config};
    // List of tracks and point tracks
    this.tracks = [];
    this.pointTracks = [];
    this.pockets = [];
    this.container = d3.select(targetDiv);
    this.container.size() == 1 || console.error("TrackPlot constructor error, target div selector non-unique.");
    this.width  = undefined;
    this.height = undefined;

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
      track:  d => this.fCoords.has(d) ? 'c.' + (1 * this.fCoords.get(d) + 0) : '',  // 0-based top track-relative coords
    };
    this.yScales = [];

    // Adding all plot element group elements here to set overall draw order
    this.svg = this.container.append("svg");
    // TODO: Shift all below selections into a "containers" object
    this.trackContainerGroup = this.svg.append("g");
    this.pocketContainer = this.svg.append("g");
    this.pocketMarks = undefined;
    this.labelContainer = this.svg.append("g");
    this.xTop    = this.svg.append("g");
    this.xBottom = this.svg.append("g");
  }

  addTrack(trackName, intervals, trackConfig={}) {
    // TODO: Refactor track-related code into Track class exposing a general update method regardless of track type
    //       So TrackPlot just holds an array of Track objects.
    // const newTrack = new Track(this.trackContainerGroup, trackName, intervals, trackConfig);
    const trackDefaults = {
      type: "span",  // "point"
      colour: "steelblue",
      yFraction: 1,
      yOrder: 1,
    }
    // TODO: Store point tracks in a separate array? So they can be coalesced into a single upper track
    const trackData = {
      ...trackDefaults,
      ...trackConfig,
      name: trackName,
      intervals: intervals,
      yContainer: this.svg.append("g"),
      trackContainer: this.trackContainerGroup.append("g"),
    };
    this.tracks.push(trackData);
    this.tracks.sort((a, b) => a.yOrder - b.yOrder);
    this.recalculatePockets();
    // TODO: Maybe make draw optional so can add a number of tracks then draw all at once
    this.draw();
  }

  // Master function to draw/update plot details (also for window resize)
  draw() {
    this.#resizeFitSVG();
    this.#updateYs();
    this.updateX();
    this.#drawPockets();
    this.config.addTrackLabels && this.#drawLabels();
    // Loop through tracks and yScales drawing/updating track content
    for (const [track, y] of d3.zip(this.tracks, this.yScales)) {
      if (track.type == "span") {
        this.#drawSpans(track, this.xScale, y);
      } else if (track.type == "point") {
        this.#drawPoints(track, this.xScale, y);
      }
    }
  }

  #drawLabels(transitionDuration=400) {
    // Draw background rect in left margin of plot matching style background colour
    this.labelContainer
      .selectAll("rect")
      // This feels like a hack to draw a single background rectangle without appending every time
      // But it does work, so.
      .data([0], d => d)
      .join("rect")
        .attr("width", this.config.marginLeft - 8)
        .attr("height", this.height)
        .attr("fill", "var(--pico-background-color)")
    // Draw text labels over the background rectangle
    this.labelContainer
      .selectAll("text")
      .data(d3.zip(this.tracks, this.yScales), d => d[0].name)
      .join("text").transition().duration(transitionDuration)
        .attr("font-size", 12)
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${this.xScale(0) - 32}, ${d[1](0)}) rotate(-75)`)
        .text(d => d[0].name)
  }

  // Draw and update lines to indicate x-coordinate breaks of pockets
  // TODO: Draw as rectangles instead that can optionally shade the areas of the gaps
  // TODO: Maybe #drawGaps() is a more descriptive name
  #drawPockets(type="line", transitionDuration=400) {
    const top = this.yScales[0](1);
    const bottom = this.yScales[this.yScales.length - 1](-1);
    // Create array with start of each pocket as an identifer and it's end position mapped to the x coordinate space
    const markCoords = this.pockets.map(p => {
      return [p[0], this.gCoords[p[1] - 1] + this.config.gapPadding];
    });
    this.pocketMarks = this.pocketContainer
      .selectAll("line")
      .data(markCoords, d => d[0])
      .join("line");
    this.pocketMarks
        .attr("stroke", "var(--pico-color)")
        .attr("stroke-width", 1)
        .attr("opacity", 0.8)
        .attr("x1", d => this.xScale(d[1]))
        .attr("x2", d => this.xScale(d[1]))
      .transition().duration(transitionDuration)
        .attr("y1", top)
        .attr("y2", bottom)
  }

  // TODO: Implement
  #drawPoints(track, x, y, transitionDuration=400) {
    // TODO: Shift into trackDefaults object in this.addTrack() to centralise all track config.
    // Having defaults here is useful for dev though
    const pointDefaults = {
      pointType: "circle",  // One of: circle, square, star, flower, rose, sakura?
      pointHeight: 0,       // One of: number between -1 and 1, "dodge", "random"
      stem: "line",         // One of: line, curve, randomCurve
    }
    // Set point config as defaults overriden with any values optionally passed through via the addTrack function
    const pointConfig = {...pointDefaults, ...track};

    const pointStems = track.trackContainer
      .selectAll("path")
      .data(track.intervals, (_, i) => i)
      .join("path")
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .attr("stroke", "grey")
        .attr("opacity", 1.0)
        .attr("d", (_, i) => {
          // Dynamically calculate stem paths as a single curve from base to top with fixed offset control points
          const xc = 0;
          const yc1 = y(0.2 + Math.sin(i * 1) * 0.20);  // Sin wave for some variance
          const yc2 = y(-1);
          const xd = 10;
          const yd = 40;
          return `M ${xc} ${yc1} C ${xc - xd} ${yc1 + yd} ${xc + xd} ${yc2 - yd} ${xc} ${yc2}`
        })
        // Handle x positioning with a transform as path x is zeroed
        .attr("transform", d => `translate(${x(d.pStart)})`);

    // TODO: Ok, this works but sucks I think.
    // Actually the way I've done this generally kind of sucks. The draw functions are doing more work than
    // they need to on update. Which really comes back to a need to refactor out a Track class.
    // Actually fucking this is appending a new container every call?
    // Or add an updateOnly=true/false argument that skips unnecessary selectAll statements and attribute modifications
    const flowerboxes = track.trackContainer
      .selectAll("g")
      .data(track.intervals, (_, i) => i)
      .join("g")
        .attr("opacity", 1)
        .attr("transform", (d, i) => `translate(${x(d.pStart)}, ${y(0.2 + Math.sin(i * 1) * 0.20)}) scale(${0.3})`)

    const petals = flowerboxes.selectAll("path")
      // Generate data to draw petals/shape from variant objects
      .data(ROSE_PATHS, (_, i) => i)
      .join("path")
        .attr("stroke", "pink")
        .attr("fill-opacity", 0.6)
        // .attr("fill", d => d.colour)
        .attr("fill", "red")
        .attr("d", d => d)
        .attr("transform", `rotate(0) scale(1)`)  // Grow from small
  }

  // Draw track information as spanning rectangles inside the track container, return reference to selection of elements
  #drawSpans(track, x, y, transitionDuration=400, trackHeight=0.5, alignTrack="top") {
    // TODO: Shift into trackDefaults object in this.addTrack() to centralise all track config.
    // Having defaults here is useful for dev though
    const spanDefaults = {
      addIntervalLabels: true,
    }
    // Set point config as defaults overriden with any values optionally passed through via the addTrack function
    const spanConfig = {...spanDefaults, ...track};
    const trackY = alignTrack == "middle" ? trackHeight : alignTrack == "bottom" ? (-1 + trackHeight) : 1.0;
    const recHeight = Math.abs(y(-trackHeight) - y(trackHeight));
    const spans = track.trackContainer.selectAll("rect")
      .data(track.intervals, (_, i) => i)
      .join("rect")
        .attr("x", d => x(this.gCoords[d.start]))
        .attr("fill", track.colour)
        // Set width and handle 1-based inclusive feature coords avoiding width = 0
        .attr("width", d =>  d.start == d.stop ? x(d.pStop) - x(d.pStart - 2) : x(d.pStop) - x(d.pStart))
      .transition().duration(transitionDuration)
        .attr("y", y(trackY))
        .attr("height", recHeight)
    // TODO: Make interval label option track-specific instead of global
    spanConfig.addIntervalLabels && track.trackContainer
      .selectAll("text")
      .data(track.intervals, d => [d.featureName, d.start])
      .join("text")
        .attr("fill", "rgb(200, 200, 200)")
        .attr("font-size", 12)
        .attr("x", d => {
          // Sticky label behaviour
          const start = x(d.pStart);
          const stop = x(d.pStop);
          return start > x.range()[1] ? start : stop < x.range()[0] ? stop : Math.max(start, x.range()[0]);
        })
      .transition().duration(transitionDuration)
        .attr("y", y(trackY - trackHeight))
        // .attr("y", y(0))
        .text(d => d.featureName)
    return spans;
  }

  // Recalculate/update yscales from track yProportions
  // Called on addition or vertical resizing of track
  #updateYs(drawYs=false) {
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

  // Function to recalculate pockets from tracks and maxPocketGap (number of positions between 
  //     intervals/features to create a new pocket)
  // Also recalculates plotEnd, xScale and relative coordinate-spaces relative to the new pockets
  recalculatePockets() {
    // TODO: Collapse into consensus intervals/ranges and work from there

    // Aggregate intervals from tracks
    let allIntervals = [];
    for (const track of this.tracks) {
      allIntervals.push(...track.intervals);
    }
    // Sort all intervals by contig start position
    allIntervals.sort((a, b) => a.start - b.start);

    // Loop through interval positions
    // Keep track of the highest last seen end position
    // If a start position is greater than this.config.maxPocketGap away from the last highest seen end position...
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
    // TODO: Probably rename this.xCoords to this.gCoords cause like, it's an array of genomic coords
    this.xCoords = this.pockets.map(d => d3.range(d[0] - this.config.gapPadding, d[1] + this.config.gapPadding)).flat();
    // Sparse array mapping gCoords to xCoords
    this.gCoords = new Array();  // Genomic/contig coordinate map
    this.xCoords.forEach((e, i) => this.gCoords[e] = i);

    // TODO: Add coordinate map for feature-relative tick function and data mapping
    // TODO: Also probably put coordinate maps in an object like the tick functions
    // Feature coordinate map relative to top track intervals
    // TODO: Make feature coordinates optionally run from the start of the first interval to the end of the last interval
    // TODO: Also then have option to exclude tracks from the nucleotide/feature coordinates (so can include non-coding features in a plot)

    // Generate set of feature coordiantes relative to the index of the coordinate track
    const fCoords = new Map();
    let count = 0;
    this.tracks[Math.min(this.config.coordinateTrack, this.tracks.length - 1)].intervals.forEach(d => {
      this.gCoords.slice(d.start, d.stop).forEach(e => {
        fCoords.set(e, count);
        count += 1;
      });
    });
    this.fCoords = fCoords;

    // So like, for each track, for each interval in that track, add/update a pStart, pStop coordinate
    //   translated from their genomic coords. Saves doing these lookups in the draw functions (hotter paths)
    for (const track of this.tracks) {
      for (const it of track.intervals) {
        it["pStart"] = this.gCoords[it.start];
        it["pStop"] = this.gCoords[it.stop - 1];
      }
    }
  }

  updateX(drawX=false) {
    // xScale is just a map, doesn't hold any references to anything so can replace it
    this.xScale = d3.scaleLinear()
      .domain([0, this.xCoords.length])
      .range([this.config.marginLeft, this.width - this.config.marginRight]);
    this.#updateXmarks(this.xScale);
  }

  #updateXmarks(xs) {
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
        this.#drawSpans(track, xz, y);
      } else if (track.type == "point") {
        this.#drawPoints(track, xz, y);
        // console.log("Zooming for point tracks not yet implemented.")
      }
    }
    this.pocketMarks
      .attr("x1", d => xz(d[1]))
      .attr("x2", d => xz(d[1]));
    this.#updateXmarks(xz);
  }

  // Track zoom handling function
  initializeZoom() {
    const minScale = 1;
    // TODO: Set maxScale to be a function of plot domain (so max zoom always has roughly the same domain / N positions)
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

  // Function to check if SVG element needs resizing based on containing div properties
  #resizeFitSVG() {
    const divwidth = this.container.node().offsetWidth;
    const divheight = this.container.node().offsetHeight;
    if (this.width != divwidth || this.height != divheight) {
      this.width  = this.container.node().offsetWidth;
      this.height = this.container.node().offsetHeight;
      this.svg
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("viewbox", [0, 0, this.width, this.height]);
    }
  }
}
