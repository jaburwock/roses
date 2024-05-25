import * as d3 from "d3"
import { getShapeDef } from '/src/shapes.js';


export function randomRectangleTrack(svg, xs, x, y, colour="steelblue", nRecs=3, recHeight=0.5, centerRec=true) {
  const xStart = x( xs[0] );
  const xEnd   = x( xs[xs.length - 1] );
  const xr = xEnd - xStart;
  const recAxisHeight = y(-recHeight) - y(recHeight)
  const recWidths = d3.range(nRecs).map(() => (xr / nRecs) * Math.max(Math.random(), 0.1));
  const recStarts = recWidths.map((d, i) => x(xs[0]) + xr / nRecs * i + (xr / nRecs - d) * Math.random());
  const trackContainer = svg.append("g");
  // Grab empty rectangle selection before adding centerline to later draw feature rectangles
  const features = trackContainer.selectAll("rect");
  // Optional centerline rect marker
  centerRec && trackContainer.append("rect")
    .attr("fill", "grey")
    .attr("opacity", 0.8)
    .attr("width", xr)
    .attr("height", recAxisHeight / 4)
    .attr("x", x(xs[0]))
    .attr("y", y(recHeight / 4));
  // Append rectangles and return selection
  features.data(d3.zip(recStarts, recWidths))
    .join("rect")
      .attr("fill", colour)
      .attr("width", d => d[1])
      .attr("height", recAxisHeight)
      .attr("x", d => d[0])
      .attr("y", y(recHeight));
  return trackContainer;
}


export function helixTrack(svg, xs, x, y) {
  // Shared y offset
  const yOff = 0.0;
  // Primary double helix values
  // let [hOff, hFreq, hAmp]    = [Math.PI * 3.5, 0.3, 0.5];
  let [hOff, hFreq, hAmp]    = [-Math.PI / 2, 0.3, 0.5];
  let [zhOff, zhFreq, zhAmp] = [Math.PI / 2, 0.0, 0.35];  // Unwound/dormant state
  // Values for secondary helix
  let [hOff2, hFreq2, hAmp2]    = [0, 0.0, 0.05];
  let [zhOff2, zhFreq2, zhAmp2] = [0, 0.0, 0.05];  // Unwound/dormant state

  let windState = "unwound";
  const windSteps = 5;  // This has to be a mininum of two for some reason, TODO: fix maybe
  // Precalculate helix area for interpolated wind stages / sin frequencies
  const lineAreas = d3.range(windSteps).map(i => {
    const whFreq = zhFreq + i * ((hFreq - zhFreq) / (windSteps - 1))
    const whFreq2 = zhFreq2 + i * ((hFreq2 - zhFreq2) / (windSteps - 1))
    const whOff = zhOff + i * ((hOff - zhOff) / (windSteps - 1))
    const whOff2 = zhOff2 + i * ((hOff2 - zhOff2) / (windSteps - 1))
    return d3.area()
        .x(d => x(d))
        .y0(d => y(Math.sin(whFreq * d + whOff) * hAmp + (Math.sin(whFreq2 * d + whOff2) * hAmp2) + yOff))
        .y1(d => y(Math.sin(Math.PI + whFreq * d + whOff) * hAmp + (Math.sin(whFreq2 * d + whOff2) * hAmp2) + yOff))(xs)
  });

  // Setting up a clip path to mask the edges of the helix if desired
  const clipMargin = 3;
  const xWidth = x(x.domain()[1] - clipMargin) - x(clipMargin);
  const yHeight = y.range()[0] - y.range()[1];
  const helClip = svg.append("clipPath")
      .attr("id", "helClip00")
    .append("rect")
      .attr("x", x(clipMargin))
      .attr("y", y.range()[1])
      .attr("width", xWidth)
      .attr("height", yHeight);

  const areaHelix = svg.append("path")
    .attr("fill", "indigo")
    .attr("opacity", 1.0)
    .attr("stroke-width", 2)
    .attr("d", windState == "wound" ? lineAreas[lineAreas.length - 1] : lineAreas[0]);

  const loopInterval = 250;
  // const easeFunc = d3.easeCubicInOut;
  const easeFunc = d3.easeLinear;
  function unwind() {
    if (windState != "unwound") {
      let windStateN = windSteps - 1;
      areaHelix.transition().duration(loopInterval).ease(easeFunc).attr("d", lineAreas[windStateN])
      windStateN = Math.max(windStateN - 1, 0);
      let windRepeater = d3.interval(e => {
        e > (windSteps * loopInterval) && windRepeater.stop();
        areaHelix.transition().duration(loopInterval).ease(easeFunc).attr("d", lineAreas[windStateN])
        windStateN = Math.max(windStateN - 1, 0);
      }, loopInterval)
      windState = "unwound";
    }
  }
  function wind() {
    if (windState != "wound") {
      let windStateN = 1;
      areaHelix.transition().duration(loopInterval).ease(easeFunc).attr("d", lineAreas[windStateN])
      windStateN = Math.min(windStateN + 1, windSteps - 1);
      let windRepeater = d3.interval(e => {
        e > (windSteps * loopInterval) && windRepeater.stop();
        areaHelix.transition().duration(loopInterval).ease(easeFunc).attr("d", lineAreas[windStateN])
        windStateN = Math.min(windStateN + 1, windSteps - 1);
      }, loopInterval);
      windState = "wound";
    }
  }

  // return areaHelix;
  return Object.assign(areaHelix, {wind, unwind});
}


