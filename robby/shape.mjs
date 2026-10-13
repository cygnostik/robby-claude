// Robby's bodies as analytic profiles, in centimetres (1 world unit = 1 cm), heights from
// the top of the dais. Proportions follow a dimensioned CAD drawing of Robby (ArthMat, 2013,
// in inches; it totals about 84 in, the prop's 7 ft) cross-checked with MGM's construction
// sheet "Robby, the Robot" and photographs of full-size replicas.

export const HEIGHT = 214;

// A bulb whose radius is a superellipse in z: r = R · (1 − |t|^p)^(1/p),
// t = (z − c) / h, with a different h below and above the widest ring.
export function bulb({ R, c, below, above, p }) {
  const radius = (z) => {
    const h = z < c ? below : above;
    const t = Math.min(0.999999, Math.abs(z - c) / h);
    return R * Math.pow(1 - Math.pow(t, p), 1 / p);
  };
  const slope = (z) => {
    const h = z < c ? below : above;
    const t = Math.min(0.999999, Math.abs(z - c) / h);
    if (t < 1e-9) return 0;
    const sign = z < c ? -1 : 1;
    return (-R * Math.pow(1 - Math.pow(t, p), 1 / p - 1) * Math.pow(t, p - 1) * sign) / h;
  };
  return { radius, slope };
}

// The h that makes a superellipse of radius R fall to rEnd at distance d from its widest ring.
export const reach = (R, rEnd, p, d) => d / Math.pow(1 - Math.pow(rEnd / R, p), 1 / p);

// A barrel: straight between z0 and z1, rounded by superellipse quarters below and above.
export function barrel({ R, z0, z1, below, above, p }) {
  const radius = (z) => {
    if (z >= z0 && z <= z1) return R;
    const h = z < z0 ? below : above;
    const t = Math.min(0.999999, (z < z0 ? z0 - z : z - z1) / h);
    return R * Math.pow(1 - Math.pow(t, p), 1 / p);
  };
  const slope = (z) => {
    if (z >= z0 && z <= z1) return 0;
    const h = z < z0 ? below : above;
    const t = Math.min(0.999999, (z < z0 ? z0 - z : z - z1) / h);
    if (t < 1e-9) return 0;
    const sign = z < z0 ? -1 : 1;
    return (-R * Math.pow(1 - Math.pow(t, p), 1 / p - 1) * Math.pow(t, p - 1) * sign) / h;
  };
  return { radius, slope };
}

// Sample an analytic body into a profile of smooth knots between two flat caps.
export function sampled({ radius }, z0, z1, count = 26) {
  const out = [];
  for (let index = 0; index <= count; index++) {
    const z = z0 + ((z1 - z0) * index) / count;
    out.push(index === 0 || index === count ? [z, radius(z)] : [z, radius(z), 1]);
  }
  return out;
}

// ---- legs: an oval shoe on a sole, three squat globes, and necks between them
export const LEG_X = 17.3;
export const SOLE = { z: 0, h: 1 };
// The shoe is turned about a horizontal axis running heel to toe (+y) at the sole's top,
// so its cross-section is a half circle 28 cm wide and it runs 38 cm long (CAD: 15.71 in).
export const SHOE = (() => {
  const R = 14;
  const mid = 4;
  const half = 19;
  const p = 3.2;
  const radius = (s) => {
    const t = Math.min(0.999999, Math.abs(s - mid) / half);
    return R * Math.pow(1 - Math.pow(t, p), 1 / p);
  };
  const slope = (s) => {
    const t = Math.min(0.999999, Math.abs(s - mid) / half);
    if (t < 1e-9) return 0;
    const sign = s < mid ? -1 : 1;
    return (-R * Math.pow(1 - Math.pow(t, p), 1 / p - 1) * Math.pow(t, p - 1) * sign) / half;
  };
  // Sampled by the superellipse's own angle so the knots crowd the blunt heel and toe,
  // where the radius falls fastest; the end caps shrink to a few millimetres.
  const profile = (count) => {
    const out = [];
    for (let index = 0; index <= count; index++) {
      const theta = 0.0005 + ((Math.PI - 0.001) * index) / count;
      const c = Math.cos(theta);
      const s = mid - half * Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
      out.push(index === 0 || index === count ? [s, radius(s)] : [s, radius(s), 1]);
    }
    return out;
  };
  const ends = profile(1);
  return { R, mid, half, s0: ends[0][0], s1: ends[1][0], axisZ: SOLE.h, radius, slope, profile };
})();
export const NECK = { h: 1.4, r: 8.5 };
export const PAD_TOP = 16;
export function globe(z0, height, R, rEnd, p = 2.3) {
  const h = reach(R, rEnd, p, height / 2);
  return { z0, z1: z0 + height, R, body: bulb({ R, c: z0 + height / 2, below: h, above: h, p }) };
}
export const LEG_STACK = (() => {
  const out = [];
  let z = PAD_TOP;
  const plan = [
    [22, 15.2],
    [19, 14.2],
    [21.7, 15.2],
  ];
  plan.forEach(([height, R], index) => {
    if (index) {
      out.push({ neck: [z, z + NECK.h] });
      z += NECK.h;
    }
    out.push({ globe: globe(z, height, R, NECK.r - 0.5) });
    z += height;
  });
  return { parts: out, top: z };
})();

