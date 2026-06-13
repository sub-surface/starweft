/* STARWEFT starcat.js — the real local bubble.
   ~55 actual nearby stars: J2000 RA/Dec (approx), distance (ly), spectral class,
   companions, and known-exoplanet counts where famous. Converted to galactic
   XYZ at load (+x coreward, +z galactic north, Sol at origin). DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.starcat = (function () {
  // [name, RA(h), Dec(deg), dist(ly), spectral, companions, knownPlanets, note]
  // NB: Alpha Centauri (4.37 ly) and Proxima Centauri (4.24 ly) are a real
  // gravitationally-bound system ~0.2 ly apart — the two near-touching stars you
  // see hugging each other just off Sol on the map are ASTRONOMICALLY CORRECT,
  // not a clumping bug. minSysDist only governs the procedural fill, never the
  // real catalogue. (The galaxy-wide distScale below spreads them on screen
  // while preserving their true separation.)
  const RAW = [
    ['Alpha Centauri', 14.66, -60.84, 4.37, 'G2V', ['K1V'], 0, 'Closest neighbor. A perfect twin of Sol, with a quieter friend.'],
    ['Proxima Centauri', 14.49, -62.68, 4.24, 'M5.5V', [], 2, 'A flare-prone ember with worlds of its own.'],
    ['Barnard\'s Star', 17.96, 4.69, 5.96, 'M4V', [], 1, 'Fastest proper motion in the sky. It is going somewhere.'],
    ['Wolf 359', 10.94, 7.01, 7.86, 'M6V', [], 0, 'Tiny, dim, furious flare star.'],
    ['Lalande 21185', 11.06, 35.97, 8.31, 'M2V', [], 2, 'Quiet red dwarf, old as the thin disk.'],
    ['Sirius', 6.75, -16.72, 8.60, 'A1V', ['DA2'], 0, 'The Dog Star, dragging a white dwarf corpse in orbit.'],
    ['Luyten 726-8', 1.65, -17.95, 8.73, 'M5.5V', ['M6V'], 0, 'UV Ceti: the prototype flare star. Twins that spit fire.'],
    ['Ross 154', 18.83, -23.84, 9.70, 'M3.5V', [], 0, ''],
    ['Ross 248', 23.70, 44.18, 10.30, 'M5.5V', [], 0, 'Voyager 2 is headed here. It will take 40,000 years.'],
    ['Epsilon Eridani', 3.55, -9.46, 10.45, 'K2V', [], 1, 'Young, spotted sun with a dusty debris ring.'],
    ['Lacaille 9352', 23.10, -35.85, 10.74, 'M0.5V', [], 2, ''],
    ['Ross 128', 11.79, 0.80, 11.01, 'M4V', [], 1, 'A gentle red dwarf with a temperate world.'],
    ['EZ Aquarii', 22.64, -15.30, 11.27, 'M5V', ['M5.5V', 'M6.5V'], 0, 'Three embers in a knot.'],
    ['Procyon', 7.65, 5.22, 11.46, 'F5IV', ['DQZ'], 0, 'A subgiant swelling toward its fate, white dwarf in tow.'],
    ['61 Cygni', 21.12, 38.75, 11.40, 'K5V', ['K7V'], 0, 'First star ever to have its distance measured.'],
    ['Struve 2398', 18.71, 59.63, 11.49, 'M3V', ['M3.5V'], 2, ''],
    ['Groombridge 34', 0.31, 44.02, 11.62, 'M1.5V', ['M3.5V'], 2, ''],
    ['Epsilon Indi', 22.06, -56.78, 11.87, 'K5V', [], 1, 'Carries a pair of brown dwarfs like lanterns.'],
    ['DX Cancri', 8.50, 26.78, 11.83, 'M6.5V', [], 0, ''],
    ['Tau Ceti', 1.73, -15.94, 11.91, 'G8.5V', [], 4, 'The classic "second Earth" candidate, crowded with worlds.'],
    ['GJ 1061', 3.60, -44.51, 11.98, 'M5.5V', [], 3, ''],
    ['YZ Ceti', 1.20, -16.99, 12.11, 'M4.5V', [], 3, ''],
    ['Luyten\'s Star', 7.46, 5.23, 12.36, 'M3.5V', [], 2, 'Has a temperate super-Earth, GJ 273b.'],
    ['Teegarden\'s Star', 2.88, 16.88, 12.50, 'M7V', [], 3, 'So dim it hid until 2003.'],
    ['Kapteyn\'s Star', 5.20, -45.02, 12.76, 'sdM1', [], 1, 'A halo star passing through — born before the disk.'],
    ['Lacaille 8760', 21.28, -38.87, 12.95, 'M0V', [], 0, ''],
    ['Kruger 60', 22.47, 57.75, 13.07, 'M3V', ['M4V'], 0, ''],
    ['Ross 614', 6.49, -2.81, 13.35, 'M4.5V', ['M5.5V'], 0, ''],
    ['Wolf 1061', 16.50, -12.66, 14.05, 'M3.5V', [], 3, ''],
    ['Van Maanen\'s Star', 0.82, 5.39, 14.07, 'DZ8', [], 0, 'A naked white dwarf: a dead sun\'s crystallizing heart.'],
    ['Gliese 1', 0.09, -37.36, 14.17, 'M1.5V', [], 0, ''],
    ['Wolf 424', 12.56, 9.02, 14.31, 'M5.5V', ['M7V'], 0, ''],
    ['TZ Arietis', 2.00, 13.05, 14.60, 'M4.5V', [], 1, ''],
    ['Gliese 687', 17.60, 68.34, 14.84, 'M3V', [], 1, ''],
    ['Gliese 674', 17.48, -46.90, 14.85, 'M3V', [], 1, ''],
    ['GJ 1245', 19.90, 44.40, 14.80, 'M5.5V', ['M6V'], 0, ''],
    ['Gliese 440', 11.76, -64.84, 15.10, 'DQ6', [], 0, 'Another white dwarf — the bubble keeps its dead close.'],
    ['Gliese 876', 22.88, -14.26, 15.25, 'M4V', [], 4, 'Four worlds locked in resonant orbits, ticking like a clock.'],
    ['Gliese 1002', 0.11, -7.54, 15.80, 'M5.5V', [], 2, ''],
    ['Groombridge 1618', 10.18, 49.45, 15.88, 'K7.5V', [], 0, ''],
    ['Gliese 412', 11.09, 43.53, 15.83, 'M1V', ['M5.5V'], 0, ''],
    ['AD Leonis', 10.32, 19.87, 16.20, 'M3.5V', [], 0, 'Flares hard enough to double in brightness.'],
    ['40 Eridani', 4.25, -7.65, 16.34, 'K0.5V', ['DA4', 'M4.5V'], 1, 'A calm orange sun with two stellar remnants for company.'],
    ['70 Ophiuchi', 18.09, 2.50, 16.59, 'K0V', ['K4V'], 0, ''],
    ['Altair', 19.85, 8.87, 16.73, 'A7V', [], 0, 'Spins so fast it is visibly flattened.'],
    ['Sigma Draconis', 19.54, 69.66, 18.77, 'G9V', [], 1, ''],
    ['36 Ophiuchi', 17.25, -26.60, 19.50, 'K2V', ['K1V', 'K5V'], 0, 'A triple of orange suns.'],
    ['Eta Cassiopeiae', 0.82, 57.82, 19.42, 'G0V', ['K7V'], 0, 'A Sol-like primary; settlers\' favorite.'],
    ['82 Eridani', 3.32, -43.07, 19.71, 'G8V', [], 3, 'Metal-poor, ancient, steady.'],
    ['Delta Pavonis', 20.15, -66.18, 19.89, 'G8IV', [], 0, 'A subgiant: a preview of Sol\'s retirement.'],
    ['Gliese 581', 15.32, -7.72, 20.55, 'M3V', [], 3, 'The system that taught Earth to argue about habitability.'],
    ['HD 219134', 23.22, 57.17, 21.34, 'K3V', [], 5, 'A K dwarf wreathed in super-Earths.'],
    ['Gliese 667', 17.32, -34.99, 23.62, 'K3V', ['K5V', 'M1.5V'], 2, ''],
    ['Vega', 18.62, 38.78, 25.04, 'A0V', [], 0, 'The northern beacon. Contact was never filmed here.'],
    ['Fomalhaut', 22.96, -29.62, 25.13, 'A4V', [], 0, 'A lonely white eye ringed by dust.'],
    ['Mu Cassiopeiae', 1.14, 54.92, 25.20, 'G5Vb', ['M5V'], 0, ''],
    ['Pi-3 Orionis', 4.83, 6.96, 26.32, 'F6V', [], 0, ''],
    ['Chi-1 Orionis', 5.91, 20.28, 28.26, 'G0V', ['M3V'], 0, ''],
    ['Beta Hydri', 0.43, -77.25, 24.33, 'G2IV', [], 0, 'The oldest Sol-like star nearby; a glimpse of deep time.'],
    ['TRAPPIST-1', 23.11, -5.04, 40.66, 'M8V', [], 7, 'Seven rocky worlds packed tighter than Mercury\'s orbit.'],
    ['Arcturus', 14.26, 19.18, 36.71, 'K1.5III', [], 0, 'A red giant passing through the disk at speed. A visitor.'],
    ['Pollux', 7.76, 28.03, 33.79, 'K0III', [], 1, 'A giant with a planet that survived its sun\'s swelling.'],
    ['Denebola', 11.82, 14.57, 35.88, 'A3V', [], 0, ''],
    ['Capella', 5.28, 46.00, 42.92, 'G8III', ['G0III'], 0, 'Two giants waltzing where four suns once burned bright.'],
    ['Gliese 86', 2.17, -50.82, 35.20, 'K1V', ['DQ6'], 1, 'A planet that orbits between a sun and a corpse.'],
  ];

  function build() {
    const U = SW.util;
    // Galaxy-wide distance scale: stretches the WHOLE map (real catalogue +
    // procedural fill) uniformly, so the bubble feels vast while every real
    // star keeps its true relative position. Procedural gen reads the same
    // factor; see D.TUNE.distScale. Falls back to 1 if data isn't loaded.
    const k = (SW.data && SW.data.TUNE && SW.data.TUNE.distScale) || 1;
    return RAW.map(function (r) {
      const p = U.eqToGal(r[1], r[2], r[3]);
      return {
        name: r[0], x: p.x * k, y: p.y * k, z: p.z * k, dist: r[3] * k,
        spec: r[4], companions: r[5], knownPlanets: r[6], note: r[7] || '',
        real: true,
      };
    });
  }

  return { RAW: RAW, build: build };
})();