// Generate a given number of variant records randomly distributed between a position range
function generateVariants(nVars, pRange, palName="blue", nPetals=5, heightOffset=0, shape="flower00") {
  // Named predefined palettes
  // Defined to be indexed with Math.random() to give a relatively even spread between 0-1
  const colScales = {
    purple: d3.scaleSequential([3,  0], d3.interpolatePurples),
    viridis: d3.scaleSequential([0,  3], d3.interpolateViridis),
    blue: d3.scaleSequential([2,  0], d3.interpolateBlues),
    green: d3.scaleSequential([2,  0], d3.interpolateGreens),
    red: d3.scaleSequential([8, -1], d3.interpolateReds),
    roseblue: d3.scaleSequential([-6,  2], d3.interpolateBlues),
    rosegreen: d3.scaleSequential([-6,  3], d3.interpolateGreens),
  };
  const palScale = colScales[palName];
  const randomPosition = () => pRange[0] + Math.floor((pRange[1] - pRange[0]) * Math.random());
  return d3.range(nVars).map(d => {
    return {
      position: randomPosition(),
      size: 0.6 + Math.random() * 0.4,
      height: heightOffset + Math.random() * 0.3,
      petals: nPetals,
      palette: palScale,
      shape: shape,
    }
  })
}


export function lollipopTrack(svg, xs, x, y, lowerY) {
  // Generating some random variants
  let variants =                 generateVariants(8,  [1, 90],  "red",      getShapeDef("rose").shapePaths.length, -0.3, "rose");
  variants     = variants.concat(generateVariants(12, [2, 100], "roseblue", getShapeDef("rose").shapePaths.length, 0, "rose"));
  variants     = variants.concat(generateVariants(3,  [22, 50], "rosegreen", getShapeDef("rose").shapePaths.length, 0.3, "rose"));
  // variants     = variants.concat(generateVariants(3,  [22, 50], "green", 8,  0,   "flower00"))
  // variants     = variants.concat(generateVariants(12, [2, 100], "blue",  9,  0.2, "flower00"))
  // Add unique ids to variants to handle updates
  variants = variants.map((d, i) => ({id: i, ...d}))

  // Drawing curby stems?
  const flowerstems = svg.append("g")
    .selectAll("path")
    .data(variants, d => d.id)
    .join("path")
      .attr("fill", "none")
      .attr("stroke-width", 2)
      .attr("stroke", "grey")
      .attr("opacity", 0.0)
      .attr("d", d => {
        // Dynamically calculate stem paths as a single curve from base to top with fixed control point offsets
        const xc = 0;
        const yc1 = y(d.height);
        const yc2 = lowerY(0);
        const xd = 10;
        const yd = 80;
        return `M ${xc} ${yc1} C ${xc - xd} ${yc1 + yd} ${xc + xd} ${yc2 - yd} ${xc} ${yc2}`
      })
      // Handle x positioning with a transform as path x is zeroed
      .attr("transform", d => `translate(${x(d.position)})`);

  const boxcontainer = svg.append("g").attr("id", "boxcontainer");
  const flowerboxes = boxcontainer
    .selectAll("g")
    .data(variants, d => d.id)
    .join("g")
      .attr("opacity", 0)
      .attr("transform", d => `translate(${x(d.position)}, ${lowerY(0)}) scale(${d.size})`)

  const petals = flowerboxes.selectAll("path")
    // Generate data to draw petals/shape from variant objects
    .data(d => d3.range(d.petals).map(i => {
      const shapeInfo = getShapeDef(d.shape);
      // Generate petal info objects
      return {
        rotation: shapeInfo.rotationFunc(i, d.petals),
        colour:   shapeInfo.paletteFunc(i, d.palette),
        path:     shapeInfo.shapePaths[i % shapeInfo.shapePaths.length],
        opacity:  shapeInfo.opacity,
        stroke:   d.shape == "rose" ? "mistyrose" : "none",
      }
    }))
    .join("path")
      .attr("stroke", d => d.stroke)
      .attr("fill-opacity", d => d.opacity)
      // .attr("fill", d => d.colour)
      .attr("fill", "grey")
      .attr("d", d => d.path)
      .attr("transform", (d, i) => `rotate(0) scale(0.05)`)  // Grow from small

  // Transition everything in smoothly
  const sequenceDelay = 60;
  const transitionDuration = 1200;
  flowerstems.transition().duration(transitionDuration + 400)
    .delay((_, i) => i * sequenceDelay)
    .attr("opacity", 0.8);

  flowerboxes.transition()
      // Flowerbox transitions
      .duration(transitionDuration)
      .delay((_, i) => i * sequenceDelay)
        .attr("opacity", 1)
        .attr("transform", d => `translate(${x(d.position)}, ${y(d.height)}) scale(${d.size})`)
      // Chained petal transitions
      .selectAll("path")
        .duration(_ => 2000 + Math.random() * 150)
        .attr("fill", d => d.colour)
        .attr("transform", d => `rotate(${d.rotation}) scale(0.4)`);
  
  return [flowerboxes, flowerstems];
}