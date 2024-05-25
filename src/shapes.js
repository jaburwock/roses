

export function getShapeDef(shapeName) {
  // Each shape has a rotation function to calculate rotation of consecutive
  // shapes given an index (i) and the total number of shapes being drawn (n)
  const flowerDefs = {
    flower00: {
      shapePaths: ["M0 0C-20-18-6-16 0-61 11-38 23-19 0 0"],
      opacity: 0.8,
      rotationFunc: (i, n) => 360 / n * i,
      paletteFunc: (_, pal) => pal(Math.random())
    },

    flower01: {
      shapePaths: ["M0 0C-20-18-6-57 0-61 12-34 23-19 0 0"],
      opacity: 0.8,
      rotationFunc: (i, n) => 360 / n * i,
      paletteFunc: (_, pal) => pal(Math.random())
    },

    flower02: {
      shapePaths: ["M0 0C-20-18-6-57 0-61 12-34 23-19 0 0", "M0 0C-20-18-6-16 0-61 11-38 23-19 0 0"],
      opacity: 0.8,
      rotationFunc: (i, n) => 360 / n * i,
      paletteFunc: (_, pal) => pal(Math.random())
    },

    rose: {
      shapePaths: [
        "M5 0A1 1 0 00-6 0 1 1 0 005 0",
        "M-10 0C-16-7-11-19 0-19S19-6 19 0 8 18 0 18-13 12-13 7-11 3-10 0",
        "M4 3C-10 10-21 8-26 0S-19-29-4-29 15-17 15-7C13-4 10 0 4 3",
        "M-7-8C-32 10-14 32 0 32S32 20 32 2 16-39-7-8",
        "M-10-13C-33 13-6 42 8 43 17 44 23 34 38 28 51 21 49 11 44 0 41-20 37-26 3-20-6-18-6-17-10-13",
        "M18-20C-9-44-37-16-41-8-47 7-31 16-24 32-16 41-7 45 5 34 12 28 31 27 25-7 23-16 22-16 18-20",
        "M-6 13C-34 8-36-18-27-35-21-46-8-50 1-42 7-37 21-39 26-31 31-21 15-17 11-9 5 0 5 15-6 13",
        "M8 58C-1 58-15 45-24 44-35 43-29-20-2-31 34-43 38 12 36 32 36 45 29 46 25 49 20 52 17 58 8 58",
        "M-48 27C-47 16-51 16-48 7-39-16-22-33 25-24 59-17 19 16 0 25-19 34-28 41-48 27",
        "M-49-24C-54 0-48 9-40 13S17 28 29 8-3-68-49-24",
        "M-23-55C-9-55-6-52 1-44 9-36 26 6 10 18-6 28-34-3-31-36-29-47-26-48-23-55",
        "M17-57C24-45 34-42 39-33 50-10 11 24-1 21S-16-11-11-36C-10-42-6-60 17-57",
        "M58-14C47 9 50 4 43 27S-30 17-25 3-6-31 24-30 50-23 58-14",
        "M45-45C33-47 24-45-7-27S-45 22-44 41C-36 40-31 42-20 36 11 19 60-22 45-45",
      ].reverse(),
      opacity: 1.0,
      // Some slight random variance in rotation but petals paths are explicity
      rotationFunc: () => 15 + Math.random() * 10,
      paletteFunc: (i, pal) => pal(Math.random() / 6 * i)
    },

    tulip: {

    },

    iris: {

    },

  }
  return flowerDefs[shapeName];
}