// ---- pelvis, chest
export const PELVIS = (() => {
  const z0 = LEG_STACK.top;
  const z1 = 108;
  const R = 29;
  const c = 97;
  const p = 2.6;
  return { z0, z1, body: bulb({ R, c, below: reach(R, 26, p, c - z0), above: reach(R, 27.5, p, z1 - c), p }) };
})();
export const CHEST = (() => {
  const R = 37;
  const p = 2.5;
  return { z0: 108, z1: 150, R, body: barrel({ R, z0: 116, z1: 140, below: reach(R, 30, p, 8), above: reach(R, 27, p, 10), p }) };
})();
export const BEARING = { z0: 150, z1: 151, rIn: 22, rOut: 25 };

// ---- head: the voice collar, the slanted brim, the bullet head and its clear shell
// The collar's top and the head's open bottom lie in one plane that rises toward the front:
// 4.45 in above the chest at the back of the shell and 7.19 in at its front (CAD).
// The voice collar is a drum wider than the head, and the brim (R10.67 in) wider still.
export const COLLAR = { r: 24.5, z0: 151 };
export const SLANT = { back: 161.3, front: 168.3, span: 22 };
export const slantZ = (y) => SLANT.back + ((y + SLANT.span) * (SLANT.front - SLANT.back)) / (2 * SLANT.span);
export const SLANT_TILT = Math.atan((SLANT.front - SLANT.back) / (2 * SLANT.span));
export const SLANT_N = [0, -Math.sin(SLANT_TILT), Math.cos(SLANT_TILT)];
export const SLANT_O = [0, 0, slantZ(0)];
export const BRIM = { rIn: 21.6, rOut: 26.5, thick: 2 };
// The head is a bullet, r = R·(1 − t^3.2)^½ from the back of the collar plane to the apex
// (CAD: about 21 in tall from the back of the brim, 17.34 in across). Above HOOD.top it is
// all clear plastic; below, the plastic runs down the front only, between the cheeks of a
// black hood that makes the sides and back and carries the ears and comb fins.
export const SHELL = { R: 22, wall: 0.4, base: 161, apex: 213.2, top: 212.7, q: 3.2 };
export const HOOD = { top: 194, window: 50 * (Math.PI / 180) };
export const shellRadius = (z) => {
  const t = Math.min(1, Math.max(0, (z - SHELL.base) / (SHELL.apex - SHELL.base)));
  return SHELL.R * Math.sqrt(Math.max(0, 1 - Math.pow(t, SHELL.q)));
};
export const shellSlope = (z) => {
  const H = SHELL.apex - SHELL.base;
  const t = Math.min(0.9999, Math.max(1e-6, (z - SHELL.base) / H));
  return (-SHELL.R * SHELL.q * Math.pow(t, SHELL.q - 1)) / (2 * H * Math.sqrt(Math.max(1e-6, 1 - Math.pow(t, SHELL.q))));
};
// The black key chassis: a D in plan, flat across the front behind the window. Below
// HOOD.top its round back is the hood itself; above, it stands inside the clear cap.
export const CHASSIS = { front: 11, top: 198 };

// The brass bell under the gyros: an exponential taper from 3.2 to the shaft.
export const bellAt = (z0) => ({
  radius: (z) => 1.2 + 2 * Math.exp(-(z - z0) / 1.6),
  slope: (z) => -(2 / 1.6) * Math.exp(-(z - z0) / 1.6),
});
